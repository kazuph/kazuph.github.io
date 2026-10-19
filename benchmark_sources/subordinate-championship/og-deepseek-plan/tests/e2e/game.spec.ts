import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  MOBILE_VIEWPORT,
  PC_VIEWPORT,
  correctIndexForText,
  countAnswerers,
  countPagesWithEnabledChoices,
  closePlayers,
  createRoom,
  getScore,
  joinRoom,
  newPlayer,
  phaseOf,
  playAllQuestions,
  readRanking,
  resolveCurrentQuestion,
  startGame,
  waitForAllPhase,
  waitForOneAnswerer,
  waitForPhase,
  waitForScore,
} from './helpers';

async function fourPlayers(browser: Browser): Promise<{
  contexts: BrowserContext[];
  pages: Page[];
  code: string;
}> {
  const created = await Promise.all([
    newPlayer(browser, PC_VIEWPORT),
    newPlayer(browser, PC_VIEWPORT),
    newPlayer(browser, PC_VIEWPORT),
    newPlayer(browser, MOBILE_VIEWPORT),
  ]);
  const pages = created.map((entry) => entry.page);
  const code = await createRoom(pages[0], 'あおい');
  await joinRoom(pages[1], 'びび', code);
  await joinRoom(pages[2], 'しー', code);
  await joinRoom(pages[3], 'でぃ', code);
  return { contexts: created.map((entry) => entry.context), pages, code };
}

test('4人が同じ部屋で遊べ、5人目は満員と表示される', async ({ browser }) => {
  const { contexts, pages, code } = await fourPlayers(browser);
  await expect(pages[0].getByTestId('lobby-count')).toHaveText('4');
  for (const page of pages) {
    await expect(page.getByTestId('lobby-players').locator('.seat:not(.is-empty)')).toHaveCount(
      4,
    );
  }

  const fifth = await newPlayer(browser);
  await fifth.page.goto('/');
  await fifth.page.fill('#player-name', 'いー');
  await fifth.page.fill('#room-code', code);
  await fifth.page.click('#join-button');
  await expect(fifth.page.locator('#entry-message')).toContainText('満員');
  await expect(fifth.page.locator('#view-lobby')).toBeHidden();
  await fifth.context.close();
  await closePlayers(contexts);
});

test('4人が同時に押しても回答権は1人だけ（3問くり返し）', async ({ browser }) => {
  const { contexts, pages } = await fourPlayers(browser);
  await startGame(pages[0], 4);

  for (let questionNumber = 1; questionNumber <= 3; questionNumber += 1) {
    await waitForAllPhase(pages, 'question');
    await expect(pages[0].getByTestId('question-number')).toHaveText(`第${questionNumber}問`);

    await Promise.all(
      pages.map((page) =>
        page
          .getByTestId('buzz-button')
          .click({ timeout: 5_000 })
          .catch(() => undefined),
      ),
    );

    await waitForOneAnswerer(pages);
    expect(await countAnswerers(pages)).toBe(1);
    expect(await countPagesWithEnabledChoices(pages)).toBe(1);

    await resolveCurrentQuestion(pages);
    await waitForAllPhase(pages, 'reveal', 8_000);
  }

  await closePlayers(contexts);
});

test('不正解は全員の画面で -5点になり、その人はもう押せない', async ({ browser }) => {
  const { contexts, pages } = await fourPlayers(browser);
  const victim = pages[1];
  const victimName = 'びび';
  await startGame(pages[0], 4);
  await waitForAllPhase(pages, 'question');

  const questionText = (await victim.getByTestId('question-text').textContent()) ?? '';
  const correct = correctIndexForText(questionText);
  const wrong = (correct + 1) % 4;

  await victim.getByTestId('buzz-button').click();
  await waitForAllPhase(pages, 'answering', 8_000);
  await expect(victim.getByTestId('answering-you')).toBeVisible();

  const before = await getScore(victim, victimName);
  await victim.getByTestId('choice').nth(wrong).click();

  await waitForPhase(victim, 'question', 8_000);
  for (const page of pages) {
    await waitForScore(page, victimName, before - 5);
  }
  await expect(victim.getByTestId('buzz-button')).toBeDisabled();
  await expect(victim.getByTestId('buzz-button')).toContainText('回答済み');

  await resolveCurrentQuestion(pages);
  await closePlayers(contexts);
});

test('再読み込みしても同じ名前・同じ点数で復帰する', async ({ browser }) => {
  const { contexts, pages } = await fourPlayers(browser);
  const guest = pages[2];
  const guestName = 'しー';
  await startGame(pages[0], 4);
  await waitForAllPhase(pages, 'question');

  const questionText = (await guest.getByTestId('question-text').textContent()) ?? '';
  const correct = correctIndexForText(questionText);
  await guest.getByTestId('buzz-button').click();
  await waitForAllPhase(pages, 'answering', 8_000);
  await guest.getByTestId('choice').nth(correct).click();
  await waitForAllPhase(pages, 'reveal', 8_000);
  await waitForScore(guest, guestName, 10);

  await guest.reload();
  await expect(guest.locator('#view-game')).toBeVisible({ timeout: 15_000 });
  await waitForScore(guest, guestName, 10);
  await expect(guest.locator('#view-entry')).toBeHidden();
  await expect(guest.getByTestId('player-row').filter({ hasText: guestName })).toBeVisible();

  await closePlayers(contexts);
});

