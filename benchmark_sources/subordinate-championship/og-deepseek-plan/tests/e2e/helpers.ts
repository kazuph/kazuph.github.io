import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { QUESTIONS } from '../../src/questions';

export const PC_VIEWPORT = { width: 1280, height: 900 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export async function newPlayer(
  browser: Browser,
  viewport: { width: number; height: number } = PC_VIEWPORT,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600,
  });
  const page = await context.newPage();
  return { context, page };
}

export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto('/');
  await page.fill('#player-name', name);
  await page.click('#create-button');
  await expect(page.locator('#view-lobby')).toBeVisible({ timeout: 15_000 });
  const code = (await page.getByTestId('room-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  return code;
}

export async function joinRoom(page: Page, name: string, code: string): Promise<void> {
  await page.goto('/');
  await page.fill('#player-name', name);
  await page.fill('#room-code', code);
  await page.click('#join-button');
  await expect(page.locator('#view-lobby')).toBeVisible({ timeout: 15_000 });
}

export async function startGame(page: Page, players: number): Promise<void> {
  await expect(page.getByTestId('lobby-players').locator('.seat:not(.is-empty)')).toHaveCount(
    players,
  );
  await page.getByTestId('start-button').click();
  await waitForAllPhase([page], 'question');
}

export function correctIndexForText(text: string): number {
  const question = QUESTIONS.find((candidate) => candidate.text === text);
  if (!question) throw new Error(`unknown question: ${text}`);
  return question.correctIndex;
}

export async function phaseOf(page: Page): Promise<string | null> {
  return page.locator('body').getAttribute('data-phase');
}

export async function waitForAllPhase(
  pages: Page[],
  expected: string,
  timeout = 20_000,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const phases = await Promise.all(pages.map((page) => phaseOf(page)));
        return phases.every((phase) => phase === expected);
      },
      { timeout, intervals: [50, 100, 200] },
    )
    .toBe(true);
}

export async function waitForPhase(page: Page, expected: string, timeout = 20_000): Promise<void> {
  await expect(page.locator('#view-game')).toHaveAttribute('data-phase', expected, { timeout });
}

export async function countAnswerers(pages: Page[]): Promise<number> {
  let count = 0;
  for (const page of pages) {
    if (await page.getByTestId('answering-you').isVisible()) count += 1;
  }
  return count;
}

export async function countPagesWithEnabledChoices(pages: Page[]): Promise<number> {
  let count = 0;
  for (const page of pages) {
    const enabled = await page.locator('[data-testid="choice"]:not([disabled])').count();
    if (enabled > 0) count += 1;
  }
  return count;
}

export async function waitForOneAnswerer(pages: Page[], timeout = 8_000): Promise<void> {
  await expect
    .poll(() => countAnswerers(pages), { timeout, intervals: [50, 100, 200] })
    .toBe(1);
}

async function findAnswererNow(pages: Page[]): Promise<number> {
  for (let index = 0; index < pages.length; index += 1) {
    if (await pages[index].getByTestId('answering-you').isVisible()) return index;
  }
  return -1;
}

/**
 * いま出ている問題を、早押しと4択の繰り返しで必ず reveal まで進める。
 * 正解はアプリ内蔵の問題データから引く（ブラウザの表示からは正解を読まない）。
 */
export async function resolveCurrentQuestion(
  pages: Page[],
): Promise<'reveal' | 'finished'> {
  let lastAnswerKey = '';
  let lastBuzzAt = 0;

  for (let step = 0; step < 200; step += 1) {
    const phases = await Promise.all(pages.map((page) => phaseOf(page)));
    if (phases.includes('finished')) return 'finished';
    if (phases.includes('reveal')) return 'reveal';

    if (phases.includes('answering')) {
      const answerer = await findAnswererNow(pages);
      if (answerer >= 0) {
        const page = pages[answerer];
        const questionNumber = (await page.getByTestId('question-number').textContent()) ?? '';
        const answerKey = `${questionNumber}:${answerer}`;
        if (answerKey !== lastAnswerKey) {
          lastAnswerKey = answerKey;
          const questionText = (await page.getByTestId('question-text').textContent()) ?? '';
          const correct = correctIndexForText(questionText);
          const button = page.getByTestId('choice').nth(correct);
          if (await button.isEnabled()) {
            await button.click({ timeout: 1_500 }).catch(() => undefined);
          }
        }
      }
      await pages[0].waitForTimeout(100);
      continue;
    }

    if (phases.every((phase) => phase === 'question')) {
      lastAnswerKey = '';
      if (Date.now() - lastBuzzAt > 300) {
        lastBuzzAt = Date.now();
        const clicks: Promise<void>[] = [];
        for (const page of pages) {
          const buzz = page.getByTestId('buzz-button');
          if (await buzz.isEnabled()) {
            clicks.push(buzz.click({ timeout: 1_500 }).catch(() => undefined));
          }
        }
        await Promise.all(clicks);
      }
      await pages[0].waitForTimeout(120);
      continue;
    }

    await pages[0].waitForTimeout(80);
  }
  throw new Error(
    `question did not resolve: ${JSON.stringify(await Promise.all(pages.map(phaseOf)))}`,
  );
}

export async function playAllQuestions(pages: Page[]): Promise<void> {
  for (let questionNumber = 1; questionNumber <= 10; questionNumber += 1) {
    await waitForAllPhase(pages, 'question', 20_000);
    await expect(pages[0].getByTestId('question-number')).toHaveText(`第${questionNumber}問`);
    await resolveCurrentQuestion(pages);
    await waitForAllPhase(pages, 'reveal', 8_000);
  }
  await waitForAllPhase(pages, 'finished', 8_000);
}

export async function getPlayerRow(page: Page, name: string) {
  return page.locator('[data-testid="player-row"]').filter({ hasText: name }).first();
}

export async function getScore(page: Page, name: string): Promise<number> {
  const text = await (await getPlayerRow(page, name)).getByTestId('player-score').textContent();
  return Number(text);
}

export async function waitForScore(page: Page, name: string, score: number): Promise<void> {
  const row = await getPlayerRow(page, name);
  await expect(row.getByTestId('player-score')).toHaveText(String(score), { timeout: 8_000 });
}

export async function readRanking(
  page: Page,
): Promise<Array<{ rank: number; name: string; score: number }>> {
  const rows = page.getByTestId('rank-row');
  const count = await rows.count();
  const result: Array<{ rank: number; name: string; score: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    result.push({
      rank: Number(await row.getAttribute('data-rank')),
      name: (await row.locator('.rank-name').textContent())?.trim() ?? '',
      score: Number((((await row.getByTestId('rank-score').textContent()) ?? '').match(/-?\d+/)?.[0]) ?? 0),
    });
  }
  return result;
}

export async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `.artifacts/${name}.png`, animations: 'disabled' });
}

export async function closePlayers(contexts: BrowserContext[]): Promise<void> {
  await Promise.all(
    contexts.flatMap((context) =>
      context.pages().map((page) => page.close({ runBeforeUnload: false }).catch(() => undefined)),
    ),
  );
  await Promise.all(contexts.map((context) => context.close()));
}
