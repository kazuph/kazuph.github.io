// スクリーンショット: ロビー・出題中・回答中・結果を PC 幅とスマホ幅で .artifacts/ に保存する。
// スマホ幅（390x844）では問題文・4択・早押しボタンが1画面に収まることも確かめる。
import { test, expect } from "@playwright/test";
import {
  PC,
  MOBILE,
  makeRoom,
  startGame,
  waitRound,
  waitQuestionShown,
  buzzAll,
  findAnswerer,
  clickChoice,
  playFullGame,
  closeClients,
  type Client,
} from "./helpers";

const DIR = ".artifacts";

async function captureFlow(
  browser: Parameters<typeof makeRoom>[0],
  shots: "pc" | "mobile"
): Promise<void> {
  const opts = shots === "pc" ? PC : MOBILE;
  const room = await makeRoom(browser, 4, opts);
  const clients: Client[] = room.clients;
  const pages = clients.map((c) => c.page);
  const p0 = clients[0]!.page;

  // ロビー
  await expect(p0.locator("#screen-lobby")).toBeVisible();
  for (const c of clients) {
    await expect(c.page.locator("#screen-lobby")).toBeVisible();
  }
  await p0.screenshot({ path: `${DIR}/${shots}-lobby.png` });

  // ゲーム開始 → 出題中
  await startGame(clients[0]!.page);
  await waitRound(p0, 1);
  await waitQuestionShown(p0);
  await expect(p0.locator("#buzz")).toBeEnabled();
  await p0.screenshot({ path: `${DIR}/${shots}-question.png` });

  // 回答中
  await buzzAll(pages);
  const answerer = await findAnswerer(pages);
  expect(answerer).not.toBeNull();
  await expect(answerer!.page.locator(".choice:not([disabled])")).toHaveCount(4);
  await answerer!.page.screenshot({ path: `${DIR}/${shots}-answering.png` });
  const watcher = pages.find((p) => p !== answerer!.page)!;
  await expect(watcher.locator("#status")).toContainText("さんが回答中");
  await watcher.screenshot({ path: `${DIR}/${shots}-answering-watch.png` });

  await clickChoice(answerer!.page, 0);
  await expect(p0.locator(".choice.correct")).toBeVisible({ timeout: 30000 });

  // 結果まで遊ぶ
  await playFullGame(pages, 1);
  for (const c of clients) {
    await expect(c.page.locator("#screen-result")).toBeVisible({ timeout: 30000 });
  }
  await p0.waitForTimeout(300);
  await p0.screenshot({ path: `${DIR}/${shots}-result.png` });

  await closeClients(clients);
}

test("PC 幅とスマホ幅でロビー・出題中・回答中・結果を撮影する", async ({ browser }) => {
  test.setTimeout(420_000);
  await captureFlow(browser, "pc");
  await captureFlow(browser, "mobile");
});

test("スマホ幅では問題文・4択・早押しボタンが1画面に収まる", async ({ browser }) => {
  test.setTimeout(300_000);
  const room = await makeRoom(browser, 4, MOBILE);
  const pages = room.clients.map((c) => c.page);
  await startGame(room.clients[0]!.page);
  await waitRound(pages[0]!, 1);
  await waitQuestionShown(pages[0]!);
  await expect(pages[0]!.locator("#buzz")).toBeEnabled();

  const inView = await pages[0]!.evaluate(() => {
    const vh = window.innerHeight;
    const rectOf = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    };
    const question = rectOf("#question-text");
    const buzz = rectOf("#buzz");
    const choices = Array.from(document.querySelectorAll(".choice")).map((c) => c.getBoundingClientRect());
    const allVisible = (r: { top: number; bottom: number } | null) => r !== null && r.top >= 0 && r.bottom <= vh;
    return {
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: vh,
      questionVisible: allVisible(question),
      buzzVisible: allVisible(buzz),
      noScrollNeeded: document.documentElement.scrollHeight <= vh + 1,
      choices: choices.every((r) => r.top >= 0 && r.bottom <= vh),
      choiceCount: choices.length,
    };
  });
  expect(inView.choiceCount).toBe(4);
  expect(inView.questionVisible).toBe(true);
  expect(inView.buzzVisible).toBe(true);
  expect(inView.noScrollNeeded).toBe(true);
  await pages[0]!.screenshot({ path: `${DIR}/mobile-fit.png` });
  await closeClients(room.clients);
});
