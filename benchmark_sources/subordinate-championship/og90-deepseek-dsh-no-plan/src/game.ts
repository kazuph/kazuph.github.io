/**
 * 早押しクイズのゲーム進行ロジック（純粋関数のみ）。
 *
 * ここには副作用を一切置かない。Durable Object が状態を保持し、
 * このモジュールの関数を呼んで状態を進める。そうすることで
 * 「サーバー側で正誤・点数・早押し順を決める」ルールを
 * ユニットテストで直接検証できる。
 */
import { QUESTIONS, type Question } from "./questions";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOTAL_QUESTIONS = QUESTIONS.length; // 10
/** 問題が出てから締め切られるまでの時間 */
export const QUESTION_TIME_MS = 20_000;
/** 回答権を得てから選ぶまでの時間 */
export const ANSWER_TIME_MS = 10_000;
/** 正解発表を見せてから次の問題へ進むまでの時間 */
export const REVEAL_TIME_MS = 4_000;

export const SCORE_CORRECT = 10;
export const SCORE_WRONG = -5;

export type Phase = "lobby" | "buzzing" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  joinedAt: number;
}

export interface RevealInfo {
  qIndex: number;
  answerIndex: number;
  scoredPlayerId: string | null;
  chosenIndex: number | null;
}

export interface GameState {
  code: string;
  hostId: string;
  phase: Phase;
  players: Player[];
  /** playerId -> 再接続用の秘密トークン（クライアントには渡さない） */
  tokens: Record<string, string>;
  questions: Question[];
  qIndex: number;
  /** この問題で既に押して不正解だった人（もう押せない） */
  buzzedOut: string[];
  answererId: string | null;
  questionStartedAt: number | null;
  questionDeadline: number | null;
  answerDeadline: number | null;
  phaseDeadline: number | null;
  reveal: RevealInfo | null;
  createdAt: number;
}

export type GameEvent =
  | { type: "player-joined"; playerId: string; name: string }
  | { type: "player-left"; playerId: string }
  | { type: "phase"; phase: Phase }
  | { type: "buzz-granted"; playerId: string }
  | { type: "buzz-denied"; playerId: string; reason: string }
  | { type: "answer-correct"; playerId: string; choice: number }
  | { type: "answer-wrong"; playerId: string; choice: number }
  | { type: "answer-timeout"; playerId: string }
  | { type: "reveal"; qIndex: number; answerIndex: number }
  | { type: "game-finished" };

export interface ActionResult {
  ok: boolean;
  error?: string;
  events: GameEvent[];
}

const ok = (events: GameEvent[] = []): ActionResult => ({ ok: true, events });
const fail = (error: string): ActionResult => ({ ok: false, error, events: [] });

export function createGameState(
  code: string,
  hostId: string,
  now: number,
  questions: Question[] = QUESTIONS,
): GameState {
  return {
    code,
    hostId,
    phase: "lobby",
    players: [],
    tokens: {},
    questions,
    qIndex: 0,
    buzzedOut: [],
    answererId: null,
    questionStartedAt: null,
    questionDeadline: null,
    answerDeadline: null,
    phaseDeadline: null,
    reveal: null,
    createdAt: now,
  };
}

export function findPlayer(state: GameState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId);
}

export function currentQuestion(state: GameState): Question | null {
  if (state.phase === "lobby" || state.phase === "finished") return null;
  return state.questions[state.qIndex] ?? null;
}

/**
 * 入室処理。定員（4 人）とゲーム中かどうかをサーバー側で判定する。
 * 再接続（トークン一致）は満員でも、ゲーム中でも許可する。
 */
