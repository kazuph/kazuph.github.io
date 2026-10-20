import { expect, test } from "@playwright/test";
import {
  answerCorrectly,
  buzzAll,
  closePlayers,
  findAnswerer,
  setupGame,
  startGame,
  waitForQuestionNumber,
} from "./helpers";

test.describe("同時押し", () => {
  test("4人が同時に押しても回答権は1人だけ（3問くり返す）", async ({ browser }) => {
    const { players } = await setupGame(browser, ["Alice", "Bob", "Carol", "Dave"]);
    await startGame(players);

    for (let questionNumber = 1; questionNumber <= 3; questionNumber += 1) {
      await buzzAll(players);
      // findAnswerer のなかで「4択が有効な画面がちょうど1つ」を確かめている。
      const answerer = await findAnswerer(players);
      await answerCorrectly(answerer);

      if (questionNumber < 3) {
        for (const player of players) {
          await waitForQuestionNumber(player.page, questionNumber + 1);
        }
      }
    }

    // 3問とも正解したので、4人の合計点は 10 × 3 = 30 点になる。
    // 最後の回答がサーバーに反映されるまで少し待つ。
    await expect
      .poll(async () => {
        const scores = await players[0].page.locator(".score-points").allTextContents();
        return scores.reduce((sum, text) => sum + Number.parseInt(text, 10), 0);
      })
      .toBe(30);
    await closePlayers(players);
  });
});
