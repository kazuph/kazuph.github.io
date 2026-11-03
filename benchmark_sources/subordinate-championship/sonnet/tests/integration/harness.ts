// 結合テストの道具立て: 実際の wrangler dev（workerd）を別ポートで一時的に起動し、WebSocket で人間の代わりに遊ぶ。
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { QUESTIONS } from "../../src/questions";
import { freePort } from "../free-port";

export const TIMING = { QUESTION_MS: 4000, ANSWER_MS: 1500, REVEAL_MS: 500, LOBBY_GRACE_MS: 1500 };

export async function startServer(timing: Record<string, number> | null = TIMING): Promise<{ base: string; stop: () => Promise<void> }> {
  const port = await freePort();
  const persist = mkdtempSync(join(tmpdir(), "quiz-int-"));
  const args = ["wrangler", "dev", "--port", String(port), "--inspector-port", "0", "--persist-to", persist];
  for (const [k, v] of Object.entries(timing ?? {})) args.push("--var", `${k}:${v}`);
  const child: ChildProcess = spawn("npx", args, { env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" }, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  const ready = new Promise<void>((resolve, reject) => {
    const onData = (d: Buffer) => {
      log += d.toString();
      if (log.includes("Ready on")) resolve();
    };
    child.stdout!.on("data", onData);
    child.stderr!.on("data", onData);
    child.on("exit", (c) => reject(new Error(`wrangler が終了しました(${c})\n${log}`)));
    setTimeout(() => reject(new Error("wrangler の起動がタイムアウト\n" + log)), 90_000);
  });
  await ready;
  return {
    base: `http://localhost:${port}`,
    stop: async () => {
      child.removeAllListeners("exit");
      child.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 300));
    },
  };
}

export async function createRoom(base: string): Promise<string> {
  const r = await fetch(base + "/api/rooms", { method: "POST" });
  return ((await r.json()) as { code: string }).code;
}

export interface State {
  phase: string;
  you: string;
  hostId: string;
  players: { id: string; name: string; score: number; connected: boolean; locked: boolean }[];
  qIndex: number;
  question: { text: string; choices: string[] } | null;
  answererId: string | null;
  reveal: { correctIndex: number; outcome: string; winnerId: string | null } | null;
  ranking: { id: string; name: string; score: number; rank: number }[] | null;
  now: number;
  [k: string]: unknown;
}

export class Client {
  state: State | null = null;
  states: State[] = [];
  errors: { code: string; message: string; fatal?: boolean }[] = [];
  playerId = "";
  token = "";
  closeCode: number | null = null;
  rawMessages: string[] = [];
  private ws!: WebSocket;
  private waiters: (() => void)[] = [];

  static async open(base: string, code: string, name: string, token = ""): Promise<Client> {
    const c = new Client();
    c.ws = new WebSocket(base.replace("http", "ws") + "/ws/" + code);
    c.ws.addEventListener("message", (ev) => {
      const raw = String(ev.data);
      c.rawMessages.push(raw);
      const m = JSON.parse(raw);
      if (m.t === "welcome") {
        c.playerId = m.playerId;
        c.token = m.token;
      } else if (m.t === "state") {
        c.state = m;
        c.states.push(m);
      } else if (m.t === "error") c.errors.push(m);
      c.waiters.splice(0).forEach((w) => w());
    });
    c.ws.addEventListener("close", (ev) => {
      c.closeCode = ev.code;
      c.waiters.splice(0).forEach((w) => w());
    });
    await new Promise<void>((res, rej) => {
      c.ws.addEventListener("open", () => res());
      c.ws.addEventListener("error", () => rej(new Error("ws error")));
    });
    c.ws.send(JSON.stringify({ t: "hello", name, token }));
    await c.until(() => !!c.state || c.errors.length > 0 || c.closeCode !== null, "入室の結果");
    return c;
  }

  send(obj: object) {
    this.ws.send(JSON.stringify(obj));
  }
  close() {
    this.ws.close();
  }

  async until(pred: () => boolean, what: string, ms = 8000) {
    const end = Date.now() + ms;
    while (!pred()) {
      const left = end - Date.now();
      if (left <= 0) throw new Error(`待ち時間切れ: ${what}\n最新の状態: ${JSON.stringify(this.state)}\nエラー: ${JSON.stringify(this.errors)}`);
      await new Promise<void>((r) => {
        this.waiters.push(r);
        setTimeout(r, Math.min(left, 200));
      });
    }
  }
  waitPhase(phase: string, ms = 8000) {
    return this.until(() => this.state?.phase === phase, `phase=${phase}`, ms);
  }
  get me() {
    return this.state!.players.find((p) => p.id === this.playerId)!;
  }
}

/** 出題中の問題について、内蔵データから正解の添字／不正解の添字を引く。 */
export function correctChoice(s: State): number {
  const q = QUESTIONS.find((x) => x.text === s.question!.text)!;
  return s.question!.choices.indexOf(q.choices[q.answer]);
}
export const wrongChoice = (s: State) => (correctChoice(s) + 1) % 4;

export async function fillRoom(base: string, names: string[]) {
  const code = await createRoom(base);
  const clients: Client[] = [];
  for (const n of names) clients.push(await Client.open(base, code, n));
  return { code, clients };
}
