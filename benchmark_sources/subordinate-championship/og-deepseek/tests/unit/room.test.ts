import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { QUESTION_BANK } from "../../src/questions";
import type { PublicState } from "../../src/room";

interface ServerError {
  type: "error";
  code: string;
  message: string;
}

class TestClient {
  readonly states: PublicState[] = [];
  readonly errors: ServerError[] = [];

  constructor(
    readonly playerId: string,
    readonly name: string,
    readonly ws: WebSocket,
  ) {
    ws.addEventListener("message", (event: MessageEvent) => {
      const message = JSON.parse(String(event.data)) as
        | { type: "state"; state: PublicState }
        | ServerError
        | { type: string };
      if (message.type === "state") {
        this.states.push((message as { state: PublicState }).state);
      } else if (message.type === "error") {
        this.errors.push(message as ServerError);
      }
    });
  }

  send(payload: unknown): void {
    this.ws.send(JSON.stringify(payload));
  }

  close(): void {
    this.ws.close(1000, "test");
  }

  last(): PublicState | undefined {
    return this.states.at(-1);
  }

  async waitForState(
    predicate: (state: PublicState) => boolean,
    label = "state",
    timeoutMs = 5000,
  ): Promise<PublicState> {
    const started = Date.now();
    for (;;) {
      const state = this.last();
      if (state && predicate(state)) return state;
      if (Date.now() - started > timeoutMs) {
        throw new Error(
          `Timed out waiting for ${label}. Last state: ${JSON.stringify(
            state,
          )}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  async waitForError(code: string, timeoutMs = 2000): Promise<ServerError> {
    const started = Date.now();
    for (;;) {
      const error = this.errors.find((entry) => entry.code === code);
      if (error) return error;
      if (Date.now() - started > timeoutMs) {
        throw new Error(
          `Timed out waiting for error ${code}. Saw: ${JSON.stringify(
            this.errors,
          )}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

async function createRoom(): Promise<string> {
  const response = await SELF.fetch("https://example.com/api/rooms", {
    method: "POST",
  });
  expect(response.status).toBe(201);
  const body = (await response.json()) as { code: string };
  return body.code;
}

async function connect(
  code: string,
  name: string,
  playerId: string = crypto.randomUUID(),
): Promise<TestClient> {
  const response = await SELF.fetch(
    `https://example.com/api/rooms/${code}/ws?playerId=${encodeURIComponent(
      playerId,
    )}&name=${encodeURIComponent(name)}`,
    { headers: { Upgrade: "websocket" } },
  );
  expect(response.status).toBe(101);
  const ws = response.webSocket;
  if (!ws) throw new Error("WebSocket upgrade failed");
  ws.accept();
  const client = new TestClient(playerId, name, ws);
  await client.waitForState((state) => state.players.length >= 1, "welcome");
  return client;
}

function hostOf(clients: TestClient[]): TestClient {
  const lobby = clients[0].last();
  const host = clients.find((client) => client.playerId === lobby?.hostId);
  if (!host) throw new Error("host client not found");
  return host;
}

function answerIndexFor(state: PublicState): number {
  const question = QUESTION_BANK.find(
    (entry) => entry.prompt === state.question?.prompt,
  );
  if (!question) throw new Error(`Unknown question: ${state.question?.prompt}`);
  return question.answerIndex;
}

function player(state: PublicState, id: string) {
  const found = state.players.find((entry) => entry.id === id);
  if (!found) throw new Error(`Player ${id} not found`);
  return found;
}

describe("room lobby", () => {
  it("rejects a 5th player with a visible reason and keeps the room at 4", async () => {
    const code = await createRoom();
    const clients: TestClient[] = [];
    for (const name of ["A", "B", "C", "D"]) {
      clients.push(await connect(code, name));
    }

    const response = await SELF.fetch(
      `https://example.com/api/rooms/${code}/ws?playerId=${crypto.randomUUID()}&name=E`,
      { headers: { Upgrade: "websocket" } },
    );
    expect(response.status).toBe(101);
    const ws = response.webSocket;
    if (!ws) throw new Error("expected websocket");
    ws.accept();
    const messages: Array<{ type: string; code?: string; message?: string }> =
      [];
    ws.addEventListener("message", (event: MessageEvent) => {
      messages.push(JSON.parse(String(event.data)));
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const rejection = messages.find(
      (message) => message.type === "error" && message.code === "room-full",
    );
    expect(rejection?.message).toContain("満員");

    const lobby = clients[0].last();
    expect(lobby?.players).toHaveLength(4);
    expect(lobby?.players.some((entry) => entry.name === "E")).toBe(false);
  });

  it("only lets the host start, and only with 2+ players", async () => {
    const code = await createRoom();
    const host = await connect(code, "Host");
    host.send({ type: "start" });
    expect((await host.waitForError("too-few-players")).message).toContain(
      "2人以上",
    );

    const guest = await connect(code, "Guest");
    guest.send({ type: "start" });
    expect((await guest.waitForError("not-host")).message).toContain(
      "ホスト",
    );

    host.send({ type: "start" });
    const question = await host.waitForState(
      (state) => state.phase === "question",
      "game start",
    );
    expect(question.round).toBe(1);
    expect(question.question?.choices).toHaveLength(4);
    expect(question.correctIndex).toBeNull();
  });
});

describe("authoritative buzzing", () => {
  it("gives the answer right to exactly one player when four buzz at once", async () => {
    const code = await createRoom();
    const clients = await Promise.all(
      ["A", "B", "C", "D"].map((name) => connect(code, name)),
    );
    hostOf(clients).send({ type: "start" });
    await clients[0].waitForState((state) => state.phase === "question");

    for (const client of clients) client.send({ type: "buzz" });
    const buzzed = await clients[0].waitForState(
      (state) => state.buzzedBy !== null,
      "one buzzer",
    );

    const winners = clients.filter(
      (client) => client.playerId === buzzed.buzzedBy,
    );
    expect(winners).toHaveLength(1);
    expect(buzzed.answerDeadline).not.toBeNull();

    for (const client of clients) {
      const seen = await client.waitForState(
        (state) => state.buzzedBy === buzzed.buzzedBy,
      );
      expect(seen.buzzedBy).toBe(buzzed.buzzedBy);
    }

    const loser = clients.find((client) => client.playerId !== buzzed.buzzedBy);
    if (!loser) throw new Error("no loser");
    loser.send({ type: "answer", choice: 0 });
    expect((await loser.waitForError("no-answer-right")).message).toContain(
      "回答権",
    );

    const after = clients[0].last();
    expect(after?.buzzedBy).toBe(buzzed.buzzedBy);
    expect(after?.players.every((entry) => entry.score === 0)).toBe(true);
  });

  it("scores +10 for a correct answer and reveals the answer", async () => {
    const code = await createRoom();
    const clients = await Promise.all([
      connect(code, "A"),
      connect(code, "B"),
      connect(code, "C"),
    ]);
    hostOf(clients).send({ type: "start" });
    const question = await clients[0].waitForState(
      (state) => state.phase === "question",
    );

    clients[0].send({ type: "buzz" });
    await clients[0].waitForState((state) => state.buzzedBy === clients[0].playerId);
    clients[0].send({ type: "answer", choice: answerIndexFor(question) });

    const reveal = await clients[0].waitForState(
      (state) => state.phase === "reveal",
    );
    expect(player(reveal, clients[0].playerId).score).toBe(10);
    expect(reveal.correctIndex).toBe(answerIndexFor(question));
    expect(reveal.result?.correct).toBe(true);

    for (const client of clients) {
      const seen = await client.waitForState(
        (state) => state.phase === "reveal" && state.correctIndex !== null,
      );
      expect(player(seen, clients[0].playerId).score).toBe(10);
    }
  });

  it("scores -5, locks the wrong player out, then resumes buzzing", async () => {
    const code = await createRoom();
    const clients = await Promise.all([
      connect(code, "A"),
      connect(code, "B"),
      connect(code, "C"),
    ]);
    hostOf(clients).send({ type: "start" });
    const question = await clients[0].waitForState(
      (state) => state.phase === "question",
    );
    const correct = answerIndexFor(question);
    const wrong = (correct + 1) % 4;

    clients[0].send({ type: "buzz" });
    await clients[0].waitForState(
      (state) => state.buzzedBy === clients[0].playerId,
    );
    clients[0].send({ type: "answer", choice: wrong });

    const resumed = await clients[0].waitForState(
      (state) =>
        state.phase === "question" &&
        state.buzzedBy === null &&
        player(state, clients[0].playerId).score === -5,
    );
    expect(player(resumed, clients[0].playerId).lockedOut).toBe(true);
    expect(player(resumed, clients[1].playerId).lockedOut).toBe(false);

    clients[1].send({ type: "buzz" });
    await clients[1].waitForState(
      (state) => state.buzzedBy === clients[1].playerId,
    );
    clients[1].send({ type: "answer", choice: correct });

    const reveal = await clients[1].waitForState(
      (state) => state.phase === "reveal",
    );
    expect(player(reveal, clients[0].playerId).score).toBe(-5);
    expect(player(reveal, clients[1].playerId).score).toBe(10);
    expect(player(reveal, clients[0].playerId).lockedOut).toBe(true);
  });

  it("reveals immediately when every player is locked out", async () => {
    const code = await createRoom();
    const clients = await Promise.all([
      connect(code, "A"),
      connect(code, "B"),
    ]);
    hostOf(clients).send({ type: "start" });
    const question = await clients[0].waitForState(
      (state) => state.phase === "question",
    );
    const correct = answerIndexFor(question);
    const wrong = (correct + 1) % 4;

    for (const client of clients) {
      client.send({ type: "buzz" });
      await client.waitForState(
        (state) => state.buzzedBy === client.playerId,
        `${client.name} buzz`,
      );
      client.send({ type: "answer", choice: wrong });
      await client.waitForState(
        (state) =>
          state.phase === "reveal" ||
          (state.phase === "question" && state.buzzedBy === null),
      );
    }

    const reveal = await clients[0].waitForState(
      (state) => state.phase === "reveal",
    );
    expect(reveal.correctIndex).toBe(correct);
    expect(player(reveal, clients[0].playerId).lockedOut).toBe(true);
    expect(player(reveal, clients[1].playerId).lockedOut).toBe(true);
  });

  it("charges -5 and reopens buzzing when the answer window times out", async () => {
    const code = await createRoom();
    const clients = await Promise.all([
      connect(code, "A"),
      connect(code, "B"),
      connect(code, "C"),
    ]);
    hostOf(clients).send({ type: "start" });
    await clients[0].waitForState((state) => state.phase === "question");
    clients[0].send({ type: "buzz" });
    await clients[0].waitForState(
      (state) => state.buzzedBy === clients[0].playerId,
    );

    const resumed = await clients[1].waitForState(
      (state) =>
        state.phase === "question" &&
        state.buzzedBy === null &&
        player(state, clients[0].playerId).score === -5,
      "answer timeout",
      3000,
    );
    expect(resumed.result?.reason).toBe("timeout");
    expect(player(resumed, clients[0].playerId).lockedOut).toBe(true);

    clients[1].send({ type: "buzz" });
    const next = await clients[1].waitForState(
      (state) => state.buzzedBy === clients[1].playerId,
    );
    expect(next.answerDeadline).not.toBeNull();
  });

  it("reveals the correct answer when the 20 second question timer expires", async () => {
    const code = await createRoom();
    const clients = await Promise.all([
      connect(code, "A"),
      connect(code, "B"),
    ]);
    hostOf(clients).send({ type: "start" });
    const question = await clients[0].waitForState(
      (state) => state.phase === "question",
    );

    const reveal = await clients[0].waitForState(
      (state) => state.phase === "reveal",
      "question timeout",
      4000,
    );
    expect(reveal.correctIndex).toBe(answerIndexFor(question));
    expect(reveal.result).toBeNull();
    expect(reveal.buzzedBy).toBeNull();
  });
});

describe("reconnection", () => {
  it("restores the same player and score after a disconnect", async () => {
    const code = await createRoom();
    const a = await connect(code, "Alice");
    const b = await connect(code, "Bob");
    a.send({ type: "start" });
    const question = await a.waitForState((state) => state.phase === "question");

    a.send({ type: "buzz" });
    await a.waitForState((state) => state.buzzedBy === a.playerId);
    a.send({ type: "answer", choice: answerIndexFor(question) });
    await a.waitForState(
      (state) =>
        state.phase === "reveal" && player(state, a.playerId).score === 10,
    );

    const playerId = a.playerId;
    a.close();
    await b.waitForState(
      (state) => player(state, playerId).connected === false,
      "disconnect",
    );

    const reconnected = await connect(code, "Alice", playerId);
    const restored = await reconnected.waitForState(
      (state) =>
        player(state, playerId).connected === true &&
        player(state, playerId).score === 10,
      "reconnect",
    );
    expect(restored.players).toHaveLength(2);
    expect(restored.hostId).toBe(playerId);

    b.send({ type: "buzz" });
    const buzzState = await reconnected.waitForState(
      (state) => state.phase === "reveal" || state.buzzedBy === b.playerId,
    );
    expect(buzzState.players).toHaveLength(2);
  });
});

describe("full game", () => {
  it("plays 10 questions and shows a final ranking to all four players", async () => {
    const code = await createRoom();
    const clients = await Promise.all(
      ["A", "B", "C", "D"].map((name) => connect(code, name)),
    );
    hostOf(clients).send({ type: "start" });

    for (let round = 1; round <= 10; round += 1) {
      const state = await clients[0].waitForState(
        (entry) => entry.phase === "question" && entry.round === round,
        `round ${round}`,
        6000,
      );
      const buzzer = clients[(round - 1) % clients.length];
      buzzer.send({ type: "buzz" });
      await buzzer.waitForState(
        (entry) => entry.buzzedBy === buzzer.playerId,
        `round ${round} buzz`,
      );
      buzzer.send({ type: "answer", choice: answerIndexFor(state) });

      if (round < 10) {
        await clients[0].waitForState(
          (entry) => entry.phase === "reveal" && entry.round === round,
          `round ${round} reveal`,
        );
      }
    }

    const finished = await clients[0].waitForState(
      (state) => state.phase === "finished",
      "finished",
      6000,
    );
    expect(finished.ranking).not.toBeNull();
    expect(finished.ranking).toHaveLength(4);
    const scores = finished.ranking!.map((row) => row.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(finished.ranking![0].rank).toBe(1);
    expect(scores.reduce((sum, score) => sum + score, 0)).toBe(100);

    for (const client of clients) {
      const seen = await client.waitForState(
        (state) => state.phase === "finished",
      );
      expect(seen.ranking).toEqual(finished.ranking);
    }
  });
});
