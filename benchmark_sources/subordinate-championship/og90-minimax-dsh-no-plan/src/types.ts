/**
 * 共通タイプ定義（サーバー / クライアント 共通）
 */

export type Phase = 'lobby' | 'question' | 'feedback' | 'reveal' | 'result';

export interface Player {
  /** localStorage に保存される再接続用トークン（= サーバー内部の playerId） */
  id: string;
  name: string;
  score: number;
  /** いま接続しているか */
  connected: boolean;
  /** この問題で既に回答（正解/不正解とも）したか */
  answered: boolean;
  /** 回答権を持っているか */
  isAnswerer: boolean;
  /** 早押し済みで順番待ちか */
  queued: boolean;
  /** 直近の回答が正解だったか（表示用） */
  lastCorrect: boolean | null;
  /** 直近に選んだ選択肢 index（表示用） */
  lastChoice: number | null;
}

export interface RoomState {
  code: string;
  players: Player[];
  hostId: string | null;
  phase: Phase;
  /** 現在の問題 index（0 始まり） */
  questionIndex: number;
  questionStart: number;
  /** 問題開始から 20 秒で締切 */
  questionDeadline: number;
  answererId: string | null;
  /** 回答権の期限（回答権取得から 10 秒） */
  answerDeadline: number | null;
  /** 早押し順に並んだ、回答権獲得を待つプレイヤー */
  buzzQueue: string[];
  /** 表示中の正解 index */
  correctIndex: number | null;
  /** 次の段階（feedback / reveal）へ進む時刻 */
  nextAt: number | null;
  /** 直近に回答したプレイヤー id */
  lastAnswererId: string | null;
  /** 直近に選ばれた選択肢 index（時間切れなら null） */
  lastChoice: number | null;
  createdAt: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  answered: boolean;
  isAnswerer: boolean;
  queued: boolean;
  lastCorrect: boolean | null;
  lastChoice: number | null;
  isHost: boolean;
}

export interface PublicQuestion {
  index: number;
  total: number;
  text: string;
  options: string[];
  explanation: string;
}

export interface StateMessage {
  t: 'state';
  code: string;
  phase: Phase;
  you: string | null;
  hostId: string | null;
  players: PublicPlayer[];
  question: PublicQuestion | null;
  /** 回答権を持つプレイヤー id */
  answererId: string | null;
  /** 回答権の残り時間（ミリ秒）。自分が回答権者の場合のみ意味を持つ */
  answerRemainingMs: number | null;
  /** 問題の残り時間（ミリ秒） */
  questionRemainingMs: number;
  /** 問題の締切（サーバー時刻の絶対値） */
  questionDeadline: number;
  /** 回答権の締切（サーバー時刻の絶対値） */
  answerDeadline: number | null;
  /** 自動進行（feedback / reveal の残り時間、ミリ秒） */
  phaseRemainingMs: number | null;
  /** この問題で誰も回答できなくなったか */
  everyoneAnswered: boolean;
  /** 正解の選択肢 index（reveal のときだけ意味を持つ） */
  revealCorrectIndex: number | null;
  /** 直近に回答したプレイヤー id */
  lastAnswererId: string | null;
  /** 直近に選ばれた選択肢 index */
  lastChoice: number | null;
  /** サーバー時刻（クライアントの時計誤差を補正するため） */
  serverNow: number;
  ranking: { id: string; name: string; score: number; rank: number }[];
}

export type ClientMessage =
  | { t: 'join'; id: string; name: string }
  | { t: 'start' }
  | { t: 'buzz' }
  | { t: 'answer'; choice: number }
  | { t: 'restart' };

export type ServerMessage =
  | StateMessage
  | { t: 'error'; code: string; message: string }
  | { t: 'notice'; message: string }
  | { t: 'joined'; you: string };
