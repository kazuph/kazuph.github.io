import { describe, expect, it } from "vitest";
import {
  GameState,
  MAX_PLAYERS,
  QUESTION_MS,
  REVEAL_MS,
  addPlayer,
  buzz,
  createState,
  publicState,
  ranking,
  startGame,
  submitAnswer,
  tick,
} from "../../src/game";

const T0 = 1_000_000; // 任意のサーバー時刻（ミリ秒）

function makeState(playerCount = 4): GameState {
  let state = createState("AB3C9X", "host", "ホスト");
  const ids = ["host"];
  for (let i = 1; i < playerCount; i++) {
    const id = `p${i}`;
    ids.push(id);
    state = addPlayer(state, id, `プレイヤー${i}`).state;
  }
  return state;
}

/** 4人の部屋を開始した直後の state（第1問が出ている） */
function makeStarted(playerCount = 4): { state: GameState; ids: string[] } {
  const state = makeState(playerCount);
  const ids = state.players.map((p) => p.id);
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const correct = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const started = startGame(state, "host", T0, indices, correct).state;
  return { state: started, ids };
}

describe("部屋の定員と開始", () => {
  it("4人までは入れて、5人目は満員で拒否される", () => {
    const state = makeState(4);
    expect(state.players).toHaveLength(MAX_PLAYERS);
    const result = addPlayer(state, "p5", "5人目");
    expect(result.error).toBe("満員です（4人まで）");
  });

  it("参加できるのはロビーの間だけ。開始後は拒否される", () => {
    const { state } = makeStarted(4);
    const result = addPlayer(state, "p5", "5人目");
    expect(result.error).toBe("ゲームはもう始まっています");
  });

  it("開始できるのはホストだけ", () => {
    const state = makeState(3);
    const result = startGame(state, "p1", T0, [0], [0]);
    expect(result.error).toBe("ホストだけが開始できます");
  });

  it("開始できるのは2人以上のとき", () => {
    let state = createState("AB3C9X", "host", "ホスト");
    const alone = startGame(state, "host", T0, [0], [0]);
    expect(alone.error).toBe("開始できるのは2人以上のときです");
    state = addPlayer(state, "p1", "プレイヤー1").state;
    const ok = startGame(state, "host", T0, [0], [0]);
    expect(ok.error).toBeUndefined();
    expect(ok.state.phase).toBe("question");
  });
});

describe("早押し", () => {
  it("4人の buzz をどんな順で処理しても、回答権を得るのは最初に受け取った1人だけ（24通りの並べ替え）", () => {
    const permutations = (arr: string[]): string[][] =>
      arr.length <= 1
        ? [arr]
        : arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((rest) => [x, ...rest]));

    const { state, ids } = makeStarted(4);
    expect(ids).toHaveLength(4);
    for (const order of permutations(ids)) {
      let current = state;
      order.forEach((id, i) => {
        const result = buzz(current, id, 0, T0 + i);
        if (i === 0) {
          expect(result.error).toBeUndefined();
          expect(result.state.phase).toBe("answering");
          expect(result.state.answeringPlayerId).toBe(id);
        } else {
          expect(result.error).toBeDefined();
        }
        current = result.state;
      });
      expect(current.answeringPlayerId).toBe(order[0]);
    }
  });

  it("古い問題番号の buzz は無視される", () => {
    const { state } = makeStarted(2);
    const result = buzz(state, "p1", 5, T0 + 1);
    expect(result.error).toBeDefined();
    expect(result.state.phase).toBe("question");
  });

  it("失格した人の buzz は無視される", () => {
    let { state } = makeStarted(2);
    // p1 が押して外す
    state = buzz(state, "p1", 0, T0 + 1).state;
    state = submitAnswer(state, "p1", 0, 0, T0 + 2).state; // 正解は1 → 不正解
    expect(state.phase).toBe("question"); // 残った p2 で早押しを再開
    const again = buzz(state, "p1", 0, T0 + 3);
    expect(again.error).toBe("この問題は回答済みです");
  });
});

