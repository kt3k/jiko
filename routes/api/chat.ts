import type { FreshContext } from "fresh";
import { chat } from "../../lib/claude.ts";

export const handler = {
  async POST(ctx: FreshContext) {
    const { messages } = await ctx.req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages is required" }, { status: 400 });
    }

    const stream = ReadableStream.from(async function* () {
      try {
        for await (const event of chat(messages)) {
          yield JSON.stringify(event) + "\n";
        }
      } catch (e) {
        yield JSON.stringify({
          type: "error",
          content: (e as Error).message,
        }) + "\n";
      }
    }());

    return new Response(stream.pipeThrough(new TextEncoderStream()), {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  },
};
