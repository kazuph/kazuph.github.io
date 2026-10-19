import { describe, expect, it } from 'vitest';
import {
  ANSWER_MS,
  QUESTION_COUNT,
  QUESTION_MS,
  REVEAL_MS,
  buildRanking,
  createRoomState,
  currentQuestion,
  findPlayer,
  handleAnswer,
  handleBuzz,
  joinRoom,
  startGame,
  tick,
  toPublicState,
  type RoomState,
} from '../../src/game';

const CODE = 'ABC234';
const START_AT = 1_000;

function makeRoom(names: string[], seed = 12345): RoomState {
  const state = createRoomState(CODE, 'p0', names[0], 'token-0', 0, seed);
  names.slice(1).forEach((name, index) => {
    const playerNumber = index + 1;
    const error = joinRoom(state, `p${playerNumber}`, name, `token-${playerNumber}`, 0);
    expect(error).toBeNull();
  });
  return state;
}

function startedRoom(names: string[], seed = 12345): RoomState {
  const state = makeRoom(names, seed);
  expect(startGame(state, 'p0', START_AT)).toBeNull();
  return state;
}

function buzzAndAnswer(
  state: RoomState,
  playerId: string,
  choice: number,
  now: number,
): ReturnType<typeof handleAnswer> {
  const buzz = handleBuzz(state, playerId, state.questionIndex + 1, now);
  expect(buzz.ok).toBe(true);
  return handleAnswer(state, playerId, state.questionIndex + 1, choice, now);
}

function correctChoice(state: RoomState): number {
  const question = currentQuestion(state);
  if (!question) throw new Error('question missing');
  return question.correctIndex;
}

function wrongChoice(state: RoomState): number {
  return (correctChoice(state) + 1) % 4;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) result.push([item, ...tail]);
  });
  return result;
}

describe('部屋と参加', () => {
  it('定員は4人で、5人目は理由つきで拒否される', () => {
    const state = makeRoom(['A', 'B', 'C', 'D']);
    expect(state.players).toHaveLength(4);
    const error = joinRoom(state, 'p5', 'E', 'token-5', 0);
    expect(error).toContain('満員');
    expect(state.players).toHaveLength(4);
  });

  it('開始はホストだけ、2〜4人のときだけ', () => {
    const solo = makeRoom(['A']);
    expect(startGame(solo, 'p0', START_AT)).toContain('2人以上');

    const duo = makeRoom(['A', 'B']);
    expect(startGame(duo, 'p1', START_AT)).toContain('ホスト');
    expect(duo.phase).toBe('lobby');
    expect(startGame(duo, 'p0', START_AT)).toBeNull();
    expect(duo.phase).toBe('question');
    expect(duo.questionIds).toHaveLength(QUESTION_COUNT);
    expect(duo.questionEndsAt).toBe(START_AT + QUESTION_MS);

    expect(startGame(duo, 'p0', START_AT + 10)).toContain('すでに始まって');
    expect(joinRoom(duo, 'p9', 'C', 'token-9', START_AT + 10)).toContain('もう始まって');
  });
});

describe('早押し', () => {
  it('4人がどの順で押しても、回答権を得るのは最初の1人だけ（24通り）', () => {
    const players = ['p0', 'p1', 'p2', 'p3'];
    const allOrders = permutations(players);
    expect(allOrders).toHaveLength(24);

    for (const order of allOrders) {
      const state = startedRoom(['A', 'B', 'C', 'D']);
      const results = order.map((playerId) =>
        handleBuzz(state, playerId, 1, START_AT + 500).ok,
      );
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(state.phase).toBe('answering');
      expect(state.answeringPlayerId).toBe(order[0]);
      expect(state.answerEndsAt).toBe(START_AT + 500 + ANSWER_MS);
    }
  });

  it('古い問題番号の早押しは無視され、不正解の人はもう押せない', () => {
    const state = startedRoom(['A', 'B', 'C', 'D']);
    expect(handleBuzz(state, 'p0', 2, START_AT + 100).ok).toBe(false);

    expect(handleBuzz(state, 'p0', 1, START_AT + 100).ok).toBe(true);
    const wrong = wrongChoice(state);
    expect(handleAnswer(state, 'p0', 1, wrong, START_AT + 200).ok).toBe(true);
    expect(findPlayer(state, 'p0')?.score).toBe(-5);
    expect(findPlayer(state, 'p0')?.lockedOut).toBe(true);
    expect(state.phase).toBe('question');

    expect(handleBuzz(state, 'p0', 1, START_AT + 300).ok).toBe(false);
    expect(handleBuzz(state, 'p1', 1, START_AT + 300).ok).toBe(true);
  });

  it('正解は+10点で、全員に正解が公開される', () => {
    const state = startedRoom(['A', 'B']);
    const before = toPublicState(state, START_AT + 100, 'p1');
    expect('correctIndex' in before).toBe(false);

    expect(buzzAndAnswer(state, 'p0', correctChoice(state), START_AT + 100).ok).toBe(true);
    expect(findPlayer(state, 'p0')?.score).toBe(10);
    expect(state.phase).toBe('reveal');
    expect(state.revealedCorrect).toBe(correctChoice(state));

    const publicState = toPublicState(state, START_AT + 200, 'p1');
    expect(publicState.correctIndex).toBe(correctChoice(state));
    expect(publicState.question?.choices).toHaveLength(4);

    expect(tick(state, START_AT + 200 + REVEAL_MS)).toBe(true);
    expect(state.phase).toBe('question');
    expect(state.questionIndex).toBe(1);
  });

  it('回答の10秒が切れると-5点で、その問題ではもう押せない', () => {
    const state = startedRoom(['A', 'B', 'C']);
    expect(handleBuzz(state, 'p1', 1, START_AT + 1_000).ok).toBe(true);
    expect(tick(state, START_AT + 1_000 + ANSWER_MS)).toBe(true);
    expect(findPlayer(state, 'p1')?.score).toBe(-5);
    expect(findPlayer(state, 'p1')?.lockedOut).toBe(true);
    expect(state.phase).toBe('question');
    expect(state.answeringPlayerId).toBeNull();
    expect(handleBuzz(state, 'p1', 1, START_AT + 12_000).ok).toBe(false);
    expect(handleBuzz(state, 'p2', 1, START_AT + 12_000).ok).toBe(true);
  });
});