describe("得点", () => {
  it("正解は +10点で reveal へ", () => {
    let { state } = makeStarted(4);
    state = buzz(state, "p2", 0, T0 + 1).state;
    state = submitAnswer(state, "p2", 0, 1, T0 + 2).state;
    expect(state.phase).toBe("reveal");
    expect(state.players.find((p) => p.id === "p2")!.score).toBe(10);
    expect(state.revealUntil).toBe(T0 + 2 + REVEAL_MS);
  });

  it("不正解は -5点で失格。ほかに押せる人がいれば question に戻る", () => {
    let { state } = makeStarted(4);
    state = buzz(state, "p2", 0, T0 + 1).state;
    const result = submitAnswer(state, "p2", 0, 0, T0 + 2);
    state = result.state;
    expect(result.correct).toBe(false);
    expect(state.phase).toBe("question");
    expect(state.players.find((p) => p.id === "p2")!.score).toBe(-5);
    expect(state.eliminated).toContain("p2");
  });

  it("回答せず10秒がすぎると -5点で失格になる", () => {
    // 2人部屋: ホストと p1
    let { state } = makeStarted(2);
    state = buzz(state, "p1", 0, T0 + 1).state;
    state = tick(state, T0 + 1 + 10_000); // 回答の締め切り
    expect(state.players.find((p) => p.id === "p1")!.score).toBe(-5);
    // 押せる人が残っていれば同じ問題で早押しを再開する
    expect(state.phase).toBe("question");
    expect(state.eliminated).toContain("p1");
  });
});

describe("締め切り", () => {
  it("問題が出てから20秒たつと誰も答えていなくても reveal になる", () => {
    const { state } = makeStarted(4);
    const advanced = tick(state, T0 + QUESTION_MS);
    expect(advanced.phase).toBe("reveal");
  });

  it("回答中でも20秒で締め切られる（回答10秒より問題20秒が先なら20秒）", () => {
    let { state } = makeStarted(2);
    state = tick(state, T0 + 15_000); // 出題から15秒。まだ締め切り前
    expect(state.phase).toBe("question");
    state = buzz(state, "p1", 0, T0 + 15_000).state; // 押す（回答の締め切りは T0+25s だが問題は T0+20s）
    const cut = tick(state, T0 + 20_000);
    expect(cut.phase).toBe("reveal");
    expect(cut.players.find((p) => p.id === "p1")!.score).toBe(-5);
  });

  it("全員が失格したら reveal へ進む", () => {
    let { state } = makeStarted(2); // 2人部屋: ホストと p1
    for (const id of ["p1", "host"]) {
      state = buzz(state, id, 0, T0 + 1).state;
      state = submitAnswer(state, id, 0, 0, T0 + 2).state; // どちらも不正解
    }
    expect(state.phase).toBe("reveal");
  });
});

describe("ゲームの進行", () => {
  it("10問終わったら finished になる", () => {
    let { state } = makeStarted(2);
    for (let q = 0; q < 10; q++) {
      state = buzz(state, "p1", q, T0 + q).state;
      state = submitAnswer(state, "p1", q, 1, T0 + q + 1).state; // 毎回正解
      expect(state.phase).toBe("reveal");
      state = tick(state, state.revealUntil!);
      expect(state.phase).toBe(q === 9 ? "finished" : "question");
      expect(state.questionIndex).toBe(Math.min(q + 1, 9));
    }
    expect(state.phase).toBe("finished");
  });

  it("同点は同じ順位になる", () => {
    let { state } = makeStarted(2); // 2人部屋: ホストと p1
    state = buzz(state, "p1", 0, T0).state;
    state = submitAnswer(state, "p1", 0, 1, T0).state; // p1 +10
    const ranks = ranking(state);
    expect(ranks.find((r) => r.id === "p1")!.rank).toBe(1);
    expect(ranks.find((r) => r.id === "host")!.rank).toBe(2);
    // 同点にすると全員が1位
    const tied = { ...state, players: state.players.map((p) => ({ ...p, score: 10 })) };
    expect(ranking(tied).every((r) => r.rank === 1)).toBe(true);
  });
});

describe("状態の公開", () => {
  it("出題中・回答中の状態には正解が含まれない。reveal では含まれる", () => {
    const { state } = makeStarted(2);
    const q = publicState(state, "p1", T0, [{ text: "t", choices: ["a", "b", "c", "d"] }]);
    expect(q.correct).toBeNull();

    const answering = buzz(state, "p1", 0, T0 + 1).state;
    const a = publicState(answering, "p1", T0 + 1, [{ text: "t", choices: ["a", "b", "c", "d"] }]);
    expect(a.correct).toBeNull();

    const revealed = submitAnswer(answering, "p1", 0, 1, T0 + 2).state;
    const r = publicState(revealed, "p1", T0 + 2, [{ text: "t", choices: ["a", "b", "c", "d"] }]);
    expect(r.correct).toBe(1);
  });

  it("ロビーの状態には問題が入らない", () => {
    const state = makeState(2);
    const pub = publicState(state, "host", T0, []);
    expect(pub.question).toBeNull();
    expect(pub.questionCount).toBe(10);
    expect(pub.questionIndex).toBe(-1);
  });
});
