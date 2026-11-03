import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('4人で同時押し、復帰、10問の採点と順位', async ({ browser }) => {
 const contexts=await Promise.all(Array.from({length:5},()=>browser.newContext({viewport:{width:1280,height:900}})));
 const pages=await Promise.all(contexts.map(c=>c.newPage()));
 const [host,...guests]=pages;
 try {
  await host.goto('/'); await host.getByLabel('あなたの名前').fill('あかり'); await host.getByRole('button',{name:'部屋を作る'}).click();
  await expect(host.getByRole('heading',{name:'みんなを待っています'})).toBeVisible();
  await expect(host.getByRole('button',{name:'ゲームを開始する'})).toBeDisabled();
  const session=await host.evaluate(()=>JSON.parse(localStorage.getItem('quizSession')!));
  expect((await host.request.post(`/api/rooms/${session.code}/start`,{headers:{'X-Player-Id':session.playerId},data:{}})).status()).toBe(409);
  for(let i=0;i<4;i++){const p=guests[i];await p.goto('/');await p.getByLabel('あなたの名前').fill(['そら','みどり','もも','ごにんめ'][i]);await p.getByLabel('部屋コード').fill(session.code);await p.getByRole('button',{name:'参加する'}).click();if(i<3) await expect(p.getByRole('heading',{name:'みんなを待っています'})).toBeVisible();else await expect(p.getByRole('alert')).toContainText('満員');}
  await expect(host.getByText('4 / 4')).toBeVisible();
  const guestId=await guests[0].evaluate(()=>JSON.parse(localStorage.getItem('quizSession')!).playerId);
  expect((await host.request.post(`/api/rooms/${session.code}/start`,{headers:{'X-Player-Id':guestId},data:{}})).status()).toBe(409);
  await mkdir('.artifacts/screenshots',{recursive:true});
  async function shots(page:Page,name:string){await page.setViewportSize({width:1280,height:900});await page.screenshot({path:`.artifacts/screenshots/${name}-pc.png`,fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:`.artifacts/screenshots/${name}-mobile.png`,fullPage:true});const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));expect(widths.scroll).toBeLessThanOrEqual(widths.viewport);await page.setViewportSize({width:1280,height:900});}
  await shots(host,'lobby');
  await host.getByRole('button',{name:'ゲームを開始する'}).click();
  for(const p of pages.slice(0,4)) await expect(p.getByText('QUESTION 1 / 10')).toBeVisible();
  const times=await Promise.all(pages.slice(0,4).map(async p=>Number((await p.locator('.timer').innerText()).match(/\d+/)?.[0])));
  expect(Math.max(...times)-Math.min(...times)).toBeLessThanOrEqual(1);
  await shots(host,'question');
  const ids=await Promise.all(pages.slice(0,4).map(p=>p.evaluate(()=>JSON.parse(localStorage.getItem('quizSession')!).playerId)));
  const root=`/api/rooms/${session.code}`;
  const race=await Promise.all(ids.map(id=>host.request.post(`${root}/buzz`,{headers:{'X-Player-Id':id},data:{}})));
  expect(race.filter(r=>r.ok())).toHaveLength(1); expect(race.filter(r=>r.status()===409)).toHaveLength(3);
  const winner=(await (await host.request.get(`${root}/state`,{headers:{'X-Player-Id':ids[0]}})).json()).answerer;
  const wp=pages[ids.indexOf(winner)]; await expect(wp.getByText('あなたの回答です')).toBeVisible();
  const winnerName=['あかり','そら','みどり','もも'][ids.indexOf(winner)];
  for(const p of pages.slice(0,4).filter(p=>p!==wp)) await expect(p.getByText(`${winnerName}さんが回答中`)).toBeVisible();
  await shots(wp,'answering');
  await wp.getByRole('button',{name:'B　北岳'}).click();
  await expect(wp.getByText('この問題は回答済みです。次の問題を待とう。')).toBeVisible();
  await wp.reload(); await expect(wp.getByText('この問題は回答済みです。次の問題を待とう。')).toBeVisible();
  await expect(wp.locator('.player').filter({hasText:'あなた'})).toContainText('-5');
  const other=pages.slice(0,4).find((_,i)=>ids[i]!==winner)!;
  await other.getByRole('button',{name:'早押し！'}).click();await other.getByRole('button',{name:'A　富士山'}).click();
  const correctName=['あかり','そら','みどり','もも'][pages.indexOf(other)];
  for(const p of pages.slice(0,4)) { await expect(p.locator('.player').filter({hasText:winnerName})).toContainText('-5'); await expect(p.locator('.player').filter({hasText:correctName})).toContainText('10'); }
  for(const p of pages.slice(0,4)){await expect(p.getByText('正解発表')).toBeVisible();await expect(p.getByRole('button',{name:'A　富士山'})).toHaveClass(/correct/);}
  const answers=['B','C','D','A','B','C','D','A','B'];
  for(let i=1;i<10;i++){await expect(host.getByText(`QUESTION ${i+1} / 10`)).toBeVisible({timeout:10000});await host.getByRole('button',{name:'早押し！'}).click();await host.locator(`[data-choice="${answers[i-1].charCodeAt(0)-65}"]`).click();}
  for(const p of pages.slice(0,4)) await expect(p.getByRole('heading',{name:'最終結果'})).toBeVisible({timeout:10000});
  await shots(host,'result');
  const texts=await Promise.all(pages.slice(0,4).map(p=>p.locator('.result-list').innerText()));expect(new Set(texts.map(t=>t.replace('（あなた）','').replace(/\s+/g,' ').trim())).size).toBe(1);
 } finally {await Promise.all(contexts.map(c=>c.close()));}
});

