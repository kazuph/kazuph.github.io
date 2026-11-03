/**
 * Cloudflare Worker の入口。
 *
 * /api/* を受け付けて、1部屋 = 1 Durable Object (Room) に渡す。
 * それ以外のURLは静的アセット (public/) を返す。
 */

import { Room, makeRoomCode } from "./room";
import type { Env } from "./env";

export { Room };
export type { Env };

const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,10}$/;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function roomStub(env: Env, code: string): Promise<DurableObjectStub<Room> | null> {
  if (!ROOM_CODE_PATTERN.test(code)) return null;
  const id = env.ROOM.idFromName(code);
  return env.ROOM.get(id);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/rooms" && request.method === "POST") {
      return createRoom(request, env);
    }

    const joinMatch = /^\/api\/rooms\/([A-Za-z0-9]+)\/join$/.exec(path);
    if (joinMatch && request.method === "POST") {
      return joinRoom(joinMatch[1].toUpperCase(), request, env);
    }

    const wsMatch = /^\/api\/rooms\/([A-Za-z0-9]+)\/ws$/.exec(path);
    if (wsMatch) {
      return openWebSocket(wsMatch[1].toUpperCase(), request, env);
    }

    if (path.startsWith("/api/")) {
      return json({ error: "Not Found" }, 404);
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;
    }
    return new Response("Not Found", { status: 404 });
  },
};

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim().slice(0, 20) || "ゲスト";

  // 部屋コード uniqueness を試す（衝突したら次のコードを引く）
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = makeRoomCode();
    const stub = env.ROOM.get(env.ROOM.idFromName(code));
    const existing = await stub.fetch("http://room/exists");
    if (existing.status === 200) continue;
    const response = await stub.fetch("http://room/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.status === 200) {
      const data = (await response.json()) as { playerId: string; token: string; host: boolean };
      return json({ code, playerId: data.playerId, token: data.token, host: data.host, name });
    }
    // 何かあれば次のコードで試す
  }
  return json({ error: "部屋を作れませんでした。もう一度お試しください。" }, 500);
}

async function joinRoom(code: string, request: Request, env: Env): Promise<Response> {
  const stub = await roomStub(env, code);
  if (!stub) {
    return json({ error: "部屋が見つかりません" }, 404);
  }
  const exists = await stub.fetch("http://room/exists");
  if (exists.status !== 200) {
    return json({ error: "部屋が見つかりません" }, 404);
  }
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const response = await stub.fetch("http://room/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    playerId?: string;
    token?: string;
    host?: boolean;
  };
  if (response.status !== 200) {
    return json({ error: data.error ?? "参加できませんでした" }, response.status);
  }
  return json({
    code,
    playerId: data.playerId,
    token: data.token,
    host: data.host,
    name: (body.name ?? "").trim().slice(0, 20) || "ゲスト",
  });
}

async function openWebSocket(code: string, request: Request, env: Env): Promise<Response> {
  const stub = await roomStub(env, code);
  if (!stub) {
    return new Response("Not Found", { status: 404 });
  }
  const url = new URL(request.url);
  const target = new URL(`http://room/ws?token=${encodeURIComponent(url.searchParams.get("token") ?? "")}`);
  return stub.fetch(target.toString(), {
    headers: request.headers,
  });
}
