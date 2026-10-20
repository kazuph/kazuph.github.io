/**
 * 早押しクイズのゲームロジック（純粋関数）。
 *
 * すべての判定（正誤・点数・早押しの順番）はサーバー（Durable Object）側の
 * このモジュールだけで行い、ブラウザからの申告は一切信用しない。
 */
import type { Phase, PublicState, QuestionStatus } from "./types";
import { QUESTION_BANK, QUESTIONS_PER_GAME, type QuizQuestion } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
/** 問題が出されてから、全員に正解を提示するまでの時間 */
export const QUESTION_DURATION_MS = 20_000;
/** 回答権を得た人が回答できる時間 */
export const ANSWER_DURATION_MS = 10_000;
/** 正解を表示してから次の問題へ進むまでの時間 */
export const REVEAL_DURATION_MS = 3_500;
export const SCORE_CORRECT = 10;
export const SCORE_WRONG = -5;

export interface GamePlayer {
  id: string;
  name: string;
  token: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  /** この問題で既に早押しを使ったか（不正解または時間切れ） */
  hasBuzzed: boolean;
  /** この問題で選んだ選択肢（未回答なら null） */
  answer: number | null;
  /** この問題で回答権を得た時刻（記録用） */
  buzzedAt: number | null;
}

/** 出題用にシャッフル済みの問題 */
export interface ShuffledQuestion {
  text: string;
  options: string[];
  answer: number;
}

export interface GameState {
  code: string;
  phase: Phase;
  status: QuestionStatus;
  players: GamePlayer[];
  hostId: string;
  /** 今回のゲームで出題する 10 問（選択肢はシャッフル済み） */
  questions: ShuffledQuestion[];
  questionIndex: number;
  questionStartedAt: number;
  questionDeadline: number;
  answerDeadline: number | null;
  answeringPlayerId: string | null;
  lastAnswer: {
    playerId: string;
    playerName: string;
    choice: number;
    correct: boolean;
  } | null;
  nextQuestionAt: number | null;
  createdAt: number;
}

export type OpResult = { ok: true } | { ok: false; reason: string };

export function createRoomState(code: string, now: number): GameState {
  return {
    code,
    phase: "lobby",
    status: "idle",
    players: [],
    hostId: "",
    questions: [],
    questionIndex: -1,
    questionStartedAt: 0,
    questionDeadline: 0,
    answerDeadline: null,
    answeringPlayerId: null,
    lastAnswer: null,
    nextQuestionAt: null,
    createdAt: now,
  };
}

export function findPlayer(state: GameState, playerId: string): GamePlayer | undefined {
  return state.players.find((p) => p.id === playerId);
}

/** 部屋に参加する。定員超過や不正な名前は拒否する。 */
export function addPlayer(
  state: GameState,
  playerId: string,
  name: string,
  token: string,
): OpResult {
  const trimmed = name.trim().slice(0, 16);
  if (!trimmed) return { ok: false, reason: "名前を入力してください。" };
  if (state.phase !== "lobby") {
    return { ok: false, reason: "すでにゲームが始まっています。" };
  }
  if (state.players.length >= MAX_PLAYERS) {
    return {
      ok: false,
      reason: `この部屋は定員（${MAX_PLAYERS}人）に達しています。別の部屋に参加してください。`,
    };
  }
  const isHost = state.players.length === 0;
  state.players.push({
    id: playerId,
    name: trimmed,
    token,
    score: 0,
    isHost,
    connected: false,
    hasBuzzed: false,
    answer: null,
    buzzedAt: null,
  });
  if (isHost) state.hostId = playerId;
  return { ok: true };
}

/** 既存プレイヤー再入場（トークン照合）。スコアは保持される。 */
export function reconnectPlayer(
  state: GameState,
  playerId: string,
  token: string,
): OpResult {
  const player = findPlayer(state, playerId);
  if (!player) return { ok: false, reason: "そのプレイヤーはこの部屋にいません。" };
  if (player.token !== token) {
    return { ok: false, reason: "認証に失敗しました。" };
  }
  player.connected = true;
  return { ok: true };
}

/** 再接続前のセッション有効性チェック（状態は変更しない）。 */
export function checkSession(
  state: GameState,
  playerId: string,
  token: string,
): { valid: boolean; reason: string } {
  if (!state.code) return { valid: false, reason: "その部屋が見つかりません。" };
  const player = findPlayer(state, playerId);
  if (!player) return { valid: false, reason: "そのプレイヤーはこの部屋にいません。" };
  if (player.token !== token) return { valid: false, reason: "認証に失敗しました。" };
  return { valid: true, reason: "" };
}

