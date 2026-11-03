import { describe, expect, it } from "vitest";
import {
  addPlayer,
  ANSWER_WINDOW_MS,
  answerDeadline,
  BUZZ_WINDOW_MS,
  createState,
  findPlayer,
  handleAnswer,
  handleBuzz,
  type GameState,
  MIN_PLAYERS,
  newPlayerId,
  newToken,
  questionDeadline,
  ranking,
  REVEAL_MS,
  startGame,
  tick,
  toPublicState,
  TOTAL_QUESTIONS,
} from "../../src/game";
import { pickQuestions, QUESTIONS } from "../../src/questions";

function makeState(playerCount: number): GameState {
  const state = createState("TEST01");
  for (let i = 0; i < playerCount; i += 1) {
    const result = addPlayer(
      state,
      { id: newPlayerId(), name: `プレイヤー${i + 1}`, token: newToken() },
      1000 + i,
    );
    expect(result.ok).toBe(true);
  }
  return state;
}

function ids(state: GameState): string[] {
  return state.players.map((p) => p.id);
}

function start(state: GameState, now = 0): void {
  const result = startGame(state, state.hostId, now, pickQuestions(TOTAL_QUESTIONS));
  expect(result.ok).toBe(true);
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) out.push([item, ...tail]);
  });
  return out;
}

describe("問題データ", () => {
  it("内蔵の問題が10問以上あり、すべて4択で正解番号が0〜3", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(TOTAL_QUESTIONS);
    for (const q of QUESTIONS) {
      expect(q.choices).toHaveLength(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThanOrEqual(3);
      expect(q.text.length).toBeGreaterThan(0);
      for (const choice of q.choices) expect(choice.length).toBeGreaterThan(0);
    }
  });

  it("pickQuestions は重複なく10問えらぶ", () => {
    const picked = pickQuestions(TOTAL_QUESTIONS);
    expect(picked).toHaveLength(TOTAL_QUESTIONS);
    expect(new Set(picked).size).toBe(TOTAL_QUESTIONS);
  });
});