describe('締め切りと進行', () => {
  it('問題の20秒で、回答中でも必ず正解表示に進む', () => {
    const state = startedRoom(['A', 'B']);
    expect(handleBuzz(state, 'p0', 1, START_AT + 5_000).ok).toBe(true);
    expect(tick(state, START_AT + QUESTION_MS)).toBe(true);
    expect(state.phase).toBe('reveal');
    expect(findPlayer(state, 'p0')?.score).toBe(-5);
    expect(state.revealedCorrect).not.toBeNull();
  });

  it('誰も押さなくても20秒で正解表示になる', () => {
    const state = startedRoom(['A', 'B']);
    expect(tick(state, START_AT + QUESTION_MS - 1)).toBe(false);
    expect(tick(state, START_AT + QUESTION_MS)).toBe(true);
    expect(state.phase).toBe('reveal');
    expect(state.lastAnswer).toBeNull();
  });

  it('全員が不正解になると、20秒を待たずに正解表示になる', () => {
    const state = startedRoom(['A', 'B', 'C', 'D']);
    for (const playerId of ['p0', 'p1', 'p2']) {
      expect(handleBuzz(state, playerId, 1, START_AT + 100).ok).toBe(true);
      expect(handleAnswer(state, playerId, 1, wrongChoice(state), START_AT + 200).ok).toBe(
        true,
      );
      expect(state.phase).toBe('question');
    }
    expect(handleBuzz(state, 'p3', 1, START_AT + 300).ok).toBe(true);
    expect(handleAnswer(state, 'p3', 1, wrongChoice(state), START_AT + 400).ok).toBe(true);
    expect(state.phase).toBe('reveal');
    expect(state.players.every((player) => player.lockedOut)).toBe(true);
  });

  it('10問すべて終わると finished になり、同点は同じ順位になる', () => {
    const state = startedRoom(['A', 'B']);
    let now = START_AT;
    for (let question = 0; question < QUESTION_COUNT; question += 1) {
      expect(state.questionIndex).toBe(question);
      expect(buzzAndAnswer(state, 'p0', correctChoice(state), now + 100).ok).toBe(true);
      now += 100;
      expect(tick(state, now + REVEAL_MS)).toBe(true);
      now += REVEAL_MS;
    }
    expect(state.phase).toBe('finished');
    expect(findPlayer(state, 'p0')?.score).toBe(QUESTION_COUNT * 10);

    const ranking = buildRanking(state);
    expect(ranking[0]).toMatchObject({ rank: 1, playerId: 'p0', score: 100 });
    expect(ranking[1]).toMatchObject({ rank: 2, playerId: 'p1', score: 0 });
  });

  it('同点は同順位（1,1,3,4）になる', () => {
    const state = makeRoom(['A', 'B', 'C', 'D']);
    const scores = [10, 10, 5, 0];
    state.players.forEach((player, index) => {
      player.score = scores[index];
    });
    expect(buildRanking(state).map((entry) => entry.rank)).toEqual([1, 1, 3, 4]);
  });
});

describe('クライアントに送る状態', () => {
  it('出題中と回答中は正解を含まず、token も含まない', () => {
    const state = startedRoom(['A', 'B', 'C']);
    for (const phaseTime of [START_AT + 100, START_AT + 200]) {
      if (phaseTime === START_AT + 200) {
        expect(handleBuzz(state, 'p0', 1, phaseTime).ok).toBe(true);
      }
      const publicState = toPublicState(state, phaseTime, 'p1');
      const serialized = JSON.stringify(publicState);
      expect('correctIndex' in publicState).toBe(false);
      expect(serialized).not.toContain('token-');
      expect(publicState.question).not.toBeNull();
    }
    expect(state.phase).toBe('answering');
    expect(publicStateIsFinishedSafe(state)).toBe(true);
  });
});

function publicStateIsFinishedSafe(state: RoomState): boolean {
  const leaked = JSON.stringify(toPublicState(state, START_AT + 250, 'p2'));
  return !leaked.includes('"token"');
}
