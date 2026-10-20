import { GameRoom } from "./room";

export interface Env {
  ROOMS: DurableObjectNamespace<GameRoom>;
  ASSETS: Fetcher;
}

function newRoomCode(): string {
  return crypto.randomUUID().toUpperCase();
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/rooms") {
      const body: unknown = await request.json().catch(() => null);
      if (!isRecord(body) || typeof body.name !== "string") return json({ error: "名前を入力してください。" }, 400);
      const name = body.name.trim();
      if (!name) return json({ error: "名前を入力してください。" }, 400);
      while (true) {
        const code = newRoomCode();
        const response = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(`https://room/create?code=${code}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code, name })
        });
        if (response.status !== 409) return response;
      }
    }

    const roomRoute = url.pathname.match(/^\/api\/rooms\/([A-F0-9-]+)\/(join|reconnect)$/);
    if (request.method === "POST" && roomRoute) {
      const [, code, action] = roomRoute;
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(`https://room/${action}`, request);
    }

    const socketRoute = url.pathname.match(/^\/ws\/([A-F0-9-]+)$/);
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket" && socketRoute) {
      const [, code] = socketRoute;
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(`https://room/ws${url.search}`, request));
    }

    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/")) return json({ error: "部屋が見つかりません。コードを確認してください。" }, 404);
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export { GameRoom };
