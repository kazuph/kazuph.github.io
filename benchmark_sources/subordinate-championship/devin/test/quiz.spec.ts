import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../src/questions";
import {
  connectWs,
  createRoom,
  joinRoom,
  sleep,
  startGame,
  type Session,
} from "./helpers";

describe("部屋の作成と参加", () => {
  it("部屋を作るとコードとセッションが返る", async () => {
    const s = await createRoom("alice");
    expect(s.roomCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(s.playerId).toBeTruthy();
    expect(s.token).toBeTruthy();
  });

  it("定員は4人。5人目は理由つきで拒否される", async () => {
    const room = await createRoom("p1");
    for (const n of ["p2", "p3", "p4"]) {
      const r = await joinRoom(room.roomCode, n);
      expect(r.status).toBe(200);
    }
    const fifth = await joinRoom(room.roomCode, "p5");
    expect(fifth.status).toBe(409);
    expect(fifth.data.error).toContain("満員");
  });

  it("存在しない部屋コードでは参加できない", async () => {
    const r = await joinRoom("ZZZZ99", "x");
    expect(r.status).toBe(404);
    expect(r.data.error).toBeTruthy();
  });

  it("ゲーム中の部屋には参加できない", async () => {
    const host = await createRoom("h");
    await joinRoom(host.roomCode, "a");
    const hc = await connectWs(host);
    const ac = await connectWs(await joinAs(host.roomCode, "a2"));
    await startGame([hc, ac], hc);
    const r = await joinRoom(host.roomCode, "late");
    expect(r.status).toBe(409);
    expect(r.data.error).toContain("ゲーム中");
    hc.close();
    ac.close();
  });
});

async function joinAs(code: string, name: string): Promise<Session> {
  const r = await joinRoom(code, name);
  if (r.status !== 200) throw new Error(r.data.error);
  return r.data;
}

describe("ゲーム開始", () => {
  it("1人では開始できない（ホストにエラーが返る）", async () => {
    const host = await createRoom("h");
    const hc = await connectWs(host);
    hc.send({ t: "start" });
    await hc.waitAny((m) => m.t === "error");
    expect(hc.last()?.phase).toBe("lobby");
    hc.close();
  });

  it("ホスト以外は開始できない", async () => {
    const host = await createRoom("h");
    const guest = await joinAs(host.roomCode, "g");
    const hc = await connectWs(host);
    const gc = await connectWs(guest);
    gc.send({ t: "start" });
    await gc.waitAny((m) => m.t === "error");
    expect(hc.last()?.phase).toBe("lobby");
    hc.close();
    gc.close();
  });

  it("2人で開始すると全員に問題が配信される", async () => {
    const host = await createRoom("h");
    const g = await joinAs(host.roomCode, "g");
    const hc = await connectWs(host);
    const gc = await connectWs(g);
    await startGame([hc, gc], hc);
    for (const c of [hc, gc]) {
      const st = c.last()!;
      expect(st.phase).toBe("question");
      expect(st.question?.n).toBe(1);
      expect(st.question?.choices).toHaveLength(4);
    }
    hc.close();
    gc.close();
  });
});

describe("早押しと回答", () => {
  it("同時押しではサーバーが受けた1人だけが回答権を得る", async () => {
    const host = await createRoom("h");
    const others = await Promise.all(
      ["a", "b", "c"].map((n) => joinAs(host.roomCode, n))
    );
    const sessions = [host, ...others];
    const clients = await Promise.all(sessions.map(connectWs));
    await startGame(clients, clients[0]);

    // 4人が「同時」に buzz を送る（await せずに連続 send）
    for (const c of clients) c.send({ t: "buzz" });

    // 全クライアントで最終的に answer フェーズになる
    const finals = await Promise.all(
      clients.map((c) => c.waitFor((m) => m.phase === "answer"))
    );
    const winners = new Set(finals.map((m) => m.answering?.playerId));
    expect(winners.size).toBe(1);
    const winner = [...winners][0];
    expect(sessions.some((s) => s.playerId === winner)).toBe(true);

    for (const c of clients) c.close();
  });

  it("正解で+10点、リビール後に次の問題へ進む", async () => {
    const host = await createRoom("h");
    const g = await joinAs(host.roomCode, "g");
    const hc = await connectWs(host);
    const gc = await connectWs(g);
    await startGame([hc, gc], hc);

    hc.send({ t: "buzz" });
    await hc.waitFor((m) => m.phase === "answer");
    hc.send({ t: "answer", i: QUESTIONS[0].answer });
    const reveal = await hc.waitFor((m) => m.phase === "reveal");
    expect(reveal.reveal?.answeredBy).toBe(host.playerId);
    const me = reveal.players.find((p) => p.id === host.playerId)!;
    expect(me.score).toBe(10);

    const next = await hc.waitFor(
      (m) => m.phase === "question" && m.question?.n === 2
    );
    expect(next.question?.n).toBe(2);
    hc.close();
    gc.close();
  });

  it("不正解は-5点・その問題で押せなくなり、残りで再開する", async () => {
    const host = await createRoom("h");
    const g = await joinAs(host.roomCode, "g");
    const hc = await connectWs(host);
    const gc = await connectWs(g);
    await startGame([hc, gc], hc);

    const wrong = (QUESTIONS[0].answer + 1) % 4;
    hc.send({ t: "buzz" });
    await hc.waitFor((m) => m.phase === "answer");
    hc.send({ t: "answer", i: wrong });

    // question フェーズに戻る
    const resumed = await gc.waitFor((m) => m.phase === "question");
    const hostP = resumed.players.find((p) => p.id === host.playerId)!;
    expect(hostP.score).toBe(-5);
    expect(hostP.locked).toBe(true);
    const guestP = resumed.players.find((p) => p.id === g.playerId)!;
    expect(guestP.locked).toBe(false);

    // ロックされたホストの buzz は無視される
    hc.send({ t: "buzz" });
    await sleep(200);
    expect(hc.last()?.phase).toBe("question");

    // 残ったプレイヤーは押せる
    gc.send({ t: "buzz" });
    await gc.waitFor((m) => m.phase === "answer");
    expect(gc.last()?.answering?.playerId).toBe(g.playerId);
    hc.close();
    gc.close();
  });

  it("回答10秒タイムアウトは不正解扱いになる", async () => {
    const host = await createRoom("h");
    const g = await joinAs(host.roomCode, "g");
    const hc = await connectWs(host);
    const gc = await connectWs(g);
    await startGame([hc, gc], hc);

    hc.send({ t: "buzz" });
    await hc.waitFor((m) => m.phase === "answer");
    // ANSWER_MS=700ms なので何もしないで待つ
    const resumed = await gc.waitFor(
      (m) => m.phase === "question" || m.phase === "reveal",
      5000
    );
    if (resumed.phase === "question") {
      const hostP = resumed.players.find((p) => p.id === host.playerId)!;
      expect(hostP.score).toBe(-5);
      expect(hostP.locked).toBe(true);
    }
    hc.close();
    gc.close();
  });

  it("誰も押さないまま20秒（テストでは1500ms）たつと正解表示へ", async () => {
    const host = await createRoom("h");
    const g = await joinAs(host.roomCode, "g");
    const hc = await connectWs(host);
    const gc = await connectWs(g);
    await startGame([hc, gc], hc);

    const reveal = await hc.waitFor((m) => m.phase === "reveal", 6000);
    expect(reveal.reveal?.timedOut).toBe(true);
    expect(reveal.reveal?.answeredBy).toBeNull();
    hc.close();
    gc.close();
  });

  it("全員が押せなくなると正解を表示して次へ", async () => {
    const host = await createRoom("h");
    const g = await joinAs(host.roomCode, "g");
    const hc = await connectWs(host);
    const gc = await connectWs(g);
    await startGame([hc, gc], hc);

    const wrong = (QUESTIONS[0].answer + 1) % 4;
    // ホストが間違える
    hc.send({ t: "buzz" });
    await hc.waitFor((m) => m.phase === "answer");
    hc.send({ t: "answer", i: wrong });
    await hc.waitFor((m) => m.phase === "question");
    // ゲストも間違える → 全員ロック → リビール
    gc.send({ t: "buzz" });
    await gc.waitFor((m) => m.phase === "answer");
    gc.send({ t: "answer", i: (QUESTIONS[0].answer + 2) % 4 });
    const reveal = await gc.waitFor((m) => m.phase === "reveal");
    expect(reveal.reveal).toBeTruthy();
    hc.close();
    gc.close();
  });
});

describe("再接続", () => {
  it("切断後も同じプレイヤーとして点数を保って復帰できる", async () => {
    const host = await createRoom("h");
    const g = await joinAs(host.roomCode, "g");
    const hc = await connectWs(host);
    const gc = await connectWs(g);
    await startGame([hc, gc], hc);

    // ホストが正解して +10
    hc.send({ t: "buzz" });
    await hc.waitFor((m) => m.phase === "answer");
    hc.send({ t: "answer", i: QUESTIONS[0].answer });
    await hc.waitFor((m) => m.phase === "reveal");

    // 切断 → 再接続
    hc.close();
    const hc2 = await connectWs(host);
    const st = await hc2.waitFor((m) => m.t === "state" && m.you === host.playerId);
    const me = st.players.find((p) => p.id === host.playerId)!;
    expect(me.score).toBe(10);
    expect(me.connected).toBe(true);
    hc2.close();
    gc.close();
  });

  it("トークンが違うと接続を拒否される", async () => {
    const host = await createRoom("h");
    const bad = {
      ...host,
      token: "00000000-0000-0000-0000-000000000000",
    };
    // ws 升级は 403
    const res = await SELF.fetch(
      `http://test/ws?room=${bad.roomCode}&playerId=${bad.playerId}&token=${bad.token}`,
      { headers: { Upgrade: "websocket" } }
    );
    expect(res.status).toBe(403);
    // セッション確認 API も 403
    const sres = await SELF.fetch(
      `http://test/api/rooms/${bad.roomCode}/session?playerId=${bad.playerId}&token=${bad.token}`
    );
    expect(sres.status).toBe(403);
    // 正しいトークンなら 200
    const ok = await SELF.fetch(
      `http://test/api/rooms/${host.roomCode}/session?playerId=${host.playerId}&token=${host.token}`
    );
    expect(ok.status).toBe(200);
  });
});

describe("ゲーム完走", () => {
  it(
    "10問終わると最終順位が全員に表示される",
    async () => {
      const host = await createRoom("h");
      const g = await joinAs(host.roomCode, "g");
      const hc = await connectWs(host);
      const gc = await connectWs(g);
      await startGame([hc, gc], hc);

      // startGame 時点で Q1 の question state は受信済み
      for (let qi = 0; qi < QUESTIONS.length; qi++) {
        // ホストが毎回押して正解する
        hc.send({ t: "buzz" });
        await hc.waitFor((m) => m.phase === "answer");
        hc.send({ t: "answer", i: QUESTIONS[qi].answer });
        if (qi === QUESTIONS.length - 1) break;
        await hc.waitFor(
          (m) => m.phase === "question" && m.question?.n === qi + 2
        );
      }

      const fin = await gc.waitFor((m) => m.phase === "finished", 15000);
      expect(fin.ranking).toBeTruthy();
      expect(fin.ranking![0].playerId).toBe(host.playerId);
      expect(fin.ranking![0].score).toBe(QUESTIONS.length * 10);
      expect(fin.ranking![0].rank).toBe(1);
      expect(fin.ranking![1].rank).toBe(2);

      // ホストの「もう一度遊ぶ」でロビーに戻り、スコアがリセットされる
      hc.send({ t: "restart" });
      const lobby = await hc.waitFor((m) => m.phase === "lobby");
      expect(lobby.players.every((p) => p.score === 0)).toBe(true);
      hc.close();
      gc.close();
    },
    30000
  );
});
