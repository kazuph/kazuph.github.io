// ゲームの規則だけを書いた純粋関数。時刻は引数 now で受け取り、副作用を持たない。
// 締め切りの処理は tick() で進め、入力の処理は applyAction() が tick() のあとに行う。
import { QUESTIONS, type QuestionDef } from "./questions";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const QUESTION_COUNT = 10;
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
  connected: boolean;
}

export interface Result {
  by: string | null; // 回答した人。誰も押さなければ null
  choice: number | null; // 選んだ番号。時間切れは null
  answer: number; // 正解の番号
  correct: boolean;
}

export interface GameState {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  questionIds: number[]; // QUESTIONS の添字。10個
  qIndex: number; // 0 始まりの問題番号
  questionDeadline: number;
  answerer: string | null;
  answerDeadline: number;
  failed: string[]; // この問題で失格した人
  lastMiss: { by: string; timeout: boolean } | null; // 出題中に表示する直近の失格（正解は含めない）
  revealUntil: number;
  result: Result | null;
}

export type Action = { t: "start" } | { t: "buzz"; q: number } | { t: "answer"; q: number; choice: number };

export interface Step {
  state: GameState;
  error?: string;
}

export interface RankedPlayer {
  id: string;
  name: string;
  score: number;
  rank: number;
}

export function createGame(code: string, host: Player, questionIds: number[]): GameState {
  return {
    code,
    hostId: host.id,
    players: [host],
    phase: "lobby",
    questionIds,
    qIndex: 0,
    questionDeadline: 0,
    answerer: null,
    answerDeadline: 0,
    failed: [],
    lastMiss: null,
    revealUntil: 0,
    result: null,
  };
}

export function joinGame(s: GameState, player: Player): Step {
  if (s.phase !== "lobby") return { state: s, error: "ゲームはもう始まっています" };
  if (s.players.length >= MAX_PLAYERS) return { state: s, error: "満員です（4人まで）" };
  return { state: { ...s, players: [...s.players, player] } };
}

export function setConnected(s: GameState, playerId: string, connected: boolean): GameState {
  return {
    ...s,
    players: s.players.map((p) => (p.id === playerId ? { ...p, connected } : p)),
  };
}

// 締め切りを過ぎた処理をすべて進める。何度呼んでも同じ結果になる。
export function tick(s: GameState, now: number): GameState {
  let cur = s;
  for (;;) {
    const next = advance(cur, now);
    if (next === cur) return cur;
    cur = next;
  }
}

function advance(s: GameState, now: number): GameState {
  if (s.phase === "answering" && now >= s.answerDeadline) {
    return wrongAnswer(s, s.answerDeadline, s.answerer as string, null);
  }
  if (s.phase === "question" && now >= s.questionDeadline) {
    return reveal(s, s.questionDeadline, { by: null, choice: null, answer: answerOf(s), correct: false });
  }
  if (s.phase === "reveal" && now >= s.revealUntil) {
    return nextQuestion(s, s.revealUntil);
  }
  return s;
}

export function applyAction(s0: GameState, playerId: string, action: Action, now: number): Step {
  const s = tick(s0, now);
  switch (action.t) {
    case "start":
      return start(s, playerId, now);
    case "buzz":
      return { state: buzz(s, playerId, action.q, now) };
    case "answer":
      return answer(s, playerId, action.q, action.choice, now);
  }
}

export function parseAction(raw: unknown): Action | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.t === "start") return { t: "start" };
  if (o.t === "buzz" && Number.isInteger(o.q)) return { t: "buzz", q: o.q as number };
  if (o.t === "answer" && Number.isInteger(o.q) && Number.isInteger(o.choice)) {
    return { t: "answer", q: o.q as number, choice: o.choice as number };
  }
  return null;
}

export function nextAlarmAt(s: GameState): number | null {
  switch (s.phase) {
    case "question":
      return s.questionDeadline;
    case "answering":
      return s.answerDeadline;
    case "reveal":
      return s.revealUntil;
    default:
      return null;
  }
}

export function ranking(players: Player[]): RankedPlayer[] {
  const rows = players.map((p, order) => ({ ...p, order }));
  rows.sort((a, b) => b.score - a.score || a.order - b.order);
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    rank: 1 + players.filter((o) => o.score > p.score).length,
  }));
}

