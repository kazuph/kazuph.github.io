/**
 * 実サーバー（wrangler dev + Durable Object + WebSocket）に対する結合テスト。
 * 早押しの競合・得点・定員・再接続を、ブラウザを介さず実プロトコルで確認する。
 *
 * 実行: node test/integration/ws.test.mjs
 */
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const PORT = 38741; // 開発用の 8787 とは別の一時ポート（テスト終了時に停止する）
const INSPECTOR_PORT = 38742;
const BASE = `http://127.0.0.1:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  const child = spawn(
    "npx",
    ["wrangler", "dev", "--port", String(PORT), "--inspector-port", String(INSPECTOR_PORT)],
    {
      cwd: process.cwd(),
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true, // プロセスグループごと止められるようにする
    },
  );
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
}

/** npx→wrangler→workerd をまとめて止める（孫プロセスが残らないように）。 */
async function stopServer(child) {
  if (!child) return;
  const killGroup = (signal) => {
    try {
      process.kill(-child.pid, signal);
    } catch {
      try {
        child.kill(signal);
      } catch {
        /* ignore */
      }
    }
  };
  killGroup("SIGTERM");
  await sleep(600);
  killGroup("SIGKILL");
  await sleep(200);
}

async function waitForReady(timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  throw new Error("server did not become ready");
}

class Client {
  constructor(room, id, name) {
    this.room = room;
    this.id = id;
    this.name = name;
    this.latest = null;
    this.lastError = null;
    this.welcomed = false;
  }

  open() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${PORT}/api/room/${this.room}/ws`);
      this.ws = ws;
      const timer = setTimeout(() => reject(new Error("ws open timeout")), 10_000);
      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({ t: "join", playerId: this.id, name: this.name }));
      });
      ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(String(ev.data));
        if (msg.t === "welcome") {
          this.welcomed = true;
          clearTimeout(timer);
          resolve(this);
        } else if (msg.t === "state") {
          this.latest = msg.state;
        } else if (msg.t === "error") {
          this.lastError = msg.message;
        }
      });
      ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("ws error"));
      });
      ws.addEventListener("close", (ev) => {
        this.closedCode = ev.code;
        if (!this.welcomed) {
          clearTimeout(timer);
          reject(new Error(`ws closed ${ev.code}`));
        }
      });
    });
  }

  send(obj) {
    this.ws.send(JSON.stringify(obj));
  }

  async waitFor(pred, timeoutMs = 8000, label = "state") {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.latest && pred(this.latest)) return this.latest;
      await sleep(30);
    }
    throw new Error(`timeout waiting for ${label}`);
  }

  close() {
    try {
      this.ws && this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

const results = [];
function check(name, fn) {
  results.push({ name, fn });
}

// ---------------------------------------------------------------- tests
check("4人まで入室でき、5人目は理由つきで拒否される", async (room) => {
  const clients = [];
  for (let i = 1; i <= 4; i++) clients.push(await new Client(room, `p${i}`, `P${i}`).open());
  await clients[0].waitFor((s) => s.players.length === 4, 5000, "4 players");
  const fifth = new Client(room, "p5", "P5");
  await assert.rejects(() => fifth.open());
  await sleep(150);
  assert.match(fifth.lastError || "", /満員/);
  assert.equal(fifth.closedCode, 4001);
  for (const c of clients) c.close();
  fifth.close();
  await sleep(200);
});

check("同時押しでも回答権を得るのは1人だけ", async (room) => {
  const ids = ["a", "b", "c", "d"];
  const clients = [];
  for (const id of ids) clients.push(await new Client(room, id, id.toUpperCase()).open());
  await clients[0].waitFor((s) => s.players.length === 4);
  clients[0].send({ t: "start" });
  await clients[0].waitFor((s) => s.phase === "question" && s.question, 5000, "question");

  // 4人ぶんの buzz をほぼ同時に送信
  for (const c of clients) c.send({ t: "buzz" });
  const state = await clients[0].waitFor((s) => s.phase === "answering", 5000, "answering");
  const answeringIds = new Set();
  for (const c of clients) {
    const s = await c.waitFor((st) => st.phase === "answering");
    answeringIds.add(s.answeringPlayerId);
    assert.equal(s.answeringPlayerId, state.answeringPlayerId, "全員が同じ回答者を見ている");
  }
  assert.equal(answeringIds.size, 1, "回答権を持つのは1人だけ");
  assert.ok(ids.includes(state.answeringPlayerId));
  for (const c of clients) c.close();
  await sleep(200);
});

check("正解+10 / 不正解-5 がサーバー側で確定する", async (room) => {
  const a = await new Client(room, "a", "A").open();
  const b = await new Client(room, "b", "B").open();
  const c = await new Client(room, "c", "C").open();
  await a.waitFor((s) => s.players.length === 3);
  a.send({ t: "start" });
  await a.waitFor((s) => s.phase === "question" && s.question, 5000, "question");

  // 問題1の正解は index 0（「こんにちは」= Hello）
  a.send({ t: "buzz" });
  await a.waitFor((s) => s.answeringPlayerId === "a", 5000, "a answering");
  a.send({ t: "answer", choice: 0 });
  await a.waitFor((s) => s.players.find((p) => p.id === "a").score === 10, 5000, "a +10");

  // b はわざと不正解
  b.send({ t: "buzz" });
  await b.waitFor((s) => s.answeringPlayerId === "b", 5000, "b answering");
  b.send({ t: "answer", choice: 1 });
  await b.waitFor((s) => s.players.find((p) => p.id === "b").score === -5, 5000, "b -5");

  // b はこの問題で再び押せない（c はまだ押せるので問題は継続中）
  b.send({ t: "buzz" });
  await sleep(200);
  assert.match(b.lastError || "", /もう押せません/);
  c.send({ t: "buzz" });
  await c.waitFor((s) => s.answeringPlayerId === "c", 5000, "c can still buzz");

  a.close();
  b.close();
  c.close();
  await sleep(200);
});

check("回線が切れて再接続しても点数を保ったまま復帰できる", async (room) => {
  const a = await new Client(room, "a", "A").open();
  const b = await new Client(room, "b", "B").open();
  await a.waitFor((s) => s.players.length === 2);
  a.send({ t: "start" });
  await a.waitFor((s) => s.phase === "question", 5000);
  a.send({ t: "buzz" });
  await a.waitFor((s) => s.answeringPlayerId === "a", 5000);
  a.send({ t: "answer", choice: 0 });
  await a.waitFor((s) => s.players.find((p) => p.id === "a").score === 10, 5000);

  // a の接続を落として、同じ playerId で張り直す
  a.close();
  await sleep(300);
  const a2 = await new Client(room, "a", "A").open();
  const s = await a2.waitFor((st) => st.players.find((p) => p.id === "a"), 5000, "a restored");
  const pa = s.players.find((p) => p.id === "a");
  assert.equal(pa.score, 10, "点数が保持されている");
  assert.equal(pa.connected, true);
  assert.equal(s.players.length, 2, "プレイヤーが重複しない");

  a2.close();
  b.close();
  await sleep(200);
});

check("早押しボタンはサーバーの受付順で決まる（片方だけが回答権を得る）", async (room) => {
  const a = await new Client(room, "a", "A").open();
  const b = await new Client(room, "b", "B").open();
  await a.waitFor((s) => s.players.length === 2);
  a.send({ t: "start" });
  await a.waitFor((s) => s.phase === "question", 5000);
  a.send({ t: "buzz" });
  await a.waitFor((s) => s.answeringPlayerId === "a", 5000);
  b.send({ t: "buzz" });
  await sleep(200);
  assert.equal(b.latest.answeringPlayerId, "a", "後から押した人は回答権を得られない");
  a.close();
  b.close();
  await sleep(200);
});

// ---------------------------------------------------------------- runner
async function main() {
  const server = startServer();
  let failed = 0;
  try {
    await waitForReady();
    for (let i = 0; i < results.length; i++) {
      const { name, fn } = results[i];
      const room = `IT${Date.now().toString(36).slice(-4)}${i}`.toUpperCase();
      try {
        await fn(room);
        console.log(`  \u2713 ${name}`);
      } catch (err) {
        failed++;
        console.error(`  \u2717 ${name}\n    ${err && err.message ? err.message : err}`);
      }
    }
  } finally {
    await stopServer(server);
  }
  console.log(failed === 0 ? "\n結合テスト: すべて成功" : `\n結合テスト: ${failed} 件失敗`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
