import { expect, test } from "@playwright/test";
import {
  answerChoice,
  buzzAll,
  closePlayers,
  correctIndexForQuestionText,
  findAnswerer,
  setupGame,
  startGame,
  waitForPhase,
} from "./helpers";

test.describe("不正解のとき", () => {
  test("不正解の人は全員の画面で -5 点になり、その問題ではもう押せない", async ({ browser }) => {
    const { players } = await setupGame(browser, ["Alice", "Bob", "Carol", "Dave"]);
    await startGame(players);

    await buzzAll(players);
    const answerer = await findAnswerer(players);
    const questionText = (await answerer.page.locator("#question-text").textContent()) ?? "";
    const correct = correctIndexForQuestionText(questionText);
    const wrong = (correct + 1) % 4;
    await answerChoice(answerer, wrong);

    // 残りの人がいるので、問題フェーズに戻る。
    for (const player of players) {
      await waitForPhase(player.page, "question");
    }

    for (const player of players) {
      const card = player.page.locator(".score-item", { hasText: answerer.name });
      await expect(card.locator(".score-points")).toHaveText("-5点");
      await expect(card.locator(".chip.locked")).toBeVisible();
    }

    // 本人の画面では早押しボタンが無効になっている。
    await expect(answerer.page.locator("#buzz-btn")).toBeDisabled();
    await expect(answerer.page.locator("#game-status")).toHaveText("この問題ではもう押せません");

    await closePlayers(players);
  });
});
