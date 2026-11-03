// 定員テスト: 4人まで。5人目は「満員」と出る。
import { test, expect } from "@playwright/test";
import { openHost, openJoiner, openJoinerExpectError, closeClients, type Client } from "./helpers";

test("5人目は入れず、理由が画面に出る", async ({ browser }) => {
  const host = await openHost(browser, "ホスト");
  const clients: Client[] = [host];
  for (let i = 1; i <= 3; i++) {
    const c = await openJoiner(browser, host.code!, `参加者${i}`);
    clients.push(c);
  }
  // 4人入る
  for (const c of clients) {
    await expect(c.page.locator("#screen-lobby")).toBeVisible();
    await expect(c.page.locator("#lobby-players")).toContainText(c.name);
  }
  // 5人目は拒否される
  const fifth = await openJoinerExpectError(browser, host.code!, "参加者4");
  await expect(fifth.page.locator("#entry-error")).toBeVisible();
  await expect(fifth.page.locator("#entry-error")).toContainText("満員です（4人まで）");
  await closeClients(clients);
  await fifth.ctx.close();
});

test("開始はホストだけ（ほかの人に開始ボタンは出ない）。1人では開始できない", async ({ browser }) => {
  const host = await openHost(browser, "ホスト");
  await expect(host.page.locator("#start-btn")).toBeDisabled();
  const p2 = await openJoiner(browser, host.code!, "参加者1");
  await expect(p2.page.locator("#start-btn")).toBeHidden();
  await expect(host.page.locator("#start-btn")).toBeEnabled();
  await closeClients([host, p2]);
});
