/**
 * 早押しクイズのゲーム進行（純粋な状態機械）。
 *
 * ここには I/O を一切置かない。Durable Object が時刻とイベントを渡し、
 * 返ってきた effects に従って保存・配信・アラーム設定を行う。
 * そのため「同時押しで1人だけが回答権を得る」といったルールを
 * 決定的に単体テストできる。
 */
import { QUESTIONS, TOTAL_QUESTIONS, type Question } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
/** 問題が出てから早押しを受け付ける時間 */
export const QUESTION_WINDOW_MS = 20_000;
/** 回答権を得てから4択を選ぶ時間 */
export const ANSWER_WINDOW_MS = 10_000;
/** 正解表示から次の問題までの時間 */
export const REVEAL_MS = 3_500;
/** ロビーに戻すときの待ち時間 */
export const SCORE_CORRECT = 10;
export const SCORE_WRONG = -5;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  score: number;
  token: string;
  /** WebSocket がつながっているか（サーバー側の観測） */
  connected: boolean;
  /** この問題で不正解になり、もう押せない */
  lockedOut: boolean;
  /** この問題で正解した */
  solved: boolean;
  /** この問題で押した回数（表示用） */
  buzzes: number;
}

export interface AnswerLog {
  playerId: string;
  choice: number;
  correct: boolean;
  awarded: number;
}

export interface GameState {
  code: string;
  hostId: string;
  phase: Phase;
  players: Player[];
  /** 0 始まり。lobby/finished では次に出題する番号として保持 */
  questionIndex: number;
  questionStartedAt: number;
  buzzDeadline: number;
  answeringPlayerId: string | null;
  answerDeadline: number | null;
  revealedIndex: number | null;
  lastAnswer: AnswerLog | null;
  nextEventAt: number | null;
  /** 早押しを受け付けているか（phase === "question" と同義だが明示） */
  revision: number;
}

export type GameEvent =
  | { type: "player_join"; playerId: string; name: string; token: string; now: number }
  | { type: "player_leave"; playerId: string; now: number }
  | { type: "player_connected"; playerId: string; now: number }
  | { type: "player_disconnected"; playerId: string; now: number }
  | { type: "start"; playerId: string; now: number }
  | { type: "buzz"; playerId: string; now: number }
  | { type: "answer"; playerId: string; choice: number; now: number }
  | { type: "kick"; playerId: string; targetId: string; now: number }
  | { type: "tick"; now: number }
  | { type: "reset"; playerId: string; now: number };

export type Effect =
  | { type: "save" }
  | { type: "broadcast" }
  | { type: "alarm"; at: number | null };

export interface Notice {
  to: string;
  message: string;
  kind: "error" | "info";
}

export interface ReduceResult {
  state: GameState;
  effects: Effect[];
  notices: Notice[];
}

export function createLobbyState(code: string, hostId: string): GameState {
  return {
    code,
    hostId,
    phase: "lobby",
    players: [],
    questionIndex: 0,
    questionStartedAt: 0,
    buzzDeadline: 0,
    answeringPlayerId: null,
    answerDeadline: null,
    revealedIndex: null,
    lastAnswer: null,
    nextEventAt: null,
    revision: 0,
  };
}

export function currentQuestion(state: GameState): Question {
  return QUESTIONS[Math.min(state.questionIndex, TOTAL_QUESTIONS - 1)];
}

/** 回答権を持てる（=この問題でまだ押せる）プレイヤー */
export function canBuzz(state: GameState, player: Player): boolean {
  return state.phase === "question" && !player.lockedOut && !player.solved;
}

/** phase に応じた「次に自動処理を起こす時刻」 */
function computeNextEventAt(state: GameState): number | null {
  switch (state.phase) {
    case "question":
      return state.buzzDeadline;
    case "answering":
      return state.answerDeadline;
    case "reveal":
      return state.nextEventAt;
    default:
      return null;
  }
}

function finish(state: GameState, effects: Effect[]): void {
  state.nextEventAt = null;
  effects.push({ type: "alarm", at: null });
}

