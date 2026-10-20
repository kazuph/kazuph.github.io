import { test, expect, Page, BrowserContext } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const names=['アオイ','ハル','リン','ソラ'];
async function create(page:Page){await page.goto('/');await page.getByLabel('プレイヤー名').fill(names[0]);await page.getByRole('button',{name:'部屋を作る'}).click();await expect(page.getByTestId('room-code')).toBeVisible();return (await page.getByTestId('room-code').innerText()).trim();}
async function join(page:Page,code:string,name:string){await page.goto('/');await page.getByLabel('プレイヤー名').fill(name);await page.getByLabel('部屋コード').fill(code);await page.getByRole('button',{name:'参加する'}).click();}
async function phase(page:Page,value:string){await expect(page.locator(`[data-phase="${value}"]`)).toBeVisible();}
async function question(page:Page,index:number){await expect(page.locator('.question-meta')).toContainText(String(index).padStart(2,'0'));await phase(page,'question');}
async function screenshot(page:Page,name:string){await mkdir('.artifacts/screenshots',{recursive:true});await page.screenshot({path:`.artifacts/screenshots/${name}.png`,fullPage:true});}
async function geometry(page:Page,label:string){
 const result=await page.evaluate(()=>{
  const bounds=[...document.querySelectorAll('button,input,.player,.choice,.rank-row')].map(e=>{const r=e.getBoundingClientRect();return {name:e.textContent?.trim().slice(0,30),x:r.x,y:r.y,w:r.width,h:r.height};}).filter(r=>r.w&&r.h);
  const overlaps=[];
  for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1) overlaps.push([a.name,b.name]);}
  return {width:innerWidth,scroll:document.documentElement.scrollWidth,bounds,overlaps};
 });
 expect(result.scroll,`${label}: 横はみ出し`).toBeLessThanOrEqual(result.width);
 expect(result.overlaps,`${label}: 操作の重なり`).toEqual([]);
 for(const r of result.bounds){expect(r.x,`${label}: 左はみ出し`).toBeGreaterThanOrEqual(0);expect(r.x+r.w,`${label}: 右はみ出し`).toBeLessThanOrEqual(result.width+1);}
 await mkdir('.artifacts/layout',{recursive:true});await writeFile(`.artifacts/layout/${label}.json`,JSON.stringify(result,null,2));
}
async function evidence(pc:Page,mobile:Page,label:string){await geometry(pc,`${label}-pc`);await geometry(mobile,`${label}-mobile`);await screenshot(pc,`${label}-pc`);await screenshot(mobile,`${label}-mobile`);}
async function sameScores(pages:Page[]){const all=await Promise.all(pages.map(p=>p.getByTestId('scores').innerText()));for(const text of all)expect(text.replace(/あなた · /g,'')).toBe(all[0].replace(/あなた · /g,''));}

