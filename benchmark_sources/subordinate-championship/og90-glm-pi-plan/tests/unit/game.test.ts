// game.ts（純粋関数）と publish.ts の単体テスト。vitest（Node）で走らせる。
import { describe, expect, it } from "vitest";
import {
  ANSWER_MS,
  GameState,
  QUESTION_MS,
  REVEAL_MS,
  TOTAL_QUESTIONS,
  addPlayer,
  createGame,
  nextDeadline,
  ranking,
  startGame,
  tick,
  tryAnswer,
  tryBuzz,
} from "../../src/game";
import { QUESTIONS } from "../../src/questions";
import { toPublicState } from "../../src/publish";

const T0 = 1_000_000; // 基準時刻
const TEN_MIN = 10 * 60 * 1000;

function makeRoom(count: number): { state: GameState; ids: string[] } {
  let n = 0;
  const nextId = () => `p${++n}`;
  const s0 = createGame("ABC234", nextId(), "ホスト", "token-host", T0);
  const ids: string[] = [s0.players[0]!.id];
  for (let i = 1; i < count; i++) {
    const id = nextId();
    ids.push(id);
    const r = addPlayer(s0, id, `プレイヤー${i}`, `token-${id}`);
    expect(r.ok).toBe(true);
  }
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const started = startGame(s0, s0.hostId!, order, T0);
  expect(started.ok).toBe(true);
  return { state: s0, ids };
}

function buzzFirst(state: GameState, playerId: string, at: number): void {
  const r = tryBuzz(state, playerId, state.qIndex, at);
  expect(r.ok).toBe(true);
}

function answerCorrect(state: GameState, playerId: string, at: number): void {
  const order = state.order;
  const correct = QUESTIONS[order[state.qIndex]!]!.answer;
  const r = tryAnswer(state, playerId, state.qIndex, correct, at);
  expect(r.ok).toBe(true);
}

describe("参加と開始", () => {
  it("定員は4人。5人目は拒否される", () => {
    const s0 = createGame("ABC234", "p1", "ホスト", "t1", T0);
    for (let i = 2; i <= 4; i++) {
      expect(addPlayer(s0, `p${i}`, `P${i}`, `t${i}`).ok).toBe(true);
    }
    const fifth = addPlayer(s0, "p5", "P5", "t5");
    expect(fifth.ok).toBe(false);
    expect(fifth.error).toBe("満員です（4人まで）");
  });

  it("1人では開始できない", () => {
    const s0 = createGame("ABC234", "p1", "ホスト", "t1", T0);
    const r = startGame(s0, "p1", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], T0);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("2人以上そろってから開始できます");
  });

  it("ホスト以外は開始できない", () => {
    const { state, ids } = makeRoom(3);
    const r = startGame(state, ids[1]!, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], T0);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("ホストだけが開始できます");
  });

  it("開始後の新規参加は拒否される", () => {
    const { state } = makeRoom(2);
    const r = addPlayer(state, "pX", "X", "tX");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("ゲームはもう始まっています");
  });

  it("4人で開始でき、第1問の question フェーズになる", () => {
    const { state, ids } = makeRoom(4);
    expect(state.phase).toBe("question");
    expect(state.qIndex).toBe(0);
    expect(state.deadline).toBe(T0 + QUESTION_MS);
    expect(ids).toHaveLength(4);
  });
});

