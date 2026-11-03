/**
 * /api/* の受付。部屋コードから Durable Object を引き、RPC と WebSocket を渡す。
 * それ以外のパスは Workers Static Assets（public/）が返す。
 */
import type { Env } from "./env";
import { Room } from "./room";

export { Room };

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;
const NAME_MAX_LENGTH = 16;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/** 紛らわしい 0/O, 1/I を除いた6文字の部屋コード。 */
function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

function sanitizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, NAME_MAX_LENGTH);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await request.json();
    if (data && typeof data === "object") return data as Record<string, unknown>;
  } catch {
    // 本文が無い・壊れている場合は空として扱う
  }
  return {};
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/rooms" && request.method === "POST") {
      const body = await readJson(request);
      const name = sanitizeName(body.name);
      if (!name) return jsonResponse({ error: "名前を入力してください" }, 400);

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const code = generateCode();
        const stub = env.ROOM.get(env.ROOM.idFromName(code));
        const created = await stub.createRoom(code, name);
        if (created.ok) {
          return jsonResponse({
            code: created.code,
            playerId: created.playerId,
            token: created.token,
          });
        }
      }
      return jsonResponse(
        { error: "部屋を作れませんでした。もう一度お試しください" },
        500,
      );
    }

    const joinMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]{4,8})\/join$/);
    if (joinMatch && request.method === "POST") {
      const code = joinMatch[1]!.toUpperCase();
      const body = await readJson(request);
      const name = sanitizeName(body.name);
      if (!name) return jsonResponse({ error: "名前を入力してください" }, 400);
      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      const result = await stub.joinRoom(name);
      return jsonResponse(result.body, result.status);
    }

    const wsMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]{4,8})\/ws$/);
    if (wsMatch && request.method === "GET") {
      const code = wsMatch[1]!.toUpperCase();
      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      return stub.fetch(request);
    }

    return jsonResponse({ error: "見つかりません" }, 404);
  },
};
