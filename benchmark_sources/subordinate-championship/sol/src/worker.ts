import { DurableObject } from 'cloudflare:workers';
import { act, createGame, RULES, snapshot, tick, type Action, type Game, type Player } from './game.ts';
interface Env { ROOMS: DurableObjectNamespace<QuizRoom>; ASSETS: Fetcher }
const json = (data: unknown, status = 200) => Response.json(data, { status });
function newPlayer(name: string): Player { return { id: crypto.randomUUID(), token: crypto.randomUUID(), name, score: 0 }; }
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({ error: '同じサイトから接続してください。' }, 403);
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const code = crypto.randomUUID().slice(0, 8).toUpperCase();
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(`${url.origin}/create?code=${code}`, request));
    }
    const match = url.pathname.match(/^\/api\/rooms\/([A-Fa-f0-9]{8})\/(join|socket)$/);
    if (!match) return json({ error: '部屋コードを確認してください。' }, 404);
    const code = match[1].toUpperCase();
    url.pathname = `/${match[2]}`;
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(url, request));
  },
} satisfies ExportedHandler<Env>;
export class QuizRoom extends DurableObject<Env> {
  private game: Game | undefined;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { this.game = await ctx.storage.get<Game>('game'); });
  }
  async fetch(request: Request): Promise<Response> {
    return this.ctx.blockConcurrencyWhile(async () => {
      const url = new URL(request.url);
      if (url.pathname === '/socket') {
        if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'WebSocketが必要です。' }, 426);
        const player = this.game?.players.find(p => p.token === url.searchParams.get('token'));
        if (!player) return json({ error: '復帰情報が正しくありません。部屋に参加し直してください。' }, 401);
        const pair = new WebSocketPair();
        pair[1].serializeAttachment({ id: player.id });
        this.ctx.acceptWebSocket(pair[1]);
        await this.saveAndBroadcast();
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      if (request.method !== 'POST') return json({ error: 'POSTが必要です。' }, 405);
      let body: { name?: unknown };
      try { body = await request.json(); } catch { return json({ error: '入力を確認してください。' }, 400); }
      if (!body || typeof body.name !== 'string' || !body.name.trim()) return json({ error: '名前を入力してください。' }, 400);
      const name = body.name.trim();
      if (url.pathname === '/create') {
        if (this.game) return json({ error: '部屋コードが重複しました。もう一度作成してください。' }, 409);
        const host = newPlayer(name); this.game = createGame(url.searchParams.get('code')!, host);
        await this.saveAndBroadcast(); return json({ code: this.game.code, id: host.id, token: host.token });
      }
      if (!this.game) return json({ error: '部屋が見つかりません。コードを確認してください。' }, 404);
      if (this.game.players.length >= RULES.capacity) return json({ error: 'この部屋は満員です（定員4人）。' }, 409);
      if (this.game.phase !== 'lobby') return json({ error: 'ゲームが始まっています。新しい部屋で遊んでください。' }, 409);
      const player = newPlayer(name); this.game.players.push(player);
      await this.saveAndBroadcast(); return json({ code: this.game.code, id: player.id, token: player.token });
    });
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    await this.ctx.blockConcurrencyWhile(async () => {
      if (!this.game) return;
      const changed = tick(this.game, Date.now());
      let action: Action;
      try { action = JSON.parse(typeof message === 'string' ? message : '') as Action; }
      catch { if (changed) await this.saveAndBroadcast(); ws.send(JSON.stringify({ type: 'error', error: '操作を読み取れません。' })); return; }
      if (!action || typeof action.type !== 'string') { if (changed) await this.saveAndBroadcast(); ws.send(JSON.stringify({ type: 'error', error: '操作を確認してください。' })); return; }
      if (action.type === 'sync') { await this.saveAndBroadcast(); return; }
      const error = act(this.game, ws.deserializeAttachment().id, action, Date.now());
      if (!error || changed) await this.saveAndBroadcast();
      if (error) ws.send(JSON.stringify({ type: 'error', error }));
    });
  }
  async alarm() { await this.ctx.blockConcurrencyWhile(async () => { if (this.game && tick(this.game, Date.now())) await this.saveAndBroadcast(); else await this.schedule(); }); }
  async webSocketClose(ws: WebSocket) {
    // 1005/1006 describe a missing close frame and cannot be sent on the wire.
    ws.close(1000, '接続を終了しました');
    await this.ctx.blockConcurrencyWhile(async () => { await this.saveAndBroadcast(); });
  }
  async webSocketError(ws: WebSocket) { ws.close(1011, '再接続してください'); }
  private async schedule() {
    if (this.game?.phase === 'question') await this.ctx.storage.setAlarm(Math.min(this.game.questionDeadline, this.game.answeringId ? this.game.answerDeadline : Infinity));
    else await this.ctx.storage.deleteAlarm();
  }
  private async saveAndBroadcast() {
    if (!this.game) return;
    this.game.revision++;
    await this.ctx.storage.put('game', this.game);
    await this.schedule();
    const sockets = this.ctx.getWebSockets();
    const state = snapshot(this.game, Date.now(), sockets.map(ws => ws.deserializeAttachment().id));
    const payload = JSON.stringify({ type: 'state', state });
    for (const ws of sockets) { try { ws.send(payload); } catch { /* The next connection receives the persisted snapshot. */ } }
  }
}
