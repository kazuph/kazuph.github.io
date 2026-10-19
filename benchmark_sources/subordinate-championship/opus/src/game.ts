// 早押しクイズのルール本体。時刻と乱数は引数で受け取り、副作用を持たない。
// Durable Object はこの関数群を直列に呼ぶだけなので、ここを単体テストすればルールを確かめられる。
import { QUESTION_BANK, type BankQuestion } from "./questions";

export const RULES = {
  maxPlayers: 4,
  minPlayers: 2,
  questionCount: 10,
  questionMs: 20_000,
  answerMs: 10_000,
  countdownMs: 3_000,
  revealMs: 5_000,
  correctPoints: 10,
  wrongPoints: -5,
  nameMaxLength: 12,
} as const;

export type Phase = "lobby" | "countdown" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  token: string;
  name: string;
  seat: number;
  score: number;
  joinedAt: number;
}

export interface GameQuestion {
  text: string;
  choices: string[];
  answer: number;
  note?: string;
}

export type Outcome =
  | { kind: "correct"; playerId: string; choice: number; delta: number }
  | { kind: "wrong"; playerId: string; choice: number; delta: number }
  | { kind: "timeout"; playerId: string; delta: number };

export interface RoomState {
  code: string;
  createdAt: number;
  hostId: string;
  phase: Phase;
  players: Player[];
  questions: GameQuestion[];
  qIndex: number;
  /** countdown / reveal の終了時刻 */
  phaseEndsAt: number | null;
  /** 早押しを受け付ける期限（出題から20秒） */
  questionEndsAt: number | null;
  questionStartedAt: number | null;
  answeringId: string | null;
  answerEndsAt: number | null;
  lockedOut: string[];
  outcomes: Outcome[];
  /** 状態が変わるたびに増える。クライアントの取りこぼし検知用 */
  rev: number;
}

export type GameError =
  | "invalid_name"
  | "name_taken"
  | "room_full"
  | "already_started"
  | "not_host"
  | "not_enough_players"
  | "not_in_lobby"
  | "not_player"
  | "not_open"
  | "locked_out"
  | "not_answering"
  | "invalid_choice";

export const ERROR_MESSAGES: Record<GameError | "room_not_found" | "bad_request", string> = {
  invalid_name: `名前は1〜${RULES.nameMaxLength}文字で入力してください`,
  name_taken: "同じ名前の人がすでに部屋にいます",
  room_full: `この部屋は満員です（定員${RULES.maxPlayers}人）`,
  already_started: "ゲームが始まっているため参加できません",
  not_host: "開始できるのは部屋を作った人だけです",
  not_enough_players: `開始には${RULES.minPlayers}〜${RULES.maxPlayers}人が必要です`,
  not_in_lobby: "いまは操作できません",
  not_player: "この部屋のプレイヤーではありません",
  not_open: "いまは早押しを受け付けていません",
  locked_out: "この問題ではもう押せません",
  not_answering: "回答権がありません",
  invalid_choice: "選択肢が正しくありません",
  room_not_found: "部屋が見つかりません。コードを確かめてください",
  bad_request: "リクエストが正しくありません",
};

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: GameError };
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: GameError): Result<never> => ({ ok: false, error });

export type Rng = () => number;

export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // 制御文字を除き、前後の空白を落とす
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (name.length === 0 || [...name].length > RULES.nameMaxLength) return null;
  return name;
}

export function createRoom(code: string, host: { id: string; token: string; name: string }, now: number): RoomState {
  return {
    code,
    createdAt: now,
    hostId: host.id,
    phase: "lobby",
    players: [{ ...host, seat: 0, score: 0, joinedAt: now }],
    questions: [],
    qIndex: -1,
    phaseEndsAt: null,
    questionEndsAt: null,
    questionStartedAt: null,
    answeringId: null,
    answerEndsAt: null,
    lockedOut: [],
    outcomes: [],
    rev: 1,
  };
}

export function addPlayer(state: RoomState, p: { id: string; token: string; name: string }, now: number): Result<Player> {
  if (state.phase !== "lobby") return fail("already_started");
  if (state.players.length >= RULES.maxPlayers) return fail("room_full");
  if (state.players.some((x) => x.name === p.name)) return fail("name_taken");
  const used = new Set(state.players.map((x) => x.seat));
  let seat = 0;
  while (used.has(seat)) seat++;
  const player: Player = { ...p, seat, score: 0, joinedAt: now };
  state.players.push(player);
  return ok(player);
}

