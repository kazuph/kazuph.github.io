import { describe, expect, it } from 'vitest';
import { act, create, join, publicState, tick, type Game, type Player } from '../../src/game';
import { questions } from '../../src/questions';
const p = (n: number): Player => ({ id: `${n}`, name: `人${n}`, token: `secret${n}`, score: 0 });
const order = Array.from({ length: 10 }, (_, i) => i);
function lobby(count = 4) { let g = create('ABC234', p(1), order); for (let i = 2; i <= count; i++) g = join(g, p(i)).game; return g; }
function started() { return act(lobby(), '1', { t:'start' }, 0).game; }
function action(g: Game, id: string, value: Parameters<typeof act>[2], now: number) { return act(g, id, value, now).game; }
function permutations<T>(values: T[]): T[][] { return values.length ? values.flatMap((v,i) => permutations(values.filter((_,j) => i !== j)).map(rest => [v,...rest])) : [[]]; }
describe('ゲーム規則', () => {
  it('定員と開始条件を守る', () => {
    expect(join(lobby(), p(5)).error).toContain('満員');
    expect(act(lobby(1), '1', { t:'start' }, 0).error).toBeTruthy();
    expect(act(lobby(2), '2', { t:'start' }, 0).error).toBeTruthy();
    for (const n of [2,3,4]) expect(act(lobby(n), '1', { t:'start' }, 0).game.phase).toBe('question');
    expect(join(started(), p(5)).error).toContain('始まっています');
  });
  it('24通りの順序で最初の押下者だけが回答権を得る', () => {
    const cases = permutations(['1','2','3','4']); expect(cases).toHaveLength(24);
    for (const ids of cases) { let g = started(); for (const id of ids) g = action(g,id,{t:'buzz',q:1},100); expect(g.answering).toBe(ids[0]); }
  });
  it('正解・不正解・回答期限と失格を処理する', () => {
    let g = action(started(),'1',{t:'buzz',q:1},100);
    expect(action(g,'1',{t:'answer',q:1,choice:questions[0].correct},200).players[0].score).toBe(10);
    g = action(g,'1',{t:'answer',q:1,choice:(questions[0].correct+1)%4},200);
    expect(g.players[0].score).toBe(-5); expect(g.locked).toContain('1');
    expect(action(g,'1',{t:'buzz',q:1},300).phase).toBe('question');
    g = action(g,'2',{t:'buzz',q:1},500); g = tick(g,10500);
    expect(g.players[1].score).toBe(-5); expect(g.locked).toContain('2');
  });
  it('20秒の締切と全員失格で正解を表示する', () => {
    expect(tick(started(),20000).phase).toBe('reveal');
    const late = action(started(),'1',{t:'buzz',q:1},15000);
    const ended = tick(late,20000); expect(ended.phase).toBe('reveal'); expect(ended.players[0].score).toBe(-5);
    let g = started(); for (const id of ['1','2','3','4']) { g = action(g,id,{t:'buzz',q:1},100); g = action(g,id,{t:'answer',q:1,choice:1},200); }
    expect(g.phase).toBe('reveal');
  });
  it('10問後に終了し同点は同順位、出題中に正解やトークンを送らない', () => {
    let g = started(); const view = publicState(g,'1',[],0);
    expect(view.question).not.toHaveProperty('correct'); expect(JSON.stringify(view)).not.toContain('secret');
    for (let i=0;i<10;i++) { g = tick(g, i*23000+20000); g = tick(g, i*23000+23000); }
    expect(g.phase).toBe('finished'); expect(publicState(g,'1',[],0).players.map(p => p.rank)).toEqual([1,1,1,1]);
  });
});
