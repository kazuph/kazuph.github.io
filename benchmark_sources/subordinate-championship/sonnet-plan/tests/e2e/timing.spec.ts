import { expect, test } from "@playwright/test";
import { card, closeAll, openRoomOf4, scoreOf, startGame, waitQuestion } from "./helpers";

test("誰も答えないと実時間の20秒で正解が出る。回答権を得て何も選ばないと実時間の10秒で -5 点", async ({ browser }) => {
  test.setTimeout(120_000);
  const { players } = await openRoomOf4(browser, ["あや", "けん", "ゆい", "そら"]);
  const [ayaP] = players;
  await startGame(players);
  const startedAt = Date.now();
  await waitQuestion(players, 1);

  // 1問目: 誰も押さない → 20秒で reveal（正解が全員に見える）
  for (const p of players) await expect(p.page.locator("body")).toHaveAttribute("data-phase", "reveal", { timeout: 25_000 });
  const elapsed = Date.now() - startedAt;
  expect(elapsed).toBeGreaterThanOrEqual(19_000);
  expect(elapsed).toBeLessThan(23_000);
  for (const p of players) {
    await expect(p.page.locator(".choice.correct")).toHaveCount(1);
    await expect(p.page.getByTestId("status")).toContainText("正解者なし");
  }

  // 2問目: 押して何も選ばない → 10秒で -5 点・失格
  await waitQuestion(players, 2);
  await ayaP.page.getByTestId("buzz-btn").click();
  const buzzedAt = Date.now();
  await expect(ayaP.page.getByTestId("choice-0")).toBeEnabled();
  await expect(scoreOf(ayaP.page, "あや")).toHaveText("-5", { timeout: 14_000 });
  const waited = Date.now() - buzzedAt;
  expect(waited).toBeGreaterThanOrEqual(9_000);
  expect(waited).toBeLessThan(12_500);
  for (const p of players) await expect(scoreOf(p.page, "あや")).toHaveText("-5");
  await expect(card(players[1].page, "あや")).toContainText("回答済み");
  await expect(ayaP.page.getByTestId("buzz-btn")).toBeDisabled();
  await expect(players[1].page.getByTestId("buzz-btn")).toBeEnabled();
  await closeAll(players);
});
