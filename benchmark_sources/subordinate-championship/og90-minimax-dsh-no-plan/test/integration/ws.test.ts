/**
 * 結合テスト（Node 環境）
 *
 * 実際の `wrangler dev` サーバーを一時的に起動し、WebSocket 経由で
 * 「同時に早押ししても1人だけ回答権になる」「5人目は入れない」
 * 「再接続でスコアが保たれる」などを検証する。
 *
 * - テスト用ポート: 8799（開発サーバー本体は 8787 のまま）
 * - QUIZ_TEST_BASE_URL 環境変数を指定すれば既存のサーバーに対して実行する
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { QUESTIONS } from '../../src/questions';

const PORT = Number(process.env.QUIZ_TEST_PORT || 8799);
const BASE = process.env.QUIZ_TEST_BASE_URL || `http://localhost:${PORT}`;
const WS_BASE = BASE.replace(/^http/, 'ws');

let server: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`開発サーバーが起動しませんでした: ${url}`);
}

beforeAll(async () => {
  console.log('[test] BASE =', JSON.stringify(BASE), 'PORT =', PORT);
  if (process.env.QUIZ_TEST_BASE_URL) {
    await waitForServer(`${BASE}/`);
    return;
  }
  server = spawn(
    'npx',
    ['wrangler', 'dev', '--port', String(PORT), '--inspector-port', String(PORT + 100)],
    { cwd: process.cwd(), stdio: 'ignore' },
  );
  await waitForServer(`${BASE}/`);
}, 90_000);

afterAll(async () => {
  if (server) {
    server.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    if (!server.killed) server.kill('SIGKILL');
  }
});

/** テスト用の薄い WebSocket クライアント */
class Client {
  ws!: WebSocket;
  states: any[] = [];
  errors: { code: string; message: string }[] = [];
  notices: string[] = [];
  closeCode: number | null = null;

  constructor(
    public id: string,
    public name: string,
  ) {}

