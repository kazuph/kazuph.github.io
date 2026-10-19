/**
 * 1つの部屋 = 1つの Durable Object。
 * 状態は SQLite ストレージに保存し、WebSocket は Hibernation API で受け持つ。
 * 早押しの順番・正誤・点数はすべてこのクラスの中で決める。
 */
import {
  createRoomState,
  findPlayer,
  handleAnswer,
  handleBuzz,
  joinRoom,
  startGame,
  tick,
  toPublicState,
  type RoomState,
} from './game';
import type { Env } from './env';

const STATE_KEY = 'room';
const HEARTBEAT_TIMEOUT_MS = 7_000;

interface SocketAttachment {
  playerId: string;
  lastSeenAt: number;
}

interface CreateBody {
  action: 'create';
  code: string;
  playerId: string;
  name: string;
  token: string;
  seed: number;
}

interface JoinBody {
  action: 'join';
  playerId: string;
  name: string;
  token: string;
}

type ActionBody = CreateBody | JoinBody;

export class Room {
  private readonly ctx: DurableObjectState;
  private readonly env: Env;
  private state: RoomState | null = null;
  private loaded = false;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/ws')) {
      return this.handleWebSocket(request, url);
    }
    if (request.method === 'POST') {
      return this.handleAction(request);
    }
    return json({ error: 'not found' }, 404);
  }

  private async handleAction(request: Request): Promise<Response> {
    let body: ActionBody;
    try {
      body = (await request.json()) as ActionBody;
    } catch {
      return json({ error: 'リクエストが不正です' }, 400);
    }

    const state = await this.ensureLoaded();
    const now = Date.now();

    if (body.action === 'create') {
      if (state) return json({ error: '部屋コードが重複しました' }, 409);
      this.state = createRoomState(
        body.code,
        body.playerId,
        body.name,
        body.token,
        now,
        body.seed,
      );
      await this.save();
      return json({ ok: true, code: body.code });
    }

    if (body.action === 'join') {
      if (!state) return json({ error: '部屋が見つかりません' }, 404);
      const error = joinRoom(state, body.playerId, body.name, body.token, now);
      if (error) return json({ error }, 409);
      await this.save();
      this.broadcast(now);
      return json({ ok: true, code: state.code });
    }

    return json({ error: '不明な操作です' }, 400);
  }

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return json({ error: 'WebSocket で接続してください' }, 400);
    }
    const state = await this.ensureLoaded();
    if (!state) return json({ error: '部屋が見つかりません' }, 404);

    const token = url.searchParams.get('token') ?? '';
    const player = state.players.find((candidate) => candidate.token === token);
    if (!player) return json({ error: 'この部屋に入る権限がありません' }, 403);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const now = Date.now();

    this.ctx.acceptWebSocket(server, [player.id]);
    server.serializeAttachment({ playerId: player.id, lastSeenAt: now } satisfies SocketAttachment);

    // 同じ人の古い接続が残っていたら閉じる（再読み込み対策）。
    for (const other of this.ctx.getWebSockets(player.id)) {
      if (other !== server) {
        try {
          other.close(4001, 'replaced by a newer connection');
        } catch {
          // すでに閉じている場合は何もしない
        }
      }
    }

    if (!player.connected) {
      player.connected = true;
      await this.save();
    }
    this.broadcast(now);
    await this.scheduleAlarm(now);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const state = await this.ensureLoaded();
    if (!state) return;

    const now = Date.now();
    const attachment = this.readAttachment(ws);
    attachment.lastSeenAt = now;
    ws.serializeAttachment(attachment satisfies SocketAttachment);

    const player = findPlayer(state, attachment.playerId);
    let changed = tick(state, now);

    if (player && !player.connected) {
      player.connected = true;
      changed = true;
    }

    if (typeof message !== 'string') {
      if (changed) await this.afterChange(now);
      return;
    }

    let payload: { t?: string; q?: number; choice?: number };
    try {
      payload = JSON.parse(message) as { t?: string; q?: number; choice?: number };
    } catch {
      this.sendError(ws, 'メッセージが不正です');
      return;
    }

    switch (payload.t) {
      case 'ping':
        break;
      case 'start': {
        if (!player) break;
        const error = startGame(state, player.id, now);
        if (error) {
          this.sendError(ws, error);
        } else {
          changed = true;
        }
        break;
      }
      case 'buzz': {
        if (!player) break;
        const result = handleBuzz(state, player.id, Number(payload.q), now);
        // 同時押しで負けた人のエラーは画面に出さない（自然な挙動のため）。
        if (result.ok) changed = true;
        break;
      }
      case 'answer': {
        if (!player) break;
        const result = handleAnswer(state, player.id, Number(payload.q), Number(payload.choice), now);
        if (result.ok) {
          changed = true;
        } else {
          this.sendError(ws, result.error ?? '回答できませんでした');
        }
        break;
      }
      default:
        break;
    }

    if (changed) {
      await this.afterChange(now);
    } else {
      await this.scheduleAlarm(now);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleSocketGone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleSocketGone(ws);
  }

  private async handleSocketGone(ws: WebSocket): Promise<void> {
    const state = await this.ensureLoaded();
    if (!state) return;
    const attachment = this.readAttachment(ws);
    const player = findPlayer(state, attachment.playerId);
    if (!player) return;

    const remaining = this.ctx
      .getWebSockets(player.id)
      .filter((socket) => socket !== ws);
    if (remaining.length === 0 && player.connected) {
      player.connected = false;
      await this.save();
      this.broadcast(Date.now());
    }
    await this.scheduleAlarm(Date.now());
  }

  async alarm(): Promise<void> {
    const state = await this.ensureLoaded();
    if (!state) return;
    const now = Date.now();
    let changed = tick(state, now);

    // 返事が来ない接続は切れたものとみなす（回線断の取りこぼし対策）。
    for (const player of state.players) {
      const sockets = this.ctx.getWebSockets(player.id);
      if (sockets.length === 0) {
        if (player.connected) {
          player.connected = false;
          changed = true;
        }
        continue;
      }
      const stale = sockets.every((socket) => {
        const attachment = this.readAttachment(socket);
        return now - attachment.lastSeenAt > HEARTBEAT_TIMEOUT_MS;
      });
      if (stale) {
        for (const socket of sockets) {
          try {
            socket.close(4000, 'heartbeat timeout');
          } catch {
            // すでに閉じている場合は何もしない
          }
        }
      }
    }

    if (changed) {
      await this.save();
      this.broadcast(now);
    }
    await this.scheduleAlarm(now);
  }

  private async afterChange(now: number): Promise<void> {
    await this.save();
    this.broadcast(now);
    await this.scheduleAlarm(now);
  }

  private async save(): Promise<void> {
    if (this.state) await this.ctx.storage.put(STATE_KEY, this.state);
  }

  private async ensureLoaded(): Promise<RoomState | null> {
    if (this.loaded) return this.state;
    const stored = await this.ctx.storage.get<RoomState>(STATE_KEY);
    this.state = stored ?? null;
    this.loaded = true;
    if (this.state) {
      // 復帰時に、実際に開いている接続と connected の印を合わせる。
      for (const player of this.state.players) {
        player.connected = this.ctx.getWebSockets(player.id).length > 0;
      }
    }
    return this.state;
  }

  private broadcast(now: number): void {
    if (!this.state) return;
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = this.readAttachment(ws);
      if (!attachment.playerId) continue;
      try {
        ws.send(JSON.stringify(toPublicState(this.state, now, attachment.playerId)));
      } catch {
        // 切断済みの接続には送れない。close イベント側で処理する。
      }
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    try {
      ws.send(JSON.stringify({ t: 'error', message }));
    } catch {
      // 切断済みなら何もしない
    }
  }

  private readAttachment(ws: WebSocket): SocketAttachment {
    const raw = ws.deserializeAttachment() as Partial<SocketAttachment> | null;
    return {
      playerId: raw?.playerId ?? '',
      lastSeenAt: raw?.lastSeenAt ?? Date.now(),
    };
  }

  /** いちばん近い締め切り1つだけを Alarm に予約する。 */
  private async scheduleAlarm(now: number): Promise<void> {
    if (!this.state) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    const deadlines: number[] = [];
    if (this.state.phase === 'question' && this.state.questionEndsAt !== null) {
      deadlines.push(this.state.questionEndsAt);
    }
    if (this.state.phase === 'answering' && this.state.answerEndsAt !== null) {
      deadlines.push(this.state.answerEndsAt);
    }
    if (this.state.phase === 'reveal' && this.state.revealEndsAt !== null) {
      deadlines.push(this.state.revealEndsAt);
    }
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = this.readAttachment(ws);
      deadlines.push(attachment.lastSeenAt + HEARTBEAT_TIMEOUT_MS + 250);
    }
    if (deadlines.length === 0) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    const next = Math.max(now + 20, Math.min(...deadlines));
    await this.ctx.storage.setAlarm(next);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
