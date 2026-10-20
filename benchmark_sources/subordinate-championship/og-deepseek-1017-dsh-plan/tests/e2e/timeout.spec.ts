import { expect, test } from "@playwright/test";
import { buzzAll, closePlayers, findAnswerer, setupGame, startGame, waitForPhase } from "./helpers";

test.describe("時間切れ", () => {
  test("だれも答えないと、実時間の20秒で正解が表示される", async ({ browser }) => {
    test.setTimeout(90_000);
    const { players } = await setupGame(browser, ["Alice", "Bob"]);
    await startGame(players);

    // 出題中は正解を表示しない。
    await expect(players[0].page.locator(".choice.correct")).toHaveCount(0);
    await expect(players[0].page.locator("#game-status")).not.toContainText("正解は");

    // 何も押さずに待つと、20秒で正解発表になる。
    await expect(players[0].page.locator("body")).toHaveAttribute("data-phase", "reveal", {
      timeout: 30_000,
    });
    await expect(players[1].page.locator("body")).toHaveAttribute("data-phase", "reveal", {
      timeout: 30_000,
    });
    await expect(players[0].page.locator(".choice.correct")).toHaveCount(1);
    await expect(players[0].page.locator("#game-status")).toContainText("正解は");

    await closePlayers(players);
  });

  test("回答権を得て何も選ばないと、実時間の10秒で -5 点になる", async ({ browser }) => {
    test.setTimeout(90_000);
    const { players } = await setupGame(browser, ["Alice", "Bob", "Carol"]);
    await startGame(players);

    await buzzAll(players);
    const answerer = await findAnswerer(players);

    // 何も選ばずに待つと、10秒で時間切れになり問題フェーズに戻る。
    for (const player of players) {
      await waitForPhase(player.page, "question");
    }
    for (const player of players) {
      const card = player.page.locator(".score-item", { hasText: answerer.name });
      await expect(card.locator(".score-points")).toHaveText("-5点");
    }
    await expect(answerer.page.locator("#buzz-btn")).toBeDisabled();

    await closePlayers(players);
  });
});
