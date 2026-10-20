import { describe, expect, it, afterEach } from 'vitest';
import { Client, checkMember, correctIndexOf, createRoom, joinRoom, sleep, waitUntil, type View } from './helpers';

// 結合テスト：本物の wrangler dev（Durable Object + WebSocket）に対して確かめる
const open: Client[] = [];
afterEach(() => {
  while (open.length) open.pop()!.close();
});

async function connectPlayer(code: string, playerId: string): Promise<Client> {
  const c = new Client(code, playerId);
  await c.connect();
  open.push(c);
  return c;
}

/** 部屋を作り、人数ぶんの参加者を入れて全員つなぐ。1人目がホスト。 */
async function roomWith(n: number) {
  const host = await createRoom('ホスト');
  const clients = [await connectPlayer(host.code, host.playerId)];
  for (let i = 2; i <= n; i++) {
    const j = await joinRoom(host.code, `プレイヤー${i}`);
    expect(j.status).toBe(200);
    clients.push(await connectPlayer(host.code, j.data.playerId as string));
  }
  for (const c of clients) await c.until((v) => v.players.length === n);
  return { code: host.code, clients };
}

async function startAndWaitQuestion(clients: Client[]): Promise<View> {
  clients[0].send({ type: 'start' });
  const v = await clients[0].until((x) => x.phase === 'question' && x.question !== null);
  for (const c of clients) await c.until((x) => x.phase === 'question' && x.qNo === v.qNo);
  return v;
}

describe('部屋（遊び方1・2）', () => {
  it('部屋を作ると4文字の部屋コードが返り、ほかの人が同じコードで参加できる', async () => {
    const { code, clients } = await roomWith(2);
    expect(code).toMatch(/^[A-Z2-9]{4}$/);
    expect(clients[1].last!.hostId).toBe(clients[0].playerId);
    expect(clients[1].last!.players.map((p) => p.name)).toEqual(['ホスト', 'プレイヤー2']);
  });

  it('5人目は満員の理由つきで断られる。ロビーで抜ければ空きが出る', async () => {
    const { code, clients } = await roomWith(4);
    const full = await joinRoom(code, '5人目');
    expect(full.status).toBe(409);
    expect(String(full.data.error)).toContain('定員4人で満員');

    clients[3].send({ type: 'leave' });
    await clients[0].until((v) => v.players.length === 3);
    const again = await joinRoom(code, '5人目');
    expect(again.status).toBe(200);
  });

  it('1人ではホストが開始できず、理由がエラーで届く', async () => {
    const { clients } = await roomWith(1);
    clients[0].send({ type: 'start' });
    await waitUntil(() => clients[0].errors.some((e) => e.includes('2〜4人')));
    expect(clients[0].last!.phase).toBe('lobby');
  });

  it('ホスト以外は開始できない', async () => {
    const { clients } = await roomWith(2);
    clients[1].send({ type: 'start' });
    await waitUntil(() => clients[1].errors.some((e) => e.includes('部屋を作った人')));
    expect(clients[1].last!.phase).toBe('lobby');
  });
});

describe('早押し（遊び方5）', () => {
  it('4人が同時に押しても、回答権を得るのは1人だけ（5回くり返す）', async () => {
    for (let round = 0; round < 5; round++) {
      const { clients } = await roomWith(4);
      await startAndWaitQuestion(clients);
      // 4人分の押す操作をほぼ同時に送る
      for (const c of clients) c.send({ type: 'buzz' });
      await sleep(400);
      const winners = new Set(clients.map((c) => c.last!.buzzerId));
      expect(winners.size).toBe(1);
      expect(winners.has(null)).toBe(false);
      const losers = clients.filter((c) => c.last!.buzzerId !== c.playerId && !c.last!.canAnswer);
      expect(losers.length).toBe(3);
      const rejected = clients.reduce((n, c) => n + c.errors.filter((e) => e === 'ほかの人が先に押しました').length, 0);
      expect(rejected).toBe(3);
      for (const c of clients) c.close();
      open.length = 0;
    }
  });
});

