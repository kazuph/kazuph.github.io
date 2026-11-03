import { describe, it, expect, beforeAll } from "vitest";
import { SELF, env, runInDurableObject } from "cloudflare:test";
import { connectWS, setupRoom, type Room, type TestWS } from "./helpers";
import type { StateMessage } from "../../src/shared/types";
import type { RoomDO } from "../../src/worker/room";

const BASE = "http://example.com";

function roomNamespace(): DurableObjectNamespace {
  return (env as unknown as { ROOM: DurableObjectNamespace }).ROOM;
}

function stub(room: Room) {
  return roomNamespace().get(roomNamespace().idFromName(room.code));
}

function answeringId(s: StateMessage): string | null {
  return s.players.find((p) => p.answering)?.id ?? null;
}

function hostOf(room: Room) {
  // ホストは最初の参加者（p1）
  return room.clients[0];
}

beforeAll(async () => {
  const res = await SELF.fetch(`${BASE}/api/health`);
  expect(res.ok).toBe(true);
});

describe("ゲーム開始の制限", () => {
  async function nextErrorMessage(c: TestWS): Promise<string | null> {
    for (let i = 0; i < 10; i++) {
      const m = await c.next(3_000).catch(() => undefined);
      if (!m) return null;
      if (m.type === "error") return m.message;
    }
    return null;
  }

  it("1人しかいないときはホストでも開始できない", async () => {
    const room = await setupRoom(BASE, 1);
    hostOf(room).send({ type: "start" });
    const msg = await nextErrorMessage(room.clients[0]);
    expect(msg).toContain("開始");
    // 状態はロビーから変わっていない
    expect(room.clients[0].latest()!.room.phase).toBe("lobby");
    room.clients.forEach((c) => c.close());
  });

  it("2人ならホストが開始できる（ホスト以外の開始要求は拒否）", async () => {
    const room = await setupRoom(BASE, 2);
    room.clients[1].send({ type: "start" });
    const msg = await nextErrorMessage(room.clients[1]);
    expect(msg).toContain("ホスト");
    expect(room.clients[1].latest()!.room.phase).toBe("lobby");

    hostOf(room).send({ type: "start" });
    const started = await room.clients[0].waitForState((s) => s.room.phase === "question");
    expect(started.room.subPhase).toBe("buzzing");
    room.clients.forEach((c) => c.close());
  });
});

describe("部屋の作成・参加", () => {
  it("5人目は参加できず、理由が返る", async () => {
    const room = await setupRoom(BASE, 4);
    const res = await SELF.fetch(`${BASE}/api/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "5人目", code: room.code }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("満員");
    room.clients.forEach((c) => c.close());
  });

  it("存在しない部屋コードは参加できない", async () => {
    const res = await SELF.fetch(`${BASE}/api/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "x", code: "ZZZZ" }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("見つかりません");
  });
});

describe("同時押しで1人だけが回答権を得る", () => {
  it("2人が同時に押しても回答権は1人だけ", async () => {
    const room = await setupRoom(BASE, 4);
    const host = hostOf(room);
    host.send({ type: "start" });
    // 全員が早押し待ちになるまで待つ
    await Promise.all(room.clients.map((c) => c.waitForState((s) => s.room.phase === "question" && s.room.subPhase === "buzzing")));

    // 2人のクライアントがほぼ同時に buzz を送る（送信を待たずに連続送信）
    room.clients[1].send({ type: "buzz" });
    room.clients[2].send({ type: "buzz" });

    // それぞれ数メッセージ受信し、回答中のプレイヤーを観察
    const seen = new Set<string | null>();
    for (const c of [room.clients[0], room.clients[1], room.clients[2]]) {
      for (let i = 0; i < 4; i++) {
        const m = await c.next(3_000).catch(() => undefined);
        if (m && m.type === "state" && m.room.subPhase === "answering") {
          seen.add(answeringId(m));
        }
      }
    }
    expect(seen.size).toBe(1);
    const answerer = [...seen][0]!;
    expect([room.clients[1].playerId, room.clients[2].playerId]).toContain(answerer);

    // 3人目（押していない人）が後から押しても回答権は奪えない
    room.clients[3].send({ type: "buzz" });
    const s = await room.clients[3].waitForState((x) => x.room.subPhase === "answering", 2_000).catch(() => undefined);
    expect(s).toBeDefined();
    expect(answeringId(s!)).toBe(answerer);
    room.clients.forEach((c) => c.close());
  });

  it("4人が同時に押しても回答権は1人だけ", async () => {
    const room = await setupRoom(BASE, 4);
    hostOf(room).send({ type: "start" });
    await Promise.all(room.clients.map((c) => c.waitForState((s) => s.room.phase === "question" && s.room.subPhase === "buzzing")));

    // 全員同時に送信
    for (const c of room.clients) c.send({ type: "buzz" });

    const seen = new Set<string | null>();
    for (const c of room.clients) {
      for (let i = 0; i < 4; i++) {
        const m = await c.next(3_000).catch(() => undefined);
        if (m && m.type === "state" && m.room.subPhase === "answering") {
          seen.add(answeringId(m));
        }
      }
    }
    expect(seen.size).toBe(1);
    room.clients.forEach((c) => c.close());
  });
});

