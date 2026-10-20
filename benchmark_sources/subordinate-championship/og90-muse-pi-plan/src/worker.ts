import { makeCode } from "./game";

interface Env {
  ROOM: DurableObjectNamespace;
}

function roomStub(env: Env, code: string): DurableObjectStub {
  return env.ROOM.get(env.ROOM.idFromName(code.toUpperCase()));
}

function newIdentity() {
  return {
    playerId: crypto.randomUUID(),
    token: crypto.randomUUID().replace(/-/g, ""),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/health") {
      return Response.json({ ok: true });
    }

    // 部屋を作る（作った人がホスト）
    if (request.method === "POST" && path === "/api/rooms") {
      let name = "";
      try {
        name = ((await request.json()) as { name?: string }).name ?? "";
      } catch {
        // ignore
      }
      name = name.trim().slice(0, 20);
      if (!name) {
        return Response.json({ error: "名前を入力してください" }, { status: 400 });
      }
      for (let i = 0; i < 5; i++) {
        const code = makeCode();
        const { playerId, token } = newIdentity();
        const res = await roomStub(env, code).fetch(
          new Request("https://room/create", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code, name, playerId, token }),
          }),
        );
        if (res.status === 409) continue; // コード衝突: 引き直す
        if (!res.ok) {
          return Response.json({ error: "部屋を作れませんでした" }, { status: 500 });
        }
        return Response.json({ code, playerId, token });
      }
      return Response.json({ error: "部屋を作れませんでした" }, { status: 500 });
    }

    // 部屋に参加する
    const join = path.match(/^\/api\/rooms\/([A-Za-z0-9]{6})\/join$/);
    if (request.method === "POST" && join) {
      const code = join[1].toUpperCase();
      let name = "";
      try {
        name = ((await request.json()) as { name?: string }).name ?? "";
      } catch {
        // ignore
      }
      name = name.trim().slice(0, 20);
      if (!name) {
        return Response.json({ error: "名前を入力してください" }, { status: 400 });
      }
      const { playerId, token } = newIdentity();
      const res = await roomStub(env, code).fetch(
        new Request("https://room/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, playerId, token }),
        }),
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        return Response.json({ error: body.error ?? "参加できません" }, { status: res.status });
      }
      return Response.json({ code, playerId, token });
    }

    // WebSocket 接続（Durable Object へそのまま渡す）
    const ws = path.match(/^\/api\/rooms\/([A-Za-z0-9]{6})\/ws$/);
    if (ws) {
      const code = ws[1].toUpperCase();
      const token = url.searchParams.get("token") ?? "";
      return roomStub(env, code).fetch(
        new Request(`https://room/ws?token=${encodeURIComponent(token)}`, {
          headers: request.headers,
        }),
      );
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
};

export { Room } from "./room";
