import { useRef, useState } from "preact/hooks";
import Chart from "./Chart.tsx";

export interface ChartConfig {
  chart_type: "bar" | "line" | "pie" | "doughnut";
  title: string;
  labels: string[];
  datasets: { label?: string; data: number[]; backgroundColor?: string[] }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  charts: ChartConfig[];
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
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setTimeout(scrollToBottom, 0);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error("API error");
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let assistantContent = "";
      const charts: ChartConfig[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "text") {
              assistantContent += event.content;
              setMessages([...newMessages, {
                role: "assistant",
                content: assistantContent,
                charts: [...charts],
              }]);
              setTimeout(scrollToBottom, 0);
            } else if (event.type === "chart") {
              charts.push(event.config);
              setMessages([...newMessages, {
                role: "assistant",
                content: assistantContent,
                charts: [...charts],
              }]);
              setTimeout(scrollToBottom, 0);
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      if (assistantContent || charts.length > 0) {
        setMessages([...newMessages, {
          role: "assistant",
          content: assistantContent,
          charts,
        }]);
      }
    } catch {
      setMessages([...newMessages, {
        role: "assistant",
        content: "エラーが発生しました。もう一度お試しください。",
        charts: [],
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
    <div class="chat-container">
      <div class="messages">
        {messages.length === 0 && !loading && (
          <div class="suggestions">
            <p class="suggestions-label">質問の例:</p>
            <div class="suggestions-grid">
              {SUGGESTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  class="suggestion-btn"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} class={`message message-${msg.role}`}>
            <div class="message-bubble">
              {msg.content}
              {msg.charts.map((chart, j) => <Chart key={j} config={chart} />)}
            </div>
          </div>
        ))}

        {loading && (
          <div class="message message-assistant">
            <div class="message-bubble loading-indicator">
              分析中...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form class="input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          class="chat-input"
          placeholder="質問を入力..."
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          disabled={loading}
        />
        <button
          type="submit"
          class="send-btn"
          disabled={loading || !input.trim()}
        >
          送信
        </button>
      </form>
    </div>
  );
}
