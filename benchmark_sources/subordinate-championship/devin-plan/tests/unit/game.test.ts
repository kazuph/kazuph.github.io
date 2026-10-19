import { describe, expect, it } from "vitest";
import {
  ANSWER_MS,
  addPlayer,
  answer,
  buzz,
  createRoom,
  QUESTION_MS,
  ranks,
  serialize,
  startGame,
  tick,
  TOTAL_QUESTIONS,
  type RoomState,
} from "../../src/game";
import { QUESTIONS } from "../../src/questions";

// 決定的な順番で始めた部屋。時刻は t=0 に開始、問題の締め切りは 20000。
function startedRoom(n = 4, at = 0): RoomState {
  const s = createRoom("TEST12");
  for (let i = 0; i < n; i++) addPlayer(s, `p${i}`, `Player${i}`);
  const r = startGame(s, "p0", at, () => 0.5);
  if (!r.ok) throw new Error("startGame failed");
  return s;
}

function correctChoice(s: RoomState): number {
  return QUESTIONS[s.order[s.qIndex]].answer;
}

function wrongChoice(s: RoomState): number {
  return (correctChoice(s) + 1) % 4;
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

describe("部屋と参加者", () => {
  it("定員は4人で5人目は満員エラー", () => {
    const s = createRoom("TEST12");
    for (let i = 0; i < 4; i++) {
      expect(addPlayer(s, `p${i}`, `P${i}`)).toEqual({ ok: true });
    }
    const r = addPlayer(s, "p4", "P4");
    expect(r).toEqual({ ok: false, error: "満員です（4人まで）" });
    expect(s.players).toHaveLength(4);
  });

  it("最初の参加者がホストになる", () => {
    const s = createRoom("TEST12");
    addPlayer(s, "p0", "A");
    addPlayer(s, "p1", "B");
    expect(s.hostId).toBe("p0");
  });

  it("開始後の参加は拒否される", () => {
    const s = startedRoom(2);
    expect(addPlayer(s, "p9", "X")).toEqual({
      ok: false,
      error: "ゲームはもう始まっています",
    });
  });

  it("開始はホストだけ。2〜4人のときだけ", () => {
    const solo = createRoom("A");
    addPlayer(solo, "p0", "A");
    expect(startGame(solo, "p0", 0, Math.random)).toEqual({
      ok: false,
      error: "2人以上で開始できます",
    });

    const two = createRoom("B");
    addPlayer(two, "p0", "A");
    addPlayer(two, "p1", "B");
    expect(startGame(two, "p1", 0, Math.random)).toEqual({
      ok: false,
      error: "ホストだけが開始できます",
    });
    expect(startGame(two, "p0", 0, Math.random)).toEqual({ ok: true });
    expect(two.phase).toBe("question");

    const four = startedRoom(4);
    expect(startGame(four, "p0", 0, Math.random)).toEqual({
      ok: false,
      error: "ゲームはもう始まっています",
    });
  });
});

describe("早押し", () => {
  it("4人のbuzzをどの順で処理しても回答権は最初の1人だけ（全24通り）", () => {
    const perms = permutations(["p0", "p1", "p2", "p3"]);
    expect(perms).toHaveLength(24);
    for (const perm of perms) {
      const s = startedRoom(4);
      const results = perm.map((id) => buzz(s, id, 0, 100));
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(results[0]).toBe(true);
      expect(s.phase).toBe("answering");
      expect(s.answererId).toBe(perm[0]);
    }
  });

  it("失格した人のbuzzは無視される", () => {
    const s = startedRoom(2);
    buzz(s, "p0", 0, 100);
    answer(s, "p0", 0, wrongChoice(s), 200);
    expect(s.phase).toBe("question");
    expect(buzz(s, "p0", 0, 300)).toBe(false);
    expect(buzz(s, "p1", 0, 300)).toBe(true);
    expect(s.answererId).toBe("p1");
  });

  it("古い問題番号のbuzzは無視される", () => {
    const s = startedRoom(2);
    expect(buzz(s, "p0", 5, 100)).toBe(false);
    expect(s.phase).toBe("question");
  });

  it("answering中のbuzzは無視される", () => {
    const s = startedRoom(2);
    buzz(s, "p0", 0, 100);
    expect(buzz(s, "p1", 0, 200)).toBe(false);
    expect(s.answererId).toBe("p0");
  });
});

describe("回答と点数", () => {
  it("正解は+10でrevealへ", () => {
    const s = startedRoom(2);
    buzz(s, "p0", 0, 100);
    const c = correctChoice(s);
    expect(answer(s, "p0", 0, c, 200)).toBe(true);
    expect(s.players[0].score).toBe(10);
    expect(s.phase).toBe("reveal");
  });

  it("不正解は-5で失格、残りがいればquestionに戻る", () => {
    const s = startedRoom(3);
    buzz(s, "p1", 0, 100);
    answer(s, "p1", 0, wrongChoice(s), 200);
    expect(s.players[1].score).toBe(-5);
    expect(s.players[1].out).toBe(true);
    expect(s.phase).toBe("question");
    // 問題の締め切りは変わっていない
    expect(s.questionEndsAt).toBe(QUESTION_MS);
  });

  it("回答10秒切れは-5で失格", () => {
    const s = startedRoom(2);
    buzz(s, "p0", 0, 1000);
    expect(s.answerEndsAt).toBe(1000 + ANSWER_MS);
    tick(s, 1000 + ANSWER_MS);
    expect(s.players[0].score).toBe(-5);
    expect(s.players[0].out).toBe(true);
    expect(s.phase).toBe("question");
  });

  it("回答権のない人のanswerは無視される", () => {
    const s = startedRoom(2);
    buzz(s, "p0", 0, 100);
    expect(answer(s, "p1", 0, correctChoice(s), 200)).toBe(false);
    expect(s.players[1].score).toBe(0);
    expect(s.answererId).toBe("p0");
  });

  it("回答の締め切りは「押した時刻+10秒」と「問題の締め切り」の早いほう", () => {
    const s = startedRoom(2);
    // 問題の残りが5秒の時点で押す → 締め切りは問題の20秒
    buzz(s, "p0", 0, 15_000);
    expect(s.answerEndsAt).toBe(20_000);
  });
});

describe("締め切りと進行", () => {
  it("問題の20秒切れでreveal（誰も押さなくても）", () => {
    const s = startedRoom(2);
    tick(s, QUESTION_MS);
    expect(s.phase).toBe("reveal");
    expect(s.revealEndsAt).toBe(QUESTION_MS + 3_000);
  });

  it("回答中でも問題の20秒で締め切られrevealになる", () => {
    const s = startedRoom(2);
    buzz(s, "p0", 0, 15_000);
    tick(s, 20_000);
    expect(s.players[0].score).toBe(-5);
    expect(s.phase).toBe("reveal");
  });

  it("全員失格でreveal", () => {
    const s = startedRoom(4);
    for (const id of ["p0", "p1", "p2", "p3"]) {
      const t = 100;
      expect(buzz(s, id, 0, t)).toBe(true);
      answer(s, id, 0, wrongChoice(s), t + 10);
    }
    expect(s.phase).toBe("reveal");
    expect(s.players.every((p) => p.score === -5)).toBe(true);
  });

  it("revealは3秒で次の問題へ進む", () => {
    const s = startedRoom(2);
    tick(s, QUESTION_MS); // reveal
    tick(s, QUESTION_MS + 3_000);
    expect(s.phase).toBe("question");
    expect(s.qIndex).toBe(1);
    expect(s.questionEndsAt).toBe(QUESTION_MS + 3_000 + QUESTION_MS);
  });

  it("10問終わるとfinishedになる", () => {
    const s = startedRoom(2);
    let now = 0;
    for (let q = 0; q < TOTAL_QUESTIONS; q++) {
      buzz(s, "p0", q, now + 100);
      answer(s, "p0", q, correctChoice(s), now + 200);
      expect(s.phase).toBe("reveal");
      now = s.revealEndsAt!;
      tick(s, now);
    }
    expect(s.phase).toBe("finished");
    expect(s.qIndex).toBe(TOTAL_QUESTIONS);
    expect(s.players[0].score).toBe(100);
  });

  it("Alarmが遅れても締め切りを過ぎた処理は一度にまとめて進む", () => {
    const s = startedRoom(2);
    // 回答中に回答締め切りと問題締め切りの両方を越えた遅いtick →
    // 時間切れの-5・失格・revealまで一度に進む（revealは処理時刻から3秒）
    buzz(s, "p0", 0, 15_000);
    tick(s, 28_000);
    expect(s.players[0].score).toBe(-5);
    expect(s.players[0].out).toBe(true);
    expect(s.phase).toBe("reveal");
    expect(s.revealEndsAt).toBe(31_000);
    tick(s, 31_000);
    expect(s.phase).toBe("question");
    expect(s.qIndex).toBe(1);
  });
});

describe("順位", () => {
  it("点数順、同点は同じ順位", () => {
    const s = startedRoom(4);
    s.players[0].score = 20;
    s.players[1].score = 10;
    s.players[2].score = 10;
    s.players[3].score = -5;
    const r = ranks(s.players);
    expect(r.get("p0")).toBe(1);
    expect(r.get("p1")).toBe(2);
    expect(r.get("p2")).toBe(2);
    expect(r.get("p3")).toBe(4);
  });
});

describe("状態の配信", () => {
  it("出題中・回答中は正解が含まれない", () => {
    const s = startedRoom(2);
    const during = serialize(s, "p0", 100);
    expect(during.question).not.toBeNull();
    expect(during.question!.answer).toBeNull();

    buzz(s, "p0", 0, 100);
    const answering = serialize(s, "p1", 200);
    expect(answering.question!.answer).toBeNull();
  });

  it("revealでは正解が含まれる", () => {
    const s = startedRoom(2);
    tick(s, QUESTION_MS);
    const view = serialize(s, "p0", QUESTION_MS + 10);
    expect(view.question!.answer).toBe(correctChoice(s));
  });

  it("状態にtokenや他人の秘密情報は含まれない", () => {
    const s = startedRoom(2);
    const view = serialize(s, "p0", 100);
    const json = JSON.stringify(view);
    expect(json).not.toContain("token");
    expect(view.you).toBe("p0");
  });
});
