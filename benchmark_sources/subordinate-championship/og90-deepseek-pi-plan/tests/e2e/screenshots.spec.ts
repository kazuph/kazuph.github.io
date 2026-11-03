import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  buzzSimultaneously,
  countAnswerers,
  correctChoice,
  DESKTOP,
  findAnswerer,
  MOBILE,
  newClient,
  setupLobby,
  startGame,
  waitForPhase,
} from "./helpers";

const OUT_DIR = path.join(process.cwd(), ".artifacts");

test.afterEach(async ({ browser }) => {
  for (const context of browser.contexts()) {
    await context.close();
  }
});

test("ロビー・出題中・回答中・結果の画面をPC幅とスマホ幅で保存する", async ({ browser }) => {
  test.setTimeout(180_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const shot = (page: Page, name: string) =>
    page.screenshot({ path: path.join(OUT_DIR, name) });

  // 入口（まだ部屋に入っていない画面）
  const entryPc = await newClient(browser, "見学者", DESKTOP);
  await entryPc.page.goto("/");
  await shot(entryPc.page, "entry-pc.png");
  const entryMobile = await newClient(browser, "見学者", MOBILE);
  await entryMobile.page.goto("/");
  await shot(entryMobile.page, "entry-mobile.png");

  const room = await setupLobby(
    browser,
    ["あか", "あお", "きいろ", "みどり"],
    [DESKTOP, DESKTOP, MOBILE, MOBILE],
  );
  const [pc1, , mobile1] = room.clients;
  await waitForPhase(room.clients, "lobby");

  await shot(pc1.page, "lobby-pc.png");
  await shot(mobile1.page, "lobby-mobile.png");

  await startGame(room);
  await waitForPhase(room.clients, "question");

  await shot(pc1.page, "question-pc.png");
  await shot(mobile1.page, "question-mobile.png");

  // スマホ幅（390x844）で、問題文・4択・早押しボタンがスクロールせずに見えている
  const viewportHeight = MOBILE.height;
  const inViewport = async (selector: string, index = 0) => {
    const box = await mobile1.page.locator(selector).nth(index).boundingBox();
    expect(box, `${selector} の位置が取れません`).not.toBeNull();
    if (!box) return;
    expect(box.y, `${selector} が上にはみ出している`).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, `${selector} が下にはみ出している`).toBeLessThanOrEqual(
      viewportHeight,
    );
  };
  await inViewport("#question-text");
  for (let i = 0; i < 4; i += 1) await inViewport(".choice", i);
  await inViewport("#buzz-btn");
  await inViewport("#game-status");
  await inViewport("#timer-fill");

  // スマホの人が早押しして回答中
  await mobile1.page.locator("#buzz-btn").click();
  await waitForPhase(room.clients, "answering");
  await expect(mobile1.page.locator("body")).toHaveAttribute("data-answerer", "true");
  await shot(pc1.page, "answering-pc.png");
  await shot(mobile1.page, "answering-mobile.png");

  // 正解して正解表示へ
  const answer = await correctChoice(mobile1.page);
  await mobile1.page.locator(`.choice[data-choice="${answer}"]`).click();
  await waitForPhase(room.clients, "reveal");
  await shot(pc1.page, "reveal-pc.png");
  await shot(mobile1.page, "reveal-mobile.png");

  // 残り9問を最後まで遊ぶ
  for (let q = 2; q <= 10; q += 1) {
    await waitForPhase(room.clients, "question", 30_000);
    await buzzSimultaneously(room.clients);
    await expect.poll(() => countAnswerers(room.clients), { timeout: 10_000 }).toBe(1);
    const answerer = await findAnswerer(room.clients);
    const choice = await correctChoice(answerer.page);
    await answerer.page.locator(`.choice[data-choice="${choice}"]`).click();
  }

  for (const client of room.clients) {
    await expect(client.page.locator("#screen-result")).toBeVisible({ timeout: 30_000 });
  }
  await shot(pc1.page, "result-pc.png");
  await shot(mobile1.page, "result-mobile.png");

  // 結果画面もスマホ幅に収まっている
  await inViewport("#result-ranking");

  // 保存されたファイルを確かめる
  for (const name of [
    "entry-pc.png",
    "entry-mobile.png",
    "lobby-pc.png",
    "lobby-mobile.png",
    "question-pc.png",
    "question-mobile.png",
    "answering-pc.png",
    "answering-mobile.png",
    "result-pc.png",
    "result-mobile.png",
  ]) {
    const file = path.join(OUT_DIR, name);
    expect(fs.existsSync(file), `${file} がない`).toBe(true);
    expect(fs.statSync(file).size).toBeGreaterThan(1000);
  }
});
