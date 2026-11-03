// 結合テスト: 本物の Worker（src/index.ts）と部屋の Durable Object を workerd の中で動かし、
// HTTP と WebSocket だけで操作する。
import { env, evictDurableObject, runDurableObjectAlarm, runInDurableObject, SELF } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicState, RoomState } from "../../src/game";
import type { Room } from "../../src/room";

type Join = { ok: true; playerId: string; token: string; code: string };

async function post(path: string, body: unknown) {
  const res = await SELF.fetch(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

/** WebSocket の1接続。届いたメッセージを順に溜め、条件に合うものを待てる。 */
class Client {
  messages: any[] = [];
  private waiters: { pred: (m: any) => boolean; resolve: (m: any) => void }[] = [];
  closed: { code: number } | null = null;
  constructor(
    public ws: WebSocket,
    public join: Join,
  ) {
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data as string);
      this.messages.push(m);
      this.waiters = this.waiters.filter((w) => (w.pred(m) ? (w.resolve(m), false) : true));
    });
    ws.addEventListener("close", (e) => {
      this.closed = { code: e.code };
    });
  }
  get state(): PublicState {
    return [...this.messages].reverse().find((m) => m.t === "state")!.state;
  }
  send(m: unknown) {
    this.ws.send(JSON.stringify(m));
  }
  /** 既に届いているか、これから届くメッセージで pred を満たすものを返す */
  waitFor(pred: (m: any) => boolean, since = 0, ms = 3000): Promise<any> {
    const hit = this.messages.slice(since).find(pred);
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout waiting for message")), ms);
      this.waiters.push({
        pred,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
      });
    });
  }
  waitState(pred: (s: PublicState) => boolean, since = 0) {
    return this.waitFor((m) => m.t === "state" && pred(m.state), since).then((m) => m.state as PublicState);
  }
  close() {
    try {
      this.ws.close();
    } catch {
      /* 閉じ済み */
    }
  }
}

const opened: Client[] = [];
afterEach(() => {
  for (const c of opened.splice(0)) c.close();
});

