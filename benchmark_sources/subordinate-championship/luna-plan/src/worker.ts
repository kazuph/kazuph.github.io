import { Room } from './room';

export { Room };

type Env = {
  ROOM: DurableObjectNamespace<Room>;
  ASSETS: Fetcher;
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      return createRoom(request, env);
    }

    const roomRoute = url.pathname.match(/^\/api\/rooms\/([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6})(?:\/(join|ws))?$/);
    if (roomRoute) {
      const [, code, action] = roomRoute;
      const room = env.ROOM.get(env.ROOM.idFromName(code));
      if (action === 'join' && request.method === 'POST') {
        return joinRoom(request, room, code);
      }
      if (action === 'ws' && request.method === 'GET') {
        return room.fetch(new Request(`http://room/ws${url.search}`, request));
      }
      if (!action && request.method === 'GET') {
        return json({ error: 'APIのパスが違います' }, 404);
      }
    }

    if (url.pathname.startsWith('/api/')) return json({ error: '見つかりません' }, 404);
    return env.ASSETS.fetch(request);
  },
};

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  if (!body || typeof body.name !== 'string' || !normalizeName(body.name)) {
    return json({ error: '名前を入力してください' }, 400);
  }

  while (true) {
    const code = createCode();
    const room = env.ROOM.get(env.ROOM.idFromName(code));
    const player = { id: crypto.randomUUID(), name: normalizeName(body.name), token: createToken() };
    const response = await room.fetch(new Request('http://room/internal/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, player }),
    }));
    if (response.status === 409) continue;
    if (!response.ok) return response;
    return json({ code, ...player }, 201);
  }
}

async function joinRoom(request: Request, room: DurableObjectStub<Room>, code: string): Promise<Response> {
  const body = await readBody(request);
  if (!body || typeof body.name !== 'string' || !normalizeName(body.name)) {
    return json({ error: '名前を入力してください' }, 400);
  }
  const player = { id: crypto.randomUUID(), name: normalizeName(body.name), token: createToken() };
  const response = await room.fetch(new Request('http://room/internal/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(player),
  }));
  if (!response.ok) return response;
  return json({ code, ...player }, 201);
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function normalizeName(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

function createCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
