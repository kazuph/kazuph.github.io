/**
 * `/api/*` の受付。部屋コードから Durable Object を引き、処理はすべて DO に渡す。
 * それ以外のパスは Workers Static Assets（`public/`）が返す。
 */
import type { Env } from "./env";
import { jsonResponse } from "./http";

// Durable Object のクラスは main の entrypoint から export する必要がある。
export { Room } from "./room";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_NAME_LENGTH = 12;

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
}

function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
  return name.length > 0 ? name : null;
}

function roomStub(env: Env, code: string): DurableObjectStub {
  return env.ROOM.get(env.ROOM.idFromName(code));
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = sanitizeName(body?.name);
  if (!name) {
    return jsonResponse({ error: `名前を入力してください（${MAX_NAME_LENGTH}文字まで）` }, 400);
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomCode();
    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const response = await roomStub(env, code).fetch("https://room.internal/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, playerId, token, name }),
    });
    if (response.ok) return jsonResponse({ code, playerId, token });
    if (response.status !== 409) {
      return jsonResponse({ error: "部屋を作れませんでした" }, 500);
    }
  }
  return jsonResponse({ error: "空いている部屋コードを作れませんでした" }, 500);
}

async function joinRoom(request: Request, env: Env, code: string): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = sanitizeName(body?.name);
  if (!name) {
    return jsonResponse({ error: `名前を入力してください（${MAX_NAME_LENGTH}文字まで）` }, 400);
  }
  const playerId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const response = await roomStub(env, code).fetch(
    `https://room.internal/${code}/join`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId, token, name }),
    },
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => ({ error: "参加できませんでした" }))) as unknown;
    return jsonResponse(data, response.status);
  }
  return jsonResponse({ code, playerId, token });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      return createRoom(request, env);
    }

    const joinMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/join$/);
    if (joinMatch && request.method === "POST") {
      return joinRoom(request, env, normalizeCode(joinMatch[1]));
    }

    const wsMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
    if (wsMatch && request.method === "GET") {
      return roomStub(env, normalizeCode(wsMatch[1])).fetch(request);
    }

    return jsonResponse({ error: "not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
