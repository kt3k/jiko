import { assertEquals } from "@std/assert";
import type Anthropic from "@anthropic-ai/sdk";
import {
  chat,
  type ChatEvent,
  handleToolCall,
  setCreateMessage,
} from "./claude.ts";
import { mockCreateMessage } from "./claude_mock.ts";
import { closeDb } from "./db.ts";

// Helper: collect all events from chat generator
async function collectEvents(
  messages: Anthropic.MessageParam[],
): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of chat(messages)) {
    events.push(event);
  }
  return events;
}

// Helper: create a stub Message response
function makeMessage(
  // deno-lint-ignore no-explicit-any
  content: any[],
  stop_reason: "end_turn" | "tool_use" = "end_turn",
): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    content,
    model: "claude-sonnet-4-6",
    stop_reason,
    stop_sequence: null,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };
}

Deno.test({
  name: "chat - text only response",
  async fn() {
    setCreateMessage(() =>
      Promise.resolve(makeMessage([{ type: "text", text: "こんにちは" }]))
    );

    const events = await collectEvents([
      { role: "user", content: "テスト" },
    ]);

    assertEquals(events.length, 1);
    assertEquals(events[0], { type: "text", content: "こんにちは" });

    setCreateMessage(null);
  },
});

Deno.test({
  name: "chat - tool use triggers handleToolCall and continues",
  async fn() {
    let callCount = 0;
    setCreateMessage(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(makeMessage(
          [{
            type: "tool_use",
            id: "tu_1",
            name: "query_accidents",
            input: {
              sql: "SELECT COUNT(*) as c FROM accidents",
              explanation: "件数取得",
            },
          }],
          "tool_use",
        ));
      }
      return Promise.resolve(makeMessage([
        { type: "text", text: "件数は100件です。" },
      ]));
    });

    const events = await collectEvents([
      { role: "user", content: "事故件数は？" },
    ]);

    assertEquals(callCount, 2);
    // tool_log events (call + result) + final text
    const toolLogs = events.filter((e) => e.type === "tool_log");
    const textEvents = events.filter((e) => e.type === "text");
    assertEquals(toolLogs.length, 2);
    assertEquals(textEvents.length, 1);
    assertEquals(textEvents[0], { type: "text", content: "件数は100件です。" });

    setCreateMessage(null);
  },
});

Deno.test({
  name: "chat - generate_chart triggers placement pipeline",
  async fn() {
    let callCount = 0;
    setCreateMessage((msgs) => {
      callCount++;
      // Call 1: tool use loop - returns chart tool
      if (callCount === 1) {
        return Promise.resolve(makeMessage(
          [{
            type: "tool_use",
            id: "tu_2",
            name: "generate_chart",
            input: {
              chart_type: "bar",
              title: "テストグラフ",
              labels: ["A", "B"],
              datasets: [{ data: [10, 20] }],
            },
          }],
          "tool_use",
        ));
      }
      // Call 2: tool use loop continues - returns final text
      if (callCount === 2) {
        return Promise.resolve(makeMessage([
          { type: "text", text: "グラフを生成しました。" },
        ]));
      }
      // Call 3: placement LLM - insert placeholder
      const content = (msgs[0] as { role: string; content: string }).content;
      if (content.includes("チャート一覧")) {
        return Promise.resolve(makeMessage([{
          type: "text",
          text: "{{CHART:0}}\n\nグラフを生成しました。",
        }]));
      }
      return Promise.resolve(makeMessage([{ type: "text", text: "" }]));
    });

    const events = await collectEvents([
      { role: "user", content: "グラフ見せて" },
    ]);

    // Events: interim text, chart, final placed text
    const chartEvents = events.filter((e) => e.type === "chart");
    const textEvents = events.filter((e) => e.type === "text");
    assertEquals(chartEvents.length, 1);
    if (chartEvents[0].type === "chart") {
      const config = chartEvents[0].config as {
        chart_type: string;
        title: string;
      };
      assertEquals(config.chart_type, "bar");
      assertEquals(config.title, "テストグラフ");
    }
    // Last text event should contain the placeholder
    const lastText = textEvents[textEvents.length - 1];
    assertEquals(lastText.type, "text");
    if (lastText.type === "text") {
      assertEquals(lastText.content.includes("{{CHART:0}}"), true);
    }

    setCreateMessage(null);
  },
});

Deno.test({
  name: "chat - multiple text blocks joined with newlines",
  async fn() {
    setCreateMessage(() =>
      Promise.resolve(makeMessage([
        { type: "text", text: "まず、" },
        { type: "text", text: "次に、" },
      ]))
    );

    const events = await collectEvents([
      { role: "user", content: "テスト" },
    ]);

    // No charts → joined as single text
    assertEquals(events.length, 1);
    assertEquals(events[0], { type: "text", content: "まず、\n\n次に、" });

    setCreateMessage(null);
  },
});

Deno.test({
  name: "chat - mockCreateMessage drives real handleToolCall pipeline",
  async fn() {
    setCreateMessage(mockCreateMessage);

    try {
      const events = await collectEvents([
        { role: "user", content: "天気別の事故" },
      ]);

      const toolLogs = events.filter((e) => e.type === "tool_log");
      const charts = events.filter((e) => e.type === "chart");
      const texts = events.filter((e) => e.type === "text");

      // 2 ツール (query_accidents + generate_chart) × (pending + done) = 4
      assertEquals(toolLogs.length, 4);
      assertEquals(charts.length, 1);
      // 最後のテキストにチャートプレースホルダーが入っていること
      const lastText = texts[texts.length - 1];
      assertEquals(lastText.type, "text");
      if (lastText.type === "text") {
        assertEquals(lastText.content.includes("{{CHART:0}}"), true);
      }
    } finally {
      setCreateMessage(null);
      closeDb();
    }
  },
});

Deno.test("handleToolCall - unknown tool returns error", async () => {
  const result = await handleToolCall("unknown_tool", {});
  assertEquals(result.type, "query_result");
  assertEquals(
    JSON.parse(result.content).error,
    "Unknown tool: unknown_tool",
  );
});

Deno.test(
  "handleToolCall - query_accidents with invalid SQL returns error",
  async () => {
    const result = await handleToolCall("query_accidents", {
      sql: "DROP TABLE accidents",
      explanation: "test",
    });
    assertEquals(result.type, "query_result");
    const parsed = JSON.parse(result.content);
    assertEquals(typeof parsed.error, "string");
  },
);
