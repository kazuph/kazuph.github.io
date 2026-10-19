import { QUESTIONS } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOTAL_QUESTIONS = 10;
export const QUESTION_MS = 20_000;
export const ANSWER_MS = 10_000;
export const REVEAL_MS = 3_000;
export const SCORE_CORRECT = 10;
export const SCORE_WRONG = -5;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface PlayerState {
  id: string;
  name: string;
  score: number;
  out: boolean; // この問題で失格したか
  connected: boolean;
}

export interface RoomState {
  code: string;
  phase: Phase;
  hostId: string;
  players: PlayerState[];
  order: number[]; // QUESTIONS の添字の出題順（先頭から TOTAL_QUESTIONS 問）
  qIndex: number; // 0起きの現在の問題番号
  questionEndsAt: number; // 出題時刻 + QUESTION_MS
  answererId: string | null;
  answerEndsAt: number | null; // 押した時刻 + ANSWER_MS と questionEndsAt の早いほう
  revealEndsAt: number | null;
}

export type GameError = "満員です（4人まで）" | "ゲームはもう始まっています";

export function createRoom(code: string): RoomState {
  return {
    code,
    phase: "lobby",
    hostId: "",
    players: [],
    order: [],
    qIndex: 0,
    questionEndsAt: 0,
    answererId: null,
    answerEndsAt: null,
    revealEndsAt: null,
  };
}

// 戻り値は { ok: true } か { ok: false, error }。ホスト（最初の参加者）は hostId に入る。
export function addPlayer(
  state: RoomState,
  id: string,
  name: string,
): { ok: true } | { ok: false; error: GameError } {
  if (state.phase !== "lobby") {
    return { ok: false, error: "ゲームはもう始まっています" };
  }
  if (state.players.length >= MAX_PLAYERS) {
    return { ok: false, error: "満員です（4人まで）" };
  }
  state.players.push({ id, name, score: 0, out: false, connected: true });
  if (state.players.length === 1) state.hostId = id;
  return { ok: true };
}

export type StartError =
  | "ホストだけが開始できます"
  | "2人以上で開始できます"
  | "ゲームはもう始まっています";

export function startGame(
  state: RoomState,
  playerId: string,
  now: number,
  rng: () => number,
): { ok: true } | { ok: false; error: StartError } {
  if (state.phase !== "lobby") return { ok: false, error: "ゲームはもう始まっています" };
  if (playerId !== state.hostId) return { ok: false, error: "ホストだけが開始できます" };
  if (state.players.length < MIN_PLAYERS || state.players.length > MAX_PLAYERS) {
    return { ok: false, error: "2人以上で開始できます" };
  }
  const order = QUESTIONS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  state.order = order.slice(0, TOTAL_QUESTIONS);
  for (const p of state.players) {
    p.score = 0;
    p.out = false;
  }
  state.qIndex = 0;
  beginQuestion(state, now);
  return { ok: true };
}

function beginQuestion(state: RoomState, now: number): void {
  state.phase = "question";
  state.questionEndsAt = now + QUESTION_MS;
  state.answererId = null;
  state.answerEndsAt = null;
  state.revealEndsAt = null;
  for (const p of state.players) p.out = false;
}

function beginReveal(state: RoomState, now: number): void {
  state.phase = "reveal";
  state.answererId = null;
  state.answerEndsAt = null;
  state.revealEndsAt = now + REVEAL_MS;
}

