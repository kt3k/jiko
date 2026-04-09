import Chat from "../islands/Chat.tsx";

export default function Home() {
  return (
    <div class="app">
      <header class="header">
        <h1>交通事故分析チャット</h1>
        <p class="subtitle">
          2024年の交通事故データ（約29万件）にAIが答えます
        </p>
      </header>
      <main>
        <Chat />
      </main>
      <footer class="footer">
        出典: 警察庁交通事故オープンデータ（2024年）
      </footer>
    </div>
  );
}
