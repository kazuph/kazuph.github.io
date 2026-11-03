// /api/* の受付。部屋の作成・参加は Durable Object（Room）に RPC で、
// WebSocket upgrade は DO の fetch にそのまま渡す。
import { Room } from "./room";

export { Room };

import type { JoinResult } from "./room";

export interface Env {
  ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

// 紛らわしい文字（0/O、1/I）を除いた英大文字と数字
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function newIdentity(): { playerId: string; token: string } {
  return { playerId: crypto.randomUUID(), token: crypto.randomUUID() };
}

export type { JoinResult };

interface RoomStub {
  create(code: string, name: string, playerId: string, token: string): Promise<JoinResult>;
  join(name: string, playerId: string, token: string): Promise<JoinResult>;
  fetch(request: Request): Promise<Response>;
}

async function readJson<T>(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // fallthrough
  }
  return {};
}

function roomStub(env: Env, code: string): RoomStub {
  return env.ROOM.get(env.ROOM.idFromName(code)) as unknown as RoomStub;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const body = await readJson(request);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 20) {
        return json({ error: "名前を入れてください" }, 400);
      }
      const code = generateCode();
      const { playerId, token } = newIdentity();
      const result = await roomStub(env, code).create(code, name, playerId, token);
      return json(result, result.status);
    }

    const joinMatch = /^\/api\/rooms\/([A-Za-z0-9]+)\/join$/.exec(url.pathname);
    if (joinMatch && request.method === "POST") {
      const code = joinMatch[1]!.toUpperCase();
      const body = await readJson(request);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 20) {
        return json({ error: "名前を入れてください" }, 400);
      }
      const { playerId, token } = newIdentity();
      const result = await roomStub(env, code).join(name, playerId, token);
      return json(result, result.status);
    }

    const wsMatch = /^\/api\/rooms\/([A-Za-z0-9]+)\/ws$/.exec(url.pathname);
    if (wsMatch && request.method === "GET") {
      const code = wsMatch[1]!.toUpperCase();
      return roomStub(env, code).fetch(request);
    }

    return json({ error: "見つかりません" }, 404);
  },
} satisfies ExportedHandler<Env>;
