import { QUESTIONS } from './questions';

export const PLAYER_LIMIT = 4;
export const QUESTION_LIMIT = 10;
export const QUESTION_MS = 20_000;
export const ANSWER_MS = 10_000;
export const REVEAL_MS = 3_000;

export type Player = {
  id: string;
  name: string;
  token: string;
  score: number;
  connected: boolean;
};

export type Phase = 'lobby' | 'question' | 'answering' | 'reveal' | 'finished';

export type GameState = {
  code: string;
  hostId: string;
  players: Record<string, Player>;
  phase: Phase;
  questionOrder: number[];
  questionIndex: number;
  questionStartedAt: number | null;
  questionDeadline: number | null;
  answerDeadline: number | null;
  revealUntil: number | null;
  answererId: string | null;
  eliminated: string[];
};

export type Result = { ok: true; state: GameState } | { ok: false; error: string };

export type PublicState = {
  t: 'state';
  code: string;
  phase: Phase;
  questionNumber: number;
  question?: { prompt: string; choices: string[] };
  correctChoice?: number;
  questionDeadline: number | null;
  answerDeadline: number | null;
  revealUntil: number | null;
  answererId: string | null;
  eliminated: string[];
  players: Array<{ id: string; name: string; score: number; connected: boolean; host: boolean; rank: number }>;
  you: string;
  serverNow: number;
};

export function createLobby(code: string, host: Omit<Player, 'score' | 'connected'>, _now: number): GameState {
  return {
    code,
    hostId: host.id,
    players: { [host.id]: { ...host, score: 0, connected: false } },
    phase: 'lobby',
    questionOrder: [],
    questionIndex: -1,
    questionStartedAt: null,
    questionDeadline: null,
    answerDeadline: null,
    revealUntil: null,
    answererId: null,
    eliminated: [],
  };
}

export function addPlayer(state: GameState, player: Omit<Player, 'score' | 'connected'>): Result {
  if (state.phase !== 'lobby') return { ok: false, error: 'ゲームはもう始まっています' };
  if (Object.keys(state.players).length >= PLAYER_LIMIT) return { ok: false, error: '満員です（4人まで）' };
  return {
    ok: true,
    state: {
      ...state,
      players: { ...state.players, [player.id]: { ...player, score: 0, connected: false } },
    },
  };
}

export function startGame(state: GameState, playerId: string, now: number, questionOrder: number[]): Result {
  if (playerId !== state.hostId) return { ok: false, error: '開始できるのはホストだけです' };
  const playerCount = Object.keys(state.players).length;
  if (state.phase !== 'lobby' || playerCount < 2 || playerCount > PLAYER_LIMIT) {
    return { ok: false, error: '開始には2〜4人が必要です' };
  }
  if (questionOrder.length !== QUESTION_LIMIT || new Set(questionOrder).size !== QUESTION_LIMIT
    || questionOrder.some((index) => !Number.isInteger(index) || index < 0 || index >= QUESTIONS.length)) {
    return { ok: false, error: '問題の準備に失敗しました' };
  }
  return {
    ok: true,
    state: {
      ...state,
      players: Object.fromEntries(Object.entries(state.players).map(([id, player]) => [id, { ...player, score: 0 }])),
      phase: 'question',
      questionOrder: [...questionOrder],
      questionIndex: 0,
      questionStartedAt: now,
      questionDeadline: now + QUESTION_MS,
      answerDeadline: null,
      revealUntil: null,
      answererId: null,
      eliminated: [],
    },
  };
}

export function buzz(state: GameState, playerId: string, questionNumber: number, now: number): Result {
  const current = tick(state, now);
  if (current.phase !== 'question' || questionNumber !== current.questionIndex + 1
    || !current.players[playerId] || current.eliminated.includes(playerId)) {
    return { ok: false, error: 'この問題では早押しできません' };
  }
  return {
    ok: true,
    state: {
      ...current,
      phase: 'answering',
      answererId: playerId,
      answerDeadline: Math.min(now + ANSWER_MS, current.questionDeadline ?? now),
    },
  };
}

