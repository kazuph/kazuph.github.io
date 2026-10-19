// ゲームの規則だけを書いた純粋なモジュール。
// 時刻は必ず引数 now で受け取り、内部で Date.now() は呼ばない。
// ここで決めた判定をサーバー（Durable Object）が保存し、全員に配信する。

import { QUESTIONS, TOTAL_QUESTIONS, pickQuestionOrder, type Question } from './questions';

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const QUESTION_TIME_MS = 20_000;
export const ANSWER_TIME_MS = 10_000;
export const REVEAL_TIME_MS = 3_000;

export { TOTAL_QUESTIONS };

export type Phase = 'lobby' | 'question' | 'answering' | 'reveal' | 'finished';

export interface Player {
  id: string;
  name: string;
  token: string;
  score: number;
  connected: boolean;
  host: boolean;
  /** この問題で不正解（または時間切れ）になり、もう押せない。 */
  locked: boolean;
}

export interface Reveal {
  /** 回答した人。誰も回答していなければ null。 */
  playerId: string | null;
  reason: 'correct' | 'wrong' | 'timeout' | 'none';
}

export interface GameState {
  code: string;
  phase: Phase;
  players: Player[];
  /** 出題する問題の添字（長さ TOTAL_QUESTIONS）。 */
  order: number[];
  questionIndex: number;
  questionStartedAt: number;
  questionDeadline: number;
  answeringPlayerId: string | null;
  answerDeadline: number | null;
  revealDeadline: number | null;
  reveal: Reveal | null;
}

export interface Result {
  ok: boolean;
  error?: string;
}

export interface AddPlayerInput {
  id: string;
  name: string;
  token: string;
}

export function createLobby(code: string): GameState {
  return {
    code,
    phase: 'lobby',
    players: [],
    order: [],
    questionIndex: 0,
    questionStartedAt: 0,
    questionDeadline: 0,
    answeringPlayerId: null,
    answerDeadline: null,
    revealDeadline: null,
    reveal: null,
  };
}

function findPlayer(state: GameState, id: string | null): Player | undefined {
  if (!id) return undefined;
  return state.players.find((p) => p.id === id);
}

export function addPlayer(state: GameState, input: AddPlayerInput): Result {
  if (state.phase !== 'lobby') {
    return { ok: false, error: 'ゲームはもう始まっています' };
  }
  if (state.players.length >= MAX_PLAYERS) {
    return { ok: false, error: '満員です（4人まで）' };
  }
  if (state.players.some((p) => p.id === input.id)) {
    return { ok: false, error: 'すでに参加しています' };
  }
  state.players.push({
    id: input.id,
    name: input.name,
    token: input.token,
    score: 0,
    connected: false,
    host: state.players.length === 0,
    locked: false,
  });
  return { ok: true };
}

export function questionAt(state: GameState, index: number): Question | undefined {
  const qi = state.order[index];
  return qi === undefined ? undefined : QUESTIONS[qi];
}

export function currentQuestion(state: GameState): Question | undefined {
  return questionAt(state, state.questionIndex);
}

export function startGame(
  state: GameState,
  now: number,
  byPlayerId: string,
  order?: number[],
): Result {
  if (state.phase !== 'lobby') {
    return { ok: false, error: 'すでに始まっています' };
  }
  const starter = findPlayer(state, byPlayerId);
  if (!starter?.host) {
    return { ok: false, error: '開始できるのは部屋を作った人だけです' };
  }
  if (state.players.length < MIN_PLAYERS) {
    return { ok: false, error: '2人以上で開始してください' };
  }
  if (state.players.length > MAX_PLAYERS) {
    return { ok: false, error: '満員です（4人まで）' };
  }
  state.order = order ?? pickQuestionOrder();
  beginQuestion(state, now, 0);
  return { ok: true };
}

function beginQuestion(state: GameState, now: number, index: number): void {
  state.phase = 'question';
  state.questionIndex = index;
  state.questionStartedAt = now;
  state.questionDeadline = now + QUESTION_TIME_MS;
  state.answeringPlayerId = null;
  state.answerDeadline = null;
  state.revealDeadline = null;
  state.reveal = null;
  for (const p of state.players) p.locked = false;
}

function toReveal(state: GameState, now: number, reveal: Reveal): void {
  state.phase = 'reveal';
  state.answeringPlayerId = null;
  state.answerDeadline = null;
  state.reveal = reveal;
  state.revealDeadline = now + REVEAL_TIME_MS;
}

function anyUnlocked(state: GameState): boolean {
  return state.players.some((p) => !p.locked);
}

function advanceFromReveal(state: GameState, now: number): void {
  const next = state.questionIndex + 1;
  if (next >= state.order.length) {
    state.phase = 'finished';
    state.answeringPlayerId = null;
    state.answerDeadline = null;
    state.revealDeadline = null;
    state.reveal = null;
    return;
  }
  beginQuestion(state, now, next);
}

/**
 * 締め切りを過ぎた処理を進める。入力を処理する前に必ず呼ぶ。
 * 時間切れ→不正解→reveal のように連鎖するので、進まなくなるまで繰り返す。
 */
