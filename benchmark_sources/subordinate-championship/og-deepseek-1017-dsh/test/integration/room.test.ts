import { env, runDurableObjectAlarm, runInDurableObject, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { PublicState, ServerMessage } from "../../src/protocol";
import { getQuestionById } from "../../src/questions";

const BASE = "https://example.com";

/** テスト用の WebSocket クライアント。メッセージをキューに貯めて述語で待てる。 */
class TestClient {
  readonly ws: WebSocket;
  playerId = "";
  token = "";
  private queue: ServerMessage[] = [];
  private waiters: {
    predicate: (m: ServerMessage) => boolean;
    resolve: (m: ServerMessage) => void;
    timer: ReturnType<typeof setTimeout>;
  }[] = [];

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener("message", (event: MessageEvent) => {
      this.deliver(JSON.parse(String(event.data)) as ServerMessage);
    });
  }

  private deliver(msg: ServerMessage): void {
    for (let i = 0; i < this.waiters.length; i++) {
      const waiter = this.waiters[i];
      if (waiter.predicate(msg)) {
        this.waiters.splice(i, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(msg);
        return;
      }
    }
    this.queue.push(msg);
  }

  send(message: unknown): void {
    this.ws.send(JSON.stringify(message));
  }

  waitFor<T extends ServerMessage>(
    predicate: (m: ServerMessage) => boolean,
    timeoutMs = 5000,
  ): Promise<T> {
    const index = this.queue.findIndex(predicate);
    if (index >= 0) {
      const [msg] = this.queue.splice(index, 1);
      return Promise.resolve(msg as T);
    }
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        const at = this.waiters.findIndex((w) => w.timer === timer);
        if (at >= 0) this.waiters.splice(at, 1);
        reject(new Error("timeout waiting for websocket message"));
      }, timeoutMs);
      this.waiters.push({
        predicate,
        resolve: resolve as (m: ServerMessage) => void,
        timer,
      });
    });
  }

  waitState(predicate: (s: PublicState) => boolean, timeoutMs = 5000) {
    return this.waitFor<{ t: "state"; state: PublicState }>(
      (m) => m.t === "state" && predicate(m.state),
      timeoutMs,
    );
  }

  async join(name: string, token?: string): Promise<{ playerId: string; token: string; state: PublicState }> {
    this.send({ t: "join", name, token: token ?? null });
    for (;;) {
      const msg = await this.waitFor(
        (m) => m.t === "joined" || m.t === "error",
        5000,
      );
      if (msg.t === "joined") {
        this.playerId = msg.playerId;
        this.token = msg.token;
        return msg;
      }
      if (msg.t === "error") {
        throw new Error(`${msg.code}: ${msg.message}`);
      }
    }
  }

  close(): void {
    try {
      this.ws.close(1000, "test-close");
    } catch {
      /* ignore */
    }
  }
}

async function createRoom(): Promise<string> {
  const response = await SELF.fetch(`${BASE}/api/rooms`, { method: "POST" });
  expect(response.status).toBe(201);
  const data = (await response.json()) as { code: string };
  expect(data.code).toMatch(/^[A-Z0-9]{4}$/);
  return data.code;
}

async function openClient(code: string): Promise<TestClient> {
  const response = await SELF.fetch(`${BASE}/ws/${code}`, {
    headers: { Upgrade: "websocket" },
  });
  expect(response.status).toBe(101);
  const ws = response.webSocket;
  if (!ws) throw new Error("no websocket in response");
  ws.accept();
  return new TestClient(ws);
}

async function roomStub(code: string) {
  return env.ROOMS.get(env.ROOMS.idFromName(code));
}

/** 現在の問題の正解インデックスをサーバー内部状態から取得（テスト専用）。 */
async function correctIndexOfCurrentQuestion(code: string): Promise<number> {
  const stub = await roomStub(code);
  return runInDurableObject(stub, (instance: unknown) => {
    const room = (instance as { snapshot: () => import("../../src/protocol").RoomState }).snapshot();
    const question = getQuestionById(room.questionOrder[room.questionIndex]);
    if (!question) throw new Error("current question not found");
    return question.correct;
  });
}

describe("部屋と定員", () => {
  it("部屋を作成して4人まで入室できる", async () => {
    const code = await createRoom();
    const clients: TestClient[] = [];
    for (let i = 0; i < 4; i++) {
      const client = await openClient(code);
      const joined = await client.join(`player${i}`);
      expect(joined.state.players).toHaveLength(i + 1);
      clients.push(client);
    }
    const finalState = await clients[0].waitState((s) => s.players.length === 4);
    expect(finalState.state.players).toHaveLength(4);
  });

  it("5人目は ROOM_FULL で入室できず、理由が返る", async () => {
    const code = await createRoom();
    for (let i = 0; i < 4; i++) {
      const client = await openClient(code);
      await client.join(`player${i}`);
    }
    const fifth = await openClient(code);
    await expect(fifth.join("player5")).rejects.toThrow(/定員4人/);
  });

  it("存在しない部屋コードは ROOM_NOT_FOUND", async () => {
    const response = await SELF.fetch(`${BASE}/ws/ZZZZ`, {
      headers: { Upgrade: "websocket" },
    });
    const ws = response.webSocket;
    if (!ws) throw new Error("no websocket");
    ws.accept();
    const client = new TestClient(ws);
    await expect(client.join("だれか")).rejects.toThrow(/見つかりません/);
  });
});

