import type { Env } from "./env";
import { Room } from "./room";

export { Room };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

function json(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const code = generateCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const response = await stub.fetch("https://room/init", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (response.ok) {
          return json({ code }, { status: 201 });
        }
        if (response.status !== 409) {
          return json({ error: "room-create-failed" }, { status: 500 });
        }
      }
      return json({ error: "code-space-exhausted" }, { status: 503 });
    }

    const roomMatch = url.pathname.match(
      /^\/api\/rooms\/([A-Za-z0-9]{4,8})(\/ws)?$/,
    );
    if (roomMatch) {
      const code = roomMatch[1].toUpperCase();
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      if (roomMatch[2] === "/ws") {
        const target = new URL("https://room/ws");
        target.search = url.search;
        return stub.fetch(new Request(target, request));
      }
      if (request.method === "GET") {
        const response = await stub.fetch("https://room/summary");
        const body = (await response.json()) as Record<string, unknown>;
        return json(body, { status: response.status });
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "not-found" }, { status: 404 });
    }

    // Static assets (HTML/CSS/JS) are served by Cloudflare's asset worker.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
