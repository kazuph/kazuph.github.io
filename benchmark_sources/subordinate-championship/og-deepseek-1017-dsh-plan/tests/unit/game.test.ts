import { describe, expect, it } from "vitest";
import {
  ANSWER_TIME_MS,
  MAX_PLAYERS,
  POINTS_CORRECT,
  POINTS_WRONG,
  QUESTION_TIME_MS,
  QUESTIONS_PER_GAME,
  REVEAL_TIME_MS,
  answer,
  buzz,
  createRoom,
  joinRoom,
  nextDeadline,
  publicState,
  ranking,
  startGame,
  tick,
  type Player,
  type RoomState,
} from "../../src/game";
import { QUESTIONS, pickQuestions } from "../../src/questions";

const START = 1_000;
const HOST = "p0";

function makePlayer(index: number, name = `P${index}`): Player {
  return {
    id: `p${index}`,
    name,
    token: `t${index}`,
    score: 0,
    connected: true,
    lockedOut: false,
  };
}

function makeRoom(playerCount: number): RoomState {
  let state = createRoom("TEST01", makePlayer(0));
  for (let index = 1; index < playerCount; index += 1) {
    state = joinRoom(state, makePlayer(index)).state;
  }
  return state;
}

/** 開始直後の「第1問・出題中」の状態を作る。 */
function startedRoom(playerCount: number): RoomState {
  const outcome = startGame(makeRoom(playerCount), HOST, START, () => 0.42);
  if (outcome.error) throw new Error(outcome.error);
  return outcome.state;
}

function correctIndexOf(state: RoomState): number {
  return QUESTIONS[state.questionOrder[state.questionIndex]].correctIndex;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) {
      result.push([item, ...tail]);
    }
  });
  return result;
}

describe("部屋と開始", () => {
  it("定員は4人で、5人目は満員として拒否される", () => {
    expect(MAX_PLAYERS).toBe(4);
    const room = makeRoom(4);
    const outcome = joinRoom(room, makePlayer(4, "P4"));
    expect(outcome.error).toBe("満員です（4人まで）");
    expect(outcome.state.players).toHaveLength(4);
  });

  it("ホストでも2人未満では開始できない", () => {
    const outcome = startGame(makeRoom(1), HOST, START);
    expect(outcome.error).toBe("開始するには2人以上必要です");
    expect(outcome.state.phase).toBe("lobby");
  });

  it("ホスト以外は開始できない", () => {
    const outcome = startGame(makeRoom(3), "p1", START);
    expect(outcome.error).toBe("開始できるのは部屋を作った人だけです");
    expect(outcome.state.phase).toBe("lobby");
  });

  it("2〜4人ならホストが開始でき、10問が用意される", () => {
    for (const count of [2, 3, 4]) {
      const outcome = startGame(makeRoom(count), HOST, START);
      expect(outcome.error).toBeUndefined();
      expect(outcome.state.phase).toBe("question");
      expect(outcome.state.questionOrder).toHaveLength(QUESTIONS_PER_GAME);
      expect(new Set(outcome.state.questionOrder).size).toBe(QUESTIONS_PER_GAME);
    }
  });

  it("開始後は新しい人は入れず、もう一度開始もできない", () => {
    const started = startedRoom(2);
    expect(joinRoom(started, makePlayer(3)).error).toBe("ゲームはもう始まっています");
    expect(startGame(started, HOST, START).error).toBe("ゲームはもう始まっています");
  });
});

describe("早押し", () => {
  it("4人をどの順で処理しても、回答権を得るのは最初の1人だけ（24通り）", () => {
    const orders = permutations(["p0", "p1", "p2", "p3"]);
    expect(orders).toHaveLength(24);
    for (const order of orders) {
      let state = startedRoom(4);
      const now = state.questionStartedAt! + 100;
      const winners: string[] = [];
      for (const playerId of order) {
        const outcome = buzz(state, playerId, state.questionIndex, now);
        state = outcome.state;
        if (!outcome.error && !outcome.ignored && state.answeringPlayerId) {
          winners.push(state.answeringPlayerId);
        }
      }
      expect(winners).toEqual([order[0]]);
      expect(state.phase).toBe("answering");
      expect(state.answeringPlayerId).toBe(order[0]);
    }
  });

  it("古い問題番号の早押しは無視する", () => {
    const state = startedRoom(2);
    const outcome = buzz(state, "p1", state.questionIndex + 5, START + 100);
    expect(outcome.ignored).toBe(true);
    expect(outcome.state.phase).toBe("question");
    expect(outcome.state.answeringPlayerId).toBeNull();
  });

  it("ロビーでは早押しできない", () => {
    const outcome = buzz(makeRoom(2), "p1", -1, START);
    expect(outcome.error).toBe("今は早押しできません");
  });
});

