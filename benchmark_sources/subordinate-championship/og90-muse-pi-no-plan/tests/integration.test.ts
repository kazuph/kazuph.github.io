import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PORT = 18787;
const BASE = `http://127.0.0.1:${PORT}`;
const WS_BASE = `ws://127.0.0.1:${PORT}`;

let server: ChildProcess | null = null;

async function waitForHealth(timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    if (Date.now() - start > timeoutMs) throw new Error("wrangler dev が起動しませんでした");
    await new Promise((r) => setTimeout(r, 500));
  }
}

beforeAll(async () => {
  server = spawn("npx", ["wrangler", "dev", "--port", String(PORT), "--ip", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
  });
  server.stdout?.on("data", () => {});
  server.stderr?.on("data", () => {});
  await waitForHealth();
}, 150_000);

afterAll(async () => {
  if (server) {
    server.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 2000));
    if (!server.killed) server.kill("SIGKILL");
    server = null;
  }
});

interface JoinResult {
  roomCode: string;
  playerId: string;
  token: string;
  isRejoin?: boolean;
}

async function createRoom(name: string): Promise<JoinResult> {
  const res = await fetch(`${BASE}/api/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json()) as JoinResult & { ok: boolean; message?: string; error?: string };
  if (!res.ok) throw new Error(`create failed: ${data.message ?? data.error}`);
  return data;
}

async function joinRoom(code: string, name: string, token?: string): Promise<JoinResult> {
  const res = await fetch(`${BASE}/api/rooms/${code}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, token }),
  });
  const data = (await res.json()) as JoinResult & { ok: boolean; message?: string; error?: string };
  if (!res.ok) {
    const e = new Error(data.message ?? "join failed") as Error & { status?: number; body?: unknown };
    e.status = res.status;
    e.body = data;
    throw e;
  }
  return data;
}

interface PublicStateMsg {
  type: string;
  state?: Record<string, unknown>;
  you?: { playerId: string } | null;
  error?: string;
  message?: string;
}

class WsClient {
  ws!: WebSocket;
  states: Record<string, unknown>[] = [];
  errors: PublicStateMsg[] = [];
  lastState: Record<string, unknown> | null = null;
  playerId: string;

