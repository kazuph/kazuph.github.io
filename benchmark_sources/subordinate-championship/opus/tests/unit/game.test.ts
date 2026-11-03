// ルール本体（src/game.ts）の単体テスト。時刻を引数で渡すので、20秒・10秒の期限も待たずに確かめられる。
import { describe, expect, it } from "vitest";
import {
  addPlayer,
  answer,
  backToLobby,
  buzz,
  createRoom,
  nextDeadline,
  normalizeName,
  pickQuestions,
  ranking,
  removePlayer,
  RULES,
  type RoomState,
  startGame,
  tick,
  toPublic,
} from "../../src/game";
import { QUESTION_BANK } from "../../src/questions";

const T0 = 1_000_000;
/** 再現できる乱数（mulberry32） */
function seeded(seed = 42) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const p = (n: number) => ({ id: `p${n}`, token: `t${n}`, name: `プレイヤー${n}` });

function room(players = 4): RoomState {
  const s = createRoom("ABCDE", p(1), T0);
  for (let i = 2; i <= players; i++) expect(addPlayer(s, p(i), T0).ok).toBe(true);
  return s;
}

/** 開始して第1問が出た状態にする。戻り値は出題時刻。 */
function started(players = 4): { s: RoomState; at: number } {
  const s = room(players);
  expect(startGame(s, "p1", T0, seeded()).ok).toBe(true);
  const at = T0 + RULES.countdownMs;
  tick(s, at);
  expect(s.phase).toBe("question");
  return { s, at };
}
const wrongChoice = (s: RoomState) => (s.questions[s.qIndex]!.answer + 1) % 4;
const rightChoice = (s: RoomState) => s.questions[s.qIndex]!.answer;

describe("部屋への参加（遊び方1・2）", () => {
  it("名前は前後の空白を除いて1〜12文字", () => {
    expect(normalizeName("  たろう ")).toBe("たろう");
    expect(normalizeName("")).toBeNull();
    expect(normalizeName("   ")).toBeNull();
    expect(normalizeName("あ".repeat(12))).toBe("あ".repeat(12));
    expect(normalizeName("あ".repeat(13))).toBeNull();
    expect(normalizeName(123)).toBeNull();
  });

  it("定員は4人。5人目は room_full で入れない", () => {
    const s = room(4);
    const res = addPlayer(s, p(5), T0);
    expect(res).toEqual({ ok: false, error: "room_full" });
    expect(s.players).toHaveLength(4);
  });

  it("同じ名前は入れない・席は空いた番号を埋める", () => {
    const s = room(3);
    expect(addPlayer(s, { ...p(9), name: "プレイヤー2" }, T0)).toEqual({ ok: false, error: "name_taken" });
    expect(removePlayer(s, "p2").ok).toBe(true);
    const res = addPlayer(s, p(9), T0);
    expect(res.ok && res.value.seat).toBe(1);
  });

  it("ホストが抜けたら一番古い参加者がホストになる", () => {
    const s = room(3);
    removePlayer(s, "p1");
    expect(s.hostId).toBe("p2");
  });

  it("ゲームが始まったら新しい人は入れない", () => {
    const { s } = started(2);
    expect(addPlayer(s, p(3), T0)).toEqual({ ok: false, error: "already_started" });
  });
});

describe("開始（遊び方3）", () => {
  it("ホスト以外は開始できない", () => {
    const s = room(2);
    expect(startGame(s, "p2", T0, seeded())).toEqual({ ok: false, error: "not_host" });
  });
  it("1人では開始できない", () => {
    const s = room(1);
    expect(startGame(s, "p1", T0, seeded())).toEqual({ ok: false, error: "not_enough_players" });
  });
  it.each([2, 3, 4])("%i人なら開始できる", (n) => {
    const s = room(n);
    expect(startGame(s, "p1", T0, seeded()).ok).toBe(true);
    expect(s.phase).toBe("countdown");
  });
});

describe("問題（遊び方4）", () => {
  it("内蔵の問題から重複なしで10問、正解の位置は混ぜる", () => {
    const qs = pickQuestions(seeded(7));
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map((q) => q.text)).size).toBe(10);
    for (const q of qs) {
      const bank = QUESTION_BANK.find((b) => b.text === q.text)!;
      expect(q.choices).toHaveLength(4);
      expect(q.choices[q.answer]).toBe(bank.choices[0]);
      expect([...q.choices].sort()).toEqual([...bank.choices].sort());
    }
    expect(new Set(qs.map((q) => q.answer)).size).toBeGreaterThan(1);
  });
  it("問題文はすべて日本語", () => {
    for (const q of QUESTION_BANK) expect(q.text).toMatch(/[぀-ヿ一-鿿]/);
  });
});

