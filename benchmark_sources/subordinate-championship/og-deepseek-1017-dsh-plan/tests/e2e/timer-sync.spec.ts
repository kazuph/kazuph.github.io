import { expect, test, type Page } from "@playwright/test";
import { buzzAll, closePlayers, findAnswerer, setupGame, startGame } from "./helpers";

async function remainingSeconds(page: Page): Promise<number> {
  const text = (await page.locator("#timer-text").textContent()) ?? "0";
  return Number.parseFloat(text);
}

test.describe("全員の画面の同期", () => {
  test("4つの画面で問題文・残り時間・回答中の人がそろって見える", async ({ browser }) => {
    const { players } = await setupGame(browser, ["Alice", "Bob", "Carol", "Dave"]);
    await startGame(players);

    // 問題文と問題番号がそろっている。
    const texts = await Promise.all(
      players.map((player) => player.page.locator("#question-text").textContent()),
    );
    for (const text of texts) {
      expect(text).toBe(texts[0]);
      expect(text).toBeTruthy();
    }

    // 残り時間の差は1秒以内。
    const times = await Promise.all(players.map((player) => remainingSeconds(player.page)));
    expect(Math.max(...times) - Math.min(...times)).toBeLessThanOrEqual(1);

    // 誰が回答中かが全員の画面に出る。
    await buzzAll(players);
    const answerer = await findAnswerer(players);
    for (const player of players) {
      await expect(player.page.locator(".score-item.answering")).toContainText(answerer.name);
      if (player.name === answerer.name) {
        await expect(player.page.locator("#game-status")).toContainText("あなたが回答中");
      } else {
        await expect(player.page.locator("#game-status")).toContainText(answerer.name);
      }
    }

    // 同じ点数が見えている。
    const scores = await Promise.all(
      players.map((player) => player.page.locator(".score-points").allTextContents()),
    );
    for (const list of scores) {
      expect(list).toEqual(scores[0]);
    }

    await closePlayers(players);
  });
});
