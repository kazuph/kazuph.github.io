/**
 * ゲームの規則（純粋関数）。
 *
 * 状態はすべてサーバーの時計で決める。時刻 `now`（epoch ミリ秒）を引数で受け取り、
 * 副作用（IO・タイマー・WebSocket）は持たない。 Durable Object からは
 * 「今の状態を読み、tick を通し、入力の関数を呼び、結果を保存する」という
 * だけの順番で使われる。
 */

import { QUESTION_BANK, TOTAL_QUESTIONS, type Question } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
/** 出題から問題の締め切りまで */
export const QUESTION_WINDOW_MS = 20_000;
/** 回答権を得てから回答の締め切りまで */
export const ANSWER_WINDOW_MS = 10_000;
/** 正解を表示する時間 */
export const REVEAL_WINDOW_MS = 3_000;
export const CORRECT_SCORE = 10;
export const WRONG_SCORE = -5;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  /** 再接続用の秘密トークン。クライアントには絶対に送らない。 */
  token: string;
  score: number;
  connected: boolean;
  /** 現在の問題で失格したか（正解以外で回答した、または時間切れ） */
  eliminated: boolean;
}

export interface Outcome {
  /** 回答したプレイヤー */
  playerId: string;
  playerName: string;
  /** 選んだ選択肢（時間切れは null） */
  choice: number | null;
  /** 正解だったか */
  correct: boolean;
  /** 制限時間切れで失格したか */
  timedOut: boolean;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  hostId: string;
  /** 出題する問題の.question bank の添字（10問ぶんの並び） */
  questionOrder: number[];
  /** いま出題中の問題の番号（0 始まり）。ロビーでは -1 */
  questionIndex: number;
  questionStartAt: number;
  questionDeadline: number;
  /** 回答権を持つプレイヤー */
  buzzPlayerId: string | null;
  /** 回答権を得た時刻 */
  buzzAt: number | null;
  /** 回答の締め切り */
  answerDeadline: number | null;
  /** 直近の回答の結果（正解の添字は含めない） */
  lastOutcome: Outcome | null;
  /** 正解表示の期限 */
  revealUntil: number | null;
  /** 表示中の問題の正解の添字（reveal / finished のときだけ公開する） */
  revealCorrect: number | null;
}

export function createState(hostId: string, now: number): GameState {
  return {
    phase: "lobby",
    players: [],
    hostId,
    questionOrder: [],
    questionIndex: -1,
    questionStartAt: now,
    questionDeadline: now,
    buzzPlayerId: null,
    buzzAt: null,
    answerDeadline: null,
    lastOutcome: null,
    revealUntil: null,
    revealCorrect: null,
  };
}

export function findPlayer(state: GameState, id: string | null): Player | undefined {
  if (!id) return undefined;
  return state.players.find((p) => p.id === id);
}

export function findPlayerByToken(state: GameState, token: string): Player | undefined {
  return state.players.find((p) => p.token === token);
}

/** 現在の問題の取得。ロビーや結果画面では null。 */
export function currentQuestion(state: GameState): Question | null {
  if (state.questionIndex < 0) return null;
  const bankIndex = state.questionOrder[state.questionIndex];
  if (bankIndex === undefined) return null;
  return QUESTION_BANK[bankIndex] ?? null;
}

export type JoinResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function canJoin(state: GameState): JoinResult {
  if (state.phase !== "lobby") {
    return { ok: false, status: 409, error: "ゲームはもう始まっています" };
  }
  if (state.players.length >= MAX_PLAYERS) {
    return { ok: false, status: 409, error: "満員です（4人まで）" };
  }
  return { ok: true };
}

export function addPlayer(
  state: GameState,
  id: string,
  name: string,
  token: string,
  now: number,
): JoinResult {
  const check = canJoin(state);
  if (!check.ok) return check;
  state.players.push({
    id,
    name,
    token,
    score: 0,
    connected: false,
    eliminated: false,
  });
  void now;
  return { ok: true };
}

