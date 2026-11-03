import type { StateMessage, ServerMessage } from "../../src/shared/types";
import { SELF } from "cloudflare:test";

/** vitest-pool-workers 内で SELF.fetch の WebSocket をラップするテスト用クライアント */
export class TestWS {
  readonly ws: WebSocket;
  readonly queue: ServerMessage[] = [];
  private waiters: ((m: ServerMessage) => void)[] = [];
  /** このクライアントの playerId（最初の state で確定） */
  playerId: string | null = null;
  /** 受信した state の履歴（デバッグ・検証用） */
  readonly states: StateMessage[] = [];

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : String(ev.data)) as ServerMessage;
      this.queue.push(msg);
      if (msg.type === "state" && msg.you && this.playerId === null) {
        this.playerId = msg.you;
      }
      if (msg.type === "state") this.states.push(msg);
      const w = this.waiters.shift();
      if (w) w(msg);
    });
  }

  send(obj: unknown): void {
    this.ws.send(JSON.stringify(obj));
  }

  /** 次に届くメッセージ1件を待つ */
  next(timeoutMs = 5_000): Promise<ServerMessage> {
    const queued = this.queue.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout waiting for message")), timeoutMs);
      this.waiters.push((m) => {
        clearTimeout(timer);
        resolve(m);
      });
    });
  }

  /** 条件を満たす state が届くまで待つ */
  async waitForState(pred: (s: StateMessage) => boolean, timeoutMs = 10_000): Promise<StateMessage> {
    for (const m of this.queue) {
      if (m.type === "state" && pred(m)) return m;
    }
    this.queue.length = 0;
    const deadline = Date.now() + timeoutMs;
    let buf: ServerMessage | undefined;
    while (Date.now() < deadline) {
      buf = await Promise.race([
        this.next(deadline - Date.now()).catch(() => undefined),
      ]);
      if (!buf) break;
      if (buf.type === "state" && pred(buf)) return buf;
    }
    throw new Error("timeout waiting for state");
  }

  latest(): StateMessage | undefined {
    return this.states[this.states.length - 1];
  }

  close(): void {
    try {
      this.ws.close();
    } catch { /* noop */ }
  }
}

export async function connectWS(base: string, code: string, token: string): Promise<TestWS> {
  const res = await SELF.fetch(`${base}/ws?code=${code}&token=${token}`, {
    headers: { Upgrade: "websocket" },
  });
  if (res.status !== 101 || !res.webSocket) {
    throw new Error(`ws upgrade failed: ${res.status}`);
  }
  const c = new TestWS(res.webSocket);
  res.webSocket.accept();
  return c;
}

export interface Room {
  code: string;
  tokens: string[];
  clients: TestWS[];
  base: string;
}

/** fast モードで部屋を作り、count 人接続まで済ませた状態を作る */
export async function setupRoom(base: string, count: number, fast = true): Promise<Room> {
  const tokens: string[] = [];
  const clients: TestWS[] = [];
  const createRes = await SELF.fetch(`${base}/api/create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "ホスト", fast }),
  });
  if (!createRes.ok) throw new Error(`create failed: ${createRes.status}`);
  const created = (await createRes.json()) as { code: string; token: string };
  const code = created.code;
  tokens.push(created.token);

  for (let i = 1; i < count; i++) {
    const res = await SELF.fetch(`${base}/api/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `プレイヤー${i + 1}`, code }),
    });
    if (!res.ok) throw new Error(`join failed: ${res.status}`);
    tokens.push(((await res.json()) as { token: string }).token);
  }

  for (const token of tokens) {
    clients.push(await connectWS(base, code, token));
  }
  return { code, tokens, clients, base };
}