test('20秒の締切で正解を表示し次の問題へ',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext();const p=await a.newPage(),q=await b.newPage();
 try {await p.goto('/');await p.getByLabel('あなたの名前').fill('一');await p.getByRole('button',{name:'部屋を作る'}).click();await expect(p.getByText('みんなを待っています')).toBeVisible();const code=await p.evaluate(()=>JSON.parse(localStorage.getItem('quizSession')!).code);await q.goto('/');await q.getByLabel('あなたの名前').fill('二');await q.getByLabel('部屋コード').fill(code);await q.getByRole('button',{name:'参加する'}).click();await expect(p.getByRole('button',{name:'ゲームを開始する'})).toBeEnabled();await p.getByRole('button',{name:'ゲームを開始する'}).click();await expect(p.getByText('時間切れ！')).toBeVisible({timeout:24000});await expect(q.getByText('時間切れ！')).toBeVisible();await expect(p.getByText('QUESTION 2 / 10')).toBeVisible({timeout:6000});}finally{await a.close();await b.close();}
});

test('回答の10秒締切と全員不正解の後に正解を表示',async({browser})=>{
 const contexts=await Promise.all([browser.newContext(),browser.newContext()]);const [p,q]=await Promise.all(contexts.map(c=>c.newPage()));
 try {await p.goto('/');await p.getByLabel('あなたの名前').fill('一');await p.getByRole('button',{name:'部屋を作る'}).click();await expect(p.getByText('みんなを待っています')).toBeVisible();const session=await p.evaluate(()=>JSON.parse(localStorage.getItem('quizSession')!));await q.goto('/');await q.getByLabel('あなたの名前').fill('二');await q.getByLabel('部屋コード').fill(session.code);await q.getByRole('button',{name:'参加する'}).click();await expect(p.getByRole('button',{name:'ゲームを開始する'})).toBeEnabled();await p.getByRole('button',{name:'ゲームを開始する'}).click();await p.getByRole('button',{name:'早押し！'}).click();await expect(p.getByText('この問題は回答済みです。次の問題を待とう。')).toBeVisible({timeout:13000});await expect(p.locator('.player').filter({hasText:'あなた'})).toContainText('-5');await q.getByRole('button',{name:'早押し！'}).click();await q.getByRole('button',{name:'B　北岳'}).click();await expect(p.getByText('全員の回答が終わりました')).toBeVisible();await expect(q.getByRole('button',{name:'A　富士山'})).toHaveClass(/correct/);
 await contexts[0].setOffline(true);await p.reload().catch(()=>{});await contexts[0].setOffline(false);await p.goto('/');await expect(p.getByText('QUESTION 2 / 10')).toBeVisible({timeout:8000});await expect(p.locator('.player').filter({hasText:'あなた'})).toContainText('-5');
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