describe("早押し（遊び方5）", () => {
  it("最初に処理された1人だけが回答権を得て、残りは not_open", () => {
    const { s, at } = started();
    const results = ["p3", "p1", "p4", "p2"].map((id) => buzz(s, id, at + 500));
    expect(results.map((r) => r.ok)).toEqual([true, false, false, false]);
    expect(results.slice(1).every((r) => !r.ok && r.error === "not_open")).toBe(true);
    expect(s.answeringId).toBe("p3");
    expect(s.answerEndsAt).toBe(at + 500 + RULES.answerMs);
  });
  it("出題前・カウントダウン中は押せない", () => {
    const s = room(2);
    startGame(s, "p1", T0, seeded());
    expect(buzz(s, "p1", T0 + 100)).toEqual({ ok: false, error: "not_open" });
  });
  it("部屋にいない人は押せない", () => {
    const { s, at } = started();
    expect(buzz(s, "zzz", at)).toEqual({ ok: false, error: "not_player" });
  });
});

describe("回答と点数（遊び方6）", () => {
  it("正解は+10点で、すぐ正解発表になる", () => {
    const { s, at } = started();
    buzz(s, "p2", at + 1000);
    const r = answer(s, "p2", rightChoice(s), at + 2000);
    expect(r.ok && r.value.kind).toBe("correct");
    expect(s.players.find((x) => x.id === "p2")!.score).toBe(10);
    expect(s.phase).toBe("reveal");
  });
  it("不正解は-5点", () => {
    const { s, at } = started();
    buzz(s, "p2", at + 1000);
    answer(s, "p2", wrongChoice(s), at + 2000);
    expect(s.players.find((x) => x.id === "p2")!.score).toBe(-5);
  });
  it("回答権のない人の回答は受け付けない（ブラウザの申告を信用しない）", () => {
    const { s, at } = started();
    buzz(s, "p2", at + 1000);
    expect(answer(s, "p3", rightChoice(s), at + 1100)).toEqual({ ok: false, error: "not_answering" });
    expect(answer(s, "p2", 7, at + 1100)).toEqual({ ok: false, error: "invalid_choice" });
    expect(answer(s, "p2", "0", at + 1100)).toEqual({ ok: false, error: "invalid_choice" });
  });
  it("10秒を過ぎたら回答できず、時間切れとして-5点", () => {
    const { s, at } = started();
    buzz(s, "p2", at + 1000);
    expect(answer(s, "p2", rightChoice(s), at + 1000 + RULES.answerMs)).toEqual({ ok: false, error: "not_answering" });
    tick(s, at + 1000 + RULES.answerMs);
    expect(s.players.find((x) => x.id === "p2")!.score).toBe(-5);
    expect(s.outcomes.at(-1)).toMatchObject({ kind: "timeout", playerId: "p2" });
    expect(s.phase).toBe("question");
  });
});

describe("不正解後の再開（遊び方7）", () => {
  it("不正解の人はその問題ではもう押せず、残りの人で再開", () => {
    const { s, at } = started();
    buzz(s, "p2", at + 1000);
    answer(s, "p2", wrongChoice(s), at + 2000);
    expect(s.phase).toBe("question");
    expect(buzz(s, "p2", at + 2100)).toEqual({ ok: false, error: "locked_out" });
    expect(buzz(s, "p3", at + 2200).ok).toBe(true);
  });
  it("次の問題では押せるようになる", () => {
    const { s, at } = started(2);
    buzz(s, "p1", at + 100);
    answer(s, "p1", wrongChoice(s), at + 200);
    buzz(s, "p2", at + 300);
    answer(s, "p2", rightChoice(s), at + 400);
    tick(s, at + 400 + RULES.revealMs);
    expect(s.qIndex).toBe(1);
    expect(buzz(s, "p1", at + 400 + RULES.revealMs + 10).ok).toBe(true);
  });
});

