// 1部屋 = 1つの Durable Object。
// 状態の保存、WebSocket の受け付け、全員への配信、Alarm（締め切り）を担当する。
// 正誤や点数は game.ts の純粋関数だけで決める。

import {
  addPlayer,
  answer,
  buzz,
  createLobby,
  nextDeadline,
  snapshot,
  startGame,
  tick,
  type GameState,
} from './game';
import type { Env } from './types';

const STORAGE_KEY = 'state';
const MAX_NAME_LENGTH = 12;

interface Attachment {
  playerId: string;
}

export class Room {
  private readonly ctx: DurableObjectState;
  private readonly env: Env;
  private state: GameState | null = null;
  private loading: Promise<void> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  private load(): Promise<void> {
    if (!this.loading) {
      this.loading = this.ctx.storage.get<GameState>(STORAGE_KEY).then((saved) => {
        this.state = saved ?? null;
      });
    }
    return this.loading;
  }

  async fetch(request: Request): Promise<Response> {
    await this.load();
    const path = new URL(request.url).pathname;
    if (path.endsWith('/init')) return this.handleInit(request);
    if (path.endsWith('/join')) return this.handleJoin(request);
    if (path.endsWith('/ws')) return this.handleWebSocket(request);
    return new Response('Not found', { status: 404 });
  }

  private async handleInit(request: Request): Promise<Response> {
    if (this.state) {
      return Response.json({ error: '部屋がすでにあります' }, { status: 409 });
    }
    const body = (await request.json()) as { name?: string; code?: string };
    const code = body.code ?? '';
    const state = createLobby(code);
    const player = this.newPlayer(body.name);
    addPlayer(state, player);
    this.state = state;
    await this.persist();
    return Response.json({ code, playerId: player.id, token: player.token });
  }

  private async handleJoin(request: Request): Promise<Response> {
    if (!this.state) {
      return Response.json({ error: '部屋が見つかりません' }, { status: 404 });
    }
    const body = (await request.json()) as { name?: string };
    const player = this.newPlayer(body.name);
    const result = addPlayer(this.state, player);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 409 });
    }
    await this.persist();
    this.broadcast();
    return Response.json({
      code: this.state.code,
      playerId: player.id,
      token: player.token,
    });
  }

  private newPlayer(rawName: string | undefined) {
    const name = (rawName ?? '').trim().slice(0, MAX_NAME_LENGTH) || 'プレイヤー';
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return { id: crypto.randomUUID(), name, token };
  }

  private handleWebSocket(request: Request): Response {
    if (!this.state) {
      return Response.json({ error: '部屋が見つかりません' }, { status: 404 });
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return Response.json({ error: 'WebSocket が必要です' }, { status: 426 });
    }
    const token = new URL(request.url).searchParams.get('token');
    const player = this.state.players.find((p) => p.token === token);
    if (!player) {
      return Response.json({ error: 'token が正しくありません' }, { status: 403 });
    }

    // 同じ人の古い接続は閉じて、新しい接続に置き換える。
    for (const ws of this.ctx.getWebSockets(player.id)) {
      try {
        ws.close(4000, 'replaced');
      } catch {
        // すでに閉じている場合は無視
      }
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.serializeAttachment({ playerId: player.id } satisfies Attachment);
    this.ctx.acceptWebSocket(server, [player.id]);

    player.connected = true;
    // 保存と配信は待たずに進める（応答はすぐ返す必要がある）。
    void this.persistThenBroadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    await this.load();
    if (!this.state || typeof raw !== 'string') return;
    const attachment = ws.deserializeAttachment() as Attachment | null;
    const playerId = attachment?.playerId ?? '';
    const now = Date.now();

    // 入力を処理する前に、締め切りを過ぎた処理をまとめて進める。
    tick(this.state, now);

    let message: { t?: string; q?: number; choice?: number };
    try {
      message = JSON.parse(raw) as typeof message;
    } catch {
      return;
    }

    let error: string | undefined;
    switch (message.t) {
      case 'start': {
        const player = this.state.players.find((p) => p.id === playerId);
        if (!player?.host) {
          error = '開始できるのは部屋を作った人だけです';
          break;
        }
        const result = startGame(this.state, now, playerId);
        if (!result.ok) error = result.error;
        break;
      }
      case 'buzz': {
        const result = buzz(this.state, playerId, Number(message.q), now);
        if (!result.ok) error = result.error;
        break;
      }
      case 'answer': {
        const result = answer(
          this.state,
          playerId,
          Number(message.q),
          Number(message.choice),
          now,
        );
        if (!result.ok) error = result.error;
        break;
      }
      default:
        error = '不明なメッセージです';
    }

    await this.persistThenBroadcast();
    if (error) {
      try {
        ws.send(JSON.stringify({ t: 'error', message: error }));
      } catch {
        // 送れなければ無視
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.load();
    if (!this.state) return;
    const attachment = ws.deserializeAttachment() as Attachment | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;
    // 置き換え用の新しい接続が同じ player に無いときだけ「切断」にする。
    const others = this.ctx.getWebSockets(playerId).filter((w) => w !== ws);
    if (others.length === 0) {
      const player = this.state.players.find((p) => p.id === playerId);
      if (player) player.connected = false;
      await this.persistThenBroadcast();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    await this.load();
    if (!this.state) return;
    tick(this.state, Date.now());
    await this.persistThenBroadcast();
  }

  private async persist(): Promise<void> {
    if (this.state) await this.ctx.storage.put(STORAGE_KEY, this.state);
    await this.scheduleAlarm();
  }

  private async persistThenBroadcast(): Promise<void> {
    await this.persist();
    this.broadcast();
  }

  private async scheduleAlarm(): Promise<void> {
    const deadline = this.state ? nextDeadline(this.state) : null;
    if (deadline === null) {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(deadline);
    }
  }

  private broadcast(): void {
    if (!this.state) return;
    const serverNow = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      const playerId = attachment?.playerId;
      if (!playerId) continue;
      try {
        ws.send(JSON.stringify(snapshot(this.state, playerId, serverNow)));
      } catch {
        // 送れない接続は無視
      }
    }
  }
}
