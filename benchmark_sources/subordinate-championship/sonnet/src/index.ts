import { DurableObject } from "cloudflare:workers";
import {
  DEFAULT_CONFIG,
  answer,
  buzz,
  disconnect,
  join,
  newGame,
  nextWake,
  snapshot,
  start,
  tick,
  type GameConfig,
  type GameState,
} from "./game";

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
  ASSETS: Fetcher;
  QUESTION_MS?: string;
  ANSWER_MS?: string;
  REVEAL_MS?: string;
  LOBBY_GRACE_MS?: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-Z2-9]{4}$/;

function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function configFrom(env: Env): GameConfig {
  const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return {
    ...DEFAULT_CONFIG,
    questionMs: num(env.QUESTION_MS, DEFAULT_CONFIG.questionMs),
    answerMs: num(env.ANSWER_MS, DEFAULT_CONFIG.answerMs),
    revealMs: num(env.REVEAL_MS, DEFAULT_CONFIG.revealMs),
    lobbyGraceMs: num(env.LOBBY_GRACE_MS, DEFAULT_CONFIG.lobbyGraceMs),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      // 部屋コードの重複は Durable Object 側で「先に取った方が勝ち」にして防ぐ。
      for (let i = 0; i < 10; i++) {
        const code = makeCode();
        const res = await env.ROOM.get(env.ROOM.idFromName(code)).fetch("https://room/claim", { method: "POST" });
        if (res.status === 200) return Response.json({ code });
      }
      return Response.json({ error: "部屋コードを作れませんでした。もう一度お試しください" }, { status: 503 });
    }

    const m = url.pathname.match(/^\/ws\/([^/]+)$/);
    if (m) {
      if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket が必要です", { status: 426 });
      const code = decodeURIComponent(m[1]).trim().toUpperCase();
      if (!CODE_RE.test(code)) return new Response("部屋コードの形式が正しくありません", { status: 400 });
      return env.ROOM.get(env.ROOM.idFromName(code)).fetch(new Request("https://room/ws?code=" + code, request));
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

interface Attachment {
  pid?: string;
}

/**
 * 1部屋 = 1 Durable Object。部屋の状態を持てるのは単一スレッドの1インスタンスだけなので、
 * 「同時に押されても処理順が1つに決まる」ことがここで保証される。
 * 状態は毎回ストレージに保存し、タイマーはアラームで動かす（休止・再起動しても進行が止まらない）。
 */
export class Room extends DurableObject<Env> {
  private g: GameState | null = null;
  private claimed = false;
  private cfg: GameConfig;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.cfg = configFrom(env);
    ctx.blockConcurrencyWhile(async () => {
      this.claimed = (await ctx.storage.get<boolean>("claimed")) ?? false;
      this.g = (await ctx.storage.get<GameState>("game")) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/claim") {
      if (this.claimed) return new Response("taken", { status: 409 });
      this.claimed = true;
      await this.ctx.storage.put("claimed", true);
      return new Response("ok");
    }
    if (url.pathname === "/ws") {
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      pair[1].serializeAttachment({} satisfies Attachment);
      const code = url.searchParams.get("code")!;
      if (!this.claimed) {
        pair[1].send(JSON.stringify({ t: "error", code: "ROOM_NOT_FOUND", message: `部屋コード「${code}」の部屋は見つかりません`, fatal: true }));
        pair[1].close(4004, "room not found");
      } else if (!this.g) {
        this.g = newGame(code);
      }
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let msg: any;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      return this.sendError(ws, "BAD_JSON", "メッセージが読めません");
    }
    if (!this.g || !this.claimed) return;
    const g = this.g;
    const now = Date.now();
    const att = (ws.deserializeAttachment() ?? {}) as Attachment;

    if (msg.t === "ping") {
      ws.send(JSON.stringify({ t: "pong", now, id: msg.id }));
      return;
    }

    tick(g, this.cfg, now);

    if (msg.t === "hello") {
      const r = join(g, this.cfg, now, msg.name, msg.token);
      if (!r.ok) {
        await this.commit(now);
        this.sendError(ws, r.code, r.message, true);
        ws.close(4001, r.code);
        return;
      }
      // 同じプレイヤーの古い接続は閉じる（再読み込み直後の二重接続対策）
      for (const other of this.ctx.getWebSockets()) {
        if (other !== ws && ((other.deserializeAttachment() ?? {}) as Attachment).pid === r.player.id) other.close(4000, "replaced");
      }
      ws.serializeAttachment({ pid: r.player.id } satisfies Attachment);
      ws.send(JSON.stringify({ t: "welcome", playerId: r.player.id, token: r.player.token, resumed: r.resumed }));
      await this.commit(now);
      return;
    }

    const pid = att.pid;
    if (!pid) return this.sendError(ws, "NO_HELLO", "先に部屋へ参加してください");

    let res;
    if (msg.t === "start") res = start(g, this.cfg, now, pid);
    else if (msg.t === "buzz") res = buzz(g, this.cfg, now, pid);
    else if (msg.t === "answer") res = answer(g, this.cfg, now, pid, msg.choice);
    else return this.sendError(ws, "UNKNOWN", "不明な操作です");

    await this.commit(now);
    if (!res.ok) this.sendError(ws, res.code, res.message);
  }

  async webSocketClose(ws: WebSocket) {
    await this.onGone(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.onGone(ws);
  }

  private async onGone(ws: WebSocket) {
    const pid = ((ws.deserializeAttachment() ?? {}) as Attachment).pid;
    if (!pid || !this.g) return;
    const stillOpen = this.ctx.getWebSockets().some((o) => o !== ws && o.readyState === WebSocket.OPEN && ((o.deserializeAttachment() ?? {}) as Attachment).pid === pid);
    if (stillOpen) return;
    const now = Date.now();
    tick(this.g, this.cfg, now);
    disconnect(this.g, now, pid);
    await this.commit(now);
  }

  async alarm() {
    if (!this.g) return;
    await this.commit(Date.now());
  }

  /** 時間経過を反映 → 保存 → 次のアラームを予約 → 全員へ最新状態を配信。 */
  private async commit(now: number) {
    const g = this.g!;
    tick(g, this.cfg, now);
    await this.ctx.storage.put("game", g);
    const wake = nextWake(g, this.cfg);
    if (wake === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(wake, now + 1));
    this.broadcast(now);
  }

  private broadcast(now: number) {
    const g = this.g!;
    for (const ws of this.ctx.getWebSockets()) {
      const pid = ((ws.deserializeAttachment() ?? {}) as Attachment).pid;
      if (!pid || ws.readyState !== WebSocket.OPEN) continue;
      ws.send(JSON.stringify(snapshot(g, this.cfg, now, pid)));
    }
  }

  private sendError(ws: WebSocket, code: string, message: string, fatal = false) {
    try {
      ws.send(JSON.stringify({ t: "error", code, message, fatal }));
    } catch {}
  }
}
