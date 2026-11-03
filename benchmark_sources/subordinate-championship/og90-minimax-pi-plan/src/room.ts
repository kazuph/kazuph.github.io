/**
 * 1部屋 = 1つの Durable Object。
 *
 * - 部屋の状態（参加者・点数・進行中の問題）を保持する
 * - WebSocket (Hibernation API) を受け取り、全員に状態を配信する
 * - Alarm で締め切り（20秒・10秒・3秒）を処理する
 * - 正誤判定・点数・早押しの順番はすべてこの中で決める（ブラウザの申告は信用しない）
 */

import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";
import {
  type GameState,
  addPlayer,
  answer,
  buzz,
  canJoin,
  createState,
  currentQuestion,
  findPlayer,
  findPlayerByToken,
  nextDeadline,
  rankPlayers,
  startGame,
  tick,
} from "./game";

const STORAGE_KEY = "state";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O, 1/I を除く
const CODE_LENGTH = 6;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function makeRoomCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  eliminated: boolean;
  isHost: boolean;
}

export interface PublicState {
  phase: GameState["phase"];
  roomCode: string;
  hostId: string;
  totalQuestions: number;
  question: {
    index: number;
    total: number;
    text: string;
    choices: string[];
  } | null;
  /** 正解の添字。reveal / finished のときだけ入��� */
  correctChoice: number | null;
  players: PublicPlayer[];
  buzz: { playerId: string; playerName: string; deadline: number } | null;
  deadline: number | null;
  lastOutcome: GameState["lastOutcome"];
  ranking: ReturnType<typeof rankPlayers> | null;
}

