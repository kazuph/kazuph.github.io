/**
 * ゲーム進行（純粋な状態機械）の単体テスト。
 * 時刻を自分で与えられるので、20秒 / 10秒 / 3.5秒 の挙動も実際には待たずに検証できる。
 */
import { describe, expect, it } from "vitest";
import { QUESTIONS, TOTAL_QUESTIONS } from "../src/questions";
import {
  ANSWER_WINDOW_MS,
  QUESTION_WINDOW_MS,
  REVEAL_MS,
  createLobbyState,
  ranking,
  reduce,
  type GameEvent,
  type GameState,
  type Notice,
} from "../src/game-logic";

const T0 = 1_700_000_000_000;

/** now を差し替えて渡すためのユーティリティ型 */
type WithoutNow<T> = T extends { now: number } ? Omit<T, "now"> : never;

class Game {
  state: GameState;
  notices: Notice[] = [];
  now = T0;

  constructor(code = "TEST") {
    this.state = createLobbyState(code, "");
  }

  private apply(event: WithoutNow<GameEvent>): GameState {
    const result = reduce(this.state, { ...event, now: this.now } as GameEvent);
    this.state = result.state;
    this.notices.push(...result.notices);
    return this.state;
  }

  join(playerId: string, name = playerId): this {
    this.apply({ type: "player_join", playerId, name, token: `tok-${playerId}` });
    this.apply({ type: "player_connected", playerId });
    if (!this.state.hostId) this.state.hostId = playerId;
    return this;
  }

  connect(playerId: string): this {
    this.apply({ type: "player_connected", playerId });
    return this;
  }

  disconnect(playerId: string): this {
    this.apply({ type: "player_disconnected", playerId });
    return this;
  }

  start(playerId = this.state.hostId): this {
    this.apply({ type: "start", playerId });
    return this;
  }

  buzz(playerId: string): this {
    this.apply({ type: "buzz", playerId });
    return this;
  }

  answer(playerId: string, choice: number): this {
    this.apply({ type: "answer", playerId, choice });
    return this;
  }

  tick(): this {
    this.apply({ type: "tick" });
    return this;
  }

  advance(ms: number): this {
    this.now += ms;
    return this;
  }

  lastNotice(): Notice | undefined {
    return this.notices.at(-1);
  }

  player(id: string) {
    const p = this.state.players.find((x) => x.id === id);
    if (!p) throw new Error(`no player ${id}`);
    return p;
  }
}

function gameWith4(): Game {
  return new Game()
    .join("p1", "あおい")
    .join("p2", "はると")
    .join("p3", "みお")
    .join("p4", "そうた");
}

const correctIndexOf = (index: number) => QUESTIONS[index].correct;
const wrongIndexOf = (index: number) => (QUESTIONS[index].correct + 1) % 4;

describe("問題データ", () => {
  it("内蔵の問題はちょうど10問・4択で、正解インデックスが妥当", () => {
    expect(TOTAL_QUESTIONS).toBe(10);
    expect(QUESTIONS).toHaveLength(10);
    for (const q of QUESTIONS) {
      expect(q.choices).toHaveLength(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.text.length).toBeGreaterThan(0);
    }
  });
});

describe("ロビー", () => {
  it("最初に入ったプレイヤーがホストになる", () => {
    const g = new Game().join("p1", "あおい");
    expect(g.state.players).toHaveLength(1);
    expect(g.state.players[0].name).toBe("あおい");
    expect(g.state.hostId).toBe("p1");
    expect(g.state.phase).toBe("lobby");
  });

  it("1人では開始できない", () => {
    const g = new Game().join("p1", "あおい");
    g.start("p1");
    expect(g.state.phase).toBe("lobby");
    expect(g.lastNotice()?.message).toContain("2人以上");
  });

  it("2人いれば開始できる（2〜4人）", () => {
    const g = new Game().join("p1").join("p2");
    g.start("p1");
    expect(g.state.phase).toBe("question");
    expect(g.state.questionIndex).toBe(0);
    expect(g.state.buzzDeadline - g.now).toBe(QUESTION_WINDOW_MS);
  });

  it("ホスト以外は開始できない", () => {
    const g = new Game().join("p1").join("p2");
    g.start("p2");
    expect(g.state.phase).toBe("lobby");
    expect(g.lastNotice()?.message).toContain("ホスト");
  });

  it("接続が切れても座席と点数は保持される（切断中は connected=false）", () => {
    const g = gameWith4();
    g.start().buzz("p1").answer("p1", correctIndexOf(0));
    expect(g.player("p1").score).toBe(10);
    g.disconnect("p1");
    expect(g.player("p1").connected).toBe(false);
    expect(g.player("p1").score).toBe(10);
    g.connect("p1");
    expect(g.player("p1").connected).toBe(true);
    expect(g.player("p1").score).toBe(10);
  });
});

