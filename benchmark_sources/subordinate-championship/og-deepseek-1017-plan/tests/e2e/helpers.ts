import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { QUESTIONS } from '../../src/questions';

export interface Player {
  name: string;
  context: BrowserContext;
  page: Page;
}

export const MOBILE_VIEWPORT = { width: 390, height: 844 };
export const PC_VIEWPORT = { width: 1280, height: 800 };

let tracked: BrowserContext[] = [];

export function resetTracked(): void {
  tracked = [];
}

export async function closeTracked(): Promise<void> {
  for (const context of tracked) {
    await context.close().catch(() => undefined);
  }
  tracked = [];
}

export async function newPlayer(
  browser: Browser,
  name: string,
  viewport?: { width: number; height: number },
): Promise<Player> {
  const context = await browser.newContext(viewport ? { viewport } : {});
  tracked.push(context);
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByTestId('name-input')).toBeVisible();
  return { name, context, page };
}

export async function createRoom(player: Player): Promise<string> {
  await player.page.getByTestId('name-input').fill(player.name);
  await player.page.getByTestId('create-btn').click();
  await expect(player.page.getByTestId('lobby-code')).toBeVisible();
  const code = (await player.page.getByTestId('lobby-code').textContent()) ?? '';
  return code.trim();
}

export async function joinRoom(player: Player, code: string): Promise<void> {
  await player.page.getByTestId('name-input').fill(player.name);
  await player.page.getByTestId('code-input').fill(code);
  await player.page.getByTestId('join-btn').click();
}

export async function joinAndWait(player: Player, code: string): Promise<void> {
  await joinRoom(player, code);
  await expect(player.page.getByTestId('lobby-code')).toBeVisible();
}

/** 4人を用意して、全員のロビー表示がそろうまで待つ。 */
export async function setupFour(browser: Browser, viewports?: Array<{ width: number; height: number }>): Promise<Player[]> {
  const players: Player[] = [];
  for (let i = 0; i < 4; i++) {
    players.push(await newPlayer(browser, `P${i}`, viewports?.[i]));
  }
  const code = await createRoom(players[0]);
  for (let i = 1; i < 4; i++) {
    await joinAndWait(players[i], code);
  }
  await expect(players[0].page.getByTestId('lobby-players').locator('li')).toHaveCount(4);
  return players;
}

export async function setupTwo(
  browser: Browser,
  viewports?: Array<{ width: number; height: number }>,
): Promise<{ players: Player[]; code: string }> {
  const players: Player[] = [];
  for (let i = 0; i < 2; i++) {
    players.push(await newPlayer(browser, `P${i}`, viewports?.[i]));
  }
  const code = await createRoom(players[0]);
  await joinAndWait(players[1], code);
  await expect(players[0].page.getByTestId('lobby-players').locator('li')).toHaveCount(2);
  return { players, code };
}

export async function startGame(players: Player[]): Promise<void> {
  await players[0].page.getByTestId('start-btn').click();
  await waitForQuestion(players, 1);
}

export async function waitForQuestion(players: Player[], number: number, timeout = 20_000): Promise<void> {
  for (const p of players) {
    await expect(p.page.getByTestId('q-counter')).toHaveText(`第${number}問 / 10`, { timeout });
    await expect(p.page.getByTestId('buzz-btn')).toBeEnabled({ timeout });
  }
}

/** 内蔵の問題バンクから正解の添字を引く（表示された問題文と一致させる）。 */
export function correctIndexFor(questionText: string): number {
  const question = QUESTIONS.find((q) => q.text === questionText);
  if (!question) throw new Error(`unknown question: ${questionText}`);
  return question.answer;
}

export async function readQuestionText(player: Player): Promise<string> {
  return (await player.page.getByTestId('question-text').textContent()) ?? '';
}

export function playerCard(player: Player, name: string) {
  return player.page.getByTestId('players').locator('li').filter({ hasText: name }).first();
}

export async function readScore(player: Player, name: string): Promise<number> {
  const text = (await playerCard(player, name).locator('.p-score').textContent()) ?? '0';
  return Number.parseInt(text, 10);
}

/** 同時押し: Playwright のアクション待ちを挟まず、クリックイベントを直接送る。 */
export async function clickBuzzTogether(players: Player[]): Promise<void> {
  await Promise.all(players.map((p) => p.page.getByTestId('buzz-btn').dispatchEvent('click')));
}

export async function answeringPlayer(players: Player[]): Promise<Player> {
  for (const p of players) {
    if (await p.page.getByTestId('choice-0').isEnabled()) return p;
  }
  throw new Error('回答権を得たプレイヤーが見つかりません');
}

/** 出題中の画面を、最初の1問に正解して次へ進める。 */
export async function answerCorrectly(player: Player): Promise<void> {
  const text = await readQuestionText(player);
  const index = correctIndexFor(text);
  await player.page.getByTestId(`choice-${index}`).click();
}