describe("回答と点数", () => {
  it("正解すると +10 点で正解発表になる", () => {
    let state = startedRoom(2);
    const now = state.questionStartedAt! + 100;
    state = buzz(state, "p1", state.questionIndex, now).state;
    state = answer(state, "p1", state.questionIndex, correctIndexOf(state), now + 200).state;
    expect(state.phase).toBe("reveal");
    expect(state.players.find((player) => player.id === "p1")!.score).toBe(POINTS_CORRECT);
  });

  it("不正解は -5 点でその問題はもう押せない。残りの人で再開する", () => {
    let state = startedRoom(3);
    const now = state.questionStartedAt! + 100;
    const wrong = (correctIndexOf(state) + 1) % 4;
    state = buzz(state, "p1", state.questionIndex, now).state;
    state = answer(state, "p1", state.questionIndex, wrong, now + 200).state;
    expect(state.phase).toBe("question");
    const wronged = state.players.find((player) => player.id === "p1")!;
    expect(wronged.score).toBe(POINTS_WRONG);
    expect(wronged.lockedOut).toBe(true);

    const rejected = buzz(state, "p1", state.questionIndex, now + 300);
    expect(rejected.error).toBe("この問題ではもう押せません");
    expect(rejected.state.answeringPlayerId).toBeNull();

    const accepted = buzz(state, "p2", state.questionIndex, now + 400);
    expect(accepted.error).toBeUndefined();
    expect(accepted.state.answeringPlayerId).toBe("p2");
  });

  it("回答権のない人の回答は受け付けない", () => {
    let state = startedRoom(2);
    const now = state.questionStartedAt! + 100;
    state = buzz(state, "p1", state.questionIndex, now).state;
    const outcome = answer(state, "p0", state.questionIndex, correctIndexOf(state), now + 100);
    expect(outcome.error).toBe("回答権がありません");
  });
});

describe("時間切れ", () => {
  it("問題から20秒で、だれも押していなくても正解発表になる", () => {
    const state = startedRoom(2);
    const deadline = state.questionStartedAt! + QUESTION_TIME_MS;
    expect(nextDeadline(state)).toBe(deadline);
    expect(tick(state, deadline - 1).phase).toBe("question");
    expect(tick(state, deadline).phase).toBe("reveal");
  });

  it("回答権を得て10秒たつと -5 点で失格になる", () => {
    let state = startedRoom(2);
    const now = state.questionStartedAt! + 100;
    state = buzz(state, "p0", state.questionIndex, now).state;
    const answerDeadline = state.answeringDeadline!;
    expect(answerDeadline).toBe(now + ANSWER_TIME_MS);
    expect(tick(state, answerDeadline - 1).phase).toBe("answering");
    const after = tick(state, answerDeadline);
    expect(after.phase).toBe("question");
    expect(after.players.find((player) => player.id === "p0")!.score).toBe(POINTS_WRONG);
    expect(after.players.find((player) => player.id === "p0")!.lockedOut).toBe(true);
  });

  it("回答中でも問題の20秒が来たら締め切って正解発表になる", () => {
    let state = startedRoom(2);
    const questionDeadline = state.questionStartedAt! + QUESTION_TIME_MS;
    // 締め切り直前（残り1秒）に押すと、回答の締め切りは問題の締め切りと同じになる。
    state = buzz(state, "p0", state.questionIndex, questionDeadline - 1_000).state;
    expect(state.answeringDeadline).toBe(questionDeadline);
    const after = tick(state, questionDeadline);
    expect(after.phase).toBe("reveal");
    expect(after.players.find((player) => player.id === "p0")!.score).toBe(POINTS_WRONG);
  });

  it("全員が失格すると正解発表になる", () => {
    let state = startedRoom(3);
    const now = state.questionStartedAt! + 100;
    for (const playerId of ["p0", "p1"]) {
      const wrong = (correctIndexOf(state) + 1) % 4;
      state = buzz(state, playerId, state.questionIndex, now).state;
      state = answer(state, playerId, state.questionIndex, wrong, now + 100).state;
      expect(state.phase).toBe("question");
    }
    const wrong = (correctIndexOf(state) + 1) % 4;
    state = buzz(state, "p2", state.questionIndex, now).state;
    state = answer(state, "p2", state.questionIndex, wrong, now + 100).state;
    expect(state.phase).toBe("reveal");
  });
});