describe("早押し（同時押しで1人だけ）", () => {
  it("同じ時刻に4人が押した場合、最初に処理された1人だけが回答権を得る", () => {
    const g = gameWith4().start();
    // 同じ now で4人分を連続処理 = サーバーが同時に受け取った状況
    g.buzz("p3").buzz("p1").buzz("p4").buzz("p2");
    expect(g.state.phase).toBe("answering");
    expect(g.state.answeringPlayerId).toBe("p3");
    expect(g.state.answerDeadline! - g.now).toBe(ANSWER_WINDOW_MS);
    // 3人は弾かれている
    expect(g.notices.filter((n) => n.message.includes("回答権"))).toHaveLength(3);
  });

  it("回答権を持つ人が答えるまで、他の人の buzz は通らない", () => {
    const g = gameWith4().start().buzz("p2");
    g.advance(3000).buzz("p1");
    expect(g.state.answeringPlayerId).toBe("p2");
    expect(g.state.answerDeadline! - g.now).toBe(ANSWER_WINDOW_MS - 3000);
  });

  it("回答時間が10秒たつと正解が表示される（得点は動かない）", () => {
    const g = gameWith4().start().buzz("p1");
    g.advance(9_999).tick();
    expect(g.state.phase).toBe("answering");
    g.advance(1).tick();
    expect(g.state.phase).toBe("reveal");
    expect(g.state.revealedIndex).toBe(correctIndexOf(0));
    expect(g.player("p1").score).toBe(0);
    expect(g.state.lastAnswer).toBeNull();
  });
});

