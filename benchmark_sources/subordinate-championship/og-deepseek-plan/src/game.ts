/**
 * 早押しクイズの規則だけを書いた純粋関数の集まり。
 * 時計は必ず引数の now で受け取り、内部では Date.now() を呼ばない。
 * 状態はその場で書き換える（呼び出し側の Durable Object が保存する）。
 */
import { QUESTIONS, type Question } from './questions';

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const QUESTION_COUNT = 10;
export const QUESTION_MS = 20_000;
export const ANSWER_MS = 10_000;
export const REVEAL_MS = 3_000;

export type Phase = 'lobby' | 'question' | 'answering' | 'reveal' | 'finished';

export interface PlayerState {
  id: string;
  name: string;
  /** 再接続のための秘密。クライアントには絶対に送らない。 */
  token: string;
  score: number;
  connected: boolean;
  /** その問題で不正解・時間切れになり、もう押せない。 */
  lockedOut: boolean;
}

export interface LastAnswer {
  playerId: string;
  choice: number;
  correct: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: Phase;
  players: PlayerState[];
  /** 選ばれた10問の QUESTIONS 上の添字。 */
  questionIds: number[];
  questionIndex: number;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  answeringPlayerId: string | null;
  answerStartedAt: number | null;
  answerEndsAt: number | null;
  revealedCorrect: number | null;
  revealStartedAt: number | null;
  revealEndsAt: number | null;
  lastAnswer: LastAnswer | null;
  finishedAt: number | null;
  seed: number;
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

export interface PublicState {
  t: 'state';
  code: string;
  you: string;
  serverNow: number;
  phase: Phase;
  hostId: string;
  players: PublicPlayer[];
  questionIndex: number;
  totalQuestions: number;
  question: { text: string; choices: readonly string[] } | null;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  answeringPlayerId: string | null;
  answerStartedAt: number | null;
  answerEndsAt: number | null;
  revealStartedAt: number | null;
  revealEndsAt: number | null;
  lastAnswer: LastAnswer | null;
  correctIndex?: number;
  ranking?: PublicRanking[];
}

export interface PublicRanking {
  rank: number;
  playerId: string;
  name: string;
  score: number;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export function newPlayer(id: string, name: string, token: string, connected = true): PlayerState {
  return { id, name, token, score: 0, connected, lockedOut: false };
}

export function createRoomState(
  code: string,
  hostId: string,
  hostName: string,
  hostToken: string,
  now: number,
  seed: number,
): RoomState {
  return {
    code,
    hostId,
    phase: 'lobby',
    players: [newPlayer(hostId, hostName, hostToken)],
    questionIds: [],
    questionIndex: 0,
    questionStartedAt: null,
    questionEndsAt: null,
    answeringPlayerId: null,
    answerStartedAt: null,
    answerEndsAt: null,
    revealedCorrect: null,
    revealStartedAt: null,
    revealEndsAt: null,
    lastAnswer: null,
    finishedAt: null,
    seed,
  };
}

export function findPlayer(state: RoomState, playerId: string): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId);
}

export function currentQuestion(state: RoomState): Question | null {
  const id = state.questionIds[state.questionIndex];
  if (id === undefined) return null;
  return QUESTIONS[id] ?? null;
}

/** 部屋に入る。成功なら null、失敗なら画面に出す理由を返す。 */
export function joinRoom(
  state: RoomState,
  id: string,
  name: string,
  token: string,
  _now: number,
): string | null {
  if (state.players.length >= MAX_PLAYERS) return '満員です（4人まで）';
  if (state.phase !== 'lobby') return 'ゲームはもう始まっています';
  state.players.push(newPlayer(id, name, token));
  return null;
}

/** ホストがゲームを開始する。成功なら null。 */
export function startGame(state: RoomState, playerId: string, now: number): string | null {
  if (state.phase !== 'lobby') return 'ゲームはすでに始まっています';
  if (state.hostId !== playerId) return 'ホストだけがゲームを開始できます';
  if (state.players.length < MIN_PLAYERS) return '2人以上で開始できます';
  if (state.players.length > MAX_PLAYERS) return '4人までで開始できます';

  state.questionIds = pickQuestions(state.seed);
  state.questionIndex = 0;
  state.lastAnswer = null;
  state.finishedAt = null;
  startQuestion(state, now);
  return null;
}

