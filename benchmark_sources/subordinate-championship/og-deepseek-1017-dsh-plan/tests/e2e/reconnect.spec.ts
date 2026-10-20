import { expect, test } from "@playwright/test";
import {
  answerCorrectly,
  buzzAll,
  closePlayers,
  findAnswerer,
  setupGame,
  startGame,
  waitForPhase,
} from "./helpers";

test.describe("再接続と復帰", () => {
  test("再読み込みしても同じ名前・同じ点数で戻ってくる", async ({ browser }) => {
    const { players } = await setupGame(browser, ["Alice", "Bob", "Carol"]);
    await startGame(players);

    // だれか1人が正解して +10 点を取る。
    await buzzAll(players);
    const answerer = await findAnswerer(players);
    await answerCorrectly(answerer);
    await waitForPhase(answerer.page, "reveal");

    const name = answerer.name;
    await answerer.page.reload();

    // リロード後も自分の点数カードが同じ名前・同じ点数で出る。
    const myCard = answerer.page.locator(".score-item.is-me");
    await expect(myCard).toContainText(name);
    await expect(myCard.locator(".score-points")).toHaveText("10点");
    await expect(answerer.page.locator("body")).toHaveAttribute("data-you", /.+/);

    await closePlayers(players);
  });

  test("回線が5秒切れても自動で再接続し、ほかの画面の「接続が切れています」が消える", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const { players } = await setupGame(browser, ["Alice", "Bob", "Carol"]);
    await startGame(players);

    const target = players[2]; // Carol
    const watchers = [players[0], players[1]];
    const targetCard = (watcher: (typeof watchers)[number]) =>
      watcher.page.locator(".score-item", { hasText: "Carol" });

    await target.context.setOffline(true);
    for (const watcher of watchers) {
      await expect(targetCard(watcher).locator(".chip.offline")).toBeVisible();
    }

    await target.page.waitForTimeout(5_000);
    await target.context.setOffline(false);

    for (const watcher of watchers) {
      await expect(targetCard(watcher).locator(".chip.offline")).toBeHidden();
    }
    // 本人の画面も元に戻っている。
    await expect(target.page.locator("#connection-badge")).toBeHidden();

    await closePlayers(players);
  });
});
