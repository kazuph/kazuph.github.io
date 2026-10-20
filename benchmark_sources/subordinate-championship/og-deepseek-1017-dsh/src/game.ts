/**
 * ゲームのドメインロジック（純粋関数）。
 *
 * ここには WebSocket もタイマーも永続化も出てこない。`now` と `Timing` を
 * 引数で受け取り、`RoomState` を書き換えるだけにしてある。
 * これにより「同時押しの裁定」「採点」「時間切れ」をユニットテストで
 * 直接・決定的に検証できる。
 *
 * サーバー権威の原則:
 *  - 回答権 (answererId) はこのモジュールの `buzz()` だけが与える。
 *  - 点数は `submitAnswer()` だけが変更する。
 *  - クライアントから渡されるのは「押した」「この選択肢」という事実のみ。
 */
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  POINTS_CORRECT,
  POINTS_WRONG,
  type AnswerRecord,
  type ErrorCode,
  type Player,
  type PublicPlayer,
  type PublicState,
  type RoomState,
  type Timing,
} from "./protocol";
import { QUESTIONS_PER_GAME, getQuestionById, pickQuestions } from "./questions";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_NAME_LENGTH = 12;

export function generateRoomCode(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return out;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function createRoom(code: string): RoomState {
  return {
    code,
    created: true,
    hostId: null,
    phase: "lobby",
    players: [],
    questionOrder: [],
    questionIndex: -1,
    questionStartedAt: null,
    questionDeadline: null,
    answerDeadline: null,
    revealDeadline: null,
    answererId: null,
    locked: [],
    currentAnswers: {},
    lastReveal: null,
    startedAt: null,
    finishedAt: null,
    round: 0,
  };
}

/** 空の部屋（まだ `created` されていない）を表す。存在しない部屋コードへの接続を弾くため。 */
export function emptyRoom(code: string): RoomState {
  return { ...createRoom(code), created: false };
}

export function normalizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function findPlayerById(room: RoomState, id: string | null | undefined): Player | undefined {
  if (!id) return undefined;
  return room.players.find((p) => p.id === id);
}

export function findPlayerByToken(room: RoomState, token: string | null | undefined): Player | undefined {
  if (!token) return undefined;
  return room.players.find((p) => p.token === token);
}

export function connectedPlayers(room: RoomState): Player[] {
  return room.players.filter((p) => p.connected);
}

/**
 * 実際に「開始」を押せるホスト。元ホストが切断しているときだけ、
 * 一番早く入室した接続中のプレイヤーが代行する（部屋が詰まらないように）。
 */
export function actingHostId(room: RoomState): string | null {
  const host = findPlayerById(room, room.hostId);
  if (host && host.connected) return host.id;
  const fallback = connectedPlayers(room).sort((a, b) => a.joinedAt - b.joinedAt)[0];
  return fallback ? fallback.id : room.hostId;
}

export interface JoinResult {
  ok: boolean;
  player?: Player;
  reconnected?: boolean;
  code?: ErrorCode;
  message?: string;
}

export function joinRoom(
  room: RoomState,
  input: { name: unknown; token?: string | null; now: number },
): JoinResult {
  if (!room.created) {
    return {
      ok: false,
      code: "ROOM_NOT_FOUND",
      message: "その部屋コードの部屋は見つかりませんでした。コードを確認してください。",
    };
  }

  if (input.token) {
    const existing = findPlayerByToken(room, input.token);
    if (existing) {
      existing.connected = true;
      return { ok: true, player: existing, reconnected: true };
    }
  }

  const name = normalizeName(input.name);
  if (!name) {
    return {
      ok: false,
      code: "BAD_NAME",
      message: "名前を入力してください（1〜12文字）。",
    };
  }

  // 途中参加は不可。ただしトークンによる復帰は上で処理済み。
  if (room.phase !== "lobby") {
    return {
      ok: false,
      code: "GAME_IN_PROGRESS",
      message: "この部屋はゲーム進行中です。新しく参加することはできません。",
    };
  }

  if (room.players.length >= MAX_PLAYERS) {
    return {
      ok: false,
      code: "ROOM_FULL",
      message: `この部屋は満員です（定員${MAX_PLAYERS}人）。別の部屋コードを試してください。`,
    };
  }

  const player: Player = {
    id: generateId(),
    token: generateId(),
    name,
    score: 0,
    correctCount: 0,
    connected: true,
    joinedAt: input.now,
  };
  room.players.push(player);
  if (!room.hostId) room.hostId = player.id;
  return { ok: true, player, reconnected: false };
}

export function markConnected(room: RoomState, playerId: string, connected: boolean): void {
  const p = findPlayerById(room, playerId);
  if (p) p.connected = connected;
}

/** 明示的な「退出」。ロビーなら完全に削除、ゲーム中なら記録を残して切断扱い。 */
export function leaveRoom(room: RoomState, playerId: string): void {
  if (room.phase === "lobby") {
    room.players = room.players.filter((p) => p.id !== playerId);
    room.locked = room.locked.filter((id) => id !== playerId);
    if (room.hostId === playerId) {
      const next = room.players.slice().sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = next ? next.id : null;
    }
  } else {
    markConnected(room, playerId, false);
  }
}

export interface StartCheck {
  ok: boolean;
  code?: ErrorCode;
  message?: string;
}

export function canStart(room: RoomState, playerId: string | null): StartCheck {
  if (room.phase !== "lobby") {
    return { ok: false, code: "UNKNOWN", message: "すでにゲームが始まっています。" };
  }
  if (!playerId || playerId !== actingHostId(room)) {
    return { ok: false, code: "NOT_HOST", message: "開始できるのはホストだけです。" };
  }
  const connected = connectedPlayers(room).length;
  if (connected < MIN_PLAYERS) {
    return {
      ok: false,
      code: "NOT_ENOUGH_PLAYERS",
      message: `開始するには${MIN_PLAYERS}人以上必要です。`,
    };
  }
  return { ok: true };
}

export function startGame(
  room: RoomState,
  playerId: string,
  now: number,
  timing: Timing,
  rng: () => number = Math.random,
): StartCheck {
  const check = canStart(room, playerId);
  if (!check.ok) return check;

  room.round += 1;
  room.questionOrder = pickQuestions(QUESTIONS_PER_GAME, rng).map((q) => q.id);
  room.questionIndex = -1;
  room.answererId = null;
  room.locked = [];
  room.currentAnswers = {};
  room.lastReveal = null;
  room.startedAt = now;
  room.finishedAt = null;
  room.questionDeadline = null;
  room.answerDeadline = null;
  room.revealDeadline = null;
  for (const p of room.players) {
    p.score = 0;
    p.correctCount = 0;
  }
  beginQuestion(room, now, timing);
  return { ok: true };
}

/** 最終結果画面から、同じメンバーでもう一度開始する。 */
export function rematch(
  room: RoomState,
  playerId: string,
  now: number,
  timing: Timing,
  rng: () => number = Math.random,
): StartCheck {
  if (room.phase !== "final") {
    return { ok: false, code: "UNKNOWN", message: "ゲームが終わってから使えます。" };
  }
  if (playerId !== actingHostId(room)) {
    return { ok: false, code: "NOT_HOST", message: "もう一度開始できるのはホストだけです。" };
  }
  if (connectedPlayers(room).length < MIN_PLAYERS) {
    return {
      ok: false,
      code: "NOT_ENOUGH_PLAYERS",
      message: `開始するには${MIN_PLAYERS}人以上必要です。`,
    };
  }
  room.phase = "lobby";
  return startGame(room, playerId, now, timing, rng);
}

export function currentQuestion(room: RoomState) {
  const id = room.questionOrder[room.questionIndex];
  return id ? getQuestionById(id) : undefined;
}

export function beginQuestion(room: RoomState, now: number, timing: Timing): void {
  room.questionIndex += 1;
  if (room.questionIndex >= room.questionOrder.length) {
    finishGame(room, now);
    return;
  }
  room.phase = "question";
  room.questionStartedAt = now;
  room.questionDeadline = now + timing.questionMs;
  room.answerDeadline = null;
  room.revealDeadline = null;
  room.answererId = null;
  room.locked = [];
  room.currentAnswers = {};
  room.lastReveal = null;
}

export function finishGame(room: RoomState, now: number): void {
  room.phase = "final";
  room.finishedAt = now;
  room.answererId = null;
  room.questionDeadline = null;
  room.answerDeadline = null;
  room.revealDeadline = null;
}

export function revealAnswer(room: RoomState, now: number, timing: Timing): void {
  if (room.phase !== "question") return;
  const q = currentQuestion(room);
  if (!q) return;
  room.lastReveal = {
    questionId: q.id,
    correct: q.correct,
    answers: { ...room.currentAnswers },
  };
  room.phase = "reveal";
  room.revealDeadline = now + timing.revealMs;
  room.answererId = null;
  room.answerDeadline = null;
  room.questionDeadline = null;
}

export interface BuzzResult {
  ok: boolean;
  code?: ErrorCode;
  message?: string;
}

/**
 * 早押しの裁定。Durable Object は単一スレッドでメッセージを直列処理するため、
 * ここで `answererId` が null のときにだけ代入すれば「同時押しでも1人だけ」が保証される。
 */
export function buzz(room: RoomState, playerId: string, now: number): BuzzResult {
  if (room.phase !== "question") {
    return { ok: false, code: "TOO_LATE", message: "今は押せません。" };
  }
  const p = findPlayerById(room, playerId);
  if (!p) {
    return { ok: false, code: "UNKNOWN", message: "プレイヤーが見つかりません。" };
  }
  if (room.locked.includes(playerId)) {
    return { ok: false, code: "TOO_LATE", message: "この問題ではもう押せません。" };
  }
  if (room.answererId) {
    return { ok: false, code: "TOO_LATE", message: "他の人が先に押しました。" };
  }
  if (room.questionDeadline !== null && now > room.questionDeadline) {
    return { ok: false, code: "TOO_LATE", message: "時間切れです。" };
  }

  room.answererId = playerId;
  return { ok: true };
}

/**
 * 早押し成功時の締め切り設定を含む裁定。`buzz()` と分けているのは
 * 純粋な判定と時間設定をテストしやすくするため。
 */
export function buzzWithTiming(room: RoomState, playerId: string, now: number, timing: Timing): BuzzResult {
  const result = buzz(room, playerId, now);
  if (!result.ok) return result;
  const answerDeadline = now + timing.answerMs;
  room.answerDeadline = answerDeadline;
  // 回答権を得た人は必ず10秒もらえるよう、問題全体の締め切りを延長する。
  if (room.questionDeadline !== null) {
    room.questionDeadline = Math.max(room.questionDeadline, answerDeadline);
  }
  return result;
}

export interface AnswerOutcome {
  ok: boolean;
  correct?: boolean;
  delta?: number;
  code?: ErrorCode;
  message?: string;
}

export function submitAnswer(
  room: RoomState,
  playerId: string,
  choice: number,
  now: number,
  timing: Timing,
): AnswerOutcome {
  if (room.phase !== "question") {
    return { ok: false, code: "TOO_LATE", message: "今は回答できません。" };
  }
  const p = findPlayerById(room, playerId);
  if (!p) return { ok: false, code: "UNKNOWN", message: "プレイヤーが見つかりません。" };
  if (room.answererId !== playerId) {
    return { ok: false, code: "NOT_ANSWERER", message: "あなたは回答権を持っていません。" };
  }
  if (room.answerDeadline !== null && now > room.answerDeadline) {
    timeoutAnswer(room, now, timing);
    return { ok: false, code: "TOO_LATE", message: "回答時間が終了しました。" };
  }
  const q = currentQuestion(room);
  if (!q) return { ok: false, code: "UNKNOWN", message: "問題が見つかりません。" };
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) {
    return { ok: false, code: "INVALID_MESSAGE", message: "選択肢が不正です。" };
  }

  const correct = choice === q.correct;
  const delta = correct ? POINTS_CORRECT : POINTS_WRONG;
  p.score += delta;
  if (correct) p.correctCount += 1;
  const record: AnswerRecord = { choice, correct, delta };
  room.currentAnswers[playerId] = record;

  if (correct) {
    revealAnswer(room, now, timing);
  } else {
    if (!room.locked.includes(playerId)) room.locked.push(playerId);
    room.answererId = null;
    room.answerDeadline = null;
    maybeRevealWhenExhausted(room, now, timing);
  }
  return { ok: true, correct, delta };
}