export function answer(
  state: GameState,
  playerId: string,
  questionNumber: number,
  choice: number,
  now: number,
  correctChoice: number,
): Result {
  const current = tick(state, now);
  if (current.phase !== 'answering' || current.answererId !== playerId
    || questionNumber !== current.questionIndex + 1 || !Number.isInteger(choice) || choice < 0 || choice > 3) {
    return { ok: false, error: '回答できる時間ではありません' };
  }
  const player = current.players[playerId];
  const correct = choice === correctChoice;
  const players = { ...current.players, [playerId]: { ...player, score: player.score + (correct ? 10 : -5) } };
  if (correct) {
    return { ok: true, state: beginReveal({ ...current, players }, now) };
  }
  return {
    ok: true,
    state: afterWrongAnswer({ ...current, players, eliminated: [...current.eliminated, playerId] }, now),
  };
}

export function tick(state: GameState, now: number): GameState {
  let next = state;
  while (next.phase !== 'finished') {
    if (next.phase === 'question' && next.questionDeadline !== null && now >= next.questionDeadline) {
      next = beginReveal(next, next.questionDeadline);
      continue;
    }
    if (next.phase === 'answering' && next.answerDeadline !== null && now >= next.answerDeadline) {
      const deadline = next.answerDeadline;
      const answerer = next.answererId;
      if (!answerer) return next;
      const player = next.players[answerer];
      next = afterWrongAnswer({
        ...next,
        players: { ...next.players, [answerer]: { ...player, score: player.score - 5 } },
        eliminated: [...next.eliminated, answerer],
      }, deadline);
      continue;
    }
    if (next.phase === 'reveal' && next.revealUntil !== null && now >= next.revealUntil) {
      const nextAt = next.revealUntil;
      const questionIndex = next.questionIndex + 1;
      if (questionIndex >= QUESTION_LIMIT) {
        next = { ...next, phase: 'finished', revealUntil: null, answerDeadline: null, answererId: null };
      } else {
        next = {
          ...next,
          phase: 'question',
          questionIndex,
          questionStartedAt: nextAt,
          questionDeadline: nextAt + QUESTION_MS,
          answerDeadline: null,
          revealUntil: null,
          answererId: null,
          eliminated: [],
        };
      }
      continue;
    }
    break;
  }
  return next;
}

export function publicState(state: GameState, you: string, serverNow: number): PublicState {
  const questionId = state.questionOrder[state.questionIndex];
  const question = questionId === undefined ? undefined : QUESTIONS[questionId];
  const ranking = Object.values(state.players).sort((left, right) => right.score - left.score);
  const rankById = new Map<string, number>();
  ranking.forEach((player, index) => {
    if (index === 0 || player.score !== ranking[index - 1].score) rankById.set(player.id, index + 1);
    else rankById.set(player.id, rankById.get(ranking[index - 1].id) ?? index + 1);
  });
  const revealAnswer = state.phase === 'reveal' || state.phase === 'finished';
  return {
    t: 'state',
    code: state.code,
    phase: state.phase,
    questionNumber: Math.max(0, state.questionIndex + 1),
    ...(question ? { question: { prompt: question.prompt, choices: question.choices } } : {}),
    ...(question && revealAnswer ? { correctChoice: question.answer } : {}),
    questionDeadline: state.questionDeadline,
    answerDeadline: state.answerDeadline,
    revealUntil: state.revealUntil,
    answererId: state.answererId,
    eliminated: [...state.eliminated],
    players: ranking.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      connected: player.connected,
      host: player.id === state.hostId,
      rank: rankById.get(player.id) ?? 1,
    })),
    you,
    serverNow,
  };
}

function afterWrongAnswer(state: GameState, now: number): GameState {
  const remainingPlayers = Object.keys(state.players).length - state.eliminated.length;
  if (remainingPlayers === 0 || (state.questionDeadline !== null && now >= state.questionDeadline)) {
    return beginReveal(state, now);
  }
  return { ...state, phase: 'question', answererId: null, answerDeadline: null };
}

function beginReveal(state: GameState, now: number): GameState {
  return { ...state, phase: 'reveal', answererId: null, answerDeadline: null, revealUntil: now + REVEAL_MS };
}