describe("正解発表と次の問題（遊び方8）", () => {
  it("全員が押せなくなったら正解発表", () => {
    const { s, at } = started(2);
    buzz(s, "p1", at + 100);
    answer(s, "p1", wrongChoice(s), at + 200);
    buzz(s, "p2", at + 300);
    answer(s, "p2", wrongChoice(s), at + 400);
    expect(s.phase).toBe("reveal");
    expect(s.phaseEndsAt).toBe(at + 400 + RULES.revealMs);
  });
  it("出題から20秒たったら誰も押していなくても正解発表", () => {
    const { s, at } = started();
    expect(nextDeadline(s)).toBe(at + RULES.questionMs);
    tick(s, at + RULES.questionMs - 1);
    expect(s.phase).toBe("question");
    tick(s, at + RULES.questionMs);
    expect(s.phase).toBe("reveal");
    expect(buzz(s, "p1", at + RULES.questionMs)).toEqual({ ok: false, error: "not_open" });
  });
  it("20秒ちょうどの早押しは受け付けない", () => {
    const { s, at } = started();
    expect(buzz(s, "p1", at + RULES.questionMs)).toEqual({ ok: false, error: "not_open" });
  });
  it("19秒で押した人は10秒の回答時間をもらえ、誤答したらそこで発表（20秒後に新たな早押しは無い）", () => {
    const { s, at } = started();
    buzz(s, "p1", at + 19_000);
    tick(s, at + 25_000);
    expect(s.phase).toBe("answering");
    answer(s, "p1", wrongChoice(s), at + 26_000);
    expect(s.phase).toBe("reveal");
  });
  it("正解発表は5秒後に次の問題へ進む", () => {
    const { s, at } = started();
    tick(s, at + RULES.questionMs);
    tick(s, at + RULES.questionMs + RULES.revealMs);
    expect(s.phase).toBe("question");
    expect(s.qIndex).toBe(1);
    expect(s.lockedOut).toEqual([]);
  });
  it("正解は発表まで配らない", () => {
    const { s, at } = started();
    expect(toPublic(s, () => true).question?.answer).toBeNull();
    tick(s, at + RULES.questionMs);
    expect(toPublic(s, () => true).question?.answer).toBe(rightChoice(s));
    expect(JSON.stringify(toPublic(s, () => true))).not.toContain("t1");
  });
});

describe("10問終わったら最終順位（遊び方9）", () => {
  it("10問で finished になり、順位は点数順・同点は同順位", () => {
    const { s, at } = started(3);
    let now = at;
    for (let q = 0; q < RULES.questionCount; q++) {
      // p1 が毎回正解、p2 は1問目だけ誤答
      if (q === 0) {
        buzz(s, "p2", now + 10);
        answer(s, "p2", wrongChoice(s), now + 20);
      }
      buzz(s, "p1", now + 30);
      answer(s, "p1", rightChoice(s), now + 40);
      now = now + 40 + RULES.revealMs;
      tick(s, now);
    }
    expect(s.phase).toBe("finished");
    expect(nextDeadline(s)).toBeNull();
    const r = ranking(s);
    expect(r.map((x) => [x.id, x.score, x.rank])).toEqual([
      ["p1", 100, 1],
      ["p3", 0, 2],
      ["p2", -5, 3],
    ]);
    expect(toPublic(s, () => true).ranking).toHaveLength(3);
  });
  it("同点は同じ順位", () => {
    const s = room(3);
    s.players[0]!.score = 10;
    s.players[1]!.score = 10;
    expect(ranking(s).map((x) => x.rank)).toEqual([1, 1, 3]);
  });
  it("ホストはロビーに戻して再戦できる（点数は0に戻る）", () => {
    const { s } = started(2);
    s.phase = "finished";
    s.players[0]!.score = 30;
    expect(backToLobby(s, "p2")).toEqual({ ok: false, error: "not_host" });
    expect(backToLobby(s, "p1").ok).toBe(true);
    expect(s.phase).toBe("lobby");
    expect(s.players.every((x) => x.score === 0)).toBe(true);
  });
});

describe("時間の進め方", () => {
  it("tick は冪等で、長く止まっていても期限を順に処理する", () => {
    const { s, at } = started(2);
    const later = at + 10 * (RULES.questionMs + RULES.revealMs) + 1;
    tick(s, later);
    expect(s.phase).toBe("finished");
    const snapshot = JSON.stringify(s);
    expect(tick(s, later + 99_999)).toBe(false);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
