import type { PageProps } from "fresh";

export default function App({ Component }: PageProps) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>交通事故分析チャット</title>
        <meta
          name="description"
          content="2024年の交通事故データをAIが分析するチャットボット"
        />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
