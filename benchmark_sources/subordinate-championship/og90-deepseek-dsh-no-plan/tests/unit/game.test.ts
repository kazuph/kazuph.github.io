import { describe, expect, it } from "vitest";
import {
  ANSWER_TIME_MS,
  MAX_PLAYERS,
  QUESTION_TIME_MS,
  REVEAL_TIME_MS,
  SCORE_CORRECT,
  SCORE_WRONG,
  addPlayer,
  buzz,
  createGameState,
  nextAlarm,
  publicState,
  ranking,
  resetToLobby,
  startGame,
  submitAnswer,
  tick,
  type GameState,
} from "../../src/game";

/** 現在の問題の正解番号 */
function correctChoiceFor(state: GameState): number {
  return state.questions[state.qIndex]!.answerIndex;
}

/** 現在の問題の不正解番号 */
function wrongChoiceFor(state: GameState): number {
  return (correctChoiceFor(state) + 1) % 4;
}

/** テスト用にプレイヤーを n 人入れた部屋を作る */
function makeRoom(n: number): GameState {
  const state = createGameState("TEST", "p0", 0);
  for (let i = 0; i < n; i++) {
    const res = addPlayer(state, { id: `p${i}`, name: `Player${i}`, token: `t${i}` }, i);
    expect(res.ok).toBe(true);
  }
  return state;
}

describe("入室と定員", () => {
  it("4人までは入れて、5人目は理由つきで拒否される", () => {
    const state = makeRoom(MAX_PLAYERS);
    expect(state.players).toHaveLength(4);

    const fifth = addPlayer(state, { id: "p4", name: "5人目", token: "t4" }, 10);
    expect(fifth.ok).toBe(false);
    expect(fifth.error).toContain("満員");
    expect(state.players).toHaveLength(4);
  });

  it("ゲーム開始後は新規参加できない", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 100);
    const res = addPlayer(state, { id: "p9", name: "新規", token: "t9" }, 101);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("ゲーム");
  });

  it("同じトークンなら満員でも再接続できる", () => {
    const state = makeRoom(4);
    state.players[0]!.connected = false;
    const res = addPlayer(state, { id: "p0", name: "Player0", token: "t0" }, 10);
    expect(res.ok).toBe(true);
    expect(state.players).toHaveLength(4);
    expect(state.players[0]!.connected).toBe(true);
  });
});

describe("ゲーム開始条件", () => {
  it("ホスト以外は開始できない", () => {
    const state = makeRoom(3);
    const res = startGame(state, "p1", 0);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("部屋を作った人");
    expect(state.phase).toBe("lobby");
  });

  it("1人では開始できない", () => {
    const state = makeRoom(1);
    const res = startGame(state, "p0", 0);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("2人以上");
  });

  it("ホストが2人以上で開始すると最初の問題が出る", () => {
    const state = makeRoom(2);
    const res = startGame(state, "p0", 1000);
    expect(res.ok).toBe(true);
    expect(state.phase).toBe("buzzing");
    expect(state.qIndex).toBe(0);
    expect(state.questionDeadline).toBe(1000 + QUESTION_TIME_MS);
    expect(nextAlarm(state)).toBe(state.questionDeadline);
  });
});

describe("早押し（同時押しで1人だけ）", () => {
  it("4人が同時に押しても最初に処理された1人だけが回答権を得る", () => {
    const state = makeRoom(4);
    startGame(state, "p0", 1000);

    // わざと到着順を入れ替えて「処理順の最初」が勝つことを確認
    const order = ["p2", "p0", "p3", "p1"];
    const results = order.map((id) => buzz(state, id, 1100));

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results[0]!.ok).toBe(true);
    expect(state.answererId).toBe("p2");
    expect(state.phase).toBe("answering");
  });

  it("回答権を得た人がもう一度押しても拒否される", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    expect(buzz(state, "p0", 10).ok).toBe(true);
    const again = buzz(state, "p0", 11);
    expect(again.ok).toBe(false);
  });

  it("不正解だった人はその問題で押せない", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    buzz(state, "p0", 10);
    submitAnswer(state, "p0", wrongChoiceFor(state), 20);
    expect(state.buzzedOut).toContain("p0");
    const res = buzz(state, "p0", 30);
    expect(res.ok).toBe(false);
    expect(state.answererId).toBeNull();
  });
});

