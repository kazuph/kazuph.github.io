import type { Env } from './types';

export { QuizRoom } from './room';

// 部屋コードに紛らわしい文字（0/O, 1/I）を入れない
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^[A-Z2-9]{4}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function randomCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    // 部屋を作る（作った人がホスト）
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const body = await readJson(request);
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        const stub = env.QUIZ_ROOM.get(env.QUIZ_ROOM.idFromName(code));
        const res = await stub.fetch(
          new Request(`https://room/init?code=${code}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ hostName: body.name }),
          }),
        );
        if (res.status === 409) continue; // 偶然に同じ部屋コードが出たら引き直す
        const data = (await res.json()) as Record<string, unknown>;
        return json({ ...data, code }, res.status);
      }
      return json({ error: '部屋を作れませんでした。もう一度試してください' }, 503);
    }

    const m = url.pathname.match(/^\/api\/rooms\/([^/]+)\/(join|check|ws)$/);
    if (!m) return json({ error: 'not found' }, 404);
    const code = decodeURIComponent(m[1]).toUpperCase();
    if (!CODE_PATTERN.test(code)) return json({ error: '部屋コードは4文字です' }, 400);
    const stub = env.QUIZ_ROOM.get(env.QUIZ_ROOM.idFromName(code));
    const action = m[2];

    if (action === 'join' && request.method === 'POST') {
      const body = await readJson(request);
      return stub.fetch(
        new Request(`https://room/join`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: body.name }),
        }),
      );
    }
    if (action === 'check' && request.method === 'GET') {
      return stub.fetch(new Request(`https://room/check?playerId=${encodeURIComponent(url.searchParams.get('playerId') ?? '')}`));
    }
    if (action === 'ws' && request.method === 'GET') {
      return stub.fetch(new Request(`https://room/ws?playerId=${encodeURIComponent(url.searchParams.get('playerId') ?? '')}`, request));
    }
    return json({ error: 'method not allowed' }, 405);
  },
} satisfies ExportedHandler<Env>;
