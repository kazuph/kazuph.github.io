import { RoomObject } from "./room.js";

export { RoomObject };

interface Env {
  ROOM: DurableObjectNamespace;
  ASSETS?: Fetcher;
}

function roomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/health") {
      return json({ ok: true, now: Date.now() });
    }

    if (path === "/api/rooms" && request.method === "POST") {
      let body: { name?: string } = {};
      try {
        body = (await request.json()) as { name?: string };
      } catch {
        return json({ ok: false, message: "名前を入力してください" }, 400);
      }
      const name = String(body.name ?? "").trim();
      if (!name) return json({ ok: false, message: "名前を入力してください" }, 400);
      const code = roomCode();
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      const res = await stub.fetch(
        new Request(`https://do/create?code=${code}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      );
      return res;
    }

    const roomMatch = path.match(/^\/api\/rooms\/([A-Za-z0-9]{4,6})\/(join|ws|state)$/);
    if (roomMatch) {
      const code = roomMatch[1].toUpperCase();
      const action = roomMatch[2];
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      const target = new URL(request.url);
      target.pathname = `/${action}`;
      target.hostname = "do";
      target.protocol = "https:";
      // code をDO側に伝える（create時は使わないがjoin/stateでは検証用）
      target.searchParams.set("code", code);
      const forwarded = new Request(target.toString(), request);
      return stub.fetch(forwarded);
    }

    // 静的アセット（public/）があればそちらを優先し、無ければ404
    if (env.ASSETS) {
      try {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status !== 404) return asset;
      } catch {
        // fallthrough
      }
    }
    if (path.startsWith("/api/")) {
      return json({ ok: false, message: "not found" }, 404);
    }
    return new Response("not found", { status: 404 });
  },
};