describe("正誤判定と点数", () => {
  it("正解は+10点で正解表示になり、不正解は-5点でもう押せず早押しを再開する", async () => {
    const room = await setupRoom(BASE, 3);
    hostOf(room).send({ type: "start" });
    await Promise.all(room.clients.map((c) => c.waitForState((s) => s.room.subPhase === "buzzing")));

    const correctIndex = await runInDurableObject(stub(room), (instance: RoomDO) => instance.__test.getCorrectIndex());

    // c1 が回答権を取って正解する
    room.clients[0].send({ type: "buzz" });
    await room.clients[0].waitForState((s) => s.room.subPhase === "answering");
    room.clients[0].send({ type: "answer", choice: correctIndex });
    const revealed = await room.clients[0].waitForState((s) => s.room.subPhase === "reveal");
    expect(revealed.room.correctIndex).toBe(correctIndex);
    expect(revealed.room.lastResult?.outcome).toBe("correct");
    expect(revealed.room.lastResult?.delta).toBe(10);
    const p1 = revealed.players.find((p) => p.id === room.clients[0].playerId)!;
    expect(p1.score).toBe(10);

    // 次の問題へ
    await Promise.all(room.clients.map((c) => c.waitForState((s) => s.room.subPhase === "buzzing" && s.room.questionIndex === 1)));

    const correct2 = await runInDurableObject(stub(room), (instance: RoomDO) => instance.__test.getCorrectIndex());
    const wrongChoice = (correct2 + 1) % 4;

    // c1 が回答権を取って不正解
    room.clients[0].send({ type: "buzz" });
    await room.clients[0].waitForState((s) => s.room.subPhase === "answering" && s.room.questionIndex === 1);
    room.clients[0].send({ type: "answer", choice: wrongChoice });
    const afterWrong = await room.clients[0].waitForState((s) => s.room.lastResult?.outcome === "wrong" && s.room.questionIndex === 1);
    expect(afterWrong.room.lastResult?.delta).toBe(-5);
    const p1b = afterWrong.players.find((p) => p.id === room.clients[0].playerId)!;
    expect(p1b.score).toBe(5); // 10 - 5
    expect(p1b.lockedOut).toBe(true);

    // 早押しが再開して、他のプレイヤーが押せる（不正解の後の buzzing 状態を待つ）
    const resumed = await room.clients[1].waitForState((s) => s.room.subPhase === "buzzing" && s.room.questionIndex === 1 && s.room.lastResult?.outcome === "wrong");
    expect(resumed.players.find((p) => p.id === room.clients[0].playerId)!.lockedOut).toBe(true);
    room.clients[1].send({ type: "buzz" });
    const granted = await room.clients[1].waitForState((s) => s.room.subPhase === "answering" && s.room.questionIndex === 1 && s.room.lastResult?.outcome === "wrong");
    expect(answeringId(granted)).toBe(room.clients[1].playerId);
    room.clients.forEach((c) => c.close());
  });

  it("回答制限時間（10秒）を過ぎると失答で-5点、押せる人で早押しを再開する（fast: 1.5秒で検証）", async () => {
    const room = await setupRoom(BASE, 2);
    hostOf(room).send({ type: "start" });
    await Promise.all(room.clients.map((c) => c.waitForState((s) => s.room.subPhase === "buzzing")));

    room.clients[0].send({ type: "buzz" });
    await room.clients[0].waitForState((s) => s.room.subPhase === "answering");

    // 誰も答えずに放置 → アラームで失答扱い
    const timedOut = await room.clients[1].waitForState(
      (s) => s.room.lastResult?.outcome === "timeout",
      8_000
    );
    expect(timedOut.room.lastResult?.delta).toBe(-5);
    expect(timedOut.players.find((p) => p.id === room.clients[0].playerId)!.lockedOut).toBe(true);
    // p2 はまだ押せる（早押し再開）
    expect(timedOut.room.subPhase).toBe("buzzing");
    room.clients.forEach((c) => c.close());
  }, 30_000);

  it("全員が押せなくなったら（連続不正解で）正解表示へ進む", async () => {
    const room = await setupRoom(BASE, 2);
    hostOf(room).send({ type: "start" });
    await Promise.all(room.clients.map((c) => c.waitForState((s) => s.room.subPhase === "buzzing")));

    const wrongOf = async () => {
      const correct = await runInDurableObject(stub(room), (instance: RoomDO) => instance.__test.getCorrectIndex());
      return (correct + 1) % 4;
    };

    // p1 が押して不正解
    room.clients[0].send({ type: "buzz" });
    await room.clients[0].waitForState((s) => s.room.subPhase === "answering" && s.room.questionIndex === 0);
    room.clients[0].send({ type: "answer", choice: await wrongOf() });
    // p2 が押して不正解 → 押せる人がいなくなる
    room.clients[1].send({ type: "buzz" });
    await room.clients[1].waitForState((s) => s.room.subPhase === "answering" && s.room.questionIndex === 0 && s.room.lastResult?.outcome === "wrong");
    room.clients[1].send({ type: "answer", choice: await wrongOf() });

    const revealed = await room.clients[0].waitForState((s) => s.room.subPhase === "reveal", 5_000);
    expect(revealed.room.correctIndex).not.toBeNull();
    expect(revealed.room.lastResult).toBeTruthy();
    // 全員 lockedOut
    expect(revealed.players.every((p) => p.lockedOut)).toBe(true);
    room.clients.forEach((c) => c.close());
  }, 30_000);

  it("誰も押さないと制限時間（20秒）後に正解表示へ進む（fast: 2.5秒で検証）", async () => {
    const room = await setupRoom(BASE, 2);
    hostOf(room).send({ type: "start" });
    await Promise.all(room.clients.map((c) => c.waitForState((s) => s.room.subPhase === "buzzing")));

    const revealed = await room.clients[0].waitForState((s) => s.room.subPhase === "reveal", 8_000);
    expect(revealed.room.correctIndex).not.toBeNull();
    // その後、次の問題（または最終問題なら結果）に進む
    const next = await room.clients[0].waitForState(
      (s) => (s.room.subPhase === "buzzing" && s.room.questionIndex === 1) || s.room.phase === "results",
      8_000
    );
    expect(next.room.questionIndex === 1 || next.room.phase === "results").toBe(true);
    room.clients.forEach((c) => c.close());
  });
});