/** 正解を全員に表示する（フェーズ reveal へ）。 */
function reveal(state: GameState, now: number, effects: Effect[], answer?: AnswerLog): void {
  state.phase = "reveal";
  state.answeringPlayerId = null;
  state.answerDeadline = null;
  state.revealedIndex = currentQuestion(state).correct;
  state.lastAnswer = answer ?? null;
  state.nextEventAt = now + REVEAL_MS;
  effects.push({ type: "alarm", at: state.nextEventAt });
}

/** 次の問題を開始する。10問終わっていれば finished へ。 */
function startQuestion(state: GameState, now: number, effects: Effect[]): void {
  for (const p of state.players) {
    p.lockedOut = false;
    p.solved = false;
    p.buzzes = 0;
  }
  state.answeringPlayerId = null;
  state.answerDeadline = null;
  state.revealedIndex = null;
  state.lastAnswer = null;
  state.questionStartedAt = now;
  state.buzzDeadline = now + QUESTION_WINDOW_MS;
  state.phase = "question";
  state.nextEventAt = state.buzzDeadline;
  effects.push({ type: "alarm", at: state.nextEventAt });
}

function eligiblePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.lockedOut && !p.solved);
}

function findPlayer(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

function deepClone(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    lastAnswer: state.lastAnswer ? { ...state.lastAnswer } : null,
  };
}

/**
 * 状態機械の本体。
 * 返り値の state は新しいオブジェクト（元の state は変更しない）。
 */