// 1人の画面に送る状態。正解は reveal のときだけ入れ、トークンは送らない。
export function viewFor(s: GameState, playerId: string, now: number) {
  const hasQuestion = s.phase !== "lobby" && s.phase !== "finished";
  const question: QuestionDef | null = hasQuestion ? questionOf(s) : null;
  return {
    t: "state" as const,
    code: s.code,
    phase: s.phase,
    hostId: s.hostId,
    you: playerId,
    serverNow: now,
    total: QUESTION_COUNT,
    qIndex: s.qIndex,
    question: question ? { q: question.q, choices: question.choices } : null,
    questionDeadline: s.questionDeadline,
    answerDeadline: s.answerDeadline,
    revealUntil: s.revealUntil,
    answerer: s.answerer,
    failed: s.failed,
    players: s.players.map(({ id, name, score, connected }) => ({ id, name, score, connected })),
    lastMiss: s.phase === "question" ? s.lastMiss : null,
    result: s.phase === "reveal" ? s.result : null,
    ranking: s.phase === "finished" ? ranking(s.players) : null,
  };
}

export type View = ReturnType<typeof viewFor>;

function questionOf(s: GameState): QuestionDef {
  return QUESTIONS[s.questionIds[s.qIndex]];
}

function answerOf(s: GameState): number {
  return questionOf(s).answer;
}

function start(s: GameState, playerId: string, now: number): Step {
  if (playerId !== s.hostId) return { state: s, error: "開始できるのはホストだけです" };
  if (s.phase !== "lobby") return { state: s, error: "ゲームはもう始まっています" };
  if (s.players.length < MIN_PLAYERS) {
    return { state: s, error: `2人以上そろうと開始できます（いまは${s.players.length}人）` };
  }
  return {
    state: {
      ...s,
      phase: "question",
      qIndex: 0,
      questionDeadline: now + QUESTION_MS,
      answerer: null,
      answerDeadline: 0,
      failed: [],
      lastMiss: null,
      result: null,
    },
  };
}

function buzz(s: GameState, playerId: string, q: number, now: number): GameState {
  if (s.phase !== "question" || q !== s.qIndex) return s;
  if (!s.players.some((p) => p.id === playerId) || s.failed.includes(playerId)) return s;
  return {
    ...s,
    phase: "answering",
    answerer: playerId,
    answerDeadline: Math.min(now + ANSWER_MS, s.questionDeadline),
  };
}

function answer(s: GameState, playerId: string, q: number, choice: number, now: number): Step {
  if (s.phase !== "answering" || s.answerer !== playerId || q !== s.qIndex) return { state: s };
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
    return { state: s, error: "選択肢が正しくありません" };
  }
  const correct = answerOf(s);
  if (choice === correct) {
    const players = s.players.map((p) => (p.id === playerId ? { ...p, score: p.score + CORRECT_POINTS } : p));
    const result = { by: playerId, choice, answer: correct, correct: true };
    return { state: reveal({ ...s, players }, now, result) };
  }
  return { state: wrongAnswer(s, now, playerId, choice) };
}

// 不正解または回答の締め切り切れ。-5点で失格にし、残りの人がいれば同じ問題に戻る。
function wrongAnswer(s: GameState, at: number, by: string, choice: number | null): GameState {
  const players = s.players.map((p) => (p.id === by ? { ...p, score: p.score + WRONG_POINTS } : p));
  const failed = [...s.failed, by];
  const result = { by, choice, answer: answerOf(s), correct: false };
  const lastMiss = { by, timeout: choice === null };
  const next = { ...s, players, failed, lastMiss, answerer: null, answerDeadline: 0 };
  const someoneLeft = players.some((p) => !failed.includes(p.id));
  if (!someoneLeft || at >= s.questionDeadline) return reveal(next, at, result);
  return { ...next, phase: "question", result: null };
}

function reveal(s: GameState, at: number, result: Result): GameState {
  return {
    ...s,
    phase: "reveal",
    revealUntil: at + REVEAL_MS,
    answerer: null,
    answerDeadline: 0,
    result,
  };
}

function nextQuestion(s: GameState, at: number): GameState {
  if (s.qIndex + 1 >= QUESTION_COUNT) {
    return { ...s, phase: "finished", revealUntil: 0, result: null };
  }
  return {
    ...s,
    phase: "question",
    qIndex: s.qIndex + 1,
    questionDeadline: at + QUESTION_MS,
    answerer: null,
    answerDeadline: 0,
    failed: [],
    lastMiss: null,
    result: null,
  };
}
