/**
 * 1部屋 = 1つの Durable Object。
 * - SQLite ストレージに GameState を JSON で保存する
 * - WebSocket Hibernation API で接続を受け付け、状態を全員に配信する
 * - Alarm で締め切り（出題20秒・回答10秒・正解表示3秒）を進める
 */
import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";
import {
  addPlayer,
  answer,
  buzz,
  createGame,
  joinError,
  nextDeadline,
  playerIdForToken,
  publicState,
  setConnected,
  startGame,
  tick,
} from "./game";
import type { GameState } from "./game";
import { shuffledQuestionOrder } from "./questions";

export type CreateResult =
  | { ok: true; code: string; playerId: string; token: string }
  | { ok: false };

export type JoinResult =
  | { status: 200; body: { code: string; playerId: string; token: string } }
  | { status: 404 | 409; body: { error: string } };

interface Attachment {
  playerId?: string;
}

export class Room extends DurableObject<Env> {
  private game: GameState | null = null;
  private tableReady = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.game = await this.readState();
    });
  }

  /** 新しい部屋を作る。同じコードがすでにあれば ok: false を返す。 */
  async createRoom(code: string, name: string): Promise<CreateResult> {
    if (await this.requireState()) return { ok: false };
    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const state = createGame(code, playerId, name, token);
    this.game = state;
    await this.writeState(state);
    return { ok: true, code, playerId, token };
  }

  /** 既存の部屋に参加する。満員・開始後・部屋なしはエラー。 */
  async joinRoom(name: string): Promise<JoinResult> {
    const current = await this.requireState();
    if (!current) return { status: 404, body: { error: "部屋が見つかりません" } };
    const now = Date.now();
    const state = tick(current, now);
    const reason = joinError(state);
    if (reason) {
      return { status: 409, body: { error: reason } };
    }
    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const next = addPlayer(state, playerId, name, token);
    await this.commit(next, now);
    return { status: 200, body: { code: next.code, playerId, token } };
  }

  /** WebSocket への切り替え。token が合わない接続は拒否する。 */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.endsWith("/ws")) {
      return new Response("Not found", { status: 404 });
    }
    const state = await this.requireState();
    if (!state) return new Response("Not found", { status: 404 });

    const token = url.searchParams.get("token") ?? "";
    const playerId = playerIdForToken(state, token);
    if (!playerId) return new Response("Forbidden", { status: 403 });

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    // 同じ人の古い接続があれば閉じる（再読み込み・再接続で二重にならないように）。
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as Attachment | null;
      if (attachment?.playerId === playerId) {
        try {
          socket.close(4000, "replaced by new connection");
        } catch {
          // すでに閉じている場合は無視
        }
      }
    }

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId } satisfies Attachment);

    const now = Date.now();
    const next = setConnected(tick(state, now), playerId, true);
    await this.commit(next, now);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    const attachment = ws.deserializeAttachment() as Attachment | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;

    let parsed: { t?: string; q?: number; choice?: number };
    try {
      parsed = JSON.parse(message) as typeof parsed;
    } catch {
      return;
    }

    const state = await this.requireState();
    if (!state) return;
    const now = Date.now();

    if (parsed.t === "start") {
      const result = startGame(state, playerId, shuffledQuestionOrder(), now);
      if (!result.ok) {
        this.sendTo(ws, { t: "error", message: result.error ?? "開始できません" });
        return;
      }
      await this.commit(result.state, now);
      return;
    }

    if (parsed.t === "buzz") {
      await this.commit(buzz(state, playerId, Number(parsed.q), now), now);
      return;
    }

    if (parsed.t === "answer") {
      const next = answer(state, playerId, Number(parsed.q), Number(parsed.choice), now);
      await this.commit(next, now);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleDisconnect(ws);
  }

  /** Alarm。締め切りを過ぎた処理を進めて全員に配信する。 */
  async alarm(): Promise<void> {
    const state = await this.requireState();
    if (!state) return;
    const now = Date.now();
    await this.commit(tick(state, now), now);
  }

  private async handleDisconnect(ws: WebSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;

    // 同じ人の別の接続がまだ生きていれば、切断扱いにしない。
    const stillConnected = this.ctx.getWebSockets().some((socket) => {
      if (socket === ws) return false;
      const other = socket.deserializeAttachment() as Attachment | null;
      return other?.playerId === playerId;
    });
    if (stillConnected) return;

    const state = await this.requireState();
    if (!state) return;
    const now = Date.now();
    const next = setConnected(tick(state, now), playerId, false);
    await this.commit(next, now);
  }

  private async requireState(): Promise<GameState | null> {
    if (!this.game) this.game = await this.readState();
    return this.game;
  }

  private async commit(state: GameState, now: number): Promise<void> {
    this.game = state;
    await this.writeState(state);
    await this.scheduleAlarm(state);
    this.broadcast(state, now);
  }

  private async scheduleAlarm(state: GameState): Promise<void> {
    const deadline = nextDeadline(state);
    if (deadline === null) {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(deadline);
    }
  }

  private broadcast(state: GameState, now: number): void {
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as Attachment | null;
      const playerId = attachment?.playerId;
      if (!playerId) continue;
      this.sendTo(socket, publicState(state, playerId, now));
    }
  }

  private sendTo(ws: WebSocket, data: unknown): void {
    try {
      ws.send(JSON.stringify(data));
    } catch {
      // 閉じたソケットへの送信は無視
    }
  }

  private ensureTable(): void {
    if (this.tableReady) return;
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS game (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)",
    );
    this.tableReady = true;
  }

  private async readState(): Promise<GameState | null> {
    this.ensureTable();
    const rows = this.ctx.storage.sql
      .exec<{ data: string }>("SELECT data FROM game WHERE id = 1")
      .toArray();
    const row = rows[0];
    if (!row) return null;
    return JSON.parse(row.data) as GameState;
  }

  private async writeState(state: GameState): Promise<void> {
    this.ensureTable();
    this.ctx.storage.sql.exec(
      "INSERT INTO game (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
      JSON.stringify(state),
    );
  }
}