async function connect(j: Join): Promise<Client> {
  const res = await SELF.fetch(`http://localhost/api/rooms/${j.code}/ws?pid=${j.playerId}&token=${j.token}`, {
    headers: { Upgrade: "websocket" },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket!;
  ws.accept();
  const c = new Client(ws, j);
  opened.push(c);
  await c.waitFor((m) => m.t === "state" || m.t === "error");
  return c;
}

async function makeRoom(n: number) {
  const host = await post("/api/rooms", { name: "ホスト" });
  expect(host.status).toBe(200);
  const joins: Join[] = [host.body];
  for (let i = 2; i <= n; i++) {
    const r = await post(`/api/rooms/${host.body.code}/join`, { name: `参加者${i}` });
    expect(r.status).toBe(200);
    joins.push(r.body);
  }
  const clients = await Promise.all(joins.map(connect));
  return { code: host.body.code as string, joins, clients };
}

const stubOf = (code: string) => env.ROOM.get(env.ROOM.idFromName(code)) as DurableObjectStub<Room>;

/** カウントダウンを飛ばして第1問を出す（アラームを今すぐ実行） */
async function startAndOpen(code: string, clients: Client[]) {
  const since = clients[0]!.messages.length;
  clients[0]!.send({ t: "start" });
  await clients[0]!.waitState((s) => s.phase === "countdown", since);
  await expireDeadline(code);
  await Promise.all(clients.map((c) => c.waitState((s) => s.phase === "question")));
}

/** 次の期限を「今」にずらしてアラームを走らせる（20秒・10秒・5秒を待たずに時間経過を再現） */
async function expireDeadline(code: string) {
  const stub = stubOf(code);
  await runInDurableObject(stub, async (_instance, state) => {
    const s = (await state.storage.get<RoomState>("state"))!;
    const past = Date.now() - 1;
    if (s.phase === "countdown" || s.phase === "reveal") s.phaseEndsAt = past;
    if (s.phase === "question") s.questionEndsAt = past;
    if (s.phase === "answering") s.answerEndsAt = past;
    // メモリ上の状態も同じにする（再読み込みさせる）
    (_instance as any).state = s;
    await state.storage.put("state", s);
  });
  expect(await runDurableObjectAlarm(stub)).toBe(true);
}

async function correctAnswer(code: string): Promise<number> {
  return runInDurableObject(stubOf(code), async (instance) => {
    const s = (await instance.debugState())!;
    return s.questions[s.qIndex]!.answer;
  });
}

describe("部屋の作成と参加（HTTP）", () => {
  it("部屋を作ると5文字のコードと参加情報が返る", async () => {
    const r = await post("/api/rooms", { name: "たろう" });
    expect(r.status).toBe(200);
    expect(r.body.code).toMatch(/^[A-Z2-9]{5}$/);
    expect(r.body.playerId).toBeTruthy();
    expect(r.body.token.length).toBeGreaterThan(16);
  });

  it("名前が空なら400", async () => {
    const r = await post("/api/rooms", { name: "  " });
    expect(r.status).toBe(400);
    expect(r.body.message).toContain("名前");
  });

  it("存在しない部屋には参加できない（404・理由つき）", async () => {
    const r = await post("/api/rooms/ZZZZZ/join", { name: "はなこ" });
    expect(r.status).toBe(404);
    expect(r.body.message).toBe("部屋が見つかりません。コードを確かめてください");
  });

  it("小文字のコードでも参加できる", async () => {
    const h = await post("/api/rooms", { name: "A" });
    const r = await post(`/api/rooms/${h.body.code.toLowerCase()}/join`, { name: "B" });
    expect(r.status).toBe(200);
  });

  it("5人目は409で「満員」の理由が返る（遊び方2）", async () => {
    const { code } = await makeRoom(4);
    const r = await post(`/api/rooms/${code}/join`, { name: "5人目" });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ ok: false, error: "room_full", message: "この部屋は満員です（定員4人）" });
  });

  it("同時に5人が参加しようとしても入れるのは定員まで", async () => {
    const h = await post("/api/rooms", { name: "ホスト" });
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((i) => post(`/api/rooms/${h.body.code}/join`, { name: `同時${i}` })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
  });

  it("不正なトークンの WebSocket は 4001 で閉じられる", async () => {
    const { joins } = await makeRoom(2);
    const c = await connect({ ...joins[0]!, token: "wrong" });
    expect(c.messages[0]).toMatchObject({ t: "error", code: "invalid_session" });
  });
});

describe("ゲーム進行（WebSocket）", () => {
  it("ホスト以外の開始は拒否され、ホストなら開始できる（遊び方3）", async () => {
    const { code, clients } = await makeRoom(2);
    clients[1]!.send({ t: "start" });
    const err = await clients[1]!.waitFor((m) => m.t === "error");
    expect(err.code).toBe("not_host");
    await startAndOpen(code, clients);
    expect(clients[1]!.state.question?.choices).toHaveLength(4);
    expect(clients[1]!.state.question?.answer).toBeNull();
  });

  it("1人では開始できない", async () => {
    const { clients } = await makeRoom(1);
    clients[0]!.send({ t: "start" });
    expect((await clients[0]!.waitFor((m) => m.t === "error")).code).toBe("not_enough_players");
  });

  it("4人が同時に押しても回答権は1人だけ。全員の画面で同じ人が回答中になる（遊び方5・11）", async () => {
    const { code, clients } = await makeRoom(4);
    await startAndOpen(code, clients);
    const marks = clients.map((c) => c.messages.length);
    // 4本の接続から同時に送る
    clients.forEach((c) => c.send({ t: "buzz" }));
    const states = await Promise.all(clients.map((c, i) => c.waitState((s) => s.phase === "answering", marks[i])));
    const ids = new Set(states.map((s) => s.answeringId));
    expect(ids.size).toBe(1);
    const winner = [...ids][0];
    // 負けた3人には not_open のエラーが届く
    const losers = clients.filter((c) => c.join.playerId !== winner);
    const errs = await Promise.all(losers.map((c, i) => c.waitFor((m) => m.t === "error", 0)));
    expect(errs.map((e) => e.code)).toEqual(["not_open", "not_open", "not_open"]);
    // 期限も全員同じ値
    expect(new Set(states.map((s) => s.answerEndsAt)).size).toBe(1);
  });

  it("正解+10・不正解-5、不正解の人は押せず残りで再開、点数は全員に同じく配られる（遊び方6・7・11）", async () => {
    const { code, clients } = await makeRoom(3);
    await startAndOpen(code, clients);
    const ans = await correctAnswer(code);
    const [a, b, c] = clients as [Client, Client, Client];

    a.send({ t: "buzz" });
    await a.waitState((s) => s.answeringId === a.join.playerId);
    a.send({ t: "answer", choice: (ans + 1) % 4 });
    await b.waitState((s) => s.phase === "question" && s.lockedOut.includes(a.join.playerId));

    const mark = a.messages.length;
    a.send({ t: "buzz" });
    expect((await a.waitFor((m) => m.t === "error", mark)).code).toBe("locked_out");

    b.send({ t: "buzz" });
    await b.waitState((s) => s.answeringId === b.join.playerId);
    b.send({ t: "answer", choice: ans });
    const finals = await Promise.all(clients.map((x) => x.waitState((s) => s.phase === "reveal")));
    for (const s of finals) {
      expect(s.question?.answer).toBe(ans);
      expect(Object.fromEntries(s.players.map((p) => [p.id, p.score]))).toEqual({
        [a.join.playerId]: -5,
        [b.join.playerId]: 10,
        [c.join.playerId]: 0,
      });
    }
  });

  it("回答者が誤答し全員が押せなくなったら正解発表（遊び方8）", async () => {
    const { code, clients } = await makeRoom(2);
    await startAndOpen(code, clients);
    const ans = await correctAnswer(code);
    for (const c of clients) {
      c.send({ t: "buzz" });
      await c.waitState((s) => s.answeringId === c.join.playerId);
      c.send({ t: "answer", choice: (ans + 1) % 4 });
      await c.waitState((s) => s.lockedOut.includes(c.join.playerId));
    }
    const s = await clients[0]!.waitState((s) => s.phase === "reveal");
    expect(s.question?.answer).toBe(ans);
  });

  it("20秒たったら誰も答えなくても正解発表し、その後次の問題へ（アラーム）（遊び方8）", async () => {
    const { code, clients } = await makeRoom(2);
    await startAndOpen(code, clients);
    await expireDeadline(code); // 20秒経過
    const reveal = await clients[1]!.waitState((s) => s.phase === "reveal");
    expect(reveal.questionNumber).toBe(1);
    expect(reveal.question?.answer).not.toBeNull();
    await expireDeadline(code); // 発表の5秒経過
    const next = await clients[1]!.waitState((s) => s.phase === "question" && s.questionNumber === 2);
    expect(next.question?.answer).toBeNull();
  });

  it("10秒以内に選ばなかったら時間切れで-5、早押し再開（アラーム）（遊び方6）", async () => {
    const { code, clients } = await makeRoom(2);
    await startAndOpen(code, clients);
    clients[0]!.send({ t: "buzz" });
    await clients[0]!.waitState((s) => s.phase === "answering");
    await expireDeadline(code);
    const s = await clients[1]!.waitState((s) => s.phase === "question" && s.outcomes.length === 1);
    expect(s.outcomes[0]).toMatchObject({ kind: "timeout", delta: -5 });
    expect(s.players.find((p) => p.id === clients[0]!.join.playerId)!.score).toBe(-5);
  });

  it("10問終わると全員に最終順位が届く（遊び方9）", async () => {
    const { code, clients } = await makeRoom(2);
    await startAndOpen(code, clients);
    for (let q = 1; q <= 10; q++) {
      const ans = await correctAnswer(code);
      const winner = clients[q % 2]!;
      winner.send({ t: "buzz" });
      await winner.waitState((s) => s.answeringId === winner.join.playerId && s.questionNumber === q);
      winner.send({ t: "answer", choice: ans });
      await winner.waitState((s) => s.phase === "reveal" && s.questionNumber === q);
      await expireDeadline(code);
    }
    const finals = await Promise.all(clients.map((c) => c.waitState((s) => s.phase === "finished")));
    for (const s of finals) {
      expect(s.ranking?.map((r) => r.score)).toEqual([50, 50]);
      expect(s.ranking?.map((r) => r.rank)).toEqual([1, 1]);
      expect(s.question).toBeNull();
    }
  });
});

describe("再接続（遊び方10）", () => {
  it("接続が切れても同じ参加情報で戻れば、同じプレイヤーとして点数を保ったまま復帰する", async () => {
    const { code, joins, clients } = await makeRoom(2);
    await startAndOpen(code, clients);
    const ans = await correctAnswer(code);
    const [a, b] = clients as [Client, Client];
    a.send({ t: "buzz" });
    await a.waitState((s) => s.answeringId === a.join.playerId);
    a.send({ t: "answer", choice: ans });
    await a.waitState((s) => s.phase === "reveal");

    // A の回線が切れる → B の画面では「切断中」
    const mark = b.messages.length;
    a.close();
    const offline = await b.waitState((s) => s.players.some((p) => p.id === a.join.playerId && !p.connected), mark);
    expect(offline.players.find((p) => p.id === a.join.playerId)!.score).toBe(10);

    // 同じ参加情報で再接続
    const back = await connect(joins[0]!);
    const s = back.state;
    expect(s.players).toHaveLength(2);
    const me = s.players.find((p) => p.id === a.join.playerId)!;
    expect(me).toMatchObject({ score: 10, connected: true, name: "ホスト" });
    // 復帰後も操作できる（次の問題で押せる）
    await expireDeadline(code);
    await back.waitState((s) => s.phase === "question" && s.questionNumber === 2);
    back.send({ t: "buzz" });
    await back.waitState((s) => s.answeringId === a.join.playerId);
  });

  it("Durable Object がメモリから追い出されても（休止）、接続を保ったまま続きから遊べる", async () => {
    const { code, clients } = await makeRoom(2);
    await startAndOpen(code, clients);
    const before = clients[0]!.state;
    // WebSocket は休止させたまま、インスタンス（メモリ上の状態）だけを破棄する
    await evictDurableObject(stubOf(code), { webSockets: "hibernate" });
    const mark = clients[1]!.messages.length;
    clients[1]!.send({ t: "buzz" });
    const s = await clients[0]!.waitState((s) => s.phase === "answering", 0);
    expect(s.answeringId).toBe(clients[1]!.join.playerId);
    expect(s.questionNumber).toBe(before.questionNumber);
    expect(s.question?.text).toBe(before.question?.text);
    expect(clients[1]!.messages.slice(mark).some((m) => m.t === "error")).toBe(false);
  });

  it("全員が切断して部屋の Durable Object が破棄されても、再接続すれば点数と問題が残っている", async () => {
    const { code, joins, clients } = await makeRoom(2);
    await startAndOpen(code, clients);
    const before = clients[0]!.state;
    await evictDurableObject(stubOf(code), { webSockets: "close" });
    const back = await connect(joins[1]!);
    expect(back.state.questionNumber).toBe(before.questionNumber);
    expect(back.state.question?.text).toBe(before.question?.text);
    expect(back.state.players.map((p) => p.name)).toEqual(before.players.map((p) => p.name));
  });
});
