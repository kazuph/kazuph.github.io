import { test, expect, Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

async function wire(page:Page,code:string){
 await page.goto('/');
 await page.evaluate(code=>new Promise<void>((resolve,reject)=>{
  const socket=new WebSocket(`ws://${location.host}/api/rooms/${code}/socket`);
  const wire={socket,states:[] as any[],errors:[] as string[],sent:[] as any[]};(window as any).wire=wire;
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){wire.states.push(m);resolve();}else wire.errors.push(m.error);};socket.onerror=()=>reject(new Error('socket failed'));
 }),code);
}
async function send(page:Page,command:any){await page.evaluate(c=>{const w=(window as any).wire;w.sent.push(c);w.socket.send(JSON.stringify(c));},command);}
async function state(page:Page){return page.evaluate(()=>(window as any).wire.states.at(-1));}
test('実WebSocketの4人同時押しと権限境界：先着1人・偽装採点拒否・古い操作拒否',async({browser})=>{
 const contexts=await Promise.all(Array.from({length:4},()=>browser.newContext()));
 try{
  const created=await contexts[0].request.post('/api/rooms',{data:{name:'アオイ'}});expect(created.status()).toBe(201);const {code}=await created.json();
  for(let i=1;i<4;i++){const r=await contexts[i].request.post(`/api/rooms/${code}/join`,{data:{name:`参加者${i}`}});expect(r.status()).toBe(201);}
  const pages=await Promise.all(contexts.map(c=>c.newPage()));await Promise.all(pages.map(p=>wire(p,code)));
  await send(pages[1],{type:'start'});await expect.poll(()=>pages[1].evaluate(()=>(window as any).wire.errors.join(' '))).toContain('ホスト');expect((await state(pages[0])).state.phase).toBe('lobby');
  await send(pages[0],{type:'start'});for(const p of pages)await expect.poll(async()=>(await state(p)).state.phase).toBe('question');
  await Promise.all(pages.map(p=>send(p,{type:'buzz',question:0})));
  for(const p of pages)await expect.poll(async()=>(await state(p)).state.phase).toBe('answering');
  const frames=await Promise.all(pages.map(p=>state(p)));const holder=frames[0].state.holder;
  expect(new Set(frames.map(f=>f.state.holder)).size).toBe(1);expect(frames.filter(f=>f.you===holder)).toHaveLength(1);
  for(const f of frames){expect(f.state.question.answer).toBeUndefined();expect(f.state.players.every((p:any)=>!('token' in p))).toBe(true);}
  const winner=frames.findIndex(f=>f.you===holder),intruder=(winner+1)%4;
  await send(pages[intruder],{type:'answer',question:0,choice:0,playerId:holder,score:999});
  await expect.poll(()=>pages[intruder].evaluate(()=>(window as any).wire.errors.join(' '))).toContain('回答権');expect((await state(pages[0])).state.players.every((p:any)=>p.score===0)).toBe(true);
  await send(pages[winner],{type:'answer',question:0,choice:0,score:999});
  for(const p of pages)await expect.poll(async()=>(await state(p)).state.phase).toBe('reveal');
  for(const p of pages){const s=(await state(p)).state;expect(s.players.find((p:any)=>p.id===holder).score).toBe(10);expect(s.question.answer).toBe(0);}
  for(const p of pages)await expect.poll(async()=>(await state(p)).state.index).toBe(1);
  await send(pages[winner],{type:'buzz',question:0});await expect.poll(()=>pages[winner].evaluate(()=>(window as any).wire.errors.join(' '))).toContain('締め切');
  const evidence=await Promise.all(pages.map(p=>p.evaluate(()=>{const w=(window as any).wire;return {states:w.states,errors:w.errors,sent:w.sent};})));
  expect(evidence.every(e=>e.sent.some((c:any)=>c.type==='buzz'&&c.question===0))).toBe(true);
  for(const e of evidence)expect([...new Set(e.states.filter((m:any)=>m.state.index===0&&m.state.holder).map((m:any)=>m.state.holder))]).toEqual([holder]);
  await mkdir('.artifacts',{recursive:true});await writeFile('.artifacts/protocol.json',JSON.stringify(evidence,null,2));
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
