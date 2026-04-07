import Anthropic from "@anthropic-ai/sdk";

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
