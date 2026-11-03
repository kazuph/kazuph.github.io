import { Room } from "./room";

export { Room };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function roomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function stub(env: Env, code: string): DurableObjectStub<Room> {
  return env.ROOMS.get(env.ROOMS.idFromName(code.toUpperCase()));
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Create a room: POST /api/rooms  {name}
    if (request.method === "POST" && url.pathname === "/api/rooms") {
      const body = (await request.json().catch(() => ({}))) as { name?: string };
      const code = roomCode();
      const res = await stub(env, code).fetch("https://do/join", {
        method: "POST",
        body: JSON.stringify({ name: body.name ?? "", host: true }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) return json(data, res.status);
      return json({ roomCode: code, ...data });
    }

    // Join an existing room: POST /api/rooms/:code/join  {name}
    const joinMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]{4,10})\/join$/);
    if (request.method === "POST" && joinMatch) {
      const body = (await request.json().catch(() => ({}))) as { name?: string };
      const res = await stub(env, joinMatch[1]).fetch("https://do/join", {
        method: "POST",
        body: JSON.stringify({ name: body.name ?? "", host: false }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) return json(data, res.status);
      return json({ roomCode: joinMatch[1].toUpperCase(), ...data });
    }

    // Realtime: GET /ws?room=CODE&playerId=...&token=...
    if (url.pathname === "/ws") {
      const code = url.searchParams.get("room");
      if (!code) return json({ error: "room required" }, 400);
      return stub(env, code).fetch(
        new Request(`https://do/ws${url.search}`, request)
      );
    }

    // Session validity probe used before reconnecting the websocket.
    const sessionMatch = url.pathname.match(
      /^\/api\/rooms\/([A-Za-z0-9]{4,10})\/session$/
    );
    if (request.method === "GET" && sessionMatch) {
      return stub(env, sessionMatch[1]).fetch(
        `https://do/session${url.search}`
      );
    }

    // Room existence probe used by the client before joining.
    const peekMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]{4,10})$/);
    if (request.method === "GET" && peekMatch) {
      return stub(env, peekMatch[1]).fetch("https://do/peek");
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
