import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, answer, buzz, disconnect, join, newGame, nextWake, planQuestions, snapshot, start, tick, type GameConfig, type GameState } from "../../src/game";
import { QUESTIONS } from "../../src/questions";

const cfg: GameConfig = { ...DEFAULT_CONFIG };
const T0 = 1_000_000;

function lobby(names: string[]) {
  const g = newGame("ABCD");
  const ps = names.map((n) => {
    const r = join(g, cfg, T0, n);
    if (!r.ok) throw new Error(r.message);
    return r.player;
  });
  return { g, ps };
}
function started(n: number) {
  const { g, ps } = lobby(["あ", "い", "う", "え"].slice(0, n));
  const r = start(g, cfg, T0, ps[0].id);
  expect(r.ok).toBe(true);
  return { g, ps };
}
const correctIdx = (g: GameState) => g.plan[g.qIndex].answer;
const wrongIdx = (g: GameState) => (correctIdx(g) + 1) % 4;

describe("参加と開始（項目1〜3）", () => {
  it("定員4人で、5人目は理由つきで拒否される", () => {
    const { g } = lobby(["a", "b", "c", "d"]);
    const r = join(g, cfg, T0, "e");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("ROOM_FULL");
      expect(r.message).toContain("満員");
    }
  });
  it("同じ名前・空の名前は拒否される", () => {
    const { g } = lobby(["a"]);
    expect(join(g, cfg, T0, "a")).toMatchObject({ ok: false, code: "NAME_TAKEN" });
    expect(join(g, cfg, T0, "  ")).toMatchObject({ ok: false, code: "BAD_NAME" });
  });
  it("開始できるのは2〜4人のときだけ、ホストだけ", () => {
    const one = lobby(["a"]);
    expect(start(one.g, cfg, T0, one.ps[0].id)).toMatchObject({ ok: false, code: "BAD_COUNT" });
    const two = lobby(["a", "b"]);
    expect(start(two.g, cfg, T0, two.ps[1].id)).toMatchObject({ ok: false, code: "NOT_HOST" });
    expect(start(two.g, cfg, T0, two.ps[0].id)).toMatchObject({ ok: true });
    expect(two.g.phase).toBe("question");
  });
  it("ゲーム開始後の新規参加は拒否、トークンでの復帰は可能", () => {
    const { g, ps } = started(2);
    expect(join(g, cfg, T0, "新入り")).toMatchObject({ ok: false, code: "GAME_STARTED" });
    disconnect(g, T0 + 10, ps[1].id);
    const r = join(g, cfg, T0 + 20, "無視される", ps[1].token);
    expect(r).toMatchObject({ ok: true, resumed: true });
    expect(g.players[1].connected).toBe(true);
  });
});

describe("問題（項目4）", () => {
  it("内蔵の問題から10問、4択で、正解の位置が選択肢の中身と一致している", () => {
    const plan = planQuestions();
    expect(plan).toHaveLength(10);
    expect(new Set(plan.map((p) => p.id)).size).toBe(10);
    for (const p of plan) {
      const orig = QUESTIONS.find((q) => q.id === p.id)!;
      expect(p.choices).toHaveLength(4);
      expect(p.choices[p.answer]).toBe(orig.choices[orig.answer]);
      expect([...p.choices].sort()).toEqual([...orig.choices].sort());
    }
  });
  it("出題中のスナップショットに正解が含まれない（不正申告の余地を作らない）", () => {
    const { g, ps } = started(2);
    const s = JSON.stringify(snapshot(g, cfg, T0, ps[0].id));
    expect(s).not.toContain('"answer"');
    expect(s).not.toContain("correctIndex");
    expect(s).not.toContain(ps[0].token);
  });
});

