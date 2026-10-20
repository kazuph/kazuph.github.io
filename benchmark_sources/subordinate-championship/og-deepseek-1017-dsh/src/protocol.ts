/**
 * クライアントとサーバーで共有するプロトコル定義。
 * ここにある型・定数は Worker (Durable Object) とブラウザの両方から参照する。
 *
 * 設計方針:
 *  - クライアントは「こうしたい」という意図 (join / start / buzz / answer) だけを送る。
 *  - 点数・正誤・回答権・残り時間はすべてサーバー (Durable Object) が決定し、
 *    その結果を `state` として全員へ同報する。クライアントの申告は信用しない。
 */

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const QUESTIONS_PER_GAME = 10;
export const POINTS_CORRECT = 10;
export const POINTS_WRONG = -5;

export interface Timing {
  /** 問題が出てから正解発表までの猶予 (既定 20000ms) */
  questionMs: number;
  /** 回答権を得てから選ぶまでの猶予 (既定 10000ms) */
  answerMs: number;
  /** 正解発表を見せてから次の問題へ進むまで (既定 3000ms) */
  revealMs: number;
}

export type Phase = "lobby" | "question" | "reveal" | "final";

export interface Player {
  id: string;
  /** 再読み込み・回線断からの復帰に使う秘密トークン。他プレイヤーには送らない。 */
  token: string;
  name: string;
  score: number;
  correctCount: number;
  connected: boolean;
  joinedAt: number;
}

export interface AnswerRecord {
  choice: number;
  correct: boolean;
  delta: number;
}

export interface RoomState {
  code: string;
  created: boolean;
  /** 部屋を作った (= 最初に入室した) プレイヤー */
  hostId: string | null;
  phase: Phase;
  players: Player[];
  /** 出題する問題IDの並び (1ゲーム分) */
  questionOrder: string[];
  questionIndex: number;
  questionStartedAt: number | null;
  questionDeadline: number | null;
  answerDeadline: number | null;
  revealDeadline: number | null;
  answererId: string | null;
  /** この問題で既に押せないプレイヤー (不正解 / 解答タイムアウト) */
  locked: string[];
  currentAnswers: Record<string, AnswerRecord>;
  lastReveal: {
    questionId: string;
    correct: number;
    answers: Record<string, AnswerRecord>;
  } | null;
  startedAt: number | null;
  finishedAt: number | null;
  /** 何ゲーム目か (「もう一度」で増える) */
  round: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  correctCount: number;
  connected: boolean;
  locked: boolean;
  isAnswerer: boolean;
  isHost: boolean;
}

export interface PublicAnswer {
  playerId: string;
  name: string;
  choice: number;
  correct: boolean;
  delta: number;
}

export interface PublicState {
  code: string;
  phase: Phase;
  hostId: string | null;
  actingHostId: string | null;
  capacity: number;
  minPlayers: number;
  players: PublicPlayer[];
  questionIndex: number;
  questionTotal: number;
  /** 正解は reveal フェーズまで含まれない */
  question: {
    id: string;
    text: string;
    choices: string[];
    category: string;
  } | null;
  answererId: string | null;
  lockedIds: string[];
  /** サーバー時計。クライアントは deadline との差から残り時間を出す。 */
  serverNow: number;
  timer: {
    kind: "question" | "answer" | "reveal" | null;
    deadline: number | null;
    totalMs: number;
  };
  reveal: {
    questionId: string;
    correct: number;
    answers: PublicAnswer[];
  } | null;
  results:
    | {
        playerId: string;
        name: string;
        score: number;
        correctCount: number;
        rank: number;
      }[]
    | null;
  canStart: boolean;
  startedAt: number | null;
  finishedAt: number | null;
}

/* ------------------------------- client -> server ------------------------------ */

export type ClientMessage =
  | { t: "join"; name: string; token?: string | null }
  | { t: "start" }
  | { t: "buzz" }
  | { t: "answer"; choice: number }
  | { t: "again" }
  | { t: "leave" }
  | { t: "ping" };

/* ------------------------------- server -> client ------------------------------ */

export type ErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "GAME_IN_PROGRESS"
  | "BAD_NAME"
  | "NOT_HOST"
  | "NOT_ENOUGH_PLAYERS"
  | "NOT_ANSWERER"
  | "TOO_LATE"
  | "INVALID_MESSAGE"
  | "UNKNOWN";

export type ServerMessage =
  | { t: "joined"; playerId: string; token: string; name: string; state: PublicState }
  | { t: "state"; state: PublicState }
  | { t: "error"; code: ErrorCode; message: string }
  | {
      t: "feedback";
      kind: "buzz" | "correct" | "wrong" | "locked" | "info";
      playerId?: string;
      text: string;
      delta?: number;
    }
  | { t: "pong" };

export function encodeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const t = (value as { t?: unknown }).t;
  if (t === "join") {
    const name = (value as { name?: unknown }).name;
    const token = (value as { token?: unknown }).token;
    return {
      t: "join",
      name: typeof name === "string" ? name : "",
      token: typeof token === "string" && token.length > 0 ? token : null,
    };
  }
  if (t === "start" || t === "buzz" || t === "again" || t === "leave" || t === "ping") {
    return { t };
  }
  if (t === "answer") {
    const choice = (value as { choice?: unknown }).choice;
    if (typeof choice !== "number" || !Number.isInteger(choice)) return null;
    return { t: "answer", choice };
  }
  return null;
}