describe("入室と開始", () => {
  it("定員は4人で、5人目は拒否される", () => {
    const state = createState("TEST01");
    for (let i = 0; i < 4; i += 1) {
      const result = addPlayer(
        state,
        { id: newPlayerId(), name: `P${i}`, token: newToken() },
        1000 + i,
      );
      expect(result.ok).toBe(true);
    }
    const fifth = addPlayer(
      state,
      { id: newPlayerId(), name: "P5", token: newToken() },
      2000,
    );
    expect(fifth.ok).toBe(false);
    expect(fifth.error).toContain("満員");
    expect(state.players).toHaveLength(4);
  });

  it("最初に入った人がホストになる", () => {
    const state = makeState(3);
    expect(state.hostId).toBe(state.players[0].id);
  });

  it("開始できるのは2人以上4人以下", () => {
    const one = makeState(1);
    const result = startGame(one, one.hostId, 0, pickQuestions(TOTAL_QUESTIONS));
    expect(result.ok).toBe(false);
    expect(one.phase).toBe("lobby");

    const two = makeState(2);
    expect(startGame(two, two.hostId, 0, pickQuestions(TOTAL_QUESTIONS)).ok).toBe(true);
    expect(two.phase).toBe("question");
    expect(two.questionIds).toHaveLength(TOTAL_QUESTIONS);
  });

  it("開始できるのはホストだけ", () => {
    const state = makeState(3);
    const guest = state.players[1].id;
    const result = startGame(state, guest, 0, pickQuestions(TOTAL_QUESTIONS));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("部屋を作った人");
    expect(state.phase).toBe("lobby");
  });

  it("開始後の参加は拒否される", () => {
    const state = makeState(2);
    start(state);
    const result = addPlayer(
      state,
      { id: newPlayerId(), name: "あとから", token: newToken() },
      100,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("始まっています");
  });
});

describe("早押し", () => {
  it("4人が同時に押しても、最初に処理された1人だけが回答権を得る（24通りすべて）", () => {
    for (const order of permutations([0, 1, 2, 3])) {
      const state = makeState(4);
      start(state, 0);
      const players = ids(state);
      const results = order.map((playerIndex) =>
        handleBuzz(state, players[playerIndex], 0, 10 + playerIndex),
      );
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(state.buzzedBy).toBe(players[order[0]]);
      expect(state.phase).toBe("answering");
    }
  });

  it("回答権を持つ前の問題番号の buzz は無視される", () => {
    const state = makeState(2);
    start(state, 0);
    const [a, b] = ids(state);
    expect(handleBuzz(state, b, 1, 10).ok).toBe(false);
    expect(handleBuzz(state, a, 0, 11).ok).toBe(true);
    expect(handleBuzz(state, b, 0, 12).ok).toBe(false);
    expect(state.buzzedBy).toBe(a);
  });

  it("回答中はほかの人の buzz を受け付けない", () => {
    const state = makeState(3);
    start(state, 0);
    const [a, b] = ids(state);
    expect(handleBuzz(state, a, 0, 10).ok).toBe(true);
    expect(handleBuzz(state, b, 0, 11).ok).toBe(false);
  });
});

describe("回答と点数", () => {
  it("正解は+10点で正解表示へ", () => {
    const state = makeState(2);
    start(state, 0);
    const [a] = ids(state);
    handleBuzz(state, a, 0, 100);
    const answer = QUESTIONS[state.questionIds[0]].answer;
    expect(handleAnswer(state, a, 0, answer, 200).ok).toBe(true);
    expect(findPlayer(state, a)?.score).toBe(10);
    expect(state.phase).toBe("reveal");
    expect(state.revealReason).toBe("correct");
  });

  it("不正解は-5点で、その人はこの問題ではもう押せない", () => {
    const state = makeState(3);
    start(state, 0);
    const [a, b] = ids(state);
    handleBuzz(state, a, 0, 100);
    const answer = QUESTIONS[state.questionIds[0]].answer;
    const wrong = (answer + 1) % 4;
    expect(handleAnswer(state, a, 0, wrong, 200).ok).toBe(true);
    expect(findPlayer(state, a)?.score).toBe(-5);
    expect(state.lockedOut).toContain(a);
    // 残りの人で早押し再開
    expect(state.phase).toBe("question");
    expect(handleBuzz(state, a, 0, 300).ok).toBe(false);
    expect(handleBuzz(state, b, 0, 300).ok).toBe(true);
    expect(state.buzzedBy).toBe(b);
  });

  it("全員が不正解になったら正解表示へ", () => {
    const state = makeState(2);
    start(state, 0);
    const answer = QUESTIONS[state.questionIds[0]].answer;
    const wrong = (answer + 1) % 4;
    for (const id of ids(state)) {
      handleBuzz(state, id, 0, 100);
      handleAnswer(state, id, 0, wrong, 200);
    }
    expect(state.phase).toBe("reveal");
    expect(state.revealReason).toBe("all-locked");
    expect(state.players.every((p) => p.score === -5)).toBe(true);
  });

  it("回答権のない人の回答は無視される", () => {
    const state = makeState(2);
    start(state, 0);
    const [a, b] = ids(state);
    handleBuzz(state, a, 0, 100);
    const answer = QUESTIONS[state.questionIds[0]].answer;
    expect(handleAnswer(state, b, 0, answer, 150).ok).toBe(false);
    expect(findPlayer(state, b)?.score).toBe(0);
    expect(state.phase).toBe("answering");
  });
});

describe("締め切り", () => {
  it("問題の20秒が過ぎると誰も押していなくても正解表示になる", () => {
    const state = makeState(3);
    start(state, 0);
    expect(questionDeadline(state)).toBe(BUZZ_WINDOW_MS);
    expect(tick(state, BUZZ_WINDOW_MS - 1)).toBe(false);
    expect(state.phase).toBe("question");
    expect(tick(state, BUZZ_WINDOW_MS)).toBe(true);
    expect(state.phase).toBe("reveal");
    expect(state.revealReason).toBe("question-timeout");
  });

  it("回答権を得て10秒たつと-5点で失格になり、残りの人で再開する", () => {
    const state = makeState(3);
    start(state, 0);
    const [a] = ids(state);
    handleBuzz(state, a, 0, 1000);
    expect(answerDeadline(state)).toBe(1000 + ANSWER_WINDOW_MS);
    expect(tick(state, 1000 + ANSWER_WINDOW_MS - 1)).toBe(false);
    expect(state.phase).toBe("answering");
    expect(tick(state, 1000 + ANSWER_WINDOW_MS)).toBe(true);
    expect(findPlayer(state, a)?.score).toBe(-5);
    expect(state.lockedOut).toContain(a);
    expect(state.phase).toBe("question");
  });

  it("回答中でも問題の20秒で締め切られる", () => {
    const state = makeState(2);
    start(state, 0);
    const [a] = ids(state);
    // 出題から15秒後に押しても、問題の締め切りは20秒のまま
    handleBuzz(state, a, 0, 15_000);
    expect(answerDeadline(state)).toBe(BUZZ_WINDOW_MS);
    tick(state, BUZZ_WINDOW_MS);
    expect(state.phase).toBe("reveal");
    expect(findPlayer(state, a)?.score).toBe(-5);
  });

  it("最後の1人が押せずに問題の20秒が過ぎると正解表示になる", () => {
    const state = makeState(2);
    start(state, 0);
    const [a] = ids(state);
    const answer = QUESTIONS[state.questionIds[0]].answer;
    handleBuzz(state, a, 0, 100);
    handleAnswer(state, a, 0, (answer + 1) % 4, 200);
    // b は押さない
    tick(state, BUZZ_WINDOW_MS);
    expect(state.phase).toBe("reveal");
    expect(state.revealReason).toBe("question-timeout");
  });

  it("正解表示は3秒で次の問題へ進む", () => {
    const state = makeState(2);
    start(state, 0);
    const [a] = ids(state);
    handleBuzz(state, a, 0, 100);
    handleAnswer(state, a, 0, QUESTIONS[state.questionIds[0]].answer, 200);
    expect(state.phase).toBe("reveal");
    expect(tick(state, 200 + REVEAL_MS - 1)).toBe(false);
    expect(tick(state, 200 + REVEAL_MS)).toBe(true);
    expect(state.phase).toBe("question");
    expect(state.questionIndex).toBe(1);
    expect(state.lockedOut).toHaveLength(0);
  });
});

describe("ゲーム全体", () => {
  it("10問すべて正解すると finished になり、同点は同じ順位になる", () => {
    const state = makeState(4);
    start(state, 0);
    const first = ids(state)[0];
    let t = 0;
    for (let q = 0; q < TOTAL_QUESTIONS; q += 1) {
      expect(state.phase).toBe("question");
      expect(state.questionIndex).toBe(q);
      const answer = QUESTIONS[state.questionIds[q]].answer;
      expect(handleBuzz(state, first, q, t).ok).toBe(true);
      t += 10;
      expect(handleAnswer(state, first, q, answer, t).ok).toBe(true);
      t += 10;
      expect(state.phase).toBe("reveal");
      tick(state, t);
      t += REVEAL_MS;
      tick(state, t);
      t += 100;
    }
    expect(state.phase).toBe("finished");
    expect(state.players[0].score).toBe(100);
    expect(state.players.slice(1).every((p) => p.score === 0)).toBe(true);
    expect(ranking(state).map((r) => r.rank)).toEqual([1, 2, 2, 2]);
  });

  it("順位は点数の高い順で、同点は同順位", () => {
    const state = makeState(3);
    start(state, 0);
    state.players[0].score = 30;
    state.players[1].score = 10;
    state.players[2].score = 30;
    const ranks = ranking(state);
    expect(ranks.map((r) => r.score)).toEqual([30, 30, 10]);
    expect(ranks.map((r) => r.rank)).toEqual([1, 1, 3]);
  });
});

describe("配信する状態", () => {
  it("出題中と回答中は正解の番号を含まない", () => {
    const state = makeState(2);
    start(state, 0);
    const [a] = ids(state);
    const duringQuestion = toPublicState(state, a, 0);
    expect(duringQuestion.reveal).toBeNull();
    expect(JSON.stringify(duringQuestion)).not.toContain("answerIndex");

    handleBuzz(state, a, 0, 100);
    const duringAnswer = toPublicState(state, a, 100);
    expect(duringAnswer.reveal).toBeNull();
    expect(JSON.stringify(duringAnswer)).not.toContain("answerIndex");
  });

  it("正解表示のときだけ正解を送る", () => {
    const state = makeState(2);
    start(state, 0);
    const [a] = ids(state);
    const answer = QUESTIONS[state.questionIds[0]].answer;
    handleBuzz(state, a, 0, 100);
    handleAnswer(state, a, 0, answer, 200);
    const duringReveal = toPublicState(state, a, 200);
    expect(duringReveal.reveal?.answerIndex).toBe(answer);
    expect(duringReveal.reveal?.answerText).toBe(
      QUESTIONS[state.questionIds[0]].choices[answer],
    );
  });

  it("ほかの人の token は送らない", () => {
    const state = makeState(3);
    const publicState = toPublicState(state, state.hostId, 0);
    const text = JSON.stringify(publicState);
    for (const player of state.players) {
      expect(text).not.toContain(player.token);
    }
  });

  it("開始できるかどうかはホストにだけ true を返す", () => {
    const state = makeState(3);
    expect(toPublicState(state, state.hostId, 0).canStart).toBe(true);
    expect(toPublicState(state, state.players[1].id, 0).canStart).toBe(false);
    const one = makeState(1);
    expect(toPublicState(one, one.hostId, 0).canStart).toBe(false);
  });

  it("残り時間の締め切りが段階ごとに変わる", () => {
    const state = makeState(2);
    start(state, 0);
    expect(toPublicState(state, null, 0).deadline).toBe(BUZZ_WINDOW_MS);
    const [a] = ids(state);
    handleBuzz(state, a, 0, 1000);
    expect(toPublicState(state, a, 1000).deadline).toBe(1000 + ANSWER_WINDOW_MS);
    handleAnswer(state, a, 0, QUESTIONS[state.questionIds[0]].answer, 2000);
    expect(toPublicState(state, a, 2000).deadline).toBe(2000 + REVEAL_MS);
  });

  it("MIN_PLAYERS は2", () => {
    expect(MIN_PLAYERS).toBe(2);
  });
});