export function addPlayer(
  state: GameState,
  player: { id: string; name: string; token: string },
  now: number,
): ActionResult {
  const reconnect = state.tokens[player.id];
  if (reconnect && reconnect === player.token) {
    const existing = findPlayer(state, player.id);
    if (existing) existing.connected = true;
    return ok();
  }
  if (state.phase !== "lobby") {
    return fail("ゲームが始まっているため参加できません");
  }
  if (state.players.length >= MAX_PLAYERS) {
    return fail("この部屋は満員です（定員4人）");
  }
  if (!player.name || player.name.trim().length === 0) {
    return fail("名前を入力してください");
  }
  state.players.push({
    id: player.id,
    name: player.name.trim().slice(0, 12),
    score: 0,
    connected: true,
    joinedAt: now,
  });
  state.tokens[player.id] = player.token;
  return ok([{ type: "player-joined", playerId: player.id, name: player.name }]);
}

export function markConnected(state: GameState, playerId: string, connected: boolean): void {
  const p = findPlayer(state, playerId);
  if (p) p.connected = connected;
}

export function removePlayer(state: GameState, playerId: string): ActionResult {
  const p = findPlayer(state, playerId);
  if (!p) return fail("プレイヤーが見つかりません");
  state.players = state.players.filter((x) => x.id !== playerId);
  delete state.tokens[playerId];
  state.buzzedOut = state.buzzedOut.filter((id) => id !== playerId);
  if (state.answererId === playerId) {
    state.answererId = null;
    if (state.phase === "answering") {
      state.phase = "buzzing";
      state.answerDeadline = null;
      state.phaseDeadline = state.questionDeadline;
    }
  }
  if (state.players.length > 0 && state.hostId === playerId) {
    state.hostId = state.players[0]!.id;
  }
  return ok([{ type: "player-left", playerId }]);
}

export function startGame(state: GameState, byPlayerId: string, now: number): ActionResult {
  if (state.phase !== "lobby") return fail("すでにゲームが始まっています");
  if (byPlayerId !== state.hostId) return fail("開始できるのは部屋を作った人だけです");
  const n = state.players.length;
  if (n < MIN_PLAYERS) return fail(`開始するには${MIN_PLAYERS}人以上必要です`);
  if (n > MAX_PLAYERS) return fail(`開始するには${MAX_PLAYERS}人以下にしてください`);
  state.phase = "buzzing";
  state.qIndex = 0;
  beginQuestion(state, now);
  return ok([{ type: "phase", phase: "buzzing" }]);
}

function beginQuestion(state: GameState, now: number): void {
  state.phase = "buzzing";
  state.buzzedOut = [];
  state.answererId = null;
  state.reveal = null;
  state.questionStartedAt = now;
  state.questionDeadline = now + QUESTION_TIME_MS;
  state.answerDeadline = null;
  state.phaseDeadline = state.questionDeadline;
}

/** 早押し。最初に処理された 1 人だけが回答権を得る。 */
export function buzz(state: GameState, playerId: string, now: number): ActionResult {
  const player = findPlayer(state, playerId);
  if (!player) return fail("参加者ではありません");
  if (state.phase !== "buzzing") {
    return { ok: false, error: "今は押せません", events: [{ type: "buzz-denied", playerId, reason: "phase" }] };
  }
  if (state.answererId) {
    return { ok: false, error: "他の人が回答中です", events: [{ type: "buzz-denied", playerId, reason: "taken" }] };
  }
  if (state.buzzedOut.includes(playerId)) {
    return { ok: false, error: "この問題ではもう押せません", events: [{ type: "buzz-denied", playerId, reason: "out" }] };
  }
  if (now >= (state.questionDeadline ?? 0)) {
    return { ok: false, error: "時間切れです", events: [{ type: "buzz-denied", playerId, reason: "timeout" }] };
  }
  state.answererId = playerId;
  state.phase = "answering";
  state.answerDeadline = Math.min(now + ANSWER_TIME_MS, state.questionDeadline ?? now + ANSWER_TIME_MS);
  state.phaseDeadline = state.answerDeadline;
  return ok([{ type: "buzz-granted", playerId }]);
}

