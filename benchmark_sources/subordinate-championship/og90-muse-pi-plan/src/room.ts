import { DurableObject } from "cloudflare:workers";
import {
  addPlayer,
  createRoom,
  joinError,
  nextDeadline,
  onAnswer,
  onBuzz,
  PING_TIMEOUT_MS,
  publicView,
  QUESTION_COUNT,
  shuffleOrder,
  startGame,
  tick,
} from "./game";
import { QUESTIONS } from "./questions";

interface Env {
  ROOM: DurableObjectNamespace;
}

// game.ts から問題数を参照できるよう QUESTIONS 長さを渡す。
// （循環参照を避けるため room 側で correctOf を定義する）
function correctOf(orderPos: number, order: number[]): number {
  return QUESTIONS[order[orderPos]].answer;
}

export class Room extends DurableObject<Env> {
  private loaded = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private data: any = null;
  // 各プレイヤーから最後に何か届いた時刻（メモリのみ。永続化しない）
  private lastSeen = new Map<string, number>();

  private ensureTable(): void {
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)",
    );
  }

  private load(code: string): void {
    if (this.loaded) return;
    this.loaded = true;
    this.ensureTable();
    const rows = [
      ...this.ctx.storage.sql.exec(
        "SELECT value FROM kv WHERE key = 'state'",
      ),
    ] as { value: string }[];
    if (rows.length > 0) {
      try {
        this.data = JSON.parse(rows[0].value as string);
      } catch {
        this.data = null;
      }
    }
    if (!this.data) this.data = null;
    void code;
  }

  private save(): void {
    this.ensureTable();
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO kv (key, value) VALUES ('state', ?)", JSON.stringify(this.data));
  }

  private advance(now: number): boolean {
    if (!this.data) return false;
    const changed = tick(this.data, now, (pos) =>
      correctOf(pos, this.data.questionOrder),
    );
    return changed || this.sweep(now);
  }

  // 一定時間何も届いていない人を切断扱いにする。変化があれば true。
  private sweep(now: number): boolean {
    if (!this.data) return false;
    let changed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of this.data.players as any[]) {
      if (!p.connected) continue;
      const seen = this.lastSeen.get(p.id);
      if (seen === undefined) {
        this.lastSeen.set(p.id, now);
        continue;
      }
      if (now - seen > PING_TIMEOUT_MS) {
        p.connected = false;
        changed = true;
      }
    }
    return changed;
  }

  private async scheduleAlarm(): Promise<void> {
    if (!this.data) return;
    const now = Date.now();
    const targets: number[] = [];
    const d = nextDeadline(this.data);
    if (d !== null) targets.push(d + 50);
    // 切断スイープ用: いちばん早く切れそうな人の時刻
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of this.data.players as any[]) {
      if (!p.connected) continue;
      const seen = this.lastSeen.get(p.id) ?? now;
      targets.push(seen + PING_TIMEOUT_MS + 500);
    }
    if (targets.length === 0) {
      try {
        await this.ctx.storage.deleteAlarm();
      } catch {
        // no alarm
      }
      return;
    }
    const next = Math.min(...targets);
    // 過ぎている場合はすぐ起こす
    await this.ctx.storage.setAlarm(Math.max(next, now + 50));
  }

  private broadcast(now?: number): void {
    if (!this.data) return;
    const t = now ?? Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const tags = this.ctx.getTags(ws);
      const pid = tags.length > 0 ? tags[0] : "";
      try {
        ws.send(JSON.stringify(publicView(this.data, pid, t)));
      } catch {
        // 送れなければ無視
      }
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    try {
      ws.send(JSON.stringify({ t: "error", message }));
    } catch {
      // ignore
    }
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const now = Date.now();

    if (request.method === "POST" && path === "/create") {
      const body = (await request.json()) as {
        code: string;
        name: string;
        playerId: string;
        token: string;
      };
      this.load(body.code);
      if (this.data) {
        return Response.json({ error: "collision" }, { status: 409 });
      }
      const code = (body.code || "").toUpperCase();
      this.data = createRoom(code, body.name, body.playerId, body.token);
      this.save();
      await this.scheduleAlarm();
      return Response.json({ code, playerId: body.playerId, token: body.token });
    }

    if (request.method === "POST" && path === "/join") {
      const body = (await request.json()) as {
        name: string;
        playerId: string;
        token: string;
      };
      this.load("");
      if (!this.data) return Response.json({ error: "部屋がありません" }, { status: 404 });
      this.advance(now);
      const err = joinError(this.data, now);
      if (err) {
        const status = err === "部屋がありません" ? 404 : 409;
        return Response.json({ error: err }, { status });
      }
      addPlayer(this.data, body.name, body.playerId, body.token);
      this.save();
      this.broadcast(now);
      await this.scheduleAlarm();
      return Response.json({
        code: this.data.code,
        playerId: body.playerId,
        token: body.token,
      });
    }

    if (path === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 400 });
      }
      const token = url.searchParams.get("token") ?? "";
      this.load("");
      if (!this.data) return new Response("no room", { status: 404 });
      const player = this.data.players.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.token === token,
      );
      if (!player) return new Response("forbidden", { status: 403 });
      // 同じ token の古い接続を閉じる
      for (const ws of this.ctx.getWebSockets(player.id)) {
        try {
          ws.close(4001, "replaced");
        } catch {
          // ignore
        }
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      this.ctx.acceptWebSocket(server, [player.id]);
      this.advance(now);
      player.connected = true;
      this.lastSeen.set(player.id, now);
      this.save();
      // 新しい接続にまず現状を送り、ほかの全員にも配信する
      try {
        server.send(JSON.stringify(publicView(this.data, player.id, now)));
      } catch {
        // ignore
      }
      this.broadcast(now);
      await this.scheduleAlarm();
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("not found", { status: 404 });
  }

  override async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (!this.data) return;
    const tags = this.ctx.getTags(ws);
    const pid = tags.length > 0 ? tags[0] : "";
    const now = Date.now();
    let msg: { t: string; q?: number; choice?: number };
    try {
      msg = JSON.parse(typeof message === "string" ? message : "{}");
    } catch {
      return;
    }
    // まず締め切り処理を進めてから入力を処理する
    this.lastSeen.set(pid, now);
    // メッセージが届いた＝その人は生きている
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sender = this.data.players.find((p: any) => p.id === pid);
    if (sender && !sender.connected) sender.connected = true;
    const tickChanged = this.advance(now);
    if (msg.t === "ping") {
      // ハートビート: 生存だけ記録し、締め切りが進んだときだけ配信する
      this.save();
      if (tickChanged) this.broadcast(now);
      await this.scheduleAlarm();
      return;
    }
    if (msg.t === "start") {
      const order = shuffleOrder(QUESTIONS.length, QUESTION_COUNT);
      const err = startGame(this.data, pid, now, order);
      if (err) {
        this.sendError(ws, err);
        this.save();
        this.broadcast(now);
        await this.scheduleAlarm();
        return;
      }
    } else if (msg.t === "buzz") {
      onBuzz(this.data, pid, msg.q ?? -1, now);
    } else if (msg.t === "answer") {
      const correct = correctOf(this.data.qIndex, this.data.questionOrder);
      const r = onAnswer(
        this.data,
        pid,
        msg.q ?? -1,
        msg.choice ?? -1,
        now,
        correct,
      );
      if (!r.ok) {
        this.sendError(ws, r.error ?? "回答できません");
      }
    } else {
      return;
    }
    this.save();
    this.broadcast(now);
    await this.scheduleAlarm();
  }

  override async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    void code;
    void reason;
    void wasClean;
    if (!this.data) return;
    const tags = this.ctx.getTags(ws);
    const pid = tags.length > 0 ? tags[0] : "";
    if (!pid) return;
    // 同じ人の接続がまだ残っていれば接続中とみなす
    const rest = this.ctx.getWebSockets(pid);
    if (rest.length > 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = this.data.players.find((p: any) => p.id === pid);
    if (player && player.connected) {
      player.connected = false;
      this.save();
      this.broadcast();
    }
  }

  override async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    void error;
    await this.webSocketClose(ws, 1011, "error", false);
  }

  override async alarm(): Promise<void> {
    if (!this.data) return;
    const now = Date.now();
    this.advance(now);
    this.save();
    this.broadcast(now);
    await this.scheduleAlarm();
  }
}
