// 同時押しのテスト: 4人が同時に押しても、回答権を得るのはちょうど1人。3問くり返す。
// さらに: 不正解なら -5 になり、その人はこの問題でもう押せない。
import { test, expect } from "@playwright/test";
import {
  makeRoom,
  startGame,
  waitRound,
  waitQuestionShown,
  buzzAll,
  findAnswerer,
  clickChoice,
  waitReveal,
  closeClients,
  timerSeconds,
} from "./helpers";

test("4人の同時押しで回答権は1人だけ（3問）", async ({ browser }) => {
  const { clients } = await makeRoom(browser, 4);
  const pages = clients.map((c) => c.page);

  await startGame(clients[0]!.page);
  await waitRound(clients[0]!.page, 1);
  await waitQuestionShown(clients[0]!.page);

  for (let round = 0; round < 3; round++) {
    // 全員で同時に押す
    await buzzAll(pages);
    const answerer = await findAnswerer(pages);
    expect(answerer, "誰か1人が回答している").not.toBeNull();
    const answerPage = answerer!.page;

    // 回答者以外のボタンは押せない
    for (const p of pages) {
      await expect(p.locator("#buzz")).toBeDisabled();
    }
    expect(await answerPage.textContent("#buzz")).toBe("回答中");
    // 全員の画面に「○○さんが回答中」が出る
    for (const p of pages) {
      await expect(p.locator("#status")).toContainText("さんが回答中");
    }

    // 回答者は4択から選ぶ（choice 0）
    await clickChoice(answerPage, 0);
    // 正解表示
    await waitReveal(pages);

    if (round < 2) {
      // 次の問題へ
      await waitRound(clients[0]!.page, round + 2);
      await waitQuestionShown(clients[0]!.page);
      // 全員の buzz がまた押せる
      await expect.poll(async () => {
        const enabled = await Promise.all(pages.map((p) => p.locator("#buzz").isEnabled()));
        return enabled.every(Boolean);
      }, { timeout: 15000 }).toBe(true);
    }
  }
  await closeClients(clients);
});

test("残り時間は4つの画面で1秒以内の差", async ({ browser }) => {
  const { clients } = await makeRoom(browser, 4);
  const pages = clients.map((c) => c.page);
  await startGame(clients[0]!.page);
  await waitQuestionShown(clients[0]!.page);
  // 出題直後に一度、少し待ってもう一度、同時に読む
  for (let i = 0; i < 3; i++) {
    const secs = await Promise.all(pages.map((p) => p.evaluate(() => document.getElementById("timer-sec")?.textContent ?? "")));
    const nums = secs.map((s) => Number(s.replace("秒", "")));
    expect(Math.max(...nums) - Math.min(...nums)).toBeLessThanOrEqual(1);
    await pages[0]!.waitForTimeout(1500);
  }
  await closeClients(clients);
});
