import { DurableObject } from 'cloudflare:workers';
import { createGame, join, act, advance, deadline, snapshot } from './game.js';

const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers });
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({error:'このサイトから操作してください。'},403);
    let code;
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      code = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
      url.pathname = `/api/rooms/${code}/create`;
    } else {
      const match = url.pathname.match(/^\/api\/rooms\/([A-F0-9]{8})\/(join|socket)$/);
      if (!match) return json({error:'部屋コードまたはURLが正しくありません。'},404);
      code = match[1];
    }
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(url, request));
  }
};
export class QuizRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)');
  }
  load() { return this.ctx.storage.sql.exec('SELECT data FROM room WHERE id=1').toArray().map(r=>JSON.parse(r.data))[0]; }
  save(game) { this.ctx.storage.sql.exec('INSERT INTO room(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', JSON.stringify(game)); }
  credential(request, game) {
    const cookie = request.headers.get('Cookie') || '';
    const token = cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(`quick_${game.code}=`))?.split('=')[1];
    return game.players.find(p=>p.token === token);
  }
  async schedule(game) {
    const when = deadline(game);
    if (when) await this.ctx.storage.setAlarm(when); else await this.ctx.storage.deleteAlarm();
  }
  broadcast(game) {
    const data = snapshot(game, Date.now());
    data.players = data.players.map(p=>({...p, online: this.ctx.getWebSockets(p.id).some(ws=>ws.readyState===1)}));
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(JSON.stringify({type:'state', state:data, you:ws.deserializeAttachment().id})); } catch { /* Close callbacks update presence. */ }
    }
  }
  async fetch(request) {
    const url = new URL(request.url), action = url.pathname.split('/').at(-1), code = url.pathname.split('/')[3];
    let game = this.load();
    if (request.method === 'POST' && ['create','join'].includes(action)) {
      let body;
      try { body = await request.json(); } catch { return json({error:'入力を読み取れません。'},400); }
      if (typeof body?.name !== 'string' || !body.name.trim()) return json({error:'名前を入力してください。'},400);
      // Read after parsing the body so concurrent joins cannot overwrite one another.
      game = this.load();
      if (action === 'create') {
        if (game) return json({error:'部屋コードが重複しました。もう一度作成してください。'},409);
        game = createGame(code);
      }
      if (!game) return json({error:'この部屋は見つかりません。コードを確認してください。'},404);
      let player = this.credential(request,game);
      if (!player) {
        player = {id:crypto.randomUUID(), token:crypto.randomUUID()};
        try { join(game,body.name.trim(),player.id,player.token); } catch(error) { return json({error:error.message},409); }
        this.save(game);
      }
      this.broadcast(game);
      return json({code, id:player.id},201, {'Set-Cookie':`quick_${code}=${player.token}; HttpOnly; SameSite=Strict; Path=/api/rooms/${code}`, 'Cache-Control':'no-store'});
    }
    if (!game) return json({error:'この部屋は見つかりません。'},404);
    const player = this.credential(request,game);
    if (!player) return json({error:'参加し直してください。'},401);
    if (action !== 'socket' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({error:'WebSocket接続が必要です。'},400);
    if (advance(game,Date.now())) this.save(game);
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server,[player.id]);
    server.serializeAttachment({id:player.id});
    // A reload replaces the old connection; it cannot keep controlling this seat.
    for (const old of this.ctx.getWebSockets(player.id)) if(old!==server) old.close(1000,'別のタブで接続しました');
    this.broadcast(game);
    await this.schedule(game);
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws, message) {
    const game = this.load();
    if (!game || ws.readyState !== 1) return;
    const before = game.revision;
    try {
      const command = JSON.parse(message);
      act(game, ws.deserializeAttachment().id, command, Date.now());
    } catch(error) { ws.send(JSON.stringify({type:'error',error:error.message})); }
    if (game.revision !== before) this.save(game);
    this.broadcast(game);
    await this.schedule(game);
  }
  async alarm() {
    const game = this.load(); if (!game) return;
    if (advance(game,Date.now())) { this.save(game); this.broadcast(game); }
    await this.schedule(game);
  }
  // The selected compatibility date automatically replies to close frames,
  // including abnormal/no-code closures that cannot be passed to ws.close().
  webSocketClose() { const game=this.load(); if(game) this.broadcast(game); }
  webSocketError(ws) { ws.close(1011,'再接続してください'); }
}
