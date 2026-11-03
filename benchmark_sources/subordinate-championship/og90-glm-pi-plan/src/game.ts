// ゲームの規則だけを書いた純粋関数。
// すべての時刻 now は引数で受け取り、I/O や Date.now() への依存を持たない。
import { QUESTIONS } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const QUESTION_MS = 20000; // 問題が出てから締め切りまで
export const ANSWER_MS = 10000; // 押してから回答するまで
export const REVEAL_MS = 3000; // 正解表示の長さ
export const CORRECT_POINTS = 10;
export const WRONG_POINTS = -5;
export const TOTAL_QUESTIONS = 10;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  token: string;
  score: number;
  connected: boolean;
}

/** 1問ぶんの決着の記録（正解表示のときに全員に見せる） */
export interface Outcome {
  playerId: string | null; // 押した人。誰も押さなければ null
  kind: "correct" | "wrong" | "timeout" | "noanswer";
  choice: number | null;
  correct: number;
  delta: Record<string, number>; // この問題での加点・減点
}

export interface GameState {
  code: string;
  phase: Phase;
  players: Player[];
  hostId: string | null;
  /** 現在の問題が order の何番目か。-1 はロビー */
  qIndex: number;
  /** 使う問題の並び（QUESTIONS の添字） */
  order: number[];
  /** 今のフェーズが始まった時刻 */
  shownAt: number;
  /** 今のフェーズの締め切り。answering の間は問題の締め切りのまま */
  deadline: number;
  buzzPlayerId: string | null;
  buzzDeadline: number | null;
  /** この問題でもう押せない人 */
  eliminations: string[];
  /** 正解の番号。reveal 表示のときだけ使う */
  revealCorrect: number | null;
  outcome: Outcome | null;
}

export interface Result<T> {
  ok: boolean;
  error?: string;
  value?: T;
}

// ---------------------------------------------------------------- 生成

export function createGame(code: string, hostId: string, hostName: string, token: string, now: number): GameState {
  const host: Player = {
    id: hostId, name: hostName, token, score: 0, connected: false,
  };
  return {
    code,
    phase: "lobby",
    players: [host],
    hostId,
    qIndex: -1,
    order: [],
    shownAt: now,
    deadline: now + QUESTION_MS,
    buzzPlayerId: null,
    buzzDeadline: null,
    eliminations: [],
    revealCorrect: null,
    outcome: null,
  };
}

export function getPlayer(state: GameState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId);
}

export function tokenPlayer(state: GameState, token: string): Player | undefined {
  return state.players.find((p) => p.token === token);
}

/** token → playerId を Room 側の接続認証に使う */
export function playerByToken(state: GameState, token: string): Player | undefined {
  return tokenPlayer(state, token);
}

// ---------------------------------------------------------------- 参加・開始

export function addPlayer(state: GameState, playerId: string, name: string, token: string): Result<Player> {
  if (state.phase !== "lobby") {
    return { ok: false, error: "ゲームはもう始まっています" };
  }
  if (state.players.length >= MAX_PLAYERS) {
    return { ok: false, error: `満員です（${MAX_PLAYERS}人まで）` };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "名前を入れてください" };
  }
  const player: Player = { id: playerId, name: trimmed, token, score: 0, connected: false };
  state.players.push(player);
  return { ok: true, value: player };
}

export function canStart(state: GameState, requesterId: string): Result<null> {
  if (requesterId !== state.hostId) {
    return { ok: false, error: "ホストだけが開始できます" };
  }
  if (state.players.length < MIN_PLAYERS) {
    return { ok: false, error: `${MIN_PLAYERS}人以上そろってから開始できます` };
  }
  if (state.players.length > MAX_PLAYERS) {
    return { ok: false, error: `${MAX_PLAYERS}人を超えています` };
  }
  return { ok: true, value: null };
}

/** ゲームを開始する。order は questions の添字の並び（ちょうど 10 個） */
export function startGame(state: GameState, requesterId: string, order: number[], now: number): Result<null> {
  const start = canStart(state, requesterId);
  if (!start.ok) {
    return start;
  }
  state.order = order;
  state.qIndex = 0;
  startQuestion(state, now);
  return { ok: true, value: null };
}

// ---------------------------------------------------------------- 時間の前進

function currentQuestion(state: GameState) {
  return QUESTIONS[state.order[state.qIndex]];
}

function startQuestion(state: GameState, now: number): void {
  state.phase = "question";
  state.shownAt = now;
  state.deadline = now + QUESTION_MS;
  state.buzzPlayerId = null;
  state.buzzDeadline = null;
  state.eliminations = [];
  state.revealCorrect = null;
  state.outcome = null;
}

function toReveal(state: GameState, now: number): void {
  state.phase = "reveal";
  state.shownAt = now;
  state.deadline = now + REVEAL_MS;
  state.revealCorrect = currentQuestion(state).answer;
}

function advance(state: GameState, now: number): void {
  state.qIndex += 1;
  if (state.qIndex >= state.order.length || state.qIndex >= TOTAL_QUESTIONS) {
    state.phase = "finished";
    state.qIndex = state.order.length - 1; // 最後の問題を参照できるままにしておく
    state.buzzPlayerId = null;
    state.buzzDeadline = null;
    state.eliminations = [];
  } else {
    startQuestion(state, now);
  }
}

