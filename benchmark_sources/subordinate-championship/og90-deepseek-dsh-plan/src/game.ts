/**
 * ゲームの規則だけを書いた純粋なモジュール。
 * 副作用を持たず、現在時刻 `now`（ミリ秒）はすべて引数で受け取る。
 * 状態は毎回コピーして返すので、呼び出し側は戻り値をそのまま保存すればよい。
 */
import { QUESTIONS, QUESTIONS_PER_GAME } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const QUESTION_TIME_MS = 20_000;
export const ANSWER_TIME_MS = 10_000;
export const REVEAL_TIME_MS = 3_000;
export const CORRECT_POINTS = 10;
export const WRONG_POINTS = -5;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface PlayerState {
  id: string;
  name: string;
  score: number;
  /** WebSocket がつながっているか。切れていても席と点数は残す。 */
  connected: boolean;
  /** 今の問題で失格したか（早押しできない）。問題が変わるたびにリセット。 */
  eliminated: boolean;
}

export interface AnswerResult {
  playerId: string;
  correct: boolean;
  points: number;
  choice: number | null;
  round: number;
}

export interface GameState {
  code: string;
  hostId: string;
  phase: Phase;
  players: PlayerState[];
  /** playerId -> 再接続用トークン。クライアントには絶対に送らない。 */
  tokens: Record<string, string>;
  /** 出題する問題の順番（QUESTIONS の添字）。 */
  order: number[];
  /** 現在の問題番号（0始まり）。開始前は -1、終了後は order.length。 */
  round: number;
  questionStartedAt: number;
  questionDeadline: number;
  answeringId: string | null;
  answerDeadline: number;
  revealDeadline: number;
  lastResult: AnswerResult | null;
}

export interface StartResult {
  ok: boolean;
  state: GameState;
  error?: string;
}

function clone(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    tokens: { ...state.tokens },
    order: [...state.order],
    lastResult: state.lastResult ? { ...state.lastResult } : null,
  };
}

export function createGame(
  code: string,
  hostId: string,
  hostName: string,
  token: string,
): GameState {
  return {
    code,
    hostId,
    phase: "lobby",
    players: [
      { id: hostId, name: hostName, score: 0, connected: false, eliminated: false },
    ],
    tokens: { [hostId]: token },
    order: [],
    round: -1,
    questionStartedAt: 0,
    questionDeadline: 0,
    answeringId: null,
    answerDeadline: 0,
    revealDeadline: 0,
    lastResult: null,
  };
}

export function addPlayer(
  state: GameState,
  id: string,
  name: string,
  token: string,
): GameState {
  const s = clone(state);
  s.players.push({ id, name, score: 0, connected: false, eliminated: false });
  s.tokens[id] = token;
  return s;
}

/** 参加できない理由。参加できるときは null。 */
export function joinError(state: GameState): string | null {
  if (state.phase !== "lobby") return "ゲームはもう始まっています";
  if (state.players.length >= MAX_PLAYERS) return "満員です（4人まで）";
  return null;
}

export function playerIdForToken(state: GameState, token: string): string | null {
  for (const [id, value] of Object.entries(state.tokens)) {
    if (value === token) return id;
  }
  return null;
}

export function setConnected(
  state: GameState,
  id: string,
  connected: boolean,
): GameState {
  const s = clone(state);
  const player = s.players.find((p) => p.id === id);
  if (player) player.connected = connected;
  return s;
}

export function startGame(
  state: GameState,
  playerId: string,
  order: number[],
  now: number,
): StartResult {
  if (state.phase !== "lobby") {
    return { ok: false, state, error: "ゲームはもう始まっています" };
  }
  if (state.hostId !== playerId) {
    return { ok: false, state, error: "開始できるのは部屋を作った人だけです" };
  }
  if (state.players.length < MIN_PLAYERS) {
    return { ok: false, state, error: "2人以上いないと開始できません" };
  }
  if (state.players.length > MAX_PLAYERS) {
    return { ok: false, state, error: `定員は${MAX_PLAYERS}人までです` };
  }
  const s = clone(state);
  s.order = order.slice(0, QUESTIONS_PER_GAME);
  s.round = 0;
  beginQuestion(s, now);
  return { ok: true, state: s };
}

