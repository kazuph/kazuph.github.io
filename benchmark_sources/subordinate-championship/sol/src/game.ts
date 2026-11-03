import { QUESTIONS } from './questions.ts';
export const RULES = { capacity: 4, minimumPlayers: 2, questionMs: 20_000, answerMs: 10_000, correctPoints: 10, wrongPoints: -5 } as const;
export type Player = { id: string; token: string; name: string; score: number };
export type Game = {
  code: string; hostId: string; players: Player[]; phase: 'lobby' | 'question' | 'finished';
  index: number; questionDeadline: number; answeringId: string | null; answerDeadline: number;
  excluded: string[]; revision: number; message: string;
  previous: { number: number; text: string; answer: string; note: string; outcome: string } | null;
};
export function createGame(code: string, host: Player): Game {
  return { code, hostId: host.id, players: [host], phase: 'lobby', index: 0, questionDeadline: 0, answeringId: null, answerDeadline: 0, excluded: [], revision: 0, message: 'みんなが集まったら、ホストが開始します。', previous: null };
}
function beginQuestion(g: Game, now: number) {
  g.phase = 'question'; g.questionDeadline = now + RULES.questionMs;
  g.answeringId = null; g.answerDeadline = 0; g.excluded = []; g.message = 'わかったら、早押し！';
}
function finishQuestion(g: Game, now: number, outcome: string) {
  const q = QUESTIONS[g.index];
  g.previous = { number: g.index + 1, text: q.text, answer: q.choices[q.answer], note: q.note, outcome };
  g.answeringId = null; g.answerDeadline = 0;
  if (g.index === QUESTIONS.length - 1) { g.phase = 'finished'; g.message = '全10問、おつかれさまでした！'; }
  else { g.index++; beginQuestion(g, now); }
}
function failAnswer(g: Game, now: number, reason: string) {
  const p = g.players.find(p => p.id === g.answeringId)!;
  p.score += RULES.wrongPoints; g.excluded.push(p.id); g.answeringId = null; g.answerDeadline = 0;
  g.message = `${p.name}さんは${reason}（-5点）。残りのみんなで早押し！`;
  if (g.excluded.length === g.players.length) finishQuestion(g, now, '全員が回答を終えました');
}
export function tick(g: Game, now: number): boolean {
  if (g.phase !== 'question') return false;
  if (now >= g.questionDeadline) {
    if (g.answeringId && now >= g.answerDeadline) failAnswer(g, now, '時間切れ');
    // failAnswer may already have advanced after the last eligible player's timeout.
    if (g.phase === 'question' && now >= g.questionDeadline) finishQuestion(g, now, '出題から20秒が経過しました');
    return true;
  }
  if (g.answeringId && now >= g.answerDeadline) { failAnswer(g, now, '時間切れ'); return true; }
  return false;
}
export type Action = { type: string; question?: number; choice?: number };
export function act(g: Game, id: string, action: Action, now: number): string | null {
  const p = g.players.find(p => p.id === id);
  if (!p) return '参加者が見つかりません。';
  if (action.type === 'start') {
    if (id !== g.hostId) return '開始できるのはホストだけです。';
    if (g.phase !== 'lobby') return 'ゲームはすでに始まっています。';
    if (g.players.length < RULES.minimumPlayers) return '開始には2〜4人が必要です。';
    beginQuestion(g, now); return null;
  }
  if (g.phase !== 'question' || action.question !== g.index + 1) return 'この問題の受付は終了しました。';
  if (action.type === 'buzz') {
    if (g.excluded.includes(id)) return 'この問題にはもう回答できません。';
    if (g.answeringId) return 'ほかのプレイヤーが回答中です。';
    g.answeringId = id; g.answerDeadline = Math.min(now + RULES.answerMs, g.questionDeadline);
    g.message = `${p.name}さんが回答中！`; return null;
  }
  if (action.type === 'answer') {
    if (g.answeringId !== id) return '回答権がありません。';
    if (!Number.isInteger(action.choice) || action.choice! < 0 || action.choice! >= 4) return '4つの選択肢から選んでください。';
    if (action.choice === QUESTIONS[g.index].answer) { p.score += RULES.correctPoints; finishQuestion(g, now, `${p.name}さんが正解（+10点）`); }
    else failAnswer(g, now, '不正解');
    return null;
  }
  return '不明な操作です。';
}
export function snapshot(g: Game, now: number, online: string[]) {
  return {
    code: g.code, hostId: g.hostId, phase: g.phase, revision: g.revision, serverNow: now,
    players: g.players.map(({ id, name, score }) => ({ id, name, score, online: online.includes(id), rank: 1 + g.players.filter(p => p.score > score).length })),
    question: g.phase === 'question' ? { number: g.index + 1, total: QUESTIONS.length, category: QUESTIONS[g.index].category, text: QUESTIONS[g.index].text, choices: QUESTIONS[g.index].choices } : null,
    questionDeadline: g.questionDeadline, answeringId: g.answeringId, answerDeadline: g.answerDeadline,
    excluded: g.excluded, message: g.message, previous: g.previous,
  };
}
