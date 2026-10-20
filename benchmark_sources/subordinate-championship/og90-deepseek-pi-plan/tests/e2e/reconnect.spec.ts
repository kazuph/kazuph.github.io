import { expect, test } from "@playwright/test";
import { correctChoice, setupGame, waitForPhase } from "./helpers";

test.afterEach(async ({ browser }) => {
  for (const context of browser.contexts()) {
    await context.close();
  }
});

test("ゲーム中に再読み込みしても、同じ名前と点数のまま復帰する", async ({ browser }) => {
  test.setTimeout(90_000);
  const room = await setupGame(browser, ["あか", "あお", "きいろ"]);
  const clients = room.clients;
  const target = clients[1];

  await waitForPhase(clients, "question");
  await target.page.locator("#buzz-btn").click();
  await expect(target.page.locator("body")).toHaveAttribute("data-answerer", "true");
  const answer = await correctChoice(target.page);
  await target.page.locator(`.choice[data-choice="${answer}"]`).click();
  await expect(
    clients[0].page.locator(`.player-row[data-player-name="あお"] .player-score`),
  ).toHaveText("+10");

  // 次の問題に進んでから再読み込みする
  await waitForPhase(clients, "question");
  await expect(clients[0].page.locator("#q-number")).toHaveText("2");
  const questionTextBefore = await clients[0].page.locator("#question-text").textContent();

  await target.page.reload();

  // 入口には戻らず、同じ名前・同じ点数のままゲームに戻る
  await expect(target.page.locator("#screen-game")).toBeVisible({ timeout: 15_000 });
  await expect(target.page.locator("#screen-entry")).toBeHidden();
  await expect(
    target.page.locator(`.player-row[data-player-name="あお"]`),
  ).toHaveClass(/is-me/);
  await expect(
    target.page.locator(`.player-row[data-player-name="あお"] .player-you`),
  ).toHaveText("あなた");
  await expect(
    target.page.locator(`.player-row[data-player-name="あお"] .player-score`),
  ).toHaveText("+10");
  await expect(target.page.locator("#question-text")).toHaveText(questionTextBefore ?? "");

  // ほかの人の画面でも接続が戻っている
  for (const client of [clients[0], clients[2]]) {
    await expect(
      client.page.locator(`.player-row.is-offline[data-player-name="あお"]`),
    ).toHaveCount(0, { timeout: 15_000 });
  }
  // 復帰後も早押しできる
  await expect(target.page.locator("#buzz-btn")).toBeEnabled();
});

test("回線が一時的に切れても自動で再接続し、点数を保ったまま戻る", async ({ browser }) => {
  test.setTimeout(90_000);
  const room = await setupGame(browser, ["あか", "あお", "きいろ"]);
  const clients = room.clients;
  const target = clients[2];
  const watcher = clients[0];

  await waitForPhase(clients, "question");
  await target.page.locator("#buzz-btn").click();
  await expect(target.page.locator("body")).toHaveAttribute("data-answerer", "true");
  const answer = await correctChoice(target.page);
  await target.page.locator(`.choice[data-choice="${answer}"]`).click();
  await expect(
    watcher.page.locator(`.player-row[data-player-name="きいろ"] .player-score`),
  ).toHaveText("+10");
  await waitForPhase(clients, "question");
  await expect(watcher.page.locator("#q-number")).toHaveText("2");

  // 回線を切る
  const offlineAt = Date.now();
  await target.context.setOffline(true);
  await expect(target.page.locator("#reconnect-banner")).toBeVisible();

  // ほかの人の画面では切断中に見える
  await expect(
    watcher.page.locator(`.player-row.is-offline[data-player-name="きいろ"]`),
  ).toHaveCount(1, { timeout: 15_000 });
  await expect(
    watcher.page.locator(`.player-row[data-player-name="きいろ"] .player-note`),
  ).toContainText("接続が切れています");

  // 回線は5秒間切ったままにする
  const remaining = 5_000 - (Date.now() - offlineAt);
  if (remaining > 0) await target.page.waitForTimeout(remaining);
  const offlineMs = Date.now() - offlineAt;
  expect(offlineMs).toBeGreaterThanOrEqual(5_000);
  // 切れている間は再接続できず、画面には再接続中が出たまま
  await expect(target.page.locator("#reconnect-banner")).toBeVisible();

  // 回線を戻す
  await target.context.setOffline(false);
  await expect(target.page.locator("#reconnect-banner")).toBeHidden({ timeout: 20_000 });
  await expect(
    watcher.page.locator(`.player-row.is-offline[data-player-name="きいろ"]`),
  ).toHaveCount(0, { timeout: 20_000 });

  // 点数はそのまま
  await expect(
    target.page.locator(`.player-row[data-player-name="きいろ"] .player-score`),
  ).toHaveText("+10");
  await expect(target.page.locator("#screen-game")).toBeVisible();
});
