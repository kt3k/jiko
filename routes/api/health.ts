export const handler = {
  GET() {
    return new Response("ok", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
