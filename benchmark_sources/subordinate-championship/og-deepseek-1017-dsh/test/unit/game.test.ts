import { describe, expect, it } from "vitest";
import {
  actingHostId,
  buzz,
  buzzWithTiming,
  canStart,
  createRoom,
  currentQuestion,
  handleTimeout,
  joinRoom,
  maybeRevealWhenExhausted,
  nextDeadline,
  publicState,
  rankPlayers,
  rematch,
  startGame,
  submitAnswer,
} from "../../src/game";
import { QUESTIONS, QUESTIONS_PER_GAME, getQuestionById, pickQuestions } from "../../src/questions";
import type { RoomState, Timing } from "../../src/protocol";

const TIMING: Timing = { questionMs: 20000, answerMs: 10000, revealMs: 3000 };

function makeRoom(count: number, now = 1000): RoomState {
  const room = createRoom("TEST");
  for (let i = 0; i < count; i++) {
    const result = joinRoom(room, { name: `player${i}`, now: now + i });
    if (!result.ok) throw new Error("join failed in fixture");
  }
  return room;
}

function startedRoom(count: number, now = 1000): RoomState {
  const room = makeRoom(count, now);
  const result = startGame(room, room.hostId!, now + 100, TIMING, () => 0.42);
  if (!result.ok) throw new Error("start failed in fixture");
  return room;
}

describe("問題バンク", () => {
  it("10問以上あり、すべて4択・正解インデックスが有効", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(QUESTIONS_PER_GAME);
    for (const q of QUESTIONS) {
      expect(q.choices).toHaveLength(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(4);
      expect(q.text.length).toBeGreaterThan(0);
    }
  });

  it("pickQuestions は重複なしで指定数を返す", () => {
    const picked = pickQuestions(10);
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((q) => q.id)).size).toBe(10);
  });
});

describe("入室と定員", () => {
  it("存在しない部屋コードは ROOM_NOT_FOUND", () => {
    const room = createRoom("AAAA");
    room.created = false;
    const result = joinRoom(room, { name: "x", now: 1 });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ROOM_NOT_FOUND");
  });

  it("4人までは入れて、5人目は ROOM_FULL（理由メッセージ付き）", () => {
    const room = makeRoom(4);
    expect(room.players).toHaveLength(4);
    const fifth = joinRoom(room, { name: "ごう", now: 9999 });
    expect(fifth.ok).toBe(false);
    expect(fifth.code).toBe("ROOM_FULL");
    expect(fifth.message).toContain("定員4人");
    expect(room.players).toHaveLength(4);
  });

  it("名前が空だと BAD_NAME", () => {
    const room = makeRoom(1);
    const result = joinRoom(room, { name: "   ", now: 10 });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("BAD_NAME");
  });

  it("トークンがあればゲーム中でも同じプレイヤーとして復帰できる", () => {
    const room = startedRoom(2);
    const target = room.players[0];
    target.connected = false;
    const resumed = joinRoom(room, { name: "別名", token: target.token, now: 2000 });
    expect(resumed.ok).toBe(true);
    expect(resumed.reconnected).toBe(true);
    expect(resumed.player!.id).toBe(target.id);
    expect(resumed.player!.connected).toBe(true);
  });

  it("トークンなしの途中参加は GAME_IN_PROGRESS", () => {
    const room = startedRoom(2);
    const result = joinRoom(room, { name: "newbie", now: 2000 });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("GAME_IN_PROGRESS");
  });
});

describe("開始条件", () => {
  it("ホスト以外は開始できない", () => {
    const room = makeRoom(2);
    const check = canStart(room, room.players[1].id);
    expect(check.ok).toBe(false);
    expect(check.code).toBe("NOT_HOST");
  });

  it("1人では開始できない", () => {
    const room = makeRoom(1);
    expect(canStart(room, room.hostId!).ok).toBe(false);
  });

  it("2人いれば開始でき、10問が用意される", () => {
    const room = makeRoom(2);
    const result = startGame(room, room.hostId!, 5000, TIMING);
    expect(result.ok).toBe(true);
    expect(room.phase).toBe("question");
    expect(room.questionOrder).toHaveLength(QUESTIONS_PER_GAME);
    expect(room.questionIndex).toBe(0);
  });

  it("ホストが切断している間は最古参の接続者がホスト代行になる", () => {
    const room = makeRoom(3);
    room.players[0].connected = false;
    expect(actingHostId(room)).toBe(room.players[1].id);
  });
});

