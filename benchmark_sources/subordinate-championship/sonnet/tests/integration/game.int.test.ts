import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, TIMING, correctChoice, createRoom, fillRoom, startServer, wrongChoice } from "./harness";

let base = "";
let stop: () => Promise<void>;

beforeAll(async () => {
  ({ base, stop } = await startServer());
}, 120_000);
afterAll(async () => {
  await stop?.();
});

describe("入室（項目1・2・3）", () => {
  it("部屋を作って参加でき、5人目は理由つきで入れない", async () => {
    const { code, clients } = await fillRoom(base, ["あ", "い", "う", "え"]);
    expect(clients[0].state!.hostId).toBe(clients[0].playerId);
    await clients[0].until(() => clients[0].state!.players.length === 4, "4人そろう");
    const fifth = await Client.open(base, code, "お");
    expect(fifth.errors[0]).toMatchObject({ code: "ROOM_FULL", fatal: true });
    expect(fifth.errors[0].message).toContain("満員");
    expect(fifth.state).toBeNull();
    clients.forEach((c) => c.close());
  });
  it("存在しない部屋コードは理由つきで拒否される", async () => {
    const c = await Client.open(base, "ZZZZ", "あ");
    expect(c.errors[0]).toMatchObject({ code: "ROOM_NOT_FOUND" });
  });
  it("1人では開始できず、ホスト以外も開始できない", async () => {
    const { clients } = await fillRoom(base, ["あ"]);
    clients[0].send({ t: "start" });
    await clients[0].until(() => clients[0].errors.some((e) => e.code === "BAD_COUNT"), "人数不足エラー");
    expect(clients[0].state!.phase).toBe("lobby");
    const code = clients[0].state!.code as string;
    const b = await Client.open(base, code, "い");
    b.send({ t: "start" });
    await b.until(() => b.errors.some((e) => e.code === "NOT_HOST"), "ホスト以外エラー");
    clients[0].close();
    b.close();
  });
});

describe("早押し（項目5・6・7）", () => {
  it("4人が同時に押しても、毎回ちょうど1人だけが回答権を得て、全員の画面で同じ人になる", async () => {
    const { clients } = await fillRoom(base, ["あ", "い", "う", "え"]);
    clients[0].send({ t: "start" });
    await Promise.all(clients.map((c) => c.waitPhase("question")));
    for (let round = 0; round < 4; round++) {
      const s0 = clients[0].state!;
      expect(s0.phase).toBe("question");
      const before = clients.map((c) => c.errors.length);
      // 4人分を同じ瞬間に送る
      clients.forEach((c) => c.send({ t: "buzz" }));
      await Promise.all(clients.map((c) => c.until(() => c.state!.phase === "answering", "回答権が決まる")));
      const answerers = new Set(clients.map((c) => c.state!.answererId));
      expect(answerers.size).toBe(1);
      const winnerId = [...answerers][0]!;
      const winner = clients.find((c) => c.playerId === winnerId)!;
      await Promise.all(clients.map((c) => c.until(() => c.errors.length > before[clients.indexOf(c)] || c === winner, "負けた人にはエラーが返る")));
      for (const c of clients) {
        if (c !== winner) expect(c.errors.slice(before[clients.indexOf(c)]).some((e) => e.code === "TAKEN")).toBe(true);
      }
      // 勝者が間違える → 他の3人で再開。-5点。勝者はもう押せない。
      const scoreBefore = winner.me.score;
      winner.send({ t: "answer", choice: wrongChoice(winner.state!) });
      await Promise.all(clients.map((c) => c.until(() => c.state!.phase === "question" && c.state!.players.find((p) => p.id === winnerId)!.locked, "不正解で早押し再開")));
      expect(clients[0].state!.players.find((p) => p.id === winnerId)!.score).toBe(scoreBefore - 5);
      // 押せない人が押してもエラー
      const e0 = winner.errors.length;
      winner.send({ t: "buzz" });
      await winner.until(() => winner.errors.length > e0, "ロック中のエラー");
      expect(winner.errors.at(-1)!.code).toBe("LOCKED");
      // 次の問題へ進める: 残り3人の誰かが正解して終わらせる
      const next = clients.find((c) => c !== winner)!;
      next.send({ t: "buzz" });
      await next.until(() => next.state!.phase === "answering" && next.state!.answererId === next.playerId, "2人目の回答権");
      next.send({ t: "answer", choice: correctChoice(next.state!) });
      await Promise.all(clients.map((c) => c.waitPhase("reveal")));
      expect(clients[1].state!.reveal).toMatchObject({ outcome: "correct", winnerId: next.playerId });
      await Promise.all(clients.map((c) => c.until(() => c.state!.phase === "question" && c.state!.qIndex === round + 1, "次の問題")));
    }
    clients.forEach((c) => c.close());
  }, 60_000);

  it("回答権を得て選ばないまま10秒（テストでは短縮）たつと不正解になり、押せなくなる", async () => {
    const { clients } = await fillRoom(base, ["あ", "い"]);
    clients[0].send({ t: "start" });
    await clients[0].waitPhase("question");
    clients[1].send({ t: "buzz" });
    await clients[1].until(() => clients[1].state!.answererId === clients[1].playerId, "回答権");
    await clients[0].until(() => clients[0].state!.phase === "question" && clients[0].state!.players[1].locked, "タイムアウト", TIMING.ANSWER_MS + 3000);
    expect(clients[0].state!.players[1].score).toBe(-5);
    clients.forEach((c) => c.close());
  }, 30_000);
});

