import { describe, expect, it } from "vitest";
import {
  addPlayer,
  createRoom,
  joinError,
  nextDeadline,
  onAnswer,
  onBuzz,
  publicView,
  QUESTION_COUNT,
  ranking,
  remainingBuzzers,
  startError,
  startGame,
  tick,
  type RoomState,
} from "../../src/game";
import { QUESTIONS } from "../../src/questions";

const ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const correctOf = (pos: number) => QUESTIONS[ORDER[pos]].answer;

function ids(n: number): string[] {
  return [...Array(n).keys()].map((i) => `p${i}`);
}

// ロビーに n 人いる状態を作る（p0 がホスト）
function lobbyOf(n: number): RoomState {
  const st = createRoom("ABCDEF", "host", "p0", "tok0");
  for (let i = 1; i < n; i++) addPlayer(st, `user${i}`, `p${i}`, `tok${i}`);
  return st;
}

function started(n = 4, now = 1000): RoomState {
  const st = lobbyOf(n);
  const err = startGame(st, "p0", now, ORDER);
  expect(err).toBeNull();
  return st;
}

function perms<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i++) {
    for (const rest of perms([...xs.slice(0, i), ...xs.slice(i + 1)])) {
      out.push([xs[i], ...rest]);
    }
  }
  return out;
}

describe("定員と開始条件", () => {
  it("4人まで参加でき、5人目は拒否される", () => {
    const st = lobbyOf(4);
    expect(joinError(st, 0)).toBe("満員です（4人まで）");
  });

  it("3人までは参加できる", () => {
    expect(joinError(lobbyOf(1), 0)).toBeNull();
    expect(joinError(lobbyOf(3), 0)).toBeNull();
  });

  it("開始後の参加は拒否される", () => {
    const st = started(2);
    expect(joinError(st, 0)).toBe("ゲームはもう始まっています");
  });

  it("1人では開始できない", () => {
    const st = lobbyOf(1);
    expect(startError(st, "p0")).toBe("2人以上で開始してください");
  });

  it("5人では開始できない", () => {
    const st = lobbyOf(4);
    addPlayer(st, "x", "px", "tokx");
    expect(startError(st, "p0")).toBe("満員です（4人まで）");
  });

  it("ホスト以外は開始できない", () => {
    const st = lobbyOf(3);
    expect(startError(st, "p1")).toBe("開始できるのはホストだけです");
    expect(startGame(st, "p1", 0, ORDER)).not.toBeNull();
    expect(st.phase).toBe("lobby");
  });

  it("ホストが2〜4人で開始できる", () => {
    for (const n of [2, 3, 4]) {
      const st = lobbyOf(n);
      expect(startGame(st, "p0", 100, ORDER)).toBeNull();
      expect(st.phase).toBe("question");
    }
  });
});

describe("早押しは最初の1人だけ", () => {
  it("4人のbuzzをどの順番で処理しても回答権は最初の1人だけ（24通り）", () => {
    for (const order of perms(ids(4))) {
      const st = started(4, 1000);
      const results = order.map((pid) => onBuzz(st, pid, 0, 1000));
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(st.answererId).toBe(order[0]);
      expect(st.phase).toBe("answering");
    }
  });

  it("古い問題番号のbuzzは無視される", () => {
    const st = started(2);
    expect(onBuzz(st, "p1", 99, 1500)).toBe(false);
    expect(st.phase).toBe("question");
  });

  it("失格者のbuzzは無視される", () => {
    const st = started(2);
    expect(onBuzz(st, "p0", 0, 1000)).toBe(true);
    // p0 が不正解
    const wrong = (correctOf(0) + 1) % 4;
    onAnswer(st, "p0", 0, wrong, 1100, correctOf(0));
    expect(st.phase).toBe("question");
    expect(onBuzz(st, "p0", 0, 1200)).toBe(false);
    expect(onBuzz(st, "p1", 0, 1200)).toBe(true);
  });
});

describe("正誤判定と点数", () => {
  it("正解は +10点で reveal へ", () => {
    const st = started(3);
    onBuzz(st, "p2", 0, 1000);
    const r = onAnswer(st, "p2", 0, correctOf(0), 1500, correctOf(0));
    expect(r).toEqual({ ok: true, correct: true });
    expect(st.players.find((p) => p.id === "p2")!.score).toBe(10);
    expect(st.phase).toBe("reveal");
  });

  it("不正解は -5点で失格、残りがいれば出題中に戻る", () => {
    const st = started(3);
    onBuzz(st, "p1", 0, 1000);
    const wrong = (correctOf(0) + 1) % 4;
    const r = onAnswer(st, "p1", 0, wrong, 1500, correctOf(0));
    expect(r).toEqual({ ok: true, correct: false });
    expect(st.players.find((p) => p.id === "p1")!.score).toBe(-5);
    expect(st.phase).toBe("question");
    expect(remainingBuzzers(st).map((p) => p.id).sort()).toEqual(["p0", "p2"]);
  });

  it("回答権のない人の answer は拒否される", () => {
    const st = started(2);
    onBuzz(st, "p0", 0, 1000);
    const r = onAnswer(st, "p1", 0, 0, 1100, correctOf(0));
    expect(r.ok).toBe(false);
  });

  it("回答10秒切れは -5点と失格", () => {
    const st = started(2, 1000);
    onBuzz(st, "p0", 0, 1000);
    expect(st.answerDeadline).toBe(11000);
    tick(st, 11000, correctOf);
    expect(st.players.find((p) => p.id === "p0")!.score).toBe(-5);
    // p1 が残っているので出題中に戻る
    expect(st.phase).toBe("question");
    expect(st.wrongIds).toEqual(["p0"]);
  });

  it("点数はマイナスになってもよい", () => {
    const st = started(2);
    onBuzz(st, "p0", 0, 1000);
    onAnswer(st, "p0", 0, (correctOf(0) + 1) % 4, 1100, correctOf(0));
    expect(st.players.find((p) => p.id === "p0")!.score).toBe(-5);
  });
});

