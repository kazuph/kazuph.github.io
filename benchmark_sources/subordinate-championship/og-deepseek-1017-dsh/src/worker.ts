/**
 * Worker エントリポイント。
 *
 * 役割分担:
 *  - `/api/rooms` (POST): 部屋コードを採番し、対応する Durable Object を初期化する。
 *  - `/ws/:code`: その部屋の Durable Object へ WebSocket をプロキシする。
 *  - それ以外: `public/` の静的アセット（SPA フォールバック付き）。
 *
 * リアルタイム通信は Cloudflare の Durable Objects + WebSocket Hibernation API で完結する。
 * 外部のリアルタイム配信サービスや有料サービスは使わない。
 */
import { generateRoomCode } from "./game";
import type { Env } from "./env";

export { GameRoom } from "./game-room";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const CODE_PATTERN = /^[A-Z0-9]{4,8}$/;

async function createRoom(env: Env): Promise<Response> {
  // ランダムな部屋コードを採番。万一既存と衝突したら数回までやり直す。
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    const response = await stub.fetch("https://room.internal/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      return json({ error: "ROOM_INIT_FAILED" }, 500);
    }
    const data = (await response.json()) as { code: string; existed: boolean };
    if (!data.existed) {
      return json({ code: data.code }, 201);
    }
  }
  return json({ error: "ROOM_CODE_EXHAUSTED" }, 503);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "buzzer-quiz", now: Date.now() });
    }

    if (url.pathname === "/api/rooms") {
      if (request.method !== "POST") {
        return json({ error: "METHOD_NOT_ALLOWED" }, 405);
      }
      return createRoom(env);
    }

    if (url.pathname.startsWith("/ws/")) {
      const code = url.pathname.slice("/ws/".length).toUpperCase();
      if (!CODE_PATTERN.test(code)) {
        return json({ error: "BAD_ROOM_CODE" }, 400);
      }
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      return stub.fetch(request);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
