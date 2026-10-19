import { QUESTIONS } from "./questions.js";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOTAL_QUESTIONS = 10;
export const QUESTION_MS = 20_000;
export const ANSWER_MS = 10_000;
export const REVEAL_MS = 3_000;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  token: string;
  score: number;
  connected: boolean;
  isHost: boolean;
}

export interface RoomState {
  code: string;
  players: Player[];
  phase: Phase;
  // QUESTIONS への index をシャッフルした10問
  questionOrder: number[];
  qIndex: number;
  questionStartedAt: number;
  questionDeadline: number;
  answererId: string | null;
  answerDeadline: number | null;
  disqualified: string[];
  revealAt: number | null;
  lastCorrect: number | null;
  lastAnswer: { playerId: string; choice: number; correct: boolean } | null;
}

export function emptyRoom(code: string): RoomState {
  return {
    code,
    players: [],
    phase: "lobby",
    questionOrder: [],
    qIndex: -1,
    questionStartedAt: 0,
    questionDeadline: 0,
    answererId: null,
    answerDeadline: null,
    disqualified: [],
    revealAt: null,
    lastCorrect: null,
    lastAnswer: null,
  };
}

export function findPlayer(state: RoomState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

function correctOf(state: RoomState): number {
  const qi = state.questionOrder[state.qIndex];
  if (qi === undefined) throw new Error("no current question");
  const q = QUESTIONS[qi];
  if (!q) throw new Error("question not found");
  return q.answer;
}

/** 残りで押せる人（失格していない人）がいるか */
function remaining(state: RoomState): Player[] {
  const out = new Set(state.disqualified);
  return state.players.filter((p) => !out.has(p.id));
}

function startQuestion(state: RoomState, qIndex: number, now: number): void {
  state.phase = "question";
  state.qIndex = qIndex;
  state.questionStartedAt = now;
  state.questionDeadline = now + QUESTION_MS;
  state.answererId = null;
  state.answerDeadline = null;
  state.disqualified = [];
  state.revealAt = null;
  state.lastCorrect = null;
  state.lastAnswer = null;
}

function toReveal(state: RoomState, now: number): void {
  state.phase = "reveal";
  state.answererId = null;
  state.answerDeadline = null;
  state.revealAt = now + REVEAL_MS;
  state.lastCorrect = correctOf(state);
}

/** シャッフル（Fisher-Yates）。rand を注入できるようにしてテスト可能に。 */
export function pickQuestions(rand: () => number = Math.random): number[] {
  const idx = QUESTIONS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = idx[i];
    const b = idx[j];
    if (a === undefined || b === undefined) continue;
    idx[i] = b;
    idx[j] = a;
  }
  return idx.slice(0, TOTAL_QUESTIONS);
}

export function joinRoom(
  state: RoomState,
  name: string,
  playerId: string,
  token: string,
): { ok: true } | { ok: false; error: string } {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return { ok: false, error: "名前を入力してください" };
  if (state.phase !== "lobby") {
    return { ok: false, error: "ゲームはもう始まっています" };
  }
  if (state.players.length >= MAX_PLAYERS) {
    return { ok: false, error: "満員です（4人まで）" };
  }
  state.players.push({
    id: playerId,
    name: trimmed,
    token,
    score: 0,
    connected: true,
    isHost: state.players.length === 0,
  });
  return { ok: true };
}

export function startGame(
  state: RoomState,
  playerId: string,
  now: number,
  order?: number[],
): { ok: true } | { ok: false; error: string } {
  const me = findPlayer(state, playerId);
  if (!me) return { ok: false, error: "参加者ではありません" };
  if (!me.isHost) return { ok: false, error: "ホストだけが開始できます" };
  if (state.phase !== "lobby") return { ok: false, error: "すでに始まっています" };
  if (state.players.length < MIN_PLAYERS || state.players.length > MAX_PLAYERS) {
    return { ok: false, error: "2〜4人で開始してください" };
  }
  state.questionOrder = order ?? pickQuestions();
  startQuestion(state, 0, now);
  return { ok: true };
}

export function buzz(
  state: RoomState,
  playerId: string,
  q: number,
  now: number,
): { ok: true } | { ok: false; error: string } {
  tick(state, now);
  if (state.phase !== "question") return { ok: false, error: "今は押せません" };
  if (q !== state.qIndex) return { ok: false, error: "古い問題です" };
  const me = findPlayer(state, playerId);
  if (!me) return { ok: false, error: "参加者ではありません" };
  if (state.disqualified.includes(playerId)) {
    return { ok: false, error: "この問題は回答済みです" };
  }
  state.phase = "answering";
  state.answererId = playerId;
  state.answerDeadline = Math.min(now + ANSWER_MS, state.questionDeadline);
  return { ok: true };
}

