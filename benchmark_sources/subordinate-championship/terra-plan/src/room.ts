import { DurableObject } from 'cloudflare:workers';
import { act, create, deadline, join, publicState, tick, type Action, type Game, type Player } from './game';
import { questions } from './questions';
interface Env { ROOM: DurableObjectNamespace }
type Attachment = { playerId: string };
export class Room extends DurableObject<Env> {
  private game: Game | null = null;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { this.game = (await ctx.storage.get<Game>('game')) ?? null; });
  }
  private async save() {
    if (!this.game) return;
    await this.ctx.storage.put('game', this.game);
    const next = deadline(this.game);
    if (next === null) await this.ctx.storage.deleteAlarm(); else await this.ctx.storage.setAlarm(next);
  }
  private broadcast() {
    if (!this.game) return;
    const sockets = this.ctx.getWebSockets().filter(ws => ws.readyState === WebSocket.OPEN);
    const connected = sockets.map(ws => (ws.deserializeAttachment() as Attachment).playerId);
    const now = Date.now();
    for (const ws of sockets) {
      try { ws.send(JSON.stringify(publicState(this.game, (ws.deserializeAttachment() as Attachment).playerId, connected, now))); }
      catch { /* Closing sockets are removed by the runtime. */ }
    }
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && (url.pathname === '/create' || url.pathname.endsWith('/join'))) {
      if (url.pathname === '/create' && this.game) return new Response(null, { status: 409 });
      if (url.pathname.endsWith('/join') && !this.game) return Response.json({ error: '部屋が見つかりません' }, { status: 404 });
      let name: unknown;
      try { name = ((await request.json()) as { name?: unknown }).name; } catch { return Response.json({ error: '入力が不正です' }, { status: 400 }); }
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 20)
        return Response.json({ error: '名前は1〜20文字で入力してください' }, { status: 400 });
      const player: Player = { id: crypto.randomUUID(), token: crypto.randomUUID(), name: name.trim(), score: 0 };
      if (!this.game) {
        const order = Array.from({ length: questions.length }, (_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]];
        }
        // The Durable Object ID is derived from this code; the worker supplies it through the URL.
        const roomCode = request.headers.get('x-room-code') ?? '';
        this.game = create(roomCode, player, order.slice(0, 10));
      } else {
        const result = join(this.game, player);
        if (result.error) return Response.json({ error: result.error }, { status: 409 });
        this.game = result.game;
      }
      await this.save(); this.broadcast();
      return Response.json({ code: this.game.code, playerId: player.id, token: player.token });
    }
    if (url.pathname.endsWith('/ws') && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const player = this.game?.players.find(p => p.token === url.searchParams.get('token'));
      if (!player) return new Response('Forbidden', { status: 403 });
      for (const old of this.ctx.getWebSockets()) {
        if ((old.deserializeAttachment() as Attachment).playerId === player.id) old.close(1000, '新しい接続');
      }
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]); pair[1].serializeAttachment({ playerId: player.id });
      this.game = tick(this.game!, Date.now()); await this.save(); this.broadcast();
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    return new Response('Not found', { status: 404 });
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (!this.game || typeof message !== 'string') return;
    let action: Action;
    try { action = JSON.parse(message) as Action; } catch { return; }
    if (!action || !['start', 'buzz', 'answer'].includes(action.t)) return;
    const result = act(this.game, (ws.deserializeAttachment() as Attachment).playerId, action, Date.now());
    this.game = result.game; await this.save(); this.broadcast();
    if (result.error) ws.send(JSON.stringify({ t: 'error', message: result.error }));
  }
  async webSocketClose() { this.broadcast(); }
  async webSocketError() { this.broadcast(); }
  async alarm() { if (this.game) { this.game = tick(this.game, Date.now()); await this.save(); this.broadcast(); } }
}