describe("開始条件", () => {
  it("1人では開始できず、ホスト以外も開始できない、2人なら開始できる", async () => {
    const code = await createRoom();
    const alice = await openClient(code);
    await alice.join("alice");

    alice.send({ t: "start" });
    const notEnough = await alice.waitFor((m) => m.t === "error");
    expect(notEnough).toMatchObject({ code: "NOT_ENOUGH_PLAYERS" });

    const bob = await openClient(code);
    await bob.join("bob");

    bob.send({ t: "start" });
    const notHost = await bob.waitFor((m) => m.t === "error");
    expect(notHost).toMatchObject({ code: "NOT_HOST" });

    alice.send({ t: "start" });
    const state = await alice.waitState((s) => s.phase === "question");
    expect(state.state.questionIndex).toBe(0);
    expect(state.state.questionTotal).toBe(10);
  });
});

describe("早押しの裁定", () => {
  it("3人が同時に押しても回答権を得るのは1人だけ", async () => {
    const code = await createRoom();
    const clients: TestClient[] = [];
    for (let i = 0; i < 3; i++) {
      const client = await openClient(code);
      await client.join(`player${i}`);
      clients.push(client);
    }
    clients[0].send({ t: "start" });
    await clients[0].waitState((s) => s.phase === "question");

    // 3人ぶんの buzz をまとめて送る（サーバー側で直列化される）
    for (const client of clients) client.send({ t: "buzz" });

    const states = await Promise.all(
      clients.map((client) => client.waitState((s) => s.answererId !== null)),
    );
    const answerers = new Set(states.map((s) => s.state.answererId));
    expect(answerers.size).toBe(1);
    expect([...answerers][0]).toBeTruthy();

    const feedbacks = await Promise.all(
      clients.map((client) =>
        client.waitFor<Extract<ServerMessage, { t: "feedback" }>>(
          (m) => m.t === "feedback" && (m.kind === "buzz" || m.kind === "locked"),
        ),
      ),
    );
    expect(feedbacks.filter((f) => f.kind === "buzz")).toHaveLength(1);
    expect(feedbacks.filter((f) => f.kind === "locked")).toHaveLength(2);
  });

  it("回答権のない回答はサーバーが拒否する", async () => {
    const code = await createRoom();
    const alice = await openClient(code);
    await alice.join("alice");
    const bob = await openClient(code);
    await bob.join("bob");

    alice.send({ t: "start" });
    await alice.waitState((s) => s.phase === "question");

    alice.send({ t: "buzz" });
    await alice.waitState((s) => s.answererId === alice.playerId);

    bob.send({ t: "answer", choice: 0 });
    const error = await bob.waitFor((m) => m.t === "error");
    expect(error).toMatchObject({ code: "NOT_ANSWERER" });

    const stub = await roomStub(code);
    const snapshot = await runInDurableObject(stub, (instance: unknown) =>
      (instance as { snapshot: () => import("../../src/protocol").RoomState }).snapshot(),
    );
    expect(snapshot.players.find((p) => p.id === bob.playerId)?.score).toBe(0);
    expect(snapshot.players.find((p) => p.id === alice.playerId)?.score).toBe(0);
  });
});

