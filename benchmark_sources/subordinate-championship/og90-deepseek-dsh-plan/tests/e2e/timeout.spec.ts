import { expect, test } from "@playwright/test";
import {
  closePlayers,
  createRoom,
  gamePlayerRow,
  joinRoom,
  newDesktopPlayer,
  startGame,
  waitForBuzzing,
  waitForNextQuestion,
  waitForReveal,
  type Player,
} from "./helpers";

test("誰も押さないと実時間20秒で正解表示、押して放置すると10秒で-5点", async ({ browser }) => {
  test.slow();
  const players: Player[] = [];
  try {
    const host = await newDesktopPlayer(browser, "あかね");
    players.push(host);
    const code = await createRoom(host);

    const other = await newDesktopPlayer(browser, "ばんり");
    players.push(other);
    await joinRoom(other, code);

    await startGame(players, host);

    // 第1問: 誰も押さない → 出題から実時間20秒で正解表示
    const questionShownAt = Date.now();
    await waitForReveal(players);
    const revealElapsed = Date.now() - questionShownAt;
    expect(revealElapsed).toBeGreaterThanOrEqual(19_000);
    expect(revealElapsed).toBeLessThan(27_000);

    // 正解表示は3秒 → 第2問
    await waitForNextQuestion(players);
    await waitForBuzzing(players);

    // 第2問: ばんりが押して何も選ばない → 実時間10秒で-5点
    const buzzAt = Date.now();
    await other.page.locator("#buzz-button").click();
    await expect(gamePlayerRow(host.page, "ばんり").locator(".gp-score")).toHaveText("-5点", {
      timeout: 15_000,
    });
    const answerElapsed = Date.now() - buzzAt;
    expect(answerElapsed).toBeGreaterThanOrEqual(9_500);
    expect(answerElapsed).toBeLessThan(14_000);

    // 失格の表示が全画面に出る
    await expect(gamePlayerRow(host.page, "ばんり")).toHaveClass(/eliminated/);
    await expect(gamePlayerRow(other.page, "ばんり")).toHaveClass(/eliminated/);
  } finally {
    await closePlayers(players);
  }
});
