# 実装計画

SPEC.md に基づく実装手順。上から順に進める。

## Phase 1: プロジェクト基盤

### 1.1 Fresh プロジェクト初期化

- `deno init --fresh` で Fresh プロジェクトを作成
- `deno.json` に tasks を定義（`dev`, `start`, `import-data`）
- `.gitignore` に `*.db`, `.env`, `node_modules/` を追加

### 1.2 ディレクトリ構成

```
├── components/        # Preact コンポーネント
│   ├── Chat.tsx       # チャット UI (island)
│   └── Chart.tsx      # Chart.js 描画 (island)
├── islands/           # Fresh islands エントリ
├── routes/
│   ├── index.tsx      # メインページ
│   └── api/
│       └── chat.ts    # POST /api/chat エンドポイント
├── lib/
│   ├── db.ts          # SQLite 接続・クエリ実行
│   ├── claude.ts      # Claude API クライアント・tool use ループ
│   └── codemap.ts     # コード値 → 日本語ラベル変換マップ
├── scripts/
│   └── import-csv.ts  # CSV → SQLite インポート
├── static/            # 静的ファイル
├── fresh.config.ts
├── main.ts
├── deno.json
├── Dockerfile
├── fly.toml
└── SPEC.md
```

### 1.3 CI セットアップ (GitHub Actions)

- `.github/workflows/ci.yml` を作成
- トリガー: push (main), pull_request
- ジョブ:
  - `deno fmt --check` … フォーマットチェック
  - `deno lint` … リントチェック
  - `deno check **/*.ts **/*.tsx` … 型チェック

## Phase 2: データインポート

### 2.1 都道府県コードマップ (~55行)

- `lib/codemap.ts` に `PREFECTURE_MAP: Record<string, string>` を定義
- codebook の都道府県シートから 10→北海道(札幌方面), ..., 97→沖縄 を転記

### 2.2 事故属性コードマップ (~100行)

- 同ファイルに以下のマップを追加:
  - `SEVERITY_MAP`: 事故内容 (1→死亡, 2→負傷)
  - `WEATHER_MAP`: 天候 (1→晴, 2→曇, 3→雨, 4→霧, 5→雪)
  - `TERRAIN_MAP`: 地形 (1→市街地-人口集中, 2→市街地-その他, 3→非市街地)
  - `ROAD_SURFACE_MAP`: 路面状態 (1→舗装-乾燥, ..., 5→非舗装)
  - `DAY_NIGHT_MAP`: 昼夜 (11→昼-明, ..., 23→夜-明)
  - `DAY_OF_WEEK_MAP`: 曜日 (1→日, ..., 7→土)

### 2.3 道路形状・事故類型コードマップ (~50行)

- `ROAD_SHAPE_MAP`: 道路形状 (01→交差点, 07→交差点付近, 11→単路-トンネル, ...,
  00→一般交通の場所)
- `ACCIDENT_TYPE_MAP`: 事故類型 (01→人対車両, 21→車両相互, 41→車両単独, 61→列車)

### 2.4 当事者種別コードマップ (~40行)

- `PARTY_TYPE_MAP`: 当事者種別 (01→乗用車-大型, ..., 76→相手なし)
- `INJURY_MAP`: 人身損傷程度 (1→死亡, 2→負傷, 4→損傷なし, 0→対象外)

### 2.5 緯度経度変換関数 (~15行)

- `lib/codemap.ts` に `convertCoordinate(raw: string): number` を実装
- 元データ形式: `430607590` = 43度06分07.590秒
- パース: 先頭2-3桁=度, 次2桁=分, 残り=秒(×10^-5)
- 返り値: 10進数の度 (例: 43.10211...)

### 2.6 テーブル定義 SQL (~30行)

- `scripts/import-csv.ts` の先頭に CREATE TABLE 文を定義
- SPEC.md 記載の全カラム
- 10個のインデックス作成

### 2.7 CSV パーサー + 行変換ロジック (~40行)

- `honhyo_2024.csv` を行ごとに読み込み
- 各カラムをインデックスで取り出し
- コードマップで変換、数値はパース
- `accidents` テーブル用の値配列を生成

### 2.8 バッチ INSERT + 実行 (~30行)

- prepared statement で INSERT
- トランザクションで 1000行ごとにコミット
- 完了後にレコード数を表示
- `deno task import-data` で実行確認

## Phase 3: バックエンド API

### 3.1 DB 接続 (`lib/db.ts`) (~20行)

- `node:sqlite` の `DatabaseSync` でオープン
- パスは `Deno.env.get("SQLITE_PATH") ?? "./accidents.db"`
- シングルトンで接続を保持

### 3.2 クエリ実行関数 (~30行)

