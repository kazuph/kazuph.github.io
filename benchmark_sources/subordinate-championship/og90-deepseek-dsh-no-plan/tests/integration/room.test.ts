import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { QUESTIONS } from "../../src/questions";
import {
  createRoom,
  joinRoom,
  QuizClient,
  roomInfo,
  sleep,
  startTestServer,
  type Credentials,
  type TestServer,
} from "./harness";

/**
 * 本物の wrangler dev（Workers ランタイム + Durable Objects + WebSocket）に対する
 * 結合テスト。4 クライアントを同時接続して検証する。
 */
let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
}, 120_000);

afterAll(async () => {
  await server?.stop();
});

const base = () => server.baseUrl;

async function setupRoom(playerCount: number): Promise<{ code: string; creds: Credentials[]; clients: QuizClient[] }> {
  const host = await createRoom(base(), "Player0");
  const creds: Credentials[] = [host];
  for (let i = 1; i < playerCount; i++) {
    const { status, body } = await joinRoom(base(), host.roomCode, `Player${i}`);
    expect(status).toBe(200);
    creds.push(body as Credentials);
  }
  const clients: QuizClient[] = [];
  for (const c of creds) clients.push(await QuizClient.connect(base(), c));
  for (const c of clients) {
    await c.waitForState((s) => s.players.length === playerCount, 12_000, "全員の参加が反映される");
  }
  return { code: host.roomCode, creds, clients };
}

