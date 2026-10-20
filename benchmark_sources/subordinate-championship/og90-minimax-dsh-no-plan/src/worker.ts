/**
 * Cloudflare Worker（ローカル開発限定）
 *
 * - /api/rooms        : 部屋作成（部屋コードをサーバーが発行）
 * - /api/rooms/:code  : 部屋情報（存在確認）
 * - /api/rooms/:code/ws : WebSocket（実処理は Durable Object = 1 部屋）
 * - それ以外          : 静的ファイル（public/）
 */

export { Room } from './room';

export interface Env {
  /** 1 部屋 = 1 Durable Object */
  ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

/** 紛らわしい文字（0/O, 1/I, 5/S, 8/B）を除いた 6 文字の部屋コード */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
const CODE_LENGTH = 6;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      return createRoom(env);
    }

    const roomMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)(\/ws)?$/);
    if (roomMatch) {
      const code = normalizeCode(roomMatch[1]);
      if (code.length !== CODE_LENGTH) {
        return json({ ok: false, error: 'invalid_code', message: '部屋コードは6文字です。' }, 400);
      }
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      if (roomMatch[2] === '/ws') {
        // WebSocket アップグレードは Durable Object が受付（101 + webSocket を透過）
        return stub.fetch(request);
      }
      const res = await stub.fetch(new Request('https://room/state'));
      const data = (await res.json()) as { ok: boolean; room?: { phase: string; players: unknown[] } };
      if (!data.ok) {
        return json({ ok: false, error: 'room_not_found', message: 'その部屋コードの部屋は存在しません。' }, 404);
      }
      return json({
        ok: true,
        code,
        phase: data.room?.phase ?? 'lobby',
        playerCount: data.room?.players.length ?? 0,
      });
    }

    // 静的ファイル
    return env.ASSETS.fetch(request);
  },
};

async function createRoom(env: Env): Promise<Response> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCode();
    const id = env.ROOM.idFromName(code);
    const stub = env.ROOM.get(id);
    const res = await stub.fetch(new Request(`https://room/create?code=${code}`));
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (data.ok) {
      return json({ ok: true, code });
    }
    // コード衝突（ごくまれに）→ 次のコードで再試行
  }
  return json({ ok: false, error: 'create_failed', message: '部屋を作成できませんでした。もう一度お試しください。' }, 500);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
