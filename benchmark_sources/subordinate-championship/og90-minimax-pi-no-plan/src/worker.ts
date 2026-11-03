/**
 * Cloudflare Worker（フロントの API ルーター）。
 *
 * - 静的ファイル（public/）は assets バインディングが配信する
 * - 部屋の作成・参加は HTTP API
 * - ゲームの实时通信（早押し・回答・状態同期）は WebSocket
 * - 部屋の実体と采点は Durable Object（src/room.ts）が持つ
 */
import { QuizRoom } from "./room";

export { QuizRoom };

export interface Env {
  QUIZ_ROOM: DurableObjectNamespace;
  ASSETS?: Fetcher;
}

/** 見間違いしにくい 6 文字の部屋コード（O/0/I/1 を除外） */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function roomStub(env: Env, code: string) {
  const id = env.QUIZ_ROOM.idFromName(code);
  return env.QUIZ_ROOM.get(id);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/health") {
        return json({ ok: true, time: Date.now() });
      }

      if (path === "/api/rooms" && request.method === "POST") {
        return await createRoom(request, env);
      }

      const joinMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/join$/);
      if (joinMatch && request.method === "POST") {
        return await joinRoom(request, env, joinMatch[1].toUpperCase());
      }

      const infoMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]+)$/);
      if (infoMatch && request.method === "GET") {
        return await roomInfo(env, infoMatch[1].toUpperCase());
      }

      if (path === "/api/session") {
        return await sessionCheck(url, env);
      }

      if (path === "/ws") {
        return await connectWebSocket(request, url, env);
      }

      // 静的アセットにフォールバック
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response("Not Found", { status: 404 });
    } catch (err) {
      console.error("worker error", err);
      return json({ ok: false, error: "サーバーエラーが発生しました。" }, 500);
    }
  },
};

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) return json({ ok: false, error: "名前を入力してください。" }, 400);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const stub = roomStub(env, code);
    const res = await stub.fetch("https://room.internal/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, name }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; code: string; playerId: string; token: string; name: string }
      | { ok: false; error: string }
      | null;
    if (data && data.ok) {
      return json({
        ok: true,
        code: data.code,
        playerId: data.playerId,
        token: data.token,
        name: data.name,
      });
    }
    if (data && !data.ok && res.status !== 409) {
      return json({ ok: false, error: data.error }, res.status);
    }
    // 409 = コード衝突なので別のコードを引く
  }
  return json({ ok: false, error: "部屋を作成できませんでした。" }, 500);
}

async function joinRoom(request: Request, env: Env, code: string): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) return json({ ok: false, error: "名前を入力してください。" }, 400);

  const stub = roomStub(env, code);
  const res = await stub.fetch("https://room.internal/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json().catch(() => null)) as
    | { ok: true; code: string; playerId: string; token: string; name: string }
    | { ok: false; error: string }
    | null;
  if (!data) return json({ ok: false, error: "通信に失敗しました。" }, 500);
  if (!data.ok) return json({ ok: false, error: data.error }, res.status);
  return json(data);
}

async function roomInfo(env: Env, code: string): Promise<Response> {
  const stub = roomStub(env, code);
  const res = await stub.fetch("https://room.internal/state");
  if (res.status === 404) {
    return json({ ok: false, error: "その部屋が見つかりません。" }, 404);
  }
  const data = (await res.json().catch(() => null)) as
    | {
        code: string;
        phase: string;
        players: unknown[];
      }
    | null;
  if (!data || !data.code) {
    return json({ ok: false, error: "その部屋が見つかりません。" }, 404);
  }
  return json({
    ok: true,
    code: data.code,
    phase: data.phase,
    playerCount: data.players.length,
    full: data.players.length >= 4,
  });
}

async function sessionCheck(url: URL, env: Env): Promise<Response> {
  const code = (url.searchParams.get("code") ?? "").toUpperCase();
  const player = url.searchParams.get("player") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (!code || !player || !token) {
    return json({ ok: false, valid: false, reason: "接続情報が不足しています。" }, 400);
  }
  const stub = roomStub(env, code);
  const target = new URL("https://room.internal/session");
  target.searchParams.set("player", player);
  target.searchParams.set("token", token);
  const res = await stub.fetch(target.toString());
  const data = (await res.json().catch(() => null)) as
    | { ok: boolean; valid: boolean; reason: string }
    | null;
  if (!data) return json({ ok: false, valid: false, reason: "確認できませんでした。" }, 500);
  return json(data);
}

async function connectWebSocket(request: Request, url: URL, env: Env): Promise<Response> {
  const code = (url.searchParams.get("code") ?? "").toUpperCase();
  const player = url.searchParams.get("player") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (!code || !player || !token) {
    return json({ ok: false, error: "接続情報が不足しています。" }, 400);
  }
  const stub = roomStub(env, code);
  const target = new URL("https://room.internal/connect");
  target.searchParams.set("code", code);
  target.searchParams.set("player", player);
  target.searchParams.set("token", token);
  // WebSocket .upgrade ヘッダーはそのまま Durable Object へ引き継ぐ
  const headers = new Headers();
  for (const key of ["upgrade", "connection", "sec-websocket-key", "sec-websocket-version", "sec-websocket-extensions", "sec-websocket-protocol"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  return stub.fetch(target.toString(), { headers });
}