  async connect(code: string): Promise<void> {
    this.ws = new WebSocket(`${WS_BASE}/api/rooms/${code}/ws`);
    await new Promise<void>((resolve, reject) => {
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({ t: 'join', id: this.id, name: this.name }));
      });
      this.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.t === 'state') this.states.push(msg);
        if (msg.t === 'error') {
          this.errors.push({ code: msg.code, message: msg.message });
          resolve();
        }
        if (msg.t === 'notice') this.notices.push(msg.message);
        if (msg.t === 'state' && msg.players.some((p: any) => p.id === this.id)) resolve();
      });
      this.ws.on('error', reject);
      this.ws.on('close', (code) => {
        this.closeCode = code;
      });
    });
  }

  latest(): any {
    return this.states[this.states.length - 1];
  }

  send(message: unknown): void {
    this.ws.send(JSON.stringify(message));
  }

  /** 次の state メッセージを待つ */
  async waitState(timeoutMs = 5000): Promise<any> {
    const start = this.states.length;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.states.length > start) return this.latest();
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error('state メッセージが時間内に届きませんでした');
  }

  /** 条件を満たす state メッセージを待つ（最新的 state が条件を満たす場合はそれを返す） */
  async waitFor(predicate: (state: any) => boolean, timeoutMs = 8000): Promise<any> {
    const startIndex = this.states.length;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const latest = this.states[this.states.length - 1];
      if (latest && predicate(latest)) return latest;
      for (let i = startIndex; i < this.states.length; i++) {
        if (predicate(this.states[i])) return this.states[i];
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`条件を満たす state が時間内に届きませんでした: ${JSON.stringify(this.latest())}`);
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

async function createRoom(): Promise<string> {
  const res = await fetch(`${BASE}/api/rooms`, { method: 'POST' });
  const data = (await res.json()) as { ok: boolean; code: string };
  expect(data.ok).toBe(true);
  return data.code;
}

async function joinPlayers(code: string, n: number): Promise<Client[]> {
  const clients: Client[] = [];
  for (let i = 0; i < n; i++) {
    const c = new Client(`player-${i + 1}`, `プレイヤー${i + 1}`);
    await c.connect(code);
    clients.push(c);
  }
  return clients;
}

describe('WebSocket 結合テスト', () => {
  it('部屋	code が作られ、参加者全員が同じ状態を見る', async () => {
    const code = await createRoom();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);

    const [a, b] = await joinPlayers(code, 2);
    expect(a.latest().players.map((p: any) => p.name)).toEqual(['プレイヤー1', 'プレイヤー2']);
    expect(b.latest().players).toHaveLength(2);
    expect(a.latest().phase).toBe('lobby');
    expect(a.latest().hostId).toBe('player-1');
    a.close();
    b.close();
  });

  it('5人目は入れず、理由がメッセージで返る', async () => {
    const code = await createRoom();
    const clients = await joinPlayers(code, 4);
    const fifth = new Client('player-5', '5人目');
    await fifth.connect(code);
    await new Promise((r) => setTimeout(r, 300));
    expect(fifth.errors.length).toBeGreaterThan(0);
    expect(fifth.errors[0].code).toBe('room_full');
    expect(fifth.errors[0].message).toContain('4人まで');
    // 4人の状態は変わらない
    expect(clients[0].latest().players).toHaveLength(4);
    clients.forEach((c) => c.close());
  });

  it('ホストだけがゲームを開始できる', async () => {
    const code = await createRoom();
    const [a, b] = await joinPlayers(code, 2);
    b.send({ t: 'start' });
    await new Promise((r) => setTimeout(r, 300));
    expect(b.errors[0]?.code).toBe('not_host');
    expect(a.latest().phase).toBe('lobby');

    a.send({ t: 'start' });
    await a.waitFor((s) => s.phase === 'question');
    expect(a.latest().phase).toBe('question');
    expect(a.latest().question.index).toBe(0);
    expect(a.latest().question.options).toHaveLength(4);
    a.close();
    b.close();
  });

  it('同時に早押ししても回答権はサーバーが最初に受け取った1人だけ', async () => {
    const code = await createRoom();
    const clients = await joinPlayers(code, 4);
    clients[0].send({ t: 'start' });
    await clients[0].waitFor((s) => s.phase === 'question');

    // 4人が同時に送信する
    clients.forEach((c) => c.send({ t: 'buzz' }));
    // 4人分の早押しがすべて処理されるまで待つ
    await clients[0].waitFor((s) => s.players.filter((p: any) => p.isAnswerer || p.queued).length === 4);

    const state = clients[0].latest();
    const answerers = state.players.filter((p: any) => p.isAnswerer);
    expect(answerers).toHaveLength(1);
    expect(state.answererId).toBe(answerers[0].id);
    // 残りは順番待ちになる
    const queued = state.players.filter((p: any) => p.queued);
    expect(queued.length).toBe(3);
    clients.forEach((c) => c.close());
  });

  it('正解は +10 点、不正解は -5 点。順位が全員に配られる', async () => {
    const code = await createRoom();
    const [a, b] = await joinPlayers(code, 2);
    a.send({ t: 'start' });
    await a.waitFor((s) => s.phase === 'question');

    a.send({ t: 'buzz' });
    await a.waitFor((s) => s.answererId === 'player-1');
    expect(a.latest().answererId).toBe('player-1');

    // 1問目の正解を選ぶ
    const correct = correctIndexOfQuestion(0);
    a.send({ t: 'answer', choice: correct });
    await a.waitFor((s) => s.phase === 'reveal');
    expect(a.latest().players[0].score).toBe(10);
    await b.waitFor((s) => s.players[0].score === 10);
    expect(b.latest().players[0].score).toBe(10);
    expect(a.latest().phase).toBe('reveal');
    expect(a.latest().revealCorrectIndex).toBe(correct);
    a.close();
    b.close();
  });

  it('不正解の人はその問題で押せなくなり、次の人が回答権を得る', async () => {
    const code = await createRoom();
    const [a, b] = await joinPlayers(code, 2);
    a.send({ t: 'start' });
    await a.waitFor((s) => s.phase === 'question');

    a.send({ t: 'buzz' });
    await a.waitFor((s) => s.answererId === 'player-1');
    const wrong = (correctIndexOfQuestion(0) + 1) % 4;
    a.send({ t: 'answer', choice: wrong });
    await a.waitFor((s) => s.phase === 'feedback');
    expect(a.latest().players[0].score).toBe(-5);

    // feedback が終わると早押しが再開される
    await b.waitFor((s) => s.phase === 'question');
    b.send({ t: 'buzz' });
    await b.waitFor((s) => s.answererId === 'player-2');
    expect(b.latest().answererId).toBe('player-2');
    // 不正解の人は同じ問題で押せない
    a.send({ t: 'buzz' });
    await new Promise((r) => setTimeout(r, 300));
    expect(a.latest().answererId).toBe('player-2');
    a.close();
    b.close();
  });

  it('切断・再接続しても同じプレイヤーとして点数を保ったまま復帰する', async () => {
    const code = await createRoom();
    const [a, b] = await joinPlayers(code, 2);
    a.send({ t: 'start' });
    await a.waitFor((s) => s.phase === 'question');
    a.send({ t: 'buzz' });
    await a.waitFor((s) => s.answererId === 'player-1');
    a.send({ t: 'answer', choice: correctIndexOfQuestion(0) });
    await a.waitFor((s) => s.players[0].score === 10);
    expect(a.latest().players[0].score).toBe(10);

    // 切断
    a.close();
    await b.waitFor((s) => s.players[0].connected === false);
    expect(b.latest().players[0].connected).toBe(false);
    expect(b.latest().players[0].score).toBe(10);

    // 同じトークンで復帰
    const again = new Client('player-1', 'プレイヤー1');
    await again.connect(code);
    await new Promise((r) => setTimeout(r, 200));
    expect(again.latest().players).toHaveLength(2);
    expect(again.latest().players[0].score).toBe(10);
    expect(again.latest().players[0].connected).toBe(true);
    expect(again.latest().you).toBe('player-1');
    again.close();
    b.close();
  });

  it('問題から20秒たったら正解を表示して次の問題へ進む', async () => {
    const code = await createRoom();
    const [a, b] = await joinPlayers(code, 2);
    a.send({ t: 'start' });
    await a.waitFor((s) => s.phase === 'question');
    expect(a.latest().phase).toBe('question');
    // 誰も押さないまま待つ（20 秒で自動進行）
    await a.waitFor((s) => s.phase === 'reveal', 25_000);
    expect(a.latest().phase).toBe('reveal');
    expect(a.latest().revealCorrectIndex).not.toBeNull();
    await a.waitFor((s) => s.phase === 'question' && s.question.index === 1, 10_000);
    expect(a.latest().phase).toBe('question');
    expect(a.latest().question.index).toBe(1);
    a.close();
    b.close();
  }, 40_000);
});

/** 問題バンク（クライアント側と同じもの）をテストから使う */
function correctIndexOfQuestion(index: number): number {
  return QUESTIONS[index].correct;
}
