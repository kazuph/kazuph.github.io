/**
 * ゲームの規則だけを書いた純粋関数の集まり。
 *
 * - 時刻はすべて引数の `now`（サーバーの時計、ミリ秒）で決める。
 * - どの関数も受け取った `state` は書き換えず、新しい state を返す。
 * - 締め切りを過ぎた処理は、入力を処理する前に `tick` でまとめて進める。
 */
import { QUESTIONS, pickQuestions } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const QUESTIONS_PER_GAME = 10;
export const QUESTION_TIME_MS = 20_000;
export const ANSWER_TIME_MS = 10_000;
export const REVEAL_TIME_MS = 3_000;
export const POINTS_CORRECT = 10;
export const POINTS_WRONG = -5;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  token: string;
  score: number;
  connected: boolean;
  /** この問題で不正解・時間切れになり、もう押せない。 */
  lockedOut: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: Phase;
  players: Player[];
  /** 0 始まり。ロビーでは -1。 */
  questionIndex: number;
  /** 出題する問題の番号（QUESTIONS の添字）を並べたもの。 */
  questionOrder: number[];
  questionStartedAt: number | null;
  questionDeadline: number | null;
  answeringPlayerId: string | null;
  answeringDeadline: number | null;
  revealDeadline: number | null;
}

export interface RankedPlayer {
  id: string;
  name: string;
  score: number;
  rank: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  lockedOut: boolean;
  isHost: boolean;
  answering: boolean;
}

export interface PublicQuestion {
  text: string;
  choices: readonly string[];
}

export interface PublicState {
  code: string;
  phase: Phase;
  hostId: string;
  you: string;
  questionIndex: number;
  totalQuestions: number;
  players: PublicPlayer[];
  question: PublicQuestion | null;
  correctIndex: number | null;
  answeringPlayerId: string | null;
  questionStartedAt: number | null;
  questionDeadline: number | null;
  answeringDeadline: number | null;
  revealDeadline: number | null;
  serverNow: number;
  canStart: boolean;
  minPlayers: number;
  maxPlayers: number;
  ranking: RankedPlayer[] | null;
}

export interface Outcome {
  state: RoomState;
  error?: string;
}

export interface BuzzOutcome extends Outcome {
  /** 古い問題番号など、黙って捨てる入力。 */
  ignored?: boolean;
}

export function cloneState(state: RoomState): RoomState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player })),
    questionOrder: [...state.questionOrder],
  };
}

export function createRoom(code: string, host: Player): RoomState {
  return {
    code,
    hostId: host.id,
    phase: "lobby",
    players: [{ ...host }],
    questionIndex: -1,
    questionOrder: [],
    questionStartedAt: null,
    questionDeadline: null,
    answeringPlayerId: null,
    answeringDeadline: null,
    revealDeadline: null,
  };
}

export function findPlayer(state: RoomState, playerId: string | null): Player | undefined {
  if (!playerId) return undefined;
  return state.players.find((player) => player.id === playerId);
}

function allLockedOut(state: RoomState): boolean {
  return state.players.every((player) => player.lockedOut);
}

/** ロビーから参加させる。定員とフェーズをここで守る。 */
export function joinRoom(state: RoomState, player: Player): Outcome {
  if (state.phase !== "lobby") {
    return {
      state,
      error: state.phase === "finished" ? "ゲームは終了しました" : "ゲームはもう始まっています",
    };
  }
  if (state.players.length >= MAX_PLAYERS) {
    return { state, error: "満員です（4人まで）" };
  }
  if (state.players.some((existing) => existing.id === player.id)) {
    return { state };
  }
  const next = cloneState(state);
  next.players.push({ ...player });
  return { state: next };
}

function beginReveal(state: RoomState, now: number): void {
  state.phase = "reveal";
  state.answeringPlayerId = null;
  state.answeringDeadline = null;
  state.questionDeadline = null;
  state.revealDeadline = now + REVEAL_TIME_MS;
}

function beginNextQuestion(state: RoomState, now: number): void {
  state.questionIndex += 1;
  if (state.questionIndex >= state.questionOrder.length) {
    state.phase = "finished";
    state.questionStartedAt = null;
    state.questionDeadline = null;
    state.answeringPlayerId = null;
    state.answeringDeadline = null;
    state.revealDeadline = null;
    return;
  }
  state.phase = "question";
  state.questionStartedAt = now;
  state.questionDeadline = now + QUESTION_TIME_MS;
  state.answeringPlayerId = null;
  state.answeringDeadline = null;
  state.revealDeadline = null;
  for (const player of state.players) {
    player.lockedOut = false;
  }
}

/** 回答権を失った人を記録し、次のフェーズへ進める。 */
function finishAnswering(state: RoomState, player: Player | undefined, now: number): void {
  if (player) {
    player.lockedOut = true;
  }
  state.answeringPlayerId = null;
  state.answeringDeadline = null;
  const questionOver = state.questionDeadline !== null && now >= state.questionDeadline;
  if (questionOver || allLockedOut(state)) {
    beginReveal(state, now);
  } else {
    state.phase = "question";
  }
}

/** 締め切りを1つだけ進める。進めたら true。 */
function advanceOnce(state: RoomState, now: number): boolean {
  switch (state.phase) {
    case "question": {
      if (state.questionDeadline !== null && now >= state.questionDeadline) {
        beginReveal(state, now);
        return true;
      }
      return false;
    }
    case "answering": {
      if (state.answeringDeadline !== null && now >= state.answeringDeadline) {
        const player = findPlayer(state, state.answeringPlayerId);
        if (player) {
          player.score += POINTS_WRONG;
        }
        finishAnswering(state, player, now);
        return true;
      }
      return false;
    }
    case "reveal": {
      if (state.revealDeadline !== null && now >= state.revealDeadline) {
        beginNextQuestion(state, now);
        return true;
      }
      return false;
    }
    default:
      return false;
  }
}

