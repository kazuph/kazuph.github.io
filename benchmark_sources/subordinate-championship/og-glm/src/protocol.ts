/** クライアント ⇄ サーバー間のメッセージ型（共有定義） */

export type Phase = "lobby" | "question" | "reveal" | "finished";

export interface PlayerView {
	id: string;
	name: string;
	score: number;
	connected: boolean;
	isHost: boolean;
	/** この問題でもう早押しできない（誤答済み・タイムアウト） */
	locked: boolean;
}

export interface LastEvent {
	kind: "buzz" | "answer" | "timeout";
	playerId: string;
	choice?: number;
	correct?: boolean;
}

export interface StateMessage {
	type: "state";
	phase: Phase;
	qIndex: number;
	totalQuestions: number;
	you: string;
	now: number;
	players: PlayerView[];
	question: { text: string; choices: string[] } | null;
	/** 正解の選択肢index。reveal フェーズのみ公開 */
	answer: number | null;
	/** 現在の制限時刻（epoch ms）。question中=制限20秒 / 回答権者には回答10秒 */
	deadline: number | null;
	/** 回答権を持つプレイヤーid（questionフェーズのみ） */
	answering: string | null;
	lastEvent: LastEvent | null;
}

export interface ErrorMessage {
	type: "error";
	reason: "full" | "in-progress" | "not-host" | "bad-request" | "cannot-start";
	message: string;
}

export type ServerMessage = StateMessage | ErrorMessage;

export type ClientMessage =
	| { type: "join"; name: string; token?: string }
	| { type: "start" }
	| { type: "buzz" }
	| { type: "answer"; choice: number };
