/**
 * Worker + Durable Object + WebSocket の結合テスト。
 * 実際に Cloudflare Workers ランタイム（workerd）上で Worker を起動し、
 * ブラウザと同じ経路（HTTP で参加 → WebSocket で対戦）で検証する。
 */
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../src/questions";

const ORIGIN = "https://quiz.test";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Credentials {
  code: string;
  playerId: string;
  token: string;
  name: string;
}

async function post(path: string, body: unknown) {
  const res = await SELF.fetch(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json()) as any };
}

async function createRoom(name: string): Promise<Credentials> {
  const res = await post("/api/rooms", { name });
  expect(res.status).toBe(201);
  return { code: res.data.code, playerId: res.data.playerId, token: res.data.token, name: res.data.name };
}

async function joinRoom(code: string, name: string) {
  const res = await post(`/api/rooms/${code}/join`, { name });
  if (res.status !== 200) return { status: res.status, data: res.data, creds: null as Credentials | null };
  return {
    status: res.status,
    data: res.data,
    creds: { code: res.data.code, playerId: res.data.playerId, token: res.data.token, name: res.data.name },
  };
}

class Client {
  snap: any = null;
  notices: string[] = [];
  private ws: WebSocket;

  private constructor(ws: WebSocket, readonly creds: Credentials) {
    this.ws = ws;
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data as string);
      if (msg.t === "state") this.snap = msg;
      if (msg.t === "notice") this.notices.push(msg.message);
    });
  }

  static async open(creds: Credentials): Promise<Client> {
    const res = await SELF.fetch(
      `${ORIGIN}/api/rooms/${creds.code}/ws?playerId=${creds.playerId}&token=${creds.token}`,
      { headers: { Upgrade: "websocket" } },
    );
    expect(res.status).toBe(101);
    const ws = res.webSocket!;
    ws.accept();
    const client = new Client(ws, creds);
    ws.send(JSON.stringify({ t: "sync" }));
    return client;
  }

  send(message: Record<string, unknown>) {
    this.ws.send(JSON.stringify(message));
  }

  close() {
    this.ws.close();
  }

  isAnswerer() {
    return Boolean(this.snap && this.snap.answeringPlayerId === this.creds.playerId);
  }

  scoreOf(playerId: string): number {
    return this.snap.players.find((p: any) => p.id === playerId)?.score ?? Number.NaN;
  }
}

async function waitFor(condition: () => boolean, label: string, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (condition()) return;
    await sleep(20);
  }
  throw new Error(`timeout: ${label}`);
}