export function canStart(state: GameState): { ok: boolean; reason: string | null } {
  const n = state.players.length;
  if (n < MIN_PLAYERS) {
    return { ok: false, reason: `参加者が${MIN_PLAYERS}人未満です（現在${n}人）。` };
  }
  if (n > MAX_PLAYERS) {
    return { ok: false, reason: `参加者が${MAX_PLAYERS}人を超えています。` };
  }
  return { ok: true, reason: null };
}

/** 出題問題の抽出（既定はランダム）。テストでは決定的な関数を注入できる。 */
export type QuestionPicker = (bank: QuizQuestion[]) => ShuffledQuestion[];

export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const defaultQuestionPicker: QuestionPicker = (bank) => {
  const picked = shuffle(bank).slice(0, QUESTIONS_PER_GAME);
  return picked.map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return {
      text: q.text,
      options: order.map((i) => q.options[i]),
      answer: order.indexOf(q.answer),
    };
  });
};

/** ゲームを開始する（ホストのみ・2〜4人）。 */
export function startGame(
  state: GameState,
  now: number,
  picker: QuestionPicker = defaultQuestionPicker,
): OpResult {
  const check = canStart(state);
  if (!check.ok) return { ok: false, reason: check.reason! };
  state.questions = picker(QUESTION_BANK);
  state.players.forEach((p) => {
    p.score = 0;
    p.hasBuzzed = false;
    p.answer = null;
    p.buzzedAt = null;
  });
  state.phase = "playing";
  state.questionIndex = -1;
  state.lastAnswer = null;
  advanceQuestion(state, now);
  return { ok: true };
}

/** 次の問題へ進む（10問終わったら結果画面へ）。 */
export function advanceQuestion(state: GameState, now: number): void {
  state.questionIndex += 1;
  if (state.questionIndex >= state.questions.length) {
    state.phase = "result";
    state.status = "idle";
    state.answeringPlayerId = null;
    state.answerDeadline = null;
    state.nextQuestionAt = null;
    state.questionDeadline = 0;
    state.lastAnswer = null;
    return;
  }
  state.status = "question";
  state.questionStartedAt = now;
  state.questionDeadline = now + QUESTION_DURATION_MS;
  state.answerDeadline = null;
  state.answeringPlayerId = null;
  state.lastAnswer = null;
  state.nextQuestionAt = null;
  state.players.forEach((p) => {
    p.hasBuzzed = false;
    p.answer = null;
    p.buzzedAt = null;
  });
}

/** 早押し。サーバーが最初に受け取った 1 人だけが回答権を得られる。 */
export function applyBuzz(state: GameState, playerId: string, now: number): OpResult {
  if (state.phase !== "playing" || state.status !== "question") {
    return { ok: false, reason: "今は早押しできません。" };
  }
  if (now >= state.questionDeadline) {
    return { ok: false, reason: "時間切れです。" };
  }
  if (state.answeringPlayerId) {
    return { ok: false, reason: "すでに回答権を持つ人がいます。" };
  }
  const player = findPlayer(state, playerId);
  if (!player) return { ok: false, reason: "参加していないプレイヤーです。" };
  if (player.hasBuzzed) {
    return { ok: false, reason: "この問題ではすでに押しています。" };
  }
  player.hasBuzzed = true;
  player.buzzedAt = now;
  state.answeringPlayerId = playerId;
  // 回答できる時間は「10秒」と「問題全体の残り時間」の短い方
  state.answerDeadline = Math.min(now + ANSWER_DURATION_MS, state.questionDeadline);
  return { ok: true };
}

/** 回答。サーバーが正誤を判定して点数を更新する。 */
export function applyAnswer(
  state: GameState,
  playerId: string,
  choice: number,
  now: number,
): OpResult {
  if (state.phase !== "playing" || state.status !== "question") {
    return { ok: false, reason: "今は回答できません。" };
  }
  if (!state.answeringPlayerId) {
    return { ok: false, reason: "回答権がありません。" };
  }
  if (state.answeringPlayerId !== playerId) {
    return { ok: false, reason: "回答権を持つ人だけが回答できます。" };
  }
  if (state.answerDeadline !== null && now > state.answerDeadline) {
    return { ok: false, reason: "回答時間切れです。" };
  }
  const player = findPlayer(state, playerId);
  if (!player) return { ok: false, reason: "参加していないプレイヤーです。" };
  const question = state.questions[state.questionIndex];
  if (!question) return { ok: false, reason: "問題がありません。" };
  if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
    return { ok: false, reason: "選択肢が不正です。" };
  }
  const correct = choice === question.answer;
  player.answer = choice;
  player.score += correct ? SCORE_CORRECT : SCORE_WRONG;
  state.lastAnswer = {
    playerId,
    playerName: player.name,
    choice,
    correct,
  };
  state.answeringPlayerId = null;
  state.answerDeadline = null;
  if (correct || !hasEligibleBuzzer(state)) {
    // 正解した / 全員が早押しできなくなった → 正解を表示して次へ
    state.status = "reveal";
    state.nextQuestionAt = now + REVEAL_DURATION_MS;
  }
  // それ以外は status=question のまま残りの人が早押しを再開できる
  return { ok: true };
}

