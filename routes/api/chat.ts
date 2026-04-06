import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  POST(_req) {
    return new Response("not implemented", { status: 501 });
  },
};