function beginQuestion(s: GameState, now: number): void {
  s.phase = "question";
  s.questionStartedAt = now;
  s.questionDeadline = now + QUESTION_TIME_MS;
  s.answeringId = null;
  s.answerDeadline = 0;
  s.revealDeadline = 0;
  s.lastResult = null;
  for (const player of s.players) player.eliminated = false;
}

/**
 * 締め切りを過ぎた処理をまとめて進める。
 * メッセージを受けたときも Alarm のときも、入力を処理する前に必ず呼ぶ。
 */
export function tick(state: GameState, now: number): GameState {
  let s = state;
  for (;;) {
    const before = s;
    if (s.phase === "question" && now >= s.questionDeadline) {
      s = enterReveal(s, now);
    } else if (
      s.phase === "answering" &&
      now >= Math.min(s.answerDeadline, s.questionDeadline)
    ) {
      s = eliminateAnswerer(s, now);
    } else if (s.phase === "reveal" && now >= s.revealDeadline) {
      s = advanceRound(s, now);
    }
    if (s === before) break;
  }
  return s;
}

function enterReveal(state: GameState, now: number): GameState {
  const s = clone(state);
  s.phase = "reveal";
  s.revealDeadline = now + REVEAL_TIME_MS;
  s.answeringId = null;
  s.answerDeadline = 0;
  return s;
}

function eliminateAnswerer(state: GameState, now: number): GameState {
  const s = clone(state);
  const player = s.players.find((p) => p.id === s.answeringId);
  if (player) {
    player.eliminated = true;
    player.score += WRONG_POINTS;
    s.lastResult = {
      playerId: player.id,
      correct: false,
      points: WRONG_POINTS,
      choice: null,
      round: s.round,
    };
  }
  s.answeringId = null;
  s.answerDeadline = 0;
  if (s.players.some((p) => !p.eliminated)) {
    s.phase = "question";
  } else {
    s.phase = "reveal";
    s.revealDeadline = now + REVEAL_TIME_MS;
  }
  return s;
}

function advanceRound(state: GameState, now: number): GameState {
  const s = clone(state);
  const next = s.round + 1;
  if (next >= s.order.length) {
    s.phase = "finished";
    s.round = s.order.length;
    s.answeringId = null;
    s.answerDeadline = 0;
    s.revealDeadline = 0;
    return s;
  }
  s.round = next;
  beginQuestion(s, now);
  return s;
}

/** 早押し。question のとき、まだ失格していない最初の1人だけが回答権を得る。 */
export function buzz(
  state: GameState,
  playerId: string,
  round: number,
  now: number,
): GameState {
  const s = tick(state, now);
  if (s.phase !== "question" || round !== s.round) return s;
  const player = s.players.find((p) => p.id === playerId);
  if (!player || player.eliminated) return s;
  const next = clone(s);
  next.phase = "answering";
  next.answeringId = playerId;
  next.answerDeadline = Math.min(now + ANSWER_TIME_MS, next.questionDeadline);
  return next;
}

