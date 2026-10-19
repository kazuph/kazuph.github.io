import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";
import {
  TOTAL_QUESTIONS,
  pickQuestionIndexes,
  questionAt,
} from "./questions";

const CAPACITY = 4;

type Phase = "lobby" | "question" | "reveal" | "finished";

interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  lockedOut: boolean;
}

export interface AnswerResult {
  playerId: string;
  choice: number | null;
  correct: boolean;
  reason: "answer" | "timeout";
}

interface RoomData {
  code: string;
  hostId: string | null;
  phase: Phase;
  players: Player[];
  questionOrder: number[];
  index: number;
  questionStartedAt: number | null;
  questionDeadline: number | null;
  buzzedBy: string | null;
  answerDeadline: number | null;
  result: AnswerResult | null;
  revealDeadline: number | null;
  finishedAt: number | null;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  lockedOut: boolean;
  isHost: boolean;
}

export interface RankingRow {
  playerId: string;
  name: string;
  score: number;
  rank: number;
}

export interface PublicState {
  code: string;
  hostId: string | null;
  phase: Phase;
  players: PublicPlayer[];
  round: number;
  totalQuestions: number;
  question: { prompt: string; choices: string[] } | null;
  correctIndex: number | null;
  questionStartedAt: number | null;
  questionDeadline: number | null;
  buzzedBy: string | null;
  answerDeadline: number | null;
  revealDeadline: number | null;
  result: AnswerResult | null;
  ranking: RankingRow[] | null;
  capacity: number;
  serverNow: number;
}

type ClientMessage =
  | { type: "start" }
  | { type: "buzz" }
  | { type: "answer"; choice: number }
  | { type: "play-again" }
  | { type: "ping" };

interface SocketAttachment {
  playerId: string;
}

const EMPTY_QUESTION_FIELDS = {
  questionStartedAt: null,
  questionDeadline: null,
  buzzedBy: null,
  answerDeadline: null,
  result: null,
  revealDeadline: null,
} as const;

function computeRanking(players: Player[]): RankingRow[] {
  const sorted = [...players].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"),
  );
  let previousScore: number | null = null;
  let previousRank = 0;
  return sorted.map((player, index) => {
    const rank = previousScore === player.score ? previousRank : index + 1;
    previousScore = player.score;
    previousRank = rank;
    return {
      playerId: player.id,
      name: player.name,
      score: player.score,
      rank,
    };
  });
}

/**
 * One Durable Object instance per room. It is the single authority for the
 * buzz order, answer correctness, scores and all countdowns. Clients only send
 * intents; they can never declare their own score or buzz winner.
 */
export class Room extends DurableObject<Env> {
  private state: RoomData | null = null;
  private loaded = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private async load(): Promise<RoomData | null> {
    if (!this.loaded) {
      this.state = (await this.ctx.storage.get<RoomData>("state")) ?? null;
      this.loaded = true;
    }
    return this.state;
  }

  private async save(state: RoomData): Promise<void> {
    this.state = state;
    this.loaded = true;
    await this.ctx.storage.put("state", state);
    await this.scheduleAlarm(state);
  }

  private scheduleAlarm(state: RoomData): Promise<void> {
    let at: number | null = null;
    if (state.phase === "question") {
      at = state.buzzedBy ? state.answerDeadline : state.questionDeadline;
    } else if (state.phase === "reveal") {
      at = state.revealDeadline;
    }
    if (at === null) return this.ctx.storage.deleteAlarm();
    return this.ctx.storage.setAlarm(at);
  }

  private num(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private get questionMs(): number {
    return this.num(this.env.ROOM_QUESTION_MS, 20_000);
  }

  private get answerMs(): number {
    return this.num(this.env.ROOM_ANSWER_MS, 10_000);
  }

  private get revealMs(): number {
    return this.num(this.env.ROOM_REVEAL_MS, 4_000);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/init" && request.method === "POST") {
      return this.handleInit(request);
    }
    if (url.pathname === "/summary") {
      return this.handleSummary();
    }
    if (url.pathname === "/ws") {
      return this.handleWebSocket(request, url);
    }
    return new Response("not found", { status: 404 });
  }

