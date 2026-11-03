import { questions } from './questions';

export type Player = { id: string; name: string; token: string; score: number };
export type Phase = 'lobby' | 'question' | 'answering' | 'reveal' | 'finished';
export type Game = {
  code: string; players: Player[]; host: string; phase: Phase; order: number[]; index: number;
  questionEnd: number; answerEnd: number; revealEnd: number; answering: string | null; locked: string[];
};
export type Action = { t: 'start' } | { t: 'buzz'; q: number } | { t: 'answer'; q: number; choice: number };
export function create(code: string, player: Player, order: number[]): Game {
  return { code, players: [player], host: player.id, phase: 'lobby', order, index: 0,
    questionEnd: 0, answerEnd: 0, revealEnd: 0, answering: null, locked: [] };
}
function joinMutable(game: Game, player: Player): string | null {
  if (game.phase !== 'lobby') return 'ゲームはもう始まっています';
  if (game.players.length >= 4) return '満員です（4人まで）';
  game.players.push(player); return null;
}
function question(game: Game, now: number) {
  game.phase = 'question'; game.questionEnd = now + 20_000;
  game.answerEnd = 0; game.answering = null; game.locked = [];
}
function reveal(game: Game, now: number) {
  game.phase = 'reveal'; game.answering = null; game.revealEnd = now + 3_000;
}
function wrong(game: Game, now: number) {
  const player = game.players.find(p => p.id === game.answering);
  if (!player) return;
  player.score -= 5; game.locked.push(player.id); game.answering = null;
  if (game.locked.length === game.players.length || now >= game.questionEnd) reveal(game, now);
  else game.phase = 'question';
}
function tickMutable(game: Game, now: number): void {
  while (true) {
    if (game.phase === 'answering' && now >= game.answerEnd) { wrong(game, game.answerEnd); continue; }
    if ((game.phase === 'question' || game.phase === 'answering') && now >= game.questionEnd) {
      reveal(game, game.questionEnd); continue;
    }
    if (game.phase === 'reveal' && now >= game.revealEnd) {
      const next = game.revealEnd; game.index++;
      if (game.index === 10) game.phase = 'finished'; else question(game, next);
      continue;
    }
    break;
  }
}
function actMutable(game: Game, playerId: string, action: Action, now: number): string | null {
  tickMutable(game, now);
  const player = game.players.find(p => p.id === playerId);
  if (!player) return 'プレイヤーが見つかりません';
  if (action.t === 'start') {
    if (game.phase !== 'lobby' || game.host !== playerId || game.players.length < 2 || game.players.length > 4)
      return 'ホストが2〜4人で開始できます';
    question(game, now); return null;
  }
  if (action.q !== game.index + 1) return null;
  if (action.t === 'buzz' && game.phase === 'question' && !game.locked.includes(playerId)) {
    game.phase = 'answering'; game.answering = playerId; game.answerEnd = Math.min(now + 10_000, game.questionEnd);
  } else if (action.t === 'answer' && game.phase === 'answering' && game.answering === playerId &&
    Number.isInteger(action.choice) && action.choice >= 0 && action.choice < 4) {
    if (action.choice === questions[game.order[game.index]].correct) { player.score += 10; reveal(game, now); }
    else wrong(game, now);
  }
  return null;
}
export function deadline(game: Game): number | null {
  if (game.phase === 'question') return game.questionEnd;
  if (game.phase === 'answering') return game.answerEnd;
  if (game.phase === 'reveal') return game.revealEnd;
  return null;
}
export function publicState(game: Game, you: string, connected: string[], now: number) {
  const q = game.phase === 'lobby' || game.phase === 'finished' ? null : questions[game.order[game.index]];
  return { t: 'state', code: game.code, host: game.host, phase: game.phase, index: game.index + 1,
    players: game.players.map(({ id, name, score }) => ({ id, name, score, connected: connected.includes(id),
      rank: 1 + game.players.filter(p => p.score > score).length })),
    question: q && { text: q.text, choices: q.choices, ...(game.phase === 'reveal' ? { correct: q.correct } : {}) },
    questionEnd: game.questionEnd, answerEnd: game.answerEnd, revealEnd: game.revealEnd,
    answering: game.answering, locked: game.locked, you, serverNow: now };
}

export function join(game: Game, player: Player): { game: Game; error: string | null } {
  const copy = structuredClone(game); return { game: copy, error: joinMutable(copy, player) };
}
export function tick(game: Game, now: number): Game {
  const copy = structuredClone(game); tickMutable(copy, now); return copy;
}
export function act(game: Game, playerId: string, action: Action, now: number): { game: Game; error: string | null } {
  const copy = structuredClone(game); return { game: copy, error: actMutable(copy, playerId, action, now) };
}
