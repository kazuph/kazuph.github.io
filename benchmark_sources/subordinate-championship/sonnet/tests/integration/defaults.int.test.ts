import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fillRoom, startServer } from "./harness";

// 時間の上書きなし（本番と同じ 20秒 / 10秒）で、仕様どおりの長さで動くことを確かめる。
let base = "";
let stop: () => Promise<void>;
beforeAll(async () => {
  ({ base, stop } = await startServer(null));
}, 120_000);
afterAll(async () => {
  await stop?.();
});

describe("既定の制限時間（項目6・8）", () => {
  it("誰も押さなければ出題から20秒で正解が表示される／回答権を得て10秒選ばなければ不正解になる", async () => {
    const [noBuzz, slow] = await Promise.all([fillRoom(base, ["あ", "い"]), fillRoom(base, ["う", "え"])]);
    noBuzz.clients[0].send({ t: "start" });
    slow.clients[0].send({ t: "start" });
    await Promise.all([noBuzz.clients[0].waitPhase("question"), slow.clients[0].waitPhase("question")]);
    const t0 = Date.now();
    slow.clients[1].send({ t: "buzz" });
    await slow.clients[1].until(() => slow.clients[1].state!.answererId === slow.clients[1].playerId, "回答権");
    const tBuzz = Date.now();
    await slow.clients[0].until(() => slow.clients[0].state!.players[1].locked, "10秒で時間切れ", 13_000);
    const answerMs = Date.now() - tBuzz;
    expect(answerMs).toBeGreaterThanOrEqual(9_800);
    expect(answerMs).toBeLessThan(11_500);
    expect(slow.clients[0].state!.players[1].score).toBe(-5);
    await noBuzz.clients[0].waitPhase("reveal", 23_000);
    const revealMs = Date.now() - t0;
    expect(revealMs).toBeGreaterThanOrEqual(19_800);
    expect(revealMs).toBeLessThan(21_500);
    expect(noBuzz.clients[1].state!.reveal!.outcome).toBe("timeout");
    [...noBuzz.clients, ...slow.clients].forEach((c) => c.close());
  }, 60_000);
});