describe("正解発表と次の問題", () => {
  it("正解発表は3秒で次の問題へ進む", () => {
    let state = startedRoom(2);
    const now = state.questionStartedAt! + 100;
    state = buzz(state, "p0", state.questionIndex, now).state;
    state = answer(state, "p0", state.questionIndex, correctIndexOf(state), now + 100).state;
    const revealDeadline = state.revealDeadline!;
    expect(revealDeadline).toBe(now + 100 + REVEAL_TIME_MS);
    const next = tick(state, revealDeadline);
    expect(next.questionIndex).toBe(1);
    expect(next.phase).toBe("question");
    expect(next.players.every((player) => !player.lockedOut)).toBe(true);
  });

  it("10問終わると終了し、同点は同じ順位になる", () => {
    let state = startGame(makeRoom(2), HOST, START, () => 0.42).state;
    for (let question = 0; question < QUESTIONS_PER_GAME; question += 1) {
      const now = state.questionStartedAt! + 50;
      state = buzz(state, "p0", state.questionIndex, now).state;
      state = answer(state, "p0", state.questionIndex, correctIndexOf(state), now + 50).state;
      state = tick(state, state.revealDeadline!);
    }
    expect(state.phase).toBe("finished");
    expect(state.questionIndex).toBe(QUESTIONS_PER_GAME);
    expect(state.players.find((player) => player.id === "p0")!.score).toBe(100);

    const tied: RoomState = {
      ...state,
      players: [
        { ...makePlayer(0, "A"), score: 30 },
        { ...makePlayer(1, "B"), score: 30 },
        { ...makePlayer(2, "C"), score: 10 },
        { ...makePlayer(3, "D"), score: 0 },
      ],
    };
    expect(ranking(tied).map((entry) => entry.rank)).toEqual([1, 1, 3, 4]);
  });
});

describe("公開する状態", () => {
  it("出題中と回答中は正解の番号を含めない", () => {
    let state = startedRoom(2);
    const questionState = publicState(state, "p0", START);
    expect(questionState.correctIndex).toBeNull();
    expect(questionState.question).not.toBeNull();

    const now = state.questionStartedAt! + 100;
    state = buzz(state, "p0", state.questionIndex, now).state;
    expect(publicState(state, "p0", now).correctIndex).toBeNull();

    state = answer(state, "p0", state.questionIndex, correctIndexOf(state), now + 100).state;
    expect(publicState(state, "p0", now + 100).correctIndex).toBe(correctIndexOf(state));
  });

  it("開始できるかどうかはホストにだけ true を返す", () => {
    const room = makeRoom(3);
    expect(publicState(room, HOST, START).canStart).toBe(true);
    expect(publicState(room, "p1", START).canStart).toBe(false);
    expect(publicState(makeRoom(1), HOST, START).canStart).toBe(false);
  });
});

describe("内蔵の問題", () => {
  it("12問以上あり、正解の番号は0〜3の範囲にある", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(12);
    for (const question of QUESTIONS) {
      expect(question.choices).toHaveLength(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
    }
  });

  it("問題の番号は重複せずに10問えらばれる", () => {
    const picked = pickQuestions(QUESTIONS_PER_GAME, () => 0.3);
    expect(picked).toHaveLength(QUESTIONS_PER_GAME);
    expect(new Set(picked).size).toBe(QUESTIONS_PER_GAME);
    expect(picked.every((index) => index >= 0 && index < QUESTIONS.length)).toBe(true);
  });
});