/** 回答。正誤判定はサーバー側のみで行う。 */
export function submitAnswer(
  state: GameState,
  playerId: string,
  choice: number,
  now: number,
): ActionResult {
  if (state.phase !== "answering" || state.answererId !== playerId) {
    return fail("回答権がありません");
  }
  const q = state.questions[state.qIndex];
  if (!q) return fail("問題がありません");
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return fail("選択肢が不正です");
  const player = findPlayer(state, playerId);
  if (!player) return fail("参加者ではありません");

  if (choice === q.answerIndex) {
    player.score += SCORE_CORRECT;
    doReveal(state, now, playerId, choice);
    return ok([
      { type: "answer-correct", playerId, choice },
      { type: "reveal", qIndex: state.qIndex, answerIndex: q.answerIndex },
    ]);
  }

  player.score += SCORE_WRONG;
  if (!state.buzzedOut.includes(playerId)) state.buzzedOut.push(playerId);
  state.answererId = null;
  const events: GameEvent[] = [{ type: "answer-wrong", playerId, choice }];
  if (everyoneBuzzedOut(state)) {
    doReveal(state, now, null, choice);
    events.push({ type: "reveal", qIndex: state.qIndex, answerIndex: q.answerIndex });
  } else {
    state.phase = "buzzing";
    state.answerDeadline = null;
    state.phaseDeadline = state.questionDeadline;
    events.push({ type: "phase", phase: "buzzing" });
  }
  return ok(events);
}

function everyoneBuzzedOut(state: GameState): boolean {
  if (state.players.length === 0) return false;
  return state.players.every((p) => state.buzzedOut.includes(p.id));
}

function doReveal(state: GameState, now: number, scoredPlayerId: string | null, chosen: number | null): void {
  const q = state.questions[state.qIndex];
  state.phase = "reveal";
  state.answererId = null;
  state.answerDeadline = null;
  state.reveal = {
    qIndex: state.qIndex,
    answerIndex: q ? q.answerIndex : -1,
    scoredPlayerId,
    chosenIndex: chosen,
  };
  state.phaseDeadline = now + REVEAL_TIME_MS;
}

/** 誰も答えられないまま制限時間が来たら正解を発表する。 */
export function revealNow(state: GameState, now: number): ActionResult {
  if (state.phase !== "buzzing" && state.phase !== "answering") return fail("発表できる状態ではありません");
  doReveal(state, now, null, null);
  return ok([{ type: "reveal", qIndex: state.qIndex, answerIndex: state.reveal?.answerIndex ?? -1 }]);
}

/**
 * 時間経過の処理。Durable Object の alarm から呼ぶ。
 * 進行に応じて次の締切を state に書き込み、必要ならイベントを返す。
 */
export function tick(state: GameState, now: number): ActionResult {
  const events: GameEvent[] = [];
  if (state.phase === "buzzing") {
    if (now >= (state.questionDeadline ?? Infinity)) {
      const q = state.questions[state.qIndex];
      doReveal(state, now, null, null);
      if (q) events.push({ type: "reveal", qIndex: state.qIndex, answerIndex: q.answerIndex });
    } else {
      state.phaseDeadline = state.questionDeadline;
    }
  } else if (state.phase === "answering") {
    const answerDeadline = state.answerDeadline ?? Infinity;
    const questionDeadline = state.questionDeadline ?? Infinity;
    if (now >= answerDeadline) {
      const answerer = state.answererId;
      if (now >= questionDeadline) {
        const q = state.questions[state.qIndex];
        doReveal(state, now, null, null);
        if (q) events.push({ type: "reveal", qIndex: state.qIndex, answerIndex: q.answerIndex });
      } else {
        // 10 秒以内に選ばなかった場合は回答権を手放す（減点はしない）
        state.answererId = null;
        state.answerDeadline = null;
        state.phase = "buzzing";
        state.phaseDeadline = state.questionDeadline;
        if (answerer) events.push({ type: "answer-timeout", playerId: answerer });
        events.push({ type: "phase", phase: "buzzing" });
      }
    }
  } else if (state.phase === "reveal") {
    if (now >= (state.phaseDeadline ?? Infinity)) {
      if (state.qIndex + 1 < state.questions.length) {
        state.qIndex += 1;
        beginQuestion(state, now);
        events.push({ type: "phase", phase: "buzzing" });
      } else {
        state.phase = "finished";
        state.phaseDeadline = null;
        state.reveal = null;
        events.push({ type: "game-finished" });
      }
    }
  }
  return ok(events);
}

