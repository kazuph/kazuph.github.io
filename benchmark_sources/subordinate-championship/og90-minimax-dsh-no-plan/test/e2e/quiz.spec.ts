import { expect, test } from '@playwright/test';
import { answerCorrectly, answerWrongly, joinRoom, readScores, startGame, waitForQuestion } from './helpers';

/**
 * 4人が同時に遊べる早押しクイズの E2E テスト
 * - ロビー / 開始 / 同時早押し / 再読み込みでの復帰 / 結果
 */

test.describe('4人対戦の早押しクイズ', () => {
  test('4人全員が同じ部屋に入り、全員に同じ画面が見える', async ({ browser }) => {
    const pages = [];
    const names = ['アキ', 'Bobby', 'みかん', '太郎'];
    for (const name of names) {
      const context = await browser.newContext();
      const page = await context.newPage();
      pages.push(page);
    }

    // 1人目が部屋を作る
    const code = await joinRoom(pages[0], names[0]);
    // 残り3人が参加
    for (let i = 1; i < pages.length; i++) {
      await joinRoom(pages[i], names[i], code);
    }

    // 全員の画面に参加者が 4 人見える
    for (const page of pages) {
      await expect(page.locator('#lobby-players .player-row')).toHaveCount(4);
      await expect(page.locator('#player-count')).toHaveText('4 / 4');
    }

    // ホストだけが開始ボタン能看到
    await expect(pages[0].locator('#start-game')).toBeVisible();
    await expect(pages[1].locator('#start-game')).toHaveCount(0);

    await pages.forEach((p) => p.context().close());
  });

  test('5人目は入れず、理由が画面に出る', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const code = await joinRoom(page1, 'アキ');

    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await joinRoom(page2, 'Bobby', code);

    const ctx3 = await browser.newContext();
    const page3 = await ctx3.newPage();
    await joinRoom(page3, 'みかん', code);

    const ctx4 = await browser.newContext();
    const page4 = await ctx4.newPage();
    await joinRoom(page4, '太郎', code);

    // 5人目
    const ctx5 = await browser.newContext();
    const page5 = await ctx5.newPage();
    await page5.goto('/');
    await page5.fill('#name-input', '五郎');
    await page5.fill('#code-input', code);
    await page5.click('#join-room');

    await expect(page5.locator('#screen-error')).toBeVisible();
    await expect(page5.locator('#error-message')).toContainText('定員4人まで');
    // 既存 4 人の人数は変わらない
    await expect(page1.locator('#player-count')).toHaveText('4 / 4');

    await Promise.all([ctx1.close(), ctx2.close(), ctx3.close(), ctx4.close(), ctx5.close()]);
  });

  test('同時に早押ししても 1 人だけが回答権を得る', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    const code = await joinRoom(page1, 'アキ');
    await joinRoom(page2, 'Bobby', code);

    await startGame(page1);
    await waitForQuestion(page1);
    await waitForQuestion(page2);

    // 2 人が同時に早押し
    await Promise.all([page1.click('#buzzer'), page2.click('#buzzer')]);

    // 片方だけが「あなたの回答権！」になる（どちらが先でも構わない）
    await expect
      .poll(
        async () =>
          (await page1.locator('#answer-status.is-you').count()) +
          (await page2.locator('#answer-status.is-you').count()),
        { timeout: 15000 },
      )
      .toBe(1);
    const mine = await page1.locator('#answer-status.is-you').count();
    const theirs = await page2.locator('#answer-status.is-you').count();
    expect(mine + theirs).toBe(1);

    // 回答権を持つ側だけが選択肢を押せる
    const answerer = mine === 1 ? page1 : page2;
    const other = mine === 1 ? page2 : page1;
    await expect(answerer.locator('.option').first()).toBeEnabled();
    await expect(other.locator('.option').first()).toBeDisabled();

    await Promise.all([ctx1.close(), ctx2.close()]);
  });

  test('正解は +10 点、全員の画面に同じ点数が見える', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    const code = await joinRoom(page1, 'アキ');
    await joinRoom(page2, 'Bobby', code);
    await startGame(page1);
    await waitForQuestion(page1);

    await page1.click('#buzzer');
    await expect(page1.locator('#answer-status.is-you')).toBeVisible();

    // 正解を選ぶ（正解判定はサーバーが行う）
    await answerCorrectly(page1);

    // 正解は +10 点
    await expect.poll(async () => (await readScores(page1))['アキ'], { timeout: 15000 }).toBe(10);
    // 2 人目の画面にも同じ点数が見える
    await expect.poll(async () => (await readScores(page2))['アキ'], { timeout: 15000 }).toBe(10);

    await Promise.all([ctx1.close(), ctx2.close()]);
  });

  test('不正解の人はその問題で押せなくなり、残りの人で早押しを再開する', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    const code = await joinRoom(page1, 'アキ');
    await joinRoom(page2, 'Bobby', code);
    await startGame(page1);
    await waitForQuestion(page1);

    // 1人目が早押しして不正解
    await page1.click('#buzzer');
    await expect(page1.locator('#answer-status.is-you')).toBeVisible();
    await answerWrongly(page1);
    await expect.poll(async () => (await readScores(page1))['アキ'], { timeout: 15000 }).toBe(-5);

    // 不正解の人はこの問題では押せない
    await expect(page1.locator('#buzzer')).toBeDisabled();
    await expect(page1.locator('#phase-note')).toContainText('回答できません');

    // 残りの人で早押しが再開される
    await expect(page2.locator('#buzzer')).toBeEnabled({ timeout: 15000 });
    await page2.click('#buzzer');
    await expect(page2.locator('#answer-status.is-you')).toBeVisible();
    await answerCorrectly(page2);
    await expect.poll(async () => (await readScores(page2))['Bobby'], { timeout: 15000 }).toBe(10);

    await Promise.all([ctx1.close(), ctx2.close()]);
  });

  test('再読み込みしても同じプレイヤーとして点数を保ったまま復帰する', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    const code = await joinRoom(page1, 'アキ');
    await joinRoom(page2, 'Bobby', code);
    await startGame(page1);
    await waitForQuestion(page1);

    await page1.click('#buzzer');
    await expect(page1.locator('#answer-status.is-you')).toBeVisible();
    await answerCorrectly(page1);
    await expect.poll(async () => (await readScores(page1))['アキ'], { timeout: 15000 }).toBe(10);
    const scoreBefore = (await readScores(page1))['アキ'];

    // 再読み込み
    await page1.reload();
    await expect(page1.locator('#screen-game')).toBeVisible();
    await expect(page1.locator('#score-list')).toContainText('アキ');
    await expect
      .poll(async () => (await readScores(page1))['アキ'], { timeout: 15000 })
      .toBe(scoreBefore);

    // 相手から見ても同じ名前・同じ点数で接続中になっている
    await expect.poll(async () => (await readScores(page2))['アキ'], { timeout: 15000 }).toBe(scoreBefore);

    await Promise.all([ctx1.close(), ctx2.close()]);
  });

  test('10問終了後に最終順位が全員の画面に出る', async ({ browser }) => {
    test.setTimeout(180_000);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    const code = await joinRoom(page1, 'アキ');
    await joinRoom(page2, 'Bobby', code);
    await startGame(page1);

    // 1 人が正解し続けて 10 問を消化する
    for (let q = 0; q < 10; q++) {
      await waitForQuestion(page1, q);
      await expect(page1.locator('#buzzer')).toBeEnabled();
      await page1.click('#buzzer');
      await expect(page1.locator('#answer-status.is-you')).toBeVisible();
      await answerCorrectly(page1);
      // 正解を表示してから次の問題へ
      await expect(page1.locator('.option.is-correct')).toHaveCount(1, { timeout: 20000 });
    }

    await expect(page1.locator('#screen-result')).toBeVisible({ timeout: 30000 });
    await expect(page1.locator('#ranking li')).toHaveCount(2);
    // 相手にも最終順位が見える
    await expect(page2.locator('#screen-result')).toBeVisible({ timeout: 30000 });
    await expect(page2.locator('#ranking li')).toHaveCount(2);

    await Promise.all([ctx1.close(), ctx2.close()]);
  });
});
