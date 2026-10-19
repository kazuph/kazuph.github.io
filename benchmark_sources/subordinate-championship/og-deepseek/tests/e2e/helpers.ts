import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { QUESTION_BANK } from "../../src/questions";

export interface TestPlayer {
  name: string;
  context: BrowserContext;
  page: Page;
}

export async function openPlayer(
  browser: Browser,
  name: string,
  contextOptions: Parameters<Browser["newContext"]>[0] = {},
): Promise<TestPlayer> {
  const context = await browser.newContext({
    baseURL: "http://localhost:8787",
    ...contextOptions,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByTestId("name-input").fill(name);
  return { name, context, page };
}

export async function createRoom(host: TestPlayer): Promise<string> {
  await Promise.all([
    host.page.waitForURL(/\/room\/[A-Z0-9]{4}$/),
    host.page.getByTestId("create-room").click(),
  ]);
  await expect(host.page.locator('[data-testid="room"]')).toHaveAttribute(
    "data-phase",
    "lobby",
  );
  return new URL(host.page.url()).pathname.split("/").pop()!;
}

export async function joinRoom(
  player: TestPlayer,
  code: string,
): Promise<void> {
  await player.page.getByTestId("room-code-input").fill(code);
  await Promise.all([
    player.page.waitForURL(new RegExp(`/room/${code}$`)),
    player.page.getByTestId("join-room").click(),
  ]);
  await expect(player.page.locator('[data-testid="room"]')).toHaveAttribute(
    "data-phase",
    "lobby",
  );
}

export function roomRoot(page: Page) {
  return page.locator('[data-testid="room"], [data-testid="result"]');
}

export async function waitForPhase(
  pages: Page[],
  phase: string,
  round?: number,
  timeout = 12_000,
): Promise<void> {
  for (const page of pages) {
    await expect(roomRoot(page)).toHaveAttribute("data-phase", phase, {
      timeout,
    });
    if (round !== undefined) {
      await expect(roomRoot(page)).toHaveAttribute(
        "data-round",
        String(round),
        { timeout },
      );
    }
  }
}

export function playerCard(page: Page, name: string) {
  return page.locator(
    `[data-testid="player-card"][data-player-name="${name}"]`,
  );
}

export async function scoreOf(page: Page, name: string): Promise<number> {
  const text = await playerCard(page, name)
    .getByTestId("player-score")
    .innerText();
  return Number(text.replace(/[^\d-]/g, ""));
}

export async function findAnswerer(pages: Page[]): Promise<Page> {
  await expect
    .poll(
      async () => {
        for (const page of pages) {
          if (await page.getByTestId("you-are-answering").count()) return true;
        }
        return false;
      },
      { timeout: 10_000, message: "exactly one player should get the answer right" },
    )
    .toBe(true);

  for (const page of pages) {
    if (await page.getByTestId("you-are-answering").count()) return page;
  }
  throw new Error("No answerer found");
}

export function promptOf(page: Page): Promise<string> {
  return page.getByTestId("question-prompt").innerText();
}

export function correctIndexForPrompt(prompt: string): number {
  const question = QUESTION_BANK.find((entry) => entry.prompt === prompt);
  if (!question) throw new Error(`Question not found in bank: ${prompt}`);
  return question.answerIndex;
}

export async function answerOn(page: Page, choice: number): Promise<void> {
  // dispatchEvent submits immediately, without Playwright waiting for CSS
  // animations to settle inside the 10 second answer window.
  await page.getByTestId(`choice-${choice}`).dispatchEvent("click");
}

export async function startGame(host: Page): Promise<void> {
  await host.getByTestId("start-button").click();
}

export async function waitForQuestion(
  pages: Page[],
  round: number,
): Promise<void> {
  await waitForPhase(pages, "question", round);
}

export async function waitForReveal(
  pages: Page[],
  round: number,
): Promise<void> {
  await waitForPhase(pages, "reveal", round);
}

export async function buzz(page: Page): Promise<void> {
  // dispatchEvent avoids Playwright re-trying the click on the next question
  // if the button is re-rendered while a burst of buzzes is in flight.
  await page.getByTestId("buzz-button").dispatchEvent("click");
}

export async function playRoundCorrectly(
  players: TestPlayer[],
  buzzer: TestPlayer,
  round: number,
): Promise<void> {
  const pages = players.map((player) => player.page);
  await waitForQuestion(pages, round);
  const prompt = await promptOf(players[0].page);
  const correct = correctIndexForPrompt(prompt);
  await buzz(buzzer.page);
  const answerer = await findAnswerer(pages);
  expect(answerer).toBe(buzzer.page);
  await answerOn(answerer, correct);
  await waitForReveal(pages, round);
}

export async function resultScore(page: Page, name: string): Promise<number> {
  const row = page.locator(
    `[data-testid="rank-row"][data-player-name="${name}"]`,
  );
  const score = await row.getAttribute("data-score");
  return Number(score);
}
