import { DurableObject } from "cloudflare:workers";
import { QUESTIONS } from "./questions";
import type {
  ClientMessage,
  Phase,
  PublicPlayer,
  ServerMessage,
  StateMessage,
} from "./protocol";

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const MAX_NAME_LEN = 16;

const PLUS = 10;
const MINUS = -5;

interface StoredPlayer extends PublicPlayer {
  token: string;
}

interface StoredState {
  phase: Phase;
  hostId: string | null;
  players: StoredPlayer[];
  qIndex: number;
  questionEndsAt: number | null;
  answerEndsAt: number | null;
  buzzedBy: string | null;
  revealUntil: number | null;
  lastReveal: {
    correctIndex: number;
    answeredBy: string | null;
    chosenIndex: number | null;
    timedOut: boolean;
  } | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export class Room extends DurableObject<Env> {
  state: StoredState = {
    phase: "lobby",
    hostId: null,
    players: [],
    qIndex: 0,
    questionEndsAt: null,
    answerEndsAt: null,
    buzzedBy: null,
    revealUntil: null,
    lastReveal: null,
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<StoredState>("state");
      if (stored) this.state = stored;
      await this.rescheduleAlarm();
      // If the DO woke up with a pending deadline, handle it immediately.
      await this.tick();
    });
  }

  private get questionMs(): number {
    return Number(this.env.QUESTION_MS ?? 20000);
  }
  private get answerMs(): number {
    return Number(this.env.ANSWER_MS ?? 10000);
  }
  private get revealMs(): number {
    return Number(this.env.REVEAL_MS ?? 5000);
  }

  // ---------- HTTP entry (internal API + websocket upgrade) ----------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/join" && request.method === "POST") {
      const body = (await request.json()) as { name?: string; host?: boolean };
      return this.join(body.name ?? "", !!body.host);
    }
    if (url.pathname === "/ws") {
      return this.handleWs(request);
    }
    if (url.pathname === "/session" && request.method === "GET") {
      const playerId = url.searchParams.get("playerId") ?? "";
      const token = url.searchParams.get("token") ?? "";
      const player = this.state.players.find((p) => p.id === playerId);
      if (!player || player.token !== token)
        return json({ error: "セッションが無効です" }, 403);
      return json({ ok: true });
    }
    if (url.pathname === "/peek" && request.method === "GET") {
      return json({ phase: this.state.phase, players: this.state.players.length });
    }
    return new Response("not found", { status: 404 });
  }

  private join(name: string, asHost: boolean): Response {
    name = name.trim();
    if (!name) return json({ error: "名前を入力してください" }, 400);
    if (name.length > MAX_NAME_LEN)
      return json({ error: `名前は${MAX_NAME_LEN}文字以内で入力してください` }, 400);
    if (!asHost && this.state.players.length === 0)
      return json({ error: "その部屋コードの部屋はありません" }, 404);
    if (this.state.players.length >= MAX_PLAYERS)
      return json({ error: "この部屋は満員です（4人まで）" }, 409);
    if (this.state.phase !== "lobby")
      return json({ error: "この部屋はすでにゲーム中です" }, 409);

    const player: StoredPlayer = {
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      name,
      score: 0,
      connected: false,
      locked: false,
      isHost: asHost && this.state.hostId === null,
    };
    if (player.isHost) this.state.hostId = player.id;
    this.state.players.push(player);
    this.ctx.waitUntil(this.save());
    this.broadcast();
    return json({ playerId: player.id, token: player.token });
  }

  private handleWs(request: Request): Response {
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player || player.token !== token) {
      return json(
        { error: "セッションが無効です。もう一度参加し直してください。" },
        403
      );
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: player.id });

    // One live socket per player: close a previous connection if any.
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === server) continue;
      const att = ws.deserializeAttachment() as { playerId?: string } | null;
      if (att?.playerId === player.id) {
        try {
          ws.close(4000, "replaced by new connection");
        } catch {
          /* already closed */
        }
      }
    }

    player.connected = true;
    this.ctx.waitUntil(this.save());
    server.send(JSON.stringify({ t: "joined", playerId: player.id }));
    this.sendState(server);
    this.broadcast(); // update presence for everyone else
    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------- websocket handlers ----------

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof message === "string" ? message : "") as ClientMessage;
    } catch {
      return;
    }
    const att = ws.deserializeAttachment() as { playerId?: string } | null;
    const player = this.state.players.find((p) => p.id === att?.playerId);
    if (!player) return;

    await this.tick(); // settle any elapsed deadlines first

    switch (msg.t) {
      case "start":
        this.onStart(player);
        break;
      case "buzz":
        this.onBuzz(player);
        break;
      case "answer":
        this.onAnswer(player, msg.i);
        break;
      case "restart":
        this.onRestart(player);
        break;
    }
  }

  async webSocketClose(ws: WebSocket) {
    const att = ws.deserializeAttachment() as { playerId?: string } | null;
    const player = this.state.players.find((p) => p.id === att?.playerId);
    if (player) {
      // Only mark disconnected if this was the player's current socket.
      const stillHere = this.ctx
        .getWebSockets()
        .some(
          (s) =>
            s !== ws &&
            (s.deserializeAttachment() as { playerId?: string } | null)?.playerId ===
              player.id
        );
      if (!stillHere) {
        player.connected = false;
        this.ctx.waitUntil(this.save());
        this.broadcast();
      }
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }

  // ---------- game logic ----------

  private onStart(player: StoredPlayer) {
    const s = this.state;
    if (s.phase !== "lobby") return;
    if (player.id !== s.hostId) {
      this.sendTo(player.id, { t: "error", message: "開始できるのはホストだけです" });
      return;
    }
    const connected = s.players.filter((p) => p.connected).length;
    if (s.players.length < MIN_PLAYERS || connected < MIN_PLAYERS) {
      this.sendTo(player.id, {
        t: "error",
        message: "開始には2〜4人の接続が必要です",
      });
      return;
    }
    s.qIndex = 0;
    this.beginQuestion();
  }

  private onBuzz(player: StoredPlayer) {
    const s = this.state;
    if (s.phase !== "question") return;
    if (player.locked || s.buzzedBy) return;
    s.buzzedBy = player.id;
    s.phase = "answer";
    s.answerEndsAt = Date.now() + this.answerMs;
    this.ctx.waitUntil(this.save());
    this.broadcast();
    this.ctx.waitUntil(this.rescheduleAlarm());
  }

  private onAnswer(player: StoredPlayer, i: number) {
    const s = this.state;
    if (s.phase !== "answer" || s.buzzedBy !== player.id) return;
    if (typeof i !== "number" || i < 0 || i > 3) return;
    const q = QUESTIONS[s.qIndex];
    if (i === q.answer) {
      player.score += PLUS;
      s.lastReveal = {
        correctIndex: q.answer,
        answeredBy: player.id,
        chosenIndex: i,
        timedOut: false,
      };
      this.toReveal();
    } else {
      player.score += MINUS;
      player.locked = true;
      this.resumeOrReveal();
    }
  }

  private onRestart(player: StoredPlayer) {
    const s = this.state;
    if (s.phase !== "finished" || player.id !== s.hostId) return;
    for (const p of s.players) {
      p.score = 0;
      p.locked = false;
    }
    s.phase = "lobby";
    s.qIndex = 0;
    s.questionEndsAt = null;
    s.answerEndsAt = null;
    s.buzzedBy = null;
    s.revealUntil = null;
    s.lastReveal = null;
    this.ctx.waitUntil(this.save());
    this.broadcast();
  }

  private beginQuestion() {
    const s = this.state;
    s.phase = "question";
    s.buzzedBy = null;
    s.answerEndsAt = null;
    s.revealUntil = null;
    s.lastReveal = null;
    for (const p of s.players) p.locked = false;
    s.questionEndsAt = Date.now() + this.questionMs;
    this.ctx.waitUntil(this.save());
    this.broadcast();
    this.ctx.waitUntil(this.rescheduleAlarm());
  }

  private resumeOrReveal() {
    const s = this.state;
    const remaining = s.players.filter((p) => !p.locked);
    s.buzzedBy = null;
    s.answerEndsAt = null;
    if (remaining.length === 0 || (s.questionEndsAt ?? 0) <= Date.now()) {
      const q = QUESTIONS[s.qIndex];
      if (!s.lastReveal) {
        s.lastReveal = {
          correctIndex: q.answer,
          answeredBy: null,
          chosenIndex: null,
          timedOut: (s.questionEndsAt ?? 0) <= Date.now(),
        };
      }
      this.toReveal();
    } else {
      s.phase = "question";
      this.ctx.waitUntil(this.save());
      this.broadcast();
      this.ctx.waitUntil(this.rescheduleAlarm());
    }
  }

  private toReveal() {
    const s = this.state;
    s.phase = "reveal";
    s.revealUntil = Date.now() + this.revealMs;
    s.answerEndsAt = null;
    this.ctx.waitUntil(this.save());
    this.broadcast();
    this.ctx.waitUntil(this.rescheduleAlarm());
  }

  private nextOrFinish() {
    const s = this.state;
    s.qIndex += 1;
    s.lastReveal = null;
    if (s.qIndex >= QUESTIONS.length) {
      s.phase = "finished";
      s.questionEndsAt = null;
      s.revealUntil = null;
      this.ctx.waitUntil(this.save());
      this.broadcast();
    } else {
      this.beginQuestion();
    }
  }

  // ---------- timers ----------

  async alarm() {
    await this.tick();
  }

  /** Apply any deadline-based transitions whose time has come. */
  private async tick() {
    const s = this.state;
    const now = Date.now();
    if (s.phase === "answer" && s.answerEndsAt !== null && now >= s.answerEndsAt) {
      // Answer window expired: treat as a wrong answer (no choice taken).
      const player = s.players.find((p) => p.id === s.buzzedBy);
      if (player) {
        player.score += MINUS;
        player.locked = true;
      }
      this.resumeOrReveal();
    } else if (
      s.phase === "question" &&
      s.questionEndsAt !== null &&
      now >= s.questionEndsAt
    ) {
      const q = QUESTIONS[s.qIndex];
      s.lastReveal = {
        correctIndex: q.answer,
        answeredBy: null,
        chosenIndex: null,
        timedOut: true,
      };
      this.toReveal();
    } else if (
      s.phase === "reveal" &&
      s.revealUntil !== null &&
      now >= s.revealUntil
    ) {
      this.nextOrFinish();
    }
    await this.rescheduleAlarm();
  }

  private async rescheduleAlarm() {
    const s = this.state;
    const deadlines: number[] = [];
    if (s.phase === "question" && s.questionEndsAt) deadlines.push(s.questionEndsAt);
    if (s.phase === "answer" && s.answerEndsAt) {
      deadlines.push(s.answerEndsAt);
      if (s.questionEndsAt) deadlines.push(s.questionEndsAt);
    }
    if (s.phase === "reveal" && s.revealUntil) deadlines.push(s.revealUntil);
    const next = deadlines.length ? Math.min(...deadlines) : null;
    const current = await this.ctx.storage.getAlarm();
    if (next === null) {
      if (current !== null) await this.ctx.storage.deleteAlarm();
    } else if (current === null || current > next) {
      await this.ctx.storage.setAlarm(next);
      // In-memory fallback as well so the transition fires even if the
      // alarm mechanism is slow; tick() is idempotent.
      const delay = Math.max(0, next - Date.now());
      setTimeout(() => this.ctx.waitUntil(this.tick()), delay + 20);
    }
  }

  // ---------- persistence & broadcast ----------

  private async save() {
    await this.ctx.storage.put("state", this.state);
  }

  private socketOf(playerId: string): WebSocket | null {
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as { playerId?: string } | null;
      if (att?.playerId === playerId) return ws;
    }
    return null;
  }

  private sendTo(playerId: string, msg: ServerMessage) {
    const ws = this.socketOf(playerId);
    if (ws) {
      try {
        ws.send(JSON.stringify(msg));
      } catch {
        /* closed */
      }
    }
  }

  private buildState(youId: string | null): StateMessage {
    const s = this.state;
    const q = s.qIndex < QUESTIONS.length ? QUESTIONS[s.qIndex] : null;
    const msg: StateMessage = {
      t: "state",
      room: "",
      phase: s.phase,
      now: Date.now(),
      you: youId,
      hostId: s.hostId,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: p.connected,
        locked: p.locked,
        isHost: p.id === s.hostId,
      })),
    };
    if (
      q &&
      (s.phase === "question" || s.phase === "answer" || s.phase === "reveal")
    ) {
      msg.question = {
        n: s.qIndex + 1,
        total: QUESTIONS.length,
        text: q.text,
        choices: [...q.choices],
        endsAt: s.questionEndsAt ?? 0,
      };
    }
    msg.buzzedBy = s.buzzedBy;
    if (s.phase === "answer") {
      msg.answering = { playerId: s.buzzedBy ?? "", endsAt: s.answerEndsAt ?? 0 };
    }
    if (s.phase === "reveal" || s.phase === "finished") {
      msg.reveal = s.lastReveal
        ? {
            correctIndex: s.lastReveal.correctIndex,
            correctText:
              s.qIndex < QUESTIONS.length
                ? QUESTIONS[s.qIndex].choices[s.lastReveal.correctIndex]
                : "",
            answeredBy: s.lastReveal.answeredBy,
            chosenIndex: s.lastReveal.chosenIndex,
            timedOut: s.lastReveal.timedOut,
          }
        : null;
      msg.revealUntil = s.revealUntil;
    }
    if (s.phase === "finished") {
      const sorted = [...s.players].sort((a, b) => b.score - a.score);
      let rank = 0;
      let prev = Infinity;
      msg.ranking = sorted.map((p, i) => {
        if (p.score !== prev) {
          rank = i + 1;
          prev = p.score;
        }
        return { playerId: p.id, name: p.name, score: p.score, rank };
      });
    }
    return msg;
  }

  private sendState(ws: WebSocket) {
    const att = ws.deserializeAttachment() as { playerId?: string } | null;
    const msg = this.buildState(att?.playerId ?? null);
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* closed */
    }
  }

  private broadcast() {
    for (const ws of this.ctx.getWebSockets()) {
      this.sendState(ws);
    }
  }
}
