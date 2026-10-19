import { Room } from "./room.js";

export { Room };

interface Env {
  ROOM: DurableObjectNamespace;
}

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const buf = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (const b of buf) code += CODE_CHARS[b % CODE_CHARS.length];
  return code;
}

function randomId(prefix: string): string {
  const buf = crypto.getRandomValues(new Uint8Array(16));
  let hex = "";
  for (const b of buf) hex += b.toString(16).padStart(2, "0");
  return `${prefix}_${hex}`;
}

function roomStub(env: Env, code: string): DurableObjectStub {
  const id = env.ROOM.idFromName(code.toUpperCase());
  return env.ROOM.get(id);
}

async function forward(
  stub: DurableObjectStub,
  path: string,
  req: Request,
): Promise<Response> {
  const url = new URL(req.url);
  const target = new URL(path, "http://room.do");
  target.search = url.search;
  const init: RequestInit = {
    method: req.method,
    headers: req.headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }
  return stub.fetch(new Request(target.toString(), init));
}

function badName(name: unknown): string | null {
  if (typeof name !== "string") return "名前を入力してください";
  if (!name.trim()) return "名前を入力してください";
  if (name.trim().length > 20) return "名前は20文字までです";
  return null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // 部屋を作る
    if (url.pathname === "/api/rooms" && req.method === "POST") {
      let body: { name?: unknown };
      try {
        body = (await req.json()) as { name?: unknown };
      } catch {
        return Response.json({ error: "名前を入力してください" }, { status: 400 });
      }
      const err = badName(body.name);
      if (err) return Response.json({ error: err }, { status: 400 });
      const name = (body.name as string).trim();
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        const playerId = randomId("p");
        const token = randomId("tok");
        const stub = roomStub(env, code);
        const res = await stub.fetch(
          new Request("http://room.do/internal/create", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code, name, playerId, token }),
          }),
        );
        if (res.status === 409) continue; // 衝突したら引き直す
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          return Response.json(
            { error: data.error ?? "部屋を作れませんでした" },
            { status: res.status },
          );
        }
        return Response.json({ code, playerId, token });
      }
      return Response.json({ error: "部屋を作れませんでした" }, { status: 500 });
    }

    // 部屋に参加する
    const joinMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/join$/);
    if (joinMatch && req.method === "POST") {
      const code = (joinMatch[1] ?? "").toUpperCase();
      let body: { name?: unknown; playerId?: unknown; token?: unknown };
      try {
        body = (await req.json()) as {
          name?: unknown;
          playerId?: unknown;
          token?: unknown;
        };
      } catch {
        return Response.json({ error: "名前を入力してください" }, { status: 400 });
      }
      const stub = roomStub(env, code);
      // 既存メンバーの再参加トークンがあればそのまま通す
      if (typeof body.playerId === "string" && typeof body.token === "string") {
        const res = await stub.fetch(
          new Request("http://room.do/internal/join", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: typeof body.name === "string" ? body.name : "",
              playerId: body.playerId,
              token: body.token,
            }),
          }),
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          return Response.json(
            { error: data.error ?? "参加できませんでした" },
            { status: res.status },
          );
        }
        return Response.json({ code, playerId: body.playerId, token: body.token });
      }
      const err = badName(body.name);
      if (err) return Response.json({ error: err }, { status: 400 });
      const playerId = randomId("p");
      const token = randomId("tok");
      const res = await stub.fetch(
        new Request("http://room.do/internal/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: (body.name as string).trim(),
            playerId,
            token,
          }),
        }),
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        return Response.json(
          { error: data.error ?? "参加できませんでした" },
          { status: res.status },
        );
      }
      return Response.json({ code, playerId, token });
    }

    // WebSocket / 状態取得は DO にそのまま渡す
    const wsMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/(ws|state)$/);
    if (wsMatch) {
      const code = (wsMatch[1] ?? "").toUpperCase();
      const kind = wsMatch[2];
      const stub = roomStub(env, code);
      if (kind === "ws") return forward(stub, "/ws", req);
      return forward(stub, "/internal/state", req);
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
};
