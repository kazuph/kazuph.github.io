// 1部屋 = 1つの Durable Object。状態の保存、WebSocket の配信、Alarm を受け持つ。
import { DurableObject } from "cloudflare:workers";
import * as game from "./game";

const STATE_KEY = "game";
const CODE_KEY = "code";
const NAME_MAX = 12;

async function readName(request: Request): Promise<string | null> {
  const body = await request.json<{ name?: unknown }>().catch((): { name?: unknown } => ({}));
  return cleanName(body.name);
}

const json = (body: unknown, status = 200): Response => Response.json(body, { status });

type ClientMessage =
  | { t: "start" }
  | { t: "buzz"; q: number }
  | { t: "answer"; q: number; choice: number };

function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().slice(0, NAME_MAX);
  return name.length > 0 ? name : null;
}

export class Room extends DurableObject {
  private state: game.GameState | null = null;
  private code = "";

  constructor(ctx: DurableObjectState, env: never) {
    super(ctx, env);
    // Hibernation から起こされたときも、最初のリクエストの前に保存済みの状態を読み込む
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<game.GameState>(STATE_KEY)) ?? null;
      this.code = (await ctx.storage.get<string>(CODE_KEY)) ?? "";
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/create" && request.method === "POST") return this.create(request);
    if (url.pathname === "/join" && request.method === "POST") return this.join(request);
    if (url.pathname === "/me") return this.me(url.searchParams.get("token"));
    if (url.pathname === "/ws") return this.acceptSocket(request, url.searchParams.get("token"));
    return json({ error: "見つかりません" }, 404);
  }

  // ---- HTTP ----

  private async create(request: Request): Promise<Response> {
    if (this.state) return json({ error: "部屋コードが重複しました" }, 409);
    const name = await readName(request);
    if (!name) return json({ error: "名前を入れてください" }, 400);
    const host = this.newPlayer(name);
    this.code = request.headers.get("x-room-code") ?? "";
    await this.ctx.storage.put(CODE_KEY, this.code);
    await this.save(game.createGame(host));
    return json({ code: this.code, playerId: host.id, token: host.token });
  }

  private async join(request: Request): Promise<Response> {
    if (!this.state) return json({ error: "部屋が見つかりません" }, 404);
    const name = await readName(request);
    if (!name) return json({ error: "名前を入れてください" }, 400);
    const player = this.newPlayer(name);
    const result = game.addPlayer(game.tick(this.state, Date.now()), player);
    if (!result.ok) return json({ error: result.error }, 409);
    await this.save(result.state);
    this.broadcast();
    return json({ code: this.code, playerId: player.id, token: player.token });
  }

  /** 保存済みの token がまだ有効かの確認。画面が古い保存を捨てる判断に使う */
  private me(token: string | null): Response {
    if (!this.state) return json({ error: "部屋が見つかりません" }, 404);
    return this.playerByToken(token) ? json({ ok: true }) : json({ error: "token が違います" }, 403);
  }

  private async acceptSocket(request: Request, token: string | null): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return json({ error: "WebSocket が必要です" }, 426);
    if (!this.state) return json({ error: "部屋が見つかりません" }, 404);
    const player = this.playerByToken(token);
    if (!player) return json({ error: "token が違います" }, 403);

    for (const old of this.ctx.getWebSockets(player.id)) old.close(4000, "別の接続に切り替わりました");
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [player.id]);
    await this.refresh(Date.now());
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  // ---- WebSocket ----

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const playerId = this.ctx.getTags(ws)[0];
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      return this.sendError(ws, "メッセージを読めませんでした");
    }
    const now = Date.now();
    const result = this.handle(msg, playerId, now);
    if (result && !result.ok) this.sendError(ws, result.error);
    await this.refresh(now, result?.ok ? result.state : undefined);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcast(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.broadcast(ws);
  }

  async alarm(): Promise<void> {
    await this.refresh(Date.now());
  }

  private handle(msg: ClientMessage, playerId: string, now: number): game.Result | null {
    if (!this.state) return null;
    switch (msg.t) {
      case "start":
        return game.startGame(this.state, playerId, now, game.pickQuestionIds());
      case "buzz":
        return game.buzz(this.state, playerId, msg.q, now);
      case "answer":
        return game.answer(this.state, playerId, msg.q, msg.choice, now);
      default:
        return null;
    }
  }

  // ---- 状態の保存・配信 ----

  /** 時刻を進め（任意で新しい状態を採用し）、保存・Alarm 予約・配信までを行う */
  private async refresh(now: number, next?: game.GameState): Promise<void> {
    if (!this.state) return;
    await this.save(game.tick(next ?? this.state, now));
    this.broadcast();
  }

  private async save(state: game.GameState): Promise<void> {
    this.state = state;
    await this.ctx.storage.put(STATE_KEY, state);
    const due = game.nextDeadline(state);
    if (due === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(due);
  }

  private connectedIds(except?: WebSocket): Set<string> {
    const ids = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== except && ws.readyState === WebSocket.OPEN) ids.add(this.ctx.getTags(ws)[0]);
    }
    return ids;
  }

  private broadcast(except?: WebSocket): void {
    if (!this.state) return;
    const connected = this.connectedIds(except);
    const view = game.toPublic(this.state, connected);
    const serverNow = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except || ws.readyState !== WebSocket.OPEN) continue;
      const you = this.ctx.getTags(ws)[0];
      ws.send(JSON.stringify({ t: "state", code: this.code, ...view, you, serverNow }));
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    ws.send(JSON.stringify({ t: "error", message }));
  }

  private newPlayer(name: string): game.Player {
    return { id: crypto.randomUUID(), name, token: crypto.randomUUID(), score: 0 };
  }

  private playerByToken(token: string | null): game.Player | undefined {
    if (!token || !this.state) return undefined;
    return this.state.players.find((p) => p.token === token);
  }
}
