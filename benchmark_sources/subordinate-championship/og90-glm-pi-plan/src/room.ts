// 1部屋 = 1つの Durable Object。状態の保存、WebSocket の受け付けと全員への配信、Alarm。
import { DurableObject } from "cloudflare:workers";
import {
  GameState,
  TOTAL_QUESTIONS,
  addPlayer,
  createGame,
  getPlayer,
  nextDeadline,
  startGame,
  tick,
  tokenPlayer,
  tryAnswer,
  tryBuzz,
} from "./game";
import { pickOrder } from "./questions";
import { toPublicState } from "./publish";

export interface JoinResult {
  ok: boolean;
  status: number;
  error?: string;
  code?: string;
  playerId?: string;
  token?: string;
}

interface SocketAttachment {
  playerId: string;
}

interface ClientMessage {
  t: string;
  q?: number;
  choice?: number;
}

export class Room extends DurableObject {
  private state: GameState | null = null;

  private async loadState(): Promise<GameState | null> {
    if (!this.state) {
      this.state = (await this.ctx.storage.get<GameState>("state")) ?? null;
    }
    return this.state;
  }

  private async saveState(): Promise<void> {
    if (this.state) {
      await this.ctx.storage.put("state", this.state);
    }
  }

  // ------------------------------------------------------------ RPC（worker から呼ばれる）

  /** 部屋を作る。最初の1人がホスト */
  async create(code: string, name: string, playerId: string, token: string): Promise<JoinResult> {
    const now = Date.now();
    // 同じコードの部屋が残っていた場合は作り直す（6文字コードの衝突はほぼ起きない）
    this.state = createGame(code, playerId, name, token, now);
    await this.saveState();
    return { ok: true, status: 200, code, playerId, token };
  }

  async join(name: string, playerId: string, token: string): Promise<JoinResult> {
    const state = await this.loadState();
    if (!state) {
      return { ok: false, status: 404, error: "部屋が見つかりません" };
    }
    const added = addPlayer(state, playerId, name, token);
    if (!added.ok) {
      return { ok: false, status: 409, error: added.error ?? "参加できません" };
    }
    await this.saveState();
    return { ok: true, status: 200, code: state.code, playerId, token };
  }

  // ------------------------------------------------------------ WebSocket

  /** worker から転送された WebSocket upgrade リクエストを引き受ける */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const state = await this.loadState();
    if (!state) {
      return new Response("部屋が見つかりません", { status: 404 });
    }
    const player = tokenPlayer(state, token);
    if (!player) {
      return new Response("この部屋の参加者ではありません", { status: 403 });
    }

    // 同じ token の新しい接続が来たら、古い接続を閉じる
    for (const ws of this.ctx.getWebSockets(this.socketTag(player.id))) {
      try {
        ws.close(4000, "replaced");
      } catch {
        // already closed
      }
    }

    const pair = new WebSocketPair();
    const server = pair[1]!;
    server.serializeAttachment({ playerId: player.id } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server, [this.socketTag(player.id)]);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));

    player.connected = true;
    await this.saveState();
    this.broadcast(Date.now());

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  private socketTag(playerId: string): string {
    return `p:${playerId}`;
  }

  override async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const state = await this.loadState();
    if (!state) return;
    let text: string;
    if (typeof message === "string") {
      text = message;
    } else {
      text = new TextDecoder().decode(new Uint8Array(message));
    }
    let msg: ClientMessage;
    try {
      msg = JSON.parse(text) as ClientMessage;
    } catch {
      this.sendTo(ws, { t: "error", message: "不明なメッセージです" });
      return;
    }
    if (msg.t === "ping") {
      this.sendTo(ws, { t: "pong" });
      return;
    }

    const att = ws.deserializeAttachment() as SocketAttachment | null;
    const playerId = att?.playerId;
    if (!playerId) {
      this.sendTo(ws, { t: "error", message: "接続が見つかりません" });
      return;
    }
    if (!getPlayer(state, playerId)) {
      this.sendTo(ws, { t: "error", message: "参加していません" });
      return;
    }

    let changed = false;

    if (msg.t === "start") {
      if (playerId !== state.hostId) {
        this.sendTo(ws, { t: "error", message: "ホストだけが開始できます" });
        return;
      }
      const order = pickOrder(Math.random, TOTAL_QUESTIONS);
      const started = startGame(state, playerId, order, Date.now());
      if (!started.ok) {
        this.sendTo(ws, { t: "error", message: started.error ?? "開始できません" });
        return;
      }
      changed = true;
    } else if (msg.t === "buzz") {
      tick(state, Date.now());
      const buzzed = tryBuzz(state, playerId, msg.q ?? -1, Date.now());
      if (!buzzed.ok) {
        this.sendTo(ws, { t: "error", message: buzzed.error ?? "押せません" });
        return;
      }
      changed = true;
    } else if (msg.t === "answer") {
      tick(state, Date.now());
      const answered = tryAnswer(state, playerId, msg.q ?? -1, msg.choice ?? -1, Date.now());
      if (!answered.ok) {
        this.sendTo(ws, { t: "error", message: answered.error ?? "回答できません" });
        return;
      }
      changed = true;
    }

    if (changed) {
      await this.saveState();
      this.broadcast(Date.now());
      await this.scheduleAlarm();
    }
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    const state = await this.loadState();
    const att = ws.deserializeAttachment() as SocketAttachment | null;
    if (!state || !att?.playerId) return;
    const p = getPlayer(state, att.playerId);
    if (p && p.connected) {
      p.connected = false;
      await this.saveState();
      this.broadcast(Date.now());
    }
  }

  // ------------------------------------------------------------ Alarm・配信

  private async scheduleAlarm(): Promise<void> {
    const state = await this.loadState();
    if (!state) return;
    const next = nextDeadline(state);
    if (next !== null) {
      await this.ctx.storage.setAlarm(next);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  override async alarm(): Promise<void> {
    const state = await this.loadState();
    if (!state) return;
    tick(state, Date.now());
    await this.saveState();
    this.broadcast(Date.now());
    await this.scheduleAlarm();
  }

  /** 全員の接続に現在の状態を送る。token は送らない。問題が出ている間は正解も送らない */
  private broadcast(now: number): void {
    for (const ws of this.ctx.getWebSockets()) {
      let att: SocketAttachment | null = null;
      try {
        att = (ws.deserializeAttachment() as SocketAttachment | null) ?? null;
      } catch {
        // 閉じた直後などは読めない
      }
      if (!att?.playerId) continue;
      const state = this.state;
      if (!state) return;
      this.sendTo(ws, toPublicState(state, att.playerId, now));
    }
  }

  private sendTo(ws: WebSocket, message: unknown): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // 送れない接続は無視する（close イベントで状態が更新される）
    }
  }

}
