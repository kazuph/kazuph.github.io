import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { QUESTIONS } from "../../src/questions";

export const PC = { width: 1280, height: 800 };
export const MOBILE = { width: 390, height: 844 };

export interface Player {
  name: string;
  context: BrowserContext;
  page: Page;
}

export async function openPlayer(browser: Browser, name: string, viewport = PC): Promise<Player> {
  const context = await browser.newContext({ viewport, hasTouch: viewport === MOBILE, isMobile: viewport === MOBILE });
  const page = await context.newPage();
  await page.goto("/");
  return { name, context, page };
}

export async function createRoom(p: Player): Promise<string> {
  await p.page.getByTestId("name-input").fill(p.name);
  await p.page.getByTestId("create-btn").click();
  await expect(p.page.getByTestId("screen-lobby")).toBeVisible();
  const code = (await p.page.getByTestId("room-code").textContent()) ?? "";
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  return code;
}

export async function joinRoom(p: Player, code: string): Promise<void> {
  await p.page.getByTestId("name-input").fill(p.name);
  await p.page.getByTestId("code-input").fill(code);
  await p.page.getByTestId("join-btn").click();
  await expect(p.page.getByTestId("screen-lobby")).toBeVisible();
}

/** 4人が部屋に入った状態にする。最初の1人がホスト */
export async function openRoomOf4(browser: Browser, names: string[], viewports = [PC, PC, PC, MOBILE]) {
  const players: Player[] = [];
  for (const [i, name] of names.entries()) players.push(await openPlayer(browser, name, viewports[i]));
  const code = await createRoom(players[0]);
  for (const p of players.slice(1)) await joinRoom(p, code);
  for (const p of players) await expect(p.page.getByTestId("lobby-player")).toHaveCount(names.length);
  return { players, code };
}

export async function startGame(players: Player[]): Promise<void> {
  await players[0].page.getByTestId("start-btn").click();
  for (const p of players) await expect(p.page.getByTestId("screen-game")).toBeVisible();
}

export async function closeAll(players: Player[]): Promise<void> {
  for (const p of players) await p.context.close();
}

export const card = (p: Page, name: string) => p.locator(`[data-testid=player-card][data-name="${name}"]`);
export const scoreOf = (p: Page, name: string) => card(p, name).getByTestId("score");

/** 画面に出ている問題文から、内蔵問題の正解の番号を引く（テスト専用。画面には正解は出ない） */
export async function correctIndex(p: Page): Promise<number> {
  const text = (await p.getByTestId("question").textContent()) ?? "";
  const q = QUESTIONS.find((x) => x.text === text);
  if (!q) throw new Error(`内蔵問題に無い問題文: ${text}`);
  return q.answer;
}

export const buzzEnabled = (p: Page) => p.getByTestId("buzz-btn").isEnabled();
export const choiceEnabled = (p: Page) => p.getByTestId("choice-0").isEnabled();

export async function enabledChoiceCount(players: Player[]): Promise<number> {
  const flags = await Promise.all(players.map((p) => choiceEnabled(p.page)));
  return flags.filter(Boolean).length;
}

export async function waitQuestion(players: Player[], n: number): Promise<void> {
  for (const p of players) {
    await expect(p.page.getByTestId("qnum")).toContainText(`第${n}問`);
    await expect(p.page.locator("body")).toHaveAttribute("data-phase", "question");
  }
}

/** 指定した人が押して、正解（または不正解）を選ぶ */
export async function buzzAndAnswer(who: Player, correct: boolean): Promise<void> {
  await who.page.getByTestId("buzz-btn").click();
  await expect(who.page.getByTestId("choice-0")).toBeEnabled();
  const right = await correctIndex(who.page);
  const pick = correct ? right : (right + 1) % 4;
  await who.page.getByTestId(`choice-${pick}`).click();
}

/** 待ち時間なしで、ボタンの中心を今すぐ押す（同時押しのテスト用。押せるかの確認待ちを挟まない） */
export async function pressNow(p: Page, testId: string): Promise<void> {
  const box = await p.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`${testId} が見つかりません`);
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
