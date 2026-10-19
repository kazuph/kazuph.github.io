import type { Env } from './env';
import { MAX_PLAYERS } from './game';

export { Room } from './room';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health') {
        return json({ ok: true });
      }
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        return createRoom(request, env);
      }
      const joinMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/join$/);
      if (joinMatch && request.method === 'POST') {
        return joinRoom(request, env, joinMatch[1]);
      }
      const wsMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
      if (wsMatch && request.method === 'GET') {
        return openSocket(request, env, wsMatch[1]);
      }
      if (url.pathname.startsWith('/api/')) {
        return json({ error: 'not found' }, 404);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error('worker error', error);
      return json({ error: 'サーバーでエラーが起きました' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const name = readName(body?.name);
  if (!name) return json({ error: '名前は1〜12文字で入力してください' }, 400);

  const code = generateCode();
  const playerId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];

  const stub = env.ROOM.get(env.ROOM.idFromName(code));
  const result = await stub.fetch('https://room.internal/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'create', code, playerId, name, token, seed }),
  });
  if (!result.ok) return passthrough(result);
  return json({ code, playerId, token, maxPlayers: MAX_PLAYERS });
}

async function joinRoom(request: Request, env: Env, rawCode: string): Promise<Response> {
  const code = rawCode.toUpperCase();
  if (!CODE_PATTERN.test(code)) return json({ error: '部屋が見つかりません' }, 404);

  const body = await readJson(request);
  const name = readName(body?.name);
  if (!name) return json({ error: '名前は1〜12文字で入力してください' }, 400);

  const playerId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const stub = env.ROOM.get(env.ROOM.idFromName(code));
  const result = await stub.fetch('https://room.internal/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'join', playerId, name, token }),
  });
  if (!result.ok) return passthrough(result);
  return json({ code, playerId, token });
}

async function openSocket(request: Request, env: Env, rawCode: string): Promise<Response> {
  const code = rawCode.toUpperCase();
  if (!CODE_PATTERN.test(code)) return json({ error: '部屋が見つかりません' }, 404);
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!token) return json({ error: 'トークンがありません' }, 403);

  const stub = env.ROOM.get(env.ROOM.idFromName(code));
  const forwarded = new Request(
    `https://room.internal/ws?token=${encodeURIComponent(token)}`,
    request,
  );
  return stub.fetch(forwarded);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = (await request.json()) as unknown;
    if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

function readName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 12) return null;
  return name;
}

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = '';
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
}

async function passthrough(response: Response): Promise<Response> {
  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
