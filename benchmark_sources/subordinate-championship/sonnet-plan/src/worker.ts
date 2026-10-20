// /api/* の受付。部屋コードから Durable Object を引いて、リクエストをそのまま渡す。
import { Room } from "./room";

export { Room };

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
  ASSETS?: Fetcher;
}

// 紛らわしい 0/O と 1/I を除いた英大文字と数字
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_CREATE_TRIES = 5;

const json = (body: unknown, status = 200): Response => Response.json(body, { status });

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

function roomStub(env: Env, code: string): DurableObjectStub<Room> {
  return env.ROOM.get(env.ROOM.idFromName(code));
}

/** DO へ渡す内部リクエスト。path で操作を、body で入力を伝える */
function toRoom(env: Env, code: string, path: string, init: RequestInit = {}): Promise<Response> {
  return roomStub(env, code).fetch(`https://room/${path}`, { ...init, headers: { "x-room-code": code } });
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  for (let i = 0; i < MAX_CREATE_TRIES; i++) {
    const code = newRoomCode();
    const res = await toRoom(env, code, "create", { method: "POST", body });
    if (res.status !== 409) return res;
  }
  return json({ error: "部屋を作れませんでした。もう一度お試しください" }, 503);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api", "rooms", code?, action?]
    if (parts[0] !== "api" || parts[1] !== "rooms") return json({ error: "見つかりません" }, 404);

    if (parts.length === 2 && request.method === "POST") return createRoom(request, env);

    const code = (parts[2] ?? "").toUpperCase();
    const action = parts[3];
    if (!/^[A-Z0-9]{6}$/.test(code)) return json({ error: "部屋コードが正しくありません" }, 404);
    if (action === "join" && request.method === "POST") {
      return toRoom(env, code, "join", { method: "POST", body: await request.text() });
    }
    if (action === "ws" || action === "me") {
      const token = encodeURIComponent(url.searchParams.get("token") ?? "");
      const headers = new Headers(request.headers);
      headers.set("x-room-code", code);
      return roomStub(env, code).fetch(`https://room/${action}?token=${token}`, { headers, method: "GET" });
    }
    return json({ error: "見つかりません" }, 404);
  },
} satisfies ExportedHandler<Env>;
