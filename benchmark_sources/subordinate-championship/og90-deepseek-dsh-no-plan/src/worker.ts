/**
 * Worker の入口。
 * - /api/* は部屋ごとの Durable Object へルーティングする
 * - それ以外は Workers Static Assets（public/）を返す
 *
 * ローカル開発専用。deploy も Cloudflare ログインも不要。
 */
import type { Env } from "./env";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

export { QuizRoom } from "./room";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      return await env.ASSETS.fetch(request);
    } catch (err) {
      return json({ error: `サーバーエラー: ${(err as Error)?.message ?? err}` }, 500);
    }
  },
};

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]
  const method = request.method.toUpperCase();

  // GET /api/health
  if (parts.length === 2 && parts[1] === "health") {
    return json({ ok: true, now: Date.now() });
  }

  // POST /api/rooms
  if (parts.length === 2 && parts[1] === "rooms" && method === "POST") {
    return createRoom(request, env);
  }

  if (parts.length >= 3 && parts[1] === "rooms") {
    const code = normalizeCode(parts[2]!);
    if (!code) return json({ error: "部屋コードが不正です" }, 400);
    const stub = env.QUIZ_ROOMS.get(env.QUIZ_ROOMS.idFromName(code));

    // POST /api/rooms/:code/join
    if (parts.length === 4 && parts[3] === "join" && method === "POST") {
      const doRes = await stub.fetch(internalUrl("/internal/join"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: await request.text(),
      });
      return passthrough(doRes);
    }

    // GET /api/rooms/:code/ws
    if (parts.length === 4 && parts[3] === "ws") {
      const target = internalUrl("/internal/ws");
      target.searchParams.set("playerId", url.searchParams.get("playerId") ?? "");
      target.searchParams.set("token", url.searchParams.get("token") ?? "");
      return stub.fetch(new Request(target.toString(), request));
    }

    // GET /api/rooms/:code
    if (parts.length === 3 && method === "GET") {
      const doRes = await stub.fetch(internalUrl("/internal/info"));
      return passthrough(doRes);
    }
  }

  return json({ error: "not found" }, 404);
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  const raw = await request.text();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const stub = env.QUIZ_ROOMS.get(env.QUIZ_ROOMS.idFromName(code));
    const target = internalUrl("/internal/create");
    target.searchParams.set("code", code);
    const doRes = await stub.fetch(target.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw,
    });
    if (doRes.status === 409) continue; // コード衝突 → 引き直す
    return passthrough(doRes);
  }
  return json({ error: "部屋コードを確保できませんでした。もう一度お試しください" }, 503);
}

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return out;
}

export function normalizeCode(input: string): string | null {
  const code = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== CODE_LENGTH) return null;
  return code;
}

function internalUrl(path: string): URL {
  return new URL(path, "https://room.internal");
}

async function passthrough(res: Response): Promise<Response> {
  if (res.status === 101) return res;
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json; charset=utf-8" },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