  constructor(
    readonly code: string,
    readonly token: string,
  ) {
    this.playerId = "";
  }

  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${WS_BASE}/api/rooms/${this.code}/ws?token=${this.token}`);
      const timer = setTimeout(() => reject(new Error("WS接続タイムアウト")), 10_000);
      ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("WS接続エラー"));
      });
      ws.addEventListener("message", (ev) => {
        let msg: PublicStateMsg;
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (msg.type === "state" && msg.state) {
          this.lastState = msg.state;
          this.states.push(msg.state);
        } else if (msg.type === "error") {
          this.errors.push(msg);
        }
      });
      this.ws = ws;
    });
  }

  send(data: unknown): void {
    this.ws.send(JSON.stringify(data));
  }

  async waitFor(pred: (s: Record<string, unknown>) => boolean, timeoutMs = 15_000): Promise<Record<string, unknown>> {
    const start = Date.now();
    for (;;) {
      if (this.lastState && pred(this.lastState)) return this.lastState;
      if (Date.now() - start > timeoutMs) {
        throw new Error(`state待機タイムアウト: ${JSON.stringify(this.lastState)?.slice(0, 300)}`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

const phaseOf = (s: Record<string, unknown>) => s["phase"] as string;

describe("結合: 4人同時プレイ（実サーバー＋WebSocket）", () => {
  it("入室→定員→開始→同時押し→回答→復帰→完走", async () => {
    // 1. ホストが部屋作成
    const host = await createRoom("ホスト");
    expect(host.roomCode).toMatch(/^[A-Z0-9]{4}$/);
    const code = host.roomCode;

    // 2. 3人が参加（計4人）
    const b = await joinRoom(code, "B子");
    const c = await joinRoom(code, "C太");
    const d = await joinRoom(code, "D美");

    // 3. 5人目は入れず理由が返る
    await expect(joinRoom(code, "E男")).rejects.toThrow(/定員/);

    // 4. 4人全員がWebSocket接続
    const clients = [
      new WsClient(code, host.token),
      new WsClient(code, b.token),
      new WsClient(code, c.token),
      new WsClient(code, d.token),
    ];
    clients[0].playerId = host.playerId;
    clients[1].playerId = b.playerId;
    clients[2].playerId = c.playerId;
    clients[3].playerId = d.playerId;
    await Promise.all(clients.map((cl) => cl.connect()));
    for (const cl of clients) {
      await cl.waitFor((s) => phaseOf(s) === "lobby");
    }

    // 5. ホストが開始
    clients[0].send({ type: "start" });
    for (const cl of clients) {
      await cl.waitFor((s) => phaseOf(s) === "question" && (s["questionIndex"] as number) === 0);
    }

    // 6. 同時押し：4人が一斉にbuzz → 全員の画面で勝者が1人に一致する
    clients.forEach((cl) => cl.send({ type: "buzz" }));
    const winnerStates = await Promise.all(
      clients.map((cl) => cl.waitFor((s) => phaseOf(s) === "answering")),
    );
    const winners = new Set(winnerStates.map((s) => s["buzzWinnerId"] as string));
    expect(winners.size).toBe(1);
    const winnerId = [...winners][0];
    const winnerIdx = [host, b, c, d].findIndex((p) => p.playerId === winnerId);
    expect(winnerIdx).toBeGreaterThanOrEqual(0);

    // 7. 勝者が正解を選ぶ（正解はサーバーだけが知っているので、4択を総当たりせず公開stateのrevealで確認）
    //    まず不正解の可能性もあるため、回答後にrevealになるまで待ち、点数変動を確認する
    const winnerClient = clients[winnerIdx];
    const before = (winnerClient.lastState!["players"] as { id: string; score: number }[]).find(
      (p) => p.id === winnerId,
    )!.score;
    // 正解番号はクライアントには見えないので、Q1の正解を試す代わりに
    // 「いずれかの選択肢」を送り、結果に応じて検証する。ここでは正解(+10)を狙うため
    // 4択のうち少なくとも1回は正解するはずだが、決定的にするため不正解→再開フローも別途検証する。
    // 簡単のため: まずわざと不正解（である可能性が高い適当値ではなく）——
    // サーバー正解は隠蔽されているので、ここでは「回答が裁定されること」を確認する。
    winnerClient.send({ type: "answer", choice: 0 });
    await winnerClient.waitFor((s) => phaseOf(s) === "reveal" || phaseOf(s) === "question");

    if (phaseOf(winnerClient.lastState!) === "question") {
      // 不正解で早押し再開したケース：-5点のはず
      const after = (winnerClient.lastState!["players"] as { id: string; score: number }[]).find(
        (p) => p.id === winnerId,
      )!.score;
      expect(after).toBe(before - 5);
      // ロックアウトされた勝者はもう押せない
      winnerClient.send({ type: "buzz" });
      await new Promise((r) => setTimeout(r, 800));
      // 別メンバーが押して正解発表まで進める（総当たりで正解を引く）
      const others = clients.filter((_, i) => i !== winnerIdx);
      let settled = false;
      for (const oc of others) {
        if (settled) break;
        oc.send({ type: "buzz" });
        try {
          await oc.waitFor((s) => (s["buzzWinnerId"] as string) === oc.playerId, 5000);
        } catch {
          continue; // 他者が取った
        }
        for (let choice = 0; choice < 4 && !settled; choice++) {
          oc.send({ type: "answer", choice });
          await new Promise((r) => setTimeout(r, 600));
          const ph = phaseOf(oc.lastState!);
          if (ph === "reveal") settled = true;
          else if (ph === "question") break; // 不正解で再開→次の回答者へ
        }
      }
      expect(settled).toBe(true);
    } else {
      // 正解でrevealのケース
      const after = (winnerClient.lastState!["players"] as { id: string; score: number }[]).find(
        (p) => p.id === winnerId,
      )!.score;
      expect([before + 10, before - 5].includes(after)).toBe(true);
    }

    // 全員が同じrevealを見ている（点数・回答者がそろう）
    const reveals = await Promise.all(
      clients.map((cl) => cl.waitFor((s) => phaseOf(s) === "reveal", 20_000)),
    );
    const scoreViews = reveals.map((s) =>
      JSON.stringify((s["players"] as { id: string; score: number }[]).map((p) => p.score)),
    );
    expect(new Set(scoreViews).size).toBe(1);

    // 8. 再読み込み復帰：BのWSを切断→トークンで再参加→再接続→点数保持
    const scoreBefore = (clients[1].lastState!["players"] as { id: string; score: number }[]).find(
      (p) => p.id === b.playerId,
    )!.score;
    clients[1].close();
    await new Promise((r) => setTimeout(r, 500));
    const rejoin = await joinRoom(code, "B子", b.token);
    expect(rejoin.isRejoin).toBe(true);
    const b2 = new WsClient(code, b.token);
    b2.playerId = b.playerId;
    await b2.connect();
    clients[1] = b2;
    await b2.waitFor((s) => {
      const me = (s["players"] as { connected: boolean; id: string }[]).find((p) => p.id === b.playerId);
      return !!me?.connected;
    });
    const scoreAfter = (b2.lastState!["players"] as { id: string; score: number }[]).find(
      (p) => p.id === b.playerId,
    )!.score;
    expect(scoreAfter).toBe(scoreBefore);

    // 9. 残りの問題を消化して完走（各問：押せる人がbuzz→正解するまで総当たり）
    for (let guard = 0; guard < 120; guard++) {
      const cur = clients[0].lastState!;
      if (phaseOf(cur) === "finished") break;
      if (phaseOf(cur) === "reveal") {
        await clients[0].waitFor((s) => phaseOf(s) !== "reveal", 15_000);
        continue;
      }
      if (phaseOf(cur) === "answering") {
        // 回答権者が総当たりで回答する
        const wid = cur["buzzWinnerId"] as string;
        const wc = clients.find((cl) => cl.playerId === wid);
        if (wc) {
          for (let choice = 0; choice < 4; choice++) {
            wc.send({ type: "answer", choice });
            await new Promise((r) => setTimeout(r, 350));
            const ph = phaseOf(wc.lastState!);
            if (ph !== "answering") break;
          }
        } else {
          await new Promise((r) => setTimeout(r, 500));
        }
        continue;
      }
      if (phaseOf(cur) === "question") {
        // 押せる人（ロックアウト外）でbuzz
        const locked = new Set(cur["lockedOut"] as string[]);
        const cand = clients.find((cl) => !locked.has(cl.playerId));
        if (!cand) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        cand.send({ type: "buzz" });
        try {
          await cand.waitFor(
            (s) => phaseOf(s) === "answering" && (s["buzzWinnerId"] as string) === cand.playerId,
            8000,
          );
        } catch {
          continue;
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    const fin = await clients[0].waitFor((s) => phaseOf(s) === "finished", 120_000);
    expect(fin["ranking"]).toBeTruthy();
    expect(((fin["ranking"] as unknown[]) ?? []).length).toBe(4);

    for (const cl of clients) cl.close();
  }, 240_000);

  it("回答10秒タイムアウトで早押し再開（alarm動作）", async () => {
    const host = await createRoom("Tホスト");
    const code = host.roomCode;
    const b = await joinRoom(code, "T子");
    const c1 = new WsClient(code, host.token);
    c1.playerId = host.playerId;
    const c2 = new WsClient(code, b.token);
    c2.playerId = b.playerId;
    await Promise.all([c1.connect(), c2.connect()]);
    c1.send({ type: "start" });
    await c1.waitFor((s) => phaseOf(s) === "question");
    c1.send({ type: "buzz" });
    await c1.waitFor((s) => phaseOf(s) === "answering");
    // 10秒間回答しない → タイムアウトでquestionに戻る
    await c1.waitFor((s) => phaseOf(s) === "question", 20_000);
    expect((c1.lastState!["lockedOut"] as string[])).toContain(host.playerId);
    c1.close();
    c2.close();
  }, 120_000);
});
