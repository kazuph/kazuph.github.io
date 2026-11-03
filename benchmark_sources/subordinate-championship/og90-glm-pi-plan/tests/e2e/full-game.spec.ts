// 10問を最後まで遊び、4つの画面に同じ最終順位が出る。
import { test, expect } from "@playwright/test";
import {
  makeRoom,
  startGame,
  playFullGame,
  closeClients,
} from "./helpers";

test("10問を最後まで遊ぶと finished になり、全員に同じ最終順位が出る", async ({ browser }) => {
  test.setTimeout(300_000);
  const { clients } = await makeRoom(browser, 4);
  const pages = clients.map((c) => c.page);

  await startGame(clients[0]!.page);
  await playFullGame(pages, 1);

  // 結果画面: 全員に同じ順位表が出る
  for (const p of pages) {
    await expect(p.locator("#screen-result")).toBeVisible({ timeout: 30000 });
  }
  const boards = await Promise.all(pages.map((p) => p.textContent("#result-list")));
  const normalize = (s: string | null) => (s ?? "").replace(/[\s\r\n]+/g, "").replace(/点/g, ",");
  for (let i = 1; i < boards.length; i++) {
    expect(normalize(boards[i])).toEqual(normalize(boards[0]));
  }
  // 4人分の名前が順位表に載る
  for (const c of clients) {
    expect(boards[0]).toContain(c.name);
  }
  await closeClients(clients);
});
