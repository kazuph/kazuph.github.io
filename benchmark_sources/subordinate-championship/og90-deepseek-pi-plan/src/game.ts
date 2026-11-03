/**
 * ゲームの規則だけを書いた純粋なモジュール。
 * 時刻はすべて引数 `now`（サーバーの時計）で受け取り、内部で時計を読まない。
 * WebSocket や保存の都合は `room.ts` が受け持つ。
 */
import { QUESTIONS } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOTAL_QUESTIONS = 10;
/** 出題から早押しを受け付ける時間 */
export const BUZZ_WINDOW_MS = 20_000;
/** 回答権を得てから選べる時間 */
export const ANSWER_WINDOW_MS = 10_000;
/** 正解を表示している時間 */
export const REVEAL_MS = 3_000;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export type RevealReason = "correct" | "timeout" | "question-timeout" | "all-locked";

export interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  token: string;
  joinedAt: number;
}

export interface LastAnswer {
  playerId: string;
  /** 回答を選ばずに時間切れになった場合は null */
  choice: number | null;
  correct: boolean;
}

export interface GameState {
  code: string;
  phase: Phase;
  hostId: string | null;
  players: Player[];
  /** QUESTIONS の添字。開始時に10問ぶん決める */
  questionIds: number[];
  questionIndex: number;
  questionStartedAt: number | null;
  revealStartedAt: number | null;
  buzzedBy: string | null;
  buzzAt: number | null;
  /** この問題で不正解・時間切れになり、もう押せない人 */
  lockedOut: string[];
  lastAnswer: LastAnswer | null;
  revealReason: RevealReason | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  isHost: boolean;
  hasAnswerRights: boolean;
  lockedOut: boolean;
}

export interface RankingEntry {
  rank: number;
  playerId: string;
  name: string;
  score: number;
}

