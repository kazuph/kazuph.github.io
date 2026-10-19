import { QuizRoom } from "./game";
import { QUESTIONS } from "./questions";

interface Session {
  ws: WebSocket;
  playerId: string | null;
}

// 1部屋=1 Durable Objectインスタンス。WebSocketで全員に同一stateを配信する。
export class RoomObject implements DurableObject {
  private room: QuizRoom | null = null;
  private sessions = new Set<Session>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private saveDeb: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private ctx: DurableObjectState,
    private env: unknown,
  ) {}

  private async load(roomCode: string): Promise<QuizRoom> {
    if (this.room) return this.room;
    const saved = await this.ctx.storage.get<string>(`room:${roomCode}`);
    if (saved) {
      try {
        this.room = QuizRoom.restore(saved, QUESTIONS);
        return this.room;
      } catch {
        // 破損時は作り直し
      }
    }
    this.room = new QuizRoom(roomCode, QUESTIONS);
    return this.room;
  }

  private save(roomCode: string): void {
    if (this.saveDeb) return;
    this.saveDeb = setTimeout(() => {
      this.saveDeb = null;
      if (this.room) {
        this.ctx.storage.put(`room:${roomCode}`, this.room.snapshot()).catch(() => {});
      }
    }, 200);
  }

  private ensureTicker(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      try {
        if (!this.room) return;
        const changed = this.room.tick(Date.now());
        if (changed) {
          this.save(this.room.roomCode);
          this.broadcast();
          this.reschedule();
        } else if (this.room.phase === "buzz" || this.room.phase === "answering") {
          // 残り時間表示を滑らかにするため1秒ごとに配信
          this.broadcast();
        }
      } catch {
        // tickerでは落とさない
      }
    }, 500);
  }

  private pending: ReturnType<typeof setTimeout> | null = null;

  private reschedule(): void {
    if (this.pending) {
      clearTimeout(this.pending);
      this.pending = null;
    }
    if (!this.room) return;
    const now = Date.now();
    let wait: number | null = null;
    if (this.room.phase === "buzz" && this.room.deadlineQ !== null) {
      wait = this.room.deadlineQ - now;
    } else if (this.room.phase === "answering" && this.room.deadlineA !== null) {
      wait = this.room.deadlineA - now;
    } else if (this.room.phase === "reveal" && this.room.revealUntil !== null) {
      wait = this.room.revealUntil - now;
    }
    if (wait !== null) {
      this.pending = setTimeout(() => {
        this.pending = null;
        if (!this.room) return;
        this.room.tick(Date.now());
        this.save(this.room.roomCode);
        this.broadcast();
        this.reschedule();
      }, Math.max(0, Math.min(wait + 20, 20_000)));
    }
  }

  private broadcast(): void {
    if (!this.room) return;
    const now = Date.now();
    const msg = JSON.stringify({ type: "state", state: this.room.publicState(now) });
    for (const s of this.sessions) {
      try {
        s.ws.send(msg);
      } catch {
        // 送信失敗は無視（closeで掃除）
      }
    }
  }

  private sendTo(ws: WebSocket, obj: unknown): void {
    try {
      ws.send(JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomCode = (url.searchParams.get("room") ?? "").toUpperCase().slice(0, 8);
    if (!roomCode) {
      return new Response("room required", { status: 400 });
    }
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("websocket required", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    await this.load(roomCode);
    this.ensureTicker();
    const session: Session = { ws: server, playerId: null };
    this.sessions.add(session);
    server.accept();

    server.addEventListener("message", async (ev) => {
      try {
        const msg = JSON.parse(String((ev as MessageEvent).data));
        await this.onMessage(session, roomCode, msg);
      } catch (e) {
        this.sendTo(server, { type: "error", message: e instanceof Error ? e.message : "invalid message" });
      }
    });

    const closeHandler = () => {
      this.sessions.delete(session);
      if (session.playerId && this.room) {
        this.room.disconnect(session.playerId);
        this.save(roomCode);
        this.broadcast();
      }
    };
    server.addEventListener("close", closeHandler);
    server.addEventListener("error", closeHandler);

    return new Response(null, { status: 101, webSocket: client });
  }

  private async onMessage(session: Session, roomCode: string, msg: Record<string, unknown>): Promise<void> {
    const room = await this.load(roomCode);
    const now = Date.now();
    const type = String(msg.type ?? "");
    if (type === "hello") {
      const name = String(msg.name ?? "");
      const playerId = msg.playerId ? String(msg.playerId) : null;
      try {
        const { player, isNew } = room.join(name, playerId, now);
        session.playerId = player.id;
        (session.ws as WebSocket & { serializeAttachment?: (v: unknown) => void });
        this.sendTo(session.ws, { type: "welcome", playerId: player.id, isNew });
        this.save(roomCode);
        this.broadcast();
        this.reschedule();
      } catch (e) {
        this.sendTo(session.ws, { type: "error", message: e instanceof Error ? e.message : "参加できません" });
      }
      return;
    }
    if (!session.playerId) {
      this.sendTo(session.ws, { type: "error", message: "先に hello を送ってください" });
      return;
    }
    if (type === "start") {
      try {
        room.start(session.playerId, now);
        this.save(roomCode);
        this.broadcast();
        this.reschedule();
      } catch (e) {
        this.sendTo(session.ws, { type: "error", message: e instanceof Error ? e.message : "開始できません" });
      }
      return;
    }
    if (type === "buzz") {
      const won = room.buzz(session.playerId, now);
      this.sendTo(session.ws, { type: "buzzResult", won });
      this.save(roomCode);
      this.broadcast();
      this.reschedule();
      return;
    }
    if (type === "answer") {
      try {
        const choice = Number(msg.choice);
        room.answer(session.playerId, choice, now);
        this.save(roomCode);
        this.broadcast();
        this.reschedule();
      } catch (e) {
        this.sendTo(session.ws, { type: "error", message: e instanceof Error ? e.message : "回答できません" });
      }
      return;
    }
    if (type === "ping") {
      room.tick(now);
      this.sendTo(session.ws, { type: "state", state: room.publicState(Date.now()) });
      return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    for (const s of this.sessions) {
      if (s.ws === ws) {
        this.sessions.delete(s);
        if (s.playerId && this.room) {
          this.room.disconnect(s.playerId);
          this.save(this.room.roomCode);
          this.broadcast();
        }
        break;
      }
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
}
