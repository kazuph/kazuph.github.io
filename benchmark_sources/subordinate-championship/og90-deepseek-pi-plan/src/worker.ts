/**
 * Cloudflare Workers の入口。
 * `/api/*` だけを受け付け、部屋ごとの Durable Object に渡す。
 * それ以外のパスは Workers Static Assets（public/）が返す。
 */
import { Room } from "./room";

export { Room };

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const NAME_MAX = 12;

function roomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function cleanName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
}

function cleanCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/health") return json({ ok: true });

    if (path === "/api/rooms" && request.method === "POST") {
      let body: { name?: unknown };
      try {
        body = (await request.json()) as { name?: unknown };
      } catch {
        return json({ error: "リクエストが正しくありません" }, 400);
      }
      const name = cleanName(body.name);
      if (!name) return json({ error: "名前を入れてください" }, 400);

      // 部屋コードがぶつかったら作り直す（実際にはまず起きない）
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const code = roomCode();
        const stub = env.ROOM.get(env.ROOM.idFromName(code));
        const initUrl = new URL("https://room/init");
        const response = await stub.fetch(
          new Request(initUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code, name }),
          }),
        );
        if (response.status !== 409) return new Response(response.body, response);
      }
      return json({ error: "部屋を作れませんでした。もう一度お試しください" }, 503);
    }

    const joinMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/join$/);
    if (joinMatch && request.method === "POST") {
      let body: { name?: unknown };
      try {
        const raw = (await request.json()) as { name?: unknown };
        body = raw;
      } catch {
        return json({ error: "リクエストが正しくありません" }, 400);
      }
      const name = cleanName(body.name);
      if (!name) return json({ error: "名前を入れてください" }, 400);
      const code = cleanCode(joinMatch[1]);
      if (code.length === 0) return json({ error: "部屋コードを確認してください" }, 400);

      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      const response = await stub.fetch(
        new Request("https://room/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      );
      return new Response(response.body, response);
    }

    const wsMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/ws$/);
    if (wsMatch && request.method === "GET") {
      const code = cleanCode(wsMatch[1]);
      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      // Upgrade ヘッダーを保つため、リクエストをそのまま Durable Object に渡す
      return stub.fetch(request);
    }

    return json({ error: "not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
