import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// 実ブラウザで4人（別々のブラウザ）が遊ぶ E2E。PC幅とスマホ幅の両方で実行する。
test.describe.configure({ mode: 'serial' });

interface Players {
  pages: Page[];
  contexts: BrowserContext[];
}

async function openPlayers(browser: Browser, n: number, viewport: { width: number; height: number }, mobile: boolean) {
  const out: Players = { pages: [], contexts: [] };
  for (let i = 0; i < n; i++) {
    const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
    out.contexts.push(ctx);
    out.pages.push(await ctx.newPage());
  }
  return out;
}

async function joinRoom(page: Page, name: string, code: string) {
  await page.goto('/');
  await page.getByTestId('input-name-join').fill(name);
  await page.getByTestId('input-code').fill(code);
  await page.getByTestId('btn-join').click();
  await expect(page.getByTestId('screen-lobby')).toBeVisible();
}

test('4人で部屋を作り、10問を最後まで遊べる（5人目は断られる）', async ({ browser }, testInfo) => {
  test.setTimeout(240_000);
  const { width, height } = testInfo.project.use.viewport!;
  const mobile = testInfo.project.name === 'mobile';
  const shotDir = path.join('.artifacts', 'screenshots', testInfo.project.name);
  mkdirSync(shotDir, { recursive: true });
  const shot = (page: Page, name: string) => page.screenshot({ path: path.join(shotDir, `${name}.png`) });

  const { pages, contexts } = await openPlayers(browser, 4, { width, height }, mobile);
  const extra = await openPlayers(browser, 1, { width, height }, mobile);
  try {
    const [host, p2, p3, p4] = pages;

    // 1. トップ → 部屋を作る
    await host.goto('/');
    await expect(host.getByTestId('screen-home')).toBeVisible();
    await shot(host, '01-top');
    await host.getByTestId('input-name-create').fill('ホスト');
    await host.getByTestId('btn-create').click();
    await expect(host.getByTestId('screen-lobby')).toBeVisible();
    const code = (await host.getByTestId('room-code').textContent())!.trim();
    expect(code).toMatch(/^[A-Z2-9]{4}$/);

    // 2. 3人が部屋コードで参加
    await joinRoom(p2, '参加者2', code);
    await joinRoom(p3, '参加者3', code);
    await joinRoom(p4, '参加者4', code);
    await expect(host.getByTestId('lobby-count')).toHaveText('4');
    await expect(host.getByTestId('btn-start')).toBeEnabled();
    await expect(p2.getByTestId('lobby-players')).toContainText('参加者4');
    await shot(host, '02-lobby-4players');

    // 3. 5人目は満員の理由が画面に出る
    await extra.pages[0].goto('/');
    await extra.pages[0].getByTestId('input-name-join').fill('5人目');
    await extra.pages[0].getByTestId('input-code').fill(code);
    await extra.pages[0].getByTestId('btn-join').click();
    await expect(extra.pages[0].getByTestId('home-error')).toContainText('定員4人で満員');
    await shot(extra.pages[0], '03-full-room-error');

    // 4. ホストが開始 → 全員に1問目
    await host.getByTestId('btn-start').click();
    for (const p of pages) {
      await expect(p.getByTestId('progress')).toHaveText('1 / 10');
      await expect(p.getByTestId('buzzer')).toBeEnabled();
    }
    await shot(host, '04-question-waiting');

    // 5. 4人がほぼ同時に押す → 回答権は1人だけ
    await Promise.allSettled(pages.map((p) => p.getByTestId('buzzer').click({ timeout: 3000 })));
    await expect
      .poll(async () => (await Promise.all(pages.map((p) => p.locator('#buzzer-label').textContent()))).filter((t) => t === 'あなたが回答中').length)
      .toBe(1);
    const labels = await Promise.all(pages.map((p) => p.locator('#buzzer-label').textContent()));
    expect(labels.filter((t) => t === 'あなたが回答中')).toHaveLength(1);
    const winnerIndex = labels.findIndex((t) => t === 'あなたが回答中');
    const winner = pages[winnerIndex];
    await expect(winner.getByTestId('choice-0')).toBeEnabled();
    await shot(winner, '05-answering-winner');
    // 回答権のない人は選べない
    const loserIndex = (winnerIndex + 1) % 4;
    await expect(pages[loserIndex].getByTestId('choice-0')).toBeDisabled();
    await shot(pages[loserIndex], '06-answering-others');

    // 6. 回答権を持つ人が選ぶ。正解なら+10、不正解なら-5で、点数が0以外に動く
    await winner.getByTestId('choice-1').click();
    await expect(host.locator('#scoreboard .score').filter({ hasNotText: /^0$/ })).not.toHaveCount(0);

    // 7. 残りは4人が自動で遊ぶ（押せるときは押す、回答権があれば選ぶ）。
    //    ホストの画面で正解表示が初めて出た瞬間を1枚撮る
    let revealShot = false;
    const bot = async (p: Page) => {
      const deadline = Date.now() + 200_000;
      while (Date.now() < deadline) {
        if (await p.getByTestId('screen-result').isVisible().catch(() => false)) return;
        if (p === host && !revealShot && (await p.locator('#buzzer-label').textContent()) === '次へ…') {
          revealShot = true;
          await shot(p, '07-reveal');
        }
        const buzzer = p.getByTestId('buzzer');
        if (await buzzer.isEnabled().catch(() => false)) await buzzer.click({ timeout: 500 }).catch(() => {});
        const pick = Math.floor(Math.random() * 4);
        await p.getByTestId(`choice-${pick}`).click({ timeout: 300 }).catch(() => {});
        await p.waitForTimeout(120);
      }
      throw new Error('bot timed out');
    };
    await Promise.all(pages.map((p) => bot(p)));
    expect(revealShot).toBe(true);

    // 8. 最終順位
    await expect(host.getByTestId('screen-result')).toBeVisible();
    await expect(host.getByTestId('ranking').locator('li')).toHaveCount(4);
    await expect(host.getByTestId('ranking')).toContainText('ホスト');
    await shot(host, '08-result');
    await shot(p2, '09-result-player2');
  } finally {
    for (const ctx of [...contexts, ...extra.contexts]) await ctx.close();
  }
});

