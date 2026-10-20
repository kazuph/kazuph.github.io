/**
 * WebSocket を直に使った結合テスト。
 * 4つの接続から同じ瞬間に buzz を送り、サーバー側で1人だけが回答権を得ることを確かめる。
 * （ブラウザの画面操作ではなく、プロトコルそのものを確かめる）
 */
import { expect, test } from "@playwright/test";
import { QUESTIONS } from "../../src/questions";

interface PublicStateLike {
  t: string;
  phase: string;
  you: string;
  buzzedBy: string | null;
  questionNumber: number | null;
  question: { text: string; choices: string[] } | null;
  reveal: { answerIndex: number; answerText: string } | null;
  players: { id: string; name: string; score: number; hasAnswerRights: boolean }[];
}

interface Session {
  code: string;
  playerId: string;
  token: string;
  name: string;
}

function openSocket(session: Session): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `ws://localhost:8787/api/rooms/${session.code}/ws?token=${session.token}`,
    );
    const timer = setTimeout(() => reject(new Error("WebSocket がつながりません")), 10_000);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("WebSocket エラー"));
    });
  });
}

test("4つの接続から同時に届いた buzz でも、回答権を得るのは1人だけ", async ({
  request,
}) => {
  const hostResponse = await request.post("/api/rooms", { data: { name: "WS1" } });
  const host = (await hostResponse.json()) as Session;
  const players: Session[] = [host];
  for (const name of ["WS2", "WS3", "WS4"]) {
    const response = await request.post(`/api/rooms/${host.code}/join`, { data: { name } });
    players.push((await response.json()) as Session);
  }

  const sockets = await Promise.all(players.map(openSocket));
  const states: (PublicStateLike | null)[] = players.map(() => null);
  sockets.forEach((socket, index) => {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as PublicStateLike;
      if (message.t === "state") states[index] = message;
    });
  });

  try {
    sockets[0].send(JSON.stringify({ t: "start" }));
    await expect.poll(() => states[0]?.phase).toBe("question");

    // 4つを続けて送る（サーバーにはほぼ同時に届く）
    for (const socket of sockets) {
      socket.send(JSON.stringify({ t: "buzz", q: 0 }));
    }

    // 回答権を持っていると思う画面がちょうど1つ
    await expect
      .poll(() => states.filter((state) => state && state.buzzedBy === state.you).length)
      .toBe(1);

    // 4つの接続が見ている「回答中の人」が一致している
    const buzzedBy = states[0]?.buzzedBy ?? null;
    expect(buzzedBy).not.toBeNull();
    expect(states.every((state) => state?.buzzedBy === buzzedBy)).toBe(true);
    expect(states.every((state) => state?.phase === "answering")).toBe(true);

    // 出題中の状態に正解は入っていない
    expect(states[0]?.reveal).toBeNull();
    expect(JSON.stringify(states[0])).not.toContain("answerIndex");

    // 回答権を得た人が正解を選ぶと +10 点
    const winnerIndex = states.findIndex((state) => state && state.buzzedBy === state.you);
    const questionText = states[0]?.question?.text ?? "";
    const question = QUESTIONS.find((q) => q.text === questionText);
    expect(question, `内蔵の問題が見つかりません: ${questionText}`).toBeTruthy();
    sockets[winnerIndex].send(
      JSON.stringify({ t: "answer", q: 0, choice: question?.answer }),
    );

    await expect.poll(() => states[0]?.phase).toBe("reveal");
    expect(states[winnerIndex]?.reveal?.answerIndex).toBe(question?.answer);
    const winnerId = states[winnerIndex]?.you;
    const winner = states[0]?.players.find((player) => player.id === winnerId);
    expect(winner?.score).toBe(10);
  } finally {
    for (const socket of sockets) socket.close();
  }
});

test("回答権のない人からの answer は拒否される", async ({ request }) => {
  const hostResponse = await request.post("/api/rooms", { data: { name: "WS1" } });
  const host = (await hostResponse.json()) as Session;
  const otherResponse = await request.post(`/api/rooms/${host.code}/join`, {
    data: { name: "WS2" },
  });
  const other = (await otherResponse.json()) as Session;

  const sockets = await Promise.all([openSocket(host), openSocket(other)]);
  const errors: string[] = [];
  sockets[1].addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as { t: string; message?: string };
    if (message.t === "error" && message.message) errors.push(message.message);
  });

  try {
    sockets[0].send(JSON.stringify({ t: "start" }));
    sockets[0].send(JSON.stringify({ t: "buzz", q: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    // 回答権を持っていない人が answer を送る
    sockets[1].send(JSON.stringify({ t: "answer", q: 0, choice: 0 }));
    await expect.poll(() => errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("回答権");
  } finally {
    for (const socket of sockets) socket.close();
  }
});
