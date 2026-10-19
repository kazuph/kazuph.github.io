// /api/* の入口。部屋に関する処理はすべて Durable Object（Room）に渡す。

import { Room } from './room';
import type { Env } from './types';

export { Room };
export type { Env };

// 紛らわしい文字（0/O、1/I）を除いた英大文字と数字。
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function makeRoomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true });
    }

    // POST /api/rooms : 新しい部屋を作る。コードを決めて DO に初期化を頼む。
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const body = await request.text();
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeRoomCode();
        const id = env.ROOM.idFromName(code);
        const stub = env.ROOM.get(id);
        const res = await stub.fetch('https://room.internal/init', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: parseName(body), code }),
        });
        if (res.status === 409) continue; // コードが衝突したら作り直す
        return res;
      }
      return jsonError('部屋コードを用意できませんでした', 500);
    }

    // /api/rooms/:code/... : 部屋コードから DO を引いてそのまま渡す。
    const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/(join|ws)$/);
    if (match) {
      const code = match[1];
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      const target = new URL(request.url);
      target.pathname = `/${match[2]}`;
      return stub.fetch(new Request(target, request));
    }

    return jsonError('見つかりません', 404);
  },
};

function parseName(body: string): string {
  try {
    const parsed = JSON.parse(body) as { name?: unknown };
    return typeof parsed.name === 'string' ? parsed.name : '';
  } catch {
    return '';
  }
}
