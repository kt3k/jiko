# 事故分析チャットボット 仕様書

## 概要

2024年の警察庁交通事故オープンデータ（約29万件）に対して、自然言語で質問すると AI が分析・回答するチャットボットアプリケーション。

## ユーザー体験

### 対象ユーザー

- 交通安全に関心のある一般市民
- 自治体の交通安全担当者
- 研究者・ジャーナリスト

### 使い方

1. チャット画面で日本語の質問を入力する
2. AI がデータを分析し、テキストとグラフで回答する

### 質問の例

- 「雨の日に多い事故の種類は？」
- 「東京都で死亡事故が多い時間帯は？」
- 「高齢者（65歳以上）の事故の特徴を教えて」
- 「自転車が関係する事故は曜日によって違いがある？」
- 「夜間の事故が多い都道府県トップ10」
- 「交差点での事故と単路での事故、どちらが多い？」

## アーキテクチャ

```
ユーザー
  │
  ▼
フロントエンド (Fresh)
  │
  ▼
API ルート (/api/chat)
  │
  ▼
Claude API (tool use)
  │
  ├─→ Tool: query_accidents  … SQLite クエリ実行
  ├─→ Tool: aggregate_stats  … 集計・統計処理
  └─→ Tool: generate_chart   … グラフ生成
  │
  ▼
SQLite (事故データ)
```

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フレームワーク | Deno Fresh |
| AI | Claude API (claude-sonnet-4-6, tool use) |
| データベース | SQLite (Deno built-in `node:sqlite`) |
| グラフ | Chart.js (フロントエンド描画) |
| 言語 | TypeScript (Deno) |

## データ設計

### SQLite テーブル

CSV をインポートし、コード値を人間が読める日本語ラベルに変換して格納する。

#### `accidents` テーブル（本票ベース）

| カラム | 型 | 説明 |
|--------|------|------|
| id | INTEGER PRIMARY KEY | 自動採番 |
| prefecture | TEXT | 都道府県名（例: 東京） |
| prefecture_code | TEXT | 都道府県コード |
| police_station | TEXT | 警察署名 |
| severity | TEXT | 事故内容（死亡 / 負傷） |
| fatalities | INTEGER | 死者数 |
| injuries | INTEGER | 負傷者数 |
| municipality_code | TEXT | 市区町村コード |
| year | INTEGER | 発生年 |
| month | INTEGER | 発生月 |
| day | INTEGER | 発生日 |
| hour | INTEGER | 発生時 |
| minute | INTEGER | 発生分 |
| day_night | TEXT | 昼夜（昼－明 / 昼－昼 / 昼－暮 / 夜－暮 / 夜－夜 / 夜－明） |
| weather | TEXT | 天候（晴 / 曇 / 雨 / 霧 / 雪） |
| terrain | TEXT | 地形（市街地－人口集中 / 市街地－その他 / 非市街地） |
| road_surface | TEXT | 路面状態（舗装－乾燥 / 舗装－湿潤 / 舗装－凍結 / 舗装－積雪 / 非舗装） |
| road_shape | TEXT | 道路形状（交差点 / 交差点付近 / 単路 / 踏切 等） |
| traffic_signal | TEXT | 信号機の有無 |
| accident_type | TEXT | 事故類型（人対車両 / 車両相互 / 車両単独 / 列車） |
| party_a_age | INTEGER | 当事者A 年齢 |
| party_b_age | INTEGER | 当事者B 年齢 |
| party_a_type | TEXT | 当事者A 種別（普通乗用車 / 自転車 / 歩行者 等） |
| party_b_type | TEXT | 当事者B 種別 |
| party_a_injury | TEXT | 当事者A 損傷程度（死亡 / 負傷 / 損傷なし） |
| party_b_injury | TEXT | 当事者B 損傷程度 |
| latitude | REAL | 緯度 |
| longitude | REAL | 経度 |
| day_of_week | TEXT | 曜日（日〜土） |
| is_holiday | BOOLEAN | 祝日フラグ |

### インデックス

```sql
CREATE INDEX idx_prefecture ON accidents(prefecture);
CREATE INDEX idx_month ON accidents(month);
CREATE INDEX idx_hour ON accidents(hour);
CREATE INDEX idx_weather ON accidents(weather);
CREATE INDEX idx_accident_type ON accidents(accident_type);
CREATE INDEX idx_severity ON accidents(severity);
CREATE INDEX idx_day_of_week ON accidents(day_of_week);
CREATE INDEX idx_road_shape ON accidents(road_shape);
CREATE INDEX idx_party_a_type ON accidents(party_a_type);
CREATE INDEX idx_party_b_type ON accidents(party_b_type);
```

## Claude API Tool 定義

### 1. `query_accidents`

SQLite に対して SELECT クエリを実行する。

```typescript
{
  name: "query_accidents",
  description: "交通事故データベースに対してSQLクエリを実行し、結果を返す。accidentsテーブルに対するSELECT文のみ実行可能。",
  input_schema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "実行するSELECTクエリ。accidentsテーブルに対してのみ実行可能。"
      },
      explanation: {
        type: "string",
        description: "このクエリで何を調べようとしているかの説明"
      }
    },
    required: ["sql", "explanation"]
  }
}
```

**安全性**: SELECT 文のみ許可。`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER` 等を含むクエリは拒否する。