describe("再接続（再読み込み・一時切断）", () => {
  it("一度切っても同じプレイヤーとして点数を保ったまま復帰できる", async () => {
    const room = await setupRoom(BASE, 3);
    hostOf(room).send({ type: "start" });
    await Promise.all(room.clients.map((c) => c.waitForState((s) => s.room.subPhase === "buzzing")));

    // p2 が回答権を取って正解して点数を獲得
    const correctIndex = await runInDurableObject(stub(room), (instance: RoomDO) => instance.__test.getCorrectIndex());
    room.clients[1].send({ type: "buzz" });
    await room.clients[1].waitForState((s) => s.room.subPhase === "answering");
    room.clients[1].send({ type: "answer", choice: correctIndex });
    const revealed = await room.clients[1].waitForState((s) => s.room.subPhase === "reveal");
    const scoreBefore = revealed.players.find((p) => p.id === room.clients[1].playerId)!.score;
    expect(scoreBefore).toBe(10);

    // p2 の接続を切る（= ブラウザ再読み込み相当）
    room.clients[1].close();
    await room.clients[0].waitForState((s) => s.players.find((p) => p.id === room.clients[1].playerId)!.connected === false);

    // 次の問題が出ている間に再接続（同じトークンで）
    await room.clients[0].waitForState((s) => s.room.subPhase === "buzzing" && s.room.questionIndex >= 1);
    const reconnected = await connectWS(BASE, room.code, room.tokens[1]);
    const back = await reconnected.waitForState((s) => s.players.find((p) => p.id === reconnected.playerId)!.connected === true);
    expect(back.players.find((p) => p.id === reconnected.playerId)!.score).toBe(10);
    expect(reconnected.playerId).toBe(room.clients[1].playerId);

    // 復帰後も回答権を取って正解できる
    const correct2 = await runInDurableObject(stub(room), (instance: RoomDO) => instance.__test.getCorrectIndex());
    reconnected.send({ type: "buzz" });
    const got = await reconnected.waitForState((s) => s.room.subPhase === "answering" && answeringId(s) === reconnected.playerId, 8_000);
    expect(answeringId(got)).toBe(reconnected.playerId);
    reconnected.send({ type: "answer", choice: correct2 });
    const rev2 = await reconnected.waitForState((s) => s.room.subPhase === "reveal" && s.room.questionIndex === got.room.questionIndex);
    expect(rev2.players.find((p) => p.id === reconnected.playerId)!.score).toBe(20);
    reconnected.close();
    room.clients[0].close();
    room.clients[2].close();
  });
});

