import { describe, it, expect } from "vitest";
import {
  QuizGame,
  emptyState,
  BUZZ_WINDOW_MS,
  ANSWER_WINDOW_MS,
  REVEAL_MS,
  MAX_PLAYERS,
  type RoomState,
} from "../../src/engine.js";
import { QUESTIONS, TOTAL_QUESTIONS } from "../../src/questions.js";

function newGame(code = "TEST"): QuizGame {
  return new QuizGame(emptyState(code));
}

function fourPlayers(now = 0): QuizGame {
  const g = newGame();
  for (const id of ["p1", "p2", "p3", "p4"]) g.join(id, id.toUpperCase(), now);
  return g;
}

describe("入室と定員", () => {
  it("最初の入室者がホストになる", () => {
    const g = newGame();
    g.join("p1", "A", 0);
    g.join("p2", "B", 0);
    expect(g.state.hostId).toBe("p1");
    expect(g.state.players).toHaveLength(2);
  });

  it("定員4人を超えると5人目は入れない（理由つき）", () => {
    const g = fourPlayers();
    expect(g.state.players).toHaveLength(MAX_PLAYERS);
    const res = g.join("p5", "E", 0);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("満員");
    expect(g.state.players).toHaveLength(MAX_PLAYERS);
  });

  it("ゲーム開始後は新しいIDでは参加できない", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    const res = g.join("stranger", "X", 10);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("始まって");
  });

  it("切断したロビー参加者は枠を空ける", () => {
    const g = newGame();
    g.join("p1", "A", 0);
    g.join("p2", "B", 0);
    g.setConnected("p2", false, 0);
    g.leaveLobby("p2");
    expect(g.state.players.map((p) => p.id)).toEqual(["p1"]);
    const res = g.join("p3", "C", 0);
    expect(res.ok).toBe(true);
  });

  it("ホストがゲーム中に切断しても、同じIDで戻ればホストのまま復帰できる", () => {
    const g = newGame();
    g.join("p1", "A", 0);
    g.join("p2", "B", 0);
    g.start("p1", 0);
    g.setConnected("p1", false, 0);
    expect(g.state.hostId).toBe("p1");
    const res = g.join("p1", "A", 100);
    expect(res.ok).toBe(true);
    expect(g.state.hostId).toBe("p1");
  });
});

describe("開始条件", () => {
  it("1人では開始できない", () => {
    const g = newGame();
    g.join("p1", "A", 0);
    expect(g.canStart()).toBe(false);
    expect(g.start("p1", 0).ok).toBe(false);
  });

  it("2〜4人でホストだけが開始できる", () => {
    const g = fourPlayers();
    const denied = g.start("p2", 0);
    expect(denied.ok).toBe(false);
    expect(denied.reason).toContain("ホスト");
    expect(g.state.phase).toBe("lobby");
    expect(g.start("p1", 0).ok).toBe(true);
    expect(g.state.phase).toBe("question");
    expect(g.state.questionIndex).toBe(0);
  });
});

describe("早押し（サーバーが1人だけに回答権を与える）", () => {
  it("同時押し（同じ時刻）では最初に処理された1人だけが回答権を得る", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    // サーバーはメッセージを直列処理するので、同時刻の押下は到着順で決まる
    const first = g.buzz("p3", 1000);
    const second = g.buzz("p1", 1000);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(g.state.answeringPlayerId).toBe("p3");
    expect(g.state.phase).toBe("answering");
  });

  it("回答中は他の人は押せない", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    g.buzz("p1", 100);
    const res = g.buzz("p2", 150);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("回答中");
  });

  it("回答権を得ると10秒の回答期限が設定される", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    g.buzz("p2", 2000);
    expect(g.state.answerDeadline).toBe(2000 + ANSWER_WINDOW_MS);
  });
});

describe("正誤判定と得点（サーバー側で決定）", () => {
  it("正解は+10点", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    const correct = QUESTIONS[0].correct;
    g.buzz("p1", 0);
    expect(g.answer("p1", correct, 0).ok).toBe(true);
    expect(g.find("p1")!.score).toBe(10);
  });

  it("不正解は-5点", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    const wrong = (QUESTIONS[0].correct + 1) % 4;
    g.buzz("p1", 0);
    g.answer("p1", wrong, 0);
    expect(g.find("p1")!.score).toBe(-5);
  });

  it("不正解の人はその問題で再び押せない", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    const wrong = (QUESTIONS[0].correct + 1) % 4;
    g.buzz("p1", 0);
    g.answer("p1", wrong, 0);
    const res = g.buzz("p1", 500);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("もう押せません");
    // 問題は継続中（他の人はまだ押せる）
    expect(g.state.phase).toBe("question");
    expect(g.buzz("p2", 600).ok).toBe(true);
  });

  it("回答権のない人の回答や不正な選択肢は拒否される", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    expect(g.answer("p2", 0, 0).ok).toBe(false);
    g.buzz("p1", 0);
    expect(g.answer("p1", 5, 0).ok).toBe(false);
    expect(g.answer("p1", -1, 0).ok).toBe(false);
    expect(g.state.players.every((p) => p.score === 0)).toBe(true);
  });
});

