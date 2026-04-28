import { App, staticFiles } from "fresh";
import { setCreateMessage } from "./lib/claude.ts";
import { mockCreateMessage } from "./lib/claude_mock.ts";

if (Deno.env.get("JIKO_MOCK") === "1") {
  console.log("[JIKO_MOCK] Anthropic API のモックを使用します");
  setCreateMessage(mockCreateMessage);
}

export const app = new App();

app.use(staticFiles());
app.fsRoutes();