/** 結果画面からロビーへ戻す（ホストのみ）。点数はリセットする。 */
export function resetToLobby(state: GameState, byPlayerId: string): ActionResult {
  if (byPlayerId !== state.hostId) return fail("ロビーに戻せるのは部屋を作った人だけです");
  if (state.phase !== "finished") return fail("ゲームが終わってから戻せます");
  state.phase = "lobby";
  state.qIndex = 0;
  state.buzzedOut = [];
  state.answererId = null;
  state.questionStartedAt = null;
  state.questionDeadline = null;
  state.answerDeadline = null;
  state.phaseDeadline = null;
  state.reveal = null;
  for (const p of state.players) p.score = 0;
  return ok([{ type: "phase", phase: "lobby" }]);
}

/** 次に alarm を仕掛けるべき時刻。無ければ null。 */
export function nextAlarm(state: GameState): number | null {
  switch (state.phase) {
    case "buzzing":
      return state.questionDeadline;
    case "answering":
      return state.answerDeadline;
    case "reveal":
      return state.phaseDeadline;
    default:
      return null;
  }
}

export interface RankedPlayer {
  rank: number;
  id: string;
  name: string;
  score: number;
}

/** 最終順位（同点は同順位）。 */
export function ranking(state: GameState): RankedPlayer[] {
  const sorted = [...state.players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt || a.name.localeCompare(b.name));
  const out: RankedPlayer[] = [];
  let lastScore: number | null = null;
  let lastRank = 0;
  sorted.forEach((p, i) => {
    const rank = lastScore !== null && p.score === lastScore ? lastRank : i + 1;
    lastScore = p.score;
    lastRank = rank;
    out.push({ rank, id: p.id, name: p.name, score: p.score });
  });
  return out;
}

export interface PublicQuestion {
  text: string;
  choices: string[];
  index: number;
}

export interface PublicState {
  code: string;
  hostId: string;
  phase: Phase;
  players: Array<{ id: string; name: string; score: number; connected: boolean; isHost: boolean }>;
  qIndex: number;
  totalQuestions: number;
  question: PublicQuestion | null;
  answererId: string | null;
  buzzedOut: string[];
  questionDeadline: number | null;
  answerDeadline: number | null;
  phaseDeadline: number | null;
  reveal: { qIndex: number; answerIndex: number; scoredPlayerId: string | null; chosenIndex: number | null } | null;
  ranking: RankedPlayer[];
  capacity: number;
}

/**
 * クライアントへ送る公開状態。正解(answerIndex)は reveal 中のみ、
 * トークンや未公開の答えは絶対に含めない。
 */
export function publicState(state: GameState): PublicState {
  const q = currentQuestion(state);
  const showAnswer = state.phase === "reveal";
  return {
    code: state.code,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      isHost: p.id === state.hostId,
    })),
    qIndex: state.qIndex,
    totalQuestions: state.questions.length,
    question: q ? { text: q.text, choices: [...q.choices], index: state.qIndex } : null,
    answererId: state.answererId,
    buzzedOut: [...state.buzzedOut],
    questionDeadline: state.questionDeadline,
    answerDeadline: state.answerDeadline,
    phaseDeadline: state.phaseDeadline,
    reveal: showAnswer && state.reveal
      ? {
          qIndex: state.reveal.qIndex,
          answerIndex: state.reveal.answerIndex,
          scoredPlayerId: state.reveal.scoredPlayerId,
          chosenIndex: state.reveal.chosenIndex,
        }
      : null,
    ranking: ranking(state),
    capacity: MAX_PLAYERS,
  };
}