/** 回答権を取ったが10秒以内に選ばなかった場合（減点なしでロックし、残りで再開）。 */
export function timeoutAnswer(room: RoomState, now: number, timing: Timing): void {
  const answerer = room.answererId;
  if (answerer && !room.locked.includes(answerer)) room.locked.push(answerer);
  room.answererId = null;
  room.answerDeadline = null;
  maybeRevealWhenExhausted(room, now, timing);
}

/** まだ押せる接続中のプレイヤーが居なくなったら正解発表へ。 */
export function maybeRevealWhenExhausted(room: RoomState, now: number, timing: Timing): boolean {
  if (room.phase !== "question" || room.answererId) return false;
  const eligible = connectedPlayers(room).filter((p) => !room.locked.includes(p.id));
  if (eligible.length === 0) {
    revealAnswer(room, now, timing);
    return true;
  }
  return false;
}

/**
 * アラーム（時間切れ）処理。返り値は状態が変化したかどうか。
 * 期限を過ぎたイベントを順に処理し、まだ先の期限があれば DO 側が再スケジュールする。
 */
export function handleTimeout(room: RoomState, now: number, timing: Timing): boolean {
  let changed = false;

  if (room.phase === "reveal") {
    if (room.revealDeadline !== null && now >= room.revealDeadline) {
      beginQuestion(room, now, timing);
      changed = true;
    }
    return changed;
  }

  if (room.phase !== "question") return false;

  if (room.answererId && room.answerDeadline !== null && now >= room.answerDeadline) {
    timeoutAnswer(room, now, timing);
    changed = true;
  }
  if (room.phase === "question" && room.questionDeadline !== null && now >= room.questionDeadline) {
    revealAnswer(room, now, timing);
    changed = true;
  }
  return changed;
}

