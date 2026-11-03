import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { QUESTIONS } from '../../src/questions';

const evidenceDirectory = path.resolve('.artifacts/quickbell');
const sessionKey = 'quickbell-player';

test.beforeAll(async () => {
  await mkdir(evidenceDirectory, { recursive: true });
});

test(
  'four independent players can race, reconnect, play ten questions, and see matching final ranks',
  async ({ browser }) => {
  test.setTimeout(180_000);
  const contexts: BrowserContext[] = [];
  const errors: string[] = [];
  try {
    const pages = await openPlayers(browser, contexts, errors);
    const roomCode = await createRoom(pages[0], '赤チーム');
    const identities = [await savedIdentity(pages[0])];
    for (const [index, page] of pages.slice(1).entries()) {
      await joinRoom(page, roomCode, `青チーム${index + 1}`);
      identities.push(await savedIdentity(page));
    }
    const fifth = await openPlayer(browser, contexts, errors, { width: 1280, height: 900 });
    await joinRoom(fifth, roomCode, '5人目', false);
    await expect(fifth.getByText('満員です（4人まで）')).toBeVisible();

    await expect(pages[0].getByTestId('room-code')).toHaveText(roomCode);
    await expect(pages[3].getByText('青チーム3')).toBeVisible();
    await saveScreenshot(pages[0], 'pc-lobby');
    await saveScreenshot(pages[3], 'mobile-lobby');
    await pages[0].getByRole('button', { name: 'クイズを開始' }).click();
    await expect(pages[0].locator('[data-phase="question"]')).toBeVisible();
    await expect(pages[3].locator('[data-phase="question"]')).toBeVisible();

    const timeValues = await Promise.all(
      pages.map((page) => page.getByTestId('remaining-time').getAttribute('data-seconds')),
    );
    const seconds = timeValues.map(Number);
    expect(Math.max(...seconds) - Math.min(...seconds)).toBeLessThanOrEqual(1);
    await saveScreenshot(pages[0], 'pc-question');
    await saveScreenshot(pages[3], 'mobile-question');
    const mobileFit = await pages[3].evaluate(() => {
      const question = document.querySelector('[data-testid="question-prompt"]')?.getBoundingClientRect();
      const buzzer = document.querySelector('[data-testid="buzzer"]')?.getBoundingClientRect();
      const choices = [...document.querySelectorAll('.choice-button')]
        .map((choice) => choice.getBoundingClientRect());
      return question && buzzer && choices.length === 4
        && question.top >= 0 && question.bottom <= innerHeight
        && choices.every((choice) => choice.top >= 0 && choice.bottom <= innerHeight)
        && buzzer.bottom <= innerHeight;
    });
    expect(mobileFit).toBe(true);

    for (let question = 1; question <= 3; question += 1) {
      const answererIndex = await raceBuzzer(pages);
      const answerer = pages[answererIndex];
      if (question === 1) {
        const answererName = await answerer.locator(
          `.score-row[data-player="${identities[answererIndex].id}"] .score-name`,
        ).innerText();
        for (const page of pages) {
          await expect(page.getByTestId('answer-status')).toContainText(`${answererName}さんが回答中`);
        }
        await saveScreenshot(pages[0], 'pc-answering');
        await saveScreenshot(pages[3], 'mobile-answering');
      }
      const questionText = await answerer.getByTestId('question-prompt').textContent();
      const source = QUESTIONS.find((item) => item.prompt === questionText);
      if (!source) throw new Error(`内蔵問題が見つかりません: ${questionText}`);
      if (question === 1) {
        const wrongChoice = source.choices.findIndex((_, index) => index !== source.answer);
        await answerer.locator(`[data-choice="${wrongChoice}"]`).click();
        for (const page of pages) {
          const score = page.locator(
            `.score-row[data-player="${identities[answererIndex].id}"] .score-value`,
          );
          await expect.poll(async () => score.textContent()).toContain('-5');
        }
        await expect(answerer.getByTestId('answer-status')).toContainText('この問題は回答済み');
        await expect(answerer.getByTestId('buzzer')).toBeDisabled();
        await expect(pages[0].locator('[data-phase="question"]')).toBeVisible();
        await expect(pages[0].locator('[data-question-number]')).toHaveAttribute('data-question-number', '1');
        const score = pages[0].locator(`.score-row[data-player="${identities[0].id}"] .score-value`);
        const scoreBeforeReload = await score.innerText();
        await pages[0].reload();
        await expect(pages[0].locator(`.score-row[data-player="${identities[0].id}"]`)).toBeVisible();
        await expect(pages[0].getByText('赤チーム')).toBeVisible();
        await expect(score).toHaveText(scoreBeforeReload);
        await expect(pages[0].locator('.connection-banner')).toHaveCount(0);
        const eligiblePages = pages.filter((page) => page !== answerer);
        const winner = eligiblePages[await raceBuzzer(eligiblePages)];
        const correctText = await winner.getByTestId('question-prompt').textContent();
        const correctQuestion = QUESTIONS.find((item) => item.prompt === correctText);
        if (!correctQuestion) throw new Error(`内蔵問題が見つかりません: ${correctText}`);
        await answerCorrectly(winner, correctQuestion.answer, identities[pages.indexOf(winner)].id);
        await expect(winner.locator('[data-phase="reveal"]')).toBeVisible();
        await expect(winner.locator('[data-phase="question"]')).toHaveAttribute(
          'data-question-number',
          '2',
          { timeout: 6_000 },
        );
      } else {
        await answerCorrectly(answerer, source.answer, identities[answererIndex].id);
        await expect(answerer.locator('[data-phase="reveal"]')).toBeVisible();
        await expect(answerer.locator('[data-phase="question"]')).toHaveAttribute(
          'data-question-number',
          String(question + 1),
          { timeout: 6_000 },
        );
      }
    }

    for (let question = 4; question <= 10; question += 1) {
      const answererIndex = await raceBuzzer(pages);
      const answerer = pages[answererIndex];
      const questionText = await answerer.getByTestId('question-prompt').textContent();
      const source = QUESTIONS.find((item) => item.prompt === questionText);
      if (!source) throw new Error(`内蔵問題が見つかりません: ${questionText}`);
      await answerCorrectly(answerer, source.answer, identities[answererIndex].id);
      await expect(answerer.locator('[data-phase="reveal"]')).toBeVisible();
      if (question < 10) {
        await expect(answerer.locator('[data-phase="question"]')).toHaveAttribute(
          'data-question-number',
          String(question + 1),
          { timeout: 6_000 },
        );
      }
    }

    await Promise.all(pages.map((page) => expect(page.getByTestId('final-results')).toBeVisible()));
    const resultTables = await Promise.all(pages.map((page) => page.getByTestId('final-results').innerText()));
    expect(new Set(resultTables).size).toBe(1);
    await saveScreenshot(pages[0], 'pc-result');
    await saveScreenshot(pages[3], 'mobile-result');
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('real deadlines, five-second offline recovery, and shared server time work', async ({ browser }) => {
  test.setTimeout(90_000);
  const contexts: BrowserContext[] = [];
  const errors: string[] = [];
  try {
    const host = await openPlayer(browser, contexts, errors, { width: 1280, height: 900 });
    const guest = await openPlayer(browser, contexts, errors, { width: 1280, height: 900 });
    const code = await createRoom(host, '時計係');
    await joinRoom(guest, code, '参加者');
    const guestIdentity = await savedIdentity(guest);
    await guest.context().setOffline(true);
    await expect(host.locator(`.player-row[data-player="${guestIdentity.id}"] .connection`))
      .toHaveText('接続が切れています');
    await guest.waitForTimeout(5_000);
    await guest.context().setOffline(false);
    await expect(host.locator(`.player-row[data-player="${guestIdentity.id}"] .connection`)).toHaveText('接続中');

    await host.getByRole('button', { name: 'クイズを開始' }).click();
    await expect(host.locator('[data-phase="question"]')).toBeVisible();
    const timeValues = await Promise.all(
      [host, guest].map((page) => page.getByTestId('remaining-time').getAttribute('data-seconds')),
    );
    expect(Math.abs(Number(timeValues[0]) - Number(timeValues[1]))).toBeLessThanOrEqual(1);

    await expect(host.getByTestId('answer-status')).toContainText('正解は', { timeout: 25_000 });
    await expect(host.locator('[data-phase="question"]')).toHaveAttribute(
      'data-question-number',
      '2',
      { timeout: 6_000 },
    );
    const hostIdentity = await savedIdentity(host);
    await host.getByTestId('buzzer').click();
    await expect(host.getByTestId('answer-status')).toContainText('時計係さんが回答中');
    const hostScore = host.locator(`.score-row[data-player="${hostIdentity.id}"] .score-value`);
    await expect.poll(async () => hostScore.textContent(), { timeout: 15_000 }).toContain('-5');
    await expect(host.locator('[data-phase="question"]')).toHaveAttribute('data-question-number', '2');
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

async function openPlayers(browser: Browser, contexts: BrowserContext[], errors: string[]): Promise<Page[]> {
  const viewports = [
    { width: 1280, height: 900 },
    { width: 1280, height: 900 },
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ];
  return Promise.all(viewports.map((viewport) => openPlayer(browser, contexts, errors, viewport)));
}

async function openPlayer(
  browser: Browser,
  contexts: BrowserContext[],
  errors: string[],
  viewport: { width: number; height: number },
): Promise<Page> {
  const context = await browser.newContext({ viewport });
  contexts.push(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'クイズに参加する' })).toBeVisible();
  return page;
}

async function createRoom(page: Page, name: string): Promise<string> {
  await page.locator('#player-name').fill(name);
  await page.getByRole('button', { name: '部屋を作る' }).click();
  await expect(page.getByTestId('room-code')).toBeVisible();
  return (await page.getByTestId('room-code').textContent()) ?? '';
}

async function joinRoom(page: Page, code: string, name: string, succeeds = true): Promise<void> {
  await page.locator('#player-name').fill(name);
  await page.locator('#room-code').fill(code);
  await page.getByRole('button', { name: '参加する' }).click();
  if (succeeds) await expect(page.getByTestId('room-code')).toHaveText(code);
}

async function savedIdentity(page: Page): Promise<{ id: string; code: string; token: string }> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), sessionKey);
}

async function raceBuzzer(pages: Page[]): Promise<number> {
  await Promise.all(
    pages.map((page) => page.getByTestId('buzzer').evaluate((button) => button.click())),
  );
  await expect.poll(async () => enabledAnswerers(pages)).toHaveLength(1);
  return (await enabledAnswerers(pages))[0];
}

async function enabledAnswerers(pages: Page[]): Promise<number[]> {
  const values = await Promise.all(pages.map((page) => page.locator('[data-choice="0"]').isEnabled()));
  return values.flatMap((enabled, index) => enabled ? [index] : []);
}

async function answerCorrectly(page: Page, choice: number, playerId: string): Promise<void> {
  const score = page.locator(`.score-row[data-player="${playerId}"] .score-value`);
  const before = Number.parseInt(await score.innerText(), 10);
  await page.locator(`[data-choice="${choice}"]`).click();
  await expect.poll(async () => Number.parseInt(await score.innerText(), 10)).toBe(before + 10);
}

async function saveScreenshot(page: Page, filename: string): Promise<void> {
  await page.screenshot({ path: path.join(evidenceDirectory, `${filename}.png`) });
}
