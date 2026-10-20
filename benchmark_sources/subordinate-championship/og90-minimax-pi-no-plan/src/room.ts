/**
 * 1 部屋 = 1 Durable Object。
 *
 * 部屋の状態管理と採点・早押し順の判定はすべてこの Durable Object の中だけで行い、
 * どのプレイヤーにも状態修正の権利を渡さない（サーバー側が権威）。
 */
import {
  addPlayer,
  applyAnswer,
  applyBuzz,
  canStart,
  checkSession,
  createRoomState,
  findPlayer,
  nextDeadline,
  reconnectPlayer,
  resetToLobby,
  startGame,
  tick,
  toPublicState,
  type GameState,
} from "./game";
import type { ClientMessage, PublicState } from "./types";

const STORAGE_KEY = "room";

interface Env {
  QUIZ_ROOM: DurableObjectNamespace;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export class QuizRoom {
  private ctx: DurableObjectState;
  private state: GameState | null = null;
  private sockets = new Map<WebSocket, string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** メッセージ処理を直列化する（早押しは「届いた順」で決める） */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
  }

  /** 内部リクエスト（worker -> Durable Object） */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/init" && request.method === "POST") {
      return this.handleInit(request);
    }
    if (path === "/join" && request.method === "POST") {
      return this.handleJoin(request);
    }
    if (path === "/connect") {
      return this.handleConnect(url);
    }
    if (path === "/state") {
      const state = await this.load();
      return json(toPublicState(state, url.searchParams.get("player"), Date.now()));
    }
    if (path === "/session") {
      const state = await this.load();
      const result = checkSession(
        state,
        url.searchParams.get("player") ?? "",
        url.searchParams.get("token") ?? "",
      );
      return json({ ok: true, valid: result.valid, reason: result.reason });
    }
    return json({ ok: false, error: "not found" }, 404);
  }

  /** Durable Object のアラーム（タイマーの保険） */
  async alarm(): Promise<void> {
    await this.onTimer();
  }

  // ---------------------------------------------------------------- handlers

  private async handleInit(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as {
      code?: string;
      name?: string;
    };
    const code = (body.code ?? "").toUpperCase();
    if (!code) return json({ ok: false, error: "部屋コードが不正です。" }, 400);

    const existing = await this.ctx.storage.get<GameState>(STORAGE_KEY);
    if (existing) {
      // 同じコードの部屋が既にある（新規作成は Worker 側で別コードを引く）
      return json({ ok: false, error: "この部屋コードは既に使われています。" }, 409);
    }
    const state = createRoomState(code, Date.now());
    this.state = state;
    const playerId = crypto.randomUUID();
    const token = createToken();
    const result = addPlayer(state, playerId, body.name ?? "", token);
    if (!result.ok) return json({ ok: false, error: result.reason }, 400);
    await this.persist();
    return json({ ok: true, code, playerId, token, name: body.name ?? "" });
  }

  private async handleJoin(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const state = await this.load();
    if (!state.code) {
      return json({ ok: false, error: "その部屋が見つかりません。" }, 404);
    }
    const playerId = crypto.randomUUID();
    const token = createToken();
    const result = addPlayer(state, playerId, body.name ?? "", token);
    if (!result.ok) {
      const full = state.players.length >= 4;
      return json({ ok: false, error: result.reason }, full ? 409 : 400);
    }
    await this.persist();
    return json({ ok: true, code: state.code, playerId, token, name: body.name ?? "" });
  }

  private async handleConnect(url: URL): Promise<Response> {
    const playerId = url.searchParams.get("player") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const state = await this.load();
    if (!state.code) {
      return json({ ok: false, error: "その部屋が見つかりません。" }, 404);
    }
    const result = reconnectPlayer(state, playerId, token);
    if (!result.ok) {
      return json({ ok: false, error: result.reason }, 403);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.sockets.set(server, playerId);

    server.addEventListener("message", (event) => {
      this.enqueue(async () => {
        await this.handleMessage(playerId, event.data as string);
      });
    });
    const cleanup = async () => {
      this.sockets.delete(server);
      // 同じプレイヤーの他の接続が残っていれば connected は true のまま
      const stillConnected = [...this.sockets.values()].includes(playerId);
      const current = await this.load();
      const player = findPlayer(current, playerId);
      if (player && !stillConnected && player.connected) {
        player.connected = false;
        await this.persist();
        this.broadcast();
      }
    };
    server.addEventListener("close", () => void cleanup());
    server.addEventListener("error", () => void cleanup());

    await this.persist();
    this.broadcast();
    this.schedule();

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleMessage(playerId: string, raw: string): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw as string) as ClientMessage;
    } catch {
      return;
    }
    const state = await this.load();
    const now = Date.now();

    // 経過時間による自動遷移（タイマーが遅れても状態をそろえる）
    let changed = tick(state, now);

    switch (msg.type) {
      case "buzz": {
        const result = applyBuzz(state, playerId, now);
        if (!result.ok) {
          this.sendTo(playerId, { type: "error", message: result.reason });
        } else {
          changed = true;
        }
        break;
      }
      case "answer": {
        const result = applyAnswer(state, playerId, msg.choice, now);
        if (!result.ok) {
          this.sendTo(playerId, { type: "error", message: result.reason });
        } else {
          changed = true;
        }
        break;
      }
      case "start": {
        const player = findPlayer(state, playerId);
        if (!player || !player.isHost) {
          this.sendTo(playerId, { type: "error", message: "ホストだけが開始できます。" });
          break;
        }
        const result = startGame(state, now);
        if (!result.ok) {
          this.sendTo(playerId, { type: "error", message: result.reason });
        } else {
          changed = true;
        }
        break;
      }
      case "restart": {
        const player = findPlayer(state, playerId);
        if (!player || !player.isHost) {
          this.sendTo(playerId, { type: "error", message: "ホストだけがリセットできます。" });
          break;
        }
        if (state.phase !== "result") {
          this.sendTo(playerId, { type: "error", message: "ゲーム終了後だけリセットできます。" });
          break;
        }
        resetToLobby(state);
        changed = true;
        break;
      }
      case "ping":
        break;
    }

    if (changed) {
      await this.persist();
      this.broadcast();
    }
    this.schedule();
  }

  // ---------------------------------------------------------------- helpers

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async load(): Promise<GameState> {
    if (!this.state) {
      const stored = await this.ctx.storage.get<GameState>(STORAGE_KEY);
      this.state = stored ?? createRoomState("", 0);
    }
    return this.state;
  }

  private async persist(): Promise<void> {
    if (!this.state) return;
    await this.ctx.storage.put(STORAGE_KEY, this.state);
  }

  /** 次の締切にタイマーを設定する（setTimeout + Durable Object Alarm の二重化） */
  private schedule(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.state) return;
    const deadline = nextDeadline(this.state);
    if (deadline === null) return;
    const delay = Math.max(0, deadline - Date.now());
    this.timer = setTimeout(() => {
      void this.onTimer();
    }, delay + 25);
    this.ctx.storage.setAlarm(deadline).catch(() => undefined);
  }

  private async onTimer(): Promise<void> {
    const state = await this.load();
    if (tick(state, Date.now())) {
      await this.persist();
      this.broadcast();
    }
    this.schedule();
  }

  /** 全プレイヤーに最新の状態を配信する（viewer ごとの情報だけ違う） */
  private broadcast(): void {
    if (!this.state) return;
    const now = Date.now();
    for (const [socket, playerId] of this.sockets) {
      const payload: PublicState = toPublicState(this.state, playerId, now);
      try {
        socket.send(JSON.stringify(payload));
      } catch {
        this.sockets.delete(socket);
      }
    }
  }

  private sendTo(playerId: string, message: unknown): void {
    for (const [socket, pid] of this.sockets) {
      if (pid !== playerId) continue;
      try {
        socket.send(JSON.stringify(message));
      } catch {
        this.sockets.delete(socket);
      }
    }
  }
}

function createToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
