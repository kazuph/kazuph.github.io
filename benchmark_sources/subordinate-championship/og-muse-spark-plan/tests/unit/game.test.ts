import { describe, expect, it } from "vitest";
import {
  answer,
  buzz,
  emptyRoom,
  joinRoom,
  nextDeadline,
  publicView,
  startGame,
  tick,
  ANSWER_MS,
  QUESTION_MS,
  REVEAL_MS,
  type RoomState,
} from "../../src/game.js";
import { QUESTIONS } from "../../src/questions.js";

function makeRoom(n: number, code = "ABC234"): RoomState {
  const st = emptyRoom(code);
  for (let i = 0; i < n; i++) {
    const r = joinRoom(st, `p${i}`, `id${i}`, `tok${i}`);
    if (!r.ok) throw new Error(`join failed: ${r.error}`);
  }
  return st;
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  const out: T[][] = [];
  xs.forEach((x, i) => {
    const rest = [...xs.slice(0, i), ...xs.slice(i + 1)];
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}

describe("定員と開始", () => {
  it("4人まで入れ、5人目は「満員です（4人まで）」で拒否", () => {
    const st = makeRoom(4);
    const r = joinRoom(st, "p4", "id4", "tok4");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("満員です（4人まで）");
    expect(st.players).toHaveLength(4);
  });

  it("開始は2〜4人・ホストだけ", () => {
    const one = makeRoom(1);
    expect(startGame(one, "id0", 1000).ok).toBe(false);

    const two = makeRoom(2);
    const notHost = startGame(two, "id1", 1000);
    expect(notHost.ok).toBe(false);
    if (!notHost.ok) expect(notHost.error).toContain("ホスト");

    const ok = startGame(two, "id0", 1000);
    expect(ok.ok).toBe(true);
    expect(two.phase).toBe("question");
    expect(two.questionOrder).toHaveLength(10);
  });

  it("開始後の参加は拒否", () => {
    const st = makeRoom(2);
    expect(startGame(st, "id0", 1000).ok).toBe(true);
    const r = joinRoom(st, "late", "idX", "tokX");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("ゲームはもう始まっています");
  });
});

describe("早押し", () => {
  it("4人のbuzzをどの順で処理しても最初の1人だけが回答権を得る（24通り）", () => {
    const orders = permutations(["id0", "id1", "id2", "id3"]);
    expect(orders).toHaveLength(24);
    for (const order of orders) {
      const st = makeRoom(4);
      expect(startGame(st, "id0", 1000).ok).toBe(true);
      const first = order[0]!;
      expect(buzz(st, first, 0, 1500).ok).toBe(true);
      expect(st.phase).toBe("answering");
      expect(st.answererId).toBe(first);
      for (const other of order.slice(1)) {
        const r = buzz(st, other, 0, 1501);
        expect(r.ok).toBe(false);
        expect(st.answererId).toBe(first);
      }
    }
  });

  it("古い問題番号のbuzzは無視", () => {
    const st = makeRoom(2);
    startGame(st, "id0", 1000);
    expect(buzz(st, "id0", 99, 1500).ok).toBe(false);
    expect(st.phase).toBe("question");
  });
});

describe("正誤判定と点数", () => {
  it("正解 +10 で reveal へ", () => {
    const st = makeRoom(2);
    startGame(st, "id0", 1000);
    const qi = st.questionOrder[0]!;
    const correct = QUESTIONS[qi]!.answer;
    buzz(st, "id0", 0, 1500);
    const r = answer(st, "id0", 0, correct, 1600);
    expect(r).toEqual({ ok: true, correct: true });
    expect(st.players[0]!.score).toBe(10);
    expect(st.phase).toBe("reveal");
  });

  it("不正解 -5 で失格、残りで早押し再開", () => {
    const st = makeRoom(3);
    startGame(st, "id0", 1000);
    const qi = st.questionOrder[0]!;
    const wrong = (QUESTIONS[qi]!.answer + 1) % 4;
    buzz(st, "id0", 0, 1500);
    const r = answer(st, "id0", 0, wrong, 1600);
    expect(r).toEqual({ ok: true, correct: false });
    expect(st.players[0]!.score).toBe(-5);
    expect(st.phase).toBe("question");
    expect(st.disqualified).toContain("id0");
    // 失格者の buzz は無視
    expect(buzz(st, "id0", 0, 1700).ok).toBe(false);
    // 残りの人は押せる
    expect(buzz(st, "id1", 0, 1800).ok).toBe(true);
    expect(st.answererId).toBe("id1");
  });

  it("回答10秒切れで -5 と失格", () => {
    const st = makeRoom(2);
    startGame(st, "id0", 1000);
    buzz(st, "id0", 0, 1500);
    tick(st, 1500 + ANSWER_MS + 1);
    expect(st.players[0]!.score).toBe(-5);
    expect(st.disqualified).toContain("id0");
    expect(st.phase).toBe("question");
    expect(st.answererId).toBeNull();
  });
});

describe("締め切り", () => {
  it("誰も押さず20秒で reveal", () => {
    const st = makeRoom(2);
    startGame(st, "id0", 1000);
    tick(st, 1000 + QUESTION_MS + 1);
    expect(st.phase).toBe("reveal");
    expect(st.lastCorrect).not.toBeNull();
  });

  it("回答中でも問題の20秒で締め切る（回答期限は問題期限に切り詰め）", () => {
    const st = makeRoom(2);
    startGame(st, "id0", 1000);
    // 問題期限ぎりぎり（残り2秒）に押す
    buzz(st, "id0", 0, 1000 + QUESTION_MS - 2000);
    expect(st.answerDeadline).toBe(1000 + QUESTION_MS);
    tick(st, 1000 + QUESTION_MS + 1);
    expect(st.phase).toBe("reveal");
  });

  it("全員失格で reveal", () => {
    const st = makeRoom(2);
    startGame(st, "id0", 1000);
    const qi = st.questionOrder[0]!;
    const wrong = (QUESTIONS[qi]!.answer + 1) % 4;
    buzz(st, "id0", 0, 1500);
    answer(st, "id0", 0, wrong, 1600);
    expect(st.phase).toBe("question");
    // 次の人は正解が分からず不正解…ではなく、ここでは回答タイムアウトで失格させる
    buzz(st, "id1", 0, 1700);
    tick(st, 1700 + ANSWER_MS + 1);
    expect(st.phase).toBe("reveal");
    expect(st.disqualified).toHaveLength(2);
  });

  it("reveal 3秒で次の問題へ、10問後に finished", () => {
    const st = makeRoom(2);
    startGame(st, "id0", 1000);
    let now = 1000;
    for (let q = 0; q < 10; q++) {
      expect(st.qIndex).toBe(q);
      expect(st.phase).toBe("question");
      const qi = st.questionOrder[q]!;
      const correct = QUESTIONS[qi]!.answer;
      buzz(st, "id0", q, now + 500);
      answer(st, "id0", q, correct, now + 600);
      expect(st.phase).toBe("reveal");
      now += 600 + REVEAL_MS + 1;
      tick(st, now);
    }
    expect(st.phase).toBe("finished");
    expect(nextDeadline(st)).toBeNull();
  });

  it("同点は同じ順位", () => {
    const st = makeRoom(4);
    startGame(st, "id0", 1000);
    st.players[0]!.score = 10;
    st.players[1]!.score = 10;
    st.players[2]!.score = -5;
    st.players[3]!.score = -5;
    st.phase = "finished";
    const view = publicView(st, "id0", 2000);
    const ranks = Object.fromEntries(
      (view.ranking ?? []).map((r) => [r.id, r.rank]),
    );
    expect(ranks["id0"]).toBe(1);
    expect(ranks["id1"]).toBe(1);
    expect(ranks["id2"]).toBe(3);
    expect(ranks["id3"]).toBe(3);
  });
});

describe("公開状態", () => {
  it("出題中・回答中は正解を含まない", () => {
    const st = makeRoom(2);
    startGame(st, "id0", 1000);
    const q1 = publicView(st, "id0", 1500);
    expect(q1.question).not.toBeNull();
    expect("answer" in (q1.question ?? {})).toBe(false);
    expect(q1.lastCorrect).toBeNull();
    buzz(st, "id0", 0, 1500);
    const q2 = publicView(st, "id1", 1600);
    expect(q2.lastCorrect).toBeNull();
    // token は含まない
    expect(JSON.stringify(q2)).not.toContain("tok0");
  });

  it("reveal では正解を含む", () => {
    const st = makeRoom(2);
    startGame(st, "id0", 1000);
    tick(st, 1000 + QUESTION_MS + 1);
    const v = publicView(st, "id0", 1000 + QUESTION_MS + 2);
    expect(v.lastCorrect).not.toBeNull();
  });
});
