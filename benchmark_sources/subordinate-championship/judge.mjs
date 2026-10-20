// 上司（審判）による共通シナリオ。各アプリの画面を外から操作して同じ手順で確かめる。
// 使い方: node judge.mjs <name>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.env.PLAYWRIGHT_FROM ?? new URL('./sonnet/package.json', import.meta.url).pathname);
const { chromium } = require('playwright');

const tid = (id) => `[data-testid="${id}"]`;
const A = {
  sonnet: { port: 8781, name: tid('name-input'), create: tid('create-btn'), joinName: tid('name-input'), code: tid('code-input'), join: tid('join-btn'), roomCode: tid('room-code'), start: tid('start-btn'), buzz: tid('buzz-btn'), choice: '[data-testid^="choice-"]' },
  haiku: { port: 8782, name: tid('input-name-create'), create: tid('btn-create'), joinName: tid('input-name-join'), code: tid('input-code'), join: tid('btn-join'), roomCode: tid('room-code'), start: tid('btn-start'), buzz: tid('buzzer'), choice: '[data-testid^="choice-"]' },
  sol: { port: 8783, name: '#name', create: 'role=button[name="部屋を作る"]', joinName: '#name', code: '#code', join: 'role=button[name="参加する"]', roomCode: tid('room-code'), start: 'role=button[name="ゲームを開始する"]', buzz: '#buzz', choice: '[data-choice]' },
  'sol-img': { port: 8784, name: 'role=textbox[name="プレイヤー名"]', create: 'role=button[name=/部屋を作る/]', joinName: 'role=textbox[name="プレイヤー名"]', code: 'role=textbox[name="部屋コード"]', join: 'role=button[name=/^参加/]', roomCode: tid('room-code'), start: 'role=button[name=/クイズをはじめる/]', buzz: 'role=button[name=/早押し/]', choice: '[data-choice]' },
  opus: { port: 8786, name: '[placeholder="例: たろう"]', create: 'role=button[name="部屋を作る"]', joinName: '[placeholder="例: たろう"]', code: '[aria-label="部屋コード（5文字）"]', join: 'role=button[name="参加する"]', roomCode: tid('room-code'), start: 'role=button[name="▶ ゲーム開始"]', buzz: 'button.buzzer', choice: '.choice' },
  'sonnet-plan': { port: 8791, name: tid('name-input'), create: tid('create-btn'), joinName: tid('name-input'), code: tid('code-input'), join: tid('join-btn'), roomCode: tid('room-code'), start: tid('start-btn'), buzz: tid('buzz-btn'), choice: '[data-testid^="choice-"]' },
  'haiku-plan': { port: 8792, name: '#name', create: '#create', joinName: '#name', code: '#code', join: '#join', roomCode: '#lobby-code', start: '#start', buzz: '#buzz', choice: '.choice' },
  'devin-plan': { port: 8793, name: '#name-input', create: '#create-btn', joinName: '#name-input', code: '#code-input', join: '#join-btn', roomCode: '#room-code', start: '#start-btn', buzz: '#buzz-btn', choice: '.choice' },
  luna: { port: 8787, name: 'role=textbox[name="プレイヤー名"] >> nth=0', create: 'role=button[name="部屋を作る"]', joinName: 'role=textbox[name="プレイヤー名"] >> nth=-1', code: 'role=textbox[name="部屋コード"]', join: 'role=button[name="部屋に参加する"]', roomCode: '.room-code', start: 'role=button[name="ゲームを開始"]', buzz: 'role=button[name="早押し！"]', choice: '[data-choice]' },
  'luna-plan': { port: 8794, name: '#player-name', create: 'role=button[name="部屋を作る"]', joinName: '#player-name', code: '#room-code', join: 'role=button[name="参加する"]', roomCode: tid('room-code'), start: 'role=button[name="クイズを開始"]', buzz: tid('buzzer'), choice: '[data-choice]' },
  devin: { port: 8785, name: '#in-name', create: '#btn-create', joinName: '#in-name', code: '#in-code', join: '#btn-join', roomCode: '#lobby-code', start: '#btn-start', buzz: '#btn-buzz', choice: '#choices button' },
};