describe("早押し", () => {
  it("4人の buzz をどの順で処理しても、回答権を得るのは最初の1人だけ（24通り全部）", () => {
    const perms = requirePermutations(["a", "b", "c", "d"]);
    for (const perm of perms) {
      const { state, ids } = makeRoom(4);
      const [first, ...rest] = perm;
      // 各プレイヤーが個別に（時差なく上位へ）押したものとして処理する
      buzzFirst(state, ids[playerIndex(first)], T0 + 100);
      for (const later of rest) {
        const r = tryBuzz(state, ids[playerIndex(later)], state.qIndex, T0 + 100);
        expect(r.ok).toBe(false);
        expect(r.error).toBe("いまは押せません");
      }
      expect(state.phase).toBe("answering");
      expect(state.buzzPlayerId).toBe(ids[playerIndex(first)]);
      expect(state.buzzDeadline).toBe(T0 + 100 + ANSWER_MS);
    }
  });

  it("失格した人の buzz は無視され、残りの人で早押しを再開する", () => {
    const { state, ids } = makeRoom(4);
    buzzFirst(state, ids[0], T0 + 100);
    // 不正解
    const wrong = (QUESTIONS[state.order[0]!]!.answer + 1) % 4;
    const r = tryAnswer(state, ids[0], state.qIndex, wrong, T0 + 200);
    expect(r.ok).toBe(true);
    expect(state.phase).toBe("question");
    expect(state.players[0]!.score).toBe(-5);
    // 押し直し
    const r2 = tryBuzz(state, ids[0], state.qIndex, T0 + 300);
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe("この問題はもう押せません");
    buzzFirst(state, ids[1], T0 + 310);
    expect(state.buzzPlayerId).toBe(ids[1]);
  });

  it("buzzDeadline は問題の締め切りを超えない", () => {
    const { state, ids } = makeRoom(4);
    // 問題の残り時間が ANSWER_MS より短い時点で押す
    const at = state.deadline - ANSWER_MS + 1000;
    buzzFirst(state, ids[0], at);
    expect(state.buzzDeadline).toBe(state.deadline);
  });
});

describe("回答と点数", () => {
  it("正解は +10 点で reveal へ", () => {
    const { state, ids } = makeRoom(4);
    buzzFirst(state, ids[2], T0 + 100);
    answerCorrect(state, ids[2], T0 + 1500);
    expect(state.phase).toBe("reveal");
    expect(state.players[2]!.score).toBe(10);
    expect(state.revealCorrect).not.toBeNull();
  });

  it("不正解は -5 点。残りの人で早押しを再開し、全員失格なら reveal", () => {
    const { state, ids } = makeRoom(2);
    buzzFirst(state, ids[0], T0 + 100);
    const wrong = (QUESTIONS[state.order[0]!]!.answer + 1) % 4;
    tryAnswer(state, ids[0], state.qIndex, wrong, T0 + 1500);
    expect(state.phase).toBe("question");
    expect(state.players[0]!.score).toBe(-5);
    expect(state.players[1]!.score).toBe(0);
  });

  it("回答せず10秒たつと -5 点と失格、早押しを再開する", () => {
    const { state, ids } = makeRoom(3);
    buzzFirst(state, ids[0], T0 + 100);
    expect(state.phase).toBe("answering");
    const at = T0 + 100 + ANSWER_MS + 1;
    tick(state, at);
    expect(state.phase).toBe("question"); // 残り2人で再開
    expect(state.players[0]!.score).toBe(-5);
    expect(state.eliminations).toContain(ids[0]);
    buzzFirst(state, ids[1], at + 10);
    expect(state.phase).toBe("answering");
    expect(state.deadline).toBe(T0 + QUESTION_MS); // 問題の締め切りは変わらない
  });

  it("回答中でも問題の20秒で締め切る（-5 と失格、その後 reveal）", () => {
    const { state, ids } = makeRoom(2);
    buzzFirst(state, ids[0], T0 + QUESTION_MS - ANSWER_MS - 100);
    tick(state, T0 + QUESTION_MS);
    expect(state.phase).toBe("reveal");
    expect(state.players[0]!.score).toBe(-5);
    expect(state.eliminations).toContain(ids[0]);
  });

  it("誰も答えず20秒たつと reveal", () => {
    const { state } = makeRoom(4);
    tick(state, T0 + QUESTION_MS - 1);
    expect(state.phase).toBe("question");
    tick(state, T0 + QUESTION_MS);
    expect(state.phase).toBe("reveal");
    expect(state.outcome?.kind).toBe("noanswer");
  });

  it("reveal の3秒後に次の問題へ。10問目のあとは finished", () => {
    const { state, ids } = makeRoom(4);
    // 全問正解で進める
    for (let round = 0; round < TOTAL_QUESTIONS; round++) {
      buzzFirst(state, ids[0], state.shownAt + 100);
      answerCorrect(state, ids[0], state.shownAt + 200);
      expect(state.phase).toBe("reveal");
      tick(state, state.deadline);
      if (round < TOTAL_QUESTIONS - 1) {
        expect(state.phase).toBe("question");
        expect(state.qIndex).toBe(round + 1);
      } else {
        expect(state.phase).toBe("finished");
      }
    }
    expect(state.players[0]!.score).toBe(10 * TOTAL_QUESTIONS);
  });

  it("全員が不正解したら reveal に進む", () => {
    const { state, ids } = makeRoom(2);
    for (let i = 0; i < 2; i++) {
      buzzFirst(state, ids[i], T0 + 100 + i);
      const correct = QUESTIONS[state.order[0]!]!.answer;
      const wrong = (correct + 1) % 4;
      const r = tryAnswer(state, ids[i], state.qIndex, wrong, T0 + 200 + i);
      expect(r.ok).toBe(true);
      if (i < 1) expect(state.phase).toBe("question");
    }
    expect(state.phase).toBe("reveal");
  });
});