describe("正解表示と進行（項目8・9）", () => {
  it("誰も押さなくても制限時間で正解が全員に表示され、次の問題へ進む", async () => {
    const { clients } = await fillRoom(base, ["あ", "い"]);
    clients[0].send({ t: "start" });
    await clients[0].waitPhase("question");
    const t0 = Date.now();
    await Promise.all(clients.map((c) => c.waitPhase("reveal", TIMING.QUESTION_MS + 3000)));
    expect(Date.now() - t0).toBeGreaterThanOrEqual(TIMING.QUESTION_MS - 500);
    for (const c of clients) {
      expect(c.state!.reveal!.outcome).toBe("timeout");
      expect(c.state!.reveal!.correctIndex).toBe(correctChoice(c.state!));
    }
    await clients[0].until(() => clients[0].state!.phase === "question" && clients[0].state!.qIndex === 1, "次の問題", TIMING.REVEAL_MS + 3000);
    clients.forEach((c) => c.close());
  }, 30_000);

  it("4人で10問を最後まで遊び、最終順位が全員に出る（点数はサーバーの計算と一致）", async () => {
    const { clients } = await fillRoom(base, ["あ", "い", "う", "え"]);
    const expected = new Map(clients.map((c) => [c.playerId, 0]));
    clients[0].send({ t: "start" });
    for (let q = 0; q < 10; q++) {
      await Promise.all(clients.map((c) => c.until(() => c.state!.phase === "question" && c.state!.qIndex === q, `第${q + 1}問`, 8000)));
      const winner = clients[q % 4];
      if (q % 5 === 4) continue; // 誰も押さない問題も混ぜる
      winner.send({ t: "buzz" });
      await winner.until(() => winner.state!.answererId === winner.playerId, "回答権");
      if (q % 3 === 0) {
        winner.send({ t: "answer", choice: wrongChoice(winner.state!) });
        expected.set(winner.playerId, expected.get(winner.playerId)! - 5);
        const second = clients[(q + 1) % 4];
        await second.until(() => second.state!.phase === "question" && second.state!.players.some((p) => p.locked), "再開");
        second.send({ t: "buzz" });
        await second.until(() => second.state!.answererId === second.playerId, "2人目の回答権");
        second.send({ t: "answer", choice: correctChoice(second.state!) });
        expected.set(second.playerId, expected.get(second.playerId)! + 10);
      } else {
        winner.send({ t: "answer", choice: correctChoice(winner.state!) });
        expected.set(winner.playerId, expected.get(winner.playerId)! + 10);
      }
    }
    await Promise.all(clients.map((c) => c.waitPhase("final", 15_000)));
    for (const c of clients) {
      const r = c.state!.ranking!;
      expect(r).toHaveLength(4);
      for (const row of r) expect(row.score).toBe(expected.get(row.id));
      expect(r.map((x) => x.score)).toEqual([...r.map((x) => x.score)].sort((a, b) => b - a));
      expect(r).toEqual(clients[0].state!.ranking);
    }
    clients.forEach((c) => c.close());
  }, 120_000);
});

