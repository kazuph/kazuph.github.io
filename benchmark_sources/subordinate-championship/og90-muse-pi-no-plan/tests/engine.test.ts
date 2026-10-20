import { describe, expect, it } from "vitest";
import {
  ANSWER_TIME_MS,
  QUESTION_TIME_MS,
  REVEAL_TIME_MS,
  RoomEngine,
  createInitialSnapshot,
  TOTAL_QUESTIONS,
} from "../src/engine.js";
import { QUESTIONS } from "../src/questions.js";

function setupEngine(n = 4, code = "TEST") {
  const engine = new RoomEngine(createInitialSnapshot(code));
  const players: { id: string; token: string; name: string }[] = [];
  const names = ["ホスト", "B", "C", "D"].slice(0, n);
  names.forEach((name, i) => {
    const res = engine.join(name, i === 0 ? undefined : undefined);
    if ("error" in res) throw new Error(`join failed: ${res.error}`);
    players.push({ id: res.player.id, token: res.player.token, name });
  });
  return { engine, players };
}

describe("参加と定員", () => {
  it("5人目はROOM_FULLで入れない", () => {
    const { engine } = setupEngine(4);
    const res = engine.join("E");
    expect("error" in res && res.error).toBe("ROOM_FULL");
    expect(engine.state.players).toHaveLength(4);
  });

  it("同じ名前はNAME_TAKEN", () => {
    const { engine } = setupEngine(2);
    const res = engine.join("B");
    expect("error" in res && res.error).toBe("NAME_TAKEN");
  });

  it("最初に参加した人がホスト", () => {
    const { engine, players } = setupEngine(2);
    expect(engine.findById(players[0].id)?.isHost).toBe(true);
    expect(engine.findById(players[1].id)?.isHost).toBe(false);
  });

  it("開始は2〜4人のときだけ（1人では不可）", () => {
    const engine = new RoomEngine(createInitialSnapshot("T1"));
    const res = engine.join("ひとり");
    expect("error" in res).toBe(false);
    const p = (res as { player: { id: string } }).player;
    const r = engine.start(p.id, 1000);
    expect(r.error).toBe("NEED_2_TO_4_PLAYERS");
  });

  it("ホスト以外は開始できない", () => {
    const { engine, players } = setupEngine(2);
    const r = engine.start(players[1].id, 1000);
    expect(r.error).toBe("NOT_HOST");
  });

  it("ゲーム開始後は新規参加できない", () => {
    const { engine, players } = setupEngine(2);
    engine.start(players[0].id, 1000);
    const res = engine.join("新人");
    expect("error" in res && res.error).toBe("GAME_STARTED");
  });
});

describe("早押し（同時押しで1人だけ）", () => {
  it("先着1人だけが回答権を得て、2人目は弾かれる", () => {
    const { engine, players } = setupEngine(4);
    engine.start(players[0].id, 1000);
    const first = engine.buzz(players[1].id, 1100);
    expect(first.won).toBe(true);
    expect(engine.state.buzzWinnerId).toBe(players[1].id);
    for (const p of [players[0], players[2], players[3]]) {
      const r = engine.buzz(p.id, 1101);
      expect(r.error).toBe("NOT_QUESTION_PHASE");
    }
    // 回答権のない人の回答は弾かれる
    const ans = engine.answer(players[2].id, 0, 1200);
    expect(ans.error).toBe("NOT_YOUR_TURN");
  });
});

