import { DurableObject } from "cloudflare:workers";
import { QUESTIONS } from "./questions";
import type { Env } from "./worker";

type Player = { id: string; token: string; name: string; score: number; joinedAt: number };
type Phase = "lobby" | "question" | "answering" | "finished";
type Reveal = { questionNumber: number; answer: string; reason: "resolved" | "timeout" | "all-locked" };
type RoomState = {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  questionIndex: number;
  questionDeadline: number | null;
  answerDeadline: number | null;
  answeringPlayerId: string | null;
  lockedOutPlayerIds: string[];
  reveal: Reveal | null;
};
type PublicState = Omit<RoomState, "players"> & {
  players: Array<Pick<Player, "id" | "name" | "score">>;
  question: { prompt: string; choices: readonly string[] } | null;
  serverNow: number;
};
type ClientMessage = { type: "start" } | { type: "buzz" } | { type: "answer"; choice: number };

const ROOM_LIMIT = 4;
const MIN_PLAYERS_TO_START = 2;
const QUESTION_DURATION_MS = 20_000;
const ANSWER_DURATION_MS = 10_000;

export class GameRoom extends DurableObject<Env> {
  private room: RoomState | null = null;
  private readonly ready: Promise<void>;
  private queue: Promise<void> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ready = this.ctx.blockConcurrencyWhile(async () => {
      this.room = await this.ctx.storage.get<RoomState>("room") ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.ready;
    return this.serial(async () => {
      const url = new URL(request.url);
      if (request.method === "POST" && url.pathname === "/create") return this.create(request);
      if (request.method === "POST" && url.pathname === "/join") return this.join(request);
      if (request.method === "POST" && url.pathname === "/reconnect") return this.reconnect(request);
      if (url.pathname === "/ws" && request.headers.get("Upgrade")?.toLowerCase() === "websocket") return this.openSocket(request);
      return Response.json({ error: "部屋が見つかりません。" }, { status: 404 });
    });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    this.serial(async () => {
      await this.ready;
      const room = this.room;
      const playerId = socket.deserializeAttachment() as string | null;
      if (!room || !playerId || typeof message !== "string") return;
      const player = room.players.find((candidate) => candidate.id === playerId);
      if (!player) return;
      const parsed: unknown = JSON.parse(message);
      if (!isRecord(parsed) || typeof parsed.type !== "string") return;
      await this.expireIfNeeded(Date.now());
      const current = this.room;
      if (!current) return;
      switch (parsed.type) {
        case "start":
          if (player.id === current.hostId && current.phase === "lobby" && current.players.length >= MIN_PLAYERS_TO_START) {
            current.phase = "question";
            current.questionIndex = 0;
            current.questionDeadline = Date.now() + QUESTION_DURATION_MS;
            current.reveal = null;
            await this.saveAndBroadcast();
            await this.scheduleAlarm();
          } else {
            this.sendError(socket, "ホストのみが2〜4人で開始できます。");
          }
          break;
        case "buzz":
          if (current.phase !== "question" || current.lockedOutPlayerIds.includes(player.id)) return;
          current.phase = "answering";
          current.answeringPlayerId = player.id;
          current.answerDeadline = Math.min(Date.now() + ANSWER_DURATION_MS, current.questionDeadline ?? Date.now());
          current.reveal = null;
          await this.saveAndBroadcast();
          await this.scheduleAlarm();
          break;
        case "answer":
          if (current.phase !== "answering" || current.answeringPlayerId !== player.id || !isValidChoice(parsed.choice)) return;
          await this.answer(current, player, parsed.choice);
          break;
        default:
          break;
      }
    });
  }

  webSocketClose(socket: WebSocket): void {
    try { socket.close(1000, "disconnected"); } catch { /* already closed */ }
  }

  webSocketError(socket: WebSocket): void {
    try { socket.close(1011, "connection error"); } catch { /* already closed */ }
  }

  async alarm(): Promise<void> {
    await this.serial(async () => {
      await this.ready;
      await this.expireIfNeeded(Date.now());
      await this.scheduleAlarm();
    });
  }

  private async create(request: Request): Promise<Response> {
    if (this.room) return Response.json({ error: "その部屋コードはすでに使われています。" }, { status: 409 });
    const body = await readBody(request);
    if (!body || typeof body.name !== "string" || !validName(body.name)) return badName();
    const player = makePlayer(body.name);
    this.room = {
      code: new URL(request.url).searchParams.get("code") ?? "",
      hostId: player.id,
      players: [player],
      phase: "lobby",
      questionIndex: -1,
      questionDeadline: null,
      answerDeadline: null,
      answeringPlayerId: null,
      lockedOutPlayerIds: [],
      reveal: null
    };
    await this.persist();
    return Response.json({ code: this.room.code, player: publicPlayer(player), token: player.token, state: this.publicState(this.room) });
  }

  private async join(request: Request): Promise<Response> {
    const body = await readBody(request);
    if (!body || typeof body.name !== "string" || !validName(body.name)) return badName();
    const room = this.room;
    if (!room) return Response.json({ error: "部屋が見つかりません。コードを確認してください。" }, { status: 404 });
    if (room.phase !== "lobby") return Response.json({ error: "この部屋では対戦が始まっています。" }, { status: 409 });
    if (room.players.length >= ROOM_LIMIT) return Response.json({ error: "この部屋は満員です（定員4人）。" }, { status: 409 });
    const player = makePlayer(body.name);
    room.players.push(player);
    await this.saveAndBroadcast();
    return Response.json({ code: room.code, player: publicPlayer(player), token: player.token, state: this.publicState(room) });
  }

  private async reconnect(request: Request): Promise<Response> {
    const body = await readBody(request);
    if (!body || typeof body.token !== "string") return Response.json({ error: "再接続情報がありません。" }, { status: 400 });
    const room = this.room;
    const player = room?.players.find((candidate) => candidate.token === body.token);
    if (!room || !player) return Response.json({ error: "この部屋に戻るための情報が見つかりません。" }, { status: 404 });
    await this.expireIfNeeded(Date.now());
    return Response.json({ code: room.code, player: publicPlayer(player), token: player.token, state: this.publicState(room) });
  }

  private async openSocket(request: Request): Promise<Response> {
    const token = new URL(request.url).searchParams.get("token");
    const room = this.room;
    const player = room?.players.find((candidate) => candidate.token === token);
    if (!room || !player) return new Response("再接続情報が無効です。", { status: 401 });
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server, [player.id]);
    server.serializeAttachment(player.id);
    server.send(JSON.stringify({ type: "state", state: this.publicState(room), playerId: player.id }));
    return new Response(null, { status: 101, webSocket: client });
  }