/** DO が次に目覚めるべき時刻。null ならアラーム不要。 */
export function nextDeadline(room: RoomState): number | null {
  if (room.phase === "question") {
    if (room.answererId && room.answerDeadline !== null) return room.answerDeadline;
    return room.questionDeadline;
  }
  if (room.phase === "reveal") return room.revealDeadline;
  return null;
}

export interface RankedPlayer {
  playerId: string;
  name: string;
  score: number;
  correctCount: number;
  rank: number;
}

export function rankPlayers(room: RoomState): RankedPlayer[] {
  const sorted = room.players
    .slice()
    .sort((a, b) => b.score - a.score || b.correctCount - a.correctCount || a.joinedAt - b.joinedAt);
  let lastRank = 0;
  let prevScore = Number.NaN;
  let prevCorrect = Number.NaN;
  return sorted.map((p, index) => {
    if (p.score !== prevScore || p.correctCount !== prevCorrect) {
      lastRank = index + 1;
      prevScore = p.score;
      prevCorrect = p.correctCount;
    }
    return {
      playerId: p.id,
      name: p.name,
      score: p.score,
      correctCount: p.correctCount,
      rank: lastRank,
    };
  });
}

export function publicState(room: RoomState, now: number, timing: Timing): PublicState {
  const q = currentQuestion(room);
  const answering = room.phase === "question" && room.answererId !== null;

  const players: PublicPlayer[] = room.players
    .slice()
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      correctCount: p.correctCount,
      connected: p.connected,
      locked: room.locked.includes(p.id),
      isAnswerer: room.answererId === p.id,
      isHost: actingHostId(room) === p.id,
    }));

  let kind: PublicState["timer"]["kind"] = null;
  let deadline: number | null = null;
  let totalMs = 0;
  if (room.phase === "question") {
    kind = "question";
    deadline = room.questionDeadline;
    totalMs = timing.questionMs;
    if (answering) {
      kind = "answer";
      deadline = room.answerDeadline;
      totalMs = timing.answerMs;
    }
  } else if (room.phase === "reveal") {
    kind = "reveal";
    deadline = room.revealDeadline;
    totalMs = timing.revealMs;
  }

  const reveal =
    room.phase === "reveal" && room.lastReveal
      ? {
          questionId: room.lastReveal.questionId,
          correct: room.lastReveal.correct,
          answers: Object.entries(room.lastReveal.answers).map(([playerId, rec]) => ({
            playerId,
            name: findPlayerById(room, playerId)?.name ?? "?",
            choice: rec.choice,
            correct: rec.correct,
            delta: rec.delta,
          })),
        }
      : null;

  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    actingHostId: actingHostId(room),
    capacity: MAX_PLAYERS,
    minPlayers: MIN_PLAYERS,
    players,
    questionIndex: room.questionIndex,
    questionTotal: room.questionOrder.length,
    question: q
      ? { id: q.id, text: q.text, choices: [...q.choices], category: q.category }
      : null,
    answererId: room.answererId,
    lockedIds: [...room.locked],
    serverNow: now,
    timer: { kind, deadline, totalMs },
    reveal,
    results: room.phase === "final" ? rankPlayers(room) : null,
    canStart: canStart(room, actingHostId(room)).ok && connectedPlayers(room).length >= MIN_PLAYERS,
    startedAt: room.startedAt,
    finishedAt: room.finishedAt,
  };
}

export function defaultTiming(): Timing {
  return { questionMs: 20000, answerMs: 10000, revealMs: 3000 };
}

export function timingFromEnv(env: Record<string, unknown> | undefined): Timing {
  const num = (value: unknown, fallback: number): number => {
    const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const base = defaultTiming();
  if (!env) return base;
  return {
    questionMs: num(env.QUESTION_MS, base.questionMs),
    answerMs: num(env.ANSWER_MS, base.answerMs),
    revealMs: num(env.REVEAL_MS, base.revealMs),
  };
}
