/**
 * QuizRoom: 1 部屋 = 1 Durable Object。
 *
 * - ゲーム状態を DO ストレージに永続化する（再起動・回線断に強い）
 * - WebSocket Hibernation API で接続を保持する
 * - 締切は DO の alarm で進める（クライアントの時計を信用しない）
 * - 早押し・正誤・点数はすべてここ（サーバー）で決める
 */
import type { Env } from "./env";
import {
  MAX_PLAYERS,
  addPlayer,
  buzz,
  createGameState,
  findPlayer,
  markConnected,
  nextAlarm,
  publicState,
  removePlayer,
  resetToLobby,
  startGame,
  submitAnswer,
  tick,
  type GameEvent,
  type GameState,
  type PublicState,
} from "./game";
import { QUESTIONS } from "./questions";

const STATE_KEY = "state";
const CLOSE_REPLACED = 4000;
const CLOSE_UNAUTHORIZED = 4001;

interface SocketAttachment {
  playerId: string;
}

export class QuizRoom {
  private ctx: DurableObjectState;
  private env: Env;
  private state: GameState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
    // イベント配信前に必ずストレージから復元する
    this.ctx.blockConcurrencyWhile(async () => {
      this.state = (await this.ctx.storage.get<GameState>(STATE_KEY)) ?? null;
    });
  }

  // ---------------------------------------------------------------- HTTP API
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    switch (url.pathname) {
      case "/internal/create":
        return this.handleCreate(request);
      case "/internal/join":
        return this.handleJoin(request);
      case "/internal/info":
        return this.handleInfo();
      case "/internal/ws":
        return this.handleWebSocket(request, url);
      default:
        return json({ error: "not found" }, 404);
    }
  }

  private async handleCreate(request: Request): Promise<Response> {
    if (this.state) return json({ error: "部屋コードが重複しています" }, 409);
    const body = await readJson(request);
    const name = sanitizeName(body?.name);
    if (!name) return json({ error: "名前を入力してください" }, 400);

    const code = new URL(request.url).searchParams.get("code") ?? "0000";
    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = Date.now();
    this.state = createGameState(code.toUpperCase(), playerId, now);
    const res = addPlayer(this.state, { id: playerId, name, token }, now);
    if (!res.ok) return json({ error: res.error }, 400);
    await this.persist();
    return json({ roomCode: this.state.code, playerId, token }, 201);
  }

  private async handleJoin(request: Request): Promise<Response> {
    if (!this.state) return json({ error: "その部屋は存在しません" }, 404);
    const body = await readJson(request);
    const name = sanitizeName(body?.name);
    if (!name) return json({ error: "名前を入力してください" }, 400);

    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = Date.now();
    const res = addPlayer(this.state, { id: playerId, name, token }, now);
    if (!res.ok) return json({ error: res.error }, res.error?.includes("満員") ? 409 : 400);
    await this.persist();
    this.broadcastEvents(res.events);
    this.broadcast();
    return json({ roomCode: this.state.code, playerId, token }, 200);
  }

  private async handleInfo(): Promise<Response> {
    if (!this.state) return json({ exists: false }, 404);
    return json({
      exists: true,
      code: this.state.code,
      phase: this.state.phase,
      playerCount: this.state.players.length,
      capacity: MAX_PLAYERS,
      canJoin: this.state.phase === "lobby" && this.state.players.length < MAX_PLAYERS,
    });
  }

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    if ((request.headers.get("Upgrade") ?? "").toLowerCase() !== "websocket") {
      return json({ error: "WebSocket が必要です" }, 426);
    }
    if (!this.state) return json({ error: "その部屋は存在しません" }, 404);

    const playerId = url.searchParams.get("playerId") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const expected = this.state.tokens[playerId];
    if (!expected || expected !== token) {
      return json({ error: "参加情報が無効です" }, 403);
    }

    // 同じプレイヤーの古い接続があれば閉じる（多重接続を防ぐ）
    for (const ws of this.ctx.getWebSockets()) {
      const att = safeAttachment(ws);
      if (att?.playerId === playerId) {
        try {
          ws.close(CLOSE_REPLACED, "replaced by a new connection");
        } catch {
          /* ignore */
        }
      }
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId } satisfies SocketAttachment);

    markConnected(this.state, playerId, true);
    await this.persist();

    // 初期スナップショットを送る
    this.sendTo(server, { type: "state", serverNow: Date.now(), state: publicState(this.state) });
    this.broadcast();

    return new Response(null, { status: 101, webSocket: client });
  }

  // ------------------------------------------------------------- WebSocket
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const att = safeAttachment(ws);
    if (!att || !this.state) {
      ws.close(CLOSE_UNAUTHORIZED, "unauthorized");
      return;
    }
    if (typeof message !== "string") return;

    let msg: any;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    const playerId = att.playerId;
    const now = Date.now();
    let events: GameEvent[] = [];
    let error: string | undefined;

    switch (msg?.type) {
      case "start": {
        const res = startGame(this.state, playerId, now);
        res.ok ? (events = res.events) : (error = res.error);
        break;
      }
      case "buzz": {
        const res = buzz(this.state, playerId, now);
        events = res.events;
        if (!res.ok && !events.length) error = res.error;
        break;
      }
      case "answer": {
        const res = submitAnswer(this.state, playerId, Number(msg.choice), now);
        res.ok ? (events = res.events) : (error = res.error);
        break;
      }
      case "leave": {
        const res = removePlayer(this.state, playerId);
        res.ok ? (events = res.events) : (error = res.error);
        break;
      }
      case "reset": {
        const res = resetToLobby(this.state, playerId);
        res.ok ? (events = res.events) : (error = res.error);
        break;
      }
      case "ping": {
        this.sendTo(ws, { type: "pong", serverNow: now, clientTime: msg.clientTime ?? null });
        return;
      }
      default:
        return;
    }

    if (error) this.sendTo(ws, { type: "error", message: error });
    if (events.length) {
      await this.persist();
      await this.scheduleAlarm();
      this.broadcastEvents(events);
      this.broadcast();
    } else {
      await this.persist();
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = safeAttachment(ws);
    if (!att || !this.state) return;
    const stillOpen = this.ctx
      .getWebSockets()
      .some((other) => other !== ws && safeAttachment(other)?.playerId === att.playerId);
    if (!stillOpen) {
      markConnected(this.state, att.playerId, false);
      await this.persist();
      this.broadcast();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  // ---------------------------------------------------------------- alarm
  async alarm(): Promise<void> {
    if (!this.state) return;
    const res = tick(this.state, Date.now());
    await this.persist();
    await this.scheduleAlarm();
    if (res.events.length) this.broadcastEvents(res.events);
    this.broadcast();
  }

  // -------------------------------------------------------------- helpers
  private async persist(): Promise<void> {
    if (this.state) await this.ctx.storage.put(STATE_KEY, this.state);
  }

  private async scheduleAlarm(): Promise<void> {
    if (!this.state) return;
    const target = nextAlarm(this.state);
    if (target == null) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    const existing = await this.ctx.storage.getAlarm();
    if (existing == null || existing > target) await this.ctx.storage.setAlarm(target);
  }

  private broadcast(): void {
    if (!this.state) return;
    const payload = JSON.stringify({ type: "state", serverNow: Date.now(), state: publicState(this.state) });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* ignore broken sockets */
      }
    }
  }

  private broadcastEvents(events: GameEvent[]): void {
    if (!events.length) return;
    const payload = JSON.stringify({ type: "events", events });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* ignore */
      }
    }
  }

  private sendTo(ws: WebSocket, data: unknown): void {
    try {
      ws.send(JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }
}

function safeAttachment(ws: WebSocket): SocketAttachment | null {
  try {
    return (ws.deserializeAttachment() as SocketAttachment | null) ?? null;
  } catch {
    return null;
  }
}

function sanitizeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim().slice(0, 12);
  return name.length > 0 ? name : null;
}

async function readJson(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** テストから参照できるよう公開（型のみ） */
export type { PublicState };
export { QUESTIONS };
