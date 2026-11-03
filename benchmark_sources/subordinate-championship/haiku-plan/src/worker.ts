// /api/* の受付。部屋の作成・参加・WebSocket の接続は Durable Object（Room）へ渡す。
// それ以外のパス（画面・JS・CSS）は Workers Static Assets が配る。
import type { Env } from "./env";

export { Room } from "./room";

// 0/O・1/I を除いた英大文字と数字（32文字）
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const ROOM_ROUTE = /^\/api\/rooms\/([^/]+)\/(join|me|ws)$/;

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  const length = [...name].length;
  return length >= 1 && length <= 12 ? name : null;
}

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

function roomStub(env: Env, code: string): DurableObjectStub<import("./room").Room> {
  return env.ROOM.get(env.ROOM.idFromName(code));
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  const name = parseName((await readBody(request)).name);
  if (!name) return json({ error: "名前は1〜12文字で入力してください" }, 400);
  // 部屋コードが既に使われていたら別のコードで作り直す
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const res = await roomStub(env, code).fetch("https://room/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, name }),
    });
    if (res.status !== 409) return res;
  }
  return json({ error: "部屋を作れませんでした。もう一度お試しください" }, 503);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/rooms" && request.method === "POST") return createRoom(request, env);

    const match = ROOM_ROUTE.exec(url.pathname);
    if (!match) return json({ error: "見つかりません" }, 404);
    const code = decodeURIComponent(match[1]).toUpperCase();
    if (!CODE_RE.test(code)) return json({ error: "部屋コードは6文字です" }, 400);
    const stub = roomStub(env, code);
    const action = match[2];

    if (action === "join" && request.method === "POST") {
      const name = parseName((await readBody(request)).name);
      if (!name) return json({ error: "名前は1〜12文字で入力してください" }, 400);
      return stub.fetch("https://room/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }
    if (action === "me" && request.method === "GET") {
      return stub.fetch(`https://room/me${url.search}`);
    }
    if (action === "ws" && request.method === "GET") {
      return stub.fetch(new Request(`https://room/ws${url.search}`, request));
    }
    return json({ error: "見つかりません" }, 404);
  },
} satisfies ExportedHandler<Env>;
