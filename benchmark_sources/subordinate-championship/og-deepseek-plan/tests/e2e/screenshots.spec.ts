import { expect, test } from '@playwright/test';
import {
  MOBILE_VIEWPORT,
  PC_VIEWPORT,
  closePlayers,
  correctIndexForText,
  createRoom,
  joinRoom,
  newPlayer,
  resolveCurrentQuestion,
  screenshot,
  startGame,
  waitForAllPhase,
} from './helpers';

test('ロビー・出題中・回答中・結果をPC幅とスマホ幅で保存する', async ({ browser }) => {
  test.setTimeout(180_000);
  const host = await newPlayer(browser, PC_VIEWPORT);
  const guest = await newPlayer(browser, MOBILE_VIEWPORT);
  const hostPage = host.page;
  const guestPage = guest.page;

  const code = await createRoom(hostPage, 'あおい');
  await joinRoom(guestPage, 'びび', code);
  await expect(guestPage.getByTestId('lobby-count')).toHaveText('2');
  await expect(hostPage.getByTestId('lobby-count')).toHaveText('2');
  await screenshot(hostPage, 'pc-lobby');
  await screenshot(guestPage, 'mobile-lobby');

  await startGame(hostPage, 2);
  await waitForAllPhase([hostPage, guestPage], 'question');
  await screenshot(hostPage, 'pc-question');
  await screenshot(guestPage, 'mobile-question');

  const viewport = guestPage.viewportSize();
  expect(viewport).not.toBeNull();
  for (const testId of ['question-text', 'buzz-button']) {
    const box = await guestPage.getByTestId(testId).boundingBox();
    expect(box).not.toBeNull();
    if (!box || !viewport) continue;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }
  expect(await guestPage.evaluate(() => window.scrollY)).toBe(0);

  await guestPage.getByTestId('buzz-button').click();
  await waitForAllPhase([hostPage, guestPage], 'answering');
  await expect(guestPage.getByTestId('answering-you')).toBeVisible();
  await screenshot(hostPage, 'pc-answering');
  await screenshot(guestPage, 'mobile-answering');

  const questionText = (await guestPage.getByTestId('question-text').textContent()) ?? '';
  const correct = correctIndexForText(questionText);
  await guestPage.getByTestId('choice').nth(correct).click();
  await waitForAllPhase([hostPage, guestPage], 'reveal');
  await resolveCurrentQuestion([hostPage, guestPage]);
  await waitForAllPhase([hostPage, guestPage], 'reveal', 8_000);

  for (let questionNumber = 2; questionNumber <= 10; questionNumber += 1) {
    await waitForAllPhase([hostPage, guestPage], 'question', 10_000);
    await expect(hostPage.getByTestId('question-number')).toHaveText(`第${questionNumber}問`);
    await resolveCurrentQuestion([hostPage, guestPage]);
    await waitForAllPhase([hostPage, guestPage], 'reveal', 8_000);
  }
  await waitForAllPhase([hostPage, guestPage], 'finished', 8_000);

  await expect(hostPage.locator('#view-result')).toBeVisible();
  await expect(guestPage.locator('#view-result')).toBeVisible();
  await screenshot(hostPage, 'pc-result');
  await screenshot(guestPage, 'mobile-result');

  await closePlayers([host.context, guest.context]);
});
