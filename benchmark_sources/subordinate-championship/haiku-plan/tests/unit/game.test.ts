import { describe, expect, it } from "vitest";
import {
  ANSWER_MS,
  QUESTION_MS,
  REVEAL_MS,
  applyAction,
  createGame,
  joinGame,
  parseAction,
  ranking,
  tick,
  viewFor,
  type GameState,
  type Player,
} from "../../src/game";
import { QUESTIONS } from "../../src/questions";

const T0 = 1_000_000;
const IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function player(id: string): Player {
  return { id, name: `名前${id}`, token: `token-${id}`, score: 0, connected: true };
}

// p0 がホストの部屋。players 人まで参加させる（lobby のまま）。
function lobbyWith(count: number): GameState {
  let s = createGame("ABCDEF", player("p0"), IDS);
  for (let i = 1; i < count; i++) {
    const step = joinGame(s, player(`p${i}`));
    s = step.state;
  }
  return s;
}

// count 人で開始した直後（question・qIndex 0・時刻 T0）
function startedWith(count: number): GameState {
  const step = applyAction(lobbyWith(count), "p0", { t: "start" }, T0);
  expect(step.error).toBeUndefined();
  return step.state;
}

function answerOfCurrent(s: GameState): number {
  return QUESTIONS[s.questionIds[s.qIndex]].answer;
}

function wrongChoiceOfCurrent(s: GameState): number {
  return (answerOfCurrent(s) + 1) % 4;
}