describe("問題進行と正解発表", () => {
  it("全員が押せなくなったら即座に正解発表へ進む", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    const correct = QUESTIONS[0].correct;
    for (const id of ["p1", "p2", "p3", "p4"]) {
      g.buzz(id, 0);
      g.answer(id, correct, 0);
    }
    expect(g.state.phase).toBe("reveal");
    expect(g.state.correctChoice).toBe(correct);
  });

  it("問題提示から20秒で誰も正解できなくても正解発表へ進む", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    expect(g.state.buzzDeadline).toBe(BUZZ_WINDOW_MS);
    g.advance(BUZZ_WINDOW_MS - 1);
    expect(g.state.phase).toBe("question");
    g.advance(BUZZ_WINDOW_MS);
    expect(g.state.phase).toBe("reveal");
  });

  it("回答が10秒来なければ回答権を失い、ペナルティなしで再開する", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    g.buzz("p1", 1000);
    g.advance(1000 + ANSWER_WINDOW_MS);
    expect(g.state.phase).toBe("question");
    expect(g.find("p1")!.score).toBe(0);
    expect(g.find("p1")!.lockedOut).toBe(true);
  });

  it("10問すべて終えると finished になる", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    let now = 0;
    for (let q = 0; q < TOTAL_QUESTIONS; q++) {
      expect(g.state.questionIndex).toBe(q);
      // 全員が押して正解（すぐ次へ進めるように全員ロックアウトさせる）
      for (const id of ["p1", "p2", "p3", "p4"]) {
        g.buzz(id, now);
        g.answer(id, QUESTIONS[q].correct, now);
      }
      expect(g.state.phase).toBe("reveal");
      now = g.state.revealDeadline!;
      g.advance(now);
    }
    expect(g.state.phase).toBe("finished");
    expect(g.ranking()).toHaveLength(4);
  });
});

describe("復帰と再接続（点数を保持）", () => {
  it("同じ playerId で戻ると点数・状態を保ったまま復帰できる", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    g.buzz("p1", 0);
    g.answer("p1", QUESTIONS[0].correct, 0);
    expect(g.find("p1")!.score).toBe(10);

    // 回線が切れる
    g.setConnected("p1", false, 100);
    expect(g.find("p1")!.connected).toBe(false);

    // 同じIDで戻る（ゲーム中でも許可される）
    const res = g.join("p1", "A", 200);
    expect(res.ok).toBe(true);
    expect(res.playerId).toBe("p1");
    expect(g.find("p1")!.connected).toBe(true);
    expect(g.find("p1")!.score).toBe(10);
    expect(g.state.players).toHaveLength(4);
  });

  it("保存→復元しても点数と進行が保たれる", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    g.buzz("p2", 50);
    g.answer("p2", QUESTIONS[0].correct, 50);
    const snapshot: RoomState = g.toJSON();

    const restored = QuizGame.fromJSON(JSON.parse(JSON.stringify(snapshot)), "TEST");
    expect(restored.find("p2")!.score).toBe(10);
    expect(restored.state.questionIndex).toBe(0);
    expect(restored.state.players).toHaveLength(4);
  });

  it("クライアント向けビューは reveal まで正解を含まない", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    const view = g.view();
    expect(view.question!.choices).toHaveLength(4);
    expect(view.correctChoice).toBeNull();
    expect(JSON.stringify(view)).not.toContain('"correct"');
  });
});

describe("再戦", () => {
  it("resetToLobby で点数が0に戻りロビーへ帰る", () => {
    const g = fourPlayers();
    g.start("p1", 0);
    g.buzz("p1", 0);
    g.answer("p1", QUESTIONS[0].correct, 0);
    expect(g.find("p1")!.score).toBe(10);
    g.resetToLobby(999);
    expect(g.state.phase).toBe("lobby");
    expect(g.find("p1")!.score).toBe(0);
    expect(g.state.questionIndex).toBe(0);
  });
});
