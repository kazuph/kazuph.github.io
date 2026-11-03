// ゲーム規則の純粋関数群。時刻 now (ms) を引数で受け取り、
// 乱数・I/O・時計読みなどの副作用を持たない。
import { QUESTIONS } from "./questions";

export const QUESTION_COUNT = 10;
export const QUESTION_MS = 20_000;
export const ANSWER_MS = 10_000;
export const REVEAL_MS = 3_000;
export const MAX_PLAYERS = 4;
// クライアントはこの間隔で ping を送り、サーバーはこの時間
// 何も届かない人を「接続が切れています」とみなす。
export const PING_TIMEOUT_MS = 12_000;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCode(pick: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CODE_CHARS[Math.floor(pick() * CODE_CHARS.length)];
  }
  return s;
}

export function shuffleOrder(
  nQuestions: number,
  count: number,
  pick: () => number = Math.random,
): number[] {
  const idx = [...Array(nQuestions).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(pick() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, count);
}

export interface Player {
  id: string;
  name: string;
  token: string;
  score: number;
  connected: boolean;
  host: boolean;
}

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export type RevealReason =
  | "correct"
  | "wrong"
  | "answer-timeout"
  | "question-timeout";

export interface RevealInfo {
  answererId: string | null;
  choice: number | null;
  correct: boolean | null;
  correctChoice: number;
  reason: RevealReason;
}

export interface RoomState {
  code: string;
  players: Player[];
  phase: Phase;
  questionOrder: number[];
  qIndex: number;
  qStartedAt: number;
  qDeadline: number;
  answererId: string | null;
  answerDeadline: number | null;
  revealUntil: number | null;
  wrongIds: string[];
  lastReveal: RevealInfo | null;
}

export interface RankEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
}

export function createRoom(
  code: string,
  name: string,
  playerId: string,
  token: string,
): RoomState {
  return {
    code,
    players: [
      { id: playerId, name, token, score: 0, connected: true, host: true },
    ],
    phase: "lobby",
    questionOrder: [],
    qIndex: 0,
    qStartedAt: 0,
    qDeadline: 0,
    answererId: null,
    answerDeadline: null,
    revealUntil: null,
    wrongIds: [],
    lastReveal: null,
  };
}

// 参加可否の判定。参加させる場合は null を返す。
export function joinError(state: RoomState, now: number): string | null {
  void now;
  if (state.phase !== "lobby") return "ゲームはもう始まっています";
  if (state.players.length >= MAX_PLAYERS) return "満員です（4人まで）";
  return null;
}

export function addPlayer(
  state: RoomState,
  name: string,
  playerId: string,
  token: string,
): void {
  state.players.push({
    id: playerId,
    name,
    token,
    score: 0,
    connected: true,
    host: false,
  });
}

export function startError(state: RoomState, playerId: string): string | null {
  if (state.phase !== "lobby") return "ゲームはもう始まっています";
  const me = state.players.find((p) => p.id === playerId);
  if (!me || !me.host) return "開始できるのはホストだけです";
  if (state.players.length < 2) return "2人以上で開始してください";
  if (state.players.length > MAX_PLAYERS) return "満員です（4人まで）";
  return null;
}

export function startGame(
  state: RoomState,
  playerId: string,
  now: number,
  order: number[],
): string | null {
  const err = startError(state, playerId);
  if (err) return err;
  state.questionOrder = order;
  state.qIndex = 0;
  for (const p of state.players) p.score = 0;
  openQuestion(state, now);
  return null;
}

function openQuestion(state: RoomState, now: number): void {
  state.phase = "question";
  state.qStartedAt = now;
  state.qDeadline = now + QUESTION_MS;
  state.answererId = null;
  state.answerDeadline = null;
  state.revealUntil = null;
  state.wrongIds = [];
  state.lastReveal = null;
}

function toReveal(
  state: RoomState,
  now: number,
  info: RevealInfo,
): void {
  state.phase = "reveal";
  state.answererId = null;
  state.answerDeadline = null;
  state.revealUntil = now + REVEAL_MS;
  state.lastReveal = info;
}

/** 締め切りをまとめて進める。変化があれば true。 */
export function tick(
  state: RoomState,
  now: number,
  correctOf: (orderPos: number) => number,
): boolean {
  let changed = false;
  for (;;) {
    if (state.phase === "answering") {
      if (
        state.answerDeadline !== null &&
        now >= state.answerDeadline &&
        state.answererId
      ) {
        const pid = state.answererId;
        const p = state.players.find((x) => x.id === pid);
        if (p) p.score -= 5;
        state.wrongIds.push(pid);
        state.answererId = null;
        state.answerDeadline = null;
        if (remainingBuzzers(state).length === 0) {
          toReveal(state, now, {
            answererId: pid,
            choice: null,
            correct: false,
            correctChoice: correctOf(state.qIndex),
            reason: "answer-timeout",
          });
        } else {
          state.phase = "question";
          state.lastReveal = {
            answererId: pid,
            choice: null,
            correct: false,
            correctChoice: -1,
            reason: "answer-timeout",
          };
        }
        changed = true;
        continue;
      }
    }
    if (state.phase === "question" || state.phase === "answering") {
      if (now >= state.qDeadline) {
        toReveal(state, now, {
          answererId: null,
          choice: null,
          correct: null,
          correctChoice: correctOf(state.qIndex),
          reason: "question-timeout",
        });
        changed = true;
        continue;
      }
    }
    if (state.phase === "reveal") {
      if (state.revealUntil !== null && now >= state.revealUntil) {
        if (state.qIndex + 1 >= QUESTION_COUNT) {
          state.phase = "finished";
          state.revealUntil = null;
        } else {
          state.qIndex += 1;
          openQuestion(state, now);
        }
        changed = true;
        continue;
      }
    }
    break;
  }
  return changed;
}

