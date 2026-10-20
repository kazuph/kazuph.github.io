/**
 * 1部屋 = 1 Durable Object。
 *
 * - 部屋の全状態（プレイヤー・点数・進行フェーズ・締切時刻）を保持する唯一の権威。
 * - WebSocket Hibernation API で4人（最大4本）の接続を保持し、状態が変わるたびに
 *   全員へ同じスナップショットを配信する。
 * - 早押しの順番は Durable Object が受け取った順（= 単一スレッドの入力順）で決まる。
 * - 20秒 / 10秒の締切は DO Alarms で処理する（プレイヤーの申告時刻は使わない）。
 */
import {
  ANSWER_WINDOW_MS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  QUESTION_WINDOW_MS,
  REVEAL_MS,
  createLobbyState,
  ranking,
  reduce,
  type Effect,
  type GameEvent,
  type GameState,
} from "./game-logic";
import { QUESTIONS, TOTAL_QUESTIONS } from "./questions";

export interface Env {
  ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
}

interface Attachment {
  playerId: string;
}

interface ClientMessage {
  t?: string;
  choice?: number;
  /** kick の対象プレイヤー。自分の識別には使わない（ソケットの attachment を使う） */
  playerId?: string;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export function buildSnapshot(state: GameState, now: number) {
  const inGame = state.phase !== "lobby" && state.phase !== "finished";
  const q = inGame ? QUESTIONS[state.questionIndex] : null;
  return {
    t: "state" as const,
    now,
    serverVersion: 1,
    code: state.code,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      lockedOut: p.lockedOut,
      solved: p.solved,
      answerer: state.answeringPlayerId === p.id,
    })),
    question: q
      ? { index: state.questionIndex, total: TOTAL_QUESTIONS, text: q.text, choices: q.choices }
      : null,
    questionStartedAt: state.questionStartedAt,
    buzzDeadline: state.buzzDeadline,
    answeringPlayerId: state.answeringPlayerId,
    answerDeadline: state.answerDeadline,
    nextEventAt: state.nextEventAt,
    revealedIndex: state.revealedIndex,
    lastAnswer: state.lastAnswer,
    ranking: state.phase === "finished" ? ranking(state) : null,
    limits: {
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      questionWindowMs: QUESTION_WINDOW_MS,
      answerWindowMs: ANSWER_WINDOW_MS,
      revealMs: REVEAL_MS,
      totalQuestions: TOTAL_QUESTIONS,
    },
  };
}

export type Snapshot = ReturnType<typeof buildSnapshot>;

