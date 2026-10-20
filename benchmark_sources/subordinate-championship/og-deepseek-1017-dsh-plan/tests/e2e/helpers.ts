import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { QUESTIONS } from "../../src/questions";

export const PC_VIEWPORT = { width: 1280, height: 800 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };
export const ARTIFACTS_DIR = ".artifacts";

export interface Player {
  context: BrowserContext;
  page: Page;
  name: string;
}

export function ensureArtifactsDir(): void {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

export async function newPlayer(
  browser: Browser,
  name: string,
  viewport = PC_VIEWPORT,
): Promise<Player> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByPlaceholder("例: たろう").fill(name);
  return { context, page, name };
}

export async function playerCreatesRoom(player: Player): Promise<string> {
  await player.page.getByRole("button", { name: "部屋を作る" }).click();
  await expect(player.page.locator("#screen-lobby")).toBeVisible();
  const code = ((await player.page.locator("#lobby-code").textContent()) ?? "").trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  return code;
}

export async function playerJoinsRoom(player: Player, code: string): Promise<void> {
  await player.page.getByPlaceholder("ABC123").fill(code);
  await player.page.getByRole("button", { name: "参加する" }).click();
  await expect(player.page.locator("#screen-lobby")).toBeVisible();
}

export async function setupGame(
  browser: Browser,
  names: string[],
  viewports?: Array<{ width: number; height: number }>,
): Promise<{ players: Player[]; code: string }> {
  const players: Player[] = [];
  for (let index = 0; index < names.length; index += 1) {
    players.push(await newPlayer(browser, names[index], viewports?.[index] ?? PC_VIEWPORT));
  }
  const code = await playerCreatesRoom(players[0]);
  for (let index = 1; index < players.length; index += 1) {
    await playerJoinsRoom(players[index], code);
  }
  for (const player of players) {
    await expect(player.page.locator("#screen-lobby")).toBeVisible();
  }
  return { players, code };
}

export async function waitForPhase(page: Page, phase: string): Promise<void> {
  await expect(page.locator("body")).toHaveAttribute("data-phase", phase);
}

export async function startGame(players: Player[]): Promise<void> {
  await players[0].page.getByRole("button", { name: "ゲーム開始" }).click();
  for (const player of players) {
    await waitForPhase(player.page, "question");
  }
}

export async function waitForQuestionNumber(page: Page, number: number): Promise<void> {
  await expect(page.locator("body")).toHaveAttribute("data-phase", "question", { timeout: 30_000 });
  await expect(page.locator("#q-num")).toHaveText(String(number), { timeout: 30_000 });
}

/** 全員が同時に早押しボタンを押す。 */
export async function buzzAll(players: Player[]): Promise<void> {
  for (const player of players) {
    await expect(player.page.locator("#buzz-btn")).toBeEnabled();
  }
  await Promise.all(players.map((player) => player.page.locator("#buzz-btn").click()));
}

/**
 * 回答権を得た1人を探す。
 * サーバーが決めた回答者（`data-you` と `data-answering` が一致する画面）で探し、
 * さらに「4択が有効な画面がちょうど1つ」であることも確かめる。
 */
export async function findAnswerer(players: Player[]): Promise<Player> {
  for (const player of players) {
    await waitForPhase(player.page, "answering");
  }
  const winners: Player[] = [];
  for (const player of players) {
    const you = await player.page.locator("body").getAttribute("data-you");
    const answering = await player.page.locator("body").getAttribute("data-answering");
    if (you && answering && you === answering) winners.push(player);
  }
  expect(winners, "回答権を持つ画面はちょうど1つ").toHaveLength(1);
  const enabledCounts = await Promise.all(
    players.map((player) => player.page.locator(".choice:enabled").count()),
  );
  expect(
    enabledCounts.filter((count) => count === 4),
    "4択が有効な画面はちょうど1つ",
  ).toHaveLength(1);
  return winners[0];
}

export function correctIndexForQuestionText(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  const question = QUESTIONS.find((candidate) => candidate.text === normalized);
  if (!question) throw new Error(`知らない問題文です: ${normalized}`);
  return question.correctIndex;
}

export async function answerChoice(player: Player, index: number): Promise<void> {
  await player.page.locator(`.choice[data-index="${index}"]`).click();
}

/**
 * 正解を選ぶ。状態を読んでからクリックするまでのあいだに問題が進んでしまう
 * ことがあるため、クリックの直前に「同じ問題のまま回答中か」を確かめ、
 * 反映されなければ読み直してもう一度だけ試す。
 */
export async function answerCorrectly(player: Player): Promise<void> {
  const body = player.page.locator("body");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await body.getAttribute("data-phase")) !== "answering") return;
    if ((await body.getAttribute("data-mine-answering")) !== "1") return;
    const questionNumber = await player.page.locator("#q-num").textContent();
    const text = (await player.page.locator("#question-text").textContent()) ?? "";
    const index = correctIndexForQuestionText(text);
    // 読み終わった時点でも、まだ同じ問題に回答中であることを確かめる。
    if ((await body.getAttribute("data-phase")) !== "answering") return;
    if ((await player.page.locator("#q-num").textContent()) !== questionNumber) continue;
    await player.page
      .locator(`.choice[data-index="${index}"]`)
      .click({ timeout: 5_000 })
      .catch(() => undefined);
    try {
      await expect(body).toHaveAttribute("data-phase", "reveal", { timeout: 4_000 });
      return;
    } catch {
      console.warn(`[answerCorrectly] ${player.name} の回答が反映されなかったので再試行します`);
    }
  }
}

export async function closePlayers(players: Player[]): Promise<void> {
  await Promise.all(players.map((player) => player.context.close().catch(() => undefined)));
}

/** 点数カードの点数を読む。 */
export async function scoreOf(page: Page, name: string): Promise<string> {
  const card = page.locator(".score-item", { hasText: name });
  return (await card.locator(".score-points").textContent()) ?? "";
}
