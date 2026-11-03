// Shared message types between server and client (and tests).

export type Phase = "lobby" | "question" | "answer" | "reveal" | "finished";

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  locked: boolean; // cannot buzz for the current question
  isHost: boolean;
}

export interface QuestionView {
  n: number; // 1-based question number
  total: number;
  text: string;
  choices: string[];
  endsAt: number; // server ms timestamp
}

export interface StateMessage {
  t: "state";
  room: string;
  phase: Phase;
  now: number;
  you: string | null;
  hostId: string | null;
  players: PublicPlayer[];
  question?: QuestionView;
  buzzedBy?: string | null;
  answering?: { playerId: string; endsAt: number } | null;
  reveal?: {
    correctIndex: number;
    correctText: string;
    answeredBy: string | null;
    chosenIndex: number | null;
    timedOut: boolean;
  } | null;
  revealUntil?: number | null;
  ranking?: { playerId: string; name: string; score: number; rank: number }[];
}

export interface ErrorMessage {
  t: "error";
  message: string;
}

export interface JoinedMessage {
  t: "joined";
  playerId: string;
}

export type ServerMessage = StateMessage | ErrorMessage | JoinedMessage;

// client -> server
export type ClientMessage =
  | { t: "start" }
  | { t: "buzz" }
  | { t: "answer"; i: number }
  | { t: "restart" };
