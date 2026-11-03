// ゲームの規則だけを書いた純粋関数。時刻 now は呼び出し側から受け取り、副作用を持たない。
import { QUESTIONS, type Question } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOTAL_QUESTIONS = 10;
export const QUESTION_MS = 20_000;
export const ANSWER_MS = 10_000;
export const REVEAL_MS = 3_000;
export const CORRECT_POINTS = 10;
export const WRONG_POINTS = -5;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  token: string;
  score: number;
}

/** 1問の中で起きた回答。choice が null のときは回答時間切れ */
export interface Attempt {
  playerId: string;
  choice: number | null;
  delta: number;
}

export interface GameState {
  phase: Phase;
  hostId: string;
  players: Player[];
  /** 出題する問題の QUESTIONS 上の番号（TOTAL_QUESTIONS 個） */
  questionIds: number[];
  /** いま何問目か（0 始まり）。lobby では -1 */
  qIndex: number;
  questionDeadline: number;
  answerer: string | null;
  answerDeadline: number;
  disqualified: string[];
  attempts: Attempt[];
  revealUntil: number;
}

export type Result = { ok: true; state: GameState } | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });
const ok = (state: GameState): Result => ({ ok: true, state });
const clone = (s: GameState): GameState => structuredClone(s);

export function createGame(host: Player): GameState {
  return {
    phase: "lobby",
    hostId: host.id,
    players: [{ ...host }],
    questionIds: [],
    qIndex: -1,
    questionDeadline: 0,
    answerer: null,
    answerDeadline: 0,
    disqualified: [],
    attempts: [],
    revealUntil: 0,
  };
}

export function addPlayer(state: GameState, player: Player): Result {
  if (state.phase !== "lobby") return fail("ゲームはもう始まっています");
  if (state.players.length >= MAX_PLAYERS) return fail("満員です（4人まで）");
  const s = clone(state);
  s.players.push({ ...player });
  return ok(s);
}

