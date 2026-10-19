import {
  GameState,
  QUESTION_COUNT,
  addPlayer,
  buzz,
  createState,
  nextDeadline,
  publicState,
  setConnected,
  startGame,
  submitAnswer,
  tick,
} from "./game";
import { QUESTIONS, pickQuestionIndices } from "./questions";

const PLAYER_TAG_PREFIX = "player:";
const TOKEN_PREFIX = "token:";
/** この秒数 ping がない接続は回線が切れたものとして扱う */
const STALE_MS = 3500;
const PING_INTERVAL_MS = 1200;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function readName(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const name = (body as { name?: unknown }).name;
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) return null;
  return trimmed;
}

/**
 * 1部屋 = 1つの Durable Object。
 * 状態は SQLite ストレージに保存し、WebSocket は Hibernation API で受け付ける。
 * token → player の対応もストレージに永続化するので、休止から復帰しても再接続できる。
 * 時刻まわりの締め切りは Alarm で起こされる。
 */
export class Room implements DurableObject {
  private state: GameState | null = null;
  /** 最後に ping/メッセージを受けた時刻（メモリ上のみ。復帰後は ping で即座に正しくなる） */
  private lastSeen = new Map<string, number>();

  constructor(
    private ctx: DurableObjectState,
    private env: { ROOM: DurableObjectNamespace }
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/create") return this.handleCreate(request);
    if (url.pathname === "/join") return this.handleJoin(request);
    if (url.pathname === "/check") return this.handleCheck(url);
    if ((request.headers.get("Upgrade") ?? "").toLowerCase() === "websocket") {
      return this.handleWebSocket(request, url);
    }
    return json({ error: "not found" }, 404);
  }

  private async load(): Promise<GameState | null> {
    if (this.state) return this.state;
    this.state = (await this.ctx.storage.get<GameState>("state")) ?? null;
    return this.state;
  }

  private async commit(): Promise<void> {
    if (!this.state) return;
    await this.ctx.storage.put("state", this.state);
    await this.syncAlarm();
    this.broadcast();
  }

  private async syncAlarm(): Promise<void> {
    if (!this.state) return;
    const now = Date.now();
    let alarmTime = nextDeadline(this.state);
    // 生きている接続がいるうちは、ping が止まった人の掃除用アラームも組む
    const connected = this.state.players.filter((p) => p.connected);
    if (connected.length > 0) {
      const oldest = Math.min(
        ...connected.map((p) => {
          const seen = this.lastSeen.get(p.id);
          return seen !== undefined ? seen : now;
        })
      );
      const sweepAt = oldest + STALE_MS + 10;
      alarmTime = alarmTime === null ? sweepAt : Math.min(alarmTime, sweepAt);
    }
    if (alarmTime !== null) {
      await this.ctx.storage.setAlarm(alarmTime);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  private async handleCreate(request: Request): Promise<Response> {
    const name = readName(await request.json().catch(() => null));
    if (!name) return json({ error: "名前は1〜20文字で入力してください" }, 400);
    const existing = await this.load();
    if (existing && existing.players.length > 0) {
      return json({ error: "この部屋はすでに使われています" }, 409);
    }
    const code = new URL(request.url).searchParams.get("code") ?? "";
    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    this.state = createState(code, playerId, name);
    await this.ctx.storage.put(TOKEN_PREFIX + token, playerId);
    await this.commit();
    return json({ code, playerId, token });
  }

  private async handleJoin(request: Request): Promise<Response> {
    const name = readName(await request.json().catch(() => null));
    if (!name) return json({ error: "名前は1〜20文字で入力してください" }, 400);
    const state = await this.load();
    if (!state) return json({ error: "部屋が見つかりません" }, 404);
    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const result = addPlayer(state, playerId, name);
    if (result.error) return json({ error: result.error }, 409);
    this.state = result.state;
    await this.ctx.storage.put(TOKEN_PREFIX + token, playerId);
    await this.commit();
    return json({ code: this.state.code, playerId, token });
  }

  /** ブラウザが保存した token がまだ有効かを確かめるための窓口 */
  private async handleCheck(url: URL): Promise<Response> {
    const token = url.searchParams.get("token");
    const state = await this.load();
    if (!state || !token) return json({ error: "token が違います" }, 403);
    const playerId = await this.ctx.storage.get<string>(TOKEN_PREFIX + token);
    if (!playerId || !state.players.some((p) => p.id === playerId)) {
      return json({ error: "token が違います" }, 403);
    }
    return json({ ok: true });
  }

  private async playerIdByToken(token: string | null): Promise<string | null> {
    if (!token) return null;
    return (await this.ctx.storage.get<string>(TOKEN_PREFIX + token)) ?? null;
  }

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    const state = await this.load();
    if (!state) return json({ error: "部屋が見つかりません" }, 404);
    const token = url.searchParams.get("token");
    const playerId = await this.playerIdByToken(token);
    if (!playerId || !state.players.some((p) => p.id === playerId)) {
      return json({ error: "token が違います" }, 403);
    }

    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [PLAYER_TAG_PREFIX + playerId]);
    // 同じプレイヤーの古い接続は閉じる（再読み込み・二重起動への対応）
    for (const ws of this.ctx.getWebSockets(PLAYER_TAG_PREFIX + playerId)) {
      if (ws !== pair[1]) {
        try {
          ws.close(4001, "replaced");
        } catch {
          // すでに閉じていてもかまわない
        }
      }
    }
    this.lastSeen.set(playerId, Date.now());
    this.state = setConnected(state, playerId, true);
    await this.commit();
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  private playerIdOf(ws: WebSocket): string | null {
    for (const tag of this.ctx.getTags(ws)) {
      if (tag.startsWith(PLAYER_TAG_PREFIX)) return tag.slice(PLAYER_TAG_PREFIX.length);
    }
    return null;
  }

  /** 全員に全量の状態を配る。token は絶対に送らない */
  private broadcast(): void {
    if (!this.state) return;
    const serverNow = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const playerId = this.playerIdOf(ws);
      if (!playerId) continue;
      ws.send(JSON.stringify(publicState(this.state, playerId, serverNow, QUESTIONS)));
    }
  }