  private async answer(room: RoomState, player: Player, choice: number): Promise<void> {
    const question = QUESTIONS[room.questionIndex];
    if (!question) return;
    if (choice === question.answer) {
      player.score += 10;
      await this.advanceQuestion(room, Date.now(), "resolved");
      return;
    }
    player.score -= 5;
    room.lockedOutPlayerIds.push(player.id);
    room.phase = "question";
    room.answeringPlayerId = null;
    room.answerDeadline = null;
    if (room.players.every((candidate) => room.lockedOutPlayerIds.includes(candidate.id))) {
      await this.advanceQuestion(room, Date.now(), "all-locked");
      return;
    }
    await this.saveAndBroadcast();
    await this.scheduleAlarm();
  }

  private async expireIfNeeded(now: number): Promise<void> {
    const room = this.room;
    if (!room || (room.phase !== "question" && room.phase !== "answering")) return;
    if (room.questionDeadline !== null && now >= room.questionDeadline) {
      await this.advanceQuestion(room, now, "timeout");
      return;
    }
    if (room.phase === "answering" && room.answerDeadline !== null && now >= room.answerDeadline) {
      const timedOutId = room.answeringPlayerId;
      if (timedOutId) room.lockedOutPlayerIds.push(timedOutId);
      room.phase = "question";
      room.answeringPlayerId = null;
      room.answerDeadline = null;
      if (room.players.every((candidate) => room.lockedOutPlayerIds.includes(candidate.id))) {
        await this.advanceQuestion(room, now, "all-locked");
      } else {
        await this.saveAndBroadcast();
        await this.scheduleAlarm();
      }
    }
  }

  private async advanceQuestion(room: RoomState, now: number, reason: Reveal["reason"]): Promise<void> {
    const question = QUESTIONS[room.questionIndex];
    if (!question) return;
    room.reveal = {
      questionNumber: room.questionIndex + 1,
      answer: question.choices[question.answer],
      reason
    };
    room.answeringPlayerId = null;
    room.answerDeadline = null;
    room.lockedOutPlayerIds = [];
    if (room.questionIndex + 1 >= QUESTIONS.length) {
      room.phase = "finished";
      room.questionDeadline = null;
    } else {
      room.phase = "question";
      room.questionIndex += 1;
      room.questionDeadline = now + QUESTION_DURATION_MS;
    }
    await this.saveAndBroadcast();
    await this.scheduleAlarm();
  }

  private async saveAndBroadcast(): Promise<void> {
    await this.persist();
    this.broadcast({ type: "state", state: this.publicState(this.room!) });
  }

  private async persist(): Promise<void> {
    if (this.room) await this.ctx.storage.put("room", this.room);
  }

  private publicState(room: RoomState): PublicState {
    const question = QUESTIONS[room.questionIndex];
    const { players, ...rest } = room;
    return {
      ...rest,
      players: players.map(({ id, name, score }) => ({ id, name, score })),
      question: question ? { prompt: question.prompt, choices: question.choices } : null,
      serverNow: Date.now()
    };
  }

  private broadcast(message: unknown): void {
    const serialized = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets()) {
      try { socket.send(serialized); } catch { /* disconnected sockets are removed by the runtime */ }
    }
  }

  private sendError(socket: WebSocket, message: string): void {
    socket.send(JSON.stringify({ type: "error", error: message }));
  }

  private async scheduleAlarm(): Promise<void> {
    const room = this.room;
    if (!room) return;
    const deadline = room.phase === "answering" ? room.answerDeadline : room.questionDeadline;
    if (deadline === null || room.phase === "lobby" || room.phase === "finished") {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(deadline);
    }
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}

function makePlayer(name: string): Player {
  return {
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    name: name.trim(),
    score: 0,
    joinedAt: Date.now()
  };
}

function publicPlayer(player: Player): Pick<Player, "id" | "name" | "score"> {
  const { id, name, score } = player;
  return { id, name, score };
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  return isRecord(body) ? body : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validName(name: string): boolean {
  return name.trim().length > 0;
}

function badName(): Response {
  return Response.json({ error: "名前を入力してください。" }, { status: 400 });
}

function isValidChoice(choice: unknown): choice is number {
  return typeof choice === "number" && Number.isInteger(choice) && choice >= 0 && choice < 4;
}