/** 締め切りを過ぎた処理を、進まなくなるまでまとめて進める。 */
export function tick(state: RoomState, now: number): RoomState {
  const next = cloneState(state);
  let guard = 0;
  while (guard < 100 && advanceOnce(next, now)) {
    guard += 1;
  }
  return next;
}

/** いちばん近い締め切り。Alarm はこれを1つだけ予約する。 */
export function nextDeadline(state: RoomState): number | null {
  switch (state.phase) {
    case "question":
      return state.questionDeadline;
    case "answering":
      return state.answeringDeadline;
    case "reveal":
      return state.revealDeadline;
    default:
      return null;
  }
}

export function startGame(
  state: RoomState,
  playerId: string,
  now: number,
  rng: () => number = Math.random,
): Outcome {
  const next = tick(state, now);
  if (next.phase !== "lobby") {
    return { state: next, error: "ゲームはもう始まっています" };
  }
  if (next.hostId !== playerId) {
    return { state: next, error: "開始できるのは部屋を作った人だけです" };
  }
  if (next.players.length < MIN_PLAYERS) {
    return { state: next, error: "開始するには2人以上必要です" };
  }
  next.questionOrder = pickQuestions(QUESTIONS_PER_GAME, rng);
  next.questionIndex = -1;
  beginNextQuestion(next, now);
  return { state: next };
}

/** 早押し。最初に処理された1人だけが回答権を得る。 */
export function buzz(
  state: RoomState,
  playerId: string,
  questionIndex: number,
  now: number,
): BuzzOutcome {
  const next = tick(state, now);
  if (questionIndex !== next.questionIndex) {
    return { state: next, ignored: true };
  }
  if (next.phase !== "question") {
    return { state: next, error: "今は早押しできません" };
  }
  const player = findPlayer(next, playerId);
  if (!player) {
    return { state: next, error: "参加者が見つかりません" };
  }
  if (player.lockedOut) {
    return { state: next, error: "この問題ではもう押せません" };
  }
  next.phase = "answering";
  next.answeringPlayerId = player.id;
  const limit = next.questionDeadline ?? now + ANSWER_TIME_MS;
  next.answeringDeadline = Math.min(now + ANSWER_TIME_MS, limit);
  return { state: next };
}

/** 4択の回答。正誤の判定と点数の計算はここ（サーバー側）で行う。 */
export function answer(
  state: RoomState,
  playerId: string,
  questionIndex: number,
  choice: number,
  now: number,
): Outcome {
  const next = tick(state, now);
  if (questionIndex !== next.questionIndex) {
    return { state: next, error: "問題が変わっています" };
  }
  if (next.phase !== "answering") {
    return { state: next, error: "今は回答できません" };
  }
  if (next.answeringPlayerId !== playerId) {
    return { state: next, error: "回答権がありません" };
  }
  const player = findPlayer(next, playerId);
  if (!player) {
    return { state: next, error: "参加者が見つかりません" };
  }
  const question = QUESTIONS[next.questionOrder[next.questionIndex]];
  if (choice === question.correctIndex) {
    player.score += POINTS_CORRECT;
    beginReveal(next, now);
  } else {
    player.score += POINTS_WRONG;
    finishAnswering(next, player, now);
  }
  return { state: next };
}

/** 点数の高い順。同点は同じ順位にする（1, 2, 2, 4）。 */
export function ranking(state: RoomState): RankedPlayer[] {
  const sorted = [...state.players].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"),
  );
  const result: RankedPlayer[] = [];
  let previousScore: number | null = null;
  let rank = 0;
  sorted.forEach((player, index) => {
    if (previousScore === null || player.score !== previousScore) {
      rank = index + 1;
      previousScore = player.score;
    }
    result.push({ id: player.id, name: player.name, score: player.score, rank });
  });
  return result;
}

/** ブラウザに送る状態。出題中・回答中は正解の番号を含めない。 */
export function publicState(state: RoomState, viewerId: string, now: number): PublicState {
  const showingQuestion =
    state.phase === "question" || state.phase === "answering" || state.phase === "reveal";
  const question =
    showingQuestion && state.questionIndex >= 0
      ? QUESTIONS[state.questionOrder[state.questionIndex]]
      : null;
  const reveal = state.phase === "reveal";
  return {
    code: state.code,
    phase: state.phase,
    hostId: state.hostId,
    you: viewerId,
    questionIndex: state.questionIndex,
    totalQuestions: state.questionOrder.length || QUESTIONS_PER_GAME,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      connected: player.connected,
      lockedOut: player.lockedOut,
      isHost: player.id === state.hostId,
      answering: player.id === state.answeringPlayerId,
    })),
    question: question ? { text: question.text, choices: question.choices } : null,
    correctIndex: reveal && question ? question.correctIndex : null,
    answeringPlayerId: state.answeringPlayerId,
    questionStartedAt: state.questionStartedAt,
    questionDeadline: state.questionDeadline,
    answeringDeadline: state.answeringDeadline,
    revealDeadline: state.revealDeadline,
    serverNow: now,
    canStart: state.phase === "lobby" && state.hostId === viewerId && state.players.length >= MIN_PLAYERS,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    ranking: state.phase === "finished" ? ranking(state) : null,
  };
}