describe("早押しの裁定（同時押し）", () => {
  it("同じ時刻に押しても回答権は1人だけ", () => {
    const room = startedRoom(3);
    const [a, b, c] = room.players;
    const now = 6000;

    const r1 = buzzWithTiming(room, a.id, now, TIMING);
    const r2 = buzzWithTiming(room, b.id, now, TIMING);
    const r3 = buzzWithTiming(room, c.id, now, TIMING);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(false);
    expect(r3.ok).toBe(false);
    expect(room.answererId).toBe(a.id);
    expect(r2.message).toContain("他の人");
  });

  it("いったん回答権が出たら、他は押しても獲れない", () => {
    const room = startedRoom(2);
    const [a, b] = room.players;
    expect(buzzWithTiming(room, a.id, 6000, TIMING).ok).toBe(true);
    expect(buzzWithTiming(room, b.id, 6001, TIMING).ok).toBe(false);
    expect(room.answererId).toBe(a.id);
    expect(room.answerDeadline).toBe(6000 + TIMING.answerMs);
  });

  it("問題の制限時間を過ぎた押下は拒否される", () => {
    const room = startedRoom(2);
    const [a] = room.players;
    const afterDeadline = room.questionDeadline! + 1;
    const result = buzzWithTiming(room, a.id, afterDeadline, TIMING);
    expect(result.ok).toBe(false);
    expect(room.answererId).toBeNull();
  });
});

describe("採点と再開", () => {
  it("正解は +10 点で正解が公開される", () => {
    const room = startedRoom(2);
    const [a] = room.players;
    const q = currentQuestion(room)!;
    buzzWithTiming(room, a.id, 6000, TIMING);
    const result = submitAnswer(room, a.id, q.correct, 6100, TIMING);
    expect(result.ok).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.delta).toBe(10);
    expect(a.score).toBe(10);
    expect(room.phase).toBe("reveal");
    expect(room.lastReveal!.correct).toBe(q.correct);
  });

  it("不正解は -5 点、その問題ではもう押せない、残りは再開できる", () => {
    const room = startedRoom(2);
    const [a, b] = room.players;
    const q = currentQuestion(room)!;
    const wrong = (q.correct + 1) % 4;

    buzzWithTiming(room, a.id, 6000, TIMING);
    const result = submitAnswer(room, a.id, wrong, 6100, TIMING);
    expect(result.correct).toBe(false);
    expect(a.score).toBe(-5);
    expect(room.locked).toContain(a.id);
    expect(room.answererId).toBeNull();
    expect(room.phase).toBe("question");

    // 不正解者は再押下できない
    expect(buzzWithTiming(room, a.id, 6200, TIMING).ok).toBe(false);
    // 残りの人は押せる
    expect(buzzWithTiming(room, b.id, 6300, TIMING).ok).toBe(true);
    expect(room.answererId).toBe(b.id);
  });

  it("接続中の全員が押せなくなったら正解を公開する", () => {
    const room = startedRoom(2);
    const [a, b] = room.players;
    const q = currentQuestion(room)!;
    const wrongA = (q.correct + 1) % 4;
    const wrongB = (q.correct + 2) % 4;

    buzzWithTiming(room, a.id, 6000, TIMING);
    submitAnswer(room, a.id, wrongA, 6100, TIMING);
    buzzWithTiming(room, b.id, 6200, TIMING);
    submitAnswer(room, b.id, wrongB, 6300, TIMING);

    expect(room.phase).toBe("reveal");
    expect(room.lastReveal!.correct).toBe(q.correct);
  });

  it("回答権を持たない人の回答は拒否され、点数は動かない", () => {
    const room = startedRoom(2);
    const [a, b] = room.players;
    const q = currentQuestion(room)!;
    buzzWithTiming(room, a.id, 6000, TIMING);
    const result = submitAnswer(room, b.id, q.correct, 6100, TIMING);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("NOT_ANSWERER");
    expect(b.score).toBe(0);
    expect(a.score).toBe(0);
  });
});

describe("時間切れとフェーズ遷移", () => {
  it("20秒経過で正解を公開し、その後次の問題へ進む", () => {
    const room = startedRoom(2);
    const startDeadline = room.questionDeadline!;
    expect(nextDeadline(room)).toBe(startDeadline);

    expect(handleTimeout(room, startDeadline - 1, TIMING)).toBe(false);
    expect(handleTimeout(room, startDeadline, TIMING)).toBe(true);
    expect(room.phase).toBe("reveal");

    const revealDeadline = room.revealDeadline!;
    expect(handleTimeout(room, revealDeadline, TIMING)).toBe(true);
    expect(room.phase).toBe("question");
    expect(room.questionIndex).toBe(1);
  });

  it("回答権を取った人は10秒もらえる（問題全体の締め切りが延長される）", () => {
    const room = startedRoom(2);
    const [a] = room.players;
    const lateBuzz = room.questionDeadline! - 500; // 残り0.5秒で押す
    buzzWithTiming(room, a.id, lateBuzz, TIMING);
    expect(room.questionDeadline).toBe(lateBuzz + TIMING.answerMs);
    expect(room.answerDeadline).toBe(lateBuzz + TIMING.answerMs);
  });

  it("10秒以内に選ばなかった場合は減点なしでロックし、残りで再開する", () => {
    const room = startedRoom(2);
    const [a, b] = room.players;
    buzzWithTiming(room, a.id, 6000, TIMING);
    handleTimeout(room, 6000 + TIMING.answerMs, TIMING);
    expect(a.score).toBe(0);
    expect(room.locked).toContain(a.id);
    expect(room.phase).toBe("question");
    expect(buzzWithTiming(room, b.id, 16001, TIMING).ok).toBe(true);
  });

  it("切断で押せる人がいなくなったら正解を公開する", () => {
    const room = startedRoom(1 + 1);
    const [a, b] = room.players;
    const q = currentQuestion(room)!;
    buzzWithTiming(room, a.id, 6000, TIMING);
    submitAnswer(room, a.id, (q.correct + 1) % 4, 6100, TIMING);
    b.connected = false;
    expect(maybeRevealWhenExhausted(room, 6200, TIMING)).toBe(true);
    expect(room.phase).toBe("reveal");
  });

  it("10問すべて正解すると100点で final になる", () => {
    const room = startedRoom(2);
    const [a] = room.players;
    let now = 6000;
    let guard = 0;
    while (room.phase !== "final" && guard++ < 100) {
      const q = currentQuestion(room)!;
      expect(buzzWithTiming(room, a.id, now, TIMING).ok).toBe(true);
      now += 100;
      expect(submitAnswer(room, a.id, q.correct, now, TIMING).ok).toBe(true);
      now += TIMING.revealMs;
      handleTimeout(room, now, TIMING);
    }
    expect(room.phase).toBe("final");
    expect(a.score).toBe(100);
    expect(a.correctCount).toBe(10);
  });
});

