// 1部屋 = 1つの Durable Object。状態は SQLite 版のストレージに保存し、
// WebSocket は Hibernation API で受ける。締め切りは Alarm で進める。
import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";
import {
  applyAction,
  createGame,
  joinGame,
  nextAlarmAt,
  parseAction,
  setConnected,
  tick,
  viewFor,
  type GameState,
  type Player,
} from "./game";
import { QUESTIONS } from "./questions";

const json = (body: unknown, status = 200) => Response.json(body, { status });

function newPlayer(name: string): Player {
  return { id: crypto.randomUUID(), name, token: randomHex(16), score: 0, connected: true };
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

// 内蔵問題から10問を、暗号学的乱数でシャッフルして選ぶ
function pickQuestionIds(count: number): number[] {
  const ids = QUESTIONS.map((_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, count);
}

export class Room extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/init") return this.init(request);
    if (request.method === "POST" && url.pathname === "/join") return this.join(request);
    if (request.method === "GET" && url.pathname === "/me") return this.me(url);
    if (request.method === "GET" && url.pathname === "/ws") return this.openSocket(request, url);
    return json({ error: "見つかりません" }, 404);
  }

  private async init(request: Request): Promise<Response> {
    const body = (await request.json()) as { code: string; name: string };
    if (await this.load()) return json({ error: "部屋コードが重複しました" }, 409);
    const host = newPlayer(body.name);
    const state = createGame(body.code, host, pickQuestionIds(10));
    await this.save(state);
    return json({ code: body.code, playerId: host.id, token: host.token });
  }

  private async join(request: Request): Promise<Response> {
    const body = (await request.json()) as { name: string };
    const before = await this.load();
    if (!before) return json({ error: "部屋が見つかりません" }, 404);
    const now = Date.now();
    const player = newPlayer(body.name);
    const step = joinGame(tick(before, now), player);
    if (step.error) return json({ error: step.error }, 409);
    await this.commit(step.state, now);
    return json({ code: step.state.code, playerId: player.id, token: player.token });
  }

  private async me(url: URL): Promise<Response> {
    const state = await this.load();
    if (!state) return json({ error: "部屋が見つかりません" }, 404);
    const player = findByToken(state, url.searchParams.get("token"));
    if (!player) return json({ error: "参加情報が見つかりません" }, 403);
    return json({ playerId: player.id, name: player.name });
  }

  private async openSocket(request: Request, url: URL): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return json({ error: "WebSocketで接続してください" }, 426);
    const state = await this.load();
    if (!state) return json({ error: "部屋が見つかりません" }, 404);
    const player = findByToken(state, url.searchParams.get("token"));
    if (!player) return json({ error: "参加情報が見つかりません" }, 403);

    // 同じ人の古い接続は閉じる（再読み込みで二重になるのを防ぐ）
    for (const old of this.ctx.getWebSockets(player.id)) {
      old.close(4000, "別の画面で開かれました");
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server, [player.id]);
    const now = Date.now();
    await this.commit(setConnected(tick(state, now), player.id, true), now);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const playerId = this.ctx.getTags(ws)[0];
    const state = await this.load();
    if (!playerId || !state) return;
    let raw: unknown;
    try {
      raw = JSON.parse(String(message));
    } catch {
      raw = null;
    }
    const action = parseAction(raw);
    if (!action) {
      ws.send(JSON.stringify({ t: "error", message: "メッセージが正しくありません" }));
      return;
    }
    const now = Date.now();
    const step = applyAction(state, playerId, action, now);
    await this.commit(step.state, now);
    if (step.error) ws.send(JSON.stringify({ t: "error", message: step.error }));
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    await this.disconnected(ws, code);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.disconnected(ws, 1011);
  }

  async alarm(): Promise<void> {
    const state = await this.load();
    if (!state) return;
    const now = Date.now();
    await this.commit(tick(state, now), now);
  }

  private async disconnected(ws: WebSocket, code: number): Promise<void> {
    const playerId = this.ctx.getTags(ws)[0];
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, "closed");
    } catch {
      // 既に閉じている接続は何もしない
    }
    if (!playerId) return;
    const others = this.ctx.getWebSockets(playerId).filter((other) => other !== ws);
    if (others.length > 0) return;
    const state = await this.load();
    if (!state) return;
    const now = Date.now();
    await this.commit(setConnected(tick(state, now), playerId, false), now);
  }

  private async load(): Promise<GameState | undefined> {
    return this.ctx.storage.get<GameState>("game");
  }

  private async save(state: GameState): Promise<void> {
    await this.ctx.storage.put("game", state);
  }

  // 保存 → 全員へ配信 → 次の締め切りの Alarm を1つだけ予約
  private async commit(state: GameState, now: number): Promise<void> {
    await this.save(state);
    for (const ws of this.ctx.getWebSockets()) {
      const playerId = this.ctx.getTags(ws)[0];
      if (!playerId) continue;
      try {
        ws.send(JSON.stringify(viewFor(state, playerId, now)));
      } catch {
        // 閉じかけの接続には送らない（閉じ終われば close の処理で席の状態を直す）
      }
    }
    const next = nextAlarmAt(state);
    if (next === null) {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(next);
    }
  }
}

function findByToken(state: GameState, token: string | null): Player | undefined {
  if (!token) return undefined;
  return state.players.find((p) => p.token === token);
}
