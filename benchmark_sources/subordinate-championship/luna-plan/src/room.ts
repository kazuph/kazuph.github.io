import {
  addPlayer,
  answer,
  buzz,
  createLobby,
  publicState,
  startGame,
  tick,
  QUESTION_LIMIT,
  type GameState,
} from './game';
import { QUESTIONS } from './questions';
import { DurableObject } from 'cloudflare:workers';

type Env = Record<string, never>;
type SocketAttachment = { playerId: string };

export class Room extends DurableObject<Env> {
  private readonly state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    super(state, _env);
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/internal/create' && request.method === 'POST') return this.create(request);
    if (url.pathname === '/internal/join' && request.method === 'POST') return this.join(request);
    if (url.pathname === '/ws' && request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      return this.acceptConnection(url);
    }
    return json({ error: '見つかりません' }, 404);
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null;
    const state = await this.loadState();
    if (!state || !attachment?.playerId) return;

    let event: Record<string, unknown>;
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid event');
      event = parsed as Record<string, unknown>;
    } catch {
      this.sendError(socket, 'メッセージを読み取れませんでした');
      return;
    }

    const now = Date.now();
    let next = tick(state, now);
    if (next !== state) await this.saveAndBroadcast(next, now);
    const playerId = attachment.playerId;
    if (event.t === 'start') {
      const result = startGame(next, playerId, now, this.questionOrder());
      if (!result.ok) return this.sendError(socket, result.error);
      next = result.state;
    } else if (event.t === 'buzz' && isInteger(event.q)) {
      const result = buzz(next, playerId, event.q, now);
      if (!result.ok) return this.sendError(socket, result.error);
      next = result.state;
    } else if (event.t === 'answer' && isInteger(event.q) && isInteger(event.choice)) {
      const question = QUESTIONS[next.questionOrder[next.questionIndex]];
      if (!question) return this.sendError(socket, '問題が見つかりません');
      const result = answer(next, playerId, event.q, event.choice, now, question.answer);
      if (!result.ok) return this.sendError(socket, result.error);
      next = result.state;
    } else {
      return this.sendError(socket, '操作を読み取れませんでした');
    }
    await this.saveAndBroadcast(next, now);
  }

  async webSocketClose(socket: WebSocket, _code?: number, _reason?: string, _wasClean?: boolean): Promise<void> {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null;
    if (!attachment?.playerId) return;
    const state = await this.loadState();
    if (!state?.players[attachment.playerId]) return;
    const stillConnected = this.state.getWebSockets().some((candidate) => {
      const current = candidate.deserializeAttachment() as SocketAttachment | null;
      return current?.playerId === attachment.playerId && candidate.readyState === WebSocket.OPEN;
    });
    const next = {
      ...state,
      players: {
        ...state.players,
        [attachment.playerId]: { ...state.players[attachment.playerId], connected: stillConnected },
      },
    };
    await this.saveAndBroadcast(next, Date.now());
  }

  async webSocketError(socket: WebSocket, _error: unknown): Promise<void> {
    await this.webSocketClose(socket);
  }

  async alarm(): Promise<void> {
    const state = await this.loadState();
    if (!state) return;
    const now = Date.now();
    await this.saveAndBroadcast(tick(state, now), now);
  }

  private async create(request: Request): Promise<Response> {
    if (await this.loadState()) return json({ error: '部屋コードが重複しました' }, 409);
    const body = await readBody(request);
    if (!body || typeof body.code !== 'string' || !isPlayer(body.player)) {
      return json({ error: '部屋を作成できませんでした' }, 400);
    }
    const state = createLobby(body.code, body.player, Date.now());
    await this.saveAndBroadcast(state, Date.now());
    return json({ ok: true }, 201);
  }

  private async join(request: Request): Promise<Response> {
    const state = await this.loadState();
    if (!state) return json({ error: '部屋が見つかりません' }, 404);
    const body = await readBody(request);
    if (!body || !isPlayer(body)) return json({ error: '名前を入力してください' }, 400);
    const result = addPlayer(state, body);
    if (!result.ok) return json({ error: result.error }, 409);
    await this.saveAndBroadcast(result.state, Date.now());
    return json({ ok: true }, 201);
  }

  private async acceptConnection(url: URL): Promise<Response> {
    const savedState = await this.loadState();
    if (!savedState) return json({ error: '部屋が見つかりません' }, 404);
    const token = url.searchParams.get('token');
    const player = Object.values(savedState.players).find((candidate) => candidate.token === token);
    if (!player) return json({ error: '参加情報を確認できません' }, 403);

    for (const existing of this.state.getWebSockets()) {
      const attachment = existing.deserializeAttachment() as SocketAttachment | null;
      if (attachment?.playerId === player.id && existing.readyState === WebSocket.OPEN) {
        existing.close(4001, 'このプレイヤーは別の接続で再参加しました');
      }
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.serializeAttachment({ playerId: player.id } satisfies SocketAttachment);
    this.state.acceptWebSocket(server);
    const state = tick(savedState, Date.now());
    const connectedState = {
      ...state,
      players: { ...state.players, [player.id]: { ...player, connected: true } },
    };
    await this.saveAndBroadcast(connectedState, Date.now());
    return new Response(null, { status: 101, webSocket: client });
  }

  private async saveAndBroadcast(state: GameState, now: number): Promise<void> {
    await this.state.storage.put('state', state);
    const deadline = nextDeadline(state);
    if (deadline === null) await this.state.storage.deleteAlarm();
    else await this.state.storage.setAlarm(new Date(deadline));

    const sockets = this.state.getWebSockets();
    for (const socket of sockets) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const attachment = socket.deserializeAttachment() as SocketAttachment | null;
      if (!attachment?.playerId) continue;
      socket.send(JSON.stringify(publicState(state, attachment.playerId, now)));
    }
  }

  private async loadState(): Promise<GameState | undefined> {
    return this.state.storage.get<GameState>('state');
  }

  private questionOrder(): number[] {
    const order = Array.from({ length: QUESTIONS.length }, (_, index) => index);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const random = crypto.getRandomValues(new Uint32Array(1))[0];
      const swapIndex = random % (index + 1);
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    }
    return order.slice(0, QUESTION_LIMIT);
  }

  private sendError(socket: WebSocket, message: string): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ t: 'error', message }));
  }
}

function nextDeadline(state: GameState): number | null {
  if (state.phase === 'answering') return state.answerDeadline;
  if (state.phase === 'question') return state.questionDeadline;
  if (state.phase === 'reveal') return state.revealUntil;
  return null;
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isPlayer(value: unknown): value is { id: string; name: string; token: string } {
  if (!value || typeof value !== 'object') return false;
  const player = value as Record<string, unknown>;
  return typeof player.id === 'string' && typeof player.name === 'string' && typeof player.token === 'string';
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}