describe("早押し（項目5〜8）", () => {
  it("同時に押しても最初に処理された1人だけが回答権を得る", () => {
    const { g, ps } = started(4);
    const results = ps.map((p) => buzz(g, cfg, T0 + 100, p.id));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results[0].ok).toBe(true);
    expect(g.answererId).toBe(ps[0].id);
    expect(g.phase).toBe("answering");
    for (const r of results.slice(1)) expect(r).toMatchObject({ ok: false, code: "TAKEN" });
  });
  it("正解は+10点で正解表示へ、不正解は-5点でほかの人の早押しが再開する", () => {
    const { g, ps } = started(3);
    buzz(g, cfg, T0 + 100, ps[0].id);
    answer(g, cfg, T0 + 200, ps[0].id, wrongIdx(g));
    expect(ps[0].score).toBe(-5);
    expect(g.phase).toBe("question");
    expect(buzz(g, cfg, T0 + 300, ps[0].id)).toMatchObject({ ok: false, code: "LOCKED" });
    expect(buzz(g, cfg, T0 + 300, ps[1].id).ok).toBe(true);
    answer(g, cfg, T0 + 400, ps[1].id, correctIdx(g));
    expect(ps[1].score).toBe(10);
    expect(g.phase).toBe("reveal");
    expect(g.reveal).toMatchObject({ outcome: "correct", winnerId: ps[1].id });
  });
  it("回答権のない人の回答は無視される", () => {
    const { g, ps } = started(2);
    buzz(g, cfg, T0 + 100, ps[0].id);
    expect(answer(g, cfg, T0 + 150, ps[1].id, correctIdx(g))).toMatchObject({ ok: false, code: "NOT_ANSWERER" });
    expect(ps[1].score).toBe(0);
  });
  it("範囲外の選択肢は拒否され、状態は変わらない", () => {
    const { g, ps } = started(2);
    buzz(g, cfg, T0 + 100, ps[0].id);
    expect(answer(g, cfg, T0 + 150, ps[0].id, 9)).toMatchObject({ ok: false, code: "BAD_CHOICE" });
    expect(g.phase).toBe("answering");
  });
  it("回答権を得て10秒選ばないと不正解扱い（-5点）で再開する", () => {
    const { g, ps } = started(2);
    buzz(g, cfg, T0 + 1000, ps[0].id);
    tick(g, cfg, T0 + 1000 + cfg.answerMs - 1);
    expect(g.phase).toBe("answering");
    tick(g, cfg, T0 + 1000 + cfg.answerMs);
    expect(ps[0].score).toBe(-5);
    expect(g.phase).toBe("question");
    expect(g.lockedOut).toContain(ps[0].id);
  });
  it("全員が押せなくなったら正解を表示する", () => {
    const { g, ps } = started(2);
    buzz(g, cfg, T0 + 100, ps[0].id);
    answer(g, cfg, T0 + 200, ps[0].id, wrongIdx(g));
    buzz(g, cfg, T0 + 300, ps[1].id);
    answer(g, cfg, T0 + 400, ps[1].id, wrongIdx(g));
    expect(g.phase).toBe("reveal");
    expect(g.reveal).toMatchObject({ outcome: "allWrong", winnerId: null });
  });
  it("誰も押さないまま20秒たったら正解を表示し、さらに表示後は次の問題へ進む", () => {
    const { g } = started(2);
    tick(g, cfg, T0 + cfg.questionMs - 1);
    expect(g.phase).toBe("question");
    tick(g, cfg, T0 + cfg.questionMs);
    expect(g.phase).toBe("reveal");
    expect(g.reveal?.outcome).toBe("timeout");
    expect(nextWake(g, cfg)).toBe(T0 + cfg.questionMs + cfg.revealMs);
    tick(g, cfg, T0 + cfg.questionMs + cfg.revealMs);
    expect(g.phase).toBe("question");
    expect(g.qIndex).toBe(1);
    expect(g.lockedOut).toEqual([]);
  });
  it("20秒ちょうど手前に押した人の回答は最後まで受け付ける（回答中は打ち切らない）", () => {
    const { g, ps } = started(2);
    buzz(g, cfg, T0 + cfg.questionMs - 500, ps[0].id);
    tick(g, cfg, T0 + cfg.questionMs + 3000);
    expect(g.phase).toBe("answering");
    expect(answer(g, cfg, T0 + cfg.questionMs + 3000, ps[0].id, correctIdx(g)).ok).toBe(true);
    expect(ps[0].score).toBe(10);
  });
  it("20秒を過ぎてから不正解になったら、残りの人を待たずに正解表示へ", () => {
    const { g, ps } = started(3);
    buzz(g, cfg, T0 + cfg.questionMs - 500, ps[0].id);
    answer(g, cfg, T0 + cfg.questionMs + 1000, ps[0].id, wrongIdx(g));
    expect(g.phase).toBe("reveal");
    expect(g.reveal?.outcome).toBe("timeout");
  });
  it("20秒を過ぎた早押しは受け付けない", () => {
    const { g, ps } = started(2);
    expect(buzz(g, cfg, T0 + cfg.questionMs + 1, ps[0].id).ok).toBe(false);
    expect(g.phase).toBe("reveal");
  });
});

