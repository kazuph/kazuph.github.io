import { expect, test } from '@playwright/test';
import {
  answerCorrectly,
  answeringPlayer,
  clickBuzzTogether,
  closeTracked,
  correctIndexFor,
  joinRoom,
  newPlayer,
  PC_VIEWPORT,
  MOBILE_VIEWPORT,
  playerCard,
  readQuestionText,
  readScore,
  resetTracked,
  setupFour,
  setupTwo,
  startGame,
  waitForQuestion,
} from './helpers';

test.beforeEach(() => resetTracked());
test.afterEach(async () => closeTracked());

test('1. 定員は4人で、5人目には理由が出る', async ({ browser }) => {
  // PC幅3つ + スマホ幅1つの独立したブラウザ
  const players = await setupFour(browser, [PC_VIEWPORT, PC_VIEWPORT, PC_VIEWPORT, MOBILE_VIEWPORT]);
  await expect(players[0].page.getByTestId('lobby-players').locator('li')).toHaveCount(4);

  const fifth = await newPlayer(browser, 'P4');
  await joinRoom(fifth, (await players[0].page.getByTestId('lobby-code').textContent())!.trim());
  await expect(fifth.page.getByTestId('entry-error')).toHaveText('満員です（4人まで）');
  // 5人目はロビーに入れず、4人のまま
  await expect(fifth.page.getByTestId('screen-lobby')).toBeHidden();
  await expect(players[0].page.getByTestId('lobby-players').locator('li')).toHaveCount(4);
});

test('2. 4人が同時に押しても回答権はちょうど1人（3問くり返す）', async ({ browser }) => {
  const players = await setupFour(browser);
  await startGame(players);

  for (let round = 0; round < 3; round++) {
    await waitForQuestion(players, round + 1);

    await clickBuzzTogether(players);

    // 4択が有効な画面がちょうど1つ
    await expect
      .poll(
        async () => {
          let count = 0;
          for (const p of players) {
            if (await p.page.getByTestId('choice-0').isEnabled()) count += 1;
          }
          return count;
        },
        { timeout: 10_000, message: '回答権は1人だけのはず' },
      )
      .toBe(1);

    const winner = await answeringPlayer(players);
    await answerCorrectly(winner);

    if (round < 2) {
      await waitForQuestion(players, round + 2);
    }
  }
});

test('3. 不正解を選ぶと全員の画面で -5 点になり、その人はもう押せない', async ({ browser }) => {
  const players = await setupFour(browser);
  await startGame(players);

  const answerer = players[1];
  await answerer.page.getByTestId('buzz-btn').click();
  await expect(answerer.page.getByTestId('choice-0')).toBeEnabled();

  const text = await readQuestionText(answerer);
  const wrong = (correctIndexFor(text) + 1) % 4;
  await answerer.page.getByTestId(`choice-${wrong}`).click();

  for (const p of players) {
    await expect(playerCard(p, 'P1').locator('.p-score')).toHaveText('-5');
  }
  await expect(answerer.page.getByTestId('buzz-hint')).toContainText('この問題はもう押せません');
  await expect(answerer.page.getByTestId('buzz-btn')).toBeDisabled();
});

test('3b. 全員が不正解になると正解が表示され、次の問題へ進む', async ({ browser }) => {
  const { players } = await setupTwo(browser);
  await startGame(players);

  for (const player of players) {
    await player.page.getByTestId('buzz-btn').click();
    await expect(player.page.getByTestId('choice-0')).toBeEnabled();
    const text = await readQuestionText(player);
    const wrong = (correctIndexFor(text) + 1) % 4;
    await player.page.getByTestId(`choice-${wrong}`).click();
  }

  for (const p of players) {
    await expect(p.page.getByTestId('banner')).toContainText('不正解');
    await expect(p.page.locator('.choice.is-correct')).toBeVisible();
  }
  // 正解表示の3秒のあと次の問題へ進む（負荷で遅れても拾えるよう長めに待つ）
  await waitForQuestion(players, 2, 45_000);
});