export function tick(state: GameState, now: number): void {
  for (let guard = 0; guard < 100; guard++) {
    if (state.phase === 'question' && now >= state.questionDeadline) {
      toReveal(state, now, { playerId: null, reason: 'none' });
    } else if (
      state.phase === 'answering' &&
      state.answerDeadline !== null &&
      now >= state.answerDeadline
    ) {
      const answered = findPlayer(state, state.answeringPlayerId);
      const who = state.answeringPlayerId;
      if (answered) {
        answered.locked = true;
        answered.score -= 5;
      }
      state.answeringPlayerId = null;
      state.answerDeadline = null;
      if (anyUnlocked(state) && now < state.questionDeadline) {
        state.phase = 'question';
      } else {
        toReveal(state, now, { playerId: who, reason: 'timeout' });
      }
    } else if (
      state.phase === 'reveal' &&
      state.revealDeadline !== null &&
      now >= state.revealDeadline
    ) {
      advanceFromReveal(state, now);
    } else {
      break;
    }
  }
}

/** 早押し。最初に受け取った1人だけが回答権を得る。 */
export function buzz(state: GameState, playerId: string, questionIndex: number, now: number): Result {
  if (state.phase !== 'question') {
    return { ok: false, error: '今は押せません' };
  }
  if (questionIndex !== state.questionIndex) {
    return { ok: false, error: '古い問題の早押しです' };
  }
  const p = findPlayer(state, playerId);
  if (!p) return { ok: false, error: '参加者が見つかりません' };
  if (p.locked) return { ok: false, error: 'この問題ではもう押せません' };

  state.phase = 'answering';
  state.answeringPlayerId = p.id;
  // 回答の締め切りは「押した時刻 + 10秒」と「問題の締め切り」の早いほう。
  state.answerDeadline = Math.min(now + ANSWER_TIME_MS, state.questionDeadline);
  return { ok: true };
}

/** 回答。正解 +10、不正解 -5 でその問題は失格。 */
export function answer(
  state: GameState,
  playerId: string,
  questionIndex: number,
  choice: number,
  now: number,
): Result {
  if (state.phase !== 'answering') {
    return { ok: false, error: '今は回答できません' };
  }
  if (state.answeringPlayerId !== playerId) {
    return { ok: false, error: '回答権がありません' };
  }
  if (questionIndex !== state.questionIndex) {
    return { ok: false, error: '古い問題です' };
  }
  const p = findPlayer(state, playerId);
  const q = currentQuestion(state);
  if (!p || !q) return { ok: false, error: '問題が見つかりません' };

  if (choice === q.answer) {
    p.score += 10;
    toReveal(state, now, { playerId: p.id, reason: 'correct' });
  } else {
    p.score -= 5;
    p.locked = true;
    state.answeringPlayerId = null;
    state.answerDeadline = null;
    if (anyUnlocked(state)) {
      state.phase = 'question';
      state.reveal = null;
    } else {
      toReveal(state, now, { playerId: p.id, reason: 'wrong' });
    }
  }
  return { ok: true };
}

/** 次に処理すべき締め切り（Alarm はこれを1つだけ予約する）。 */
export function nextDeadline(state: GameState): number | null {
  switch (state.phase) {
    case 'question':
      return state.questionDeadline;
    case 'answering':
      return state.answerDeadline;
    case 'reveal':
      return state.revealDeadline;
    default:
      return null;
  }
}

export interface Ranking {
  id: string;
  name: string;
  score: number;
  rank: number;
}

/** 同点は同じ順位。 */
export function ranking(state: GameState): Ranking[] {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const out: Ranking[] = [];
  let rank = 0;
  let prevScore: number | null = null;
  sorted.forEach((p, i) => {
    if (prevScore === null || p.score !== prevScore) {
      rank = i + 1;
      prevScore = p.score;
    }
    out.push({ id: p.id, name: p.name, score: p.score, rank });
  });
  return out;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  host: boolean;
  locked: boolean;
}

export interface Snapshot {
  t: 'state';
  code: string;
  phase: Phase;
  you: string;
  serverNow: number;
  players: PublicPlayer[];
  total: number;
  questionIndex: number;
  question: { text: string; choices: string[] } | null;
  questionDeadline: number;
  answerDeadline: number | null;
  revealDeadline: number | null;
  answeringPlayerId: string | null;
  // 正解は reveal のときだけ送る。
  reveal: { playerId: string | null; reason: Reveal['reason']; choice: number } | null;
  // 最終順位は finished のときだけ送る。
  ranking: Ranking[] | null;
  hostId: string | null;
  canStart: boolean;
}

/** ブラウザに送る状態。正解の番号は reveal のとき以外は含めない。 */
export function snapshot(state: GameState, you: string, serverNow: number): Snapshot {
  const showing =
    state.phase === 'question' || state.phase === 'answering' || state.phase === 'reveal';
  const q = currentQuestion(state);
  const host = state.players.find((p) => p.host);
  return {
    t: 'state',
    code: state.code,
    phase: state.phase,
    you,
    serverNow,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      host: p.host,
      locked: p.locked,
    })),
    total: state.order.length || TOTAL_QUESTIONS,
    questionIndex: state.questionIndex,
    question: showing && q ? { text: q.text, choices: [...q.choices] } : null,
    questionDeadline: state.questionDeadline,
    answerDeadline: state.answerDeadline,
    revealDeadline: state.revealDeadline,
    answeringPlayerId: state.answeringPlayerId,
    reveal:
      state.phase === 'reveal' && state.reveal && q
        ? { playerId: state.reveal.playerId, reason: state.reveal.reason, choice: q.answer }
        : null,
    ranking: state.phase === 'finished' ? ranking(state) : null,
    hostId: host ? host.id : null,
    canStart: state.phase === 'lobby' && state.players.length >= MIN_PLAYERS,
  };
}
