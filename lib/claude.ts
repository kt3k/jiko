import Anthropic from "@anthropic-ai/sdk";
import { executeQuery } from "./db.ts";

export const SYSTEM_PROMPT = `あなたは交通事故データの分析アシスタントです。
2024年の警察庁交通事故オープンデータ（約29万件）をもとに、
ユーザーの質問に対してSQLクエリでデータを分析し、
わかりやすく回答してください。

## データベース
テーブル: accidents
カラム一覧:
- prefecture (TEXT): 都道府県名。北海道は方面別（札幌方面、函館方面、旭川方面、釧路方面、北見方面）
- prefecture_code (TEXT): 都道府県コード
- police_station (TEXT): 警察署等コード
- severity (TEXT): 事故内容。値: 死亡, 負傷
- fatalities (INTEGER): 死者数
- injuries (INTEGER): 負傷者数
- municipality_code (TEXT): 市区町村コード
- year (INTEGER): 発生年
- month (INTEGER): 発生月 (1-12)
- day (INTEGER): 発生日 (1-31)
- hour (INTEGER): 発生時 (0-23)
- minute (INTEGER): 発生分 (0-59)
- day_night (TEXT): 昼夜。値: 昼-明, 昼-昼, 昼-暮, 夜-暮, 夜-夜, 夜-明
- weather (TEXT): 天候。値: 晴, 曇, 雨, 霧, 雪
- terrain (TEXT): 地形。値: 市街地-人口集中, 市街地-その他, 非市街地
- road_surface (TEXT): 路面状態。値: 舗装-乾燥, 舗装-湿潤, 舗装-凍結, 舗装-積雪, 非舗装
- road_shape (TEXT): 道路形状。値: 交差点-その他, 交差点-環状交差点, 交差点付近-その他, 交差点付近-環状交差点付近, 単路-トンネル, 単路-橋, 単路-カーブ・屈折, 単路-その他, 踏切-第一種, 踏切-第三種, 踏切-第四種, 一般交通の場所
- traffic_signal (TEXT): 信号機。値: 点灯-3灯式, 点灯-歩車分式, 点灯-押ボタン式, 点滅-3灯式, 点滅-1灯式, 消灯, 故障, 施設なし
- accident_type (TEXT): 事故類型。値: 人対車両, 車両相互, 車両単独, 列車
- party_a_age (INTEGER): 当事者A年齢
- party_b_age (INTEGER): 当事者B年齢
- party_a_type (TEXT): 当事者A種別。値: 乗用車-大型車, 乗用車-中型車, 乗用車-準中型車, 乗用車-普通車, 乗用車-軽自動車, 乗用車-ミニカー, 貨物車-大型車, 貨物車-中型車, 貨物車-準中型車, 貨物車-普通車, 貨物車-軽自動車, 特殊車-大型-農耕作業用, 特殊車-大型-その他, 特殊車-小型-農耕作業用, 特殊車-小型-その他, 二輪車-小型二輪-751cc以上, 二輪車-小型二輪-401〜750cc, 二輪車-小型二輪-251〜400cc, 二輪車-軽二輪-126〜250cc, 二輪車-原付二種-51〜125cc, 二輪車-一般原付自転車, 路面電車, 列車, 特定小型原付自転車, 軽車両-自転車, 軽車両-駆動補助機付自転車, 軽車両-その他, 歩行者, 物件等, 相手なし, 対象外当事者
- party_b_type (TEXT): 当事者B種別（party_a_typeと同じ値）
- party_a_injury (TEXT): 当事者A損傷程度。値: 死亡, 負傷, 損傷なし, 対象外
- party_b_injury (TEXT): 当事者B損傷程度（party_a_injuryと同じ値）
- latitude (REAL): 緯度
- longitude (REAL): 経度
- day_of_week (TEXT): 曜日。値: 日, 月, 火, 水, 木, 金, 土
- is_holiday (BOOLEAN): 祝日フラグ (1=祝日当日, 0=それ以外)

## 回答のルール
- 数値で答えられる質問にはまず集計クエリを実行する
- 結果が視覚的に伝わる場合はグラフも生成する
- 傾向や特徴を平易な日本語で説明する
- データから読み取れないことは推測しない
- 出典を明記する:「出典: 警察庁交通事故オープンデータ（2024年）」`;

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "query_accidents",
    description:
      "交通事故データベースに対してSQLクエリを実行し、結果を返す。accidentsテーブルに対するSELECT文のみ実行可能。",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "実行するSELECTクエリ。accidentsテーブルに対してのみ実行可能。",
        },
        explanation: {
          type: "string",
          description: "このクエリで何を調べようとしているかの説明",
        },
      },
      required: ["sql", "explanation"],
    },
  },
  {
    name: "generate_chart",
    description: "集計結果をグラフで可視化するためのChart.js設定を生成する。",
    input_schema: {
      type: "object" as const,
      properties: {
        chart_type: {
          type: "string",
          enum: ["bar", "line", "pie", "doughnut"],
          description: "グラフの種類",
        },
        title: {
          type: "string",
          description: "グラフのタイトル",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "X軸ラベルまたはカテゴリ名",
        },
        datasets: {
          type: "array",
          description: "データセット配列",
        },
      },
      required: ["chart_type", "title", "labels", "datasets"],
    },
  },
];

interface QueryInput {
  sql: string;
  explanation: string;
}

/** Tool 呼び出しを実行して結果を返す */
export function handleToolCall(
  name: string,
  input: unknown,
): { type: "query_result" | "chart"; content: string; config?: unknown } {
  if (name === "query_accidents") {
    const { sql } = input as QueryInput;
    try {
      const results = executeQuery(sql);
      return { type: "query_result", content: JSON.stringify(results) };
    } catch (e) {
      return {
        type: "query_result",
        content: JSON.stringify({ error: (e as Error).message }),
      };
    }
  }
  if (name === "generate_chart") {
    return {
      type: "chart",
      content: JSON.stringify(input),
      config: input,
    };
  }
  return {
    type: "query_result",
    content: JSON.stringify({ error: `Unknown tool: ${name}` }),
  };
}

export type ChatEvent =
  | { type: "text"; content: string }
  | { type: "chart"; config: unknown };

const client = new Anthropic();

/** Claude API と tool use ループでチャットする async generator */
export async function* chat(
  messages: Anthropic.MessageParam[],
): AsyncGenerator<ChatEvent> {
  const apiMessages = [...messages];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: apiMessages,
    });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        yield { type: "text", content: block.text };
      } else if (block.type === "tool_use") {
        const result = handleToolCall(block.name, block.input);
        if (result.type === "chart") {
          yield { type: "chart", config: result.config };
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.content,
        });
      }
    }

    if (response.stop_reason === "end_turn" || toolResults.length === 0) {
      break;
    }

    apiMessages.push({ role: "assistant", content: response.content });
    apiMessages.push({ role: "user", content: toolResults });
  }
}