test('4人の通常対戦：満室・同時押し・不正解・再読込復帰・10問・全員の最終順位・PC/スマホ',async({browser})=>{
 const contexts:BrowserContext[]=[],pages:Page[]=[],errors:string[]=[];
 try{
  for(let i=0;i<5;i++){const c=await browser.newContext({viewport:i===1?{width:390,height:844}:{width:1440,height:1000}});contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));pages.push(p);}
  const code=await create(pages[0]);await expect(pages[0].getByRole('button',{name:'クイズをはじめる'})).toBeDisabled();
  for(let i=1;i<4;i++)await join(pages[i],code,names[i]);
  for(const p of pages.slice(0,4))await expect(p.locator('.player')).toHaveCount(4);
  await expect(pages[1].getByRole('button',{name:'クイズをはじめる'})).toHaveCount(0);
  await join(pages[4],code,'5人目');await expect(pages[4].getByRole('alert')).toContainText('満員');
  await evidence(pages[0],pages[1],'lobby');
  await pages[0].getByRole('button',{name:'クイズをはじめる'}).click();
  for(const p of pages.slice(0,4))await question(p,1);
  await evidence(pages[0],pages[1],'question');
  // Four independent browsers send a real buzz concurrently. Exactly one can choose.
  await Promise.all(pages.slice(0,4).map(p=>p.keyboard.press('Space')));
  for(const p of pages.slice(0,4))await phase(p,'answering');
  const enabled=await Promise.all(pages.slice(0,4).map(p=>p.locator('[data-choice="0"]').isEnabled()));expect(enabled.filter(Boolean)).toHaveLength(1);
  const winner=enabled.indexOf(true), winnerName=names[winner];
  for(const p of pages.slice(0,4))await expect(p.getByTestId('status')).toContainText(p===pages[winner]?'あなたの回答':winnerName);
  const timers=await Promise.all(pages.slice(0,4).map(p=>p.locator('#seconds').innerText()));expect(Math.max(...timers.map(Number))-Math.min(...timers.map(Number))).toBeLessThanOrEqual(1);
  await evidence(pages[0],pages[1],'answering');
  await pages[winner].locator('[data-choice="1"]').click();
  for(const p of pages.slice(0,4))await phase(p,'question');
  await expect(pages[winner].getByRole('button',{name:'この問題の回答は終了'})).toBeDisabled();
  await sameScores(pages.slice(0,4));await expect(pages[winner].getByTestId('scores')).toContainText('-5');
  await pages[winner].reload();await phase(pages[winner],'question');await expect(pages[winner].getByRole('button',{name:'この問題の回答は終了'})).toBeDisabled();await expect(pages[winner].getByTestId('scores')).toContainText('-5');
  const scorer=(winner+1)%4;
  await pages[scorer].getByRole('button',{name:'早押し！',exact:false}).click();await pages[scorer].locator('[data-choice="0"]').click();
  for(const p of pages.slice(0,4)){await phase(p,'reveal');await expect(p.locator('.reveal')).toContainText('富士山');}
  await sameScores(pages.slice(0,4));
  const answers=[0,1,2,3,0,1,2,3,0,1];
  for(let q=2;q<=10;q++){for(const p of pages.slice(0,4))await question(p,q);const i=(q-1)%4;await pages[i].getByRole('button',{name:'早押し！',exact:false}).click();await pages[i].locator(`[data-choice="${answers[q-1]}"]`).click();for(const p of pages.slice(0,4))await phase(p,'reveal');}
  for(const p of pages.slice(0,4))await expect(p.getByRole('heading',{name:'最終結果',exact:true})).toBeVisible();
  const ranks=await Promise.all(pages.slice(0,4).map(p=>p.getByTestId('ranking').innerText()));for(const text of ranks)expect(text.replace(/あなた/g,'').replace(/\s/g,'')).toBe(ranks[0].replace(/あなた/g,'').replace(/\s/g,''));
  const scores=[20,30,20,20];scores[winner]-=5;scores[scorer]+=10;for(let i=0;i<4;i++)await expect(pages[0].locator('.rank-row').filter({hasText:names[i]})).toContainText(String(scores[i]));
  await evidence(pages[0],pages[1],'results');await pages[1].reload();await expect(pages[1].getByRole('heading',{name:'最終結果',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});

test('実時間の回答10秒・問題20秒・全員不正解・一時オフラインから本人復帰',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext();
 try{
  const host=await a.newPage(),guest=await b.newPage();const code=await create(host);await join(guest,code,'ハル');
  await host.getByRole('button',{name:'クイズをはじめる'}).click();await question(host,1);
  await host.getByRole('button',{name:'早押し！',exact:false}).click();await phase(host,'answering');
  const began=Date.now();await expect(host.getByRole('button',{name:'この問題の回答は終了'})).toBeVisible({timeout:12_000});expect(Date.now()-began).toBeGreaterThan(8000);await expect(host.getByTestId('scores')).not.toContainText('-5');
  await b.setOffline(true);await expect(host.locator('.player').filter({hasText:'ハル'})).toContainText('再接続待ち',{timeout:8000});await b.setOffline(false);await expect(guest.locator('#connection')).toContainText('接続済み',{timeout:10000});
  await expect(host.locator('[data-phase="reveal"]')).toBeVisible({timeout:22_000});await expect(host.locator('.reveal')).toContainText('20秒');await phase(guest,'reveal');
  await question(host,2);await question(guest,2);
  for(const p of [host,guest]){await p.getByRole('button',{name:'早押し！',exact:false}).click();await p.locator('[data-choice="0"]').click();}
  for(const p of [host,guest]){await phase(p,'reveal');await expect(p.locator('.reveal')).toContainText('全員');await expect(p.getByTestId('scores')).toContainText('-5');}
 }finally{await a.close();await b.close();}
});

test('API境界：名前・存在しない部屋・未認証接続・別オリジン・4人同時参加の定員',async({browser,request})=>{
 const empty=await request.post('/api/rooms',{data:{name:' '}});expect(empty.status()).toBe(400);expect(await empty.json()).toEqual({error:'名前を入力してください。'});
 const absent=await request.post('/api/rooms/00000000/join',{data:{name:'アオイ'}});expect(absent.status()).toBe(404);expect((await absent.json()).error).toContain('見つかりません');
 const contexts=await Promise.all(Array.from({length:6},()=>browser.newContext()));
 try{
  const created=await contexts[0].request.post('/api/rooms',{data:{name:'ホスト'}});expect(created.status()).toBe(201);const {code}=await created.json();
  const results=await Promise.all(contexts.slice(1).map((c,i)=>c.request.post(`/api/rooms/${code}/join`,{data:{name:`参加者${i}`}})));
  expect(results.filter(r=>r.status()===201)).toHaveLength(3);expect(results.filter(r=>r.status()===409)).toHaveLength(2);
  const unauth=await request.get(`/api/rooms/${code}/socket`);expect(unauth.status()).toBe(401);expect((await unauth.json()).error).toContain('参加し直');
  const foreign=await contexts[0].request.post(`/api/rooms/${code}/join`,{headers:{Origin:'https://example.org'},data:{name:'別サイト'}});expect(foreign.status()).toBe(403);expect((await foreign.json()).error).toContain('このサイト');
  const p=await contexts[0].newPage();await p.goto(`/#${code}`);await expect(p.locator('.player')).toHaveCount(4);
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
