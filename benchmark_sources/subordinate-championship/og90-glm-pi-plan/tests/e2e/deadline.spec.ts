// 実時間の締め切りのテスト（時間は縮めない）:
// - 誰も押さなければ 20 秒で正解が表示される
// - 押して何も選ばなければ 10 秒で -5 点になり、この問題ではもう押せない
import { test, expect } from "@playwright/test";
import {
  makeRoom,
  startGame,
  waitQuestionShown,
  buzzAll,
  findAnswerer,
  waitReveal,
  closeClients,
} from "./helpers";

test("誰も押さないと 20 秒で正解が表示される", async ({ browser }) => {
  const { clients } = await makeRoom(browser, 4);
  const pages = clients.map((c) => c.page);
  await startGame(clients[0]!.page);
  await waitQuestionShown(clients[0]!.page);
  const shownAt = Date.now();
  // 誰も押さない
  await waitReveal(pages, 30000);
  const elapsed = Date.now() - shownAt;
  expect(elapsed).toBeGreaterThanOrEqual(19000);
  expect(elapsed).toBeLessThan(26000);
  await closeClients(clients);
});

test("回答権を得て何も選ばないと 10 秒で -5 点", async ({ browser }) => {
  const { clients } = await makeRoom(browser, 4);
  const pages = clients.map((c) => c.page);
  await startGame(clients[0]!.page);
  await waitQuestionShown(clients[0]!.page);

  await buzzAll(pages);
  const answerer = await findAnswerer(pages);
  expect(answerer).not.toBeNull();
  const target = clients[answerer!.index]!;
  const buzzAt = Date.now();
  // 何も選ばない
  // 10 秒後に -5 点になっている（reveal ではなく早押し再開）
  await expect
    .poll(async () => {
      const board = await target!.page.textContent(".board");
      return (board ?? "").includes("-5点") || (board ?? "").includes("－5点") ? true : (await target!.page.textContent("#buzz")) === "済み";
    }, { timeout: 20000, intervals: [] })
    .toBe(true);
  const elapsed = Date.now() - buzzAt;
  expect(elapsed).toBeGreaterThanOrEqual(9000);
  expect(elapsed).toBeLessThan(16000);
  // まだこの問題が続いている（20 秒内なら次の問題は来ていない）
  const round = await pages[0]!.textContent("#round-label");
  expect(round).toBe("第1問");
  // 失格者以外はまた押せる
  const others = pages.filter((p) => p !== target!.page);
  await expect(others[0]!.locator("#buzz")).toBeEnabled({ timeout: 10000 });
  // そのまま 20 秒まで待つと正解が出る
  await waitReveal(pages, 30000);
  await closeClients(clients);
});
