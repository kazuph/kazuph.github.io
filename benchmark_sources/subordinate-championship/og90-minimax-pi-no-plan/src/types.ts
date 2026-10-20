/**
 * サーバーとクライアントで共有する型定義。
 * クライアントに配信するメッセージはすべてこの形を避ける（正解は reveal のときだけ送る）。
 */

export type Phase = "lobby" | "playing" | "result";

/** 問題-solving の状態: idle=未出題 / question=出題中 / reveal=正答表示中 */
export type QuestionStatus = "idle" | "question" | "reveal";

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  /** この問題で既に早押しを使ったか（不正解・時間切れのどちらか） */
  hasBuzzed: boolean;
  /** この問題で選んだ選択肢（未回答なら null） */
  answer: number | null;
}

export interface PublicQuestion {
  index: number;
  total: number;
  text: string;
  options: string[];
}

export interface PublicState {
  type: "state";
  code: string;
  phase: Phase;
  status: QuestionStatus;
  players: PublicPlayer[];
  you: { id: string; name: string; isHost: boolean } | null;
  hostId: string;
  question: PublicQuestion | null;
  questionStartedAt: number;
  questionDeadline: number;
  answerDeadline: number | null;
  answeringPlayerId: string | null;
  answeringPlayerName: string | null;
  /** 正解の選択肢番号（reveal / result のときだけ null でない） */
  correctChoice: number | null;
  lastAnswer: {
    playerId: string;
    playerName: string;
    choice: number;
    correct: boolean;
  } | null;
  nextQuestionAt: number | null;
  /** サーバーの現在時刻（クライアントの時計とのずれを補正するため） */
  serverTime: number;
  canStart: boolean;
  startReason: string | null;
}

export type ServerMessage =
  | PublicState
  | { type: "error"; message: string; fatal?: boolean }
  | { type: "hello"; playerId: string; name: string; reconnected: boolean };

export type ClientMessage =
  | { type: "buzz" }
  | { type: "answer"; choice: number }
  | { type: "start" }
  | { type: "restart" }
  | { type: "ping" };

export interface CreateRoomResponse {
  ok: true;
  code: string;
  playerId: string;
  token: string;
  name: string;
}

export interface JoinRoomResponse {
  ok: true;
  code: string;
  playerId: string;
  token: string;
  name: string;
}

export interface ErrorResponse {
  ok: false;
  error: string;
}