export function answer(
  state: RoomState,
  playerId: string,
  q: number,
  choice: number,
  now: number,
): { ok: true; correct: boolean } | { ok: false; error: string } {
  tick(state, now);
  if (state.phase !== "answering") return { ok: false, error: "今は回答できません" };
  if (q !== state.qIndex) return { ok: false, error: "古い問題です" };
  if (state.answererId !== playerId) {
    return { ok: false, error: "回答権がありません" };
  }
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
    return { ok: false, error: "選択が正しくありません" };
  }
  const me = findPlayer(state, playerId);
  if (!me) return { ok: false, error: "参加者ではありません" };
  const correct = choice === correctOf(state);
  if (correct) {
    me.score += 10;
    state.lastAnswer = { playerId, choice, correct: true };
    toReveal(state, now);
    return { ok: true, correct: true };
  }
  me.score -= 5;
  state.lastAnswer = { playerId, choice, correct: false };
  state.disqualified.push(playerId);
  state.answererId = null;
  state.answerDeadline = null;
  if (remaining(state).length === 0) {
    toReveal(state, now);
  } else {
    state.phase = "question";
  }
  return { ok: true, correct: false };
}

/**
 * 締め切りをまとめて進める。メッセージ処理の前と Alarm の両方で呼ぶ。
 * 戻り値は変化があったかどうか。
 */
export function tick(state: RoomState, now: number): boolean {
  let changed = false;
  for (let guard = 0; guard < 30; guard++) {
    if (state.phase === "answering") {
      const deadline = Math.min(
        state.answerDeadline ?? Infinity,
        state.questionDeadline,
      );
      if (now < deadline) break;
      // 回答の締め切り切れ: -5 と失格
      const answerer = state.answererId
        ? findPlayer(state, state.answererId)
        : undefined;
      if (answerer) {
        answerer.score -= 5;
        state.lastAnswer = {
          playerId: answerer.id,
          choice: -1,
          correct: false,
        };
        state.disqualified.push(answerer.id);
      }
      state.answererId = null;
      state.answerDeadline = null;
      changed = true;
      if (remaining(state).length === 0 || now >= state.questionDeadline) {
        toReveal(state, now);
        continue;
      }
      state.phase = "question";
      continue;
    }
    if (state.phase === "question") {
      if (now < state.questionDeadline) break;
      toReveal(state, now);
      changed = true;
      continue;
    }
    if (state.phase === "reveal") {
      if (state.revealAt === null || now < state.revealAt) break;
      changed = true;
      const next = state.qIndex + 1;
      if (next >= TOTAL_QUESTIONS) {
        state.phase = "finished";
        state.answererId = null;
        state.answerDeadline = null;
        state.revealAt = null;
        break;
      }
      // 次の問題の開始時刻は reveal 予定時刻（遅延時は now）
      startQuestion(state, next, Math.max(now, state.revealAt));
      continue;
    }
    break;
  }
  return changed;
}

/** Alarm に予約すべき直近の締め切り。なければ null。 */
export function nextDeadline(state: RoomState): number | null {
  if (state.phase === "answering") {
    return Math.min(state.answerDeadline ?? Infinity, state.questionDeadline);
  }
  if (state.phase === "question") return state.questionDeadline;
  if (state.phase === "reveal") return state.revealAt;
  return null;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  isHost: boolean;
}

export interface RankEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
}

export function ranking(state: RoomState): RankEntry[] {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  let rank = 0;
  let prev = Infinity;
  return sorted.map((p, i) => {
    if (p.score !== prev) {
      rank = i + 1;
      prev = p.score;
    }
    return { id: p.id, name: p.name, score: p.score, rank };
  });
}

export interface PublicState {
  t: "state";
  code: string;
  you: string;
  phase: Phase;
  players: PublicPlayer[];
  totalQuestions: number;
  qIndex: number;
  question: { text: string; choices: [string, string, string, string] } | null;
  answererId: string | null;
  disqualified: string[];
  questionDeadline: number | null;
  answerDeadline: number | null;
  revealAt: number | null;
  questionStartedAt: number | null;
  lastCorrect: number | null;
  lastAnswer: { playerId: string; choice: number; correct: boolean } | null;
  ranking: RankEntry[] | null;
  serverNow: number;
}

/** ブラウザに送る全体状態。正解は reveal のときだけ含める。 */
export function publicView(
  state: RoomState,
  viewerId: string,
  now: number,
): PublicState {
  const qi =
    state.qIndex >= 0 && state.phase !== "lobby"
      ? state.questionOrder[state.qIndex]
      : undefined;
  const q = qi !== undefined ? QUESTIONS[qi] : undefined;
  const inGame =
    state.phase === "question" ||
    state.phase === "answering" ||
    state.phase === "reveal";
  return {
    t: "state",
    code: state.code,
    you: viewerId,
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      isHost: p.isHost,
    })),
    totalQuestions: TOTAL_QUESTIONS,
    qIndex: state.qIndex,
    question:
      q && inGame
        ? { text: q.text, choices: [...q.choices] as [string, string, string, string] }
        : null,
    answererId: state.answererId,
    disqualified: [...state.disqualified],
    questionDeadline:
      state.phase === "question" || state.phase === "answering"
        ? state.questionDeadline
        : null,
    answerDeadline: state.phase === "answering" ? state.answerDeadline : null,
    revealAt: state.phase === "reveal" ? state.revealAt : null,
    questionStartedAt: inGame ? state.questionStartedAt : null,
    lastCorrect: state.phase === "reveal" ? state.lastCorrect : null,
    lastAnswer:
      state.phase === "reveal" || state.phase === "answering"
        ? state.lastAnswer
          ? { ...state.lastAnswer }
          : null
        : null,
    ranking: state.phase === "finished" ? ranking(state) : null,
    serverNow: now,
  };
}