/** ロビーでの退出。ホストが抜けたら一番古い参加者がホストになる。 */
export function removePlayer(state: RoomState, playerId: string): Result {
  if (state.phase !== "lobby" && state.phase !== "finished") return fail("not_in_lobby");
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return fail("not_player");
  state.players.splice(idx, 1);
  if (state.hostId === playerId && state.players.length > 0) {
    state.hostId = [...state.players].sort((a, b) => a.joinedAt - b.joinedAt)[0]!.id;
  }
  return ok(undefined);
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function pickQuestions(rng: Rng, bank: readonly BankQuestion[] = QUESTION_BANK): GameQuestion[] {
  return shuffle(bank, rng)
    .slice(0, RULES.questionCount)
    .map((q) => {
      const order = shuffle([0, 1, 2, 3], rng);
      return {
        text: q.text,
        choices: order.map((i) => q.choices[i]!),
        answer: order.indexOf(0),
        ...(q.note ? { note: q.note } : {}),
      };
    });
}

export function startGame(state: RoomState, byId: string, now: number, rng: Rng): Result {
  if (state.phase !== "lobby") return fail("not_in_lobby");
  if (byId !== state.hostId) return fail("not_host");
  const n = state.players.length;
  if (n < RULES.minPlayers || n > RULES.maxPlayers) return fail("not_enough_players");
  state.questions = pickQuestions(rng);
  state.qIndex = -1;
  for (const p of state.players) p.score = 0;
  state.phase = "countdown";
  state.phaseEndsAt = now + RULES.countdownMs;
  state.outcomes = [];
  return ok(undefined);
}

function openQuestion(state: RoomState, at: number) {
  state.qIndex += 1;
  state.phase = "question";
  state.questionStartedAt = at;
  state.questionEndsAt = at + RULES.questionMs;
  state.phaseEndsAt = null;
  state.answeringId = null;
  state.answerEndsAt = null;
  state.lockedOut = [];
  state.outcomes = [];
}

function reveal(state: RoomState, at: number) {
  state.phase = "reveal";
  state.answeringId = null;
  state.answerEndsAt = null;
  state.phaseEndsAt = at + RULES.revealMs;
}

/** 不正解・時間切れの後: 全員押せないか、20秒を過ぎていれば正解発表。そうでなければ早押し再開。 */
function afterMiss(state: RoomState, at: number) {
  state.answeringId = null;
  state.answerEndsAt = null;
  const everyoneLocked = state.players.every((p) => state.lockedOut.includes(p.id));
  if (everyoneLocked || at >= (state.questionEndsAt ?? 0)) reveal(state, at);
  else state.phase = "question";
}

/**
 * 早押し。呼ばれた順に処理されるので、最初に受け付けた1人だけが回答権を得る。
 * 2人目以降は phase が answering になっているため not_open で弾かれる。
 */
export function buzz(state: RoomState, playerId: string, now: number): Result {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return fail("not_player");
  if (state.phase !== "question" || now >= (state.questionEndsAt ?? 0)) return fail("not_open");
  if (state.lockedOut.includes(playerId)) return fail("locked_out");
  state.phase = "answering";
  state.answeringId = playerId;
  state.answerEndsAt = now + RULES.answerMs;
  return ok(undefined);
}

export function answer(state: RoomState, playerId: string, choice: unknown, now: number): Result<Outcome> {
  if (state.phase !== "answering" || state.answeringId !== playerId || now >= (state.answerEndsAt ?? 0)) {
    return fail("not_answering");
  }
  const q = state.questions[state.qIndex];
  if (!q || typeof choice !== "number" || !Number.isInteger(choice) || choice < 0 || choice >= q.choices.length) {
    return fail("invalid_choice");
  }
  const player = state.players.find((p) => p.id === playerId)!;
  if (choice === q.answer) {
    const outcome: Outcome = { kind: "correct", playerId, choice, delta: RULES.correctPoints };
    player.score += outcome.delta;
    state.outcomes.push(outcome);
    reveal(state, now);
    return ok(outcome);
  }
  const outcome: Outcome = { kind: "wrong", playerId, choice, delta: RULES.wrongPoints };
  player.score += outcome.delta;
  state.outcomes.push(outcome);
  state.lockedOut.push(playerId);
  afterMiss(state, now);
  return ok(outcome);
}

/** 期限を過ぎた状態を進める。何度呼んでも同じ結果になる（冪等）。変化があれば true。 */
export function tick(state: RoomState, now: number): boolean {
  let changed = false;
  for (let guard = 0; guard < 50; guard++) {
    if (state.phase === "countdown" && state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
      openQuestion(state, state.phaseEndsAt);
    } else if (state.phase === "answering" && state.answerEndsAt !== null && now >= state.answerEndsAt) {
      // 10秒以内に選ばなかったら不正解と同じ扱い
      const at = state.answerEndsAt;
      const id = state.answeringId!;
      const player = state.players.find((p) => p.id === id);
      if (player) player.score += RULES.wrongPoints;
      state.outcomes.push({ kind: "timeout", playerId: id, delta: RULES.wrongPoints });
      state.lockedOut.push(id);
      afterMiss(state, at);
    } else if (state.phase === "question" && state.questionEndsAt !== null && now >= state.questionEndsAt) {
      reveal(state, state.questionEndsAt);
    } else if (state.phase === "reveal" && state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
      const at = state.phaseEndsAt;
      if (state.qIndex + 1 >= state.questions.length) {
        state.phase = "finished";
        state.phaseEndsAt = null;
        state.questionEndsAt = null;
        state.questionStartedAt = null;
      } else {
        openQuestion(state, at);
      }
    } else {
      break;
    }
    changed = true;
  }
  return changed;
}

/** 次に tick が必要になる時刻。null なら時間で進む予定はない。 */
export function nextDeadline(state: RoomState): number | null {
  switch (state.phase) {
    case "countdown":
    case "reveal":
      return state.phaseEndsAt;
    case "question":
      return state.questionEndsAt;
    case "answering":
      return state.answerEndsAt;
    default:
      return null;
  }
}

export function backToLobby(state: RoomState, byId: string): Result {
  if (state.phase !== "finished") return fail("not_in_lobby");
  if (byId !== state.hostId) return fail("not_host");
  state.phase = "lobby";
  state.questions = [];
  state.qIndex = -1;
  state.outcomes = [];
  state.lockedOut = [];
  state.questionEndsAt = null;
  state.questionStartedAt = null;
  for (const p of state.players) p.score = 0;
  return ok(undefined);
}

export interface Ranked {
  id: string;
  name: string;
  seat: number;
  score: number;
  rank: number;
}

/** 点数の高い順。同点は同じ順位。 */
export function ranking(state: RoomState): Ranked[] {
  const sorted = [...state.players].sort((a, b) => b.score - a.score || a.seat - b.seat);
  let prevScore: number | null = null;
  let prevRank = 0;
  return sorted.map((p, i) => {
    const rank = p.score === prevScore ? prevRank : i + 1;
    prevScore = p.score;
    prevRank = rank;
    return { id: p.id, name: p.name, seat: p.seat, score: p.score, rank };
  });
}

export interface PublicState {
  code: string;
  hostId: string;
  phase: Phase;
  rev: number;
  players: { id: string; name: string; seat: number; score: number; connected: boolean }[];
  questionNumber: number;
  questionCount: number;
  question: { text: string; choices: string[]; answer: number | null; note: string | null } | null;
  phaseEndsAt: number | null;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  answeringId: string | null;
  answerEndsAt: number | null;
  lockedOut: string[];
  outcomes: Outcome[];
  ranking: Ranked[] | null;
  rules: { questionMs: number; answerMs: number; revealMs: number; countdownMs: number; minPlayers: number; maxPlayers: number };
}

/** 全員に配る状態。トークンは含めず、正解は発表まで伏せる。 */
export function toPublic(state: RoomState, isConnected: (id: string) => boolean): PublicState {
  const q = state.questions[state.qIndex];
  const showAnswer = state.phase === "reveal";
  return {
    code: state.code,
    hostId: state.hostId,
    phase: state.phase,
    rev: state.rev,
    players: [...state.players]
      .sort((a, b) => a.seat - b.seat)
      .map((p) => ({ id: p.id, name: p.name, seat: p.seat, score: p.score, connected: isConnected(p.id) })),
    questionNumber: state.qIndex + 1,
    questionCount: state.questions.length || RULES.questionCount,
    question:
      q && state.phase !== "finished" && state.phase !== "lobby" && state.phase !== "countdown"
        ? { text: q.text, choices: q.choices, answer: showAnswer ? q.answer : null, note: showAnswer ? (q.note ?? null) : null }
        : null,
    phaseEndsAt: state.phaseEndsAt,
    questionStartedAt: state.questionStartedAt,
    questionEndsAt: state.questionEndsAt,
    answeringId: state.answeringId,
    answerEndsAt: state.answerEndsAt,
    lockedOut: state.lockedOut,
    outcomes: state.outcomes,
    ranking: state.phase === "finished" ? ranking(state) : null,
    rules: {
      questionMs: RULES.questionMs,
      answerMs: RULES.answerMs,
      revealMs: RULES.revealMs,
      countdownMs: RULES.countdownMs,
      minPlayers: RULES.minPlayers,
      maxPlayers: RULES.maxPlayers,
    },
  };
}
