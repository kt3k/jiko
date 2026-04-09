import Chat from "../islands/Chat.tsx";

export default function Home() {
  return (
    <div class="flex flex-col h-dvh max-w-3xl mx-auto">
      <header class="p-4 text-center border-b border-gray-200 bg-white">
        <h1 class="text-xl font-bold">交通事故分析チャット</h1>
        <p class="text-sm text-gray-500 mt-1">
          2024年の交通事故データ（約29万件）にAIが答えます
        </p>
      </header>
      <main class="flex-1 min-h-0">
        <Chat />
      </main>
      <footer class="px-4 py-2 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        出典: 警察庁交通事故オープンデータ（2024年）
      </footer>
    </div>
  );
}
