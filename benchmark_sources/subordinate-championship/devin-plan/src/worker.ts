import { Room } from "./room";
import type { Env } from "./room";

export { Room };

// 0/O・1/I を除いた英大文字と数字
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function validName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= 20;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
      if (!validName(body?.name)) return json({ error: "名前を入力してください" }, 400);
      // 部屋コードの衝突はほぼ起きないが、一応リトライする
      for (let i = 0; i < 5; i++) {
        const code = makeCode();
        const stub = env.ROOM.get(env.ROOM.idFromName(code));
        const res = await stub.fetch("https://room/init", {
          method: "POST",
          body: JSON.stringify({ code, name: body!.name.trim() }),
        });
        if (res.status !== 409) return res;
      }
      return json({ error: "部屋を作れませんでした。もう一度お試しください" }, 500);
    }

    const join = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})\/join$/);
    if (join && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
      if (!validName(body?.name)) return json({ error: "名前を入力してください" }, 400);
      const stub = env.ROOM.get(env.ROOM.idFromName(join[1]));
      return stub.fetch("https://room/join", {
        method: "POST",
        body: JSON.stringify({ name: body!.name.trim() }),
      });
    }

    const ws = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})\/ws$/);
    if (ws && request.method === "GET") {
      const stub = env.ROOM.get(env.ROOM.idFromName(ws[1]));
      const doUrl = new URL("https://room/ws");
      doUrl.search = url.search;
      return stub.fetch(new Request(doUrl, request));
    }

    return json({ error: "not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