/** 最初の1人だけが回答権を得る。 */
export function handleBuzz(
  state: RoomState,
  playerId: string,
  questionNumber: number,
  now: number,
): ActionResult {
  if (state.phase !== 'question') return { ok: false, error: 'いまは早押しできません' };
  if (questionNumber !== state.questionIndex + 1) {
    return { ok: false, error: 'この問題の早押しではありません' };
  }
  const player = findPlayer(state, playerId);
  if (!player) return { ok: false, error: 'プレイヤーが見つかりません' };
  if (player.lockedOut) return { ok: false, error: 'この問題ではもう押せません' };
  if (state.questionEndsAt !== null && now >= state.questionEndsAt) {
    return { ok: false, error: 'この問題は締め切られました' };
  }

  state.phase = 'answering';
  state.answeringPlayerId = playerId;
  state.answerStartedAt = now;
  state.answerEndsAt = Math.min(now + ANSWER_MS, state.questionEndsAt ?? now + ANSWER_MS);
  return { ok: true };
}

/** 回答権を持つ人の4択。正誤判定はここ（サーバー側）だけで行う。 */
export function handleAnswer(
  state: RoomState,
  playerId: string,
  questionNumber: number,
  choice: number,
  now: number,
): ActionResult {
  if (state.phase !== 'answering') return { ok: false, error: 'いまは回答できません' };
  if (state.answeringPlayerId !== playerId) {
    return { ok: false, error: '回答権を持っている人だけが答えられます' };
  }
  if (questionNumber !== state.questionIndex + 1) {
    return { ok: false, error: 'この問題の回答ではありません' };
  }
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
    return { ok: false, error: '選択肢が不正です' };
  }
  if (state.answerEndsAt !== null && now >= state.answerEndsAt) {
    return { ok: false, error: '回答時間が終わりました' };
  }

  const question = currentQuestion(state);
  const player = findPlayer(state, playerId);
  if (!question || !player) return { ok: false, error: '問題が見つかりません' };

  const correct = choice === question.correctIndex;
  player.score += correct ? 10 : -5;
  state.lastAnswer = { playerId, choice, correct };

  if (correct) {
    enterReveal(state, now);
  } else {
    player.lockedOut = true;
    state.answeringPlayerId = null;
    state.answerStartedAt = null;
    state.answerEndsAt = null;
    if (allLockedOut(state) || pastQuestionDeadline(state, now)) {
      enterReveal(state, now);
    } else {
      state.phase = 'question';
    }
  }
  return { ok: true };
}

/**
 * 締め切りを過ぎた処理をまとめて進める。
 * メッセージを受けたときも Alarm のときも、必ず入力処理の前にこれを呼ぶ。
 */
export function tick(state: RoomState, now: number): boolean {
  let changed = false;
  for (let guard = 0; guard < 100; guard += 1) {
    if (
      state.phase === 'question' &&
      state.questionEndsAt !== null &&
      now >= state.questionEndsAt
    ) {
      enterReveal(state, now);
      changed = true;
      continue;
    }
    if (
      state.phase === 'answering' &&
      state.answerEndsAt !== null &&
      now >= state.answerEndsAt
    ) {
      timeoutAnswer(state, now);
      changed = true;
      continue;
    }
    if (state.phase === 'reveal' && state.revealEndsAt !== null && now >= state.revealEndsAt) {
      advanceAfterReveal(state, now);
      changed = true;
      continue;
    }
    break;
  }
  return changed;
}

function startQuestion(state: RoomState, now: number): void {
  state.phase = 'question';
  state.questionStartedAt = now;
  state.questionEndsAt = now + QUESTION_MS;
  state.answeringPlayerId = null;
  state.answerStartedAt = null;
  state.answerEndsAt = null;
  state.revealedCorrect = null;
  state.revealStartedAt = null;
  state.revealEndsAt = null;
  state.lastAnswer = null;
  for (const player of state.players) player.lockedOut = false;
}

