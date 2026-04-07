import { Handlers } from "$fresh/server.ts";
import { chat } from "../../lib/claude.ts";

export const handler: Handlers = {
  async POST(req) {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of chat(messages)) {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          }
        } catch (e) {
          const error = { type: "error", content: (e as Error).message };
          controller.enqueue(encoder.encode(JSON.stringify(error) + "\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  },
};
