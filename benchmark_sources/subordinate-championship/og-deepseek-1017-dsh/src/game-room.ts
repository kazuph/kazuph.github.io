/**
 * 1部屋 = 1 Durable Object。
 *
 * ここがこのアプリの権威サーバーであり、同時にリアルタイム配信サーバーでもある。
 *  - 早押しの受け付けは DO が単一スレッドで直列化するので「最初の1人」が一意に決まる。
 *  - 点数計算・正誤判定・フェーズ遷移はすべてここ（と src/game.ts）で行う。
 *  - WebSocket Hibernation API を使い、全員の接続を1つの DO に集約する。
 *  - 締め切りは setTimeout ではなく Storage Alarm で管理するので、
 *    DO がアイドルで退避（hibernate / evict）されても時間切れ処理が失われない。
 */
import {
  createRoom,
  buzzWithTiming,
  emptyRoom,
  handleTimeout,
  joinRoom,
  leaveRoom,
  markConnected,
  maybeRevealWhenExhausted,
  nextDeadline,
  publicState,
  rematch,
  startGame,
  submitAnswer,
  timingFromEnv,
  type JoinResult,
} from "./game";
import {
  encodeServerMessage,
  parseClientMessage,
  type ErrorCode,
  type RoomState,
  type ServerMessage,
} from "./protocol";
import type { Env } from "./env";

