import { test, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { QUESTIONS } from '../../src/questions';
const ROOT='http://localhost:8783';
const states = new Map<Page, any>();
function track(page: Page) {
  page.on('websocket', ws => ws.on('framereceived', event => {
    try { const packet=JSON.parse(String(event.payload));if(packet.type==='state')states.set(page,packet.state); } catch {}
  }));
}
async function room(browser: Browser, mobile=false) {
  const contexts:BrowserContext[]=[]; const pages:Page[]=[];
  for(let i=0;i<4;i++) {
    const ctx=await browser.newContext({viewport: mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});contexts.push(ctx);
    const page=await ctx.newPage();track(page);pages.push(page);
    await page.goto(ROOT);await page.getByLabel('あなたの名前').fill(['あおい','はる','ねこマスター','コーヒー'][i]);
    if(i===0) await page.getByRole('button',{name:'部屋を作る'}).click();
    else { await page.getByLabel('部屋コード').fill(states.get(pages[0]).code);await page.getByRole('button',{name:'参加する',exact:true}).click(); }
    await expect(page.getByRole('heading',{name:'PLAYERS'})).toBeVisible();
  }
  await expect.poll(()=>states.get(pages[0])?.players.length).toBe(4);
  return {pages,contexts,code:states.get(pages[0]).code};
}
async function synchronized(pages:Page[]) {
  await expect.poll(()=>new Set(pages.map(p=>states.get(p)?.revision)).size).toBe(1);
  const values=pages.map(p=>states.get(p));
  for(const s of values) expect(JSON.stringify(s)).toBe(JSON.stringify(values[0]));
  for (const page of pages) {
    await expect(page.locator('.score')).toHaveText(values[0].players.map((p:any)=>`${p.score}pt`));
    if (values[0].phase === 'question') await expect(page.locator('.game-message')).toHaveText(values[0].message);
  }
  if (values[0].phase === 'question') {
    await expect.poll(async()=>new Set(await Promise.all(pages.map(p=>p.locator('#question-seconds').textContent()))).size).toBe(1);
    if (values[0].answeringId) await expect.poll(async()=>new Set(await Promise.all(pages.map(p=>p.locator('#answer-seconds').textContent()))).size).toBe(1);
  }
}
async function layout(page:Page, name:string) {
  const evidence=await page.evaluate(()=>{
    const viewport=innerWidth;
    const bad=[...document.querySelectorAll('button,input,h1,.player,.choice,.ranking li')].map(e=>({text:e.textContent?.slice(0,50),r:e.getBoundingClientRect(),sw:e.scrollWidth,cw:e.clientWidth})).filter(x=>x.r.width>0&&(x.r.left<0||x.r.right>viewport+1||x.sw>x.cw+1)).map(x=>({text:x.text,left:x.r.left,right:x.r.right,scrollWidth:x.sw,clientWidth:x.cw}));
    const choices=[...document.querySelectorAll('.choice')].map(e=>e.getBoundingClientRect());
    const overlaps=choices.flatMap((a,i)=>choices.slice(i+1).filter(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)).length;
    return {viewport,documentWidth:document.documentElement.scrollWidth,bad,choiceOverlaps:overlaps};
  });
  expect(evidence.documentWidth).toBeLessThanOrEqual(evidence.viewport);expect(evidence.bad).toEqual([]);expect(evidence.choiceOverlaps).toBe(0);
  await writeFile(`.artifacts/${name}-layout.json`,JSON.stringify(evidence,null,2));
  await page.screenshot({path:`.artifacts/${name}.png`,fullPage:true});
}
for(const mobile of [false,true]) test(`four-player full game, concurrent buzz, reload, offline recovery and ${mobile?'mobile':'desktop'} evidence`,async({browser})=>{
  await mkdir('.artifacts',{recursive:true});
  const {pages,contexts,code}=await room(browser,mobile);const mode=mobile?'mobile':'desktop';
  const errors:string[]=[];for(const p of pages)p.on('pageerror',e=>errors.push(e.message));
  await synchronized(pages);await layout(pages[0],`${mode}-lobby`);
  const extra=await browser.newContext();const fifth=await extra.newPage();
  await fifth.goto(ROOT);await fifth.getByLabel('あなたの名前').fill('5人目');await fifth.getByLabel('部屋コード').fill(code);await fifth.getByRole('button',{name:'参加する',exact:true}).click();await expect(fifth.getByRole('alert')).toHaveText('この部屋は満員です（定員4人）。');await extra.close();
  await expect(pages[1].getByRole('button',{name:'ホストの開始を待っています'})).toBeDisabled();
  await pages[0].getByRole('button',{name:'ゲームを開始する'}).click();await expect(pages[0].locator('.question-text')).toHaveText(QUESTIONS[0].text);
  await synchronized(pages);await layout(pages[0],`${mode}-question`);
  await Promise.all(pages.map(p=>p.locator('#buzz').evaluate((button:HTMLButtonElement)=>button.click())));
  await expect.poll(()=>states.get(pages[0])?.answeringId).not.toBeNull();await synchronized(pages);
  let winner=states.get(pages[0]).answeringId;
  let winnerIndex=states.get(pages[0]).players.findIndex((p:any)=>p.id===winner);
  for(let i=0;i<4;i++)await expect(pages[i].locator('.choice:enabled')).toHaveCount(i===winnerIndex?4:0);
  await layout(pages[winnerIndex],`${mode}-answering`);
  await pages[winnerIndex].locator('[data-choice="1"]').click();
  await expect.poll(()=>states.get(pages[0]).players[winnerIndex].score).toBe(-5);
  await expect(pages[winnerIndex].locator('#buzz')).toBeDisabled();
  const correctIndex=(winnerIndex+1)%4;
  await pages[correctIndex].getByRole('button',{name:'早押し！'}).click();await pages[correctIndex].locator('[data-choice="0"]').click();
  await expect(pages[0].locator('.question-text')).toHaveText(QUESTIONS[1].text);await synchronized(pages);
  await expect(pages[0].locator('.previous')).toContainText('正解：富士山');
  const before=await pages[correctIndex].evaluate(()=>sessionStorage.getItem('haya-player'));
  await pages[correctIndex].reload();await expect(pages[correctIndex].locator('.question-text')).toHaveText(QUESTIONS[1].text);
  expect(await pages[correctIndex].evaluate(()=>sessionStorage.getItem('haya-player'))).toBe(before);
  await expect.poll(()=>states.get(pages[correctIndex]).players[correctIndex].score).toBe(10);
  await contexts[correctIndex].setOffline(true);
  await expect(pages[correctIndex].locator('.connection')).toContainText('再接続中');
  await contexts[correctIndex].setOffline(false);await expect(pages[correctIndex].locator('.connection')).toContainText('リアルタイム接続');
  await synchronized(pages);
  for(let i=1;i<10;i++) {
    const who=i%4;
    await expect(pages[who].locator('.question-text')).toHaveText(QUESTIONS[i].text);
    await pages[who].getByRole('button',{name:'早押し！'}).click();await pages[who].locator(`[data-choice="${QUESTIONS[i].answer}"]`).click();
  }
  for(const p of pages)await expect(p.getByRole('heading',{name:/ひらめきの、\s*結果発表。/})).toBeVisible();
  await synchronized(pages);const final=states.get(pages[0]);expect(final.phase).toBe('finished');expect(final.players.reduce((n:number,p:any)=>n+p.score,0)).toBe(95);
  await writeFile(`.artifacts/${mode}-final-state.json`,JSON.stringify(final,null,2));await layout(pages[0],`${mode}-results`);
  await pages[0].getByRole('button',{name:'新しい部屋で遊ぶ'}).click();await expect(pages[0].getByLabel('あなたの名前')).toBeVisible();
  expect(errors).toEqual([]);for(const ctx of contexts)await ctx.close();
});

test('real 10-second answer timeout, all-excluded advance and real 20-second alarm without input',async({browser})=>{
  const contexts=[await browser.newContext(),await browser.newContext()];const pages=await Promise.all(contexts.map(c=>c.newPage()));for(const p of pages)track(p);
  await pages[0].goto(ROOT);await pages[0].getByLabel('あなたの名前').fill('時間係');await pages[0].getByRole('button',{name:'部屋を作る'}).click();
  await expect(pages[0].getByRole('button',{name:'ゲームを開始する'})).toBeDisabled();
  await pages[1].goto(ROOT);await pages[1].getByLabel('あなたの名前').fill('見届け人');await pages[1].getByLabel('部屋コード').fill(states.get(pages[0]).code);await pages[1].getByRole('button',{name:'参加する',exact:true}).click();
  await pages[0].getByRole('button',{name:'ゲームを開始する'}).click();await pages[0].getByRole('button',{name:'早押し！'}).click();
  await expect.poll(()=>states.get(pages[0])?.answeringId).not.toBeNull();const deadline=states.get(pages[0]).answerDeadline;
  await expect(pages[0].locator('.game-message')).toContainText('時間切れ',{timeout:15_000});
  const timed=states.get(pages[0]);expect(timed.players[0].score).toBe(-5);expect(timed.serverNow).toBeGreaterThanOrEqual(deadline);expect(timed.answeringId).toBeNull();
  await pages[1].getByRole('button',{name:'早押し！'}).click();await pages[1].locator('[data-choice="1"]').click();
  await expect(pages[0].locator('.question-text')).toHaveText(QUESTIONS[1].text);await expect(pages[0].locator('.previous')).toContainText('全員が回答を終えました');
  const questionDeadline=states.get(pages[0]).questionDeadline;
  await expect(pages[0].locator('.question-text')).toHaveText(QUESTIONS[2].text,{timeout:25_000});
  expect(states.get(pages[0]).serverNow).toBeGreaterThanOrEqual(questionDeadline);await expect(pages[0].locator('.previous')).toContainText('正解：H₂O');
  await synchronized(pages);
  await writeFile('.artifacts/real-deadlines.json',JSON.stringify({answerDeadline:deadline,timedOutAt:timed.serverNow,questionDeadline,advancedAt:states.get(pages[0]).serverNow},null,2));
  for(const ctx of contexts)await ctx.close();
});

test('real API validation, host authority, identity and answer secrecy',async({request})=>{
  expect((await request.post('/api/rooms',{data:{name:''}})).status()).toBe(400);
  expect((await request.post('/api/rooms',{data:null})).status()).toBe(400);
  expect((await request.post('/api/rooms',{headers:{Origin:'http://attacker.invalid'},data:{name:'x'}})).status()).toBe(403);
  expect((await request.post('/api/rooms/FFFFFFFF/join',{data:{name:'x'}})).status()).toBe(404);
  const host=await (await request.post('/api/rooms',{data:{name:'Host'}})).json();
  const guest=await (await request.post(`/api/rooms/${host.code}/join`,{data:{name:'Guest'}})).json();
  expect((await request.get(`/api/rooms/${host.code}/socket?token=invalid`,{headers:{Upgrade:'websocket'}})).status()).toBe(401);
  async function client(credential:any) {
    const socket=new WebSocket(`ws://localhost:8783/api/rooms/${host.code}/socket?token=${credential.token}`);
    const messages:any[]=[];socket.addEventListener('message',e=>messages.push(JSON.parse(String(e.data))));
    await new Promise<void>((resolve,reject)=>{socket.addEventListener('open',()=>resolve());socket.addEventListener('error',reject);});
    await expect.poll(()=>messages.length).toBeGreaterThan(0);
    return {socket,messages,send:(action:any)=>socket.send(JSON.stringify(action))};
  }
  const h=await client(host),g=await client(guest);
  g.send({type:'start'});await expect.poll(()=>g.messages.at(-1)?.error).toContain('ホスト');
  h.send({type:'start'});await expect.poll(()=>h.messages.at(-1)?.state?.phase).toBe('question');
  const data=h.messages.at(-1).state;expect(data.question).not.toHaveProperty('answer');expect(JSON.stringify(data)).not.toContain(host.token);expect(JSON.stringify(data)).not.toContain(guest.token);
  g.send({type:'answer',question:1,choice:0,score:999,id:host.id});await expect.poll(()=>g.messages.at(-1)?.error).toContain('回答権');
  h.send({type:'buzz',question:1});await expect.poll(()=>h.messages.at(-1)?.state?.answeringId).toBe(host.id);
  h.send({type:'answer',question:1,choice:0});await expect.poll(()=>h.messages.at(-1)?.state?.question?.number).toBe(2);
  const duplicate=await client(host);expect(duplicate.messages.at(-1).state.players[0].score).toBe(10);
  duplicate.send({type:'answer',question:1,choice:0});await expect.poll(()=>duplicate.messages.at(-1)?.error).toContain('終了');
  g.send({type:'sync'});await expect.poll(()=>g.messages.at(-1)?.state?.players[0].score).toBe(10);
  expect((await request.post(`/api/rooms/${host.code}/join`,{data:{name:'late'}})).status()).toBe(409);
  h.socket.close();g.socket.close();duplicate.socket.close();
});
