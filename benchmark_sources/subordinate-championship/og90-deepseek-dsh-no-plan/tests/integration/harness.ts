import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TestServer {
  baseUrl: string;
  stop: () => Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      if (typeof address === "object" && address) {
        const port = address.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("ポートを取得できません")));
      }
    });
  });
}

/**
 * 本物の `wrangler dev`（Cloudflare 公式ローカル実行）を一時ポートで起動する。
 * テスト内だけの一時利用なので、常駐させない。
 */
export async function startTestServer(): Promise<TestServer> {
  const port = await getFreePort();
  const persistDir = mkdtempSync(join(tmpdir(), "quiz-persist-"));

  const child = spawn(
    "npx",
    ["wrangler", "dev", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", persistDir],
    {
      cwd: process.cwd(),
      env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );

  let log = "";
  child.stdout?.on("data", (d) => (log += String(d)));
  child.stderr?.on("data", (d) => (log += String(d)));

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`wrangler dev が起動前に終了しました (code=${child.exitCode})\n${log}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        return {
          baseUrl,
          stop: async () => {
            await killTree(child);
            rmSync(persistDir, { recursive: true, force: true });
          },
        };
      }
    } catch {
      /* まだ起動中 */
    }
    await sleep(300);
  }
  await killTree(child);
  throw new Error(`wrangler dev が起動しませんでした\n${log}`);
}

async function killTree(child: ChildProcess): Promise<void> {
  if (child.pid == null) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  await sleep(600);
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    /* 既に終了 */
  }
}

export interface Credentials {
  roomCode: string;
  playerId: string;
  token: string;
}

async function postJson<T = any>(url: string, body: unknown): Promise<{ status: number; body: T }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, body: parsed };
}

export async function createRoom(baseUrl: string, name: string): Promise<Credentials> {
  const { status, body } = await postJson(`${baseUrl}/api/rooms`, { name });
  if (status !== 201) throw new Error(`部屋作成に失敗: ${status} ${JSON.stringify(body)}`);
  return body as Credentials;
}

export async function joinRoom(
  baseUrl: string,
  code: string,
  name: string,
): Promise<{ status: number; body: any }> {
  return postJson(`${baseUrl}/api/rooms/${code}/join`, { name });
}

export async function roomInfo(baseUrl: string, code: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/rooms/${code}`);
  return { status: res.status, body: await res.json().catch(() => null) };
}

/**
 * テスト用の WebSocket クライアント。届いた全メッセージを保持し、
 * 条件に合うメッセージを待てる。
 */
export class QuizClient {
  readonly messages: any[] = [];
  lastState: any = null;
  creds!: Credentials;
  private ws!: WebSocket;
  private waiters: Array<{ pred: (m: any) => boolean; resolve: (m: any) => void }> = [];

  static async connect(baseUrl: string, creds: Credentials): Promise<QuizClient> {
    const client = new QuizClient();
    client.creds = creds;
    const url = `${baseUrl.replace(/^http/, "ws")}/api/rooms/${creds.roomCode}/ws?playerId=${creds.playerId}&token=${creds.token}`;
    client.ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("WebSocket 接続がタイムアウトしました")), 15_000);
      client.ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      });
      client.ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("WebSocket 接続に失敗しました"));
      });
    });
    client.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.type === "state") client.lastState = msg.state;
      client.messages.push(msg);
      client.waiters = client.waiters.filter((w) => {
        if (w.pred(msg)) {
          w.resolve(msg);
          return false;
        }
        return true;
      });
    });
    return client;
  }

  get playerId(): string {
    return this.creds.playerId;
  }

  send(message: unknown): void {
    this.ws.send(JSON.stringify(message));
  }

  waitFor(pred: (m: any) => boolean, timeout = 12_000, label = "message"): Promise<any> {
    const existing = this.messages.find(pred);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.resolve !== wrapped);
        reject(new Error(`タイムアウト: ${label}`));
      }, timeout);
      const wrapped = (m: any) => {
        clearTimeout(timer);
        resolve(m);
      };
      this.waiters.push({ pred, resolve: wrapped });
    });
  }

  waitForState(pred: (s: any) => boolean, timeout = 12_000, label = "state"): Promise<any> {
    return this.waitFor((m) => m.type === "state" && pred(m.state), timeout, label).then((m) => m.state);
  }

  allEvents(): any[] {
    return this.messages.filter((m) => m.type === "events").flatMap((m) => m.events);
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

export { sleep };