/** 内蔵問題から重複なしで TOTAL_QUESTIONS 問を選ぶ */
export function pickQuestionIds(random: () => number = Math.random): number[] {
  const ids = QUESTIONS.map((_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, TOTAL_QUESTIONS);
}

export function startGame(state: GameState, playerId: string, now: number, questionIds: number[]): Result {
  if (state.phase !== "lobby") return fail("ゲームはもう始まっています");
  if (playerId !== state.hostId) return fail("開始できるのはホストだけです");
  if (state.players.length < MIN_PLAYERS) return fail("開始には2人以上必要です");
  const s = clone(state);
  s.questionIds = questionIds;
  beginQuestion(s, 0, now);
  return ok(s);
}

function beginQuestion(s: GameState, index: number, at: number): void {
  s.phase = "question";
  s.qIndex = index;
  s.questionDeadline = at + QUESTION_MS;
  s.answerer = null;
  s.answerDeadline = 0;
  s.disqualified = [];
  s.attempts = [];
  s.revealUntil = 0;
}

function beginReveal(s: GameState, at: number): void {
  s.phase = "reveal";
  s.answerer = null;
  s.answerDeadline = 0;
  s.revealUntil = at + REVEAL_MS;
}

export function currentQuestion(s: GameState): Question | null {
  if (s.qIndex < 0 || s.qIndex >= s.questionIds.length) return null;
  return QUESTIONS[s.questionIds[s.qIndex]];
}

function penalize(s: GameState, playerId: string, choice: number | null, at: number): void {
  const player = s.players.find((p) => p.id === playerId)!;
  player.score += WRONG_POINTS;
  s.disqualified.push(playerId);
  s.attempts.push({ playerId, choice, delta: WRONG_POINTS });
  s.answerer = null;
  s.answerDeadline = 0;
  const alive = s.players.some((p) => !s.disqualified.includes(p.id));
  if (alive) s.phase = "question";
  else beginReveal(s, at);
}

/** 次に何かが起きる締め切り時刻。何も予定がなければ null（Alarm の予約に使う） */
export function nextDeadline(s: GameState): number | null {
  if (s.phase === "question") return s.questionDeadline;
  if (s.phase === "answering") return s.answerDeadline;
  if (s.phase === "reveal") return s.revealUntil;
  return null;
}

/** now までに過ぎた締め切りの処理を、起きた時刻順にまとめて進める */
export function tick(state: GameState, now: number): GameState {
  const s = clone(state);
  for (;;) {
    const due = nextDeadline(s);
    if (due === null || now < due) return s;
    advance(s, due);
  }
}

function advance(s: GameState, at: number): void {
  if (s.phase === "question") {
    beginReveal(s, at);
  } else if (s.phase === "answering") {
    penalize(s, s.answerer!, null, at);
  } else if (s.phase === "reveal") {
    if (s.qIndex + 1 >= s.questionIds.length) s.phase = "finished";
    else beginQuestion(s, s.qIndex + 1, at);
  }
}

export function buzz(state: GameState, playerId: string, q: number, now: number): Result {
  const s = tick(state, now);
  if (!s.players.some((p) => p.id === playerId)) return fail("参加者ではありません");
  if (q !== s.qIndex) return fail("古い問題への操作です");
  if (s.phase !== "question") return fail("いまは早押しできません");
  if (s.disqualified.includes(playerId)) return fail("この問題は回答済みです");
  s.phase = "answering";
  s.answerer = playerId;
  s.answerDeadline = Math.min(now + ANSWER_MS, s.questionDeadline);
  return ok(s);
}

export function answer(state: GameState, playerId: string, q: number, choice: number, now: number): Result {
  const s = tick(state, now);
  if (q !== s.qIndex) return fail("古い問題への操作です");
  if (s.phase !== "answering" || s.answerer !== playerId) return fail("回答権がありません");
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return fail("選択肢が不正です");
  const question = currentQuestion(s)!;
  if (choice === question.answer) {
    s.players.find((p) => p.id === playerId)!.score += CORRECT_POINTS;
    s.attempts.push({ playerId, choice, delta: CORRECT_POINTS });
    beginReveal(s, now);
  } else {
    penalize(s, playerId, choice, now);
  }
  return ok(s);
}

export interface Ranked {
  id: string;
  name: string;
  score: number;
  rank: number;
}

/** 点数の高い順。同点は同じ順位（1, 1, 3, …） */
export function ranking(players: Player[]): Ranked[] {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    rank: sorted.findIndex((o) => o.score === p.score) + 1,
  }));
}

export interface PublicState {
  phase: Phase;
  hostId: string;
  players: { id: string; name: string; score: number; rank: number; connected: boolean; disqualified: boolean }[];
  qNum: number;
  total: number;
  question: { text: string; choices: string[] } | null;
  questionDeadline: number;
  answerer: string | null;
  answerDeadline: number;
  revealUntil: number;
  /** 正解の番号。reveal のときだけ入る */
  correct: number | null;
  /** 回答の内容。reveal のときだけ choice が入る */
  attempts: Attempt[];
}

/** 全員に配る状態。token は含めず、正解は reveal のときだけ含める */
export function toPublic(s: GameState, connectedIds: ReadonlySet<string>): PublicState {
  const question = currentQuestion(s);
  const revealed = s.phase === "reveal";
  const ranks = new Map(ranking(s.players).map((r) => [r.id, r.rank]));
  return {
    phase: s.phase,
    hostId: s.hostId,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      rank: ranks.get(p.id)!,
      connected: connectedIds.has(p.id),
      disqualified: s.disqualified.includes(p.id),
    })),
    qNum: s.qIndex + 1,
    total: TOTAL_QUESTIONS,
    question: question && s.phase !== "finished" ? { text: question.text, choices: [...question.choices] } : null,
    questionDeadline: s.questionDeadline,
    answerer: s.answerer,
    answerDeadline: s.answerDeadline,
    revealUntil: s.revealUntil,
    correct: revealed && question ? question.answer : null,
    attempts: s.attempts.map((a) => (revealed ? a : { ...a, choice: null })),
  };
}
