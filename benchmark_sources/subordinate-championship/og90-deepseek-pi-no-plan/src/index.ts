/**
 * フロントの入り口（Cloudflare Worker）。
 *
 * - 静的ファイルは Workers Assets（binding: ASSETS）から配信する。
 * - /api/rooms ... 部屋コードを採番して Durable Object に委譲する。
 * - ゲームの実処理はすべて部屋ごとの Durable Object（RoomDO）が行う。
 */
import { RoomDO, type Env } from "./room-do";

export { RoomDO };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい O/0/I/1 を除外
const CODE_LENGTH = 4;
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/health") {
      return json({ ok: true, service: "buzzer-quiz" });
    }

    // 部屋を作る
    if (path === "/api/rooms" && request.method === "POST") {
      const body = await safeJson(request);
      const name = typeof body?.name === "string" ? body.name : "";
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = generateCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.fetch(
          new Request(new URL("/api/create", url.origin), {
            method: "POST",
            headers: { "content-type": "application/json", "x-room-code": code },
            body: JSON.stringify({ name }),
          }),
        );
        if (res.status === 409) continue; // コード衝突 → 採番しなおす
        if (!res.ok) return res;
        const data = (await res.json()) as { code: string };
        return json({ ...data, roomPath: `/api/rooms/${data.code}` }, 201);
      }
      return json({ error: "code_generation_failed", message: "部屋コードを採番できませんでした" }, 503);
    }

    const joinMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]{4})\/join$/);
    if (joinMatch && request.method === "POST") {
      const code = joinMatch[1].toUpperCase();
      const body = await request.text(); // ストリームを DO に持ち越さないようここで読み切る
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      return stub.fetch(
        new Request(new URL("/api/join", url.origin), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        }),
      );
    }

    const wsMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]{4})\/ws$/);
    if (wsMatch) {
      const code = wsMatch[1].toUpperCase();
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      // そのまま転送（Upgrade ヘッダを保持するため URL 以外は触らない）
      return stub.fetch(request);
    }

    const snapMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]{4})\/snapshot$/);
    if (snapMatch) {
      const code = snapMatch[1].toUpperCase();
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      return stub.fetch(new Request(new URL("/api/snapshot", url.origin), request));
    }

    if (path.startsWith("/api/")) {
      return json({ error: "not_found", message: "そのエンドポイントはありません" }, 404);
    }

    // それ以外は静的アセット
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function safeJson(request: Request): Promise<{ name?: unknown } | null> {
  try {
    return (await request.json()) as { name?: unknown };
  } catch {
    return null;
  }
}