export function removePlayer(state: GameState, id: string): void {
  const index = state.players.findIndex((p) => p.id === id);
  if (index >= 0) state.players.splice(index, 1);
}

/** Fisher-Yates。テストでは安全な乱数源を注入できる。 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type StartResult = { ok: true } | { ok: false; error: string };

export function startGame(
  state: GameState,
  now: number,
  random: () => number = Math.random,
): StartResult {
  // ホストかどうかの判定は呼び出し側（Durable Object）で行う。
  if (state.phase !== "lobby") {
    return { ok: false, error: "ゲームはすでに始まっています" };
  }
  if (state.players.length < MIN_PLAYERS) {
    return { ok: false, error: "2人以上の参加者がいると開始できます" };
  }
  if (state.players.length > MAX_PLAYERS) {
    return { ok: false, error: "4人までしか開始できません" };
  }
  const order = shuffle(
    QUESTION_BANK.map((_, i) => i),
    random,
  ).slice(0, TOTAL_QUESTIONS);
  state.questionOrder = order;
  state.questionIndex = 0;
  state.questionStartAt = now;
  state.questionDeadline = now + QUESTION_WINDOW_MS;
  state.phase = "question";
  state.buzzPlayerId = null;
  state.buzzAt = null;
  state.answerDeadline = null;
  state.lastOutcome = null;
  state.revealUntil = null;
  state.revealCorrect = null;
  for (const player of state.players) {
    player.eliminated = false;
  }
  return { ok: true };
}

/** 失格していないプレイヤーが残っているか */
function hasRemainingPlayer(state: GameState): boolean {
  return state.players.some((p) => !p.eliminated);
}

function beginReveal(state: GameState, question: Question, now: number): void {
  state.phase = "reveal";
  state.revealUntil = now + REVEAL_WINDOW_MS;
  state.revealCorrect = question.correct;
  state.buzzPlayerId = null;
  state.buzzAt = null;
  state.answerDeadline = null;
}

function nextQuestion(state: GameState, now: number): void {
  state.questionIndex += 1;
  state.lastOutcome = null;
  state.revealCorrect = null;
  state.buzzPlayerId = null;
  state.buzzAt = null;
  state.answerDeadline = null;
  if (state.questionIndex >= state.questionOrder.length) {
    state.phase = "finished";
    state.revealUntil = null;
    return;
  }
  state.phase = "question";
  state.questionStartAt = now;
  state.questionDeadline = now + QUESTION_WINDOW_MS;
  for (const player of state.players) {
    player.eliminated = false;
  }
}

/**
 * 期限切れの処理を進める。Returns true if state changed.
 * メッセージの処理前と Alarm の両方で呼ぶ。
 */
export function tick(state: GameState, now: number): boolean {
  let changed = false;
  for (;;) {
    if (state.phase === "question") {
      if (now < state.questionDeadline) break;
      const question = currentQuestion(state);
      if (!question) {
        state.phase = "finished";
        changed = true;
        break;
      }
      beginReveal(state, question, now);
      changed = true;
      continue;
    }
    if (state.phase === "answering") {
      const deadline = state.answerDeadline ?? state.questionDeadline;
      if (now < deadline) break;
      const question = currentQuestion(state);
      if (!question) {
        state.phase = "finished";
        changed = true;
        break;
      }
      const player = findPlayer(state, state.buzzPlayerId);
      if (player) {
        player.score += WRONG_SCORE;
        player.eliminated = true;
        state.lastOutcome = {
          playerId: player.id,
          playerName: player.name,
          choice: null,
          correct: false,
          timedOut: true,
        };
      }
      state.buzzPlayerId = null;
      state.buzzAt = null;
      state.answerDeadline = null;
      changed = true;
      if (now >= state.questionDeadline) {
        beginReveal(state, question, now);
      } else if (hasRemainingPlayer(state)) {
        // 残りの人で早押しを再開する。問題の締め切りは変えない。
        state.phase = "question";
      } else {
        beginReveal(state, question, now);
      }
      continue;
    }
    if (state.phase === "reveal") {
      if (state.revealUntil === null || now < state.revealUntil) break;
      nextQuestion(state, now);
      changed = true;
      continue;
    }
    break;
  }
  return changed;
}

