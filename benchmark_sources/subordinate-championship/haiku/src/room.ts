import { DurableObject } from 'cloudflare:workers';
import {
  advance,
  answer,
  leaveGame,
  buzz,
  createGame,
  joinGame,
  nextWakeMs,
  pickRandomQuestions,
  startGame,
  validateName,
  viewFor,
  type GameState,
  type Result,
} from './game';
import type { Env } from './types';

interface Attachment {
  playerId: string;
}

/**
 * 1部屋 = 1 Durable Object。状態は ctx.storage に保存し、
 * 判定・点数・早押しの順番はすべてここで決める（ブラウザの申告は信用しない）。
 */
export class QuizRoom extends DurableObject<Env> {
  private state: GameState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<GameState>('state')) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/init' && request.method === 'POST') {
      if (this.state) return json({ error: 'この部屋コードは使われています' }, 409);
      const body = (await request.json()) as { hostName: unknown };
      const v = validateName(body.hostName);
      if (!v.ok) return json({ error: v.error }, 400);
      const playerId = crypto.randomUUID();
      this.state = createGame(url.searchParams.get('code') ?? '', { id: playerId, name: v.name });
      await this.commit();
      return json({ playerId });
    }

    if (!this.state) return json({ error: '部屋が見つかりません' }, 404);

    if (url.pathname === '/join' && request.method === 'POST') {
      const body = (await request.json()) as { name: unknown };
      const v = validateName(body.name);
      if (!v.ok) return json({ error: v.error }, 400);
      const playerId = crypto.randomUUID();
      const r = joinGame(this.state, { id: playerId, name: v.name });
      if (!r.ok) return json({ error: r.error }, 409);
      this.state = r.state;
      await this.commit();
      return json({ playerId });
    }

    if (url.pathname === '/check') {
      const playerId = url.searchParams.get('playerId') ?? '';
      if (!this.state.players.some((p) => p.id === playerId)) {
        return json({ error: 'この部屋の参加者ではありません' }, 403);
      }
      return json({ ok: true });
    }

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('WebSocket接続が必要です', { status: 426 });
      }
      const playerId = url.searchParams.get('playerId') ?? '';
      if (!this.state.players.some((p) => p.id === playerId)) {
        return json({ error: 'この部屋の参加者ではありません' }, 403);
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      // 同じ人の古い接続は閉じる（再読み込み・回線復帰で二重にならないように）
      const replaced = new Set<WebSocket>();
      for (const old of this.ctx.getWebSockets()) {
        if (this.attachmentOf(old)?.playerId === playerId) {
          old.close(4000, 'replaced');
          replaced.add(old);
        }
      }
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ playerId } satisfies Attachment);
      this.sendTo(server, playerId);
      this.broadcast(replaced);
      return new Response(null, { status: 101, webSocket: client });
    }

    return json({ error: 'not found' }, 404);
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const playerId = this.attachmentOf(ws)?.playerId;
    if (!playerId || !this.state) return;
    let msg: { type?: string; choice?: unknown };
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return this.sendError(ws, '不正なメッセージです');
    }
    const now = Date.now();
    let r: Result | null = null;
    switch (msg.type) {
      case 'start':
        r = startGame(advance(this.state, now), playerId, now, pickRandomQuestions);
        break;
      case 'buzz':
        r = buzz(this.state, playerId, now);
        break;
      case 'answer':
        r = answer(this.state, playerId, msg.choice, now);
        break;
      case 'leave':
        r = leaveGame(this.state, playerId);
        if (r.ok) {
          this.state = r.state;
          await this.commit(ws);
        }
        ws.close(1000, 'left');
        return;
      case 'ping':
        return;
      default:
        return this.sendError(ws, '不明な操作です');
    }
    if (!r.ok) {
      // 失敗した操作も、期限切れの処理だけは反映しておく
      this.state = advance(this.state, now);
      await this.commit();
      return this.sendError(ws, r.error);
    }
    this.state = r.state;
    await this.commit();
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      // 既に閉じている
    }
    this.broadcast(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.broadcast(ws);
  }

  async alarm(): Promise<void> {
    if (!this.state) return;
    this.state = advance(this.state, Date.now());
    await this.commit();
  }

  /** 状態を保存し、次の期限の alarm を張り直し、全員へ配る。 */
  private async commit(closing: WebSocket | Set<WebSocket> = new Set()): Promise<void> {
    if (!this.state) return;
    await this.ctx.storage.put('state', this.state);
    const wake = nextWakeMs(this.state);
    if (wake === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(wake);
    this.broadcast(closing);
  }

  private attachmentOf(ws: WebSocket): Attachment | null {
    return (ws.deserializeAttachment() as Attachment | null) ?? null;
  }

  /** 閉じている（閉じ始めた）接続は、人数にも配信にも数えない。 */
  private liveSockets(closing: WebSocket | Set<WebSocket>): WebSocket[] {
    const skip = closing instanceof Set ? closing : new Set([closing]);
    return this.ctx.getWebSockets().filter((ws) => !skip.has(ws));
  }

  private connectedIds(closing: WebSocket | Set<WebSocket> = new Set()): Set<string> {
    const ids = new Set<string>();
    for (const ws of this.liveSockets(closing)) {
      const id = this.attachmentOf(ws)?.playerId;
      if (id) ids.add(id);
    }
    return ids;
  }

  private broadcast(closing: WebSocket | Set<WebSocket> = new Set()): void {
    const connected = this.connectedIds(closing);
    for (const ws of this.liveSockets(closing)) {
      const id = this.attachmentOf(ws)?.playerId;
      if (id) this.sendTo(ws, id, connected);
    }
  }

  private sendTo(ws: WebSocket, playerId: string, connected = this.connectedIds()): void {
    if (!this.state) return;
    const view = viewFor(this.state, playerId, connected, Date.now());
    try {
      ws.send(JSON.stringify({ type: 'state', state: view }));
    } catch {
      // 閉じ始めた接続には送れない（次の配信で正しい人数になる）
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    try {
      ws.send(JSON.stringify({ type: 'error', message }));
    } catch {
      // 閉じ始めた接続には送れない
    }
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