test('2人で遊び、回答後に再読み込みしても点数と席が保たれる', async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  const { width, height } = testInfo.project.use.viewport!;
  const mobile = testInfo.project.name === 'mobile';
  const shotDir = path.join('.artifacts', 'screenshots', testInfo.project.name);
  mkdirSync(shotDir, { recursive: true });
  const shot = (page: Page, name: string) => page.screenshot({ path: path.join(shotDir, `${name}.png`) });
  const { pages, contexts } = await openPlayers(browser, 2, { width, height }, mobile);
  try {
    const [host, guest] = pages;
    await host.goto('/');
    await host.getByTestId('input-name-create').fill('ホスト');
    await host.getByTestId('btn-create').click();
    await expect(host.getByTestId('screen-lobby')).toBeVisible();
    await expect(host.getByTestId('room-code')).toHaveText(/^[A-Z2-9]{4}$/);
    const code = (await host.getByTestId('room-code').textContent())!.trim();
    await joinRoom(guest, 'ゲスト', code);
    await expect(host.getByTestId('btn-start')).toBeEnabled();
    await host.getByTestId('btn-start').click();
    await expect(guest.getByTestId('buzzer')).toBeEnabled();

    // ゲストが押して回答 → 正解表示になる
    await guest.getByTestId('buzzer').click();
    await expect(guest.getByTestId('choice-0')).toBeEnabled();
    await guest.getByTestId('choice-0').click();
    // 正解なら+10、不正解なら-5（どちらも点数が0以外になる）
    const guestScore = guest.locator('#scoreboard li', { hasText: 'ゲスト' }).locator('.score');
    await expect(guestScore).not.toHaveText('0');
    const scoreBefore = await guestScore.textContent();
    expect(['10', '-5']).toContain(scoreBefore);

    // 再読み込み（回線が切れて戻る場合と同じ復帰経路）
    await guest.reload();
    await expect(guest.getByTestId('screen-game')).toBeVisible();
    await expect(guest.getByTestId('room-chip')).toHaveText(`部屋 ${code}`);
    const scoreAfter = await guest.locator('#scoreboard li', { hasText: 'ゲスト' }).locator('.score').textContent();
    expect(scoreAfter).toBe(scoreBefore);
    await shot(guest, 'reload-restored');
    await shot(host, 'scoreboard-2players');
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