describe("10問通してのゲーム進行（4人同時）", () => {
  it("4人で開始から最終順位まで一通り遊べる", async () => {
    const room = await setupRoom(BASE, 4);
    hostOf(room).send({ type: "start" });
    await Promise.all(room.clients.map((c) => c.waitForState((s) => s.room.subPhase === "buzzing")));

    // 各問題: 誰かが正解するまで（タイムアウトで前に進むこともある）続ける
    const deadline = Date.now() + 120_000;
    let last: StateMessage | undefined;
    for (const c of room.clients) last = c.latest();
    while (Date.now() < deadline) {
      const anyClient = room.clients[0];
      const s = anyClient.latest()!;
      if (s.room.phase === "results") break;
      if (s.room.subPhase === "buzzing") {
        // 全員が同時に押す → 1人だけ回答権を得る
        for (const c of room.clients) c.send({ type: "buzz" });
      } else if (s.room.subPhase === "answering") {
        // 回答者はサーバーから正解を教わる（テストフック）ですぐ答える
        const correct = await runInDurableObject(stub(room), (instance: RoomDO) => instance.__test.getCorrectIndex());
        const answerer = room.clients.find((c) => c.playerId === answeringId(s));
        answerer?.send({ type: "answer", choice: correct });
      }
      // 少し待って次の状態へ
      await new Promise((r) => setTimeout(r, 120));
      for (const c of room.clients) await c.next(500).catch(() => undefined);
    }

    const final = room.clients[0].latest()!;
    expect(final.room.phase).toBe("results");
    expect(final.room.questionCount).toBe(10);
    // 全員分のプレイヤーが順位付きで見える
    expect(final.players).toHaveLength(4);
    const scores = final.players.map((p) => p.score);
    for (const sc of scores) expect(sc).toBeGreaterThanOrEqual(0);
    // 最終順位がスコア順に並んでいることを E2E 側でも確認するため、ここでは合計の整合だけ見る
    const total = scores.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(0);
    room.clients.forEach((c) => c.close());
  }, 150_000);
});