describe("部屋とWebSocketの結合", () => {
  it("HTTPで部屋コードを採番し、4人までWebSocketで参加できる", async () => {
    const host = await createRoom("あおい");
    expect(host.code).toMatch(/^[A-Z0-9]{4}$/);

    // 存在しない部屋への参加は 404
    const missing = await joinRoom("ZZZZ", "だれか");
    expect([404]).toContain(missing.status);

    const clients = [await Client.open(host)];
    for (const name of ["はると", "みお", "そうた"]) {
      const joined = await joinRoom(host.code, name);
      expect(joined.status).toBe(200);
      clients.push(await Client.open(joined.creds!));
    }
    await waitFor(
      () => clients.every((c) => c.snap?.players.filter((p: any) => p.connected).length === 4),
      "4人が接続済みになる",
    );

    const snap = clients[0].snap;
    expect(snap.phase).toBe("lobby");
    expect(snap.players).toHaveLength(4);
    expect(snap.hostId).toBe(host.playerId);
    expect(snap.question).toBeNull();
    // 正解はロビーでは配信されない
    expect(JSON.stringify(snap)).not.toContain("correct");

    // 5人目は定員オーバーで理由つきで拒否される
    const fifth = await joinRoom(host.code, "いつか");
    expect(fifth.status).toBe(409);
    expect(fifth.data.error).toBe("room_full");
    expect(fifth.data.message).toContain("満員");

    for (const c of clients) c.close();
  });

  it("同時押しでもサーバーが最初に受け取った1人だけが回答権を得る", async () => {
    const host = await createRoom("あおい");
    const clients = [await Client.open(host)];
    for (const name of ["はると", "みお", "そうた"]) {
      const joined = await joinRoom(host.code, name);
      clients.push(await Client.open(joined.creds!));
    }
    await waitFor(() => clients.every((c) => c.snap?.players.length === 4), "4人");

    clients[0].send({ t: "start" });
    await waitFor(() => clients.every((c) => c.snap?.phase === "question"), "出題フェーズ");
    expect(clients[0].snap.question.choices).toHaveLength(4);
    expect(clients[0].snap.question.index).toBe(0);

    // 4人が「同時」に押す（1つのイベントループで連続送信）
    for (const c of clients) c.send({ t: "buzz" });

    await waitFor(() => clients.every((c) => c.snap?.phase === "answering"), "回答フェーズ");
    const winners = clients.filter((c) => c.isAnswerer());
    expect(winners).toHaveLength(1);
    // 全員の画面で同じ1人が回答中に見える
    const answerers = new Set(clients.map((c) => c.snap.answeringPlayerId));
    expect(answerers.size).toBe(1);
    expect([...answerers][0]).toBe(winners[0].creds.playerId);
    // 10秒の持ち時間が配布されている
    expect(clients[0].snap.answerDeadline - clients[0].snap.now).toBeLessThanOrEqual(10_000);
    expect(clients[0].snap.answerDeadline - clients[0].snap.now).toBeGreaterThan(9_000);

    for (const c of clients) c.close();
  });

  it("回答権のないソケットからの answer / 偽装プレイヤーの buzz は通らない", async () => {
    const host = await createRoom("あおい");
    const clients = [await Client.open(host)];
    const others: Client[] = [];
    for (const name of ["はると", "みお"]) {
      const joined = await joinRoom(host.code, name);
      const c = await Client.open(joined.creds!);
      clients.push(c);
      others.push(c);
    }
    await waitFor(() => clients.every((c) => c.snap?.players.length === 3), "3人");

    clients[0].send({ t: "start" });
    await waitFor(() => clients.every((c) => c.snap?.phase === "question"), "出題");

    // 偽装: 別のソケットから他人の playerId を名乗って buzz しても、押した本人にはならない
    const victim = others[0];
    const impostor = others[1];
    impostor.send({ t: "buzz", playerId: victim.creds.playerId });
    await waitFor(() => clients.every((c) => c.snap?.phase === "answering"), "回答フェーズ");
    expect(impostor.isAnswerer()).toBe(true);
    expect(victim.isAnswerer()).toBe(false);

    // 回答権のないソケットからの answer は無視され、得点も動かない
    victim.send({ t: "answer", choice: QUESTIONS[0].correct });
    await sleep(120);
    expect(victim.scoreOf(victim.creds.playerId)).toBe(0);
    expect(impostor.snap.phase).toBe("answering");
    expect(victim.notices.at(-1)).toContain("回答権");

    // 回答権を持つ本人が答えれば得点が入る
    impostor.send({ t: "answer", choice: QUESTIONS[0].correct });
    await waitFor(() => clients.every((c) => c.snap?.phase === "reveal"), "正解発表");
    expect(impostor.scoreOf(impostor.creds.playerId)).toBe(10);
    expect(impostor.snap.revealedIndex).toBe(QUESTIONS[0].correct);

    for (const c of clients) c.close();
  });

  it("ホスト以外の start は無視される", async () => {
    const host = await createRoom("あおい");
    const joined = await joinRoom(host.code, "はると");
    const hostClient = await Client.open(host);
    const guestClient = await Client.open(joined.creds!);
    await waitFor(() => hostClient.snap?.players.length === 2, "2人");

    guestClient.send({ t: "start" });
    await sleep(150);
    expect(hostClient.snap.phase).toBe("lobby");
    expect(guestClient.notices.at(-1)).toContain("ホスト");

    hostClient.send({ t: "start" });
    await waitFor(() => hostClient.snap?.phase === "question", "開始");
    hostClient.close();
    guestClient.close();
  });

  it("再読み込み相当の再接続でも、同じプレイヤーとして点数を保ったまま復帰できる", async () => {
    const host = await createRoom("あおい");
    const hostClient = await Client.open(host);
    const joined = await joinRoom(host.code, "はると");
    const guestClient = await Client.open(joined.creds!);
    await waitFor(() => hostClient.snap?.players.length === 2, "2人");

    hostClient.send({ t: "start" });
    await waitFor(() => hostClient.snap?.phase === "question", "出題");
    // 2問目まで進めて点数をつける（1問目: 正解 / 2問目: わざと不正解）
    guestClient.send({ t: "buzz" });
    await waitFor(() => guestClient.snap?.phase === "answering", "回答中");
    guestClient.send({ t: "answer", choice: QUESTIONS[0].correct });
    await waitFor(() => guestClient.snap?.phase === "question" && guestClient.snap.question.index === 1, "2問目");

    // ここでブラウザを閉じる（= 回線が切れる）
    guestClient.close();
    await waitFor(
      () => hostClient.snap.players.find((p: any) => p.id === joined.creds!.playerId)?.connected === false,
      "切断が反映される",
    );
    const scoreBefore = hostClient.snap.players.find((p: any) => p.id === joined.creds!.playerId).score;
    expect(scoreBefore).toBe(10);

    // 同じ playerId + token で入り直す
    const resumed = await post(`/api/rooms/${host.code}/join`, {
      name: "はると",
      playerId: joined.creds!.playerId,
      token: joined.creds!.token,
    });
    expect(resumed.status).toBe(200);
    expect(resumed.data.resumed).toBe(true);
    expect(resumed.data.playerId).toBe(joined.creds!.playerId);

    const reconnected = await Client.open({
      ...joined.creds!,
      playerId: resumed.data.playerId,
      token: resumed.data.token,
    });
    await waitFor(() => reconnected.snap !== null, "復帰後のスナップショット");
    expect(reconnected.snap.phase).not.toBe("lobby");
    const me = reconnected.snap.players.find((p: any) => p.id === joined.creds!.playerId);
    expect(me).toBeTruthy();
    expect(me.score).toBe(10);
    expect(me.name).toBe("はると");
    expect(me.connected).toBe(true);

    // 不正なトークンでは WebSocket に接続できない
    const bad = await SELF.fetch(
      `${ORIGIN}/api/rooms/${host.code}/ws?playerId=${joined.creds!.playerId}&token=wrong`,
      { headers: { Upgrade: "websocket" } },
    );
    expect(bad.status).toBe(401);

    hostClient.close();
    reconnected.close();
  });
});