interface SocketAttachment {
  playerId: string | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function send(ws: WebSocket, msg: ServerMessage): void {
  try {
    ws.send(encodeServerMessage(msg));
  } catch {
    // 送信に失敗したソケットは close ハンドラ側で後始末される
  }
}

function sendError(ws: WebSocket, code: ErrorCode, message: string): void {
  send(ws, { t: "error", code, message });
}

export class GameRoom implements DurableObject {
  private room: RoomState = emptyRoom("");

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<RoomState>("room");
      if (stored && stored.created) {
        this.room = stored;
      }
    });
  }

  private timing() {
    return timingFromEnv(this.env as unknown as Record<string, unknown>);
  }

  private state() {
    return publicState(this.room, Date.now(), this.timing());
  }

  /** テスト補助: DO 内の生の状態を取り出す（runInDurableObject から呼ぶ）。 */
  snapshot(): RoomState {
    return this.room;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init" && request.method === "POST") {
      return this.handleInit(request);
    }

    if (url.pathname === "/state") {
      return json(this.state());
    }

    if (url.pathname.startsWith("/ws")) {
      const upgrade = request.headers.get("Upgrade")?.toLowerCase();
      if (upgrade !== "websocket") {
        return json({ error: "expected websocket upgrade" }, 426);
      }
      return this.handleWebSocket();
    }

    return json({ error: "not found" }, 404);
  }

  private async handleInit(request: Request): Promise<Response> {
    let code = "";
    try {
      const body = (await request.json()) as { code?: unknown };
      if (typeof body.code === "string") code = body.code.toUpperCase().slice(0, 8);
    } catch {
      // fallthrough
    }
    if (this.room.created) {
      return json({ ok: true, code: this.room.code, existed: true });
    }
    this.room = createRoom(code || this.room.code);
    await this.save();
    return json({ ok: true, code: this.room.code, existed: false }, 201);
  }

  private handleWebSocket(): Response {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null } satisfies SocketAttachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    const msg = parseClientMessage(text);
    const attachment = (ws.deserializeAttachment() ?? { playerId: null }) as SocketAttachment;

    if (!msg) {
      sendError(ws, "INVALID_MESSAGE", "メッセージを解釈できませんでした。");
      return;
    }

    if (msg.t === "ping") {
      send(ws, { t: "pong" });
      return;
    }

    // アラームが遅延していても、次のメッセージ処理の前に期限切れを回収する。
    const reconciled = handleTimeout(this.room, Date.now(), this.timing());
    if (reconciled) {
      await this.save();
      this.scheduleAlarm();
      this.broadcast();
    }

    if (msg.t === "join") {
      await this.handleJoin(ws, msg.name, msg.token ?? null);
      return;
    }

    const playerId = attachment.playerId;
    if (!playerId) {
      sendError(ws, "UNKNOWN", "先に join してください。");
      return;
    }

    switch (msg.t) {
      case "start":
        await this.handleStart(ws, playerId);
        break;
      case "buzz":
        await this.handleBuzz(ws, playerId);
        break;
      case "answer":
        await this.handleAnswer(ws, playerId, msg.choice);
        break;
      case "again":
        await this.handleAgain(ws, playerId);
        break;
      case "leave":
        await this.handleLeave(ws, playerId);
        break;
      default:
        sendError(ws, "INVALID_MESSAGE", "未知のメッセージです。");
    }
  }

  private async handleJoin(ws: WebSocket, name: unknown, token: string | null): Promise<void> {
    const result: JoinResult = joinRoom(this.room, { name, token, now: Date.now() });
    if (!result.ok || !result.player) {
      sendError(ws, result.code ?? "UNKNOWN", result.message ?? "参加できませんでした。");
      ws.close(4001, result.code ?? "UNKNOWN");
      return;
    }
    const player = result.player;

    // 同じプレイヤーの古いソケット（別タブ・再読み込み前の残骸）を無効化してから閉じる。
    // 先に attachment を外さないと、close ハンドラが「切断」と誤判定してしまう。
    for (const other of this.ctx.getWebSockets()) {
      if (other === ws) continue;
      const otherAttachment = (other.deserializeAttachment() ?? {}) as SocketAttachment;
      if (otherAttachment.playerId === player.id) {
        other.serializeAttachment({ playerId: null } satisfies SocketAttachment);
        try {
          other.close(4000, "replaced");
        } catch {
          // ignore
        }
      }
    }

    ws.serializeAttachment({ playerId: player.id } satisfies SocketAttachment);
    await this.save();

    send(ws, {
      t: "joined",
      playerId: player.id,
      token: player.token,
      name: player.name,
      state: this.state(),
    });
    this.broadcast();
  }

  private async handleStart(ws: WebSocket, playerId: string): Promise<void> {
    const result = startGame(this.room, playerId, Date.now(), this.timing());
    if (!result.ok) {
      sendError(ws, result.code ?? "UNKNOWN", result.message ?? "開始できません。");
      return;
    }
    await this.save();
    this.scheduleAlarm();
    this.broadcast();
  }

  private async handleBuzz(ws: WebSocket, playerId: string): Promise<void> {
    const result = buzzWithTiming(this.room, playerId, Date.now(), this.timing());
    if (!result.ok) {
      send(ws, {
        t: "feedback",
        kind: "locked",
        playerId,
        text: result.message ?? "押せませんでした。",
      });
      return;
    }
    send(ws, { t: "feedback", kind: "buzz", playerId, text: "回答権を獲得！" });
    await this.save();
    this.scheduleAlarm();
    this.broadcast();
  }

  private async handleAnswer(ws: WebSocket, playerId: string, choice: number): Promise<void> {
    const result = submitAnswer(this.room, playerId, choice, Date.now(), this.timing());
    if (!result.ok) {
      sendError(ws, result.code ?? "UNKNOWN", result.message ?? "回答できません。");
      await this.save();
      this.scheduleAlarm();
      this.broadcast();
      return;
    }
    send(ws, {
      t: "feedback",
      kind: result.correct ? "correct" : "wrong",
      playerId,
      text: result.correct ? "正解！" : "不正解…",
      delta: result.delta,
    });
    await this.save();
    this.scheduleAlarm();
    this.broadcast();
  }

  private async handleAgain(ws: WebSocket, playerId: string): Promise<void> {
    const result = rematch(this.room, playerId, Date.now(), this.timing());
    if (!result.ok) {
      sendError(ws, result.code ?? "UNKNOWN", result.message ?? "もう一度開始できません。");
      return;
    }
    await this.save();
    this.scheduleAlarm();
    this.broadcast();
  }

  private async handleLeave(ws: WebSocket, playerId: string): Promise<void> {
    leaveRoom(this.room, playerId);
    ws.serializeAttachment({ playerId: null } satisfies SocketAttachment);
    await this.save();
    this.scheduleAlarm();
    this.broadcast();
    ws.close(4002, "left");
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    const attachment = (ws.deserializeAttachment() ?? { playerId: null }) as SocketAttachment;
    const playerId = attachment.playerId;
    if (!playerId) return;

    const stillOpen = this.ctx
      .getWebSockets()
      .some((other) => other !== ws && ((other.deserializeAttachment() ?? {}) as SocketAttachment).playerId === playerId);
    if (stillOpen) return;

    markConnected(this.room, playerId, false);
    maybeRevealWhenExhausted(this.room, Date.now(), this.timing());
    await this.save();
    this.scheduleAlarm();
    this.broadcast();
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    await this.webSocketClose(ws, 1011, "error", false);
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const changed = handleTimeout(this.room, now, this.timing());
    await this.save();
    this.scheduleAlarm();
    if (changed) this.broadcast();
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put("room", this.room);
  }

  private scheduleAlarm(): void {
    const deadline = nextDeadline(this.room);
    if (deadline === null) {
      void this.ctx.storage.deleteAlarm();
    } else {
      void this.ctx.storage.setAlarm(Math.max(deadline, Date.now()));
    }
  }

  private broadcast(): void {
    const payload = encodeServerMessage({ t: "state", state: this.state() });
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = (ws.deserializeAttachment() ?? {}) as SocketAttachment;
      if (!attachment.playerId) continue;
      try {
        ws.send(payload);
      } catch {
        // ignore
      }
    }
  }
}