function scoreOf(s: GameState, id: string): number {
  return s.players.find((p) => p.id === id)!.score;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

describe("参加と定員", () => {
  it("4人までは入れ、5人目は満員エラーになる", () => {
    const s = lobbyWith(4);
    expect(s.players).toHaveLength(4);
    const step = joinGame(s, player("p4"));
    expect(step.error).toBe("満員です（4人まで）");
    expect(step.state.players).toHaveLength(4);
  });

  it("開始後の新規参加は拒否する", () => {
    const step = joinGame(startedWith(2), player("p9"));
    expect(step.error).toBe("ゲームはもう始まっています");
  });
});

describe("開始", () => {
  it("ホスト以外は開始できない", () => {
    const step = applyAction(lobbyWith(3), "p1", { t: "start" }, T0);
    expect(step.error).toBe("開始できるのはホストだけです");
    expect(step.state.phase).toBe("lobby");
  });

  it("1人では開始できず、2人から開始できる", () => {
    const solo = applyAction(lobbyWith(1), "p0", { t: "start" }, T0);
    expect(solo.error).toMatch(/2人以上/);
    expect(solo.state.phase).toBe("lobby");
    expect(startedWith(2).phase).toBe("question");
  });

  it("4人でも開始できる", () => {
    expect(startedWith(4).phase).toBe("question");
  });
});

describe("早押し", () => {
  it("4人の buzz をどの順で処理しても、回答権を得るのは最初の1人だけ（24通り）", () => {
    const ids = ["p0", "p1", "p2", "p3"];
    for (const order of permutations(ids)) {
      let s = startedWith(4);
      order.forEach((id, i) => {
        s = applyAction(s, id, { t: "buzz", q: 0 }, T0 + 1 + i).state;
      });
      expect(s.phase).toBe("answering");
      expect(s.answerer).toBe(order[0]);
    }
  });

  it("古い問題番号の buzz は無視する", () => {
    const s = applyAction(startedWith(2), "p1", { t: "buzz", q: 5 }, T0 + 1).state;
    expect(s.phase).toBe("question");
    expect(s.answerer).toBeNull();
  });

  it("失格した人の buzz は無視する", () => {
    let s = applyAction(startedWith(3), "p1", { t: "buzz", q: 0 }, T0 + 1).state;
    s = applyAction(s, "p1", { t: "answer", q: 0, choice: wrongChoiceOfCurrent(s) }, T0 + 2).state;
    expect(s.failed).toEqual(["p1"]);
    const again = applyAction(s, "p1", { t: "buzz", q: 0 }, T0 + 3).state;
    expect(again.phase).toBe("question");
    expect(again.answerer).toBeNull();
  });
});

describe("採点", () => {
  it("正解で +10 し、正解を表示する reveal へ進む", () => {
    let s = applyAction(startedWith(2), "p0", { t: "buzz", q: 0 }, T0 + 1).state;
    s = applyAction(s, "p0", { t: "answer", q: 0, choice: answerOfCurrent(s) }, T0 + 2).state;
    expect(scoreOf(s, "p0")).toBe(10);
    expect(s.phase).toBe("reveal");
    expect(s.result).toMatchObject({ by: "p0", correct: true });
  });

  it("不正解で -5 し、その人はこの問題で失格。残りの人がいれば question に戻る", () => {
    let s = applyAction(startedWith(3), "p0", { t: "buzz", q: 0 }, T0 + 1).state;
    s = applyAction(s, "p0", { t: "answer", q: 0, choice: wrongChoiceOfCurrent(s) }, T0 + 2).state;
    expect(scoreOf(s, "p0")).toBe(-5);
    expect(s.failed).toEqual(["p0"]);
    expect(s.phase).toBe("question");
    expect(s.questionDeadline).toBe(T0 + QUESTION_MS);
  });

  it("回答の10秒切れで -5 し、失格になる", () => {
    const buzzed = applyAction(startedWith(3), "p1", { t: "buzz", q: 0 }, T0 + 1000).state;
    const s = tick(buzzed, T0 + 1000 + ANSWER_MS);
    expect(scoreOf(s, "p1")).toBe(-5);
    expect(s.failed).toEqual(["p1"]);
    expect(s.phase).toBe("question");
  });

  it("回答の締め切り前は時間切れにならない", () => {
    const buzzed = applyAction(startedWith(3), "p1", { t: "buzz", q: 0 }, T0 + 1000).state;
    const s = tick(buzzed, T0 + 1000 + ANSWER_MS - 1);
    expect(s.phase).toBe("answering");
    expect(scoreOf(s, "p1")).toBe(0);
  });
});

describe("締め切り", () => {
  it("問題の20秒切れで、誰も答えなくても reveal になる", () => {
    const s = tick(startedWith(2), T0 + QUESTION_MS);
    expect(s.phase).toBe("reveal");
    expect(s.result).toMatchObject({ by: null, choice: null, correct: false });
    expect(s.revealUntil).toBe(T0 + QUESTION_MS + REVEAL_MS);
  });

  it("回答中でも問題の20秒で締め切り、回答者は -5 で reveal になる", () => {
    const buzzed = applyAction(startedWith(3), "p2", { t: "buzz", q: 0 }, T0 + 15_000).state;
    expect(buzzed.answerDeadline).toBe(T0 + QUESTION_MS);
    const s = tick(buzzed, T0 + QUESTION_MS);
    expect(s.phase).toBe("reveal");
    expect(scoreOf(s, "p2")).toBe(-5);
    expect(s.result).toMatchObject({ by: "p2", correct: false });
  });

  it("全員失格で reveal になる", () => {
    let s = startedWith(2);
    s = applyAction(s, "p0", { t: "buzz", q: 0 }, T0 + 1).state;
    s = applyAction(s, "p0", { t: "answer", q: 0, choice: wrongChoiceOfCurrent(s) }, T0 + 2).state;
    s = applyAction(s, "p1", { t: "buzz", q: 0 }, T0 + 3).state;
    s = applyAction(s, "p1", { t: "answer", q: 0, choice: wrongChoiceOfCurrent(s) }, T0 + 4).state;
    expect(s.phase).toBe("reveal");
    expect(s.failed).toEqual(["p0", "p1"]);
  });

  it("reveal の3秒後に次の問題へ進む", () => {
    const revealed = tick(startedWith(2), T0 + QUESTION_MS);
    const next = tick(revealed, revealed.revealUntil);
    expect(next.phase).toBe("question");
    expect(next.qIndex).toBe(1);
    expect(next.failed).toEqual([]);
  });
});

describe("終了と順位", () => {
  it("10問後に finished になり、同点は同じ順位になる", () => {
    let s = startedWith(4);
    let now = T0;
    for (let i = 0; i < 10; i++) {
      now += 1;
      s = applyAction(s, "p0", { t: "buzz", q: i }, now).state;
      s = applyAction(s, "p0", { t: "answer", q: i, choice: answerOfCurrent(s) }, now + 1).state;
      now = s.revealUntil;
      s = tick(s, now);
    }
    expect(s.phase).toBe("finished");
    expect(scoreOf(s, "p0")).toBe(100);
    const ranks = Object.fromEntries(ranking(s.players).map((r) => [r.id, r.rank]));
    expect(ranks).toEqual({ p0: 1, p1: 2, p2: 2, p3: 2 });
  });

  it("マイナス点を含めて順位を付ける", () => {
    const players = [
      { ...player("a"), score: -5 },
      { ...player("b"), score: 10 },
      { ...player("c"), score: 10 },
    ];
    expect(ranking(players).map((r) => [r.id, r.rank])).toEqual([
      ["b", 1],
      ["c", 1],
      ["a", 3],
    ]);
  });
});

describe("出題中の画面", () => {
  it("出題中の状態に正解を含めない", () => {
    const s = startedWith(2);
    const view = viewFor(s, "p0", T0);
    expect(view.result).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/"answer"/);
    expect(view.question?.choices).toHaveLength(4);
  });

  it("reveal のときだけ正解の番号を送る", () => {
    const s = tick(startedWith(2), T0 + QUESTION_MS);
    const view = viewFor(s, "p0", T0 + QUESTION_MS);
    expect(view.result?.answer).toBe(answerOfCurrent(s));
  });

  it("他の人のトークンを送らない", () => {
    const view = viewFor(startedWith(2), "p0", T0);
    expect(JSON.stringify(view)).not.toContain("token-");
  });
});

describe("問題と入力の検査", () => {
  it("内蔵問題は12問以上で、選択肢は4つ、正解は0〜3", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(12);
    for (const question of QUESTIONS) {
      expect(new Set(question.choices).size).toBe(4);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThanOrEqual(3);
    }
  });

  it("不正な入力メッセージは parseAction が null を返す", () => {
    expect(parseAction({ t: "buzz" })).toBeNull();
    expect(parseAction({ t: "unknown" })).toBeNull();
    expect(parseAction(null)).toBeNull();
    expect(parseAction({ t: "answer", q: 0, choice: 1 })).toEqual({ t: "answer", q: 0, choice: 1 });
  });
});

describe("出題中に出す直近の失格", () => {
  it("時間切れの失格は lastMiss に残り、次の問題では消える", () => {
    const buzzed = applyAction(startedWith(3), "p1", { t: "buzz", q: 0 }, T0 + 1000).state;
    const s = tick(buzzed, T0 + 1000 + ANSWER_MS);
    expect(s.lastMiss).toEqual({ by: "p1", timeout: true });
    expect(viewFor(s, "p0", T0).lastMiss).toEqual({ by: "p1", timeout: true });
    const revealed = tick(startedWith(2), T0 + QUESTION_MS);
    const next = tick(revealed, revealed.revealUntil);
    expect(next.lastMiss).toBeNull();
  });
});
