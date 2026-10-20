// state → クライアント向けの配信データ。room.ts から分離して単体テスト可能にする。
// token は絶対に含めない。問題が出ている間は正解の番号も含めない。
import type { GameState } from "./game";
import { QUESTIONS } from "./questions";
import { TOTAL_QUESTIONS } from "./game";

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  eliminated: boolean;
}

export interface PublicState {
  t: "state";
  serverNow: number;
  code: string;
  you: string;
  isHost: boolean;
  phase: GameState["phase"];
  players: PublicPlayer[];
  qIndex: number;
  round: number;
  totalQuestions: number;
  question: { text: string; choices: string[] } | null;
  shownAt: number;
  deadline: number;
  buzzDeadline: number | null;
  answeringPlayerId: string | null;
  eliminations: string[];
  correct: number | null;
  outcome: GameState["outcome"];
}

export function toPublicState(state: GameState, you: string, now: number): PublicState {
  const showCorrect = state.phase === "reveal" || state.phase === "finished";
  const inGame =
    state.qIndex >= 0 &&
    (state.phase === "question" || state.phase === "answering" || state.phase === "reveal" || state.phase === "finished");
  const q = inGame ? QUESTIONS[state.order[state.qIndex] ?? 0] : undefined;
  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    connected: p.connected,
    eliminated: state.eliminations.includes(p.id),
  }));
  return {
    t: "state",
    serverNow: now,
    code: state.code,
    you,
    isHost: you === state.hostId,
    phase: state.phase,
    players,
    qIndex: state.qIndex,
    round: Math.min(state.qIndex + 1, TOTAL_QUESTIONS),
    totalQuestions: TOTAL_QUESTIONS,
    question: q ? { text: q.text, choices: [...q.choices] } : null,
    shownAt: state.shownAt,
    deadline: state.deadline,
    buzzDeadline: state.buzzDeadline,
    answeringPlayerId: state.buzzPlayerId,
    eliminations: [...state.eliminations],
    correct: showCorrect && q ? q.answer : null,
    outcome: showCorrect ? state.outcome : null,
  };
}