describe("正誤判定と点数", () => {
  it("正解は+10点で正解発表へ", () => {
    const { engine, players } = setupEngine(2);
    engine.start(players[0].id, 1000);
    engine.buzz(players[1].id, 1100);
    const correct = QUESTIONS[0].answer;
    const r = engine.answer(players[1].id, correct, 1200);
    expect(r.correct).toBe(true);
    expect(engine.findById(players[1].id)?.score).toBe(10);
    expect(engine.phase).toBe("reveal");
    const pub = engine.toPublic(1200);
    expect(pub.correctIndex).toBe(correct);
    // 出題中は正解を隠す
    engine.tick(1200 + REVEAL_TIME_MS);
    const pub2 = engine.toPublic(1300);
    expect(pub2.correctIndex).toBeNull();
  });

  it("不正解は-5点でロックアウト、残りで早押し再開", () => {
    const { engine, players } = setupEngine(3);
    engine.start(players[0].id, 1000);
    engine.buzz(players[0].id, 1100);
    const wrong = (QUESTIONS[0].answer + 1) % 4;
    const r = engine.answer(players[0].id, wrong, 1200);
    expect(r.correct).toBe(false);
    expect(engine.findById(players[0].id)?.score).toBe(-5);
    expect(engine.phase).toBe("question"); // 残りがいるので再開
    const locked = engine.buzz(players[0].id, 1300);
    expect(locked.error).toBe("LOCKED_OUT");
    const second = engine.buzz(players[1].id, 1300);
    expect(second.won).toBe(true);
  });

  it("全員不正解なら正解発表へ", () => {
    const { engine, players } = setupEngine(2);
    engine.start(players[0].id, 1000);
    const wrong = (QUESTIONS[0].answer + 1) % 4;
    engine.buzz(players[0].id, 1100);
    engine.answer(players[0].id, wrong, 1200);
    engine.buzz(players[1].id, 1300);
    engine.answer(players[1].id, wrong, 1400);
    expect(engine.phase).toBe("reveal");
  });
});

describe("タイマー", () => {
  it("回答時間切れは再開（スコア変動なし）", () => {
    const { engine, players } = setupEngine(2);
    engine.start(players[0].id, 1000);
    engine.buzz(players[0].id, 1100);
    engine.tick(1100 + ANSWER_TIME_MS + 1);
    expect(engine.phase).toBe("question");
    expect(engine.findById(players[0].id)?.score).toBe(0);
    expect(engine.state.lockedOut).toContain(players[0].id);
  });

  it("出題20秒で正解発表→3秒で次問へ", () => {
    const { engine, players } = setupEngine(2);
    engine.start(players[0].id, 1000);
    engine.tick(1000 + QUESTION_TIME_MS + 1);
    expect(engine.phase).toBe("reveal");
    engine.tick(1000 + QUESTION_TIME_MS + 1 + REVEAL_TIME_MS);
    expect(engine.phase).toBe("question");
    expect(engine.state.questionIndex).toBe(1);
  });
});

describe("通しゲーム（10問→最終順位）", () => {
  it("10問終えたらfinishedでランキングが出る", () => {
    const { engine, players } = setupEngine(4);
    let now = 1000;
    engine.start(players[0].id, now);
    for (let q = 0; q < TOTAL_QUESTIONS; q++) {
      expect(engine.state.questionIndex).toBe(q);
      // 交互に正解させる
      const answerer = players[q % players.length];
      engine.buzz(answerer.id, now + 100);
      engine.answer(answerer.id, QUESTIONS[q].answer, now + 200);
      expect(engine.phase).toBe("reveal");
      now += 200 + REVEAL_TIME_MS;
      engine.tick(now);
    }
    expect(engine.phase).toBe("finished");
    expect(engine.state.questionIndex).toBe(TOTAL_QUESTIONS);
    const pub = engine.toPublic(now);
    expect(pub.ranking).toHaveLength(4);
    expect(pub.correctIndex).not.toBeNull();
    // 全員正解回数が均等なら同点でも順位が出る
    const scores = pub.ranking!.map((r) => r.score);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[3]);
  });

  it("再読み込み（トークン再参加）で点数を保持する", () => {
    const { engine, players } = setupEngine(2);
    engine.start(players[0].id, 1000);
    engine.buzz(players[1].id, 1100);
    engine.answer(players[1].id, QUESTIONS[0].answer, 1200);
    expect(engine.findById(players[1].id)?.score).toBe(10);
    // 切断
    engine.setConnected(players[1].id, false);
    // トークンで復帰
    const res = engine.join("B", players[1].token);
    expect("error" in res).toBe(false);
    if (!("error" in res)) {
      expect(res.isRejoin).toBe(true);
      expect(res.player.score).toBe(10);
      expect(res.player.connected).toBe(true);
    }
  });
});
