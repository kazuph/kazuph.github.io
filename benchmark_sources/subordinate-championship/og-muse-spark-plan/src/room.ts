import { DurableObject } from "cloudflare:workers";
import {
  answer,
  buzz,
  emptyRoom,
  joinRoom,
  nextDeadline,
  publicView,
  startGame,
  tick,
  type RoomState,
} from "./game.js";

interface Env {
  ROOM: DurableObjectNamespace;
}

interface Attachment {
  playerId: string;
}

const STATE_KEY = "room-state-v1";

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await req.json()) as unknown;
    if (body && typeof body === "object") return body as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export class Room extends DurableObject<Env> {
  private state: RoomState | null = null;

  private async load(): Promise<RoomState> {
    if (this.state) return this.state;
    const saved = await this.ctx.storage.get<RoomState>(STATE_KEY);
    if (saved) {
      this.state = saved;
      return saved;
    }
    const name = await this.ctx.storage.get<string>("room-code");
    this.state = emptyRoom(name ?? "------");
    return this.state;
  }

  private async save(): Promise<void> {
    if (this.state) await this.ctx.storage.put(STATE_KEY, this.state);
  }

  private async scheduleAlarm(): Promise<void> {
    if (!this.state) return;
    const at = nextDeadline(this.state);
    try {
      if (at === null) {
        await this.ctx.storage.deleteAlarm();
      } else {
        await this.ctx.storage.setAlarm(Math.max(at, Date.now()));
      }
    } catch {
      // ローカル実行での Alarm 未対応時は無視（WS メッセージ時の tick で補う）
    }
  }

  private broadcast(): void {
    if (!this.state) return;
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      let viewer = "";
      try {
        const att = ws.deserializeAttachment() as Attachment | null;
        viewer = att?.playerId ?? "";
      } catch {
        viewer = "";
      }
      try {
        ws.send(JSON.stringify(publicView(this.state, viewer, now)));
      } catch {
        // 送れない相手は無視
      }
    }
  }

  override async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/internal/init" && req.method === "POST") {
      const body = await readJson(req);
      const code = String(body["code"] ?? "");
      const st = await this.load();
      if (st.players.length > 0) {
        return json({ error: "collision" }, 409);
      }
      st.code = code;
      await this.ctx.storage.put("room-code", code);
      await this.save();
      return json({ ok: true });
    }

    if (path === "/internal/create" && req.method === "POST") {
      const body = await readJson(req);
      const code = String(body["code"] ?? "");
      const name = String(body["name"] ?? "");
      const playerId = String(body["playerId"] ?? "");
      const token = String(body["token"] ?? "");
      if (!playerId || !token) return json({ error: "不正な要求です" }, 400);
      const st = await this.load();
      if (st.players.length > 0) return json({ error: "collision" }, 409);
      if (code) {
        st.code = code;
        await this.ctx.storage.put("room-code", code);
      }
      const r = joinRoom(st, name, playerId, token);
      if (!r.ok) return json({ error: r.error }, 400);
      await this.save();
      return json({ ok: true });
    }

    if (path === "/internal/join" && req.method === "POST") {
      const body = await readJson(req);
      const name = String(body["name"] ?? "");
      const playerId = String(body["playerId"] ?? "");
      const token = String(body["token"] ?? "");
      if (!playerId || !token) return json({ error: "不正な要求です" }, 400);
      const st = await this.load();
      tick(st, Date.now());
      // 既存メンバーの再参加（名前は変えない）
      const existing = st.players.find((p) => p.id === playerId);
      if (existing) {
        if (existing.token !== token) {
          return json({ error: "参加できません" }, 403);
        }
        existing.connected = true;
        await this.save();
        await this.scheduleAlarm();
        this.broadcast();
        return json({ ok: true, reconnect: true });
      }
      const r = joinRoom(st, name, playerId, token);
      if (!r.ok) {
        const status =
          r.error === "満員です（4人まで）" ||
          r.error === "ゲームはもう始まっています"
            ? 409
            : 400;
        // 部屋が存在しない（誰もいない）のに参加しようとした
        if (st.players.length === 0) {
          return json({ error: "部屋がありません" }, 404);
        }
        return json({ error: r.error }, status);
      }
      await this.save();
      await this.scheduleAlarm();
      this.broadcast();
      return json({ ok: true });
    }

    if (path === "/internal/state" && req.method === "GET") {
      const token = url.searchParams.get("token") ?? "";
      const st = await this.load();
      tick(st, Date.now());
      const me = st.players.find((p) => p.token === token);
      if (!me) return json({ error: "参加者ではありません" }, 403);
      return json(publicView(st, me.id, Date.now()));
    }

    if (path === "/ws" && req.method === "GET") {
      const token = url.searchParams.get("token") ?? "";
      const st = await this.load();
      tick(st, Date.now());
      const me = st.players.find((p) => p.token === token);
      if (!me) {
        return json({ error: "参加者ではありません" }, 403);
      }
      if (req.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return json({ error: "WebSocket が必要です" }, 426);
      }
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      // 同じ token の古い接続を閉じる
      for (const ws of this.ctx.getWebSockets()) {
        try {
          const att = ws.deserializeAttachment() as Attachment | null;
          if (att?.playerId === me.id) ws.close(4000, "replaced");
        } catch {
          // 無視
        }
      }
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ playerId: me.id } satisfies Attachment);
      me.connected = true;
      await this.save();
      await this.scheduleAlarm();
      this.broadcast();
      return new Response(null, { status: 101, webSocket: client });
    }

    return json({ error: "not found" }, 404);
  }

  override async webSocketMessage(
    ws: WebSocket,
    raw: string | ArrayBuffer,
  ): Promise<void> {
    const st = await this.load();
    let viewer = "";
    try {
      const att = ws.deserializeAttachment() as Attachment | null;
      viewer = att?.playerId ?? "";
    } catch {
      // 無視
    }
    const me = st.players.find((p) => p.id === viewer);
    if (!me) {
      ws.send(JSON.stringify({ t: "error", message: "参加者ではありません" }));
      return;
    }
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : "") as Record<
        string,
        unknown
      >;
    } catch {
      ws.send(JSON.stringify({ t: "error", message: "形式が正しくありません" }));
      return;
    }
    const now = Date.now();
    tick(st, now);
    const kind = String(msg["t"] ?? "");
    if (kind === "start") {
      const r = startGame(st, me.id, Date.now());
      if (!r.ok) ws.send(JSON.stringify({ t: "error", message: r.error }));
    } else if (kind === "buzz") {
      const q = Number(msg["q"]);
      const r = buzz(st, me.id, q, Date.now());
      if (!r.ok) ws.send(JSON.stringify({ t: "error", message: r.error }));
    } else if (kind === "answer") {
      const q = Number(msg["q"]);
      const choice = Number(msg["choice"]);
      const r = answer(st, me.id, q, choice, Date.now());
      if (!r.ok) ws.send(JSON.stringify({ t: "error", message: r.error }));
    } else {
      ws.send(JSON.stringify({ t: "error", message: "不明な操作です" }));
    }
    await this.save();
    await this.scheduleAlarm();
    this.broadcast();
  }

  override async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    const st = await this.load();
    let viewer = "";
    try {
      const att = ws.deserializeAttachment() as Attachment | null;
      viewer = att?.playerId ?? "";
    } catch {
      return;
    }
    // 同じ人の別接続が生きていれば切断扱いにしない
    const stillAlive = this.ctx.getWebSockets().some((other) => {
      if (other === ws) return false;
      try {
        const att = other.deserializeAttachment() as Attachment | null;
        return att?.playerId === viewer;
      } catch {
        return false;
      }
    });
    if (stillAlive) return;
    const me = st.players.find((p) => p.id === viewer);
    if (me) {
      me.connected = false;
      await this.save();
      this.broadcast();
    }
  }

  override async webSocketError(
    ws: WebSocket,
    _error: unknown,
  ): Promise<void> {
    try {
      ws.close(1011, "error");
    } catch {
      // 無視
    }
  }

  override async alarm(): Promise<void> {
    const st = await this.load();
    tick(st, Date.now());
    await this.save();
    await this.scheduleAlarm();
    this.broadcast();
  }
}
