import { describe, expect, it } from "vitest";
import {
  ANSWER_TIME_MS,
  CORRECT_POINTS,
  MAX_PLAYERS,
  QUESTION_TIME_MS,
  REVEAL_TIME_MS,
  WRONG_POINTS,
  addPlayer,
  answer,
  buzz,
  computeRanking,
  createGame,
  joinError,
  nextDeadline,
  playerIdForToken,
  publicState,
  startGame,
  tick,
} from "../../src/game";
import type { GameState } from "../../src/game";
import { QUESTIONS, QUESTIONS_PER_GAME, shuffledQuestionOrder } from "../../src/questions";

const T0 = 1_700_000_000_000;
const NAMES = ["あかね", "ばんり", "つばさ", "だいち"];

function makeLobby(playerCount: number): GameState {
  let state = createGame("ABC234", "p0", NAMES[0]!, "t0");
  for (let i = 1; i < playerCount; i += 1) {
    state = addPlayer(state, `p${i}`, NAMES[i]!, `t${i}`);
  }
  return state;
}

function start(state: GameState, now = T0): GameState {
  const order = Array.from({ length: QUESTIONS_PER_GAME }, (_, i) => i);
  const result = startGame(state, state.hostId, order, now);
  expect(result.ok).toBe(true);
  return result.state;
}

function scoreOf(state: GameState, id: string): number {
  return state.players.find((p) => p.id === id)!.score;
}

function isEliminated(state: GameState, id: string): boolean {
  return state.players.find((p) => p.id === id)!.eliminated;
}

function wrongChoice(round: number): number {
  const correct = QUESTIONS[round]!.correct;
  return (correct + 1) % 4;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const tail of permutations(rest)) {
      result.push([items[i]!, ...tail]);
    }
  }
  return result;
}

describe("部屋と参加", () => {
  it("4人までは参加でき、5人目は「満員」で拒否される", () => {
    const three = makeLobby(3);
    expect(joinError(three)).toBeNull();

    const full = addPlayer(three, "p3", NAMES[3]!, "t3");
    expect(full.players).toHaveLength(MAX_PLAYERS);
    expect(joinError(full)).toBe("満員です（4人まで）");

    const over = addPlayer(full, "p4", "えみ", "t4");
    expect(joinError(over)).toBe("満員です（4人まで）");
  });

  it("開始後の参加は拒否される", () => {
    expect(joinError(start(makeLobby(2)))).toBe("ゲームはもう始まっています");
  });

  it("開始できるのはホストだけ。人数は2〜4人", () => {
    const order = Array.from({ length: QUESTIONS_PER_GAME }, (_, i) => i);

    expect(startGame(makeLobby(1), "p0", order, T0).ok).toBe(false);
    expect(startGame(makeLobby(2), "p1", order, T0).ok).toBe(false);
    expect(startGame(makeLobby(2), "p0", order, T0).ok).toBe(true);
    expect(startGame(makeLobby(4), "p0", order, T0).ok).toBe(true);
    expect(startGame(makeLobby(4), "p3", order, T0).ok).toBe(false);

    const five = addPlayer(makeLobby(4), "p4", "えみ", "t4");
    expect(startGame(five, "p0", order, T0).ok).toBe(false);
  });

  it("トークンからプレイヤーを引ける", () => {
    const state = makeLobby(2);
    expect(playerIdForToken(state, "t1")).toBe("p1");
    expect(playerIdForToken(state, "nope")).toBeNull();
  });
});

