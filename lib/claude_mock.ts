import type Anthropic from "@anthropic-ai/sdk";
import { setTimeout } from "node:timers";

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function makeMockMessage(
  content: Anthropic.ContentBlock[],
  stop_reason: "end_turn" | "tool_use",
): Anthropic.Message {
  return {
    id: "msg_mock",
    type: "message",
    role: "assistant",
    content,
    model: "claude-mock",
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

/**
 * 開発用モック createMessage。
 * 実 API を叩かず、tool_use → tool_use → text → 配置 の 4 ラウンドを再現する。
 * handleToolCall / DB / チャート配置パイプラインは実コードを通る。
 */
export async function mockCreateMessage(
  messages: Anthropic.MessageParam[],
): Promise<Anthropic.Message> {
  await delay(700);

  // Phase 2: チャート配置呼び出しの判定（単一ユーザーメッセージ + "チャート一覧"）
  const first = messages[0];
  if (
    messages.length === 1 &&
    typeof first.content === "string" &&
    first.content.includes("チャート一覧")
  ) {
    return makeMockMessage([{
      type: "text",
      text:
        "## 天候別の事故傾向\n\n2024年のデータを見ると、**晴天時の事故が圧倒的に多い** ことが分かります。\n\n{{CHART:0}}\n\n出典: 警察庁交通事故オープンデータ（2024年）",
      citations: null,
    }], "end_turn");
  }

  // Phase 1: 過去の tool_result の数で round を判定
  const toolResultsCount = messages
    .filter((m) => Array.isArray(m.content))
    .flatMap((m) => m.content as Anthropic.ContentBlockParam[])
    .filter((b) => b.type === "tool_result").length;

  if (toolResultsCount === 0) {
    return makeMockMessage([{
      type: "tool_use",
      id: "tu_mock_query",
      name: "query_accidents",
      input: {
        sql:
          "SELECT weather, COUNT(*) AS count FROM accidents GROUP BY weather ORDER BY count DESC",
        explanation: "天候別の事故件数を集計（モック）",
      },
    }], "tool_use");
  }

  if (toolResultsCount === 1) {
    return makeMockMessage([{
      type: "tool_use",
      id: "tu_mock_chart",
      name: "generate_chart",
      input: {
        chart_type: "bar",
        title: "天候別の事故件数（2024年）",
        labels: ["晴", "曇", "雨", "雪", "霧"],
        datasets: [{ label: "件数", data: [198432, 58921, 31204, 4218, 187] }],
      },
    }], "tool_use");
  }

  return makeMockMessage([{
    type: "text",
    text:
      "## 天候別の事故傾向\n\n2024年のデータでは、**晴天時の事故が圧倒的に多い** ことが分かります。\n\n_※ JIKO_MOCK=1 で起動された開発用モック応答です。_",
    citations: null,
  }], "end_turn");
}
