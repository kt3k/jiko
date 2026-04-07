import type { FreshContext } from "fresh";
import { chat } from "../../lib/claude.ts";

export const handler = {
  async POST(ctx: FreshContext) {
    const { messages } = await ctx.req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stream = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const event of chat(messages)) {
            controller.enqueue(JSON.stringify(event) + "\n");
          }
        } catch (e) {
          const error = { type: "error", content: (e as Error).message };
          controller.enqueue(JSON.stringify(error) + "\n");
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream.pipeThrough(new TextEncoderStream()), {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  },
};
