import { QUESTIONS } from '../src/questions';

// 結合テストは本物の wrangler dev（テスト用ポート 8790）に接続する
export const BASE = process.env.QUIZ_URL ?? 'http://127.0.0.1:8790';

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  eliminated: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface View {
  code: string;
  phase: 'lobby' | 'question' | 'reveal' | 'finished';
  you: string;
  serverNow: number;
  hostId: string;
  players: PublicPlayer[];
  canStart: boolean;
  qNo: number;
  total: number;
  question: { text: string; choices: string[] } | null;
  questionEndMs: number | null;
  buzzerId: string | null;
  answerEndMs: number | null;
  canBuzz: boolean;
  canAnswer: boolean;
  reveal: { answer: number; headline: string; untilMs: number } | null;
  notice: string | null;
  ranking: PublicPlayer[] | null;
}

async function postJson(path: string, body: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json()) as Record<string, unknown> };
}

export async function createRoom(name: string) {
  const r = await postJson('/api/rooms', { name });
  if (r.status !== 200) throw new Error(`create failed: ${JSON.stringify(r.data)}`);
  return { code: r.data.code as string, playerId: r.data.playerId as string };
}

export async function joinRoom(code: string, name: string) {
  return postJson(`/api/rooms/${code}/join`, { name });
}

export async function checkMember(code: string, playerId: string) {
  const res = await fetch(`${BASE}/api/rooms/${code}/check?playerId=${playerId}`);
  return { status: res.status, data: (await res.json()) as Record<string, unknown> };
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitUntil<T>(fn: () => T | undefined | null | false, timeoutMs = 5000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v as T;
    if (Date.now() - start > timeoutMs) throw new Error('waitUntil: timeout');
    await sleep(25);
  }
}

/** 1人分の WebSocket 接続。届いた画面情報とエラーを記録する。 */
export class Client {
  ws: WebSocket | null = null;
  last: View | null = null;
  errors: string[] = [];
  closeCode: number | null = null;

  constructor(
    readonly code: string,
    readonly playerId: string,
  ) {}

  async connect(): Promise<void> {
    const wsBase = BASE.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBase}/api/rooms/${this.code}/ws?playerId=${this.playerId}`);
    this.ws = ws;
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.type === 'state') this.last = m.state as View;
      else if (m.type === 'error') this.errors.push(m.message as string);
    });
    ws.addEventListener('close', (ev) => {
      this.closeCode = ev.code;
    });
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', () => reject(new Error('websocket error')), { once: true });
    });
    await waitUntil(() => this.last);
  }

  send(msg: Record<string, unknown>): void {
    this.ws!.send(JSON.stringify(msg));
  }

  close(): void {
    this.ws?.close(1000, 'test');
  }

  async until(pred: (v: View) => boolean, timeoutMs = 5000): Promise<View> {
    return waitUntil(() => this.last && pred(this.last) && this.last, timeoutMs);
  }
}

/** 今の問題の正解番号（テストのために問題文から引く） */
export function correctIndexOf(view: View): number {
  const q = QUESTIONS.find((x) => x.text === view.question!.text);
  if (!q) throw new Error(`unknown question: ${view.question!.text}`);
  return q.answer;
}