export function reduce(prev: GameState, event: GameEvent): ReduceResult {
  const state = deepClone(prev);
  const effects: Effect[] = [];
  const notices: Notice[] = [];
  const now = event.now;

  switch (event.type) {
    case "player_join": {
      if (!findPlayer(state, event.playerId)) {
        state.players.push({
          id: event.playerId,
          name: event.name,
          score: 0,
          token: event.token,
          connected: false,
          lockedOut: false,
          solved: false,
          buzzes: 0,
        });
      }
      break;
    }
    case "player_leave": {
      state.players = state.players.filter((p) => p.id !== event.playerId);
      if (state.hostId === event.playerId && state.players.length > 0) {
        state.hostId = state.players[0].id;
      }
      break;
    }
    case "player_connected": {
      const p = findPlayer(state, event.playerId);
      if (p) p.connected = true;
      break;
    }
    case "player_disconnected": {
      const p = findPlayer(state, event.playerId);
      if (p) p.connected = false;
      break;
    }
    case "start": {
      if (event.playerId !== state.hostId) {
        notices.push({ to: event.playerId, message: "ゲームを開始できるのはホストだけです", kind: "error" });
        break;
      }
      if (state.phase !== "lobby") {
        notices.push({ to: event.playerId, message: "すでにゲームが始まっています", kind: "error" });
        break;
      }
      if (state.players.length < MIN_PLAYERS) {
        notices.push({
          to: event.playerId,
          message: `開始には${MIN_PLAYERS}人以上必要です（現在${state.players.length}人）`,
          kind: "error",
        });
        break;
      }
      state.questionIndex = 0;
      startQuestion(state, now, effects);
      break;
    }
    case "buzz": {
      const p = findPlayer(state, event.playerId);
      if (!p) break;
      if (state.phase !== "question") {
        if (state.phase === "answering") {
          notices.push({ to: p.id, message: "すでに他の人が回答権を持っています", kind: "error" });
        } else {
          notices.push({ to: p.id, message: "いまは早押しできません", kind: "error" });
        }
        break;
      }
      if (p.lockedOut) {
        notices.push({ to: p.id, message: "この問題ではもう押せません（不正解）", kind: "error" });
        break;
      }
      if (p.solved) {
        notices.push({ to: p.id, message: "この問題は正解済みです", kind: "error" });
        break;
      }
      // ★ サーバーが最初に受け取った1人だけが回答権を得る
      p.buzzes += 1;
      state.answeringPlayerId = p.id;
      state.phase = "answering";
      state.answerDeadline = now + ANSWER_WINDOW_MS;
      state.nextEventAt = state.answerDeadline;
      effects.push({ type: "alarm", at: state.nextEventAt });
      break;
    }
    case "answer": {
      if (state.phase !== "answering") {
        notices.push({ to: event.playerId, message: "いまは回答できません", kind: "error" });
        break;
      }
      // 回答権を持っている本人以外の回答はサーバーが無視する
      if (state.answeringPlayerId !== event.playerId) {
        notices.push({ to: event.playerId, message: "回答権を持っているのはあなたではありません", kind: "error" });
        break;
      }
      const p = findPlayer(state, event.playerId);
      if (!p) break;
      const q = currentQuestion(state);
      if (!Number.isInteger(event.choice) || event.choice < 0 || event.choice >= q.choices.length) {
        notices.push({ to: event.playerId, message: "選択肢の指定が不正です", kind: "error" });
        break;
      }
      const correct = event.choice === q.correct;
      const awarded = correct ? SCORE_CORRECT : SCORE_WRONG;
      p.score += awarded;
      if (correct) {
        p.solved = true;
        reveal(state, now, effects, { playerId: p.id, choice: event.choice, correct: true, awarded });
      } else {
        p.lockedOut = true;
        const remaining = eligiblePlayers(state);
        if (remaining.length === 0 || now >= state.buzzDeadline) {
          // 全員が押せなくなった → 正解を表示
          reveal(state, now, effects, { playerId: p.id, choice: event.choice, correct: false, awarded });
        } else {
          // 残りの人で早押しを再開する（問題の20秒は継続）
          state.lastAnswer = { playerId: p.id, choice: event.choice, correct: false, awarded };
          state.phase = "question";
          state.answeringPlayerId = null;
          state.answerDeadline = null;
          state.nextEventAt = state.buzzDeadline;
          effects.push({ type: "alarm", at: state.nextEventAt });
        }
      }
      break;
    }
    case "tick": {
      if (state.phase === "question" && now >= state.buzzDeadline) {
        reveal(state, now, effects);
      } else if (state.phase === "answering" && state.answerDeadline !== null && now >= state.answerDeadline) {
        // 10秒以内に選ばなかった → 回答権を失うだけ（得点変動なし）で正解を表示
        reveal(state, now, effects);
      } else if (state.phase === "reveal" && state.nextEventAt !== null && now >= state.nextEventAt) {
        if (state.questionIndex + 1 >= TOTAL_QUESTIONS) {
          state.phase = "finished";
          finish(state, effects);
        } else {
          state.questionIndex += 1;
          startQuestion(state, now, effects);
        }
      }
      break;
    }
    case "kick": {
      if (event.playerId !== state.hostId) {
        notices.push({ to: event.playerId, message: "外せるのはホストだけです", kind: "error" });
        break;
      }
      if (state.phase !== "lobby") {
        notices.push({ to: event.playerId, message: "ゲーム中は外せません", kind: "error" });
        break;
      }
      const target = findPlayer(state, event.targetId);
      if (!target) break;
      if (target.connected) {
        notices.push({ to: event.playerId, message: "接続中のプレイヤーは外せません", kind: "error" });
        break;
      }
      state.players = state.players.filter((p) => p.id !== target.id);
      break;
    }
    case "reset": {
      if (event.playerId !== state.hostId) {
        notices.push({ to: event.playerId, message: "やり直せるのはホストだけです", kind: "error" });
        break;
      }
      state.phase = "lobby";
      state.questionIndex = 0;
      state.answeringPlayerId = null;
      state.answerDeadline = null;
      state.revealedIndex = null;
      state.lastAnswer = null;
      for (const p of state.players) {
        p.score = 0;
        p.lockedOut = false;
        p.solved = false;
        p.buzzes = 0;
      }
      finish(state, effects);
      break;
    }
    default: {
      const exhaustive: never = event;
      throw new Error(`unknown event: ${JSON.stringify(exhaustive)}`);
    }
  }

  state.revision += 1;
  state.nextEventAt = event.type === "tick" ? state.nextEventAt : computeNextEventAt(state);
  effects.push({ type: "save" });
  effects.push({ type: "broadcast" });
  return { state, effects, notices };
}

export interface Ranking {
  rank: number;
  playerId: string;
  name: string;
  score: number;
}

export function ranking(state: GameState): Ranking[] {
  const sorted = state.players
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.score - a.p.score || a.i - b.i);
  let lastScore: number | null = null;
  let lastRank = 0;
  return sorted.map((entry, index) => {
    const rank = lastScore !== null && entry.p.score === lastScore ? lastRank : index + 1;
    lastScore = entry.p.score;
    lastRank = rank;
    return { rank, playerId: entry.p.id, name: entry.p.name, score: entry.p.score };
  });
}
