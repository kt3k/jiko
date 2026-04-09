import { assertEquals } from "@std/assert";
import type Anthropic from "@anthropic-ai/sdk";
import {
  chat,
  type ChatEvent,
  handleToolCall,
  setCreateMessage,
} from "./claude.ts";

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
    model: "claude-sonnet-4-6-20250514",
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
    assertEquals(events.length, 1);
    assertEquals(events[0], { type: "text", content: "件数は100件です。" });

    setCreateMessage(null);
  },
});

Deno.test({
  name: "chat - generate_chart yields chart event",
  async fn() {
    let callCount = 0;
    setCreateMessage(() => {
      callCount++;
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
      return Promise.resolve(makeMessage([
        { type: "text", text: "グラフを生成しました。" },
      ]));
    });

    const events = await collectEvents([
      { role: "user", content: "グラフ見せて" },
    ]);

    assertEquals(events.length, 2);
    assertEquals(events[0].type, "chart");
    if (events[0].type === "chart") {
      const config = events[0].config as {
        chart_type: string;
        title: string;
      };
      assertEquals(config.chart_type, "bar");
      assertEquals(config.title, "テストグラフ");
    }
    assertEquals(events[1], {
      type: "text",
      content: "グラフを生成しました。",
    });

    setCreateMessage(null);
  },
});

Deno.test({
  name: "chat - multiple text blocks in single response",
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

    assertEquals(events.length, 2);
    assertEquals(events[0], { type: "text", content: "まず、" });
    assertEquals(events[1], { type: "text", content: "次に、" });

    setCreateMessage(null);
  },
});

Deno.test("handleToolCall - unknown tool returns error", () => {
  const result = handleToolCall("unknown_tool", {});
  assertEquals(result.type, "query_result");
  assertEquals(
    JSON.parse(result.content).error,
    "Unknown tool: unknown_tool",
  );
});

Deno.test("handleToolCall - query_accidents with invalid SQL returns error", () => {
  const result = handleToolCall("query_accidents", {
    sql: "DROP TABLE accidents",
    explanation: "test",
  });
  assertEquals(result.type, "query_result");
  const parsed = JSON.parse(result.content);
  assertEquals(typeof parsed.error, "string");
});