test('4. 再読み込みしても同じ名前・点数で復帰する', async ({ browser }) => {
  const players = await setupFour(browser);
  await startGame(players);

  const answerer = players[1];
  await answerer.page.getByTestId('buzz-btn').click();
  await expect(answerer.page.getByTestId('choice-0')).toBeEnabled();
  await answerCorrectly(answerer);
  await expect(playerCard(players[0], 'P1').locator('.p-score')).toHaveText('10');

  await answerer.page.reload();

  await expect(answerer.page.getByTestId('players')).toBeVisible();
  await expect(playerCard(answerer, 'P1').locator('.p-score')).toHaveText('10');
  await expect(playerCard(answerer, 'P1')).toContainText('（あなた）');
  // 復帰後も操作できる（次の問題で押せる）
  await expect
    .poll(async () => answerer.page.getByTestId('buzz-btn').isEnabled(), { timeout: 10_000 })
    .toBe(true);
});

test('5. 回線を5秒切って戻すと自動で再接続し、ほかの画面の表示が消える', async ({ browser }) => {
  const players = await setupFour(browser);
  await startGame(players);

  const target = players[1];
  await target.context.setOffline(true);
  for (const p of players) {
    if (p === target) continue;
    await expect(p.page.getByTestId('players')).toContainText('接続が切れています');
  }

  await target.page.waitForTimeout(5000);
  await target.context.setOffline(false);

  for (const p of players) {
    if (p === target) continue;
    await expect(p.page.getByTestId('players')).not.toContainText('接続が切れています', {
      timeout: 20_000,
    });
  }
});

test('6a. 誰も答えないと実時間の20秒で正解が表示される', async ({ browser }) => {
  const players = await setupFour(browser);
  await startGame(players);

  await expect(players[0].page.getByTestId('banner')).toContainText('時間切れ', { timeout: 25_000 });
  for (const p of players) {
    await expect(p.page.locator('.choice.is-correct')).toBeVisible();
  }
  await waitForQuestion(players, 2);
});

test('6b. 回答権を得て何も選ばないと実時間の10秒で -5 点になる', async ({ browser }) => {
  const { players } = await setupTwo(browser);
  await startGame(players);

  const answerer = players[0];
  await answerer.page.getByTestId('buzz-btn').click();
  await expect(answerer.page.getByTestId('choice-0')).toBeEnabled();

  await expect(playerCard(players[1], 'P0').locator('.p-score')).toHaveText('-5', { timeout: 15_000 });
  // 残りの人で早押しが再開する
  await expect(players[1].page.getByTestId('buzz-btn')).toBeEnabled();
});

test('7. 4つの画面の残り時間の差が1秒以内', async ({ browser }) => {
  const players = await setupFour(browser);
  await startGame(players);
  await waitForQuestion(players, 1);

  const values = await Promise.all(
    players.map(async (p) => Number.parseFloat((await p.page.getByTestId('timer-text').textContent()) ?? '0')),
  );
  const diff = Math.max(...values) - Math.min(...values);
  expect(diff).toBeLessThanOrEqual(1);
});

test('8. 10問遊び切ると4つの画面に同じ最終順位が出る', async ({ browser }) => {
  const players = await setupFour(browser);
  await startGame(players);

  for (let q = 0; q < 10; q++) {
    await waitForQuestion(players, q + 1);
    const winner = players[q % 4];
    await winner.page.getByTestId('buzz-btn').click();
    await expect(winner.page.getByTestId('choice-0')).toBeEnabled();
    await answerCorrectly(winner);
    if (q < 9) await waitForQuestion(players, q + 2);
  }

  for (const p of players) {
    await expect(p.page.getByTestId('ranking')).toBeVisible({ timeout: 20_000 });
  }
  const rankings = await Promise.all(
    players.map(async (p) => ((await p.page.getByTestId('ranking').textContent()) ?? '').replace(/（あなた）/g, '')),
  );
  expect(new Set(rankings).size).toBe(1);
  // 期待どおりの点数（P0, P1 が 30 点で同率1位）
  const scores = await Promise.all(players.map((p) => readScore(players[0], p.name)));
  expect(scores).toEqual([30, 30, 20, 20]);
});
