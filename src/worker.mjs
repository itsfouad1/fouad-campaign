import { handleApi } from "./lib/api.mjs";
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    if (url.pathname.startsWith("/media/")) {
      const id = url.pathname.slice(7);
      if (request.method !== "GET" && request.method !== "HEAD")
        return new Response("Method not allowed", { status: 405 });
      if (!/^[a-f0-9-]{36}$/.test(id) || !env.BUCKET)
        return new Response("Not found", { status: 404 });
      const object = await env.BUCKET.get(id);
      if (!object) return new Response("Not found", { status: 404 });
      return new Response(request.method === "HEAD" ? null : object.body, {
        headers: {
          "Content-Type":
            object.httpMetadata?.contentType || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
