import { DurableObject } from "cloudflare:workers";
import {
  RoomEngine,
  createInitialSnapshot,
  engineErrorMessage,
  type EngineError,
  type RoomSnapshot,
} from "./engine.js";

interface Env {
  ROOM: DurableObjectNamespace;
}

interface Attachment {
  playerId: string;
}

const STATE_KEY = "room-state-v1";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function err(error: EngineError, status = 400): Response {
  return json({ ok: false, error, message: engineErrorMessage(error) }, status);
}

/** 1部屋＝1 Durable Object。WebSocket＋alarmで早押し・タイマーを裁定する。 */
export class RoomObject extends DurableObject<Env> {
  private engine: RoomEngine | null = null;
  private loaded = false;

  private async load(): Promise<RoomEngine> {
    if (this.engine && this.loaded) return this.engine;
    await this.ctx.blockConcurrencyWhile(async () => {
      const stored = (await this.ctx.storage.get(STATE_KEY)) as RoomSnapshot | undefined;
      if (stored) {
        this.engine = new RoomEngine(stored);
      } else {
        this.engine = null;
      }
      this.loaded = true;
    });
    return this.engine!;
  }

  private async save(): Promise<void> {
    if (!this.engine) return;
    await this.ctx.storage.put(STATE_KEY, this.engine.state);
    const next = this.engine.nextDeadline();
    try {
      if (next !== null) {
        await this.ctx.storage.setAlarm(next);
      } else {
        await this.ctx.storage.deleteAlarm();
      }
    } catch {
      // ローカル実行での alarm 未対応時は無視（tickはアクション時にも行う）
    }
  }

  private broadcast(): void {
    if (!this.engine) return;
    const now = Date.now();
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      let you: { playerId: string } | null = null;
      try {
        you = ws.deserializeAttachment() as Attachment | null;
      } catch {
        you = null;
      }
      const payload = JSON.stringify({
        type: "state",
        state: this.engine.toPublic(now),
        you,
      });
      try {
        ws.send(payload);
      } catch {
        // 送信失敗は無視（close時に整理される）
      }
    }
  }

  private sendError(ws: any, error: EngineError): void {
    try {
      ws.send(JSON.stringify({ type: "error", error, message: engineErrorMessage(error) }));
    } catch {
      // ignore
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.endsWith("/create") && request.method === "POST") {
      const code = url.searchParams.get("code") ?? "";
      if (!/^[A-Z0-9]{4,6}$/.test(code)) return json({ ok: false, message: "部屋コードが不正です" }, 400);
      let body: { name?: string } = {};
      try {
        body = (await request.json()) as { name?: string };
      } catch {
        return json({ ok: false, message: "名前を入力してください" }, 400);
      }
      const engine = new RoomEngine(createInitialSnapshot(code));
      const res = engine.join(String(body.name ?? ""));
      if ("error" in res) return err(res.error, res.error === "ROOM_FULL" ? 403 : 400);
      this.engine = engine;
      this.loaded = true;
      await this.save();
      this.broadcast();
      return json({
        ok: true,
        roomCode: code,
        playerId: res.player.id,
        token: res.player.token,
      });
    }

    if (path.endsWith("/join") && request.method === "POST") {
      const engine = await this.load();
      if (!engine) return json({ ok: false, message: "部屋が存在しません" }, 404);
      let body: { name?: string; token?: string } = {};
      try {
        body = (await request.json()) as { name?: string; token?: string };
      } catch {
        return json({ ok: false, message: "リクエストが不正です" }, 400);
      }
      engine.tick(Date.now());
      const res = engine.join(String(body.name ?? ""), body.token || undefined);
      if ("error" in res) {
        const status = res.error === "ROOM_FULL" ? 403 : res.error === "GAME_STARTED" ? 403 : 400;
        return err(res.error, status);
      }
      await this.save();
      this.broadcast();
      return json({
        ok: true,
        roomCode: engine.state.code,
        playerId: res.player.id,
        token: res.player.token,
        isRejoin: res.isRejoin,
      });
    }

    if (path.endsWith("/ws")) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("websocket required", { status: 426 });
      }
      const engine = await this.load();
      if (!engine) return new Response("room not found", { status: 404 });
      const token = url.searchParams.get("token") ?? "";
      const player = engine.findByToken(token);
      if (!player) return new Response("unknown player", { status: 401 });
      engine.tick(Date.now());
      player.connected = true;
      await this.save();

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [any, any];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ playerId: player.id } satisfies Attachment);
      this.broadcast();
      return new Response(null, { status: 101, webSocket: client } as unknown as ResponseInit);
    }

    if (path.endsWith("/state")) {
      const engine = await this.load();
      if (!engine) return json({ ok: false }, 404);
      engine.tick(Date.now());
      return json({ ok: true, state: engine.toPublic(Date.now()) });
    }

    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: any, message: string | ArrayBuffer): Promise<void> {
    const engine = await this.load();
    if (!engine) return;
    let data: { type?: string; choice?: number } = {};
    try {
      data = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      return;
    }
    let attachment: Attachment | null = null;
    try {
      attachment = ws.deserializeAttachment() as Attachment | null;
    } catch {
      attachment = null;
    }
    if (!attachment?.playerId) return;
    const now = Date.now();
    engine.tick(now);

    switch (data.type) {
      case "start": {
        const r = engine.start(attachment.playerId, now);
        if (r.error) this.sendError(ws, r.error);
        break;
      }
      case "buzz": {
        const r = engine.buzz(attachment.playerId, now);
        if (r.error) this.sendError(ws, r.error);
        break;
      }
      case "answer": {
        const r = engine.answer(attachment.playerId, Number(data.choice), now);
        if (r.error) this.sendError(ws, r.error);
        break;
      }
      case "reset": {
        const r = engine.resetToLobby(attachment.playerId);
        if (r.error) this.sendError(ws, r.error);
        break;
      }
      case "ping":
        break;
      default:
        break;
    }
    await this.save();
    this.broadcast();
  }

  async webSocketClose(
    ws: any,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    const engine = await this.load().catch(() => null);
    if (!engine) return;
    let attachment: Attachment | null = null;
    try {
      attachment = ws.deserializeAttachment() as Attachment | null;
    } catch {
      attachment = null;
    }
    if (attachment?.playerId) {
      // 一時的な切断でもスコアは保持する。connectedフラグだけ落とす。
      // 少し待ってから切断扱いにするため、すぐには落とさず再接続の余地を残す:
      // シンプルに即時connected=falseとし、再接続(join/ws)でtrueに戻す。
      engine.setConnected(attachment.playerId, false);
      // 同一プレイヤーの別ソケットが残っている場合はconnectedのままにする
      const others = (this.ctx.getWebSockets() as unknown[]).filter((s) => s !== ws);
      for (const s of others as any[]) {
        try {
          const a = s.deserializeAttachment() as Attachment | null;
          if (a?.playerId === attachment.playerId) {
            engine.setConnected(attachment.playerId, true);
            break;
          }
        } catch {
          // ignore
        }
      }
      await this.save();
      this.broadcast();
    }
  }

  async webSocketError(ws: any, error: unknown): Promise<void> {
    try {
      ws.close(1011, "error");
    } catch {
      // ignore
    }
    console.error("websocket error", error);
  }

  async alarm(): Promise<void> {
    const engine = await this.load().catch(() => null);
    if (!engine) return;
    const now = Date.now();
    engine.tick(now);
    // reveal→次問の連鎖のため、まだ期限があれば再スケジュール
    await this.save();
    this.broadcast();
  }
}