test('回線を切って戻すと自動で再接続し、切断表示が消える', async ({ browser }) => {
  const { contexts, pages } = await fourPlayers(browser);
  const victimIndex = 2;
  const victim = pages[victimIndex];
  const victimName = 'しー';
  const observer = pages[0];
  await startGame(pages[0], 4);
  await waitForAllPhase(pages, 'question');

  await contexts[victimIndex].setOffline(true);
  await expect(observer.getByTestId('offline-note')).toBeVisible({ timeout: 20_000 });
  await expect(observer.getByTestId('offline-note')).toContainText('接続が切れています');
  await expect(observer.getByTestId('offline-note')).toContainText(victimName);

  await contexts[victimIndex].setOffline(false);
  await expect(observer.getByTestId('offline-note')).toBeHidden({ timeout: 20_000 });
  await expect(victim.locator('#view-game')).toBeVisible({ timeout: 15_000 });
  await expect(victim.getByTestId('player-row').filter({ hasText: victimName })).toBeVisible();

  await closePlayers(contexts);
});

test('誰も押さなければ実時間20秒で正解、回答しなければ10秒で -5', async ({ browser }) => {
  const first = await newPlayer(browser);
  const second = await newPlayer(browser);
  const pages = [first.page, second.page];
  const code = await createRoom(pages[0], 'あおい');
  await joinRoom(pages[1], 'びび', code);
  await startGame(pages[0], 2);
  await waitForAllPhase(pages, 'question');

  const questionText = (await pages[0].getByTestId('question-text').textContent()) ?? '';
  const correct = correctIndexForText(questionText);
  const noAnswerStartedAt = Date.now();
  await waitForAllPhase(pages, 'reveal', 25_000);
  const noAnswerElapsed = Date.now() - noAnswerStartedAt;
  expect(noAnswerElapsed).toBeGreaterThanOrEqual(19_000);
  expect(noAnswerElapsed).toBeLessThan(24_000);
  await expect(pages[0].getByTestId('reveal-status')).toContainText('正解は');
  await expect(pages[0].getByTestId('choice').nth(correct)).toHaveClass(/is-correct/);

  await waitForAllPhase(pages, 'question', 8_000);
  const buzzAt = Date.now();
  await pages[0].getByTestId('buzz-button').click();
  await waitForAllPhase(pages, 'answering', 5_000);
  await expect
    .poll(async () => getScore(pages[0], 'あおい'), { timeout: 15_000, intervals: [100, 200] })
    .toBe(-5);
  const timeoutElapsed = Date.now() - buzzAt;
  expect(timeoutElapsed).toBeGreaterThanOrEqual(9_500);
  expect(timeoutElapsed).toBeLessThan(14_000);
  await expect(pages[0].getByTestId('buzz-button')).toBeDisabled();

  await closePlayers([first.context, second.context]);
});

test('4つの画面で残り時間と回答中の表示がそろう', async ({ browser }) => {
  const { contexts, pages } = await fourPlayers(browser);
  await startGame(pages[0], 4);
  await waitForAllPhase(pages, 'question');

  const readTimers = async () =>
    Promise.all(
      pages.map(async (page) => Number(await page.getByTestId('timer-seconds').textContent())),
    );

  const questionTimers = await readTimers();
  expect(Math.max(...questionTimers) - Math.min(...questionTimers)).toBeLessThanOrEqual(1);

  await pages[0].getByTestId('buzz-button').click();
  await waitForAllPhase(pages, 'answering', 8_000);
  const answeringTimers = await readTimers();
  expect(Math.max(...answeringTimers) - Math.min(...answeringTimers)).toBeLessThanOrEqual(1);

  for (const page of pages) {
    const answeringYou = await page.getByTestId('answering-you').isVisible();
    const status = (await page.getByTestId('answer-status').textContent()) ?? '';
    expect(answeringYou || status.includes('あおい')).toBe(true);
  }

  const scores = await Promise.all(pages.map((page) => getScore(page, 'びび')));
  expect(new Set(scores).size).toBe(1);

  await closePlayers(contexts);
});

test('10問を最後まで遊ぶと、4つの画面に同じ最終順位が出る', async ({ browser }) => {
  test.setTimeout(240_000);
  const { contexts, pages } = await fourPlayers(browser);
  await startGame(pages[0], 4);
  await playAllQuestions(pages);

  for (const page of pages) {
    await expect(page.locator('#view-result')).toBeVisible({ timeout: 10_000 });
  }
  const rankings = await Promise.all(pages.map((page) => readRanking(page)));
  expect(rankings[0]).toHaveLength(4);
  for (const ranking of rankings) {
    expect(ranking).toEqual(rankings[0]);
  }
  expect(rankings[0].map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);

  await closePlayers(contexts);
});

test('早押しボタンはスペースキーでも押せる', async ({ browser }) => {
  const first = await newPlayer(browser);
  const second = await newPlayer(browser);
  const pages = [first.page, second.page];
  const code = await createRoom(pages[0], 'あおい');
  await joinRoom(pages[1], 'びび', code);
  await startGame(pages[0], 2);
  await waitForAllPhase(pages, 'question');

  await pages[0].locator('body').press('Space');
  await waitForPhase(pages[0], 'answering', 5_000);
  await expect(pages[0].getByTestId('answering-you')).toBeVisible();
  expect(await phaseOf(pages[1])).toBe('answering');

  await closePlayers([first.context, second.context]);
});
