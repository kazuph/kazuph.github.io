import { describe, expect, it } from "vitest";
import * as g from "../../src/game";
import { QUESTIONS } from "../../src/questions";

const T0 = 1_000_000;
const ids = ["a", "b", "c", "d"];
const player = (id: string): g.Player => ({ id, name: id.toUpperCase(), token: `tok-${id}`, score: 0 });

function lobby(count: number): g.GameState {
  let s = g.createGame(player(ids[0]));
  for (const id of ids.slice(1, count)) {
    const r = g.addPlayer(s, player(id));
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  }
  return s;
}

function started(count = 4, order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]): g.GameState {
  const r = g.startGame(lobby(count), "a", T0, order);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function must(r: g.Result): g.GameState {
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

const scoreOf = (s: g.GameState, id: string) => s.players.find((p) => p.id === id)!.score;
const correctOf = (s: g.GameState) => QUESTIONS[s.questionIds[s.qIndex]].answer;
const wrongOf = (s: g.GameState) => (correctOf(s) + 1) % 4;

describe("ロビー", () => {
  it("定員は4人で、5人目は理由つきで断られる", () => {
    const full = lobby(4);
    expect(full.players).toHaveLength(4);
    const r = g.addPlayer(full, player("e"));
    expect(r).toEqual({ ok: false, error: "満員です（4人まで）" });
  });

  it("開始後の参加は断られる", () => {
    const r = g.addPlayer(started(2), player("z"));
    expect(r).toEqual({ ok: false, error: "ゲームはもう始まっています" });
  });

  it("開始できるのは2〜4人のときだけ", () => {
    expect(g.startGame(lobby(1), "a", T0, [0]).ok).toBe(false);
    for (const n of [2, 3, 4]) expect(g.startGame(lobby(n), "a", T0, [0]).ok).toBe(true);
  });

  it("開始できるのはホストだけ", () => {
    const r = g.startGame(lobby(3), "b", T0, [0]);
    expect(r).toEqual({ ok: false, error: "開始できるのはホストだけです" });
  });

  it("内蔵問題は12問以上あり、10問が重複なしで選ばれる", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(12);
    const picked = g.pickQuestionIds();
    expect(picked).toHaveLength(10);
    expect(new Set(picked).size).toBe(10);
  });
});

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((p) => [x, ...p]));
}

describe("早押し", () => {
  it("4人の buzz をどの順で処理しても、回答権を得るのは最初の1人だけ（24通り）", () => {
    const orders = permutations(ids);
    expect(orders).toHaveLength(24);
    for (const order of orders) {
      let s = started();
      let winners = 0;
      for (const id of order) {
        const r = g.buzz(s, id, 0, T0 + 100);
        if (r.ok) {
          s = r.state;
          winners++;
        }
      }
      expect(winners).toBe(1);
      expect(s.phase).toBe("answering");
      expect(s.answerer).toBe(order[0]);
    }
  });

  it("古い問題番号の buzz は無視される", () => {
    expect(g.buzz(started(), "a", 3, T0 + 100).ok).toBe(false);
  });

  it("回答中でない人は回答できない", () => {
    const s = must(g.buzz(started(), "a", 0, T0 + 100));
    expect(g.answer(s, "b", 0, 0, T0 + 200).ok).toBe(false);
  });

  it("参加者でない人の buzz は無視される", () => {
    expect(g.buzz(started(), "zzz", 0, T0 + 100).ok).toBe(false);
  });
});

describe("回答と点数", () => {
  it("正解は +10 点で reveal へ進む", () => {
    let s = must(g.buzz(started(), "a", 0, T0 + 100));
    s = must(g.answer(s, "a", 0, correctOf(s), T0 + 200));
    expect(scoreOf(s, "a")).toBe(10);
    expect(s.phase).toBe("reveal");
  });

  it("不正解は -5 点でその人だけ失格になり、残りの人で早押しが再開される", () => {
    let s = must(g.buzz(started(), "a", 0, T0 + 100));
    s = must(g.answer(s, "a", 0, wrongOf(s), T0 + 200));
    expect(scoreOf(s, "a")).toBe(-5);
    expect(s.phase).toBe("question");
    expect(s.disqualified).toEqual(["a"]);
    expect(g.buzz(s, "a", 0, T0 + 300).ok).toBe(false);
    expect(g.buzz(s, "b", 0, T0 + 300).ok).toBe(true);
  });

  it("回答の10秒を過ぎると -5 点で失格になる", () => {
    let s = must(g.buzz(started(), "a", 0, T0 + 1000));
    s = g.tick(s, T0 + 1000 + g.ANSWER_MS - 1);
    expect(s.phase).toBe("answering");
    s = g.tick(s, T0 + 1000 + g.ANSWER_MS);
    expect(scoreOf(s, "a")).toBe(-5);
    expect(s.disqualified).toEqual(["a"]);
    expect(s.phase).toBe("question");
  });

  it("回答時間切れの後の回答は受け付けられない", () => {
    const s = must(g.buzz(started(), "a", 0, T0 + 1000));
    expect(g.answer(s, "a", 0, correctOf(s), T0 + 1000 + g.ANSWER_MS).ok).toBe(false);
  });

  it("点数はマイナスになってよい", () => {
    let s = started(2);
    s = must(g.buzz(s, "a", 0, T0 + 10));
    s = must(g.answer(s, "a", 0, wrongOf(s), T0 + 20));
    expect(scoreOf(s, "a")).toBeLessThan(0);
  });
});

