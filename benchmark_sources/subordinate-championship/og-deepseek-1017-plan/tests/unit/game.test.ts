import { describe, expect, it } from 'vitest';
import {
  ANSWER_TIME_MS,
  MAX_PLAYERS,
  QUESTION_TIME_MS,
  REVEAL_TIME_MS,
  addPlayer,
  answer,
  buzz,
  createLobby,
  currentQuestion,
  ranking,
  snapshot,
  startGame,
  tick,
  type GameState,
} from '../../src/game';
import { QUESTIONS, TOTAL_QUESTIONS } from '../../src/questions';

const ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const T0 = 1_000;

function makeLobby(names: string[]): GameState {
  const state = createLobby('TEST01');
  names.forEach((name, i) => addPlayer(state, { id: `p${i}`, name, token: `t${i}` }));
  return state;
}

function started(names: string[], now = T0): GameState {
  const state = makeLobby(names);
  const result = startGame(state, now, 'p0', ORDER);
  expect(result.ok).toBe(true);
  return state;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) out.push([item, ...p]);
  });
  return out;
}

const wrongChoice = (state: GameState) => (currentQuestion(state)!.answer + 1) % 4;

describe('参加と開始', () => {
  it('定員は4人で、5人目は入れない', () => {
    const state = makeLobby(['A', 'B', 'C', 'D']);
    expect(state.players).toHaveLength(MAX_PLAYERS);
    const result = addPlayer(state, { id: 'p4', name: 'E', token: 't4' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('満員です（4人まで）');
    expect(state.players).toHaveLength(MAX_PLAYERS);
  });

  it('2人未満では開始できない', () => {
    const state = makeLobby(['A']);
    expect(startGame(state, T0, 'p0', ORDER).ok).toBe(false);
    expect(state.phase).toBe('lobby');
  });

  it('2〜4人で開始できる（3人の場合）', () => {
    const state = makeLobby(['A', 'B', 'C']);
    expect(startGame(state, T0, 'p0', ORDER).ok).toBe(true);
    expect(state.phase).toBe('question');
  });

  it('開始できるのは部屋を作った人（ホスト）だけ', () => {
    const state = makeLobby(['A', 'B']);
    expect(startGame(state, T0, 'p1', ORDER).ok).toBe(false);
    expect(state.phase).toBe('lobby');
    expect(startGame(state, T0, 'p0', ORDER).ok).toBe(true);
    expect(state.phase).toBe('question');
  });

  it('開始後の新規参加は拒否する', () => {
    const state = started(['A', 'B']);
    const result = addPlayer(state, { id: 'p2', name: 'C', token: 't2' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('ゲームはもう始まっています');
  });
});

describe('早押し', () => {
  it('4人の押す順が24通りでも、回答権は最初の1人だけが得る', () => {
    const orders = permutations(['p0', 'p1', 'p2', 'p3']);
    expect(orders).toHaveLength(24);
    for (const order of orders) {
      const state = started(['A', 'B', 'C', 'D']);
      let now = T0;
      const results = order.map((id) => {
        const r = buzz(state, id, 0, now);
        now += 1;
        return r;
      });
      const winners = results.filter((r) => r.ok);
      expect(winners, order.join(',')).toHaveLength(1);
      expect(state.answeringPlayerId).toBe(order[0]);
      expect(state.phase).toBe('answering');
    }
  });

  it('古い問題番号の早押しは無視する', () => {
    const state = started(['A', 'B']);
    expect(buzz(state, 'p0', 0, T0).ok).toBe(true);
    expect(buzz(state, 'p1', 0, T0 + 1).ok).toBe(false);
  });

  it('失格した人はもう押せない', () => {
    const state = started(['A', 'B']);
    buzz(state, 'p0', 0, T0);
    answer(state, 'p0', 0, wrongChoice(state), T0 + 100);
    expect(state.players[0].locked).toBe(true);
    expect(buzz(state, 'p0', 0, T0 + 200).ok).toBe(false);
  });
});

describe('回答と点数', () => {
  it('正解は +10 点で reveal に進む', () => {
    const state = started(['A', 'B']);
    const correct = currentQuestion(state)!.answer;
    buzz(state, 'p0', 0, T0);
    expect(answer(state, 'p0', 0, correct, T0 + 100).ok).toBe(true);
    expect(state.players[0].score).toBe(10);
    expect(state.phase).toBe('reveal');
    expect(state.reveal?.reason).toBe('correct');
  });

  it('不正解は -5 点でその問題は失格、残りがいれば早押し再開', () => {
    const state = started(['A', 'B']);
    buzz(state, 'p0', 0, T0);
    expect(answer(state, 'p0', 0, wrongChoice(state), T0 + 100).ok).toBe(true);
    expect(state.players[0].score).toBe(-5);
    expect(state.players[0].locked).toBe(true);
    expect(state.phase).toBe('question');
    expect(state.answeringPlayerId).toBeNull();
    // 残りの B は押せる
    expect(buzz(state, 'p1', 0, T0 + 200).ok).toBe(true);
  });

  it('回答権のない人の回答は拒否する', () => {
    const state = started(['A', 'B']);
    buzz(state, 'p0', 0, T0);
    const result = answer(state, 'p1', 0, currentQuestion(state)!.answer, T0 + 100);
    expect(result.ok).toBe(false);
    expect(state.players[1].score).toBe(0);
  });

  it('回答は10秒たつと -5 点で失格', () => {
    const state = started(['A', 'B']);
    buzz(state, 'p0', 0, T0);
    expect(state.answerDeadline).toBe(T0 + ANSWER_TIME_MS);
    tick(state, T0 + ANSWER_TIME_MS);
    expect(state.players[0].score).toBe(-5);
    expect(state.players[0].locked).toBe(true);
    expect(state.phase).toBe('question');
  });
});

describe('締め切りと進行', () => {
  it('問題が出てから20秒で、誰も答えなくても reveal する', () => {
    const state = started(['A', 'B']);
    tick(state, T0 + QUESTION_TIME_MS);
    expect(state.phase).toBe('reveal');
    expect(state.reveal?.reason).toBe('none');
  });

  it('回答中でも20秒で締め切る', () => {
    const state = started(['A', 'B']);
    // 問題の終わり近くで押すので、回答の締め切りは問題の締め切りと同じになる。
    buzz(state, 'p0', 0, T0 + QUESTION_TIME_MS - 1_000);
    expect(state.answerDeadline).toBe(T0 + QUESTION_TIME_MS);
    tick(state, T0 + QUESTION_TIME_MS);
    expect(state.players[0].score).toBe(-5);
    expect(state.phase).toBe('reveal');
    expect(state.reveal?.reason).toBe('timeout');
  });

  it('全員失格になったら reveal する', () => {
    const state = started(['A', 'B']);
    buzz(state, 'p0', 0, T0);
    answer(state, 'p0', 0, wrongChoice(state), T0 + 100);
    buzz(state, 'p1', 0, T0 + 200);
    answer(state, 'p1', 0, wrongChoice(state), T0 + 300);
    expect(state.phase).toBe('reveal');
    expect(state.reveal?.reason).toBe('wrong');
  });

  it('reveal が3秒続いたあと次の問題に進む', () => {
    const state = started(['A', 'B']);
    tick(state, T0 + QUESTION_TIME_MS);
    tick(state, state.revealDeadline!);
    expect(state.questionIndex).toBe(1);
    expect(state.phase).toBe('question');
    expect(state.players.every((p) => !p.locked)).toBe(true);
  });

  it('10問終わると finished になる', () => {
    const state = started(['A', 'B']);
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      expect(state.questionIndex).toBe(i);
      const now = state.questionStartedAt + 100;
      expect(buzz(state, 'p0', i, now).ok).toBe(true);
      expect(answer(state, 'p0', i, currentQuestion(state)!.answer, now + 10).ok).toBe(true);
      tick(state, state.revealDeadline!);
    }
    expect(state.phase).toBe('finished');
    expect(state.players[0].score).toBe(TOTAL_QUESTIONS * 10);
  });

  it('同点は同じ順位にする', () => {
    const state = makeLobby(['A', 'B', 'C']);
    state.players[0].score = 10;
    state.players[1].score = 10;
    state.players[2].score = 5;
    expect(ranking(state).map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('内蔵の問題は12問以上あり、10問を重複なく出す', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(12);
    const state = started(['A', 'B']);
    expect(state.order).toHaveLength(TOTAL_QUESTIONS);
    expect(new Set(state.order).size).toBe(TOTAL_QUESTIONS);
  });
});

describe('配信する状態', () => {
  it('出題中の状態に正解の番号を含めない', () => {
    const state = started(['A', 'B']);
    const snap = snapshot(state, 'p0', T0);
    expect(snap.reveal).toBeNull();
    expect(snap.question).not.toBeNull();
    expect(Object.keys(snap.question!)).toEqual(['text', 'choices']);
    expect('answer' in snap.question!).toBe(false);
  });

  it('reveal のときだけ正解の番号を送る', () => {
    const state = started(['A', 'B']);
    const correct = currentQuestion(state)!.answer;
    buzz(state, 'p0', 0, T0);
    answer(state, 'p0', 0, correct, T0 + 100);
    const snap = snapshot(state, 'p0', T0 + 100);
    expect(snap.reveal?.choice).toBe(correct);
  });

  it('finished のときだけ最終順位を送る', () => {
    const state = started(['A', 'B']);
    expect(snapshot(state, 'p0', T0).ranking).toBeNull();
    state.phase = 'finished';
    expect(snapshot(state, 'p0', T0).ranking).not.toBeNull();
  });
});
