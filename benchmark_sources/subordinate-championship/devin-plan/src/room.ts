import { DurableObject } from "cloudflare:workers";
import * as game from "./game";

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

interface Attachment {
  playerId: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// 1部屋 = 1つの Durable Object。状態は SQLite ストレージに保存し、
// WebSocket は Hibernation API で受け、締め切りは Alarm で処理する。
export class Room extends DurableObject<Env> {
  room: game.RoomState | null = null;
  tokens = new Map<string, string>(); // playerId -> token

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get<game.RoomState>("room")) ?? null;
      const tokens = await ctx.storage.get<Record<string, string>>("tokens");
      this.tokens = new Map(Object.entries(tokens ?? {}));
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/init" && request.method === "POST") {
      return this.handleInit(request);
    }
    if (url.pathname === "/join" && request.method === "POST") {
      return this.handleJoin(request);
    }
    if (url.pathname === "/ws" && request.method === "GET") {
      return this.handleWs(url);
    }
    return json({ error: "not found" }, 404);
  }

  private async handleInit(request: Request): Promise<Response> {
    if (this.room) return json({ error: "exists" }, 409);
    const body = (await request.json()) as { code: string; name: string };
    this.room = game.createRoom(body.code);
    const playerId = crypto.randomUUID();
    game.addPlayer(this.room, playerId, body.name);
    const token = crypto.randomUUID();
    this.tokens.set(playerId, token);
    await this.persist();
    return json({ code: body.code, playerId, token });
  }

  private async handleJoin(request: Request): Promise<Response> {
    if (!this.room) return json({ error: "部屋が見つかりません" }, 404);
    const body = (await request.json()) as { name: string };
    const playerId = crypto.randomUUID();
    const result = game.addPlayer(this.room, playerId, body.name);
    if (!result.ok) return json({ error: result.error }, 409);
    const token = crypto.randomUUID();
    this.tokens.set(playerId, token);
    await this.persist();
    this.broadcast();
    return json({ code: this.room.code, playerId, token });
  }

  private async handleWs(url: URL): Promise<Response> {
    if (!this.room) return json({ error: "部屋が見つかりません" }, 404);
    const token = url.searchParams.get("token");
    const playerId = [...this.tokens.entries()].find(([, t]) => t === token)?.[0];
    if (!playerId) return json({ error: "token が正しくありません" }, 403);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId } satisfies Attachment);

    // 同じプレイヤーの古い接続は閉じる
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === server) continue;
      const att = ws.deserializeAttachment() as Attachment | null;
      if (att?.playerId === playerId) ws.close(4000, "別の接続に切り替わりました");
    }

    const player = this.room.players.find((p) => p.id === playerId);
    if (player) player.connected = true;
    await this.persist();
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (!this.room || typeof message !== "string") return;
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att) return;
    const now = Date.now();
    game.tick(this.room, now);
    try {
      const msg = JSON.parse(message) as { t?: string; q?: number; choice?: number };
      if (msg.t === "start") {
        const result = game.startGame(this.room, att.playerId, now, Math.random);
        if (!result.ok) ws.send(JSON.stringify({ t: "error", message: result.error }));
      } else if (msg.t === "buzz" && typeof msg.q === "number") {
        game.buzz(this.room, att.playerId, msg.q, now);
      } else if (msg.t === "answer" && typeof msg.q === "number" && typeof msg.choice === "number") {
        game.answer(this.room, att.playerId, msg.q, msg.choice, now);
      }
    } catch {
      // JSON でない入力は無視
    }
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.markDisconnected(ws);
    await this.persist();
    this.broadcast();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.markDisconnected(ws);
    await this.persist();
    this.broadcast();
  }

  // 同じプレイヤーの生きた接続が残っていなければ connected を落とす。
  // （重複接続で古いソケットを閉じた直後に誤って切断扱いしないため）
  private markDisconnected(ws: WebSocket): void {
    if (!this.room) return;
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att) return;
    const alive = this.ctx
      .getWebSockets()
      .some(
        (other) =>
          other !== ws &&
          (other.deserializeAttachment() as Attachment | null)?.playerId === att.playerId,
      );
    if (alive) return;
    const player = this.room.players.find((p) => p.id === att.playerId);
    if (player) player.connected = false;
  }

  async alarm(): Promise<void> {
    if (!this.room) return;
    game.tick(this.room, Date.now());
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  private async persist(): Promise<void> {
    if (!this.room) return;
    await this.ctx.storage.put("room", this.room);
    await this.ctx.storage.put("tokens", Object.fromEntries(this.tokens));
  }

  private broadcast(): void {
    if (!this.room) return;
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (!att) continue;
      ws.send(JSON.stringify(game.serialize(this.room, att.playerId, now)));
    }
  }

  private async scheduleAlarm(): Promise<void> {
    if (!this.room) return;
    const deadline = game.nextDeadline(this.room);
    if (deadline === null) {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(deadline);
    }
  }
}
