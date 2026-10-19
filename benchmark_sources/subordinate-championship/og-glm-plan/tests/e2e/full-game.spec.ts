import { expect, test } from "@playwright/test";
import { makePlayers, NAMES } from "./fixtures";
import {
  answerCorrectly,
  buzzAll,
  createRoom,
  findAnswerer,
  joinRoom,
  shot,
  startGame,
  waitQuestion,
} from "./helpers";

test.describe("10問の完走と記録", () => {
  test("10問を最後まで遊び、全員の画面に同じ最終順位が出る。各画面のスクリーンショットも残す", async ({ browser }, testInfo) => {
    test.setTimeout(300_000);
    const { contexts, pages } = await makePlayers(browser);
    try {
      const code = await createRoom(pages[0], NAMES[0]);
      for (let i = 1; i < 4; i++) await joinRoom(pages[i], NAMES[i], code);

      // ロビー（PC幅・スマホ幅）
      await shot(pages[0], testInfo, "lobby-pc.png");
      await shot(pages[3], testInfo, "lobby-mobile.png");

      await startGame(pages[0]);

      for (let round = 1; round <= 10; round++) {
        await Promise.all(pages.map((p) => waitQuestion(p, round)));
        if (round === 1) {
          await shot(pages[0], testInfo, "question-pc.png");
          await shot(pages[3], testInfo, "question-mobile.png");
          // スマホ幅では問題文と早押しボタンが画面内に見えている
          const vp = pages[3].viewportSize()!;
          for (const sel of ["#q-text", "#buzzer"]) {
            const box = await pages[3].locator(sel).boundingBox();
            expect(box, `${sel} がスマホ幅の画面内にない`).toBeTruthy();
            expect(box!.y).toBeGreaterThanOrEqual(0);
            expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);
            expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
          }
        }
        await buzzAll(pages);
        const answerer = await findAnswerer(pages);
        if (round === 1) {
          await shot(answerer, testInfo, "answering-pc.png");
          await shot(pages[3], testInfo, "answering-mobile.png");
        }
        await answerCorrectly(answerer);
        await Promise.all(pages.map((p) => expect(p.locator("#game-status")).toContainText("正解は")));
      }

      // 結果画面: 4つの画面に同じ最終順位が出る
      await Promise.all(pages.map((p) => expect(p.locator("#screen-result")).toBeVisible()));
      const rankings = [];
      for (const p of pages) {
        rankings.push((await p.locator("#ranking-list").innerText()).replace(/\s+/g, " ").trim());
      }
      expect(new Set(rankings).size).toBe(1);

      await shot(pages[0], testInfo, "result-pc.png");
      await shot(pages[3], testInfo, "result-mobile.png");
    } finally {
      for (const c of contexts) await c.close();
    }
  });
});
