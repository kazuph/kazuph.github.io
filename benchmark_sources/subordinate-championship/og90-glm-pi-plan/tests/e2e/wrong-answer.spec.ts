// 不正解のテスト: 回答者が不正解を選ぶと、全員の画面で -5 点になり、その人のボタンがこの問題でもう押せない。
// 不正解になるまで（または結果や正解が出るまで）数ラウンドくり返して確実に確かめる。
import { test, expect } from "@playwright/test";
import {
  makeRoom,
  startGame,
  waitQuestionShown,
  buzzAll,
  findAnswerer,
  clickChoice,
  closeClients,
  resultVisible,
} from "./helpers";

test("回答者が不正解を選ぶと -5 点と失格、その問題ではもう押せない", async ({ browser }) => {
  test.setTimeout(300_000);
  const { clients } = await makeRoom(browser, 4);
  const pages = clients.map((c) => c.page);
  await startGame(clients[0]!.page);

  let verified = false;
  for (let guard = 0; guard < 14 && !verified; guard++) {
    if (await resultVisible(clients[0]!.page)) break;
    await waitQuestionShown(pages[0]!, 35000);
    await buzzAll(pages);
    const answerer = await findAnswerer(pages);
    if (!answerer) {
      await pages[0]!.waitForTimeout(400);
      continue;
    }
    const target = clients[answerer.index]!;
    await clickChoice(answerer.page, 0);

    // 不正解ならすぐ board が -5 に、正解なら正解表示が出る
    let outcome = "wait" as "wrong" | "correct" | "wait";
    await expect
      .poll(async () => {
        const board = (await pages[0]!.textContent(".board")) ?? "";
        const revealed = await pages[0]!.locator(".choice.correct").isVisible().catch(() => false);
        outcome = board.includes(target.name) && board.includes("-5点") ? "wrong" : revealed ? "correct" : "wait";
        return outcome;
      }, { timeout: 30000, intervals: [] })
      .not.toBe("wait");

    if (outcome === "wrong") {
      verified = true;
      await expect(target.page.locator("#buzz")).toBeDisabled();
      await expect(target.page.locator("#buzz")).toHaveText("済み");
      // 全員の画面でその人が -5 点
      for (const p of pages) {
        await expect(p.locator(".board")).toContainText(target.name);
        await expect(p.locator(".board")).toContainText("-5点");
      }
      // まだ同じ問題なので正解表示は出ていない
      expect(await pages[0]!.locator(".choice.correct").isVisible().catch(() => false)).toBe(false);
      // ほかの人はまだ押せる（早押し再開）
      const other = pages.find((p) => p !== target.page)!;
      await expect(other.locator("#buzz")).toBeEnabled({ timeout: 10000 });
    }
    // 正解（correct）のときは waitRoundGone で次の問題へ行くので、そのまま継続
  }
  expect(verified, "不正解ケースを観察できた").toBe(true);
  await closeClients(clients);
});