describe("最終順位（項目9）", () => {
  it("10問終わると final になり、同点は同順位で点数順に並ぶ", () => {
    const { g, ps } = started(3);
    let t = T0;
    for (let i = 0; i < 10; i++) {
      expect(g.phase).toBe("question");
      if (i < 4) {
        buzz(g, cfg, t + 10, ps[i % 2].id);
        answer(g, cfg, t + 20, ps[i % 2].id, correctIdx(g));
        t += 20;
      } else {
        t = g.questionDeadline;
        tick(g, cfg, t);
      }
      expect(g.phase).toBe("reveal");
      t += cfg.revealMs;
      tick(g, cfg, t);
    }
    expect(g.phase).toBe("final");
    const s = snapshot(g, cfg, t, ps[0].id);
    expect(s.ranking!.map((r) => r.score)).toEqual([20, 20, 0]);
    expect(s.ranking!.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(nextWake(g, cfg)).toBeNull();
  });
});

describe("切断と復帰（項目10）", () => {
  it("ゲーム中に切断しても点数は保たれ、復帰できる", () => {
    const { g, ps } = started(2);
    buzz(g, cfg, T0 + 10, ps[1].id);
    answer(g, cfg, T0 + 20, ps[1].id, correctIdx(g));
    disconnect(g, T0 + 30, ps[1].id);
    tick(g, cfg, T0 + 60_000);
    const r = join(g, cfg, T0 + 60_000, "x", ps[1].token);
    expect(r).toMatchObject({ ok: true, resumed: true });
    expect(ps[1].score).toBe(10);
  });
  it("ロビーで一定時間戻らない人は外れ、ホストが引き継がれる", () => {
    const { g, ps } = lobby(["a", "b"]);
    disconnect(g, T0, ps[0].id);
    expect(nextWake(g, cfg)).toBe(T0 + cfg.lobbyGraceMs);
    tick(g, cfg, T0 + cfg.lobbyGraceMs);
    expect(g.players.map((p) => p.name)).toEqual(["b"]);
    expect(g.hostId).toBe(ps[1].id);
  });
  it("猶予内に戻ればロビーに残る", () => {
    const { g, ps } = lobby(["a", "b"]);
    disconnect(g, T0, ps[0].id);
    expect(join(g, cfg, T0 + cfg.lobbyGraceMs - 1, "a", ps[0].token)).toMatchObject({ ok: true, resumed: true });
    tick(g, cfg, T0 + cfg.lobbyGraceMs * 2);
    expect(g.players).toHaveLength(2);
  });
});

describe("全員の画面がそろう材料（項目11）", () => {
  it("誰が回答中か・点数・締め切りが全員に同じ値で届く", () => {
    const { g, ps } = started(3);
    buzz(g, cfg, T0 + 100, ps[2].id);
    const a = snapshot(g, cfg, T0 + 150, ps[0].id);
    const b = snapshot(g, cfg, T0 + 150, ps[1].id);
    expect(a.answererId).toBe(ps[2].id);
    expect({ ...a, you: "" }).toEqual({ ...b, you: "" });
    expect(a.answerDeadline).toBe(T0 + 100 + cfg.answerMs);
    expect(a.questionDeadline).toBe(T0 + cfg.questionMs);
  });
});