describe("順位", () => {
  it("同点は同じ順位", () => {
    const { state, ids } = makeRoom(3);
    // ids[0] と ids[1] を同点にする
    for (const id of [ids[0], ids[1]]) {
      buzzFirst(state, id, state.deadline - ANSWER_MS - 1000);
      answerCorrect(state, id, state.deadline - ANSWER_MS - 500);
      tick(state, state.deadline + REVEAL_MS);
    }
    const ranks = ranking(state);
    expect(ranks[0]!.rank).toBe(1);
    expect(ranks[1]!.rank).toBe(1);
    expect(ranks[2]!.rank).toBe(3);
  });
});

describe("Alarm の予約", () => {
  it("question では問題の締め切り、answering では早いほう", () => {
    const { state, ids } = makeRoom(2);
    expect(nextDeadline(state)).toBe(T0 + QUESTION_MS);
    const at = state.deadline - ANSWER_MS - 500;
    buzzFirst(state, ids[0], at);
    expect(nextDeadline(state)).toBe(at + ANSWER_MS);
  });
});

describe("クライアント向けの配信（publish）", () => {
  it("出題中・回答中の state に正解が含まれない。reveal では含まれる", () => {
    const { state, ids } = makeRoom(3);
    buzzFirst(state, ids[0], T0 + 100);
    const pubQ = toPublicState(state, ids[1], T0 + 150);
    expect(pubQ.correct).toBeNull();
    const correct = QUESTIONS[state.order[0]!]!.answer;
    const ok = tryAnswer(state, ids[0], state.qIndex, correct, T0 + 200);
    void ok;
    const pubR = toPublicState(state, ids[1], T0 + 250);
    expect(pubR.correct).toBe(correct);
  });

  it("他人の token は含まれない", () => {
    const { state, ids } = makeRoom(2);
    const pub = toPublicState(state, ids[0], T0);
    const json = JSON.stringify(pub);
    expect(json).not.toContain("token");
  });
});

// ---- helpers

function playerIndex(letter: string): number {
  return { a: 0, b: 1, c: 2, d: 3 }[letter as "a"]!;
}
function requirePermutations(items: string[]): string[][] {
  const results: string[][] = [];
  const permute = (arr: string[], current: string[]) => {
    if (arr.length === 0) {
      results.push([...current]);
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      permute(rest, [...current, arr[i]!]);
    }
  };
  permute(items, []);
  return results;
}