describe("公開状態と順位", () => {
  it("正解が公開されるまで publicState に正解が含まれない", () => {
    const room = startedRoom(2);
    const state = publicState(room, 6000, TIMING);
    expect(state.phase).toBe("question");
    expect(state.question).not.toBeNull();
    expect(state.question as unknown as Record<string, unknown>).not.toHaveProperty("correct");
    expect(JSON.stringify(state)).not.toContain('"correct":');

    const [a] = room.players;
    const q = currentQuestion(room)!;
    buzzWithTiming(room, a.id, 6100, TIMING);
    submitAnswer(room, a.id, q.correct, 6200, TIMING);
    const revealState = publicState(room, 6300, TIMING);
    expect(revealState.reveal!.correct).toBe(q.correct);
  });

  it("順位は 得点 → 正解数 → 入室順 で決まる", () => {
    const room = makeRoom(3);
    room.players[0].score = 20;
    room.players[1].score = 20;
    room.players[1].correctCount = 2;
    room.players[2].score = 5;
    const ranked = rankPlayers(room);
    expect(ranked[0].playerId).toBe(room.players[1].id);
    expect(ranked[1].playerId).toBe(room.players[0].id);
    expect(ranked[2].playerId).toBe(room.players[2].id);
  });

  it("同点・同正解数は同順位になる", () => {
    const room = makeRoom(2);
    room.players[0].score = 10;
    room.players[0].correctCount = 1;
    room.players[1].score = 10;
    room.players[1].correctCount = 1;
    const ranked = rankPlayers(room);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
  });

  it("タイマー情報はフェーズに応じて切り替わる", () => {
    const room = startedRoom(2);
    const [a] = room.players;
    expect(publicState(room, 0, TIMING).timer.kind).toBe("question");
    buzzWithTiming(room, a.id, 6100, TIMING);
    expect(publicState(room, 0, TIMING).timer.kind).toBe("answer");
    const q = currentQuestion(room)!;
    submitAnswer(room, a.id, q.correct, 6200, TIMING);
    expect(publicState(room, 0, TIMING).timer.kind).toBe("reveal");
  });

  it("得点はサーバー側の記録からだけ算出され、問題IDが公開される", () => {
    const room = startedRoom(2);
    const state = publicState(room, 0, TIMING);
    expect(getQuestionById(state.question!.id)).toBeDefined();
  });
});

describe("もう一度あそぶ", () => {
  it("final からホストが再戦すると点数がリセットされて1問目から始まる", () => {
    const room = startedRoom(2);
    const [a] = room.players;
    let now = 6000;
    let guard = 0;
    while (room.phase !== "final" && guard++ < 100) {
      const q = currentQuestion(room)!;
      buzzWithTiming(room, a.id, now, TIMING);
      now += 100;
      submitAnswer(room, a.id, q.correct, now, TIMING);
      now += TIMING.revealMs;
      handleTimeout(room, now, TIMING);
    }
    expect(room.phase).toBe("final");

    const result = rematch(room, room.hostId!, now, TIMING, () => 0.42);
    expect(result.ok).toBe(true);
    expect(room.phase).toBe("question");
    expect(room.round).toBe(2);
    expect(room.players.every((p) => p.score === 0)).toBe(true);
    expect(room.questionIndex).toBe(0);
  });

  it("ホスト以外の再戦は拒否される", () => {
    const room = startedRoom(2);
    room.phase = "final";
    const result = rematch(room, room.players[1].id, 100, TIMING);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("NOT_HOST");
  });
});

describe("buzz() 単体", () => {
  it("問題フェーズ以外では押せない", () => {
    const room = makeRoom(2);
    expect(buzz(room, room.players[0].id, 1).ok).toBe(false);
  });
});
