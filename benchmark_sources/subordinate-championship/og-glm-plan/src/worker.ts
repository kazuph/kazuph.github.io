/**
 * `/api/*` の受付。部屋の作成・参加・WebSocket の接続を Durable Object に渡す。
 * それ以外のパスは静的アセット（public/）へ。
 */

export { Room } from "./room";

export interface Env {
  ROOM: DurableObjectNamespace;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** 紛らわしい文字（0/O、1/I）を除いた英大文字と数字の6文字 */
function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  for (const b of buf) code += alphabet[b % alphabet.length];
  return code;
}

const CODE_RE = /^[A-Z2-9]{6}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/health") return json({ ok: true });

    if (request.method === "POST" && path === "/api/rooms") {
      const body = await request.json().catch(() => null);
      const name = typeof (body as { name?: unknown } | null)?.name === "string" ? (body as { name: string }).name : "";
      if (!name.trim() || name.trim().length > 20) {
        return json({ error: "名前は1〜20文字で入力してください" }, 400);
      }
      const code = makeCode();
      const stub = env.ROOM.get(env.ROOM.idFromName(code));
      return stub.fetch(`https://room/create?code=${code}`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
    }

    const join = request.method === "POST" ? path.match(/^\/api\/rooms\/([A-Z2-9]{6})\/join$/) : null;
    if (join) {
      const stub = env.ROOM.get(env.ROOM.idFromName(join[1]));
      return stub.fetch("https://room/join", { method: "POST", body: await request.text() });
    }

    const wsOrCheck = request.method === "GET" ? path.match(/^\/api\/rooms\/([A-Z2-9]{6})\/ws$/) : null;
    if (wsOrCheck) {
      const stub = env.ROOM.get(env.ROOM.idFromName(wsOrCheck[1]));
      if ((request.headers.get("Upgrade") ?? "").toLowerCase() === "websocket") {
        // WebSocket アップグレードはそのまま渡す
        return stub.fetch(request);
      }
      // アップグレードでない GET は token の有効確認（/check）として渡す
      const checkUrl = new URL("https://room/check");
      checkUrl.search = url.search;
      return stub.fetch(checkUrl.href, { method: "GET", headers: {} });
    }

    return json({ error: "not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