describe("早押し", () => {
  it("4人の押す順を24通りすべて試しても、回答権を得るのは最初の1人だけ", () => {
    const orders = permutations(["p0", "p1", "p2", "p3"]);
    expect(orders).toHaveLength(24);

    for (const order of orders) {
      let state = start(makeLobby(4));
      order.forEach((playerId, index) => {
        state = buzz(state, playerId, 0, T0 + 100 * (index + 1));
      });
      expect(state.phase).toBe("answering");
      expect(state.answeringId).toBe(order[0]);
      expect(state.players.filter((p) => p.id === state.answeringId)).toHaveLength(1);
    }
  });

  it("古い問題番号の早押しは無視される", () => {
    const state = buzz(start(makeLobby(2)), "p0", 3, T0 + 100);
    expect(state.phase).toBe("question");
    expect(state.answeringId).toBeNull();
  });

  it("ロビー中の早押しは無視される", () => {
    const state = buzz(makeLobby(2), "p0", 0, T0);
    expect(state.phase).toBe("lobby");
  });

  it("出題から20秒たつと、誰も押していなくても正解表示になる", () => {
    const state = tick(start(makeLobby(2)), T0 + QUESTION_TIME_MS);
    expect(state.phase).toBe("reveal");
    expect(publicState(state, "p0", T0).correctIndex).toBe(QUESTIONS[0]!.correct);
  });

  it("回答中でも出題から20秒で締め切られ、回答者は-5点", () => {
    let state = start(makeLobby(2));
    state = buzz(state, "p0", 0, T0 + 15_000);
    state = tick(state, T0 + QUESTION_TIME_MS);
    expect(state.phase).toBe("reveal");
    expect(scoreOf(state, "p0")).toBe(WRONG_POINTS);
    expect(isEliminated(state, "p0")).toBe(true);
  });
});

describe("回答と得点", () => {
  it("正解は+10点で正解表示になる", () => {
    let state = start(makeLobby(2));
    state = buzz(state, "p0", 0, T0 + 1_000);
    state = answer(state, "p0", 0, QUESTIONS[0]!.correct, T0 + 2_000);
    expect(state.phase).toBe("reveal");
    expect(scoreOf(state, "p0")).toBe(CORRECT_POINTS);
    expect(state.lastResult?.correct).toBe(true);
  });

  it("不正解は-5点で失格になり、残りの人で早押しが再開する", () => {
    let state = start(makeLobby(2));
    state = buzz(state, "p0", 0, T0 + 1_000);
    state = answer(state, "p0", 0, wrongChoice(0), T0 + 2_000);
    expect(state.phase).toBe("question");
    expect(scoreOf(state, "p0")).toBe(WRONG_POINTS);
    expect(isEliminated(state, "p0")).toBe(true);

    // 失格した人はもう押せない
    state = buzz(state, "p0", 0, T0 + 3_000);
    expect(state.answeringId).toBeNull();

    // 残った人は押せる
    state = buzz(state, "p1", 0, T0 + 3_100);
    expect(state.answeringId).toBe("p1");
  });

  it("10秒選ばないと-5点で失格になる", () => {
    let state = start(makeLobby(2));
    state = buzz(state, "p1", 0, T0 + 1_000);
    expect(state.answerDeadline).toBe(T0 + 1_000 + ANSWER_TIME_MS);

    state = tick(state, T0 + 1_000 + ANSWER_TIME_MS);
    expect(scoreOf(state, "p1")).toBe(WRONG_POINTS);
    expect(isEliminated(state, "p1")).toBe(true);
    expect(state.phase).toBe("question");
  });

  it("回答権のない人の回答は無視される", () => {
    let state = start(makeLobby(2));
    state = buzz(state, "p0", 0, T0 + 1_000);
    state = answer(state, "p1", 0, QUESTIONS[0]!.correct, T0 + 1_100);
    expect(state.answeringId).toBe("p0");
    expect(scoreOf(state, "p1")).toBe(0);
  });

  it("全員が失格すると正解表示になる", () => {
    let state = start(makeLobby(2));
    state = buzz(state, "p0", 0, T0 + 1_000);
    state = answer(state, "p0", 0, wrongChoice(0), T0 + 2_000);
    expect(state.phase).toBe("question");
    state = buzz(state, "p1", 0, T0 + 3_000);
    state = answer(state, "p1", 0, wrongChoice(0), T0 + 4_000);
    expect(state.phase).toBe("reveal");
    expect(state.players.every((p) => p.eliminated)).toBe(true);
  });
});

