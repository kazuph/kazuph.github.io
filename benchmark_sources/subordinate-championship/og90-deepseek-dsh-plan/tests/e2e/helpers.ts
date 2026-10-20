import fs from "node:fs";
import path from "node:path";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { QUESTIONS } from "../../src/questions";

export const ARTIFACTS_DIR = path.resolve(process.cwd(), ".artifacts");

export function ensureArtifacts(): void {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

export function artifactPath(name: string): string {
  return path.join(ARTIFACTS_DIR, name);
}

export interface Player {
  name: string;
  context: BrowserContext;
  page: Page;
}

export async function newDesktopPlayer(browser: Browser, name: string): Promise<Player> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  return { name, context, page };
}

export async function newMobilePlayer(browser: Browser, name: string): Promise<Player> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  return { name, context, page };
}

export async function closePlayers(players: Player[]): Promise<void> {
  await Promise.all(players.map((player) => player.context.close().catch(() => undefined)));
}

export async function createRoom(player: Player): Promise<string> {
  await player.page.goto("/");
  await expect(player.page.locator("#screen-entry")).toBeVisible();
  await player.page.fill("#name-input", player.name);
  await player.page.click("#create-button");
  await expect(player.page.locator("#screen-lobby")).toBeVisible({ timeout: 15_000 });
  const code = await player.page.locator("#room-code").textContent();
  return (code ?? "").trim();
}

export async function joinRoom(player: Player, code: string): Promise<void> {
  await player.page.goto("/");
  await expect(player.page.locator("#screen-entry")).toBeVisible();
  await player.page.fill("#name-input", player.name);
  await player.page.fill("#code-input", code);
  await player.page.click("#join-button");
  await expect(player.page.locator("#screen-lobby")).toBeVisible({ timeout: 15_000 });
}

export async function attemptJoin(player: Player, code: string): Promise<void> {
  await player.page.goto("/");
  await expect(player.page.locator("#screen-entry")).toBeVisible();
  await player.page.fill("#name-input", player.name);
  await player.page.fill("#code-input", code);
  await player.page.click("#join-button");
}

export async function startGame(players: Player[], host: Player): Promise<void> {
  await expect(host.page.locator("#start-button")).toBeEnabled({ timeout: 15_000 });
  await host.page.click("#start-button");
  await Promise.all(
    players.map((player) =>
      expect(player.page.locator("#screen-game")).toBeVisible({ timeout: 15_000 }),
    ),
  );
  await Promise.all(
    players.map((player) =>
      expect(player.page.locator("#question-text")).not.toBeEmpty({ timeout: 15_000 }),
    ),
  );
}

/** 早押しボタンが押せるようになる（＝出題中）まで待つ。 */
export async function waitForBuzzing(players: Player[]): Promise<void> {
  await Promise.all(
    players.map((player) =>
      expect(player.page.locator("#buzz-button")).toBeEnabled({ timeout: 20_000 }),
    ),
  );
}

/** 正解が表示される（＝reveal）まで待つ。 */
export async function waitForReveal(players: Player[]): Promise<void> {
  await Promise.all(
    players.map((player) =>
      expect(player.page.locator(".choice.correct")).toBeVisible({ timeout: 25_000 }),
    ),
  );
}

/** reveal（3秒）が終わって次の問題の早押しが始まるまで待つ。 */
export async function waitForNextQuestion(players: Player[]): Promise<void> {
  await Promise.all(
    players.map((player) =>
      expect(player.page.locator(".choice.correct")).toHaveCount(0, { timeout: 20_000 }),
    ),
  );
  await waitForBuzzing(players);
}

export function questionTextOf(page: Page): Promise<string> {
  return page.locator("#question-text").textContent().then((text) => (text ?? "").trim());
}

export function correctIndexOf(questionText: string): number {
  const question = QUESTIONS.find((item) => item.text === questionText);
  if (!question) throw new Error(`内蔵問題に見つかりません: ${questionText}`);
  return question.correct;
}

/** サーバーが1人だけに回答権を与えたかを確かめ、その人の index を返す。 */
export async function waitForSingleAnswerer(players: Player[]): Promise<number> {
  await expect
    .poll(
      async () => {
        const counts = await Promise.all(
          players.map((player) => player.page.locator(".choice:not([disabled])").count()),
        );
        return counts.filter((count) => count > 0).length;
      },
      { timeout: 10_000 },
    )
    .toBe(1);

  const counts = await Promise.all(
    players.map((player) => player.page.locator(".choice:not([disabled])").count()),
  );
  return counts.findIndex((count) => count > 0);
}

export async function buzzAll(players: Player[]): Promise<void> {
  await Promise.all(players.map((player) => player.page.locator("#buzz-button").click()));
}

export function gamePlayerRow(page: Page, name: string) {
  return page.locator(".game-player", { hasText: name });
}

export async function readTimer(page: Page): Promise<number> {
  const text = (await page.locator("#timer-label").textContent()) ?? "0";
  return Number.parseFloat(text);
}

/** 全画面の残り時間の最大差（秒）。 */
export async function timerSpread(players: Player[]): Promise<number> {
  const values = await Promise.all(players.map((player) => readTimer(player.page)));
  return Math.max(...values) - Math.min(...values);
}