export class RoomDO {
  private readonly ctx: DurableObjectState;
  private readonly env: Env;
  private state: GameState = createLobbyState("", "");
  private exists = false;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
    // すべてのイベント処理より前にストレージから復元する
    ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<GameState>("state");
      if (stored) {
        this.state = stored;
        this.exists = true;
      }
    });
  }

  // ---------------------------------------------------------------- HTTP

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.pathname.split("/").filter(Boolean).pop();

    switch (action) {
      case "create":
        return this.handleCreate(request, url);
      case "join":
        return this.handleJoin(request, url);
      case "ws":
        return this.handleWebSocket(request, url);
      case "snapshot":
        if (!this.exists) return json({ error: "room_not_found" }, 404);
        return json(buildSnapshot(this.state, Date.now()));
      default:
        return json({ error: "not_found" }, 404);
    }
  }

  private async handleCreate(request: Request, url: URL): Promise<Response> {
    const code = (request.headers.get("x-room-code") ?? url.searchParams.get("code") ?? "").toUpperCase();
    const body = (await safeJson(request)) as { name?: string } | null;
    const name = sanitizeName(body?.name);

    if (!code) return json({ error: "code_required" }, 400);
    if (!name) return json({ error: "name_required", message: "名前を入力してください" }, 400);
    // 既に別の部屋として使われているコードは衝突としてやり直す
    if (this.exists && this.state.code !== code) return json({ error: "code_conflict" }, 409);
    if (this.exists && this.state.players.length > 0) return json({ error: "code_conflict" }, 409);

    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    this.state = createLobbyState(code, playerId);
    this.exists = true;
    await this.dispatch({ type: "player_join", playerId, name, token, now: Date.now() });

    return json({ code, playerId, token, name, host: true });
  }

  private async handleJoin(request: Request, url: URL): Promise<Response> {
    if (!this.exists) {
      return json({ error: "room_not_found", message: "その部屋コードの部屋はありません" }, 404);
    }
    const body = (await safeJson(request)) as
      | { name?: string; playerId?: string; token?: string }
      | null;

    // 同じ playerId + token の再接続は定員に関係なく復帰できる（要件10）
    const existing = body?.playerId
      ? this.state.players.find((p) => p.id === body.playerId && p.token === body.token)
      : undefined;
    if (existing) {
      await this.dispatch({ type: "player_connected", playerId: existing.id, now: Date.now() });
      return json({
        code: this.state.code,
        playerId: existing.id,
        token: existing.token,
        name: existing.name,
        host: this.state.hostId === existing.id,
        resumed: true,
      });
    }

    const name = sanitizeName(body?.name);
    if (!name) return json({ error: "name_required", message: "名前を入力してください" }, 400);
    if (this.state.phase !== "lobby") {
      return json(
        { error: "game_in_progress", message: "その部屋はゲーム中です。参加できません" },
        409,
      );
    }
    if (this.state.players.length >= MAX_PLAYERS) {
      return json(
        {
          error: "room_full",
          message: `この部屋は満員です（定員${MAX_PLAYERS}人）`,
        },
        409,
      );
    }

    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    await this.dispatch({ type: "player_join", playerId, name, token, now: Date.now() });
    return json({
      code: this.state.code,
      playerId,
      token,
      name,
      host: this.state.hostId === playerId,
      resumed: false,
    });
  }

  private handleWebSocket(request: Request, url: URL): Response {
    const playerId = url.searchParams.get("playerId") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const player = this.state.players.find((p) => p.id === playerId && p.token === token);
    if (!player) return json({ error: "unauthorized", message: "接続情報が正しくありません" }, 401);

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return json({ error: "expected_websocket" }, 426);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: player.id } satisfies Attachment);

    // 接続直後に現在の状態を個別に送ってから、全員へ接続を通知する
    this.send(server, buildSnapshot(this.state, Date.now()));
    void this.dispatch({ type: "player_connected", playerId: player.id, now: Date.now() });

    return new Response(null, { status: 101, webSocket: client });
  }

  // ------------------------------------------------- WebSocket handlers

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const playerId = this.attachmentPlayerId(ws);
    if (!playerId) return;
    if (typeof message !== "string") return;

    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      this.send(ws, { t: "notice", kind: "error", message: "不正なメッセージ形式です" });
      return;
    }

    const now = Date.now();
    // プレイヤーの識別はソケットの attachment（= 接続時のトークン認証結果）のみを使う。
    // メッセージ内の playerId は信用しない。
    let event: GameEvent | null = null;
    switch (msg.t) {
      case "start":
        event = { type: "start", playerId, now };
        break;
      case "buzz":
        event = { type: "buzz", playerId, now };
        break;
      case "answer":
        event = { type: "answer", playerId, choice: Number(msg.choice), now };
        break;
      case "kick":
        event = { type: "kick", playerId, targetId: String(msg.playerId ?? ""), now };
        break;
      case "reset":
        event = { type: "reset", playerId, now };
        break;
      case "leave": {
        await this.dispatch({ type: "player_leave", playerId, now });
        try {
          ws.close(1000, "left");
        } catch {
          /* already closed */
        }
        return;
      }
      case "ping":
        this.send(ws, { t: "pong", now });
        return;
      case "sync":
        // 再読み込み直後などに、現在のスナップショットを個別に返す
        this.send(ws, buildSnapshot(this.state, Date.now()));
        return;
      default:
        this.send(ws, { t: "notice", kind: "error", message: "未知の操作です" });
        return;
    }

    await this.dispatch(event);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const playerId = this.attachmentPlayerId(ws);
    if (!playerId) return;
    await this.dispatch({ type: "player_disconnected", playerId, now: Date.now() });
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const playerId = this.attachmentPlayerId(ws);
    if (!playerId) return;
    await this.dispatch({ type: "player_disconnected", playerId, now: Date.now() });
  }

  // ---------------------------------------------------------------- Alarm

  async alarm(): Promise<void> {
    const now = Date.now();
    await this.dispatch({ type: "tick", now });
    // 早期発火などでフェーズが進まなかった場合の保険
    if (this.state.nextEventAt !== null && this.state.nextEventAt > Date.now()) {
      await this.ctx.storage.setAlarm(this.state.nextEventAt);
    }
  }

  // -------------------------------------------------------------- 内部処理

  private async dispatch(event: GameEvent): Promise<void> {
    const { state, effects, notices } = reduce(this.state, event);
    this.state = state;
    for (const effect of effects) {
      switch (effect.type) {
        case "save":
          await this.ctx.storage.put("state", state);
          break;
        case "broadcast":
          this.broadcast();
          break;
        case "alarm":
          if (effect.at === null) await this.ctx.storage.deleteAlarm();
          else await this.ctx.storage.setAlarm(effect.at);
          break;
      }
    }
    for (const notice of notices) {
      this.sendToPlayer(notice.to, { t: "notice", kind: notice.kind, message: notice.message });
    }
  }

  private broadcast(): void {
    const payload = JSON.stringify(buildSnapshot(this.state, Date.now()));
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* 切断済みのソケットは無視 */
      }
    }
  }

  private sendToPlayer(playerId: string, data: unknown): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (this.attachmentPlayerId(ws) === playerId) this.send(ws, data);
    }
  }

  private send(ws: WebSocket, data: unknown): void {
    try {
      ws.send(JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  private attachmentPlayerId(ws: WebSocket): string | null {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    return attachment?.playerId ?? null;
  }
}

function sanitizeName(input: unknown): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, 12);
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
