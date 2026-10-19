import { describe, it, expect } from "vitest";
import { QuizRoom } from "../src/game";
import { QUESTIONS } from "../src/questions";

function makeRoom4(now = 1_000_000) {
  const room = new QuizRoom("AB12", QUESTIONS);
  const ids: string[] = [];
  for (const n of ["A", "B", "C", "D"]) {
    const { player } = room.join(n, null, now);
    ids.push(player.id);
  }
  return { room, ids };
}

describe("参加と定員", () => {
  it("5人目は満員エラーになる", () => {
    const { room } = makeRoom4();
    expect(() => room.join("E", null, 1_000_000)).toThrow(/満員/);
  });
  it("開始は2〜4人・ホストのみ", () => {
    const solo = new QuizRoom("X1", QUESTIONS);
    const { player } = solo.join("一人", null, 0);
    expect(() => solo.start(player.id, 0)).toThrow(/2〜4人/);
    const { room, ids } = makeRoom4();
    expect(() => room.start(ids[1], 0)).toThrow(/ホスト/);
    expect(() => room.start(ids[0], 0)).not.toThrow();
  });
  it("ゲーム開始後の新規参加は拒否", () => {
    const { room } = makeRoom4();
    // 4人いるので満員テストと分離：3人部屋で開始後に参加
    const r2 = new QuizRoom("YY", QUESTIONS);
    const a = r2.join("a", null, 0).player;
    r2.join("b", null, 0);
    r2.start(a.id, 0);
    expect(() => r2.join("c", null, 0)).toThrow(/途中参加/);
    expect(room.phase).toBe("lobby");
  });
});

describe("早押し", () => {
  it("同時押しで1人だけが回答権を得る（先着1人）", () => {
    const { room, ids } = makeRoom4();
    room.start(ids[0], 1000);
    expect(room.buzz(ids[1], 1100)).toBe(true);
    // 2番目以降は回答中フェーズなので取れない
    expect(room.buzz(ids[2], 1100)).toBe(false);
    expect(room.buzz(ids[3], 1100)).toBe(false);
    expect(room.publicState(1100).answeringId).toBe(ids[1]);
  });
  it("不正解は-5点でロック、残りの人で早押し再開", () => {
    const { room, ids } = makeRoom4();
    room.start(ids[0], 1000);
    room.buzz(ids[1], 1100);
    const q = QUESTIONS[0];
    const wrong = (q.answer + 1) % 4;
    room.answer(ids[1], wrong, 1200);
    expect(room.players.get(ids[1])!.score).toBe(-5);
    expect(room.phase).toBe("buzz");
    // 不正解者はもう押せない
    expect(room.buzz(ids[1], 1300)).toBe(false);
    // 残りの人は押せる
    expect(room.buzz(ids[2], 1300)).toBe(true);
  });
  it("正解は+10点で正解表示へ", () => {
    const { room, ids } = makeRoom4();
    room.start(ids[0], 1000);
    room.buzz(ids[2], 1100);
    room.answer(ids[2], QUESTIONS[0].answer, 1200);
    expect(room.players.get(ids[2])!.score).toBe(10);
    expect(room.phase).toBe("reveal");
    const st = room.publicState(1200);
    expect(st.correctIndex).toBe(QUESTIONS[0].answer);
  });
  it("全員が押せなくなったら正解表示へ", () => {
    const { room, ids } = makeRoom4();
    room.start(ids[0], 1000);
    const q = QUESTIONS[0];
    const wrong = (q.answer + 1) % 4;
    for (const id of ids) {
      if ((room.phase as string) !== "buzz") break;
      room.buzz(id, 1100);
      if ((room.phase as string) === "answering") room.answer(id, wrong, 1200);
    }
    expect(room.phase).toBe("reveal");
  });
  it("問題20秒・回答10秒のタイムアウト", () => {
    const { room, ids } = makeRoom4();
    room.start(ids[0], 1000);
    // 誰も押さず20秒
    expect(room.tick(1000 + 20_000)).toBe(true);
    expect(room.phase).toBe("reveal");
    // 次の問題へ（3秒後）
    room.tick(1000 + 20_000 + 3000);
    expect(room.phase).toBe("buzz");
    expect(room.publicState(0).qIndex).toBe(1);
    // 回答タイムアウトは-5点扱い（出題直後に押して10秒放置）
    const t0 = 1000 + 20_000 + 3000;
    // 回答タイムアウトは-5点扱い
    room.buzz(ids[0], t0 + 100);
    room.tick(t0 + 100 + 10_000);
    expect(room.players.get(ids[0])!.score).toBe(-5);
  });
  it("10問終わったら最終順位", () => {
    const { room, ids } = makeRoom4();
    room.start(ids[0], 0);
    let t = 0;
    for (let qi = 0; qi < 10; qi++) {
      // 正解者が毎回ids[0]
      room.buzz(ids[0], t + 100);
      room.answer(ids[0], QUESTIONS[qi].answer, t + 200);
      room.tick(t + 200 + 3000);
      t += 5000;
    }
    expect(room.phase).toBe("finished");
    const st = room.publicState(9_999_999);
    expect(st.rankings![0].id).toBe(ids[0]);
    expect(st.rankings![0].score).toBe(100);
  });
  it("10問の問題が内蔵されている", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(10);
    for (const q of QUESTIONS.slice(0, 10)) {
      expect(q.choices.length).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
    }
  });
});

describe("復帰", () => {
  it("再読み込み（切断→同一IDでjoin）で点数を維持", () => {
    const { room, ids } = makeRoom4();
    room.start(ids[0], 1000);
    room.buzz(ids[1], 1100);
    room.answer(ids[1], QUESTIONS[0].answer, 1200);
    room.disconnect(ids[1]); // 回線切断
    expect(room.players.get(ids[1])!.connected).toBe(false);
    const back = room.join("B", ids[1], 5000); // 同じplayerIdで復帰
    expect(back.isNew).toBe(false);
    expect(room.players.get(ids[1])!.score).toBe(10);
    expect(room.players.get(ids[1])!.connected).toBe(true);
  });
  it("スナップショット復元で点数・進行を維持", () => {
    const { room, ids } = makeRoom4();
    room.start(ids[0], 1000);
    room.buzz(ids[2], 1100);
    room.answer(ids[2], QUESTIONS[0].answer, 1200);
    const snap = room.snapshot();
    const r2 = QuizRoom.restore(snap, QUESTIONS);
    expect(r2.players.get(ids[2])!.score).toBe(10);
    expect(r2.phase).toBe("reveal");
    expect(r2.publicState(0).correctIndex).toBe(QUESTIONS[0].answer);
  });
});
