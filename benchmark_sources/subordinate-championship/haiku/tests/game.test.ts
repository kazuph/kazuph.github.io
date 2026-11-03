import { describe, expect, it } from 'vitest';
import {
  ANSWER_MS,
  MAX_PLAYERS,
  QUESTION_MS,
  REVEAL_MS,
  TOTAL_QUESTIONS,
  advance,
  answer,
  buzz,
  createGame,
  joinGame,
  leaveGame,
  nextWakeMs,
  startGame,
  validateName,
  viewFor,
  type GameState,
} from '../src/game';
import { QUESTIONS } from '../src/questions';

// 単体テスト：ゲームのルール（時刻 now を引数で渡すので、待ち時間なしで確かめられる）
const ALL_ORDER = () => Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i);
const T0 = 1_000_000;

function lobbyWith(n: number): GameState {
  let s = createGame('ABCD', { id: 'p1', name: 'P1' });
  for (let i = 2; i <= n; i++) {
    const r = joinGame(s, { id: `p${i}`, name: `P${i}` });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  }
  return s;
}

function started(n = 2): GameState {
  const r = startGame(lobbyWith(n), 'p1', T0, ALL_ORDER);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

const correctOf = (s: GameState) => QUESTIONS[s.order[s.qNo]].answer;
const wrongOf = (s: GameState) => (correctOf(s) + 1) % 4;

function ok(r: { ok: boolean; error?: string; state?: GameState }): GameState {
  if (!r.ok) throw new Error(`expected ok but got: ${r.error}`);
  return r.state!;
}

describe('参加と開始（遊び方1〜3）', () => {
  it('部屋を作った人がホストで、最初の参加者として入る', () => {
    const s = createGame('ABCD', { id: 'h', name: 'ホスト' });
    expect(s.hostId).toBe('h');
    expect(s.players.map((p) => p.name)).toEqual(['ホスト']);
    expect(s.phase).toBe('lobby');
  });

  it('定員4人まで入れて、5人目は理由つきで断られる', () => {
    const s = lobbyWith(MAX_PLAYERS);
    expect(s.players).toHaveLength(4);
    const r = joinGame(s, { id: 'p5', name: 'P5' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('定員4人で満員');
  });

  it('1人では開始できず、2〜4人のときだけ開始できる', () => {
    const one = createGame('ABCD', { id: 'p1', name: 'P1' });
    const r1 = startGame(one, 'p1', T0, ALL_ORDER);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toContain('2〜4人');
    for (const n of [2, 3, 4]) {
      expect(startGame(lobbyWith(n), 'p1', T0, ALL_ORDER).ok).toBe(true);
    }
  });

  it('ホスト以外は開始できない', () => {
    const r = startGame(lobbyWith(2), 'p2', T0, ALL_ORDER);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('部屋を作った人');
  });

  it('ゲーム中は新しく参加できない', () => {
    const r = joinGame(started(2), { id: 'x', name: 'X' });
    expect(r.ok).toBe(false);
  });

  it('ロビーで抜けると席が空き、ホストが抜けたら次の人がホストになる', () => {
    const s = leaveGame(lobbyWith(3), 'p1');
    expect(s.ok).toBe(true);
    if (s.ok) {
      expect(s.state.players.map((p) => p.id)).toEqual(['p2', 'p3']);
      expect(s.state.hostId).toBe('p2');
    }
  });

  it('名前は空・長すぎを断る', () => {
    expect(validateName('  ').ok).toBe(false);
    expect(validateName('あいうえおかきくけこさ').ok).toBe(false);
    expect(validateName(' たろう ')).toEqual({ ok: true, name: 'たろう' });
  });
});

describe('早押しと回答（遊び方5〜7）', () => {
  it('同時に押されても、サーバーが先に受け取った1人だけが回答権を得る', () => {
    let s = started(4);
    const first = ok(buzz(s, 'p3', T0 + 100));
    const second = buzz(first, 'p1', T0 + 101);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toContain('先に押しました');
    expect(first.buzzerId).toBe('p3');
  });

  it('正解は+10点で、その問題は締まって正解が表示される', () => {
    let s = started(2);
    s = ok(buzz(s, 'p2', T0 + 100));
    s = ok(answer(s, 'p2', correctOf(s), T0 + 200));
    expect(s.players.find((p) => p.id === 'p2')!.score).toBe(10);
    expect(s.phase).toBe('reveal');
    expect(s.reveal!.answer).toBe(correctOf(s));
  });

  it('不正解は-5点で、その問題ではもう押せない。残りの人で早押しが続く', () => {
    let s = started(3);
    s = ok(buzz(s, 'p2', T0 + 100));
    s = ok(answer(s, 'p2', wrongOf(s), T0 + 200));
    const p2 = s.players.find((p) => p.id === 'p2')!;
    expect(p2.score).toBe(-5);
    expect(p2.eliminated).toBe(true);
    expect(s.phase).toBe('question');
    expect(s.buzzerId).toBeNull();
    expect(buzz(s, 'p2', T0 + 300).ok).toBe(false);
    expect(buzz(s, 'p3', T0 + 300).ok).toBe(true);
  });

  it('全員が不正解になると、正解を表示して次の問題へ進む', () => {
    let s = started(2);
    s = ok(buzz(s, 'p1', T0 + 100));
    s = ok(answer(s, 'p1', wrongOf(s), T0 + 150));
    s = ok(buzz(s, 'p2', T0 + 160));
    s = ok(answer(s, 'p2', wrongOf(s), T0 + 170));
    expect(s.phase).toBe('reveal');
    expect(s.reveal!.headline).toContain('全員が押せなくなりました');
  });

  it('回答権を持たない人は選べない。選択肢の範囲外も断る', () => {
    let s = started(2);
    s = ok(buzz(s, 'p1', T0 + 100));
    expect(answer(s, 'p2', 0, T0 + 110).ok).toBe(false);
    expect(answer(s, 'p1', 4, T0 + 110).ok).toBe(false);
    expect(answer(s, 'p1', 'x', T0 + 110).ok).toBe(false);
  });
});

describe('時間切れ（遊び方8）', () => {
  it('誰も押さずに20秒たつと、正解を出して問題を締める（得点は動かない）', () => {
    const s = advance(started(2), T0 + QUESTION_MS);
    expect(s.phase).toBe('reveal');
    expect(s.reveal!.headline).toBe('時間切れ');
    expect(s.players.every((p) => p.score === 0)).toBe(true);
  });

  it('回答権を得てから10秒たつと、その人は-5点で押せなくなる', () => {
    let s = started(2);
    s = ok(buzz(s, 'p1', T0 + 1000));
    s = advance(s, T0 + 1000 + ANSWER_MS);
    expect(s.players.find((p) => p.id === 'p1')!.score).toBe(-5);
    expect(s.players.find((p) => p.id === 'p1')!.eliminated).toBe(true);
  });

  it('回答中に問題の20秒がきたら、問題を締めて得点は動かさない', () => {
    let s = started(2);
    s = ok(buzz(s, 'p1', T0 + QUESTION_MS - 2000)); // 残り2秒で押した → 回答期限は問題の期限
    expect(s.answerEndMs).toBe(s.questionEndMs);
    s = advance(s, T0 + QUESTION_MS);
    expect(s.phase).toBe('reveal');
    expect(s.players.every((p) => p.score === 0)).toBe(true);
  });

  it('正解表示の後に次の問題が出て、10問終わると終了する', () => {
    let s = started(2);
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      expect(s.phase).toBe('question');
      s = advance(s, s.questionEndMs); // 時間切れで問題を締める
      expect(s.phase).toBe('reveal');
      s = advance(s, s.reveal!.untilMs); // 正解表示が終わる
    }
    expect(s.phase).toBe('finished');
    expect(nextWakeMs(s)).toBeNull();
  });

  it('次に起こすべき時刻（alarm）は、押す前は問題の期限・回答中は回答の期限', () => {
    let s = started(2);
    expect(nextWakeMs(s)).toBe(T0 + QUESTION_MS);
    s = ok(buzz(s, 'p1', T0 + 500));
    expect(nextWakeMs(s)).toBe(T0 + 500 + ANSWER_MS);
    s = ok(answer(s, 'p1', wrongOf(s), T0 + 600));
    // p2 がまだ押せるので、問題の期限に戻る
    expect(nextWakeMs(s)).toBe(T0 + QUESTION_MS);
    s = ok(buzz(s, 'p2', T0 + 700));
    s = ok(answer(s, 'p2', correctOf(s), T0 + 800));
    expect(nextWakeMs(s)).toBe(T0 + 800 + REVEAL_MS);
  });
});

describe('画面に渡す情報（遊び方11）', () => {
  it('問題中は正解の番号を画面に渡さない。正解表示のときだけ渡す', () => {
    let s = started(2);
    const during = viewFor(s, 'p1', new Set(['p1', 'p2']), T0);
    expect(JSON.stringify(during)).not.toContain('"answer"');
    s = advance(s, s.questionEndMs);
    const after = viewFor(s, 'p1', new Set(['p1', 'p2']), s.questionEndMs);
    expect(after.reveal!.answer).toBe(correctOf(s));
  });

  it('点数・回答中の人・残り時間の期限を全員の画面に同じ値で渡す', () => {
    let s = started(3);
    s = ok(buzz(s, 'p2', T0 + 100));
    const a = viewFor(s, 'p1', new Set(['p1', 'p2', 'p3']), T0 + 100);
    const b = viewFor(s, 'p3', new Set(['p1', 'p2', 'p3']), T0 + 100);
    expect(a.buzzerId).toBe('p2');
    expect(b.buzzerId).toBe('p2');
    expect(a.answerEndMs).toBe(b.answerEndMs);
    expect(a.canBuzz).toBe(false);
    expect(b.canBuzz).toBe(false);
    expect(viewFor(s, 'p2', new Set(), T0).canAnswer).toBe(true);
  });
});
