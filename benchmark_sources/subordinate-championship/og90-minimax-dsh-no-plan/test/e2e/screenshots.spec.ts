import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { answerCorrectly, joinRoom, startGame, waitForQuestion } from './helpers';

/**
 * 画面スクリーンショットの保存
 * 出力先: .artifacts/<pc|mobile>/{lobby,question,answering,result}.png
 */

const ARTIFACTS = path.resolve(process.cwd(), '.artifacts');

test.describe('スクリーンショット', () => {
  test('ロビー / 出題中 / 回答中 / 結果 を保存する', async ({ browser }, testInfo) => {
    test.setTimeout(180_000);
    const width = testInfo.project.use.viewport?.width ?? 1280;
    const dir = path.join(ARTIFACTS, testInfo.project.name);
    await mkdir(dir, { recursive: true });

    const ctx1 = await browser.newContext({ viewport: testInfo.project.use.viewport as any });
    const ctx2 = await browser.newContext({ viewport: testInfo.project.use.viewport as any });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    // --- ホーム（参加画面） ---
    await page1.goto('/');
    await expect(page1.locator('#screen-home')).toBeVisible();
    await page1.screenshot({ path: path.join(dir, 'home.png'), fullPage: false });
    console.log(`[screenshot] ${path.join(dir, 'home.png')} (${width}px)`);

    // --- ロビー ---
    const code = await joinRoom(page1, 'アキ');
    await joinRoom(page2, 'Bobby', code);
    await expect(page1.locator('#lobby-players .player-row:not(.empty-slot)')).toHaveCount(2);
    await page1.screenshot({ path: path.join(dir, 'lobby.png'), fullPage: false });
    console.log(`[screenshot] ${path.join(dir, 'lobby.png')} (${width}px)`);

    // --- 開始 / 出題中 ---
    await startGame(page1);
    await waitForQuestion(page1);
    await expect(page1.locator('#buzzer')).toBeEnabled();
    await page1.screenshot({ path: path.join(dir, 'question.png'), fullPage: false });
    console.log(`[screenshot] ${path.join(dir, 'question.png')} (${width}px)`);

    // --- 回答中 ---
    await page1.click('#buzzer');
    await expect(page1.locator('#answer-status.is-you')).toBeVisible();
    await page1.screenshot({ path: path.join(dir, 'answering.png'), fullPage: false });
    console.log(`[screenshot] ${path.join(dir, 'answering.png')} (${width}px)`);

    // 1問目を正解して終える（この問題では同じプレイヤーは押せないため）
    await answerCorrectly(page1);
    await expect(page1.locator('.option.is-correct')).toHaveCount(1, { timeout: 20000 });

    // --- 結果（残り9問を正解して消費する） ---
    for (let q = 1; q < 10; q++) {
      await waitForQuestion(page1, q);
      await expect(page1.locator('#buzzer')).toBeEnabled({ timeout: 20000 });
      await page1.click('#buzzer');
      await expect(page1.locator('#answer-status.is-you')).toBeVisible({ timeout: 20000 });
      await answerCorrectly(page1);
      await expect(page1.locator('.option.is-correct')).toHaveCount(1, { timeout: 20000 });
    }
    await expect(page1.locator('#screen-result')).toBeVisible({ timeout: 30000 });
    await page1.screenshot({ path: path.join(dir, 'result.png'), fullPage: false });
    console.log(`[screenshot] ${path.join(dir, 'result.png')} (${width}px)`);

    await Promise.all([ctx1.close(), ctx2.close()]);
  });
});