describe("時間切れ", () => {
  it("誰も押さないまま20秒たつと reveal になる", () => {
    const s = started();
    expect(g.tick(s, T0 + g.QUESTION_MS - 1).phase).toBe("question");
    expect(g.tick(s, T0 + g.QUESTION_MS).phase).toBe("reveal");
  });

  it("回答中でも問題の20秒で締め切られ、回答者は -5 点になる", () => {
    const s = must(g.buzz(started(), "a", 0, T0 + 15_000));
    expect(s.answerDeadline).toBe(T0 + g.QUESTION_MS);
    const t = g.tick(s, T0 + g.QUESTION_MS);
    expect(t.phase).toBe("reveal");
    expect(scoreOf(t, "a")).toBe(-5);
  });

  it("全員が失格になったら reveal になる", () => {
    let s = started(3);
    for (const [i, id] of ["a", "b", "c"].entries()) {
      s = must(g.buzz(s, id, 0, T0 + 100 * (i + 1)));
      s = must(g.answer(s, id, 0, wrongOf(s), T0 + 100 * (i + 1) + 50));
    }
    expect(s.phase).toBe("reveal");
    expect(g.toPublic(s, new Set()).correct).toBe(correctOf(s));
  });

  it("reveal は3秒で、次の問題の20秒はそこから数える", () => {
    const s = g.tick(started(), T0 + g.QUESTION_MS);
    const revealStart = T0 + g.QUESTION_MS;
    expect(g.tick(s, revealStart + g.REVEAL_MS - 1).phase).toBe("reveal");
    const next = g.tick(s, revealStart + g.REVEAL_MS);
    expect(next.phase).toBe("question");
    expect(next.qIndex).toBe(1);
    expect(next.questionDeadline).toBe(revealStart + g.REVEAL_MS + g.QUESTION_MS);
  });

  it("長く止まっていても、締め切りを時刻順にまとめて進められる", () => {
    const end = g.tick(started(), T0 + 10 * 60_000);
    expect(end.phase).toBe("finished");
  });
});

describe("終了と順位", () => {
  it("10問終わると finished になる", () => {
    let s = started();
    for (let q = 0; q < 10; q++) {
      expect(s.qIndex).toBe(q);
      const at = s.questionDeadline - g.QUESTION_MS + 100;
      s = must(g.buzz(s, "a", q, at));
      s = must(g.answer(s, "a", q, correctOf(s), at + 100));
      s = g.tick(s, s.revealUntil);
    }
    expect(s.phase).toBe("finished");
    expect(scoreOf(s, "a")).toBe(100);
  });

  it("同点は同じ順位になる", () => {
    const players = [
      { ...player("a"), score: 20 },
      { ...player("b"), score: 20 },
      { ...player("c"), score: 5 },
      { ...player("d"), score: -5 },
    ];
    expect(g.ranking(players).map((r) => r.rank)).toEqual([1, 1, 3, 4]);
  });
});

describe("公開する状態", () => {
  it("出題中の状態に正解も token も含まれない", () => {
    const s = must(g.buzz(started(), "a", 0, T0 + 100));
    const text = JSON.stringify(g.toPublic(s, new Set(ids)));
    expect(g.toPublic(s, new Set(ids)).correct).toBeNull();
    expect(text).not.toContain("tok-");
    expect(text).not.toContain("token");
    expect(text).not.toContain('"answer"');
  });

  it("回答中の不正解の選択肢も、reveal まで見えない", () => {
    let s = must(g.buzz(started(), "a", 0, T0 + 100));
    s = must(g.answer(s, "a", 0, wrongOf(s), T0 + 200));
    expect(g.toPublic(s, new Set()).attempts[0].choice).toBeNull();
  });

  it("reveal のときだけ正解の番号が入る", () => {
    const s = g.tick(started(), T0 + g.QUESTION_MS);
    expect(g.toPublic(s, new Set()).correct).toBe(correctOf(s));
  });

  it("切断中の人は connected: false になる", () => {
    const view = g.toPublic(started(), new Set(["a", "b"]));
    expect(view.players.map((p) => p.connected)).toEqual([true, true, false, false]);
  });
});
