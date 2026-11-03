import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  answerCorrectly,
  answererSeat,
  createRoom,
  joinRoom,
  openSeat,
  PC,
  SHOTS,
  SP,
  startWith,
  waitBuzzable,
  type Seat,
} from "./helpers";

async function shot(seat: Seat, name: string): Promise<void> {
  await seat.page.screenshot({ path: `${SHOTS}${name}.png` });
}

// 要素がスマホ画面（390×844）の中に収まっているか
async function expectInsideViewport(seat: Seat, selector: string): Promise<void> {
  const box = await seat.page.locator(selector).first().boundingBox();
  expect(box, `${selector} が見えること`).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(SP.height);
}

test("10問を最後まで遊び、4画面に同じ最終順位が出る（スクリーンショット付き）", async ({ browser }) => {
  test.setTimeout(240_000);
  mkdirSync(SHOTS, { recursive: true });
  const seats: Seat[] = [
    await openSeat(browser, "えー", PC),
    await openSeat(browser, "びー", PC),
    await openSeat(browser, "しー", PC),
    await openSeat(browser, "でぃー", SP),
  ];
  const pc = seats[0];
  const sp = seats[3];

  const code = await createRoom(pc);
  for (const seat of seats.slice(1)) await joinRoom(seat, code);
  for (const seat of seats) {
    await expect(seat.page.locator("#lobby-players li")).toHaveCount(4);
  }
  await shot(pc, "lobby-pc");
  await shot(sp, "lobby-sp");

  await startWith(seats);
  for (let round = 0; round < 10; round++) {
    await waitBuzzable(seats);
    if (round === 0) {
      await shot(pc, "question-pc");
      await shot(sp, "question-sp");
      await expectInsideViewport(sp, "#question");
      await expectInsideViewport(sp, ".choices");
      await expectInsideViewport(sp, "#buzz");
    }
    if (round === 0) {
      // 1問目は2番目の人がスペースキーで押し、回答権を得ることを確かめてから他の人も押す
      await seats[1].page.keyboard.press("Space");
      await expect(seats[1].page.locator("#status")).toContainText("あなたが回答中");
      await Promise.all([0, 2, 3].map((i) => seats[i].page.locator("#buzz").dispatchEvent("click")));
    } else {
      await Promise.all(seats.map((seat) => seat.page.locator("#buzz").dispatchEvent("click")));
    }
    const winner = await answererSeat(seats);
    if (round === 0) {
      await shot(pc, "answering-pc");
      await shot(sp, "answering-sp");
    }
    await answerCorrectly(winner);
    if (round === 0) {
      await expect(pc.page.locator("#status")).toContainText("正解");
      await shot(pc, "reveal-pc");
      await shot(sp, "reveal-sp");
    }
  }

  for (const seat of seats) {
    await expect(seat.page.locator("#result")).toBeVisible({ timeout: 15_000 });
  }
  await shot(pc, "result-pc");
  await shot(sp, "result-sp");
  const rankings = await Promise.all(seats.map((seat) => seat.page.locator("#ranking").innerText()));
  expect(new Set(rankings).size).toBe(1);
  expect(rankings[0].trim().length).toBeGreaterThan(0);
  for (const seat of seats) await seat.context.close();
});