describe("タイマーと正解発表", () => {
  it("全員に同じ締め切り（残り時間の基準）が配られる", async () => {
    const code = await createRoom();
    const clients: TestClient[] = [];
    for (let i = 0; i < 3; i++) {
      const client = await openClient(code);
      await client.join(`player${i}`);
      clients.push(client);
    }
    clients[0].send({ t: "start" });
    const states = await Promise.all(
      clients.map((client) => client.waitState((s) => s.phase === "question")),
    );
    expect(new Set(states.map((s) => s.state.timer.kind))).toEqual(new Set(["question"]));
    expect(new Set(states.map((s) => s.state.timer.deadline)).size).toBe(1);
    expect(new Set(states.map((s) => s.state.timer.totalMs))).toEqual(new Set([900]));
  });

  it("誰も押さないと制限時間でサーバーが正解を公開する", async () => {
    const code = await createRoom();
    const alice = await openClient(code);
    await alice.join("alice");
    const bob = await openClient(code);
    await bob.join("bob");

    alice.send({ t: "start" });
    await alice.waitState((s) => s.phase === "question");

    const revealed = await alice.waitState((s) => s.phase === "reveal", 8000);
    expect(revealed.state.reveal).not.toBeNull();
    expect(revealed.state.reveal?.correct).toBeGreaterThanOrEqual(0);
    expect(revealed.state.reveal?.correct).toBeLessThan(4);
  });

  it("回答権を得た状態で時間切れになると、その人は押せなくなり残りで再開する", async () => {
    const code = await createRoom();
    const alice = await openClient(code);
    await alice.join("alice");
    const bob = await openClient(code);
    await bob.join("bob");
    alice.send({ t: "start" });
    await alice.waitState((s) => s.phase === "question");

    alice.send({ t: "buzz" });
    await alice.waitState((s) => s.answererId === alice.playerId);

    // ANSWER_MS=600 が過ぎるのを待つ
    const resumed = await alice.waitState(
      (s) => s.phase === "question" && s.answererId === null && s.lockedIds.includes(alice.playerId),
      8000,
    );
    expect(resumed.state.answererId).toBeNull();
    bob.send({ t: "buzz" });
    const bobHasIt = await bob.waitState((s) => s.answererId === bob.playerId);
    expect(bobHasIt.state.answererId).toBe(bob.playerId);
  });
});

describe("復帰（再読み込み・回線断）", () => {
  it("トークンで復帰すると点数を保ったまま同じプレイヤーに戻る", async () => {
    const code = await createRoom();
    const alice = await openClient(code);
    await alice.join("alice");
    const bob = await openClient(code);
    await bob.join("bob");

    alice.send({ t: "start" });
    await alice.waitState((s) => s.phase === "question");

    alice.send({ t: "buzz" });
    await alice.waitState((s) => s.answererId === alice.playerId);
    const correct = await correctIndexOfCurrentQuestion(code);
    alice.send({ t: "answer", choice: correct });
    await alice.waitState((s) => s.phase === "reveal");
    await bob.waitState((s) =>
      s.players.some((p) => p.id === alice.playerId && p.score === 10),
    );

    // ブラウザを閉じた（回線が切れた）状態を再現
    alice.close();
    await bob.waitState((s) => s.players.some((p) => p.id === alice.playerId && !p.connected));

    // 同じトークンで復帰
    const revived = await openClient(code);
    const joined = await revived.join("alice", alice.token);
    expect(joined.playerId).toBe(alice.playerId);
    const restored = joined.state.players.find((p) => p.id === alice.playerId);
    expect(restored?.score).toBe(10);
    expect(restored?.connected).toBe(true);
  });
});

describe("4人対戦", () => {
  it("4人が同じ部屋で10問を遊びきり、最終順位が出る", async () => {
    const code = await createRoom();
    const clients: TestClient[] = [];
    for (let i = 0; i < 4; i++) {
      const client = await openClient(code);
      await client.join(`player${i}`);
      clients.push(client);
    }

    clients[0].send({ t: "start" });
    await clients[0].waitState((s) => s.phase === "question");

    for (let round = 0; round < 10; round++) {
      const client = clients[round % clients.length];
      client.send({ t: "buzz" });
      await client.waitState((s) => s.answererId === client.playerId);
      const correct = await correctIndexOfCurrentQuestion(code);
      client.send({ t: "answer", choice: correct });
      await client.waitState((s) => s.phase === "reveal" && s.questionIndex === round);
      if (round < 9) {
        await client.waitState(
          (s) => s.phase === "question" && s.questionIndex === round + 1,
          8000,
        );
      }
    }

    const finalState = await clients[0].waitState((s) => s.phase === "final", 8000);
    expect(finalState.state.results).toHaveLength(4);
    for (const result of finalState.state.results ?? []) {
      expect(result.score).toBeGreaterThan(0);
    }
    // 全員が同じ最終結果を見ている
    const finalState2 = await clients[3].waitState((s) => s.phase === "final", 8000);
    expect(finalState2.state.results).toEqual(finalState.state.results);
  }, 30000);
});

describe("サーバー内部の永続化", () => {
  it("アラームを即時実行しても状態が保存され、進行が壊れない", async () => {
    const code = await createRoom();
    const alice = await openClient(code);
    await alice.join("alice");
    const bob = await openClient(code);
    await bob.join("bob");
    alice.send({ t: "start" });
    await alice.waitState((s) => s.phase === "question");

    const stub = await roomStub(code);
    // 締め切り前でもアラームを即実行（handleTimeout は期限前なら何もしない）
    await runDurableObjectAlarm(stub);
    const snapshot = await runInDurableObject(stub, (instance: unknown) =>
      (instance as { snapshot: () => import("../../src/protocol").RoomState }).snapshot(),
    );
    expect(snapshot.phase).toBe("question");
  });
});