describe("再接続（項目10）", () => {
  it("ゲーム中に切断して同じトークンで戻ると、同じプレイヤーのまま点数が保たれる", async () => {
    const { code, clients } = await fillRoom(base, ["あ", "い"]);
    clients[0].send({ t: "start" });
    await clients[0].waitPhase("question");
    clients[1].send({ t: "buzz" });
    await clients[1].until(() => clients[1].state!.answererId === clients[1].playerId, "回答権");
    clients[1].send({ t: "answer", choice: correctChoice(clients[1].state!) });
    await clients[1].waitPhase("reveal");
    expect(clients[1].me.score).toBe(10);
    const { playerId, token } = clients[1];
    clients[1].close();
    await clients[0].until(() => clients[0].state!.players[1].connected === false, "切断が全員に見える");
    const back = await Client.open(base, code, "名前は無視される", token);
    expect(back.playerId).toBe(playerId);
    expect(back.me.score).toBe(10);
    expect(back.state!.phase).toMatch(/reveal|question/);
    await clients[0].until(() => clients[0].state!.players[1].connected === true, "復帰が全員に見える");
    clients.forEach((c) => c.close());
    back.close();
  }, 30_000);

  it("回答中に切断しても席は残り、時間切れで不正解になる。戻ると点数を保ったまま続けられる", async () => {
    const { code, clients } = await fillRoom(base, ["あ", "い"]);
    clients[0].send({ t: "start" });
    await clients[0].waitPhase("question");
    clients[1].send({ t: "buzz" });
    await clients[1].until(() => clients[1].state!.answererId === clients[1].playerId, "回答権");
    const token = clients[1].token;
    clients[1].close();
    await clients[0].until(() => clients[0].state!.players[1].locked, "切断中でも時間切れで処理される", TIMING.ANSWER_MS + 3000);
    const back = await Client.open(base, code, "x", token);
    expect(back.me.score).toBe(-5);
    clients.forEach((c) => c.close());
    back.close();
  }, 30_000);

  it("ゲーム開始後に知らない人は入れない", async () => {
    const { code, clients } = await fillRoom(base, ["あ", "い"]);
    clients[0].send({ t: "start" });
    await clients[0].waitPhase("question");
    const late = await Client.open(base, code, "遅刻");
    expect(late.errors[0]).toMatchObject({ code: "GAME_STARTED" });
    clients.forEach((c) => c.close());
  });

  it("ロビーでの再読み込み（すぐ戻る）は席を保つ。戻らなければ席が空きホストが引き継がれる", async () => {
    const { code, clients } = await fillRoom(base, ["あ", "い"]);
    const token = clients[0].token;
    clients[0].close();
    const back = await Client.open(base, code, "あ", token);
    expect(back.playerId).toBe(clients[0].playerId);
    expect(back.state!.players).toHaveLength(2);
    back.close();
    await clients[1].until(() => clients[1].state!.players.length === 1, "戻らない人が外れる", TIMING.LOBBY_GRACE_MS + 3000);
    expect(clients[1].state!.hostId).toBe(clients[1].playerId);
    clients[1].close();
  }, 30_000);
});

describe("サーバー側の判定（決定済み事項）", () => {
  it("出題中に正解が配信されず、他人の復帰トークンも配信されない", async () => {
    const { clients } = await fillRoom(base, ["あ", "い"]);
    clients[0].send({ t: "start" });
    await clients[0].waitPhase("question");
    const during = clients[0].rawMessages.filter((m) => m.includes('"phase":"question"')).join("\n");
    expect(during).not.toContain("correctIndex");
    expect(clients[0].rawMessages.join("\n")).not.toContain(clients[1].token);
    clients.forEach((c) => c.close());
  });
  it("回答権のない人が答えを送っても点数は変わらない", async () => {
    const { clients } = await fillRoom(base, ["あ", "い"]);
    clients[0].send({ t: "start" });
    await clients[0].waitPhase("question");
    clients[1].send({ t: "answer", choice: correctChoice(clients[1].state!) });
    await clients[1].until(() => clients[1].errors.some((e) => e.code === "NOT_ANSWERER"), "拒否される");
    expect(clients[1].me.score).toBe(0);
    clients.forEach((c) => c.close());
  });
  it("部屋コードは重複せず、別の部屋は互いに影響しない", async () => {
    const codes = await Promise.all(Array.from({ length: 12 }, () => createRoom(base)));
    expect(new Set(codes).size).toBe(12);
    const a = await fillRoom(base, ["あ", "い"]);
    const b = await fillRoom(base, ["あ", "い"]);
    a.clients[0].send({ t: "start" });
    await a.clients[0].waitPhase("question");
    expect(b.clients[0].state!.phase).toBe("lobby");
    [...a.clients, ...b.clients].forEach((c) => c.close());
  });
});