// 締め切りを過ぎた処理を、落ち着くまでまとめて進める。
// メッセージ処理の前と Alarm のときに必ず呼ぶ。
export function tick(state: RoomState, now: number): RoomState {
  for (;;) {
    if (state.phase === "answering" && state.answerEndsAt !== null && now >= state.answerEndsAt) {
      // 回答の締め切り切れ: 不正解と同じ扱い（-5点で失格）
      const answerer = state.players.find((p) => p.id === state.answererId);
      if (answerer) {
        answerer.score += SCORE_WRONG;
        answerer.out = true;
      }
      state.answererId = null;
      state.answerEndsAt = null;
      if (state.players.every((p) => p.out)) {
        beginReveal(state, now);
      } else {
        state.phase = "question"; // 問題の締め切りは変えない
      }
      continue;
    }
    if (state.phase === "question" && now >= state.questionEndsAt) {
      beginReveal(state, now);
      continue;
    }
    if (state.phase === "reveal" && state.revealEndsAt !== null && now >= state.revealEndsAt) {
      state.qIndex += 1;
      if (state.qIndex >= TOTAL_QUESTIONS) {
        state.phase = "finished";
        state.revealEndsAt = null;
      } else {
        beginQuestion(state, now);
      }
      continue;
    }
    return state;
  }
}

// 早押し。回答権を得たら true。phase が question で、
// その問題で失格していない人の、最初に処理された buzz だけが通る。
export function buzz(state: RoomState, playerId: string, q: number, now: number): boolean {
  tick(state, now);
  if (state.phase !== "question" || q !== state.qIndex) return false;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.out) return false;
  state.phase = "answering";
  state.answererId = playerId;
  state.answerEndsAt = Math.min(now + ANSWER_MS, state.questionEndsAt);
  return true;
}

// 4択の回答。正解なら +10 で reveal、不正解なら -5 で失格して question へ戻る
// （全員失格なら reveal）。受理したら true。
export function answer(
  state: RoomState,
  playerId: string,
  q: number,
  choice: number,
  now: number,
): boolean {
  tick(state, now);
  if (state.phase !== "answering" || q !== state.qIndex || state.answererId !== playerId) {
    return false;
  }
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;
  const question = QUESTIONS[state.order[state.qIndex]];
  if (choice === question.answer) {
    player.score += SCORE_CORRECT;
    beginReveal(state, now);
  } else {
    player.score += SCORE_WRONG;
    player.out = true;
    state.answererId = null;
    state.answerEndsAt = null;
    if (state.players.every((p) => p.out)) {
      beginReveal(state, now);
    } else {
      state.phase = "question";
    }
  }
  return true;
}

// Alarm に予約する「いちばん近い締め切り」。なければ null。
export function nextDeadline(state: RoomState): number | null {
  switch (state.phase) {
    case "question":
      return state.questionEndsAt;
    case "answering":
      return state.answerEndsAt;
    case "reveal":
      return state.revealEndsAt;
    default:
      return null;
  }
}

// 順位を点数順に付ける。同点は同じ順位。
export function ranks(players: PlayerState[]): Map<string, number> {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const result = new Map<string, number>();
  let rank = 0;
  let prevScore: number | null = null;
  sorted.forEach((p, i) => {
    if (p.score !== prevScore) rank = i + 1;
    prevScore = p.score;
    result.set(p.id, rank);
  });
  return result;
}

// ブラウザに送る全量の状態。出題中・回答中は正解を含めない。
export function serialize(state: RoomState, youId: string, now: number) {
  const rankMap = ranks(state.players);
  const inGame = state.phase === "question" || state.phase === "answering" || state.phase === "reveal";
  const q = inGame ? QUESTIONS[state.order[state.qIndex]] : null;
  return {
    t: "state" as const,
    code: state.code,
    phase: state.phase,
    you: youId,
    serverNow: now,
    hostId: state.hostId,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      out: p.out,
      connected: p.connected,
      rank: rankMap.get(p.id) ?? 0,
    })),
    question: q
      ? {
          index: state.qIndex + 1,
          total: TOTAL_QUESTIONS,
          text: q.text,
          choices: q.choices,
          answer: state.phase === "reveal" ? q.answer : null,
        }
      : null,
    questionEndsAt: inGame ? state.questionEndsAt : null,
    answererId: state.phase === "answering" ? state.answererId : null,
    answerEndsAt: state.phase === "answering" ? state.answerEndsAt : null,
    revealEndsAt: state.phase === "reveal" ? state.revealEndsAt : null,
  };
}