/** まだ押せる人（失格していない人）の一覧。 */
export function remainingBuzzers(state: RoomState): Player[] {
  return state.players.filter((p) => !state.wrongIds.includes(p.id));
}

/** 早押し。回答権を得たら true。 */
export function onBuzz(
  state: RoomState,
  playerId: string,
  q: number,
  now: number,
): boolean {
  if (state.phase !== "question") return false;
  if (q !== state.qIndex) return false;
  if (now >= state.qDeadline) return false;
  if (state.wrongIds.includes(playerId)) return false;
  if (!state.players.some((p) => p.id === playerId)) return false;
  state.phase = "answering";
  state.answererId = playerId;
  state.answerDeadline = Math.min(now + ANSWER_MS, state.qDeadline);
  return true;
}

export interface AnswerResult {
  ok: boolean;
  correct?: boolean;
  error?: string;
}

/** 4択の回答。正誤で点数を動かし、次フェーズへ進める。 */
export function onAnswer(
  state: RoomState,
  playerId: string,
  q: number,
  choice: number,
  now: number,
  correctChoice: number,
): AnswerResult {
  if (state.phase !== "answering") return { ok: false, error: "回答中ではありません" };
  if (q !== state.qIndex) return { ok: false, error: "古い問題です" };
  if (state.answererId !== playerId) return { ok: false, error: "回答権がありません" };
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
    return { ok: false, error: "選択が不正です" };
  }
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return { ok: false, error: "参加者ではありません" };
  const correct = choice === correctChoice;
  if (correct) {
    p.score += 10;
    toReveal(state, now, {
      answererId: playerId,
      choice,
      correct: true,
      correctChoice,
      reason: "correct",
    });
  } else {
    p.score -= 5;
    state.wrongIds.push(playerId);
    if (remainingBuzzers(state).length === 0) {
      toReveal(state, now, {
        answererId: playerId,
        choice,
        correct: false,
        correctChoice,
        reason: "wrong",
      });
    } else {
      state.phase = "question";
      state.answererId = null;
      state.answerDeadline = null;
      state.lastReveal = {
        answererId: playerId,
        choice,
        correct: false,
        correctChoice: -1,
        reason: "wrong",
      };
    }
  }
  return { ok: true, correct };
}

/** いちばん近い締め切り（Alarm予約用）。なければ null。 */
export function nextDeadline(state: RoomState): number | null {
  if (state.phase === "answering" && state.answerDeadline !== null) {
    return state.answerDeadline;
  }
  if (state.phase === "question" || state.phase === "answering") {
    return state.qDeadline;
  }
  if (state.phase === "reveal" && state.revealUntil !== null) {
    return state.revealUntil;
  }
  return null;
}

export function ranking(state: RoomState): RankEntry[] {
  const rows = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    rank: 1,
  }));
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"));
  for (const r of rows) {
    r.rank = 1 + rows.filter((o) => o.score > r.score).length;
  }
  return rows;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  host: boolean;
}

export interface PublicView {
  t: "state";
  you: string;
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  qIndex: number;
  qTotal: number;
  question: { text: string; choices: string[] } | null;
  correctChoice: number | null;
  answererId: string | null;
  qDeadline: number | null;
  answerDeadline: number | null;
  revealUntil: number | null;
  wrongIds: string[];
  // 直前の不正解（出題中に戻ったとき）のお知らせ。正解番号は含めない。
  lastWrong: { answererId: string; choice: number | null } | null;
  lastReveal: RevealInfo | null;
  ranking: RankEntry[] | null;
  serverNow: number;
}

/** ブラウザへ送る全量状態。正解は reveal/finished のときだけ含める。 */
export function publicView(
  state: RoomState,
  forPlayerId: string,
  now: number,
): PublicView {
  const inGame =
    state.phase === "question" ||
    state.phase === "answering" ||
    state.phase === "reveal";
  const qi = inGame ? state.questionOrder[state.qIndex] : -1;
  const question =
    inGame && qi >= 0 && qi < QUESTIONS.length
      ? { text: QUESTIONS[qi].q, choices: [...QUESTIONS[qi].choices] as string[] }
      : null;
  const showCorrect = state.phase === "reveal" || state.phase === "finished";
  let lastWrong: PublicView["lastWrong"] = null;
  if (
    state.phase === "question" &&
    state.lastReveal &&
    (state.lastReveal.reason === "wrong" ||
      state.lastReveal.reason === "answer-timeout")
  ) {
    lastWrong = {
      answererId: state.lastReveal.answererId as string,
      choice: state.lastReveal.choice as number,
    };
  }
  return {
    t: "state",
    you: forPlayerId,
    code: state.code,
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      host: p.host,
    })),
    qIndex: state.qIndex,
    qTotal: QUESTION_COUNT,
    question,
    correctChoice:
      showCorrect && state.lastReveal ? state.lastReveal.correctChoice : null,
    answererId: state.answererId,
    qDeadline:
      state.phase === "question" || state.phase === "answering"
        ? state.qDeadline
        : null,
    answerDeadline:
      state.phase === "answering" ? state.answerDeadline : null,
    revealUntil: state.phase === "reveal" ? state.revealUntil : null,
    wrongIds: [...state.wrongIds],
    lastWrong,
    lastReveal: state.phase === "reveal" ? state.lastReveal : null,
    ranking: state.phase === "finished" ? ranking(state) : null,
    serverNow: now,
  };
}
