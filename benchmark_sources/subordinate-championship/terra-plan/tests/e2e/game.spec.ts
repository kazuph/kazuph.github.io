import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { questions } from '../../src/questions';
import { mkdirSync } from 'node:fs';

const dir = '.artifacts';
const names = ['あおい','みどり','あかり','ひかり'];
async function shot(page: Page, name: string) { await page.screenshot({ path:`${dir}/${name}.png`, fullPage:true }); }
async function waitPhase(pages: Page[], text: string) { await Promise.all(pages.map(p => expect(p.getByText(text, { exact:false }).first()).toBeVisible({ timeout:30000 }))); }
async function winner(pages: Page[]): Promise<number> {
  await expect.poll(async () => (await Promise.all(pages.map(p => p.locator('.choice:enabled').count()))).filter(n => n === 4).length).toBe(1);
  const counts = await Promise.all(pages.map(p => p.locator('.choice:enabled').count())); return counts.findIndex(n => n === 4);
}
async function buzz(pages: Page[]) {
  await Promise.all(pages.map(p => p.locator('#buzz').evaluate((button: HTMLButtonElement) => button.click()))); return winner(pages);
}
async function answer(page: Page, correct: boolean) {
  const text = await page.locator('.question').innerText();
  const question = questions.find(q => q.text === text); if (!question) throw new Error(`Unknown question: ${text}`);
  await page.locator(`[data-choice="${correct ? question.correct : (question.correct + 1) % 4}"]`).click();
}

test('4人の同時対戦・再接続・実時間の期限・順位と画面', async ({ browser }) => {
  mkdirSync(dir, { recursive:true });
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  try {
    for (let i=0;i<5;i++) { const context = await browser.newContext({ viewport:i === 3 ? {width:390,height:844} : {width:1280,height:900} }); contexts.push(context); pages.push(await context.newPage()); }
    await pages[0].goto('/'); await pages[0].getByLabel('あなたの名前').fill(names[0]); await pages[0].getByRole('button',{name:'部屋を作る'}).click();
    const code = await pages[0].locator('.room-code strong').innerText();
    for (let i=1;i<5;i++) { await pages[i].goto('/'); await pages[i].getByLabel('あなたの名前').fill(i < 4 ? names[i] : '五人目'); await pages[i].getByLabel('部屋コード').fill(code); await pages[i].getByRole('button',{name:'部屋に参加する'}).click(); }
    await expect(pages[4].getByRole('alert')).toContainText('満員');
    await waitPhase(pages.slice(0,4),'4 / 4'); await shot(pages[0],'lobby-pc'); await shot(pages[3],'lobby-mobile');
    await pages[0].getByRole('button',{name:'ゲームを始める'}).click();
    const active = pages.slice(0,4); await waitPhase(active,'第1問');
    await shot(pages[0],'question-pc'); await shot(pages[3],'question-mobile');
    const bounds = await pages[3].evaluate(() => {
      const elements = [...document.querySelectorAll('.question, .choice, #buzz')].map(e => e.getBoundingClientRect());
      return { rects: elements.map(r => ({ top:r.top, bottom:r.bottom, left:r.left, right:r.right })),
        width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth };
    });
    expect(bounds.rects).toHaveLength(6);
    for (const rect of bounds.rects) { expect(rect.top).toBeGreaterThanOrEqual(0); expect(rect.bottom).toBeLessThanOrEqual(bounds.height);
      expect(rect.left).toBeGreaterThanOrEqual(0); expect(rect.right).toBeLessThanOrEqual(bounds.width); }
    expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width);
    const seconds = await Promise.all(active.map(p => p.locator('#seconds').innerText().then(Number))); expect(Math.max(...seconds)-Math.min(...seconds)).toBeLessThanOrEqual(1);
    let who = await buzz(active);
    await Promise.all(active.map(p => expect(p.locator('.status')).toHaveText(`${names[who]}さんが回答中`)));
    await shot(pages[0],'answering-pc'); await shot(pages[3],'answering-mobile');
    await answer(active[who],false);
    await Promise.all(active.map(p => expect(p.locator(`[data-player="${names[who]}"]`)).toContainText('-5')));
    await expect(active[who].locator('#buzz')).toBeDisabled();
    await active[who].reload(); await expect(active[who].locator(`[data-player="${names[who]}"]`)).toContainText('-5');
    const disconnected = (who+1)%4; await contexts[disconnected].setOffline(true);
    await expect(active[who].locator(`[data-player="${names[disconnected]}"]`)).toContainText('接続が切れています');
    await new Promise(resolve => setTimeout(resolve, 5000)); await contexts[disconnected].setOffline(false);
    await expect(active[who].locator(`[data-player="${names[disconnected]}"]`)).not.toContainText('接続が切れています', {timeout:15000});
    const eligible = (who+2)%4; await active[eligible].locator('#buzz').click(); await answer(active[eligible],true);
    for (let round=2;round<=3;round++) {
      await waitPhase(active,`第${round}問`); who = await buzz(active); await answer(active[who],true);
    }
    await waitPhase(active,'第4問');
    const start = Date.now(); await waitPhase(active,'正解発表！'); expect(Date.now()-start).toBeGreaterThanOrEqual(18000);
    await waitPhase(active,'第5問'); await active[0].locator('#buzz').click(); await winner(active);
    const before = Number((await active[0].locator(`[data-player="${names[0]}"] strong`).innerText()).replace(/[^\d-]/g,''));
    const timeoutStart = Date.now(); await expect(active[0].locator(`[data-player="${names[0]}"] strong`)).toContainText(String(before-5), {timeout:15000});
    expect(Date.now()-timeoutStart).toBeGreaterThanOrEqual(8500);
    await active[1].locator('#buzz').click(); await answer(active[1],true);
    for (let round=6;round<=10;round++) { await waitPhase(active,`第${round}問`); await active[0].locator('#buzz').click(); await answer(active[0],true); }
    await waitPhase(active,'結果発表！');
    const ranking = await Promise.all(active.map(p => p.locator('.ranking').innerText())); expect(new Set(ranking).size).toBe(1);
    await shot(pages[0],'results-pc'); await shot(pages[3],'results-mobile');
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