describe("正誤判定と得点", () => {
  it("正解は +10 点で、全員に正解が表示される", () => {
    const g = gameWith4().start().buzz("p2").answer("p2", correctIndexOf(0));
    expect(g.player("p2").score).toBe(10);
    expect(g.state.phase).toBe("reveal");
    expect(g.state.revealedIndex).toBe(correctIndexOf(0));
    expect(g.state.lastAnswer).toMatchObject({ playerId: "p2", correct: true, awarded: 10 });
    expect(g.state.nextEventAt! - g.now).toBe(REVEAL_MS);
  });

  it("不正解は -5 点で、その人はその問題ではもう押せない", () => {
    const g = gameWith4().start().buzz("p2").answer("p2", wrongIndexOf(0));
    expect(g.player("p2").score).toBe(-5);
    expect(g.player("p2").lockedOut).toBe(true);
    // 残りの人で早押しが再開する
    expect(g.state.phase).toBe("question");
    expect(g.state.answeringPlayerId).toBeNull();
    expect(g.state.buzzDeadline! - g.now).toBe(QUESTION_WINDOW_MS);

    g.advance(1000).buzz("p2");
    expect(g.state.phase).toBe("question");
    expect(g.lastNotice()?.message).toContain("もう押せません");

    // 残りの人は押せる
    g.buzz("p4");
    expect(g.state.answeringPlayerId).toBe("p4");
    g.answer("p4", correctIndexOf(0));
    expect(g.player("p4").score).toBe(10);
    expect(g.state.phase).toBe("reveal");
  });

  it("全員が不正解になったら正解を表示して次の問題へ", () => {
    const g = gameWith4().start();
    const wrong = wrongIndexOf(0);
    g.buzz("p1").answer("p1", wrong);
    g.buzz("p2").answer("p2", wrong);
    g.buzz("p3").answer("p3", wrong);
    expect(g.state.phase).toBe("question");
    g.buzz("p4").answer("p4", wrong);
    expect(g.state.phase).toBe("reveal");
    for (const id of ["p1", "p2", "p3", "p4"]) expect(g.player(id).score).toBe(-5);
    expect(g.state.lastAnswer).toMatchObject({ playerId: "p4", correct: false, awarded: -5 });
  });

  it("回答権のないプレイヤーの answer は無視される", () => {
    const g = gameWith4().start().buzz("p1");
    g.answer("p3", correctIndexOf(0));
    expect(g.state.answeringPlayerId).toBe("p1");
    expect(g.player("p3").score).toBe(0);
    expect(g.state.phase).toBe("answering");
    expect(g.lastNotice()?.message).toContain("回答権");
  });

  it("選択肢の範囲外や非整数は拒否される", () => {
    const g = gameWith4().start().buzz("p1");
    g.answer("p1", 99);
    g.answer("p1", -1);
    g.answer("p1", 1.5);
    expect(g.state.phase).toBe("answering");
    expect(g.player("p1").score).toBe(0);
  });

  it("得点はクライアントから指定できない（イベントに点数の項目がない）", () => {
    const g = gameWith4().start().buzz("p1");
    const forged = { type: "answer", playerId: "p1", choice: correctIndexOf(0), score: 9999, now: g.now };
    const result = reduce(g.state, forged as unknown as GameEvent);
    expect(result.state.players.find((p) => p.id === "p1")!.score).toBe(10);
  });
});

describe("20秒ルールと問題送り", () => {
  it("20秒たつと正解を表示する", () => {
    const g = gameWith4().start();
    expect(g.state.buzzDeadline - g.now).toBe(20_000);
    g.advance(19_999).tick();
    expect(g.state.phase).toBe("question");
    g.advance(1).tick();
    expect(g.state.phase).toBe("reveal");
    expect(g.state.revealedIndex).toBe(correctIndexOf(0));
    expect(g.state.lastAnswer).toBeNull();
  });

  it("正解表示から3.5秒で次の問題に進む", () => {
    const g = gameWith4().start().buzz("p1").answer("p1", correctIndexOf(0));
    g.advance(REVEAL_MS - 1).tick();
    expect(g.state.phase).toBe("reveal");
    g.advance(1).tick();
    expect(g.state.phase).toBe("question");
    expect(g.state.questionIndex).toBe(1);
    // ロックアウトなどは問題ごとにリセットされる
    expect(g.player("p1").lockedOut).toBe(false);
    expect(g.player("p1").solved).toBe(false);
    expect(g.state.revealedIndex).toBeNull();
  });

  it("10問終わると最終順位が出る", () => {
    const g = gameWith4().start();
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      expect(g.state.questionIndex).toBe(i);
      g.buzz("p1").answer("p1", correctIndexOf(i));
      expect(g.state.phase).toBe("reveal");
      g.advance(REVEAL_MS).tick();
    }
    expect(g.state.phase).toBe("finished");
    expect(g.player("p1").score).toBe(TOTAL_QUESTIONS * 10);
    expect(ranking(g.state).map((r) => r.name)).toEqual(["あおい", "はると", "みお", "そうた"]);
    expect(ranking(g.state)[0]).toMatchObject({ rank: 1, score: 100 });
  });

  it("終了後にホストがリセットするとロビーに戻り点数が0になる", () => {
    const g = gameWith4().start();
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      g.buzz("p2").answer("p2", correctIndexOf(i));
      g.advance(REVEAL_MS).tick();
    }
    expect(g.state.phase).toBe("finished");
    const r = reduce(g.state, { type: "reset", playerId: "p1", now: g.now });
    expect(r.state.phase).toBe("lobby");
    expect(r.state.players.every((p) => p.score === 0)).toBe(true);
  });
});
