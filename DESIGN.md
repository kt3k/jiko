# Design System

## Product Context

- **What:** 交通事故オープンデータを自然言語で分析するチャットボット（技術デモ）
- **Who:** 開発者、交通安全関係者、研究者
- **Type:** チャット UI (single page app)

## Typography

- **Body/UI:** Tailwind default sans (`ui-sans-serif, system-ui, sans-serif`)
- **Code/Tool logs:** Tailwind default mono
  (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`)
- **Scale:** text-xs(12), text-sm(14), text-base(16), text-xl(20)

## Color

- **Approach:** restrained (1 accent + neutrals)
- **Accent:** blue-600 `#2563eb` (user message, send button, focus ring)
- **User bubble:** blue-600 text-white
- **Assistant bubble:** white, border gray-200
- **Tool log bubble:** gray-50, border gray-200, text gray-400
- **Background:** gray-100
- **Text:** gray-800 (primary), gray-500 (secondary), gray-400 (muted)
- **Success:** green-500 (tool done indicator)
- **Code blocks:** github-dark theme (highlight.js)

## Spacing

- **Base unit:** 4px (Tailwind default)
- **Density:** comfortable
- **Message gap:** mb-3 (12px)
- **Input padding:** py-2.5 px-4
- **Container max-width:** max-w-3xl (48rem)

## Layout

- **Structure:** full-height flex column (header / chat / footer)
- **Chat area:** flex-1 overflow-y-auto
- **Input area:** sticky bottom with border-t
- **Message alignment:** user right, assistant left, tool log left
- **Message max-width:** 80%

## Border Radius

- **Bubbles:** rounded-2xl (16px), with sm corner on sender side
- **Input/Button:** rounded-full
- **Tool dropdown:** rounded-lg (8px)
- **Chart wrapper:** rounded-lg (8px)

## Decisions Log

| Date       | Decision             | Rationale                           |
| ---------- | -------------------- | ----------------------------------- |
| 2026-04-10 | System font stack    | 技術デモ、カスタムフォント不要      |
| 2026-04-10 | Blue accent only     | シンプル、Tailwind デフォルトで十分 |
| 2026-04-10 | github-dark for code | Tool log の SQL/JSON が見やすい     |
