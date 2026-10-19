import { expect, Page, TestInfo } from "@playwright/test";
import { QUESTIONS } from "../../src/questions";

export const PC_VIEWPORT = { width: 1280, height: 800 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** 入口画面から部屋を作る。戻り値は部屋コード */
export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/");
  await page.fill("#input-name", name);
  await page.click("#btn-create");
  await expect(page.locator("#screen-lobby")).toBeVisible();
  await expect(page.locator("#room-code")).toHaveText(/^[A-Z2-9]{6}$/, { timeout: 10_000 });
  const code = (await page.textContent("#room-code"))!.trim();
  return code;
}

/** 入口画面から部屋に参加する */
export async function joinRoom(page: Page, name: string, code: string): Promise<void> {
  await page.goto("/");
  await page.fill("#input-name", name);
  await page.fill("#input-code", code);
  await page.click("#btn-join");
  await expect(page.locator("#screen-lobby")).toBeVisible();
}

export async function startGame(host: Page): Promise<void> {
  await host.click("#btn-start");
  await expect(host.locator("#screen-game")).toBeVisible();
}

/** 出題中（早押しできる状態）まで待つ */
export async function waitQuestion(page: Page, n?: number): Promise<void> {
  await expect(page.locator("#screen-game")).toBeVisible();
  if (n !== undefined) {
    await expect(page.locator("#q-num")).toHaveText(`第${n}問`);
  }
  await expect(page.locator("#buzzer")).toBeEnabled();
}

/** 4人が同時に早押しボタンを押す。押せる状態になっていること。 */
export async function buzzAll(pages: Page[]): Promise<void> {
  // force クリックにしているのは、誰かが押した瞬間にほかの画面でボタンが無効化されても
  // クリック自体は確実に飛ぶようにするため（勝敗はサーバーが決める）
  await Promise.all(pages.map((p) => p.click("#buzzer", { force: true, noWaitAfter: true })));
  // 全員の画面で「回答中」が表示される（押した人の画面では「あなたが回答中」）
  await Promise.all(pages.map((p) => expect(p.locator("#game-status")).toContainText("回答中")));
}

/** 回答権を得たページを返す（選択肢が有効なページは1つだけ） */
export async function findAnswerer(pages: Page[]): Promise<Page> {
  const enabled: Page[] = [];
  for (const p of pages) {
    const count = await p.locator(".choice:not([disabled])").count();
    if (count > 0) enabled.push(p);
  }
  expect(enabled).toHaveLength(1);
  return enabled[0];
}

/** 画面に出ている問題文から、内蔵問題の正解の選択肢を引いてクリックする */
export async function answerCorrectly(page: Page): Promise<void> {
  const text = (await page.textContent("#q-text"))!.trim();
  const q = QUESTIONS.find((x) => x.text === text);
  expect(q, `画面の問題が内蔵問題に見つからない: ${text}`).toBeTruthy();
  await page.click(`.choice[data-i="${q!.answer}"]`);
}

/** 画面に出ている問題文から、わざと不正解の選択肢をクリックする */
export async function answerWrongly(page: Page): Promise<void> {
  const text = (await page.textContent("#q-text"))!.trim();
  const q = QUESTIONS.find((x) => x.text === text)!;
  await page.click(`.choice[data-i="${(q.answer + 1) % 4}"]`);
}

export function screenshotPath(info: TestInfo, name: string): string {
  return `${info.config.rootDir}/../../.artifacts/screenshots/${name}`;
}

export async function shot(page: Page, info: TestInfo, name: string): Promise<void> {
  const path = screenshotPath(info, name);
  const { mkdirSync } = await import("node:fs");
  mkdirSync(`${info.config.rootDir}/../../.artifacts/screenshots`, { recursive: true });
  await page.screenshot({ path, fullPage: false });
}
