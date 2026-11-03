import { expect, type Page } from '@playwright/test';
import { QUESTIONS } from '../../src/questions';

/** 名前を入れて部屋に参加（code を渡さない場合は新規作成） */
export async function joinRoom(page: Page, name: string, code?: string): Promise<string> {
  await page.goto('/');
  await page.fill('#name-input', name);
  if (code) {
    await page.fill('#code-input', code);
    await page.click('#join-room');
  } else {
    await page.click('#create-room');
  }
  await expect(page.locator('#screen-lobby')).toBeVisible();
  const roomCode = (await page.locator('#room-code').textContent())?.trim() ?? '';
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
  return roomCode;
}

/** ホストがゲームを開始する */
export async function startGame(page: Page): Promise<void> {
  await expect(page.locator('#start-game')).toBeVisible();
  await page.click('#start-game');
  await expect(page.locator('#screen-game')).toBeVisible();
  await expect(page.locator('#buzzer')).toBeVisible();
}

/** 問題の表示を待つ */
export async function waitForQuestion(page: Page, index = 0): Promise<void> {
  await expect(page.locator('#question-counter')).toContainText(`第 ${index + 1} 問`);
  await expect(page.locator('#question-text')).not.toHaveText('…');
}

/** 現在のスコア（名前 → 点数）を読む */
export async function readScores(page: Page): Promise<Record<string, number>> {
  const scores: Record<string, number> = {};
  const rows = page.locator('#score-list .player-row:not(.empty-slot)');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const name = ((await row.locator('.player-name').textContent()) ?? '').trim();
    const scoreText = ((await row.locator('.player-score').textContent()) ?? '0').trim();
    if (name) scores[name] = Number(scoreText);
  }
  return scores;
}

/** 出題中の問題文から正解の選択肢を探して押す */
export async function answerCorrectly(page: Page): Promise<void> {
  const text = (await page.locator('#question-text').textContent())?.trim() ?? '';
  const question = QUESTIONS.find((q) => q.text === text);
  expect(question, `問題文が一致しません: ${text}`).toBeTruthy();
  await page.locator('.option').nth(question!.correct).click();
}

/** 出題中の問題文から「正解ではない」選択肢を選んで押す */
export async function answerWrongly(page: Page): Promise<void> {
  const text = (await page.locator('#question-text').textContent())?.trim() ?? '';
  const question = QUESTIONS.find((q) => q.text === text);
  expect(question, `問題文が一致しません: ${text}`).toBeTruthy();
  const wrong = (question!.correct + 1) % 4;
  await page.locator('.option').nth(wrong).click();
}
