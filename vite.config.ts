import { defineConfig, type Plugin } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** ビルド後に Worker ソースを _fresh/server へコピーする */
function copyDbWorker(): Plugin {
  return {
    name: "copy-db-worker",
    apply: "build",
    closeBundle() {
      const src = resolve(__dirname, "lib/db_worker.ts");
      const dest = resolve(__dirname, "_fresh/server/db_worker.ts");
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
    },
  };
}

export default defineConfig({
  plugins: [fresh(), tailwindcss(), copyDbWorker()],
  ssr: {
    external: ["@anthropic-ai/sdk"],
  },
});