/** 4択の回答。回答権を持つ本人の、正しい問題番号の入力だけ受け付ける。 */
export function answer(
  state: GameState,
  playerId: string,
  round: number,
  choice: number,
  now: number,
): GameState {
  const s = tick(state, now);
  if (s.phase !== "answering" || s.answeringId !== playerId || round !== s.round) {
    return s;
  }
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return s;
  const question = QUESTIONS[s.order[s.round] ?? -1];
  const player = s.players.find((p) => p.id === playerId);
  if (!question || !player) return s;

  const next = clone(s);
  const answering = next.players.find((p) => p.id === playerId)!;
  if (question.correct === choice) {
    answering.score += CORRECT_POINTS;
    next.lastResult = {
      playerId,
      correct: true,
      points: CORRECT_POINTS,
      choice,
      round,
    };
    next.phase = "reveal";
    next.revealDeadline = now + REVEAL_TIME_MS;
    next.answeringId = null;
    next.answerDeadline = 0;
  } else {
    answering.eliminated = true;
    answering.score += WRONG_POINTS;
    next.lastResult = {
      playerId,
      correct: false,
      points: WRONG_POINTS,
      choice,
      round,
    };
    next.answeringId = null;
    next.answerDeadline = 0;
    if (next.players.some((p) => !p.eliminated)) {
      next.phase = "question";
    } else {
      next.phase = "reveal";
      next.revealDeadline = now + REVEAL_TIME_MS;
    }
  }
  return next;
}

/** 次に Alarm を鳴らすべき時刻。無ければ null。 */
export function nextDeadline(state: GameState): number | null {
  if (state.phase === "question") return state.questionDeadline;
  if (state.phase === "answering") {
    return Math.min(state.answerDeadline, state.questionDeadline);
  }
  if (state.phase === "reveal") return state.revealDeadline;
  return null;
}

export interface RankEntry {
  playerId: string;
  name: string;
  score: number;
  rank: number;
}

/** 同点は同じ順位にする最終順位表。 */
export function computeRanking(state: GameState): RankEntry[] {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const ranking: RankEntry[] = [];
  let previousScore: number | null = null;
  let previousRank = 0;
  sorted.forEach((player, index) => {
    const rank = previousScore !== null && player.score === previousScore
      ? previousRank
      : index + 1;
    ranking.push({
      playerId: player.id,
      name: player.name,
      score: player.score,
      rank,
    });
    previousScore = player.score;
    previousRank = rank;
  });
  return ranking;
}

export interface PublicState {
  t: "state";
  code: string;
  phase: Phase;
  hostId: string;
  you: string;
  serverNow: number;
  round: number;
  totalQuestions: number;
  players: PlayerState[];
  questionText: string | null;
  choices: string[] | null;
  answeringId: string | null;
  questionDeadline: number | null;
  answerDeadline: number | null;
  revealDeadline: number | null;
  correctIndex: number | null;
  lastResult: AnswerResult | null;
  ranking: RankEntry[] | null;
}

/**
 * クライアントへ送る状態を作る。
 * - tokens は含めない
 * - 出題中・回答中は correctIndex を null にする（正解は reveal のときだけ）
 */
export function publicState(
  state: GameState,
  forPlayerId: string,
  now: number,
): PublicState {
  const question = state.order.length > 0 ? QUESTIONS[state.order[state.round] ?? -1] : undefined;
  const showQuestion = question !== undefined && state.phase !== "finished";
  const reveal = state.phase === "reveal" || state.phase === "finished";

  return {
    t: "state",
    code: state.code,
    phase: state.phase,
    hostId: state.hostId,
    you: forPlayerId,
    serverNow: now,
    round: state.round,
    totalQuestions: state.order.length,
    players: state.players.map((p) => ({ ...p })),
    questionText: showQuestion ? question.text : null,
    choices: showQuestion ? [...question.choices] : null,
    answeringId: state.answeringId,
    questionDeadline:
      state.phase === "question" || state.phase === "answering"
        ? state.questionDeadline
        : null,
    answerDeadline: state.phase === "answering" ? state.answerDeadline : null,
    revealDeadline: state.phase === "reveal" ? state.revealDeadline : null,
    correctIndex: reveal && question ? question.correct : null,
    lastResult: state.lastResult ? { ...state.lastResult } : null,
    ranking: state.phase === "finished" ? computeRanking(state) : null,
  };
}