function enterReveal(state: RoomState, now: number): void {
  const question = currentQuestion(state);
  state.phase = 'reveal';
  state.revealedCorrect = question ? question.correctIndex : null;
  state.answeringPlayerId = null;
  state.answerStartedAt = null;
  state.answerEndsAt = null;
  state.revealStartedAt = now;
  state.revealEndsAt = now + REVEAL_MS;
}

function advanceAfterReveal(state: RoomState, now: number): void {
  if (state.questionIndex + 1 >= QUESTION_COUNT) {
    state.phase = 'finished';
    state.finishedAt = now;
    state.answeringPlayerId = null;
    state.answerStartedAt = null;
    state.answerEndsAt = null;
    state.revealStartedAt = null;
    state.revealEndsAt = null;
    return;
  }
  state.questionIndex += 1;
  startQuestion(state, now);
}

function timeoutAnswer(state: RoomState, now: number): void {
  const player = state.answeringPlayerId
    ? findPlayer(state, state.answeringPlayerId)
    : undefined;
  if (player) {
    player.score -= 5;
    player.lockedOut = true;
    state.lastAnswer = { playerId: player.id, choice: -1, correct: false };
  }
  state.answeringPlayerId = null;
  state.answerStartedAt = null;
  state.answerEndsAt = null;
  if (allLockedOut(state) || pastQuestionDeadline(state, now)) {
    enterReveal(state, now);
  } else {
    state.phase = 'question';
  }
}

function pastQuestionDeadline(state: RoomState, now: number): boolean {
  return state.questionEndsAt !== null && now >= state.questionEndsAt;
}

function allLockedOut(state: RoomState): boolean {
  return state.players.length > 0 && state.players.every((player) => player.lockedOut);
}

/** 同点は同じ順位（1, 2, 2, 4 の形式）。 */
export function buildRanking(state: RoomState): PublicRanking[] {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const ranking: PublicRanking[] = [];
  sorted.forEach((player, index) => {
    const previous = ranking[index - 1];
    const rank = previous && previous.score === player.score ? previous.rank : index + 1;
    ranking.push({ rank, playerId: player.id, name: player.name, score: player.score });
  });
  return ranking;
}

/** クライアントに送ってよい情報だけを組み立てる。token と正解は出題中は含めない。 */
export function toPublicState(state: RoomState, now: number, you: string): PublicState {
  const question = currentQuestion(state);
  const showQuestion =
    question !== null &&
    (state.phase === 'question' || state.phase === 'answering' || state.phase === 'reveal');

  const publicState: PublicState = {
    t: 'state',
    code: state.code,
    you,
    serverNow: now,
    phase: state.phase,
    hostId: state.hostId,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      connected: player.connected,
      lockedOut: player.lockedOut,
      isHost: player.id === state.hostId,
      answering: player.id === state.answeringPlayerId,
    })),
    questionIndex: state.questionIndex,
    totalQuestions: QUESTION_COUNT,
    question:
      showQuestion && question
        ? { text: question.text, choices: [...question.choices] }
        : null,
    questionStartedAt: state.questionStartedAt,
    questionEndsAt: state.questionEndsAt,
    answeringPlayerId: state.answeringPlayerId,
    answerStartedAt: state.answerStartedAt,
    answerEndsAt: state.answerEndsAt,
    revealStartedAt: state.revealStartedAt,
    revealEndsAt: state.revealEndsAt,
    lastAnswer: state.lastAnswer,
  };

  if (state.phase === 'reveal' && state.revealedCorrect !== null) {
    publicState.correctIndex = state.revealedCorrect;
  }
  if (state.phase === 'finished') {
    publicState.ranking = buildRanking(state);
  }
  return publicState;
}

/** 毎回この中から10問を選ぶ。seed が同じなら同じ並びになる。 */
export function pickQuestions(seed: number): number[] {
  const indices = QUESTIONS.map((_, index) => index);
  const random = mulberry32(seed);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, QUESTION_COUNT);
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