/** 押してから回答しなかった者の処理。-5 と失格。残っていれば早押しを再開 */
function resolveAnswerTimeout(state: GameState, now: number): void {
  const p = state.buzzPlayerId ? getPlayer(state, state.buzzPlayerId) : undefined;
  if (p) {
    p.score += WRONG_POINTS;
    state.eliminations.push(p.id);
  }
  state.outcome = {
    playerId: p ? p.id : null,
    kind: "timeout",
    choice: null,
    correct: currentQuestion(state).answer,
    delta: p ? { [p.id]: WRONG_POINTS } : {},
  };
  state.buzzPlayerId = null;
  state.buzzDeadline = null;
  if (!hasEligible(state)) {
    toReveal(state, now);
  } else {
    // 問題の締め切りは変えないので、phase を question に戻すだけ
    state.phase = "question";
  }
}

function hasEligible(state: GameState): boolean {
  return state.players.some((p) => !state.eliminations.includes(p.id));
}

/**
 * of締め切りを過ぎた処理をまとめて進める。どの入力より先に呼ぶこと。
 * state を直接書き換える。
 */
export function tick(state: GameState, now: number): void {
  for (let guard = 0; guard < 100; guard++) {
    if (state.phase === "lobby" || state.phase === "finished") {
      return;
    }
    if (state.phase === "question") {
      if (now >= state.deadline) {
        // 誰も答えなかったまま締め切り
        state.outcome = {
          playerId: null,
          kind: "noanswer",
          choice: null,
          correct: currentQuestion(state).answer,
          delta: {},
        };
        toReveal(state, now);
        continue;
      }
      return;
    }
    if (state.phase === "answering") {
      const limit = Math.min(state.deadline, state.buzzDeadline ?? state.deadline);
      if (now >= limit) {
        // deadline が先に来た場合も resolveAnswerTimeout で減点してから reveal へ
        resolveAnswerTimeout(state, now);
        continue;
      }
      return;
    }
    if (state.phase === "reveal") {
      if (now >= state.deadline) {
        advance(state, now);
        continue;
      }
      return;
    }
    return;
  }
}

/** 次に起きる締め切り（Alarm の予約に使う） */
export function nextDeadline(state: GameState): number | null {
  switch (state.phase) {
    case "question":
      return state.deadline;
    case "answering": {
      const buzz = state.buzzDeadline ?? state.deadline;
      return Math.min(state.deadline, buzz);
    }
    case "reveal":
      return state.deadline;
    default:
      return null;
  }
}

// ---------------------------------------------------------------- 入力

/** 早押し。サーバーが最初に受け取った1人だけが回答権を得る */
export function tryBuzz(state: GameState, playerId: string, qIndex: number, now: number): Result<null> {
  if (qIndex !== state.qIndex) {
    // 古い問題番号の buzz は無視（エラーにもしない）
    return { ok: true, value: null };
  }
  if (state.phase !== "question") {
    return { ok: false, error: "いまは押せません" };
  }
  const p = getPlayer(state, playerId);
  if (!p) {
    return { ok: false, error: "参加していません" };
  }
  if (state.eliminations.includes(playerId)) {
    return { ok: false, error: "この問題はもう押せません" };
  }
  state.phase = "answering";
  state.buzzPlayerId = playerId;
  state.buzzDeadline = Math.min(now + ANSWER_MS, state.deadline);
  return { ok: true, value: null };
}

/** 回答。正解 +10、不正解 -5。不正解の者はこの問題ではもう押せない */
export function tryAnswer(state: GameState, playerId: string, qIndex: number, choice: number, now: number): Result<boolean> {
  if (qIndex !== state.qIndex) {
    return { ok: false, error: "その問題はもう終わっています" };
  }
  if (state.phase !== "answering" || state.buzzPlayerId !== playerId) {
    return { ok: false, error: "回答する権利がありません" };
  }
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
    return { ok: false, error: "選択肢が正しくありません" };
  }
  const p = getPlayer(state, playerId);
  if (!p) {
    return { ok: false, error: "参加していません" };
  }
  state.revealCorrect = currentQuestion(state).answer;
  if (choice === state.revealCorrect) {
    p.score += CORRECT_POINTS;
    state.outcome = {
      playerId,
      kind: "correct",
      choice,
      correct: state.revealCorrect,
      delta: { [playerId]: CORRECT_POINTS },
    };
    toReveal(state, now);
    return { ok: true, value: true };
  }
  // 不正解
  p.score += WRONG_POINTS;
  state.eliminations.push(playerId);
  state.outcome = {
    playerId,
    kind: "wrong",
    choice,
    correct: state.revealCorrect,
    delta: { [playerId]: WRONG_POINTS },
  };
  state.buzzPlayerId = null;
  state.buzzDeadline = null;
  if (hasEligible(state)) {
    state.phase = "question"; // 問題の締め切りは変えない
    return { ok: true, value: false };
  }
  toReveal(state, now);
  return { ok: true, value: false };
}

// ---------------------------------------------------------------- 順位

/** 同点は同じ順位。返す配列は点数の高い順 */
export interface Rank {
  playerId: string;
  name: string;
  score: number;
  rank: number;
}

export function ranking(state: GameState): Rank[] {
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  let lastScore: number | null = null;
  let lastRank = 0;
  return sorted.map((p, i) => {
    const rank = lastScore === p.score ? lastRank : i + 1;
    lastScore = p.score;
    lastRank = rank;
    return { playerId: p.id, name: p.name, score: p.score, rank };
  });
}