  private sendTo(ws: WebSocket, message: unknown): void {
    ws.send(JSON.stringify(message));
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    console.log("DBG[" + (this.state?.code ?? "?") + "] msg", (typeof message === "string" ? JSON.stringify(JSON.parse(message).t) : "bin"), "now:", Date.now() % 1000000);
    const state = await this.load();
    if (!state) return;
    let msg: { t?: string; q?: unknown; choice?: unknown };
    try {
      msg = typeof message === "string" ? JSON.parse(message) : {};
    } catch {
      this.sendTo(ws, { t: "error", message: "不正なメッセージ" });
      return;
    }
    const playerId = this.playerIdOf(ws);
    const now = Date.now();
    // まず締め切りを過ぎた処理をまとめて進めてから入力を処理する
    const afterTick = tick(state, now);
    this.state = afterTick;

    if (msg.t === "ping") {
      // 生存確認。返事は個人宛てにだけ送る。回線が切れたらこの ping が止まり、
      // alarm の掃除で「接続が切れています」になる。戻れば connected を立て直す
      this.lastSeen.set(playerId ?? "", now);
      const player = this.state.players.find((p) => p.id === playerId);
      this.sendTo(ws, { t: "pong", serverNow: now });
      if (player && !player.connected) {
        this.state = setConnected(this.state, playerId!, true);
        await this.commit();
      } else {
        await this.syncAlarm();
      }
      return;
    }

    if (msg.t === "start") {
      const picked = pickQuestionIndices(QUESTION_COUNT);
      const result = startGame(afterTick, playerId ?? "", now, picked.indices, picked.correctChoices);
      if (result.error) {
        this.sendTo(ws, { t: "error", message: result.error });
        return;
      }
      this.state = result.state;
    } else if (msg.t === "buzz") {
      const result = buzz(afterTick, playerId ?? "", Number(msg.q), now);
      if (result.error) {
        this.sendTo(ws, { t: "error", message: result.error });
        return;
      }
      this.state = result.state;
    } else if (msg.t === "answer") {
      const result = submitAnswer(afterTick, playerId ?? "", Number(msg.q), Number(msg.choice), now);
      if (result.error) {
        this.sendTo(ws, { t: "error", message: result.error });
        return;
      }
      this.state = result.state;
    } else {
      this.sendTo(ws, { t: "error", message: "不明なメッセージ" });
      return;
    }
    await this.commit();
  }

  private async handleDisconnect(ws: WebSocket): Promise<void> {
    const state = await this.load();
    const playerId = this.playerIdOf(ws);
    if (!state || !playerId) return;
    // 同じプレイヤーの別の生きた接続が残っていれば切断扱いにしない
    for (const other of this.ctx.getWebSockets(PLAYER_TAG_PREFIX + playerId)) {
      if (other !== ws) return;
    }
    this.state = setConnected(state, playerId, false);
    await this.commit();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleDisconnect(ws);
  }

  async alarm(): Promise<void> {
    const state = await this.load();
    if (!state) return;
    console.log("DBG[" + state.code + "] alarm fired phase:", state.phase, "now:", Date.now() % 1000000, "deadline:", state.deadline ? state.deadline % 1000000 : null, "revealUntil:", state.revealUntil ? state.revealUntil % 1000000 : null);
    const now = Date.now();
    let next = tick(state, now);
    // ping が止まった人は切断扱いにする
    let changed = false;
    next = {
      ...next,
      players: next.players.map((p) => {
        if (p.connected && this.ctx.getWebSockets(PLAYER_TAG_PREFIX + p.id).length === 0) {
          changed = true;
          return { ...p, connected: false };
        }
        const seen = this.lastSeen.get(p.id) ?? now;
        if (p.connected && now - seen > STALE_MS) {
          changed = true;
          return { ...p, connected: false };
        }
        return p;
      }),
    };
    this.state = next;
    await this.commit();
  }
}