### 2. `generate_chart`

集計結果をグラフ化するための Chart.js 設定を生成する。

```typescript
{
  name: "generate_chart",
  description: "集計結果をグラフで可視化するためのChart.js設定を生成する。",
  input_schema: {
    type: "object",
    properties: {
      chart_type: {
        type: "string",
        enum: ["bar", "line", "pie", "doughnut"],
        description: "グラフの種類"
      },
      title: {
        type: "string",
        description: "グラフのタイトル"
      },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "X軸ラベルまたはカテゴリ名"
      },
      datasets: {
        type: "array",
        description: "データセット配列"
      }
    },
    required: ["chart_type", "title", "labels", "datasets"]
  }
}
```

## API エンドポイント

### `POST /api/chat`

**リクエスト**:
```json
{
  "messages": [
    { "role": "user", "content": "雨の日に多い事故の種類は？" }
  ]
}
```

**レスポンス** (Server-Sent Events):
```
data: {"type": "text", "content": "雨の日の事故を分析します。"}
data: {"type": "tool_use", "name": "query_accidents", "input": {...}}
data: {"type": "tool_result", "content": "..."}
data: {"type": "text", "content": "分析結果: ..."}
data: {"type": "chart", "config": {...}}
data: [DONE]
```

## フロントエンド画面構成

### チャット画面（メイン・1画面構成）

```
┌─────────────────────────────────────────┐
│  🚗 交通事故分析チャット                    │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ AI ──────────────────────────────┐  │
│  │ 2024年の交通事故データ（約29万件）に  │  │
│  │ ついて何でも質問してください。       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ User ────────────────────────────┐  │
│  │ 雨の日に多い事故の種類は？          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ AI ──────────────────────────────┐  │
│  │ 雨の日の事故を分析しました。        │  │
│  │                                   │  │
│  │ ┌─────────────────────────────┐   │  │
│  │ │     [棒グラフ]               │   │  │
│  │ │     車両相互: 85%            │   │  │
│  │ │     人対車両: 10%            │   │  │
│  │ │     車両単独:  5%            │   │  │
│  │ └─────────────────────────────┘   │  │
│  │                                   │  │
│  │ 雨天時は路面が湿潤になるため...     │  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  [質問を入力...]                [送信]   │
└─────────────────────────────────────────┘
```

### サジェスト機能

初回表示時に質問例をボタンとして表示し、クリックで入力欄に反映する。

```
よく聞かれる質問:
[雨の日に多い事故は？] [高齢者の事故の特徴] [時間帯別の事故件数]
[都道府県別の死亡事故] [自転車事故の傾向]  [交差点 vs 単路]
```

## システムプロンプト

```
あなたは交通事故データの分析アシスタントです。
2024年の警察庁交通事故オープンデータ（約29万件）をもとに、
ユーザーの質問に対してSQLクエリでデータを分析し、
わかりやすく回答してください。

## データベース
テーブル: accidents
主なカラム: prefecture, severity, fatalities, injuries,
year, month, day, hour, weather, terrain, road_surface,
road_shape, accident_type, party_a_age, party_b_age,
party_a_type, party_b_type, latitude, longitude,
day_of_week, is_holiday, day_night

## 回答のルール
- 数値で答えられる質問にはまず集計クエリを実行する
- 結果が視覚的に伝わる場合はグラフも生成する
- 傾向や特徴を平易な日本語で説明する
- データから読み取れないことは推測しない
- 出典を明記する:「出典: 警察庁交通事故オープンデータ（2024年）」
```

## セットアップ手順

### 1. データインポートスクリプト (`scripts/import-csv.ts`)

1. CSV を読み込む
2. コード値を日本語ラベルに変換（コード表マッピング）
3. 緯度経度を度数法に変換（元データは度分秒×10^5 形式）
4. SQLite に INSERT

### 2. 環境変数

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. 起動

```bash
deno task import-data   # CSV → SQLite
deno task dev           # 開発サーバー起動
```

## デプロイ

### インフラ: Fly.io

| 項目 | 設定 |
|------|------|
| リージョン | nrt (東京) |
| ランタイム | Docker (`denoland/deno` イメージ) |
| データベース | SQLite (Volume マウント `/data`) |
| Volume | 1GB |

### Dockerfile

```dockerfile
FROM denoland/deno:2

WORKDIR /app
COPY . .
RUN deno cache main.ts

EXPOSE 8000
CMD ["deno", "task", "start"]
```

### fly.toml

```toml
app = "jiko"
primary_region = "nrt"

[build]

[env]
  SQLITE_PATH = "/data/accidents.db"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[mounts]
  source = "jiko_data"
  destination = "/data"
```

### デプロイ手順

```bash
fly launch --region nrt          # アプリ作成
fly volumes create jiko_data \
  --region nrt --size 1          # Volume 作成 (1GB)
fly secrets set \
  ANTHROPIC_API_KEY=sk-ant-...   # API キー設定
fly deploy                       # デプロイ
fly ssh console -C \
  "deno task import-data"        # 初回データインポート
```

## 今後の拡張案

- 地図表示（Leaflet / Mapbox）で事故地点をプロット
- 補充票・高速票データとの結合分析
- 年度比較（過去データとの比較）
- PDF レポート出力