describe("時間切れ", () => {
  it("誰も押さず20秒で reveal（正解表示）", () => {
    const st = started(4, 1000);
    tick(st, 21000, correctOf);
    expect(st.phase).toBe("reveal");
    expect(st.lastReveal?.reason).toBe("question-timeout");
    expect(st.lastReveal?.correctChoice).toBe(correctOf(0));
  });

  it("回答中でも問題の20秒で締め切る", () => {
    // 15秒時点で押す → 回答締め切りは min(25秒, 20秒)=20秒
    const st = started(2, 0);
    expect(onBuzz(st, "p0", 0, 15000)).toBe(true);
    expect(st.answerDeadline).toBe(20000);
    tick(st, 20000, correctOf);
    expect(st.phase).toBe("reveal");
    expect(st.lastReveal?.reason).toBe("question-timeout");
  });

  it("全員失格で reveal", () => {
    const st = started(2, 1000);
    onBuzz(st, "p0", 0, 1100);
    onAnswer(st, "p0", 0, (correctOf(0) + 1) % 4, 1200, correctOf(0));
    expect(st.phase).toBe("question");
    onBuzz(st, "p1", 0, 1300);
    onAnswer(st, "p1", 0, (correctOf(0) + 2) % 4, 1400, correctOf(0));
    expect(st.phase).toBe("reveal");
    expect(st.lastReveal?.reason).toBe("wrong");
  });

  it("reveal の3秒後に次の問題へ進む", () => {
    const st = started(2, 1000);
    onBuzz(st, "p0", 0, 1100);
    onAnswer(st, "p0", 0, correctOf(0), 1200, correctOf(0));
    expect(st.phase).toBe("reveal");
    tick(st, 4200, correctOf);
    expect(st.phase).toBe("question");
    expect(st.qIndex).toBe(1);
    expect(st.wrongIds).toEqual([]);
  });
});

describe("終了と順位", () => {
  function finishAll(st: RoomState, now: number): number {
    let t = now;
    for (let i = 0; i < QUESTION_COUNT; i++) {
      // p0 が毎問正解
      onBuzz(st, "p0", st.qIndex, t + 100);
      onAnswer(st, "p0", st.qIndex, correctOf(st.qIndex), t + 200, correctOf(st.qIndex));
      t += 4000;
      tick(st, t, correctOf);
    }
    return t;
  }

  it("10問終わったら finished", () => {
    const st = started(2, 1000);
    finishAll(st, 1000);
    expect(st.phase).toBe("finished");
    expect(st.players.find((p) => p.id === "p0")!.score).toBe(100);
  });

  it("同点は同じ順位", () => {
    const st = createRoom("ABCDEF", "a", "p0", "t0");
    addPlayer(st, "b", "p1", "t1");
    addPlayer(st, "c", "p2", "t2");
    st.players[0].score = 20;
    st.players[1].score = 20;
    st.players[2].score = 5;
    st.phase = "finished";
    const r = ranking(st);
    expect(r.filter((x) => x.score === 20).map((x) => x.rank)).toEqual([1, 1]);
    expect(r.find((x) => x.score === 5)!.rank).toBe(3);
  });

  it("nextDeadline はいちばん近い締め切りを返す", () => {
    const st = started(2, 1000);
    expect(nextDeadline(st)).toBe(21000);
    onBuzz(st, "p0", 0, 2000);
    expect(nextDeadline(st)).toBe(12000);
  });
});

describe("公開状態の秘匿", () => {
  it("出題中・回答中の状態に正解が含まれない", () => {
    const st = started(2, 1000);
    const v1 = publicView(st, "p0", 1500);
    expect(st.phase).toBe("question");
    expect(v1.correctChoice).toBeNull();
    expect(v1.lastReveal).toBeNull();
    onBuzz(st, "p1", 0, 1600);
    expect(st.phase).toBe("answering");
    // 回答者本人・他人どちらの視点でも正解は見えない
    expect(publicView(st, "p0", 1700).correctChoice).toBeNull();
    expect(publicView(st, "p1", 1700).correctChoice).toBeNull();
    expect(publicView(st, "p1", 1700).question).not.toBeNull();
  });

  it("reveal では正解が含まれる", () => {
    const st = started(2, 1000);
    tick(st, 21000, correctOf);
    const v = publicView(st, "p0", 21000);
    expect(v.correctChoice).toBe(correctOf(0));
    expect(v.lastReveal?.correctChoice).toBe(correctOf(0));
  });

  it("他人の token は含まれない", () => {
    const st = started(2, 1000);
    const v = JSON.stringify(publicView(st, "p0", 1500));
    expect(v).not.toContain("tok1");
  });
});

describe("問題データ", () => {
  it("12問以上あり、すべて4択で正解番号が範囲内", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(12);
    for (const q of QUESTIONS) {
      expect(q.choices).toHaveLength(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThanOrEqual(3);
      expect(q.q.length).toBeGreaterThan(0);
    }
  });

  it("毎回そこから10問選べる（重複なし）", () => {
    expect(QUESTION_COUNT).toBe(10);
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(QUESTION_COUNT);
  });
});