describe("問題の進行と最終結果", () => {
  it("10問終わると finished になり、全員が同じ点数なら同順位", () => {
    let state = start(makeLobby(2));
    let now = T0;
    for (let round = 0; round < QUESTIONS_PER_GAME; round += 1) {
      expect(state.phase).toBe("question");
      expect(state.round).toBe(round);

      now = state.questionDeadline;
      state = tick(state, now);
      expect(state.phase).toBe("reveal");

      now = state.revealDeadline;
      state = tick(state, now);
    }

    expect(state.phase).toBe("finished");
    expect(state.round).toBe(QUESTIONS_PER_GAME);

    const pub = publicState(state, "p0", now);
    expect(pub.ranking).toHaveLength(2);
    expect(pub.ranking!.every((entry) => entry.rank === 1)).toBe(true);
  });

  it("正解表示は3秒で次の問題に進む", () => {
    let state = tick(start(makeLobby(2)), T0 + QUESTION_TIME_MS);
    expect(state.revealDeadline).toBe(T0 + QUESTION_TIME_MS + REVEAL_TIME_MS);
    state = tick(state, state.revealDeadline);
    expect(state.phase).toBe("question");
    expect(state.round).toBe(1);
    expect(state.players.every((p) => !p.eliminated)).toBe(true);
  });

  it("同点は同じ順位、違う点数は順位が分かれる", () => {
    const state = makeLobby(4);
    state.players[0]!.score = 10;
    state.players[1]!.score = 10;
    state.players[2]!.score = 5;
    state.players[3]!.score = 0;
    const ranking = computeRanking(state);
    expect(ranking.map((entry) => entry.rank)).toEqual([1, 1, 3, 4]);
  });

  it("次の締め切りを1つだけ返す", () => {
    const state = start(makeLobby(2));
    expect(nextDeadline(state)).toBe(state.questionDeadline);
    const answering = buzz(state, "p0", 0, T0 + 1_000);
    expect(nextDeadline(answering)).toBe(T0 + 1_000 + ANSWER_TIME_MS);
    expect(nextDeadline(makeLobby(2))).toBeNull();
  });
});

describe("内蔵の問題", () => {
  it("10問以上あり、毎回そこから重複なく10問を選ぶ", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(QUESTIONS_PER_GAME);
    for (const question of QUESTIONS) {
      expect(question.text.length).toBeGreaterThan(0);
      expect(question.choices).toHaveLength(4);
      expect(question.correct).toBeGreaterThanOrEqual(0);
      expect(question.correct).toBeLessThan(4);
      for (const choice of question.choices) expect(choice.length).toBeGreaterThan(0);
    }

    const order = shuffledQuestionOrder(() => 0.42);
    expect(order).toHaveLength(QUESTIONS_PER_GAME);
    expect(new Set(order).size).toBe(QUESTIONS_PER_GAME);
    for (const index of order) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(QUESTIONS.length);
    }
  });
});

describe("公開状態", () => {
  it("出題中と回答中は正解を含まず、正解表示のときだけ含む", () => {
    let state = start(makeLobby(2));
    let pub = publicState(state, "p0", T0);
    expect(pub.phase).toBe("question");
    expect(pub.questionText).toBe(QUESTIONS[0]!.text);
    expect(pub.choices).toEqual([...QUESTIONS[0]!.choices]);
    expect(pub.correctIndex).toBeNull();

    state = buzz(state, "p0", 0, T0 + 1_000);
    pub = publicState(state, "p0", T0 + 1_000);
    expect(pub.phase).toBe("answering");
    expect(pub.correctIndex).toBeNull();

    state = answer(state, "p0", 0, QUESTIONS[0]!.correct, T0 + 2_000);
    pub = publicState(state, "p0", T0 + 2_000);
    expect(pub.phase).toBe("reveal");
    expect(pub.correctIndex).toBe(QUESTIONS[0]!.correct);
  });

  it("ほかの人のトークンは含まれない", () => {
    const state = start(makeLobby(2));
    const pub = publicState(state, "p0", T0) as unknown as Record<string, unknown>;
    expect(pub.tokens).toBeUndefined();
    expect(JSON.stringify(pub)).not.toContain("t1");
  });

  it("you・点数・接続状態・回答者を全員に配る", () => {
    let state = start(makeLobby(3));
    state = buzz(state, "p2", 0, T0 + 500);
    const pub = publicState(state, "p1", T0 + 500);
    expect(pub.you).toBe("p1");
    expect(pub.answeringId).toBe("p2");
    expect(pub.players.map((p) => p.name)).toEqual(NAMES.slice(0, 3));
    expect(pub.players.every((p) => p.connected === false)).toBe(true);
    expect(pub.serverNow).toBe(T0 + 500);
  });
});
