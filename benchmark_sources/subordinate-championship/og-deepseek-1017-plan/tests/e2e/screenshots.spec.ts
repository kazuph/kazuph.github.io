import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  answerCorrectly,
  closeTracked,
  MOBILE_VIEWPORT,
  PC_VIEWPORT,
  resetTracked,
  setupTwo,
  startGame,
  waitForQuestion,
} from './helpers';

const ARTIFACTS = '.artifacts';

async function shot(page: Page, file: string, fullPage = false): Promise<void> {
  // レイアウトが落ち着いてから撮る。
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${ARTIFACTS}/${file}`, fullPage });
}

test.beforeAll(() => mkdirSync(ARTIFACTS, { recursive: true }));
test.beforeEach(() => resetTracked());
test.afterEach(async () => closeTracked());

test('9. ロビー・出題中・回答中・結果を PC幅とスマホ幅で撮影する', async ({ browser }) => {
  // players[0] = PC幅, players[1] = スマホ幅（390x844）
  const { players } = await setupTwo(browser, [PC_VIEWPORT, MOBILE_VIEWPORT]);
  const [pc, mobile] = players;

  await shot(pc.page, 'lobby-pc.png', true);
  await shot(mobile.page, 'lobby-mobile.png', true);

  await startGame(players);

  // スマホ幅では問題文と早押しボタンがスクロールせずに見える
  await expect(mobile.page.getByTestId('question-text')).toBeInViewport();
  await expect(mobile.page.getByTestId('buzz-btn')).toBeInViewport();

  await shot(pc.page, 'question-pc.png');
  await shot(mobile.page, 'question-mobile.png');

  // スマホ幅のプレイヤーが回答権を得た状態
  await mobile.page.getByTestId('buzz-btn').click();
  await expect(mobile.page.getByTestId('choice-0')).toBeEnabled();
  await expect(pc.page.getByTestId('banner')).toContainText('回答中');
  await shot(pc.page, 'answering-pc.png');
  await shot(mobile.page, 'answering-mobile.png');

  // 1問目をスマホ幅のプレイヤーが正解して、残りは PC 幅のプレイヤーが進める
  await answerCorrectly(mobile);
  await waitForQuestion(players, 2);
  for (let q = 2; q <= 10; q++) {
    await pc.page.getByTestId('buzz-btn').click();
    await expect(pc.page.getByTestId('choice-0')).toBeEnabled();
    await answerCorrectly(pc);
    if (q < 10) await waitForQuestion(players, q + 1);
  }

  for (const p of players) {
    await expect(p.page.getByTestId('ranking')).toBeVisible({ timeout: 20_000 });
  }
  await shot(pc.page, 'result-pc.png', true);
  await shot(mobile.page, 'result-mobile.png', true);
});