export interface PublicState {
  t: "state";
  code: string;
  phase: Phase;
  you: string | null;
  serverNow: number;
  hostId: string | null;
  players: PublicPlayer[];
  questionNumber: number | null;
  /** buzz / answer に付けて送り返す問題番号（0始まり） */
  questionIndex: number;
  totalQuestions: number;
  question: { text: string; choices: string[] } | null;
  buzzedBy: string | null;
  questionDeadline: number | null;
  answerDeadline: number | null;
  /** いま画面に出すカウントダウンの締め切り */
  deadline: number | null;
  reveal: {
    answerIndex: number;
    answerText: string;
    reason: RevealReason;
    lastAnswer: LastAnswer | null;
  } | null;
  canStart: boolean;
  ranking: RankingEntry[] | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

let idCounter = 0;

/** プレイヤーの識別子を作る。テストでも呼べるように関数にしてある。 */
export function newPlayerId(): string {
  idCounter += 1;
  return `p_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function newToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createState(code: string): GameState {
  return {
    code,
    phase: "lobby",
    hostId: null,
    players: [],
    questionIds: [],
    questionIndex: 0,
    questionStartedAt: null,
    revealStartedAt: null,
    buzzedBy: null,
    buzzAt: null,
    lockedOut: [],
    lastAnswer: null,
    revealReason: null,
    startedAt: null,
    finishedAt: null,
  };
}

export function findPlayer(state: GameState, playerId: string | null): Player | null {
  if (!playerId) return null;
  return state.players.find((p) => p.id === playerId) ?? null;
}

/** 部屋に参加できるか判定して、参加させる。 */
export function addPlayer(
  state: GameState,
  input: { id: string; name: string; token: string },
  now: number,
): ActionResult {
  if (state.phase !== "lobby") {
    return { ok: false, error: "ゲームはもう始まっています" };
  }
  if (state.players.length >= MAX_PLAYERS) {
    return { ok: false, error: `満員です（${MAX_PLAYERS}人まで）` };
  }
  state.players.push({
    id: input.id,
    name: input.name,
    score: 0,
    connected: true,
    token: input.token,
    joinedAt: now,
  });
  if (!state.hostId) state.hostId = input.id;
  return { ok: true };
}

/** ホストだけが、2〜4人のときに開始できる。 */
export function startGame(
  state: GameState,
  playerId: string | null,
  now: number,
  questionIds: number[],
): ActionResult {
  if (state.phase !== "lobby") return { ok: false, error: "ゲームはもう始まっています" };
  if (state.hostId !== playerId) return { ok: false, error: "開始できるのは部屋を作った人だけです" };
  if (state.players.length < MIN_PLAYERS) {
    return { ok: false, error: `${MIN_PLAYERS}人以上で開始できます` };
  }
  if (state.players.length > MAX_PLAYERS) {
    return { ok: false, error: `${MAX_PLAYERS}人までで開始できます` };
  }
  if (questionIds.length < TOTAL_QUESTIONS) {
    return { ok: false, error: "問題を用意できませんでした" };
  }
  state.questionIds = questionIds.slice(0, TOTAL_QUESTIONS);
  state.questionIndex = 0;
  state.startedAt = now;
  startQuestion(state, now);
  return { ok: true };
}

function startQuestion(state: GameState, now: number): void {
  state.phase = "question";
  state.questionStartedAt = now;
  state.revealStartedAt = null;
  state.buzzedBy = null;
  state.buzzAt = null;
  state.lockedOut = [];
  state.lastAnswer = null;
  state.revealReason = null;
}

function reveal(state: GameState, now: number, reason: RevealReason): void {
  state.phase = "reveal";
  state.revealStartedAt = now;
  state.buzzedBy = null;
  state.buzzAt = null;
  state.revealReason = reason;
}

function eligibleCount(state: GameState): number {
  return state.players.filter((p) => !state.lockedOut.includes(p.id)).length;
}

/**
 * 早押し。最初に受け取った1人だけが回答権を得る。
 * `questionNumber` が古い場合は無視する（前の問題の遅延メッセージ対策）。
 */
export function handleBuzz(
  state: GameState,
  playerId: string | null,
  questionNumber: number,
  now: number,
): ActionResult {
  if (state.phase !== "question") return { ok: false };
  if (questionNumber !== state.questionIndex) return { ok: false };
  const player = findPlayer(state, playerId);
  if (!player) return { ok: false };
  if (state.lockedOut.includes(player.id)) return { ok: false };

  state.phase = "answering";
  state.buzzedBy = player.id;
  state.buzzAt = now;
  return { ok: true };
}

/**
 * 回答。正誤の判定と点数の増減はすべてここ（サーバー側）で決める。
 */
export function handleAnswer(
  state: GameState,
  playerId: string | null,
  questionNumber: number,
  choice: number,
  now: number,
): ActionResult {
  if (state.phase !== "answering") return { ok: false, error: "いまは回答できません" };
  if (questionNumber !== state.questionIndex) return { ok: false, error: "古い問題です" };
  if (state.buzzedBy !== playerId) return { ok: false, error: "回答権がありません" };
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
    return { ok: false, error: "選択肢が正しくありません" };
  }
  const player = findPlayer(state, playerId);
  if (!player) return { ok: false, error: "プレイヤーが見つかりません" };

  const question = QUESTIONS[state.questionIds[state.questionIndex]];
  const correct = choice === question.answer;
  state.lastAnswer = { playerId: player.id, choice, correct };

  if (correct) {
    player.score += 10;
    reveal(state, now, "correct");
    return { ok: true };
  }

  player.score -= 5;
  state.lockedOut.push(player.id);
  state.buzzedBy = null;
  state.buzzAt = null;
  if (eligibleCount(state) > 0 && !isQuestionExpired(state, now)) {
    state.phase = "question";
  } else if (eligibleCount(state) === 0) {
    reveal(state, now, "all-locked");
  } else {
    reveal(state, now, "question-timeout");
  }
  return { ok: true };
}

function isQuestionExpired(state: GameState, now: number): boolean {
  return state.questionStartedAt !== null && now >= state.questionStartedAt + BUZZ_WINDOW_MS;
}

export function questionDeadline(state: GameState): number | null {
  if (state.questionStartedAt === null) return null;
  return state.questionStartedAt + BUZZ_WINDOW_MS;
}

export function answerDeadline(state: GameState): number | null {
  if (state.phase !== "answering" || state.buzzAt === null) return null;
  const qdl = questionDeadline(state);
  const adl = state.buzzAt + ANSWER_WINDOW_MS;
  return qdl === null ? adl : Math.min(adl, qdl);
}

/** いま動いているカウントダウンの締め切り。Alarm の予約にも使う。 */
export function nextDeadline(state: GameState): number | null {
  switch (state.phase) {
    case "question":
      return questionDeadline(state);
    case "answering":
      return answerDeadline(state);
    case "reveal":
      return state.revealStartedAt === null ? null : state.revealStartedAt + REVEAL_MS;
    default:
      return null;
  }
}

/**
 * 締め切りを過ぎた処理をまとめて進める。
 * メッセージを受けたときも Alarm のときも、入力を処理する前に必ず呼ぶ。
 * 状態を変えたら true を返す。
 */
export function tick(state: GameState, now: number): boolean {
  let changed = false;
  for (let guard = 0; guard < 32; guard += 1) {
    if (state.phase === "question" && isQuestionExpired(state, now)) {
      reveal(state, now, "question-timeout");
      changed = true;
      continue;
    }
    if (state.phase === "answering") {
      const dl = answerDeadline(state);
      if (dl !== null && now >= dl) {
        timeoutAnswer(state, now);
        changed = true;
        continue;
      }
      break;
    }
    if (state.phase === "reveal") {
      const dl = nextDeadline(state);
      if (dl !== null && now >= dl) {
        advance(state, now);
        changed = true;
        continue;
      }
      break;
    }
    break;
  }
  return changed;
}

/** 回答権を持ったまま時間切れ。−5点でこの問題はもう押せない。 */
function timeoutAnswer(state: GameState, now: number): void {
  const player = findPlayer(state, state.buzzedBy);
  if (player) {
    player.score -= 5;
    state.lockedOut.push(player.id);
    state.lastAnswer = { playerId: player.id, choice: null, correct: false };
  }
  state.buzzedBy = null;
  state.buzzAt = null;
  if (eligibleCount(state) > 0 && !isQuestionExpired(state, now)) {
    state.phase = "question";
  } else if (isQuestionExpired(state, now)) {
    reveal(state, now, "question-timeout");
  } else if (player) {
    reveal(state, now, "timeout");
  } else {
    reveal(state, now, "all-locked");
  }
}

function advance(state: GameState, now: number): void {
  const next = state.questionIndex + 1;
  if (next >= state.questionIds.length) {
    state.phase = "finished";
    state.finishedAt = now;
    state.buzzedBy = null;
    state.buzzAt = null;
    return;
  }
  state.questionIndex = next;
  startQuestion(state, now);
}

/** 同点は同じ順位（1, 2, 2, 4 の方式）。 */
export function ranking(state: GameState): RankingEntry[] {
  const sorted = [...state.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.joinedAt - b.joinedAt;
  });
  const entries: RankingEntry[] = [];
  let lastScore: number | null = null;
  let lastRank = 0;
  sorted.forEach((p, i) => {
    const rank = lastScore !== null && p.score === lastScore ? lastRank : i + 1;
    lastScore = p.score;
    lastRank = rank;
    entries.push({ rank, playerId: p.id, name: p.name, score: p.score });
  });
  return entries;
}

/** ブラウザに送る状態。出題中は正解を入れない。ほかの人の token も入れない。 */
export function toPublicState(
  state: GameState,
  playerId: string | null,
  now: number,
): PublicState {
  const showingQuestion =
    state.phase === "question" || state.phase === "answering" || state.phase === "reveal";
  const currentQuestion = showingQuestion
    ? QUESTIONS[state.questionIds[state.questionIndex]]
    : null;
  const revealInfo =
    state.phase === "reveal" && currentQuestion
      ? {
          answerIndex: currentQuestion.answer,
          answerText: currentQuestion.choices[currentQuestion.answer],
          reason: state.revealReason ?? "question-timeout",
          lastAnswer: state.lastAnswer,
        }
      : null;

  return {
    t: "state",
    code: state.code,
    phase: state.phase,
    you: playerId,
    serverNow: now,
    hostId: state.hostId,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      isHost: p.id === state.hostId,
      hasAnswerRights: p.id === state.buzzedBy,
      lockedOut: state.lockedOut.includes(p.id),
    })),
    questionNumber:
      state.phase === "finished"
        ? state.questionIds.length
        : showingQuestion
          ? state.questionIndex + 1
          : null,
    questionIndex: state.questionIndex,
    totalQuestions: state.questionIds.length || TOTAL_QUESTIONS,
    question: currentQuestion
      ? { text: currentQuestion.text, choices: [...currentQuestion.choices] }
      : null,
    buzzedBy: state.buzzedBy,
    questionDeadline: state.questionStartedAt === null ? null : questionDeadline(state),
    answerDeadline: answerDeadline(state),
    deadline: nextDeadline(state),
    reveal: revealInfo,
    canStart:
      state.phase === "lobby" &&
      state.hostId === playerId &&
      state.players.length >= MIN_PLAYERS &&
      state.players.length <= MAX_PLAYERS,
    ranking: state.phase === "finished" ? ranking(state) : null,
  };
}

/** いままでに使われた問題の正解（テストで確認するため） */
export function currentAnswerIndex(state: GameState): number | null {
  if (state.questionIds.length === 0) return null;
  return QUESTIONS[state.questionIds[state.questionIndex]]?.answer ?? null;
}