/** この問題でまだ早押しできる人がいるか。 */
export function hasEligibleBuzzer(state: GameState): boolean {
  return state.players.some((p) => !p.hasBuzzed);
}

/**
 * 経過時間に応じた自動遷移（時間切れの処理）。
 * 返り値は「状態が変わったか」。
 */
export function tick(state: GameState, now: number): boolean {
  let changed = false;
  if (state.phase !== "playing") return false;
  if (state.status === "question") {
    if (
      state.answeringPlayerId &&
      state.answerDeadline !== null &&
      now > state.answerDeadline
    ) {
      // 回答権保持者が時間切れ → 回答権を放棄（この問題では早押し不可）
      state.answeringPlayerId = null;
      state.answerDeadline = null;
      changed = true;
      if (!hasEligibleBuzzer(state)) {
        state.status = "reveal";
        state.nextQuestionAt = now + REVEAL_DURATION_MS;
      }
    }
    if (state.status === "question" && now >= state.questionDeadline) {
      // 問題から20秒経過 or 全員解答不能 → 正解を表示して次へ
      state.status = "reveal";
      state.nextQuestionAt = now + REVEAL_DURATION_MS;
      state.answeringPlayerId = null;
      state.answerDeadline = null;
      changed = true;
    }
  } else if (
    state.status === "reveal" &&
    state.nextQuestionAt !== null &&
    now >= state.nextQuestionAt
  ) {
    advanceQuestion(state, now);
    changed = true;
  }
  return changed;
}

/** 次の締切時刻（タイマー設定用）。 */
export function nextDeadline(state: GameState): number | null {
  if (state.phase !== "playing") return null;
  if (state.status === "question") {
    if (state.answeringPlayerId && state.answerDeadline !== null) {
      return Math.min(state.answerDeadline, state.questionDeadline);
    }
    return state.questionDeadline;
  }
  if (state.status === "reveal") return state.nextQuestionAt;
  return null;
}

/** 結果をロビーに戻す（ホストが次のゲームを始めるため）。 */
export function resetToLobby(state: GameState): void {
  state.phase = "lobby";
  state.status = "idle";
  state.questions = [];
  state.questionIndex = -1;
  state.answeringPlayerId = null;
  state.answerDeadline = null;
  state.nextQuestionAt = null;
  state.questionDeadline = 0;
  state.lastAnswer = null;
  state.players.forEach((p) => {
    p.score = 0;
    p.hasBuzzed = false;
    p.answer = null;
    p.buzzedAt = null;
  });
}

/** クライアントへ配信するスナップショット（正解は reveal のときだけ含む）。 */
export function toPublicState(
  state: GameState,
  viewerId: string | null,
  now: number,
): PublicState {
  const showAnswer = state.status === "reveal";
  const viewer = viewerId ? findPlayer(state, viewerId) : undefined;
  const answering = state.answeringPlayerId
    ? findPlayer(state, state.answeringPlayerId)
    : undefined;
  const start = canStart(state);
  const question = state.questions[state.questionIndex];
  return {
    type: "state",
    code: state.code,
    phase: state.phase,
    status: state.status,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
      connected: p.connected,
      hasBuzzed: p.hasBuzzed,
      answer: p.answer,
    })),
    you: viewer
      ? { id: viewer.id, name: viewer.name, isHost: viewer.isHost }
      : null,
    hostId: state.hostId,
    question: question
      ? {
          index: Math.max(state.questionIndex, 0),
          total: QUESTIONS_PER_GAME,
          text: question.text,
          options: question.options.slice(),
        }
      : null,
    questionStartedAt: state.questionStartedAt,
    questionDeadline: state.questionDeadline,
    answerDeadline: state.answerDeadline,
    answeringPlayerId: state.answeringPlayerId,
    answeringPlayerName: answering ? answering.name : null,
    correctChoice: showAnswer && question ? question.answer : null,
    lastAnswer: state.lastAnswer,
    nextQuestionAt: state.nextQuestionAt,
    serverTime: now,
    canStart: start.ok,
    startReason: start.reason,
  };
}

/** 結果画面用の順位（点数降順、同点は先着順）。 */
export function ranking(state: GameState) {
  return state.players
    .map((p, i) => ({ ...p, order: i }))
    .sort((a, b) => b.score - a.score || a.order - b.order);
}
