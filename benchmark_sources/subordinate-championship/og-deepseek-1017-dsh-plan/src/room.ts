/**
 * 1部屋 = 1つの Durable Object。
 *
 * - 状態は SQLite 版 Durable Object のストレージに `state` キーで保存する。
 * - WebSocket は Hibernation API で受け付け、`serializeAttachment` に playerId を
 *   持たせることで、DO が一度眠っても接続と持ち主を復元できる。
 * - 早押しは DO が1メッセージずつ順番に処理するので、最初に届いた1人だけが
 *   回答権を得る。ブラウザの申告は使わない。
 * - 締め切りは Alarm を1つだけ予約して進める。
 */
import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";
import { jsonResponse } from "./http";
import {
  answer,
  buzz,
  createRoom,
  findPlayer,
  joinRoom,
  nextDeadline,
  publicState,
  startGame,
  tick,
  type RoomState,
} from "./game";

interface Attachment {
  playerId: string;
}

interface InitBody {
  code?: string;
  playerId?: string;
  token?: string;
  name?: string;
}

interface JoinBody {
  playerId?: string;
  token?: string;
  name?: string;
}

interface ClientMessage {
  t?: string;
  q?: number;
  choice?: number;
}

export class Room extends DurableObject<Env> {
  private state: RoomState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<RoomState>("state")) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.method === "POST" && path.endsWith("/init")) return this.handleInit(request);
    if (request.method === "POST" && path.endsWith("/join")) return this.handleJoin(request);
    if (request.method === "GET" && path.endsWith("/ws")) return this.handleWebSocket(request);
    return jsonResponse({ error: "not found" }, 404);
  }

  private async handleInit(request: Request): Promise<Response> {
    if (this.state) return jsonResponse({ ok: false, reason: "exists" }, 409);
    const body = (await request.json()) as InitBody;
    if (!body.code || !body.playerId || !body.token || !body.name) {
      return jsonResponse({ error: "リクエストが正しくありません" }, 400);
    }
    this.state = createRoom(body.code, {
      id: body.playerId,
      name: body.name,
      token: body.token,
      score: 0,
      connected: false,
      lockedOut: false,
    });
    await this.persist();
    return jsonResponse({ ok: true });
  }

  private async handleJoin(request: Request): Promise<Response> {
    if (!this.state) return jsonResponse({ error: "部屋が見つかりません" }, 404);
    const body = (await request.json()) as JoinBody;
    if (!body.playerId || !body.token || !body.name) {
      return jsonResponse({ error: "リクエストが正しくありません" }, 400);
    }
    const outcome = joinRoom(this.state, {
      id: body.playerId,
      name: body.name,
      token: body.token,
      score: 0,
      connected: false,
      lockedOut: false,
    });
    if (outcome.error) return jsonResponse({ error: outcome.error }, 409);
    this.state = outcome.state;
    await this.persist();
    return jsonResponse({ ok: true });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    if (!this.state) return jsonResponse({ error: "部屋が見つかりません" }, 404);
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return jsonResponse({ error: "WebSocket 接続が必要です" }, 426);
    }
    const token = new URL(request.url).searchParams.get("token");
    const player = this.state.players.find((candidate) => candidate.token === token);
    if (!player) return jsonResponse({ error: "トークンが正しくありません" }, 403);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: player.id } satisfies Attachment);

    // 同じ人の古い接続は閉じ、新しい接続だけを残す。
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === server) continue;
      const attachment = socket.deserializeAttachment() as Attachment | null;
      if (attachment?.playerId === player.id) {
        try {
          socket.close(4000, "replaced by new connection");
        } catch {
          // すでに閉じているときは何もしなくてよい。
        }
      }
    }

    player.connected = true;
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    const state = this.state;
    if (!state) return;
    const attachment = socket.deserializeAttachment() as Attachment | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;

    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message) as ClientMessage;
    } catch {
      socket.send(JSON.stringify({ t: "error", message: "メッセージを読めません" }));
      return;
    }

    const now = Date.now();
    // 入力を処理する前に、締め切りを過ぎた処理をまとめて進める。
    let current = tick(state, now);
    let error: string | undefined;

    switch (parsed.t) {
      case "start": {
        const outcome = startGame(current, playerId, now);
        current = outcome.state;
        error = outcome.error;
        break;
      }
      case "buzz": {
        const outcome = buzz(current, playerId, Number(parsed.q), now);
        current = outcome.state;
        error = outcome.error;
        break;
      }
      case "answer": {
        const outcome = answer(current, playerId, Number(parsed.q), Number(parsed.choice), now);
        current = outcome.state;
        error = outcome.error;
        break;
      }
      default:
        // 知らない種別でも、tick で進んだ状態は配信する。
        break;
    }

    this.state = current;
    if (error) socket.send(JSON.stringify({ t: "error", message: error }));
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    await this.markDisconnected(socket);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.markDisconnected(socket);
  }

  async alarm(): Promise<void> {
    const state = this.state;
    if (!state) return;
    this.state = tick(state, Date.now());
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  private async markDisconnected(socket: WebSocket): Promise<void> {
    const state = this.state;
    if (!state) return;
    const attachment = socket.deserializeAttachment() as Attachment | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;
    const stillConnected = this.ctx.getWebSockets().some((other) => {
      if (other === socket) return false;
      const otherAttachment = other.deserializeAttachment() as Attachment | null;
      return otherAttachment?.playerId === playerId;
    });
    if (stillConnected) return;
    const player = findPlayer(state, playerId);
    if (!player || !player.connected) return;
    player.connected = false;
    await this.persist();
    this.broadcast();
  }

  private async persist(): Promise<void> {
    if (this.state) await this.ctx.storage.put("state", this.state);
  }

  private async scheduleAlarm(): Promise<void> {
    const deadline = this.state ? nextDeadline(this.state) : null;
    if (deadline === null) {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(deadline);
    }
  }

  /** 接続している全員に、その人向けの状態を送る。 */
  private broadcast(): void {
    const state = this.state;
    if (!state) return;
    const now = Date.now();
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as Attachment | null;
      const playerId = attachment?.playerId;
      if (!playerId) continue;
      try {
        socket.send(JSON.stringify({ t: "state", ...publicState(state, playerId, now) }));
      } catch {
        // 閉じかけのソケットは無視する。
      }
    }
  }
}
