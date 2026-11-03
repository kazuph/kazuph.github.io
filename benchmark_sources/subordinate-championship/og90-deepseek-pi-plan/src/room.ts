/**
 * 1部屋 = 1つの Durable Object。
 * 状態の保存、WebSocket の受け付け、全員への配信、Alarm（締め切りと接続の見張り）を持つ。
 * ゲームの規則は `game.ts` にある。
 */
import { DurableObject } from "cloudflare:workers";
import {
  addPlayer,
  createState,
  type GameState,
  handleAnswer,
  handleBuzz,
  newPlayerId,
  newToken,
  nextDeadline,
  startGame,
  tick,
  TOTAL_QUESTIONS,
  toPublicState,
} from "./game";
import { pickQuestions } from "./questions";

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

interface Attachment {
  playerId: string;
  lastSeen: number;
}

const STATE_KEY = "state";
/** これだけ音沙汰がなければ接続が切れたとみなす */
const HEARTBEAT_TIMEOUT_MS = 3_500;
/** 接続を見張る間隔 */
const HEARTBEAT_CHECK_MS = 1_000;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export class Room extends DurableObject<Env> {
  private game: GameState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.game = (await ctx.storage.get<GameState>(STATE_KEY)) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/init")) return this.handleInit(request);
    if (url.pathname.endsWith("/join")) return this.handleJoin(request);
    if (url.pathname.endsWith("/ws")) return this.handleWebSocket(request);
    return json({ error: "not found" }, 404);
  }

  private async handleInit(request: Request): Promise<Response> {
    // 部屋コードがぶつかったときは作り直してもらう
    if (this.game) return json({ error: "部屋コードが重複しました" }, 409);
    const body = (await request.json()) as { code?: string; name?: string };
    const code = String(body.code ?? "");
    const name = String(body.name ?? "");
    const state = createState(code);
    const id = newPlayerId();
    const token = newToken();
    const result = addPlayer(state, { id, name, token }, Date.now());
    if (!result.ok) return json({ error: result.error ?? "参加できません" }, 409);
    this.game = state;
    await this.persist();
    return json({ code, playerId: id, token, name });
  }

  private async handleJoin(request: Request): Promise<Response> {
    if (!this.game) return json({ error: "部屋が見つかりません" }, 404);
    const body = (await request.json()) as { name?: string };
    const name = String(body.name ?? "");
    const id = newPlayerId();
    const token = newToken();
    const result = addPlayer(this.game, { id, name, token }, Date.now());
    if (!result.ok) return json({ error: result.error ?? "参加できません" }, 409);
    await this.persist();
    this.broadcast();
    return json({ code: this.game.code, playerId: id, token, name });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return json({ error: "WebSocket で接続してください" }, 426);
    }
    if (!this.game) return json({ error: "部屋が見つかりません" }, 404);
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const player = this.game.players.find((p) => p.token === token);
    if (!player) return json({ error: "この部屋に参加していません" }, 403);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: player.id, lastSeen: Date.now() } satisfies Attachment);

    // 同じ人の古い接続は閉じる（再読み込みや二重接続の対策）
    for (const other of this.ctx.getWebSockets()) {
      if (other === server) continue;
      const att = other.deserializeAttachment() as Attachment | null;
      if (att?.playerId === player.id) {
        try {
          other.close(4001, "replaced");
        } catch {
          // すでに閉じている場合は無視
        }
      }
    }

    player.connected = true;
    await this.persist();
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    const playerId = att?.playerId ?? null;
    if (!playerId || !this.game) return;
    const now = Date.now();
    ws.serializeAttachment({
      playerId,
      lastSeen: now,
    } satisfies Attachment);

    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    let msg: { t?: string; q?: number; choice?: number };
    try {
      msg = JSON.parse(text) as { t?: string; q?: number; choice?: number };
    } catch {
      return;
    }

    // 入力を処理する前に、締め切りを過ぎた処理を進める
    let mutated = tick(this.game, now);

    switch (msg.t) {
      case "start": {
        const result = startGame(
          this.game,
          playerId,
          now,
          pickQuestions(TOTAL_QUESTIONS),
        );
        if (result.ok) mutated = true;
        else if (result.error) this.sendError(ws, result.error);
        break;
      }
      case "buzz": {
        if (handleBuzz(this.game, playerId, Number(msg.q), now).ok) mutated = true;
        break;
      }
      case "answer": {
        const result = handleAnswer(
          this.game,
          playerId,
          Number(msg.q),
          Number(msg.choice),
          now,
        );
        if (result.ok) mutated = true;
        else if (result.error) this.sendError(ws, result.error);
        break;
      }
      case "ping":
      default:
        break;
    }

    if (mutated) {
      await this.persist();
      this.broadcast();
    } else {
      await this.reschedule();
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.setDisconnected(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.setDisconnected(ws);
  }

  private setDisconnected(ws: WebSocket): void {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att?.playerId || !this.game) return;
    const player = this.game.players.find((p) => p.id === att.playerId);
    if (!player) return;

    // 同じ人の別の接続がまだ生きていれば、切断にはしない（再読み込み直後の一瞬の誤判定を防ぐ）
    const hasOtherSocket = this.ctx.getWebSockets().some((other) => {
      if (other === ws) return false;
      const otherAtt = other.deserializeAttachment() as Attachment | null;
      return otherAtt?.playerId === att.playerId;
    });

    const connected = hasOtherSocket;
    if (player.connected === connected) {
      void this.reschedule();
      return;
    }
    player.connected = connected;
    void this.persist().then(() => this.broadcast());
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const changed = this.housekeeping(now);
    if (changed && this.game) {
      await this.ctx.storage.put(STATE_KEY, this.game);
      this.broadcast();
    }
    await this.reschedule();
  }

  /** 締め切りの処理と、音沙汰のない接続の検出。 */
  private housekeeping(now: number): boolean {
    let changed = false;
    if (this.game) changed = tick(this.game, now) || changed;

    const live = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (!att?.playerId) continue;
      const silent = now - (att.lastSeen ?? now) > HEARTBEAT_TIMEOUT_MS;
      if (!silent) live.add(att.playerId);
    }
    if (!this.game) return changed;

    for (const player of this.game.players) {
      const connected = live.has(player.id);
      if (player.connected !== connected) {
        player.connected = connected;
        changed = true;
      }
    }
    return changed;
  }

  private async persist(): Promise<void> {
    if (this.game) await this.ctx.storage.put(STATE_KEY, this.game);
    await this.reschedule();
  }

  /**
   * いちばん近い締め切り1つだけを予約する。
   * すでにもっと早い予約があるときは動かさない（ping のたびに先送りされないように）。
   */
  private async reschedule(): Promise<void> {
    const now = Date.now();
    const deadlines: number[] = [];
    const gameDeadline = this.game ? nextDeadline(this.game) : null;
    if (gameDeadline !== null) deadlines.push(gameDeadline);
    if (this.ctx.getWebSockets().length > 0) deadlines.push(now + HEARTBEAT_CHECK_MS);
    if (deadlines.length === 0) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    const next = Math.max(Math.min(...deadlines), now + 1);
    const existing = await this.ctx.storage.getAlarm();
    if (existing !== null && existing <= next) return;
    await this.ctx.storage.setAlarm(next);
  }

  private broadcast(): void {
    if (!this.game) return;
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      try {
        ws.send(JSON.stringify(toPublicState(this.game, att?.playerId ?? null, now)));
      } catch {
        // 送れないソケットは無視（close 側で拾う）
      }
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    try {
      ws.send(JSON.stringify({ t: "error", message }));
    } catch {
      // 無視
    }
  }
}
