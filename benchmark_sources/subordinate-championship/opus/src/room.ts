// 1部屋 = 1 Durable Object。全プレイヤーの WebSocket をこのインスタンスが持ち、
// メッセージは1本ずつ順番に処理されるので「最初に受け取った早押し」が一意に決まる。
import { DurableObject } from "cloudflare:workers";
import {
  addPlayer,
  answer,
  backToLobby,
  buzz,
  createRoom,
  ERROR_MESSAGES,
  type GameError,
  nextDeadline,
  normalizeName,
  removePlayer,
  type Result,
  type RoomState,
  type Rng,
  startGame,
  tick,
  toPublic,
} from "./game";

export type ClientMessage =
  | { t: "ping"; c: number }
  | { t: "start" }
  | { t: "buzz" }
  | { t: "answer"; choice: number }
  | { t: "leave" }
  | { t: "lobby" };

export type ServerMessage =
  | { t: "state"; state: ReturnType<typeof toPublic>; serverNow: number }
  | { t: "pong"; c: number; s: number }
  | { t: "error"; code: string; message: string }
  | { t: "left" };

export type JoinResult =
  | { ok: true; playerId: string; token: string; code: string }
  | { ok: false; error: GameError | "room_not_found"; message: string };

interface Attachment {
  playerId: string;
}

/** 閉じた接続はこの番号で閉じる。クライアントは保存した参加情報を捨ててトップへ戻る。 */
export const CLOSE_INVALID_SESSION = 4001;
export const CLOSE_LEFT = 4002;

function randomId(bytes = 9): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/[+/=]/g, (c) => (c === "+" ? "-" : c === "/" ? "_" : ""));
}

const cryptoRng: Rng = () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! / 2 ** 32;
};

export class Room extends DurableObject<Env> {
  private state: RoomState | null = null;
  /** テストから乱数を差し替えるための口。通常は暗号論的乱数。 */
  rng: Rng = cryptoRng;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Hibernation から起きたときもストレージから状態を戻す
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<RoomState>("state")) ?? null;
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"hb"}', '{"t":"hb"}'));
  }

  async create(code: string, rawName: unknown): Promise<JoinResult> {
    if (this.state) return { ok: false, error: "already_started", message: "部屋コードが重複しました" };
    const name = normalizeName(rawName);
    if (!name) return { ok: false, error: "invalid_name", message: ERROR_MESSAGES.invalid_name };
    const host = { id: randomId(), token: randomId(18), name };
    this.state = createRoom(code, host, Date.now());
    await this.persist();
    return { ok: true, playerId: host.id, token: host.token, code };
  }

  async join(rawName: unknown): Promise<JoinResult> {
    if (!this.state) return { ok: false, error: "room_not_found", message: ERROR_MESSAGES.room_not_found };
    const name = normalizeName(rawName);
    if (!name) return { ok: false, error: "invalid_name", message: ERROR_MESSAGES.invalid_name };
    const p = { id: randomId(), token: randomId(18), name };
    const res = addPlayer(this.state, p, Date.now());
    if (!res.ok) return { ok: false, error: res.error, message: ERROR_MESSAGES[res.error] };
    await this.commit();
    return { ok: true, playerId: p.id, token: p.token, code: this.state.code };
  }

  async info(): Promise<{ exists: boolean; phase?: string; players?: number }> {
    if (!this.state) return { exists: false };
    return { exists: true, phase: this.state.phase, players: this.state.players.length };
  }

  /** WebSocket 接続。playerId と token が一致した人だけを受け入れる。 */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const url = new URL(request.url);
    const pid = url.searchParams.get("pid") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const player = this.state?.players.find((p) => p.id === pid && p.token === token);
    if (!this.state || !player) {
      server.accept();
      const msg = this.state ? ERROR_MESSAGES.not_player : ERROR_MESSAGES.room_not_found;
      server.send(JSON.stringify({ t: "error", code: "invalid_session", message: msg } satisfies ServerMessage));
      server.close(CLOSE_INVALID_SESSION, "invalid session");
      return new Response(null, { status: 101, webSocket: client });
    }
    this.ctx.acceptWebSocket(server, [player.id]);
    server.serializeAttachment({ playerId: player.id } satisfies Attachment);
    // 期限切れが溜まっていれば先に進めてから、全員に「接続した」を知らせる
    this.advance();
    this.broadcast();
    await this.persist();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (!att || !this.state) return;
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      return this.sendError(ws, "bad_request");
    }
    const now = Date.now();
    if (msg.t === "ping") {
      ws.send(JSON.stringify({ t: "pong", c: msg.c, s: now } satisfies ServerMessage));
      return;
    }
    // 期限が過ぎているのにアラームがまだ来ていない瞬間の操作も、先に時間を進めてから判定する
    this.advance(now);
    let res: Result<unknown>;
    switch (msg.t) {
      case "start":
        res = startGame(this.state, att.playerId, now, this.rng);
        break;
      case "buzz":
        res = buzz(this.state, att.playerId, now);
        break;
      case "answer":
        res = answer(this.state, att.playerId, msg.choice, now);
        break;
      case "lobby":
        res = backToLobby(this.state, att.playerId);
        break;
      case "leave":
        res = removePlayer(this.state, att.playerId);
        if (res.ok) {
          for (const s of this.ctx.getWebSockets(att.playerId)) {
            s.send(JSON.stringify({ t: "left" } satisfies ServerMessage));
            s.close(CLOSE_LEFT, "left");
          }
        }
        break;
      default:
        return this.sendError(ws, "bad_request");
    }
    if (!res.ok) {
      this.sendError(ws, res.error);
      // 失敗でも時間経過で状態が変わっていることがあるので配り直す
    }
    await this.commit();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    // 切断はプレイヤーを消さない（再接続で同じ人として戻れる）。在席表示だけ更新する。
    this.broadcast(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.broadcast(ws);
  }

  async alarm(): Promise<void> {
    if (!this.state) return;
    await this.commit();
  }

  private sendError(ws: WebSocket, code: GameError | "bad_request") {
    ws.send(JSON.stringify({ t: "error", code, message: ERROR_MESSAGES[code] } satisfies ServerMessage));
  }

  private advance(now = Date.now()): boolean {
    if (!this.state) return false;
    const changed = tick(this.state, now);
    if (changed) this.state.rev++;
    return changed;
  }

  /** 時間を進め、保存し、全員に配り、次の期限にアラームを合わせる。 */
  private async commit(): Promise<void> {
    if (!this.state) return;
    this.advance();
    this.state.rev++;
    await this.persist();
    this.broadcast();
  }

  private async persist(): Promise<void> {
    if (!this.state) return;
    await this.ctx.storage.put("state", this.state);
    const deadline = nextDeadline(this.state);
    if (deadline === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(deadline);
  }

  private broadcast(closing?: WebSocket): void {
    if (!this.state) return;
    const sockets = this.ctx.getWebSockets().filter((s) => s !== closing && s.readyState === WebSocket.OPEN);
    const online = new Set(sockets.map((s) => (s.deserializeAttachment() as Attachment | null)?.playerId));
    const payload = JSON.stringify({
      t: "state",
      state: toPublic(this.state, (id) => online.has(id)),
      serverNow: Date.now(),
    } satisfies ServerMessage);
    for (const s of sockets) {
      try {
        s.send(payload);
      } catch {
        // 送れない接続は close イベントで片付く
      }
    }
  }

  // ---- テスト専用の覗き窓 ----
  async debugState(): Promise<RoomState | null> {
    return this.state;
  }
}
