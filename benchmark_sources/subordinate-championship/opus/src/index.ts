// Worker の入口。部屋の作成・参加の受付と、WebSocket を部屋の Durable Object へ渡す。
// 画面（public/）は Workers の静的アセットとして配信する。
import { ERROR_MESSAGES } from "./game";
import type { JoinResult } from "./room";
import { newRoomCode, normalizeCode } from "./code";

export { Room } from "./room";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function roomStub(env: Env, code: string) {
  return env.ROOM.get(env.ROOM.idFromName(code));
}

const STATUS: Record<string, number> = {
  room_not_found: 404,
  room_full: 409,
  already_started: 409,
  name_taken: 409,
  invalid_name: 400,
};

function joinResponse(res: JoinResult): Response {
  if (res.ok) return json(res);
  return json(res, STATUS[res.error] ?? 400);
}

async function readName(request: Request): Promise<unknown> {
  try {
    const body = (await request.json()) as { name?: unknown };
    return body?.name;
  } catch {
    return undefined;
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api", "rooms", CODE, action]

    if (parts[0] !== "api") return env.ASSETS.fetch(request);

    if (parts[1] === "rooms" && parts.length === 2 && request.method === "POST") {
      const name = await readName(request);
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = newRoomCode();
        const res = await roomStub(env, code).create(code, name);
        if (res.ok || res.error === "invalid_name") return joinResponse(res);
      }
      return json({ ok: false, error: "busy", message: "部屋を作れませんでした。もう一度お試しください" }, 503);
    }

    if (parts[1] === "rooms" && parts[2]) {
      const code = normalizeCode(parts[2]);
      if (!code) return json({ ok: false, error: "room_not_found", message: ERROR_MESSAGES.room_not_found }, 404);
      const stub = roomStub(env, code);

      if (parts.length === 3 && request.method === "GET") {
        return json(await stub.info());
      }
      if (parts[3] === "join" && request.method === "POST") {
        return joinResponse(await stub.join(await readName(request)));
      }
      if (parts[3] === "ws") {
        if (request.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
        return stub.fetch(request);
      }
    }

    return json({ ok: false, error: "bad_request", message: ERROR_MESSAGES.bad_request }, 404);
  },
} satisfies ExportedHandler<Env>;