  private async handleInit(request: Request): Promise<Response> {
    const existing = await this.load();
    if (existing) {
      return Response.json({ error: "room-exists" }, { status: 409 });
    }
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = String(body.code ?? "").toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) {
      return Response.json({ error: "invalid-code" }, { status: 400 });
    }
    const state: RoomData = {
      code,
      hostId: null,
      phase: "lobby",
      players: [],
      questionOrder: [],
      index: 0,
      ...EMPTY_QUESTION_FIELDS,
      finishedAt: null,
    };
    await this.save(state);
    return Response.json({ ok: true, code });
  }

  private async handleSummary(): Promise<Response> {
    const state = await this.load();
    if (!state) {
      return Response.json({ exists: false }, { status: 404 });
    }
    return Response.json({
      exists: true,
      code: state.code,
      phase: state.phase,
      playerCount: state.players.length,
      capacity: CAPACITY,
      joinable: state.phase === "lobby" && state.players.length < CAPACITY,
    });
  }

  private async handleWebSocket(
    request: Request,
    url: URL,
  ): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const state = await this.load();
    if (!state) {
      return this.rejectSocket(
        "room-not-found",
        "部屋が見つかりません。コードを確認してください。",
      );
    }

    const playerId = (url.searchParams.get("playerId") ?? "").trim();
    const rawName = (url.searchParams.get("name") ?? "").trim();
    if (!playerId) {
      return this.rejectSocket(
        "invalid-player",
        "プレイヤー情報が不正です。ページを再読み込みしてください。",
      );
    }

    const existing = state.players.find((player) => player.id === playerId);
    if (!existing && rawName.length === 0) {
      return this.rejectSocket(
        "name-required",
        "名前を入力してください。",
      );
    }

    if (!existing && state.players.length >= CAPACITY) {
      return this.rejectSocket(
        "room-full",
        "この部屋は満員です（定員4人）。別の部屋コードを試してください。",
      );
    }

    if (!existing && state.phase !== "lobby") {
      return this.rejectSocket(
        "game-started",
        "この部屋はすでにゲームが始まっています。",
      );
    }

    // A reload can produce a fresh socket before the old one is fully closed.
    // Retire the old socket and keep exactly one live connection per player.
    for (const oldSocket of this.ctx.getWebSockets(playerId)) {
      try {
        oldSocket.close(4000, "replaced");
      } catch {
        // already closed
      }
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server, [playerId]);
    server.serializeAttachment({ playerId } satisfies SocketAttachment);

    if (existing) {
      existing.connected = true;
      if (rawName.length > 0) existing.name = rawName.slice(0, 12);
    } else {
      state.players.push({
        id: playerId,
        name: rawName.slice(0, 12),
        score: 0,
        connected: true,
        lockedOut: false,
      });
      if (!state.hostId) state.hostId = playerId;
    }

    await this.save(state);
    this.send(server, { type: "welcome", playerId, code: state.code });
    this.broadcast(state);

    return new Response(null, { status: 101, webSocket: client });
  }

  private rejectSocket(code: string, message: string): Response {
    const pair = new WebSocketPair();
    pair[1].accept();
    this.send(pair[1], { type: "error", code, message });
    pair[1].close(4001, code);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  private send(ws: WebSocket, payload: unknown): void {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // Socket went away between events; close cleanup will fix the state.
    }
  }

  private broadcast(state: RoomData): void {
    const message = JSON.stringify({
      type: "state",
      state: this.publicState(state),
    });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message);
      } catch {
        // ignore sockets that are closing
      }
    }
  }

  private publicState(state: RoomData): PublicState {
    const question =
      state.phase === "lobby" || state.questionOrder.length === 0
        ? null
        : questionAt(state.questionOrder[state.index] ?? 0);
    const showAnswer = state.phase === "reveal" || state.phase === "finished";
    return {
      code: state.code,
      hostId: state.hostId,
      phase: state.phase,
      players: state.players.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        connected: player.connected,
        lockedOut: player.lockedOut,
        isHost: player.id === state.hostId,
      })),
      round: state.phase === "lobby" ? 0 : state.index + 1,
      totalQuestions: TOTAL_QUESTIONS,
      question: question
        ? { prompt: question.prompt, choices: [...question.choices] }
        : null,
      correctIndex: showAnswer && question ? question.answerIndex : null,
      questionStartedAt: state.questionStartedAt,
      questionDeadline: state.questionDeadline,
      buzzedBy: state.buzzedBy,
      answerDeadline: state.answerDeadline,
      revealDeadline: state.revealDeadline,
      result: state.result,
      ranking:
        state.phase === "finished" ? computeRanking(state.players) : null,
      capacity: CAPACITY,
      serverNow: Date.now(),
    };
  }

  private async finish(state: RoomData, now: number): Promise<void> {
    state.phase = "finished";
    state.finishedAt = now;
    state.buzzedBy = null;
    state.answerDeadline = null;
    state.revealDeadline = null;
  }

  private async beginQuestion(state: RoomData, now: number): Promise<void> {
    state.phase = "question";
    state.questionStartedAt = now;
    state.questionDeadline = now + this.questionMs;
    state.buzzedBy = null;
    state.answerDeadline = null;
    state.result = null;
    state.revealDeadline = null;
    for (const player of state.players) player.lockedOut = false;
  }

  private beginReveal(state: RoomData, now: number): void {
    state.phase = "reveal";
    state.revealDeadline = now + this.revealMs;
    state.buzzedBy = null;
    state.answerDeadline = null;
  }

  private allLockedOut(state: RoomData): boolean {
    return state.players.every((player) => player.lockedOut);
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const state = await this.load();
    if (!state) return;
    const attachment = ws.deserializeAttachment() as
      | SocketAttachment
      | null
      | undefined;
    const playerId = attachment?.playerId;
    if (!playerId) return;

    let parsed: ClientMessage;
    try {
      parsed =
        typeof message === "string"
          ? (JSON.parse(message) as ClientMessage)
          : (JSON.parse(new TextDecoder().decode(message)) as ClientMessage);
    } catch {
      this.send(ws, {
        type: "error",
        code: "bad-message",
        message: "メッセージを解釈できませんでした。",
      });
      return;
    }

    if (parsed.type === "ping") {
      this.send(ws, { type: "pong", serverNow: Date.now() });
      return;
    }

    const player = state.players.find((entry) => entry.id === playerId);
    if (!player) return;

    const now = Date.now();

    if (parsed.type === "start") {
      if (state.phase !== "lobby") {
        this.send(ws, {
          type: "error",
          code: "already-started",
          message: "ゲームはすでに始まっています。",
        });
        return;
      }
      if (state.hostId !== playerId) {
        this.send(ws, {
          type: "error",
          code: "not-host",
          message: "ゲームを開始できるのはホストだけです。",
        });
        return;
      }
      const connectedCount = state.players.filter(
        (entry) => entry.connected,
      ).length;
      if (connectedCount < 2) {
        this.send(ws, {
          type: "error",
          code: "too-few-players",
          message: "開始するには2人以上のプレイヤーが必要です。",
        });
        return;
      }
      if (state.players.length > CAPACITY) {
        this.send(ws, {
          type: "error",
          code: "too-many-players",
          message: "定員は4人です。",
        });
        return;
      }
      for (const entry of state.players) {
        entry.score = 0;
        entry.lockedOut = false;
      }
      state.questionOrder = pickQuestionIndexes(TOTAL_QUESTIONS);
      state.index = 0;
      state.finishedAt = null;
      await this.beginQuestion(state, now);
      await this.save(state);
      this.broadcast(state);
      return;
    }

    if (parsed.type === "buzz") {
      if (state.phase !== "question") return;
      if (state.buzzedBy) return;
      if (player.lockedOut) return;
      if (!player.connected) return;
      if (!state.questionDeadline || now >= state.questionDeadline) return;
      state.buzzedBy = playerId;
      state.answerDeadline = now + this.answerMs;
      await this.save(state);
      this.broadcast(state);
      return;
    }

    if (parsed.type === "answer") {
      if (state.phase !== "question") return;
      if (state.buzzedBy !== playerId) {
        this.send(ws, {
          type: "error",
          code: "no-answer-right",
          message: "回答権を持っているのは早押しに勝ったプレイヤーだけです。",
        });
        return;
      }
      if (!state.answerDeadline || now > state.answerDeadline) {
        this.send(ws, {
          type: "error",
          code: "answer-too-late",
          message: "回答時間（10秒）を過ぎました。",
        });
        return;
      }
      const choice = Number(parsed.choice);
      if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
        return;
      }
      const question = questionAt(state.questionOrder[state.index]);
      const correct = choice === question.answerIndex;
      const result: AnswerResult = {
        playerId,
        choice,
        correct,
        reason: "answer",
      };
      if (correct) {
        player.score += 10;
        state.result = result;
        this.beginReveal(state, now);
      } else {
        player.score -= 5;
        player.lockedOut = true;
        state.result = result;
        state.buzzedBy = null;
        state.answerDeadline = null;
        if (this.allLockedOut(state) || now >= (state.questionDeadline ?? 0)) {
          this.beginReveal(state, now);
        }
      }
      await this.save(state);
      this.broadcast(state);
      return;
    }

    if (parsed.type === "play-again") {
      if (state.hostId !== playerId || state.phase !== "finished") {
        return;
      }
      state.phase = "lobby";
      state.questionOrder = [];
      state.index = 0;
      state.finishedAt = null;
      Object.assign(state, EMPTY_QUESTION_FIELDS);
      for (const entry of state.players) {
        entry.score = 0;
        entry.lockedOut = false;
      }
      await this.save(state);
      this.broadcast(state);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const state = await this.load();
    if (!state) return;
    const attachment = ws.deserializeAttachment() as
      | SocketAttachment
      | null
      | undefined;
    const playerId = attachment?.playerId;
    if (!playerId) return;

    const stillConnected = this.ctx
      .getWebSockets(playerId)
      .some((socket) => socket !== ws);
    if (stillConnected) return;

    const player = state.players.find((entry) => entry.id === playerId);
    if (!player) return;

    if (state.phase === "lobby") {
      state.players = state.players.filter((entry) => entry.id !== playerId);
      if (state.hostId === playerId) {
        state.hostId = state.players[0]?.id ?? null;
      }
    } else {
      player.connected = false;
    }

    await this.save(state);
    this.broadcast(state);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    const state = await this.load();
    if (!state) return;
    const now = Date.now();

    if (state.phase === "question") {
      if (
        state.buzzedBy &&
        state.answerDeadline &&
        now >= state.answerDeadline
      ) {
        const player = state.players.find(
          (entry) => entry.id === state.buzzedBy,
        );
        if (player) {
          player.score -= 5;
          player.lockedOut = true;
          state.result = {
            playerId: player.id,
            choice: null,
            correct: false,
            reason: "timeout",
          };
        }
        state.buzzedBy = null;
        state.answerDeadline = null;
        if (
          this.allLockedOut(state) ||
          now >= (state.questionDeadline ?? 0)
        ) {
          this.beginReveal(state, now);
        }
      } else if (
        !state.buzzedBy &&
        (now >= (state.questionDeadline ?? 0) || this.allLockedOut(state))
      ) {
        state.result = null;
        this.beginReveal(state, now);
      }
    }

    if (state.phase === "reveal" && now >= (state.revealDeadline ?? 0)) {
      if (state.index + 1 >= state.questionOrder.length) {
        await this.finish(state, now);
      } else {
        state.index += 1;
        await this.beginQuestion(state, now);
      }
    }

    await this.save(state);
    this.broadcast(state);
  }
}
