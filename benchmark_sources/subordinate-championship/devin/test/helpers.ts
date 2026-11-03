import { SELF } from "cloudflare:test";
import type { ServerMessage, StateMessage } from "../src/protocol";

export interface Session {
  roomCode: string;
  playerId: string;
  token: string;
}

export async function createRoom(name = "host"): Promise<Session> {
  const res = await SELF.fetch("http://test/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json()) as Session & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "create failed");
  return data;
}

export async function joinRoom(
  code: string,
  name: string
): Promise<{ status: number; data: Session & { error?: string } }> {
  const res = await SELF.fetch(`http://test/api/rooms/${code}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json()) as Session & { error?: string };
  return { status: res.status, data };
}

export interface Client {
  ws: WebSocket;
  messages: ServerMessage[];
  states(): StateMessage[];
  last(): StateMessage | undefined;
  waitFor(pred: (m: StateMessage) => boolean, timeoutMs?: number): Promise<StateMessage>;
  waitAny(pred: (m: ServerMessage) => boolean, timeoutMs?: number): Promise<ServerMessage>;
  send(m: unknown): void;
  close(): void;
}

export async function connectWs(s: Session): Promise<Client> {
  const res = await SELF.fetch(
    `http://test/ws?room=${s.roomCode}&playerId=${s.playerId}&token=${s.token}`,
    { headers: { Upgrade: "websocket" } }
  );
  if (!res.webSocket) throw new Error(`ws upgrade failed: ${res.status}`);
  const ws = res.webSocket;
  ws.accept();
  const messages: ServerMessage[] = [];
  ws.addEventListener("message", (e) => {
    try {
      messages.push(JSON.parse(String(e.data)) as ServerMessage);
    } catch {
      /* ignore */
    }
  });

  const client: Client = {
    ws,
    messages,
    states: () => messages.filter((m): m is StateMessage => m.t === "state"),
    last: () =>
      messages.filter((m): m is StateMessage => m.t === "state").at(-1),
    async waitFor(pred, timeoutMs = 8000) {
      const start = Date.now();
      const from = messages.length;
      for (;;) {
        const hit = client
          .states()
          .filter((m) => messages.indexOf(m) >= from)
          .find(pred);
        if (hit) return hit;
        if (Date.now() - start > timeoutMs)
          throw new Error(
            `waitFor timeout; last=${JSON.stringify(client.last())}`
          );
        await new Promise((r) => setTimeout(r, 25));
      }
    },
    async waitAny(pred, timeoutMs = 8000) {
      const start = Date.now();
      const from = messages.length;
      for (;;) {
        const hit = messages.slice(from).find(pred);
        if (hit) return hit;
        if (Date.now() - start > timeoutMs)
          throw new Error(`waitAny timeout; msgs=${JSON.stringify(messages)}`);
        await new Promise((r) => setTimeout(r, 25));
      }
    },
    send: (m) => ws.send(JSON.stringify(m)),
    close: () => ws.close(),
  };
  // wait until the first message (state or error) arrives
  await client.waitAny(() => true);
  return client;
}

export async function connectBadWs(
  s: Session
): Promise<{ client: Client; closed: Promise<number> }> {
  const client = await connectWs(s);
  const closed = new Promise<number>((resolve) => {
    client.ws.addEventListener("close", (e) => resolve(e.code));
  });
  return { client, closed };
}

export async function startGame(clients: Client[], host: Client) {
  host.send({ t: "start" });
  await Promise.all(
    clients.map((c) =>
      c.waitFor((m) => m.phase === "question" && !!m.question)
    )
  );
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
