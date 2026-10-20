// サーバー ⇄ クライアント間でやり取りするデータの型定義（共有）

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS_TO_START = 2;
export const TOTAL_QUESTIONS = 10;
/** 回答権を得てから選ぶまでの制限（ミリ秒） */
export const ANSWER_TIME_MS = 10_000;
/** 問題が出てから次に進むまでの上限（ミリ秒） */
export const QUESTION_TIME_MS = 20_000;
/** 正解表示の長さ（ミリ秒） */
export const REVEAL_TIME_MS = 4_000;
/** ホストが離席してから主催権限を譲るまで（ミリ秒） */
export const HOST_TRANSFER_MS = 15_000;

export type Phase = "lobby" | "question" | "results";
export type SubPhase = "buzzing" | "answering" | "reveal";

export interface PlayerView {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  host: boolean;
  /** この問題でもう押せない（不正解・失答など） */
  lockedOut: boolean;
  /** 現在回答権を持って回答中か */
  answering: boolean;
}

export interface RoomView {
  code: string;
  phase: Phase;
  /** phase === "question" のときのみ意味を持つ */
  subPhase: SubPhase | null;
  questionIndex: number; // 0始まり
  questionCount: number;
  /** 出題中・正解表示中の問題（正解の選択肢の内容そのものは正解表示まで伏せる） */
  question: { text: string; choices: string[] } | null;
  /** 正解表示中のみ >= 0。それ以外は null */
  correctIndex: number | null;
  /** サーバー時刻の絶対タイムスタンプ（ミリ秒） */
  questionDeadline: number | null; // buzzing 中: 問題の残り時間
  answerDeadline: number | null; // answering 中: 回答の残り時間
  revealEndsAt: number | null; // reveal 中: 表示が切り替わる時刻
  hostId: string;
  lastResult: {
    playerId: string;
    outcome: "correct" | "wrong" | "timeout";
    delta: number;
  } | null;
}

/** サーバー → クライアント: 毎回状態の全量を配る（全員の画面をそろえる） */
export interface StateMessage {
  type: "state";
  serverTime: number;
  you: string | null; // 受信者自身の playerId
  room: RoomView;
  players: PlayerView[];
}

export type ServerErrorMessage = { type: "error"; message: string };

export type ServerMessage = StateMessage | ServerErrorMessage;

/** クライアント → サーバー */
export type ClientMessage =
  | { type: "buzz" }
  | { type: "answer"; choice: number }
  | { type: "start" } // ホストのみ
  | { type: "restart" } // ホストのみ（結果画面 → ロビーへ戻る）
  | { type: "ping" };
