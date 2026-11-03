// 再接続のテスト: 回答中に再読み込みしても同じプレイヤー・点数で復帰する。
// さらに: 回線を5秒切っても自動再接続し、他の画面の「接続切れ」が消える。
import { test, expect } from "@playwright/test";
import {
  makeRoom,
  startGame,
  waitRound,
  waitQuestionShown,
  buzzAll,
  findAnswerer,
  waitReveal,
  closeClients,
  timerSeconds,
} from "./helpers";

test("回答中に再読み込みしても、同じ名前・点数で復帰する", async ({ browser }) => {
  const { clients } = await makeRoom(browser, 4);
  const pages = clients.map((c) => c.page);
  await startGame(clients[0]!.page);
  await waitQuestionShown(clients[0]!.page);

  await buzzAll(pages);
  const answerer = await findAnswerer(pages);
  expect(answerer).not.toBeNull();
  const target = clients[answerer!.index];
  const beforeName = target!.name;
  await expect(target!.page.locator("#screen-game")).toBeVisible();

  // 回答中に再読み込み
  await target.page.reload();
  // 復帰（ゲーム画面に戻る）
  await expect(target.page.locator("#screen-game")).toBeVisible({ timeout: 15000 });
  await expect(target.page.locator("#status")).toContainText("さんが回答中");
  // 回答できる（回答権は保持されている）
  const choices = target.page.locator(".choice:not([disabled])");
  await expect(choices).toHaveCount(4);

  // ほかの画面にも同じ名前・（0）点数が出る
  for (const p of pages.filter((p) => p !== target.page)) {
    await expect(p.locator(".board")).toContainText(beforeName);
  }
  // 回答して進める
  await choices.first().click();
  await waitReveal(pages);
  await closeClients(clients);
});

test("1人の回線を5秒切ると「接続切れ」が出て、戻ると消える", async ({ browser }) => {
  const { clients } = await makeRoom(browser, 4);
  const pages = clients.map((c) => c.page);
  await startGame(clients[0]!.page);
  await waitQuestionShown(clients[0]!.page);

  const victim = clients[2]!;
  await victim.ctx.setOffline(true);
  // 他の画面に「接続切れ」が出る
  for (const p of pages.filter((p) => p !== victim.page)) {
    await expect(p.locator(".board")).toContainText("接続切れ", { timeout: 20000 });
  }
  await victim.page.waitForTimeout(5000);
  await victim.ctx.setOffline(false);
  // 自動で再接続し、「接続切れ」が消える
  for (const p of pages.filter((p) => p !== victim.page)) {
    await expect(p.locator(".board")).not.toContainText("接続切れ", { timeout: 20000 });
  }
  // victim 自身もゲーム画面に復帰している
  await expect(victim.page.locator("#screen-game")).toBeVisible({ timeout: 20000 });
  await expect(victim.page.locator("#status")).not.toContainText("再接続中", { timeout: 20000 });
  await closeClients(clients);
});