export class Room extends DurableObject<Env> {
  private state: GameState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const saved = await this.ctx.storage.get<GameState>(STORAGE_KEY);
      this.state = saved ?? createState("", Date.now());
    });
  }

  private get roomCode(): string {
    return this.ctx.id.name ?? "";
  }

  private ensureState(): GameState {
    if (!this.state) {
      this.state = createState("", Date.now());
    }
    return this.state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/init" && request.method === "POST") {
      return this.handleInit(request);
    }
    if (path === "/join" && request.method === "POST") {
      return this.handleJoin(request);
    }
    if (path === "/ws") {
      return this.handleWebSocket(request);
    }
    if (path === "/exists") {
      const state = this.ensureState();
      if (state.players.length === 0) {
        return new Response("empty", { status: 404 });
      }
      return new Response("ok", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  }

  private async handleInit(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = (body.name ?? "").trim().slice(0, 20) || "ゲスト";
    const state = this.ensureState();
    // 部屋の最初の参加者がホスト
    if (state.players.length === 0) {
      state.hostId = "";
    }
    const id = crypto.randomUUID();
    const token = randomToken();
    const result = addPlayer(state, id, name, token, Date.now());
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { "content-type": "application/json" },
      });
    }
    if (!state.hostId) {
      state.hostId = id;
    }
    await this.persist();
    return jsonResponse({ code: this.roomCode, playerId: id, token, host: state.hostId === id });
  }

  private async handleJoin(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = (body.name ?? "").trim().slice(0, 20) || "ゲスト";
    const state = this.ensureState();
    const check = canJoin(state);
    if (!check.ok) {
      return jsonResponse({ error: check.error }, check.status);
    }
    const id = crypto.randomUUID();
    const token = randomToken();
    const result = addPlayer(state, id, name, token, Date.now());
    if (!result.ok) {
      return jsonResponse({ error: result.error }, result.status);
    }
    await this.persist();
    this.broadcast();
    return jsonResponse({ code: this.roomCode, playerId: id, token, host: state.hostId === id });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const state = this.ensureState();
    const player = findPlayerByToken(state, token);
    if (!player) {
      return new Response("forbidden", { status: 403 });
    }
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket request", { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: player.id });

    // 同じプレイヤーの古い接続は閉じる（再読み込み・再接続の切り替え）
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === server) continue;
      const attachment = ws.deserializeAttachment() as { playerId?: string } | null;
      if (attachment && attachment.playerId === player.id) {
        try {
          ws.close(1000, "replaced");
        } catch {
          /* ignore */
        }
      }
    }

    player.connected = true;
    await this.persist();
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = ws.deserializeAttachment() as { playerId?: string } | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;
    let payload: { t?: string; q?: number; choice?: number };
    try {
      payload = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      return;
    }
    const state = this.ensureState();
    const now = Date.now();
    // 期限切れの処理を先にまとめて進める
    tick(state, now);
    let error: string | null = null;
    switch (payload.t) {
      case "start": {
        if (playerId !== state.hostId) {
          error = "ホストだけが開始できます";
        } else {
          const result = startGame(state, now);
          if (!result.ok) error = result.error;
        }
        break;
      }
      case "buzz": {
        const result = buzz(state, playerId, payload.q ?? -1, now);
        if (!result.ok) error = result.error;
        break;
      }
      case "answer": {
        const result = answer(state, playerId, payload.q ?? -1, payload.choice ?? -1, now);
        if (!result.ok) error = result.error;
        break;
      }
      case "ping": {
        // keep-alive。状態は送らない（切断の検出は TCP で行う）
        this.send(ws, { t: "pong", serverNow: now });
        break;
      }
      default:
        return;
    }
    await this.persist();
    this.broadcast(error);
    this.scheduleAlarm();
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
  ): Promise<void> {
    void code;
    void reason;
    this.markDisconnected(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    void error;
    this.markDisconnected(ws);
  }

  private markDisconnected(ws: WebSocket): void {
    const attachment = ws.deserializeAttachment() as { playerId?: string } | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;
    // 同じプレイヤーの他の接続が残っていれば、まだオンラインとみなす
    for (const other of this.ctx.getWebSockets()) {
      if (other === ws) continue;
      const otherAttachment = other.deserializeAttachment() as { playerId?: string } | null;
      if (otherAttachment && otherAttachment.playerId === playerId) return;
    }
    const state = this.ensureState();
    const player = findPlayer(state, playerId);
    if (player) {
      player.connected = false;
    }
    void this.persist();
    this.broadcast();
  }

  async alarm(): Promise<void> {
    const state = this.ensureState();
    const now = Date.now();
    tick(state, now);
    await this.persist();
    this.broadcast();
    this.scheduleAlarm();
  }

  private async persist(): Promise<void> {
    await this.ctx.storage.put(STORAGE_KEY, this.ensureState());
  }

  private scheduleAlarm(): void {
    const deadline = nextDeadline(this.ensureState());
    if (deadline === null) {
      void this.ctx.storage.deleteAlarm();
      return;
    }
    const at = Math.max(deadline, Date.now() + 1);
    void this.ctx.storage.setAlarm(at);
  }

  private publicState(now: number): PublicState {
    const state = this.ensureState();
    const question =
      state.phase === "question" || state.phase === "answering" || state.phase === "reveal"
        ? currentQuestion(state)
        : null;
    const showCorrect = state.phase === "reveal" || state.phase === "finished";
    return {
      phase: state.phase,
      roomCode: this.roomCode,
      hostId: state.hostId,
      totalQuestions: state.questionOrder.length,
      question: question
        ? {
            index: state.questionIndex,
            total: state.questionOrder.length,
            text: question.text,
            choices: question.choices.slice(),
          }
        : null,
      correctChoice: showCorrect ? state.revealCorrect : null,
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: p.connected,
        eliminated: p.eliminated,
        isHost: p.id === state.hostId,
      })),
      buzz: state.buzzPlayerId
        ? {
            playerId: state.buzzPlayerId,
            playerName: findPlayer(state, state.buzzPlayerId)?.name ?? "",
            deadline: state.answerDeadline ?? now,
          }
        : null,
      deadline: nextDeadline(state),
      lastOutcome: state.lastOutcome,
      ranking: state.phase === "finished" ? rankPlayers(state.players) : null,
    };
  }

  private send(ws: WebSocket, message: unknown): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      /* ignore */
    }
  }

  private broadcast(error: string | null = null): void {
    const now = Date.now();
    const base = this.publicState(now);
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as { playerId?: string } | null;
      const payload: Record<string, unknown> = {
        t: "state",
        ...base,
        you: attachment?.playerId ?? null,
        serverNow: now,
      };
      if (error) payload.error = error;
      this.send(ws, payload);
    }
  }
}