export type BuzzResult = { ok: true } | { ok: false; error: string };

export function buzz(state: GameState, playerId: string, questionIndex: number, now: number): BuzzResult {
  if (state.phase !== "question") {
    return { ok: false, error: "今は早押しできません" };
  }
  if (questionIndex !== state.questionIndex) {
    return { ok: false, error: "古い問題への早押しです" };
  }
  const player = findPlayer(state, playerId);
  if (!player) {
    return { ok: false, error: "参加していないプレイヤーです" };
  }
  if (player.eliminated) {
    return { ok: false, error: "この問題ではすでに回答済みです" };
  }
  // サーバーが最初に受け取った1人だけが回答権を得る。
  state.phase = "answering";
  state.buzzPlayerId = playerId;
  state.buzzAt = now;
  state.answerDeadline = Math.min(now + ANSWER_WINDOW_MS, state.questionDeadline);
  state.lastOutcome = null;
  return { ok: true };
}

export type AnswerResult = { ok: true } | { ok: false; error: string };

export function answer(
  state: GameState,
  playerId: string,
  questionIndex: number,
  choice: number,
  now: number,
): AnswerResult {
  if (state.phase !== "answering") {
    return { ok: false, error: "回答できる状態ではありません" };
  }
  if (questionIndex !== state.questionIndex) {
    return { ok: false, error: "古い問題への回答です" };
  }
  if (state.buzzPlayerId !== playerId) {
    return { ok: false, error: "回答権がありません" };
  }
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
    return { ok: false, error: "選択肢が不正です" };
  }
  const question = currentQuestion(state);
  if (!question) {
    return { ok: false, error: "問題がありません" };
  }
  const player = findPlayer(state, playerId);
  if (!player) {
    return { ok: false, error: "参加していないプレイヤーです" };
  }
  const isCorrect = choice === question.correct;
  state.lastOutcome = {
    playerId: player.id,
    playerName: player.name,
    choice,
    correct: isCorrect,
    timedOut: false,
  };
  state.buzzPlayerId = null;
  state.buzzAt = null;
  state.answerDeadline = null;
  if (isCorrect) {
    player.score += CORRECT_SCORE;
    beginReveal(state, question, now);
  } else {
    player.score += WRONG_SCORE;
    player.eliminated = true;
    if (hasRemainingPlayer(state)) {
      state.phase = "question";
    } else {
      beginReveal(state, question, now);
    }
  }
  return { ok: true };
}

export interface RankedPlayer {
  id: string;
  name: string;
  score: number;
  rank: number;
}

/** 同点は同じ順位（1,1,3 のような順位付け） */
export function rankPlayers(players: readonly Player[]): RankedPlayer[] {
  const sorted = players.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const result: RankedPlayer[] = [];
  let lastScore: number | null = null;
  let lastRank = 0;
  sorted.forEach((player, index) => {
    const rank = lastScore !== null && player.score === lastScore ? lastRank : index + 1;
    result.push({ id: player.id, name: player.name, score: player.score, rank });
    lastScore = player.score;
    lastRank = rank;
  });
  return result;
}

/** いまのフェーズが終わる時刻（次のアラームに使う） */
export function nextDeadline(state: GameState): number | null {
  if (state.phase === "question") return state.questionDeadline;
  if (state.phase === "answering") return state.answerDeadline ?? state.questionDeadline;
  if (state.phase === "reveal") return state.revealUntil;
  return null;
}
