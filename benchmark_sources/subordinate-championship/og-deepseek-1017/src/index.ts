import { QuizRoom } from "./room.js";

export { QuizRoom };

export interface Env {
  ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const ROOM_WS = /^\/api\/room\/([A-Za-z0-9]{1,16})\/ws$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true });
    }

    const m = ROOM_WS.exec(url.pathname);
    if (m) {
      const code = m[1].toUpperCase();
      const id = env.ROOMS.idFromName(code);
      const stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }

    // それ以外は静的アセット（SPA フォールバック付き）。
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
