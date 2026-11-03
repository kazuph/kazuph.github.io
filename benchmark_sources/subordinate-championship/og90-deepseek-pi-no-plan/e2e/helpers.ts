/**
 * ブラウザE2Eの共通ヘルパー。
 * 実際のブラウザで 4 人が同時に遊び、同時押し・再読み込み復帰・画面幅対応を確かめる。
 */
import fs from "node:fs";
import path from "node:path";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const BASE_URL = "http://localhost:8787";
export const ARTIFACT_DIR = path.resolve(process.cwd(), ".artifacts");

export type SizeKey = "pc" | "mobile";

export const VIEWPORTS: Record<SizeKey, Parameters<Browser["newContext"]>[0]> = {
  pc: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "ja-JP",
  },
  mobile: {
    baseURL: BASE_URL,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "ja-JP",
  },
};

export interface Player {
  name: string;
  context: BrowserContext;
  page: Page;
}

export function artifactPath(name: string, size: SizeKey): string {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  return path.join(ARTIFACT_DIR, `${name}-${size}.png`);
}

export async function capture(page: Page, name: string, size: SizeKey): Promise<string> {
  const file = artifactPath(name, size);
  // アニメーションは止めて写す（グローの脈動などが途中で写り込まないように）
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  return file;
}

/** 名前を入れて「部屋を作る」または「参加する」 */
export async function enterRoom(
  browser: Browser,
  size: SizeKey,
  name: string,
  roomCode?: string,
): Promise<Player> {
  const context = await browser.newContext(VIEWPORTS[size]);
  const page = await context.newPage();
  await page.goto("/");
  await page.locator("#input-name").fill(name);
  if (roomCode) {
    await page.locator("#input-code").fill(roomCode);
    await page.locator("#btn-join").click();
  } else {
    await page.locator("#btn-create").click();
  }
  return { name, context, page };
}

export async function waitForScreen(page: Page, screen: "entry" | "lobby" | "game" | "result") {
  await expect(page.locator("body")).toHaveAttribute("data-screen", screen, { timeout: 20_000 });
}

export async function waitForPhase(page: Page, phase: "question" | "answering" | "reveal") {
  await expect(page.locator("body")).toHaveAttribute("data-phase", phase, { timeout: 25_000 });
}

/** その画面が回答権を持っているか（サーバーが配信した状態だけを見る） */
export async function isAnswerer(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.body.dataset.answerer !== "" && document.body.dataset.answerer === document.body.dataset.me,
  );
}

export async function scoresOf(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const result: Record<string, number> = {};
    document.querySelectorAll<HTMLElement>(".score-card").forEach((card) => {
      const id = card.dataset.playerId ?? "";
      const value = card.querySelector(".score-value")?.textContent ?? "0";
      result[id] = Number.parseInt(value, 10);
    });
    return result;
  });
}

export async function roomCodeOf(page: Page): Promise<string> {
  const code = await page.locator("#lobby-code").textContent();
  return (code ?? "").trim();
}

/** 正解発表の表示内容（DOM から一度に読み取る。3.5秒の表示窓を取り逃さないため） */
export interface RevealView {
  phase: string;
  progress: string;
  answer: string;
  headline: string;
  sub: string;
}

export async function readReveal(page: Page): Promise<RevealView> {
  return page.evaluate(() => ({
    phase: document.body.dataset.phase ?? "",
    progress: document.getElementById("q-progress")?.textContent ?? "",
    answer: document.getElementById("reveal-answer")?.textContent ?? "",
    headline: document.getElementById("reveal-headline")?.textContent ?? "",
    sub: document.getElementById("reveal-sub")?.textContent ?? "",
  }));
}

/** 横スクロールが出ていないこと（スマホ幅対応の確認） */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

export async function closeAll(players: Player[]) {
  await Promise.all(players.map((p) => p.context.close().catch(() => {})));
}