describe("4人オンライン対戦", () => {
  it("4人で遊べて、同時押しでは1人だけが回答権を得る", async () => {
    const { clients } = await setupRoom(4);
    const [c0, c1, c2, c3] = clients as [QuizClient, QuizClient, QuizClient, QuizClient];
    const all = [c0, c1, c2, c3];

    c0.send({ type: "start" });
    await Promise.all(
      all.map((c) => c.waitForState((s) => s.phase === "buzzing" && s.question !== null, 12_000, "出題開始")),
    );

    const pub = c0.lastState;
    expect(pub.qIndex).toBe(0);
    expect(pub.totalQuestions).toBe(10);
    expect(pub.question.choices).toHaveLength(4);
    // 正解は reveal まで配られない
    expect(JSON.stringify(pub)).not.toContain("answerIndex");

    // ---- 同時押し ----
    for (const c of all) c.send({ type: "buzz" });
    await sleep(500);

    // イベントは全員へ同報されるので、1 クライアントの受信ログで数える
    const granted = c0.allEvents().filter((e) => e.type === "buzz-granted");
    expect(granted).toHaveLength(1);
    const denied = c0.allEvents().filter((e) => e.type === "buzz-denied");
    expect(denied).toHaveLength(3);
    const answererId = c0.lastState.answererId;
    expect(answererId).toBeTruthy();
    // 回答権を持っているのはちょうど 1 人
    expect(all.filter((c) => c.lastState.answererId === c.playerId)).toHaveLength(1);
    expect(all.every((c) => c.lastState.phase === "answering")).toBe(true);

    const answerer = all.find((c) => c.playerId === answererId)!;
    const others = all.filter((c) => c !== answerer);

    // ---- 不正解: -5 点、もう押せない ----
    const q0 = QUESTIONS[0]!;
    const wrong = (q0.answerIndex + 1) % 4;
    answerer.send({ type: "answer", choice: wrong });
    await answerer.waitForState((s) => s.phase === "buzzing" && s.buzzedOut.includes(answerer.playerId), 12_000, "不正解で再開");
    expect(answerer.lastState.players.find((p: any) => p.id === answerer.playerId)!.score).toBe(-5);

    // 押し直しは拒否される
    const deniedBefore = answerer.allEvents().filter((e) => e.type === "buzz-denied").length;
    answerer.send({ type: "buzz" });
    await sleep(300);
    expect(answerer.allEvents().filter((e) => e.type === "buzz-denied").length).toBeGreaterThan(deniedBefore);
    expect(answerer.lastState.answererId).toBeNull();

    // ---- 残りの人が正解: +10 点 ----
    const second = others[0]!;
    second.send({ type: "buzz" });
    await second.waitForState((s) => s.phase === "answering" && s.answererId === second.playerId, 12_000, "2人目の回答権");
    second.send({ type: "answer", choice: q0.answerIndex });
    const revealed = await second.waitForState((s) => s.phase === "reveal", 12_000, "正解発表");
    expect(revealed.reveal.answerIndex).toBe(q0.answerIndex);
    expect(revealed.reveal.scoredPlayerId).toBe(second.playerId);
    expect(revealed.players.find((p: any) => p.id === second.playerId)!.score).toBe(10);

    // 正解は reveal 中だけ公開される
    expect(revealed.reveal).not.toBeNull();

    for (const c of all) c.close();
  }, 60_000);

  it("5人目は入れず、理由が返る", async () => {
    const host = await createRoom(base(), "Host");
    for (let i = 1; i <= 3; i++) {
      expect((await joinRoom(base(), host.roomCode, `P${i}`)).status).toBe(200);
    }
    const fifth = await joinRoom(base(), host.roomCode, "5人目");
    expect(fifth.status).toBe(409);
    expect(fifth.body.error).toContain("満員");

    const info = await roomInfo(base(), host.roomCode);
    expect(info.body.playerCount).toBe(4);
    expect(info.body.canJoin).toBe(false);
  }, 30_000);

  it("ホスト以外は開始できず、1人でも開始できない", async () => {
    const host = await createRoom(base(), "Host");
    const solo = await QuizClient.connect(base(), host);
    solo.send({ type: "start" });
    const err = await solo.waitFor((m) => m.type === "error", 8_000, "1人で開始できないエラー");
    expect(err.message).toContain("2人以上");

    const { body: guest } = await joinRoom(base(), host.roomCode, "Guest");
    const g = await QuizClient.connect(base(), guest);
    g.send({ type: "start" });
    const err2 = await g.waitFor((m) => m.type === "error", 8_000, "ホスト以外は開始できない");
    expect(err2.message).toContain("部屋を作った人");

    solo.close();
    g.close();
  }, 30_000);

  it("再読み込み（再接続）しても点数と自分の席を保って復帰できる", async () => {
    const host = await createRoom(base(), "Host");
    const { body: guest } = await joinRoom(base(), host.roomCode, "Guest");
    const c0 = await QuizClient.connect(base(), host);
    const c1 = await QuizClient.connect(base(), guest);
    await c1.waitForState((s) => s.players.length === 2, 12_000, "2人そろう");

    c0.send({ type: "start" });
    await c1.waitForState((s) => s.phase === "buzzing" && s.question, 12_000, "開始");
    const q0 = QUESTIONS[0]!;
    c0.send({ type: "buzz" });
    await c0.waitForState((s) => s.answererId === c0.playerId, 12_000, "回答権");
    c0.send({ type: "answer", choice: q0.answerIndex });
    await c0.waitForState((s) => s.phase === "reveal", 12_000, "正解");
    expect(c0.lastState.players.find((p: any) => p.id === c0.playerId)!.score).toBe(10);

    // ブラウザ再読み込み相当: ソケットを閉じて同じ playerId + token で張り直す
    c0.close();
    await c1.waitForState(
      (s) => s.players.find((p: any) => p.id === c0.playerId)?.connected === false,
      12_000,
      "切断が反映される",
    );

    const reconnected = await QuizClient.connect(base(), host);
    const restored = await reconnected.waitForState(
      (s) => s.players.find((p: any) => p.id === host.playerId)?.connected === true,
      12_000,
      "復帰",
    );
    const me = restored.players.find((p: any) => p.id === host.playerId);
    expect(me.score).toBe(10);
    expect(restored.players).toHaveLength(2);
    expect(restored.hostId).toBe(host.playerId);

    reconnected.close();
    c1.close();
  }, 45_000);

  it("問題の制限時間（20秒）が来るとサーバーの alarm が正解を発表し、次の問題へ進む", async () => {
    const host = await createRoom(base(), "Host");
    const { body: guest } = await joinRoom(base(), host.roomCode, "Guest");
    const c0 = await QuizClient.connect(base(), host);
    const c1 = await QuizClient.connect(base(), guest);
    await c1.waitForState((s) => s.players.length === 2, 12_000, "2人そろう");

    c0.send({ type: "start" });
    const startedAt = Date.now();
    await c1.waitForState((s) => s.phase === "buzzing" && s.question, 12_000, "出題");

    // 誰も押さない → 20 秒で reveal
    const revealed = await c1.waitForState((s) => s.phase === "reveal", 30_000, "20秒で正解発表");
    const elapsed = Date.now() - startedAt;
    expect(elapsed).toBeGreaterThanOrEqual(19_000);
    expect(revealed.reveal.answerIndex).toBe(QUESTIONS[0]!.answerIndex);
    expect(revealed.reveal.scoredPlayerId).toBeNull();

    // reveal の 4 秒後に次の問題（第2問）へ自動で進む
    const next = await c1.waitForState((s) => s.qIndex === 1 && s.phase === "buzzing", 15_000, "次の問題へ");
    expect(next.question.text).toBe(QUESTIONS[1]!.text);

    c0.close();
    c1.close();
  }, 60_000);
});
