import { useRef, useState } from "preact/hooks";
import { JsonParseStream } from "@std/json";
import { TextLineStream } from "@std/streams/text-line-stream";
import { asAsyncIterable } from "../lib/stream.ts";
import Chart from "./Chart.tsx";
import Markdown from "./Markdown.tsx";
import ToolLogDetail from "./ToolLogDetail.tsx";

export interface ChartConfig {
  chart_type: "bar" | "line" | "pie" | "doughnut";
  title: string;
  labels: string[];
  datasets: { label?: string; data: number[]; backgroundColor?: string[] }[];
}

interface ToolLog {
  id: string;
  name: string;
  input: unknown;
  result: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  charts: ChartConfig[];
  toolLogs: ToolLog[];
  isError?: boolean;
}

const CHART_SPLIT_RE = /(\{\{CHART:\d+\}\})/;
const CHART_PLACEHOLDER_RE = /\{\{CHART:(\d+)\}\}/;

/** content を CHART プレースホルダーで分割して Markdown + Chart を交互にレンダリング */
function AssistantContent(
  { content, charts }: { content: string; charts: ChartConfig[] },
) {
  const parts = content.split(CHART_SPLIT_RE);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(CHART_PLACEHOLDER_RE);
        if (match) {
          const idx = parseInt(match[1], 10);
          const chart = charts[idx];
          if (chart) return <Chart key={`chart-${idx}`} config={chart} />;
          return null;
        }
        if (!part.trim()) return null;
        return <Markdown key={`md-${i}`} content={part} />;
      })}
    </>
  );
}

function LoadingDots() {
  return (
    <span class="inline-flex">
      <span class="animate-bounce-sm">.</span>
      <span class="animate-bounce-sm [animation-delay:0.15s]">.</span>
      <span class="animate-bounce-sm [animation-delay:0.3s]">.</span>
    </span>
  );
}

/** ローディングの進捗表示 */
function LoadingIndicator({ placing }: { placing: boolean }) {
  return (
    <span>
      {placing ? "回答を生成中" : "考え中"}
      <LoadingDots />
    </span>
  );
}

const SUGGESTIONS = [
  "雨の日に多い事故の種類は？",
  "高齢者（65歳以上）の事故の特徴を教えて",
  "時間帯別の事故件数を教えて",
  "都道府県別の死亡事故トップ10",
  "自転車事故の傾向を教えて",
  "交差点と単路、どちらの事故が多い？",
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text.trim(),
      charts: [],
      toolLogs: [],
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setTimeout(scrollToBottom, 0);

    try {
      const apiMessages = newMessages.map((
        { charts: _, toolLogs: _2, isError: _3, ...rest },
      ) => rest);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error("API error");
      }

      const eventStream = res.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream())
        .pipeThrough(new JsonParseStream());

      let assistantContent = "";
      const charts: ChartConfig[] = [];
      const toolLogs: ToolLog[] = [];
      let isError = false;

      for await (const event of asAsyncIterable(eventStream)) {
        const e = event as unknown as {
          type: string;
          content?: string;
          config?: ChartConfig;
          id?: string;
          name?: string;
          input?: unknown;
          result?: string;
        };
        if (e.type === "text") {
          assistantContent = e.content ?? "N/A";
        } else if (e.type === "chart") {
          charts.push(e.config!);
        } else if (e.type === "tool_log") {
          const existing = toolLogs.find((l) => l.id === e.id);
          if (existing) {
            existing.result = e.result ?? "";
          } else {
            toolLogs.push({
              id: e.id!,
              name: e.name!,
              input: e.input,
              result: e.result ?? "",
            });
          }
        } else if (e.type === "error") {
          assistantContent += e.content ?? "エラーが発生しました。";
          isError = true;
        }
        setMessages([...newMessages, {
          role: "assistant",
          content: assistantContent,
          charts: [...charts],
          toolLogs: [...toolLogs],
          isError,
        }]);
        setTimeout(scrollToBottom, 0);
      }
    } catch {
      setMessages([...newMessages, {
        role: "assistant",
        content: "エラーが発生しました。もう一度お試しください。",
        charts: [],
        toolLogs: [],
        isError: true,
      }]);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 0);
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div class="flex flex-col h-full">
      <div class="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !loading && (
          <div class="py-4">
            <p class="text-sm text-gray-500 mb-3">質問の例:</p>
            <div class="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  class="px-3 py-2 bg-white border border-gray-300 rounded-full text-sm cursor-pointer text-gray-700 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "assistant" &&
              msg.toolLogs.map((log, j) => (
                <div key={`tl-${j}`} class="mb-2 flex justify-start">
                  <div class="relative max-w-[80%] sm:max-w-[60%]">
                    <button
                      type="button"
                      class="w-full px-3 py-1.5 text-xs text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded-2xl rounded-bl-sm cursor-pointer text-left"
                      onClick={() =>
                        setExpandedLog(expandedLog === j ? null : j)}
                    >
                      <span class="text-gray-500">tool</span>
                      <span class="ml-2">{log.name}</span>
                      {log.result
                        ? <span class="ml-2 text-green-500">done</span>
                        : <span class="ml-2">...</span>}
                      <span class="ml-2 text-gray-300">
                        {expandedLog === j ? "▲" : "▼"}
                      </span>
                    </button>
                    {log.result && expandedLog === j && (
                      <div class="mt-1 z-10 w-full sm:w-[36rem] max-h-64 overflow-auto p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs">
                        <ToolLogDetail
                          name={log.name}
                          input={log.input}
                          result={log.result}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            {(msg.role === "user" || msg.content.trim() !== "") && (
              <div
                class={`mb-3 flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  class={`max-w-[80%] px-4 py-3 leading-relaxed break-words ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-2xl rounded-br-sm whitespace-pre-wrap"
                      : msg.isError
                      ? "bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-bl-sm"
                      : "bg-white border border-gray-200 rounded-2xl rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant"
                    ? (
                      <AssistantContent
                        content={msg.content}
                        charts={msg.charts}
                      />
                    )
                    : msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (() => {
          const last = messages[messages.length - 1];
          // chart は受け取ったが配置済みテキストがまだ届いていない = チャート配置中
          const placing = last?.role === "assistant" &&
            last.charts.length > 0 &&
            last.content.trim() === "";
          return (
            <div class="mb-3 flex justify-start">
              <div class="max-w-[80%] px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-bl-sm text-gray-400 italic">
                <LoadingIndicator placing={placing} />
              </div>
            </div>
          );
        })()}

        <div ref={messagesEndRef} />
      </div>

      <form
        class="flex gap-2 px-2 sm:px-4 py-3 border-t border-gray-200 bg-white"
        onSubmit={handleSubmit}
      >
        {messages.length > 0 && (
          <button
            type="button"
            class="px-2 sm:px-3 py-2.5 text-gray-500 hover:text-gray-700 text-sm shrink-0"
            onClick={() => {
              setMessages([]);
              setInput("");
            }}
            disabled={loading}
            title="新しい会話"
          >
            + 新規
          </button>
        )}
        <input
          type="text"
          class="flex-1 min-w-0 px-3 sm:px-4 py-2.5 border border-gray-300 rounded-full text-sm outline-none focus:border-blue-600 disabled:bg-gray-100"
          placeholder="質問を入力..."
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          disabled={loading}
        />
        <button
          type="submit"
          class="px-3 sm:px-5 py-2.5 bg-blue-600 text-white rounded-full text-sm cursor-pointer hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed shrink-0"
          disabled={loading || !input.trim()}
        >
          送信
        </button>
      </form>
    </div>
  );
}