describe("正誤判定と点数", () => {
  it("正解で +10、フェーズが reveal になり正解が公開される", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    const answer = correctChoiceFor(state);
    buzz(state, "p0", 10);
    const res = submitAnswer(state, "p0", answer, 20);
    expect(res.ok).toBe(true);
    expect(state.players[0]!.score).toBe(SCORE_CORRECT);
    expect(state.phase).toBe("reveal");
    expect(state.reveal?.answerIndex).toBe(answer);
    expect(state.reveal?.scoredPlayerId).toBe("p0");
  });

  it("不正解で -5、残りの人で早押しが再開する", () => {
    const state = makeRoom(3);
    startGame(state, "p0", 0);
    buzz(state, "p0", 10);
    const wrong = wrongChoiceFor(state);
    submitAnswer(state, "p0", wrong, 20);
    expect(state.players[0]!.score).toBe(SCORE_WRONG);
    expect(state.phase).toBe("buzzing");
    expect(state.answererId).toBeNull();

    // 残りの人は押せる
    const res = buzz(state, "p1", 30);
    expect(res.ok).toBe(true);
    expect(state.answererId).toBe("p1");
  });

  it("回答権のない人の回答は拒否される", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    buzz(state, "p0", 10);
    const res = submitAnswer(state, "p1", 0, 20);
    expect(res.ok).toBe(false);
    expect(state.players[1]!.score).toBe(0);
  });

  it("全員が不正解になると即座に正解が発表される", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    const wrong = wrongChoiceFor(state);
    buzz(state, "p0", 10);
    submitAnswer(state, "p0", wrong, 20);
    buzz(state, "p1", 30);
    submitAnswer(state, "p1", wrong, 40);
    expect(state.phase).toBe("reveal");
    expect(state.reveal?.scoredPlayerId).toBeNull();
  });
});

describe("時間経過（サーバー側の締切）", () => {
  it("出題から20秒たつと正解を発表する", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    const res = tick(state, QUESTION_TIME_MS);
    expect(state.phase).toBe("reveal");
    expect(res.events.some((e) => e.type === "reveal")).toBe(true);
  });

  it("20秒より前に tick しても何も起きない", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    tick(state, QUESTION_TIME_MS - 1);
    expect(state.phase).toBe("buzzing");
  });

  it("10秒以内に回答しないと回答権を手放す（減点なし）", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    buzz(state, "p0", 0);
    tick(state, ANSWER_TIME_MS);
    expect(state.phase).toBe("buzzing");
    expect(state.answererId).toBeNull();
    expect(state.players[0]!.score).toBe(0);
  });

  it("reveal のあと次の問題へ進み、10問で終了する", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    let t = 1;
    for (let q = 0; q < 10; q++) {
      expect(state.qIndex).toBe(q);
      expect(state.phase).toBe("buzzing");
      const answer = correctChoiceFor(state);
      buzz(state, "p0", t++);
      submitAnswer(state, "p0", answer, t++);
      expect(state.phase).toBe("reveal");
      tick(state, t + REVEAL_TIME_MS);
      t += REVEAL_TIME_MS + 1;
      if (q < 9) {
        expect(state.qIndex).toBe(q + 1);
      } else {
        expect(state.phase).toBe("finished");
      }
    }
    const r = ranking(state);
    expect(r[0]!.id).toBe("p0");
    expect(r[0]!.score).toBe(10 * SCORE_CORRECT);
    expect(r[1]!.rank).toBe(2);
  });
});

describe("公開状態", () => {
  it("出題中は正解インデックスをクライアントに渡さない", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    const pub = publicState(state);
    expect(pub.question).not.toBeNull();
    expect(JSON.stringify(pub)).not.toContain("answerIndex");
  });

  it("reveal のときだけ正解が含まれる", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    const answer = correctChoiceFor(state);
    buzz(state, "p0", 1);
    submitAnswer(state, "p0", answer, 2);
    const pub = publicState(state);
    expect(pub.reveal?.answerIndex).toBe(answer);
  });

  it("トークン（秘密情報）を含まない", () => {
    const state = makeRoom(2);
    const pub = publicState(state);
    expect(JSON.stringify(pub)).not.toContain("t0");
    expect(JSON.stringify(pub)).not.toContain("token");
    expect(pub.capacity).toBe(MAX_PLAYERS);
  });
});

describe("順位", () => {
  it("同点は同順位になる", () => {
    const state = makeRoom(3);
    state.players[0]!.score = 20;
    state.players[1]!.score = 20;
    state.players[2]!.score = 5;
    const r = ranking(state);
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3]);
  });
});

describe("ロビーへ戻す", () => {
  it("ホストだけが結果画面からロビーに戻せて点数がリセットされる", () => {
    const state = makeRoom(2);
    startGame(state, "p0", 0);
    state.phase = "finished";
    state.players[0]!.score = 30;
    expect(resetToLobby(state, "p1").ok).toBe(false);
    expect(resetToLobby(state, "p0").ok).toBe(true);
    expect(state.phase).toBe("lobby");
    expect(state.players.every((p) => p.score === 0)).toBe(true);
  });
});
