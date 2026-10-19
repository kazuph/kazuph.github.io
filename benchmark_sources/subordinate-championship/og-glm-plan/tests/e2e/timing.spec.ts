import { expect, test } from "@playwright/test";
import { makePlayers, NAMES } from "./fixtures";
import { createRoom, joinRoom, startGame, waitQuestion } from "./helpers";

test.describe("実時間での締め切り", () => {
  test("誰も答えないと20秒で正解が表示され、押した人が答えないと10秒で-5点になる", async ({ browser }) => {
    test.setTimeout(120_000);
    const { contexts, pages } = await makePlayers(browser, 2);
    try {
      const code = await createRoom(pages[0], NAMES[0]);
      await joinRoom(pages[1], NAMES[1], code);
      await startGame(pages[0]);
      await Promise.all(pages.map((p) => waitQuestion(p, 1)));

      // 誰も押さない → 実時間の20秒で正解が表示される
      const q1Start = Date.now();
      await Promise.all(pages.map((p) => expect(p.locator("#game-status")).toContainText("正解は", { timeout: 26_000 })));
      const q1Elapsed = (Date.now() - q1Start) / 1000;
      expect(q1Elapsed).toBeGreaterThanOrEqual(19.5);
      expect(q1Elapsed).toBeLessThanOrEqual(25);

      // 第2問: 押すが何も選ばない → 実時間の10秒で -5点。その後、問題の20秒締め切りで正解が表示される
      await Promise.all(pages.map((p) => waitQuestion(p, 2)));
      const q2Start = Date.now();
      await pages[1].click("#buzzer");
      await expect(pages[1].locator("#game-status")).toContainText("あなたが回答中");
      // 押せる人が残っているので、同じ問題で回答権は続く（-5点になってもお仕置きは10秒時点）
      await expect(pages[1].locator("#players-list li", { hasText: NAMES[1] }).locator(".p-score")).toHaveText("-5", { timeout: 15_000 });
      const q2Elapsed = (Date.now() - q2Start) / 1000;
      expect(q2Elapsed).toBeGreaterThanOrEqual(9.5);
      expect(q2Elapsed).toBeLessThanOrEqual(13);
      await Promise.all(pages.map((p) => expect(p.locator("#game-status")).toContainText("正解は", { timeout: 20_000 })));
    } finally {
      for (const c of contexts) await c.close();
    }
  });
});