describe('回答・点数（遊び方6・7）', () => {
  it('正解は+10点、不正解は-5点で、不正解の人はその問題で押せなくなる', async () => {
    const { clients } = await roomWith(3);
    const q = await startAndWaitQuestion(clients);
    const [a, b] = clients;

    a.send({ type: 'buzz' });
    const aView = await a.until((v) => v.canAnswer);
    const wrong = (correctIndexOf(aView) + 1) % 4;
    a.send({ type: 'answer', choice: wrong });
    await a.until((v) => v.players.find((p) => p.id === a.playerId)!.score === -5);
    const after = await b.until((v) => v.players.find((p) => p.id === a.playerId)!.eliminated);
    expect(after.phase).toBe('question');
    expect(after.buzzerId).toBeNull();

    a.send({ type: 'buzz' });
    await waitUntil(() => a.errors.some((e) => e.includes('もう押せません')));

    b.send({ type: 'buzz' });
    const bView = await b.until((v) => v.canAnswer);
    b.send({ type: 'answer', choice: correctIndexOf(bView) });
    const done = await a.until((v) => v.phase === 'reveal');
    expect(done.reveal!.answer).toBe(correctIndexOf(bView));
    expect(done.players.find((p) => p.id === b.playerId)!.score).toBe(10);
    expect(done.reveal!.headline).toContain('正解');
    expect(q.qNo).toBe(0);
  });

  it('回答権のない人の回答は受け付けない', async () => {
    const { clients } = await roomWith(2);
    await startAndWaitQuestion(clients);
    clients[0].send({ type: 'buzz' });
    await clients[0].until((v) => v.canAnswer);
    clients[1].send({ type: 'answer', choice: 0 });
    await waitUntil(() => clients[1].errors.some((e) => e === '回答権がありません'));
  });
});

describe('時間切れ（遊び方8）', () => {
  it('誰も押さずに20秒たつと、正解を全員に出して次へ進む', async () => {
    const { clients } = await roomWith(2);
    await startAndWaitQuestion(clients);
    const started = Date.now();
    const v = await clients[1].until((x) => x.phase === 'reveal', 30_000);
    const elapsed = Date.now() - started;
    expect(v.reveal!.headline).toBe('時間切れ');
    expect(elapsed).toBeGreaterThan(18_000);
    expect(v.players.every((p) => p.score === 0)).toBe(true);
    // 正解表示のあと、次の問題が出る
    const next = await clients[1].until((x) => x.phase === 'question' && x.qNo === 1, 15_000);
    expect(next.total).toBe(10);
  }, 60_000);
});

describe('再読み込み・回線切れからの復帰（遊び方10）', () => {
  it('切断しても同じ playerId で戻ると、点数と席を保ったまま同じ画面に復帰する', async () => {
    const { code, clients } = await roomWith(2);
    const [a, b] = clients;
    await startAndWaitQuestion(clients);
    b.send({ type: 'buzz' });
    const bv = await b.until((v) => v.canAnswer);
    b.send({ type: 'answer', choice: correctIndexOf(bv) });
    await a.until((v) => v.phase === 'reveal');

    // 回線が切れた（再読み込みと同じ状態）
    b.close();
    const seen = await a.until((v) => v.players.find((p) => p.id === b.playerId)!.connected === false);
    expect(seen.players.find((p) => p.id === b.playerId)!.score).toBe(10);

    // 同じ playerId で戻る
    const back = await checkMember(code, b.playerId);
    expect(back.status).toBe(200);
    const b2 = await connectPlayer(code, b.playerId);
    const restored = await b2.until((v) => v.phase === 'reveal' || v.phase === 'question');
    expect(restored.players.find((p) => p.id === b.playerId)!.score).toBe(10);
    expect(restored.you).toBe(b.playerId);
    await a.until((v) => v.players.find((p) => p.id === b.playerId)!.connected === true);
  });

  it('同じ人が2つ目のタブで開くと、古い接続は閉じられ、新しい接続だけが画面を受け取る', async () => {
    const { code, clients } = await roomWith(2);
    const [host, first] = clients;
    const second = await connectPlayer(code, first.playerId);
    // 古い接続は閉じ始める（OPEN ではなくなる）
    await waitUntil(() => first.ws!.readyState !== WebSocket.OPEN);
    // 新しい接続には画面が届き、同じ人は1人分として数えられる
    const seen = await second.until((v) => v.you === first.playerId);
    expect(seen.players.filter((p) => p.id === first.playerId)).toHaveLength(1);
    const hostView = await host.until((v) => v.players.find((p) => p.id === first.playerId)!.connected === true);
    expect(hostView.players).toHaveLength(2);
  });

  it('参加していない playerId では接続も確認もできない', async () => {
    const { code } = await roomWith(2);
    const r = await checkMember(code, 'no-such-player');
    expect(r.status).toBe(403);
    const ws = new WebSocket(`${'ws://127.0.0.1:8790'}/api/rooms/${code}/ws?playerId=no-such-player`);
    const closed = await new Promise<string>((resolve) => {
      ws.addEventListener('error', () => resolve('error'));
      ws.addEventListener('close', () => resolve('close'));
      ws.addEventListener('open', () => resolve('open'));
    });
    expect(closed).not.toBe('open');
  });
});