- `executeQuery(sql: string): Record<string, unknown>[]`
- SQL を trim して先頭が `SELECT` であることを検証（大文字小文字無視）
- `DROP|DELETE|UPDATE|INSERT|ALTER|CREATE` を含む場合は例外
- `.all()` で結果取得、100行上限で切り詰め

### 3.3 Claude tool 定義 (~40行)

- `lib/claude.ts` に `TOOLS` 配列を定義
- `query_accidents`: sql + explanation パラメータ
- `generate_chart`: chart_type, title, labels, datasets パラメータ

### 3.4 システムプロンプト定義 (~20行)

- SPEC.md 記載のシステムプロンプトを文字列定数として定義
- テーブルのカラム一覧と各カラムの取りうる値の説明を含める

### 3.5 Tool 実行ハンドラ (~30行)

- `handleToolCall(name: string, input: unknown)` 関数
- `query_accidents`: `executeQuery` を呼び、結果を JSON 文字列で返す
- `generate_chart`: 入力をそのまま JSON で返す（フロントに中継）

### 3.6 Tool use ループ (~40行)

- `chat(messages: Message[])` 関数 (async generator)
- Claude API にメッセージ送信
- レスポンスに `tool_use` があれば実行 → `tool_result` を追加 → 再送信
- テキストブロックは `{ type: "text", content }` を yield
- chart ツール結果は `{ type: "chart", config }` を yield
- `stop_reason === "end_turn"` まで繰り返し

### 3.7 API ルート (`routes/api/chat.ts`) (~50行)

- `POST` ハンドラ: リクエストボディから messages を取得
- `chat()` ジェネレータを呼び出し
- ReadableStream + TextEncoder で SSE 形式に変換
  - 各 yield を `data: JSON\n\n` で送信
  - 最後に `data: [DONE]\n\n`
- `Content-Type: text/event-stream` で返却

## Phase 4: フロントエンド

### 4.1 メッセージ型定義 (~15行)

- `islands/Chat.tsx` 内に型定義
- `ChatMessage`: role (user | assistant), content (string), charts
  (ChartConfig[])
- `ChartConfig`: chart_type, title, labels, datasets

### 4.2 SSE 受信ロジック (~40行)

- `fetch("/api/chat", { method: "POST", body })` で送信
- `response.body.getReader()` で ReadableStream を読む
- `data:` プレフィックスをパースして JSON デコード
- type に応じてメッセージ state を更新

### 4.3 入力フォーム (~30行)

- テキスト input + 送信ボタン
- Enter キーで送信
- 送信中は input を disabled に
- 送信後に input をクリア

### 4.4 サジェストボタン (~25行)

- 6つの質問例をボタンとして表示
- メッセージが空の時のみ表示
- クリックで質問を送信

### 4.5 メッセージ表示 (~40行)

- メッセージ一覧を map で描画
- user: 右寄せ、青背景
- assistant: 左寄せ、グレー背景
- 応答中はローディングインジケータ表示
- メッセージ追加時に自動スクロール

### 4.6 Chart コンポーネント (`islands/Chart.tsx`) (~60行)

- props で ChartConfig を受け取る
- `useEffect` で canvas に Chart.js を初期化
- Chart.js は esm.sh から import
- コンポーネントのアンマウント時に destroy

### 4.7 メインページ (`routes/index.tsx`) (~40行)

- `<head>` にタイトル、meta
- ヘッダー: アプリ名 + 簡単な説明
- `<Chat />` island を配置
- フッター: 出典表記

### 4.8 スタイリング (~50行)

- `static/styles.css` or Tailwind
- チャットコンテナ: max-width, 中央寄せ
- レスポンシブ: モバイルは全幅、PC は max-w-3xl
- メッセージバブルのスタイル
- 入力エリアを画面下部に固定

## Phase 5: 結合テスト・調整

### 5.1 エンドツーエンド動作確認

- サジェストの各質問を実際に投げて回答を確認
- SQL が正しく生成されること
- グラフが正しく描画されること
- エラー時（不正な質問、空結果）のハンドリング

### 5.2 パフォーマンス確認

- 重いクエリ（全件スキャン等）の応答時間を確認
- 必要に応じてインデックス追加・クエリのLIMIT調整

## Phase 6: デプロイ

### 6.1 Docker 化

- Dockerfile 作成（SPEC.md 記載の内容）
- ローカルで `docker build` & `docker run` で動作確認

### 6.2 Fly.io デプロイ

- `fly launch --region nrt`
- Volume 作成・マウント確認
- `ANTHROPIC_API_KEY` を secrets に設定
- `fly deploy`
- SSH で `deno task import-data` 実行
- 本番動作確認