const who = process.argv[2];
const a = A[who];
const url = `http://localhost:${a.port}/`;
const out = new URL(`./out/${who}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const log = [];
const note = (k, v) => { log.push({ k, v }); console.log(k, JSON.stringify(v)); };
const names = ['あおい', 'ひなた', 'れん', 'さくら'];

const browser = await chromium.launch();
const mk = async (mobile) => {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, page, errors };
};
const shot = (p, n) => p.screenshot({ path: `${out}${n}.png` });
const enabledChoices = (p) => p.locator(a.choice).evaluateAll((els) => els.filter((e) => !e.disabled && e.offsetParent !== null).length);
const bodyText = (p) => p.locator('body').innerText();

try {
  const P = [await mk(false), await mk(false), await mk(false), await mk(true)];
  const [host] = P;
  await host.page.goto(url);
  await shot(host.page, 'pc-00-entry');
  await P[3].page.goto(url);
  await shot(P[3].page, 'sp-00-entry');
  await host.page.locator(a.name).first().fill(names[0]);
  await host.page.locator(a.create).first().click();
  await host.page.locator(a.roomCode).first().waitFor({ timeout: 10000 });
  const code = (await host.page.locator(a.roomCode).first().innerText()).replace(/\s/g, '');
  note('roomCode', code);
  for (let i = 1; i < 4; i++) {
    const p = P[i].page;
    if (i < 3) await p.goto(url);
    await p.locator(a.joinName).first().fill(names[i]);
    await p.locator(a.code).first().fill(code);
    await p.locator(a.join).first().click();
    await p.locator(a.roomCode).first().waitFor({ timeout: 10000 }).catch(() => {});
  }
  await host.page.waitForTimeout(1000);
  await shot(host.page, 'pc-01-lobby');
  await shot(P[3].page, 'sp-01-lobby');

  // 5人目
  const fifth = await mk(false);
  await fifth.page.goto(url);
  await fifth.page.locator(a.joinName).first().fill('ごにんめ');
  await fifth.page.locator(a.code).first().fill(code);
  await fifth.page.locator(a.join).first().click();
  await fifth.page.waitForTimeout(1500);
  const fifthText = await bodyText(fifth.page);
  note('fifthRejectedWithReason', /満員|定員|いっぱい/.test(fifthText));
  await shot(fifth.page, 'pc-02-fifth');
  await fifth.ctx.close();

  // 開始
  await host.page.locator(a.start).first().click();
  for (const { page } of P) await page.locator(a.buzz).first().waitFor({ state: 'visible', timeout: 10000 });
  await host.page.waitForTimeout(800);
  await shot(host.page, 'pc-03-question');
  await shot(P[3].page, 'sp-03-question');

  // 同時押し（3問ぶん試す）
  const trials = [];
  for (let q = 0; q < 3; q++) {
    for (const { page } of P) await page.waitForFunction((sel) => { const b = document.querySelector(sel.startsWith('role=') ? 'button' : sel); return true; }, a.buzz);
    await Promise.all(P.map(({ page }) => page.locator(a.buzz).first().isEnabled().catch(() => false))).then((r) => note(`q${q}.buzzEnabledBefore`, r));
    await Promise.all(P.map(({ page }) => page.locator(a.buzz).first().click({ timeout: 2000, force: true }).catch(() => {})));
    await host.page.waitForTimeout(700);
    const counts = await Promise.all(P.map(({ page }) => enabledChoices(page)));
    const winners = counts.map((c, i) => (c > 0 ? i : -1)).filter((i) => i >= 0);
    trials.push({ counts, winners });
    note(`q${q}.choicesEnabledPerPlayer`, counts);
    if (q === 0) {
      const w = winners[0] ?? 0;
      await shot(P[w].page, 'pc-04-answering-self');
      await shot(P[(w + 1) % 3].page, 'pc-05-answering-other');
      await shot(P[3].page, w === 3 ? 'sp-04-answering-self' : 'sp-05-answering-other');
    }
    if (winners.length !== 1) break;
    const w = winners[0];
    await P[w].page.locator(a.choice).first().click({ timeout: 3000 }).catch(() => {});
    await host.page.waitForTimeout(1200);
    if (q === 0) {
      await shot(host.page, 'pc-06-after-answer');
      const before = await bodyText(P[w].page);
      note('q0.winnerSeesScoreChange', /-5|10/.test(before));
      // 回答者が再読み込みしても点数が残るか
      await P[w].page.reload();
      await P[w].page.waitForTimeout(2500);
      const after = await bodyText(P[w].page);
      note('q0.afterReloadHasScore', /-5|10/.test(after));
      await shot(P[w].page, 'pc-07-after-reload');
    }
    // 次の問題になるまで待つ（最大35秒）
    const deadline = Date.now() + 35000;
    while (Date.now() < deadline) {
      const ok = await Promise.all(P.map(({ page }) => page.locator(a.buzz).first().isEnabled().catch(() => false)));
      if (ok.every(Boolean)) break;
      await host.page.waitForTimeout(500);
    }
  }
  note('simultaneousBuzzSingleWinner', trials.map((t) => t.winners.length === 1));

  // 回線断→復帰（ひなた）
  await P[1].ctx.setOffline(true);
  await host.page.waitForTimeout(4000);
  await shot(host.page, 'pc-08-peer-offline');
  await P[1].ctx.setOffline(false);
  await host.page.waitForTimeout(6000);
  await shot(P[1].page, 'pc-09-after-offline');
  note('afterOfflineBuzzVisible', await P[1].page.locator(a.buzz).first().isVisible().catch(() => false));
  note('pageErrors', P.map((p) => p.errors.length));
} catch (e) {
  note('ERROR', String(e).slice(0, 400));
} finally {
  fs.writeFileSync(`${out}judge.json`, JSON.stringify(log, null, 2));
  await browser.close();
}
