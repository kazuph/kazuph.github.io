import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createGame, RULES, snapshot, tick } from '../../src/game.ts';
import { QUESTIONS } from '../../src/questions.ts';
function game(count = 4) {
  const players = Array.from({length: count}, (_, i) => ({id: `p${i}`, token: `secret${i}`, name: `Player ${i}`, score: 0}));
  const g = createGame('12345678', players[0]); g.players = players; return g;
}
test('host authority and 2–4 player start boundary', () => {
  assert.match(act(game(), 'p1', {type:'start'}, 0)!, /ホスト/);
  assert.match(act(game(1), 'p0', {type:'start'}, 0)!, /2〜4/);
  for (const count of [2,3,4]) assert.equal(act(game(count), 'p0', {type:'start'}, 0), null);
});
test('first received buzzer exclusively wins; wrong answer excludes and deducts only once', () => {
  const g = game(); act(g,'p0',{type:'start'},0);
  assert.equal(act(g,'p2',{type:'buzz',question:1},1),null);
  assert.match(act(g,'p1',{type:'buzz',question:1},1)!,/回答中/);
  assert.match(act(g,'p1',{type:'answer',question:1,choice:0},2)!,/回答権/);
  assert.equal(act(g,'p2',{type:'answer',question:1,choice:1},3),null);
  assert.equal(g.players[2].score,-5);
  assert.match(act(g,'p2',{type:'buzz',question:1},4)!,/もう回答/);
  assert.match(act(g,'p2',{type:'answer',question:1,choice:0},4)!,/回答権/);
  assert.equal(g.players[2].score,-5);
  act(g,'p1',{type:'buzz',question:1},5); act(g,'p1',{type:'answer',question:1,choice:0},6);
  assert.equal(g.players[1].score,10); assert.equal(g.index,1); assert.equal(g.previous?.answer,'富士山');
});
test('10 second deadline is exclusive and cannot extend 20 second question deadline', () => {
  const g = game(); act(g,'p0',{type:'start'},0); act(g,'p0',{type:'buzz',question:1},1_000);
  assert.equal(tick(g,10_999),false); assert.equal(tick(g,11_000),true);
  assert.equal(g.players[0].score,-5); assert.equal(g.answeringId,null);
  act(g,'p1',{type:'buzz',question:1},19_000); assert.equal(g.answerDeadline,20_000);
  tick(g,20_000); assert.equal(g.players[1].score,-5); assert.equal(g.index,1);
});
test('all 24 receive orders grant exactly one answer right to the first valid buzzer', () => {
  function orders(ids: string[]): string[][] {
    return ids.length ? ids.flatMap((id, i) => orders(ids.filter((_, j) => j !== i)).map(rest => [id, ...rest])) : [[]];
  }
  const permutations = orders(['p0', 'p1', 'p2', 'p3']);
  assert.equal(permutations.length, 24);
  for (const order of permutations) {
    const g = game(); act(g, 'p0', {type:'start'}, 0);
    const results = order.map(id => act(g, id, {type:'buzz',question:1}, 1));
    assert.equal(results.filter(result => result === null).length, 1);
    assert.equal(g.answeringId, order[0]);
  }
});
test('all excluded advances immediately and no duplicate question advance at deadline', () => {
  const g=game(2);act(g,'p0',{type:'start'},0);
  act(g,'p0',{type:'buzz',question:1},1);act(g,'p0',{type:'answer',question:1,choice:1},2);
  act(g,'p1',{type:'buzz',question:1},19_999);tick(g,20_000);
  assert.equal(g.index,1);assert.equal(g.phase,'question');assert.deepEqual(g.excluded,[]);
});
test('no input after 20 seconds reveals the answer and advances', () => {
  const g=game();act(g,'p0',{type:'start'},0);assert.equal(tick(g,19_999),false);assert.equal(tick(g,20_000),true);
  assert.equal(g.index,1);assert.equal(g.previous?.answer,'富士山');assert.equal(g.questionDeadline,40_000);
});
test('stale question, invalid choice, forged score and identity never change scores', () => {
  const g=game();act(g,'p0',{type:'start'},0);
  assert.match(act(g,'unknown',{type:'buzz',question:1},1)!,/参加者/);
  assert.match(act(g,'p0',{type:'buzz',question:0},1)!,/終了/);
  act(g,'p0',{type:'buzz',question:1},1);
  for(const choice of [-1,4,0.5,NaN]) assert.match(act(g,'p0',{type:'answer',question:1,choice},2)!,/4つ/);
  assert.equal(g.players[0].score,0);
});
test('ten built-in Japanese questions each have four options and valid answer', () => {
  assert.equal(QUESTIONS.length,10);
  for(const q of QUESTIONS){assert.equal(q.choices.length,4);assert.match(q.text,/[ぁ-んァ-ン一-龯]/);assert.ok(q.answer>=0&&q.answer<4);}
});
test('ten questions finish with shared ranks and no leaked secrets or current correct answer', () => {
  const g=game();act(g,'p0',{type:'start'},0);
  for(let i=0;i<10;i++){act(g,`p${i%2}`,{type:'buzz',question:i+1},i*100+1);act(g,`p${i%2}`,{type:'answer',question:i+1,choice:QUESTIONS[i].answer},i*100+2);}
  assert.equal(g.phase,'finished');assert.equal(g.players[0].score,50);assert.equal(g.players[1].score,50);
  assert.deepEqual(snapshot(g,1001,[]).players.map(p=>p.rank),[1,1,3,3]);
  const publicState=snapshot(game(),0,[]);assert.ok(!JSON.stringify(publicState).includes('secret'));
  const running=game();act(running,'p0',{type:'start'},0);assert.ok(!('answer' in snapshot(running,1,[]).question!));
});
test('serialization preserves identity, scores and deadline for reconnect', () => {
  const g=game();act(g,'p0',{type:'start'},0);act(g,'p0',{type:'buzz',question:1},1);act(g,'p0',{type:'answer',question:1,choice:0},2);
  const restored=JSON.parse(JSON.stringify(g));assert.deepEqual(snapshot(restored,3,['p0']),snapshot(g,3,['p0']));assert.equal(restored.players[0].token,'secret0');
});
