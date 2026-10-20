import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, join, act, advance, snapshot, QUESTIONS, RULES, REVEAL_MS } from '../../src/game.js';
function room(n=4) {const g=createGame('ABCD1234'); for(let i=0;i<n;i++)join(g,`参加者${i}`,`p${i}`,`secret${i}`); return g;}
const start = g=>act(g,'p0',{type:'start'},0);
const buzz=(g,id,t=1)=>act(g,id,{type:'buzz',question:g.index},t);
const answer=(g,id,choice,t=2)=>act(g,id,{type:'answer',question:g.index,choice},t);
test('定員4人・ホストのみ・開始は2〜4人・途中参加を拒否',()=>{
 const g=room(); assert.throws(()=>join(g,'5人目','p4','s4'),/満員/);
 assert.throws(()=>act(g,'p1',{type:'start'},0),/ホスト/);
 assert.throws(()=>start(room(1)),/2〜4人/); start(room(2)); start(room(3)); start(g);
 assert.throws(()=>join(g,'途中','p4','s4'),/対戦中/);
});
test('全24順列で同時押しの受理は最初の1人のみ',()=>{
 function perms(xs){return xs.length?xs.flatMap(x=>perms(xs.filter(y=>x!==y)).map(p=>[x,...p])):[[]];}
 for(const ids of perms(['p0','p1','p2','p3'])){const g=room();start(g);buzz(g,ids[0]);for(const id of ids.slice(1))assert.throws(()=>buzz(g,id),/早押しできません/);assert.equal(g.holder,ids[0]);}
});
test('正解+10・二重回答と他人の回答と古い問題の操作を拒否',()=>{
 const g=room();start(g);buzz(g,'p0');assert.throws(()=>answer(g,'p1',0),/回答権/);
 assert.throws(()=>answer(g,'p0',4),/4つ/);answer(g,'p0',0);assert.equal(g.players[0].score,10);
 assert.throws(()=>answer(g,'p0',0),/回答権/);advance(g,2+REVEAL_MS);
 assert.throws(()=>act(g,'p0',{type:'buzz',question:0},4000),/締め切/);
});
test('不正解-5・その問題は再早押し不可・全員失敗で正解公開',()=>{
 const g=room();start(g);
 for(let i=0;i<4;i++){buzz(g,`p${i}`);answer(g,`p${i}`,1);assert.equal(g.players[i].score,-5);assert.throws(()=>buzz(g,`p${i}`));}
 assert.equal(g.phase,'reveal');assert.equal(snapshot(g,3).question.answer,0);
});
test('回答10秒の境界・20秒の問題期限が優先・時間切れは無得点',()=>{
 const g=room();start(g);buzz(g,'p0',1000);advance(g,10999);assert.equal(g.holder,'p0');advance(g,11000);
 assert.equal(g.phase,'question');assert.ok(g.locked.includes('p0'));assert.equal(g.players[0].score,0);
 buzz(g,'p1',19000);assert.equal(g.answerEnd,20000);advance(g,20000);assert.equal(g.phase,'reveal');
 const h=room();start(h);buzz(h,'p0',1);assert.throws(()=>answer(h,'p0',0,10001),/回答権/);assert.equal(h.players[0].score,0);
});
test('10問で結果・同点は同順位・公開前の正解と資格情報を隠す',()=>{
 const g=room();start(g);let now=0;
 for(let i=0;i<10;i++){assert.equal(g.index,i);const s=snapshot(g,now);assert.equal('answer' in s.question,false);assert.equal(JSON.stringify(s).includes('secret'),false);buzz(g,'p0',++now);answer(g,'p0',QUESTIONS[i].answer,++now);now+=REVEAL_MS;advance(g,now);}
 assert.equal(g.phase,'results');assert.equal(g.players[0].score,100);assert.deepEqual(snapshot(g,now).players.map(p=>p.rank),[1,2,2,2]);
 assert.equal(QUESTIONS.length,10);assert.equal(RULES.questionMs,20000);
});
