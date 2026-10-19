import { QuizGame } from "./engine.js";
import type { ClientMessage, ServerMessage } from "./protocol.js";

interface Attachment {
  playerId: string | null;
}

/**
 * 1つの「部屋」に対応する Durable Object。
 * WebSocket を保持し、ゲーム状態の唯一の権威として動作する。
 */
export class QuizRoom implements DurableObject {
  private ctx: DurableObjectState;
  private game: QuizGame | null = null;

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
    // 保存済み状態があれば復元する（DO が再起動してもゲームが続く）。
    void _env;
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<unknown>("state");
      this.game = QuizGame.fromJSON(stored, "ROOM");
    });
  }

  private async persist(): Promise<void> {
    if (!this.game) return;
    await this.ctx.storage.put("state", this.game.toJSON());
    const d = this.game.nextDeadline();
    if (d === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(d);
  }

  private broadcast(): void {
    if (!this.game) return;
    const msg: ServerMessage = { t: "state", serverNow: Date.now(), state: this.game.view() };
    const payload = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        // 切断済みソケットは無視する。
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }

  private codeFromRequest(request: Request): string {
    const parts = new URL(request.url).pathname.split("/").filter(Boolean);
    return decodeURIComponent(parts[2] ?? "ROOM").toUpperCase();
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    if (!this.game) {
      const stored = await this.ctx.storage.get<unknown>("state");
      this.game = QuizGame.fromJSON(stored, "ROOM");
    }
    if (this.game.state.code === "ROOM") {
      this.game.state.code = this.codeFromRequest(request);
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    (server as unknown as { serializeAttachment: (a: Attachment) => void }).serializeAttachment({ playerId: null });
    return new Response(null, { status: 101, webSocket: client });
  }

  private attachment(ws: WebSocket): Attachment {
    const raw = (ws as unknown as { deserializeAttachment: () => Attachment | null }).deserializeAttachment();
    return raw ?? { playerId: null };
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }
    if (!this.game) {
      const stored = await this.ctx.storage.get<unknown>("state");
      this.game = QuizGame.fromJSON(stored, "ROOM");
    }
    const game = this.game;
    const now = Date.now();
    const att = this.attachment(ws);

    switch (msg.t) {
      case "join": {
        if (att.playerId) {
          game.setConnected(att.playerId, true, now);
          this.broadcast();
          return;
        }
        const id = typeof msg.playerId === "string" && msg.playerId ? msg.playerId : crypto.randomUUID();
        const name = typeof msg.name === "string" ? msg.name.trim().slice(0, 16) : "";
        const res = game.join(id, name, now);
        if (!res.ok) {
          this.send(ws, { t: "error", message: res.reason ?? "入室できませんでした。" });
          try {
            ws.close(4001, "rejected");
          } catch {
            // ignore
          }
          return;
        }
        (ws as unknown as { serializeAttachment: (a: Attachment) => void }).serializeAttachment({ playerId: id });
        this.send(ws, { t: "welcome", playerId: id, room: game.state.code });
        await this.persist();
        this.broadcast();
        return;
      }
      case "start": {
        const id = att.playerId;
        if (!id) return;
        const res = game.start(id, now);
        if (!res.ok) {
          this.send(ws, { t: "error", message: res.reason ?? "開始できません。" });
          return;
        }
        await this.persist();
        this.broadcast();
        return;
      }
      case "buzz": {
        const id = att.playerId;
        if (!id) return;
        const res = game.buzz(id, now);
        if (!res.ok) {
          this.send(ws, { t: "error", message: res.reason ?? "押せません。" });
          return;
        }
        await this.persist();
        this.broadcast();
        return;
      }
      case "answer": {
        const id = att.playerId;
        if (!id) return;
        const res = game.answer(id, msg.choice, now);
        if (!res.ok) {
          this.send(ws, { t: "error", message: res.reason ?? "回答できません。" });
          return;
        }
        await this.persist();
        this.broadcast();
        return;
      }
      case "again": {
        const id = att.playerId;
        if (!id || id !== game.state.hostId) return;
        game.resetToLobby(now);
        await this.persist();
        this.broadcast();
        return;
      }
      case "ping": {
        this.send(ws, { t: "pong", serverNow: now });
        return;
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = this.attachment(ws);
    if (!this.game) {
      const stored = await this.ctx.storage.get<unknown>("state");
      this.game = QuizGame.fromJSON(stored, "ROOM");
    }
    const game = this.game;
    const id = att.playerId;
    if (id) {
      game.setConnected(id, false, Date.now());
      game.leaveLobby(id);
      await this.persist();
      this.broadcast();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /** 時間経過による状態遷移（早押し締切・回答締切・正解発表後の次問）。 */
  async alarm(): Promise<void> {
    if (!this.game) {
      const stored = await this.ctx.storage.get<unknown>("state");
      this.game = QuizGame.fromJSON(stored, "ROOM");
    }
    const game = this.game;
    game.advance(Date.now());
    await this.persist();
    this.broadcast();
  }
}
