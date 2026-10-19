/**
 * ゲームの規則だけを書いた純粋関数モジュール。
 * すべての関数は時刻 now を引数で受け取り、引数の state を書き換えずに新しい state を返す。
 * 正誤判定・点数・早押しの順番はすべてここで決まる。
 */

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const QUESTION_MS = 20_000;
export const ANSWER_MS = 10_000;
export const REVEAL_MS = 3_000;
export const QUESTION_COUNT = 10;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  seat: number;
  score: number;
  connected: boolean;
}

export interface GameState {
  code: string;
  phase: Phase;
  hostId: string;
  players: Player[];
  /** 出題する問題の、QUESTIONS 配列での添字 */
  questionIndices: number[];
  /** 出題する問題の正解の添字（questionIndices と対応） */
  correctChoices: number[];
  /** 現在の問題（0始まり）。ロビーでは -1 */
  questionIndex: number;
  questionStartedAt: number;
  /** 出題時刻 + 20秒。この問題の締め切り */
  deadline: number;
  answeringPlayerId: string | null;
  answerDeadline: number | null;
  /** この問題で失格（=押せない）プレイヤーの id */
  eliminated: string[];
  revealUntil: number | null;
}

export interface Ranked {
  id: string;
  name: string;
  score: number;
  rank: number;
}

export function createState(code: string, hostId: string, hostName: string): GameState {
  return {
    code,
    phase: "lobby",
    hostId,
    players: [{ id: hostId, name: hostName, seat: 1, score: 0, connected: false }],
    questionIndices: [],
    correctChoices: [],
    questionIndex: -1,
    questionStartedAt: 0,
    deadline: 0,
    answeringPlayerId: null,
    answerDeadline: null,
    eliminated: [],
    revealUntil: null,
  };
}

export function addPlayer(state: GameState, playerId: string, playerName: string): { state: GameState; error?: string } {
  if (state.phase !== "lobby") return { state, error: "ゲームはもう始まっています" };
  if (state.players.length >= MAX_PLAYERS) return { state, error: "満員です（4人まで）" };
  const player: Player = { id: playerId, name: playerName, seat: state.players.length + 1, score: 0, connected: false };
  return { state: { ...state, players: [...state.players, player] } };
}

export function setConnected(state: GameState, playerId: string, connected: boolean): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, connected } : p)),
  };
}

export function startGame(
  state: GameState,
  playerId: string,
  now: number,
  questionIndices: number[],
  correctChoices: number[]
): { state: GameState; error?: string } {
  if (state.phase !== "lobby") return { state, error: "ゲームはもう始まっています" };
  if (playerId !== state.hostId) return { state, error: "ホストだけが開始できます" };
  if (state.players.length < MIN_PLAYERS) return { state, error: "開始できるのは2人以上のときです" };
  if (state.players.length > MAX_PLAYERS) return { state, error: "4人を超えて開始できません" };
  return {
    state: {
      ...state,
      phase: "question",
      questionIndices,
      correctChoices,
      questionIndex: 0,
      questionStartedAt: now,
      deadline: now + QUESTION_MS,
      answeringPlayerId: null,
      answerDeadline: null,
      eliminated: [],
      revealUntil: null,
    },
  };
}

/**
 * 締め切りを過ぎた処理をまとめて進める。メッセージを受けたときも Alarm のときも、
 * まず tick を通してから入力を処理する。
 */
export function tick(state: GameState, now: number): GameState {
  let s = state;
  for (;;) {
    if (s.phase === "question" && now >= s.deadline) {
      // 誰も答えなくても（回答中でも）問題の締め切りで正解表示へ
      s = {
        ...s,
        phase: "reveal",
        revealUntil: now + REVEAL_MS,
        answeringPlayerId: null,
        answerDeadline: null,
        eliminated: [],
      };
      continue;
    }
    if (s.phase === "answering") {
      const dl = Math.min(s.deadline, s.answerDeadline ?? s.deadline);
      if (now >= dl) {
        // 回答が来ないまま10秒切れ：-5点で失格。残っていれば早押しを再開する
        s = {
          ...s,
          players: s.players.map((p) => (p.id === s.answeringPlayerId ? { ...p, score: p.score - 5 } : p)),
          eliminated: [...s.eliminated, s.answeringPlayerId ?? ""],
        };
        s = afterMiss(s, now);
        continue;
      }
    }
    if (s.phase === "reveal" && now >= (s.revealUntil ?? 0)) {
      s = advance(s, now);
      continue;
    }
    return s;
  }
}

/** 不正解のあとの遷移。失格していない人が残っていて問題の締め切り前なら早押しを再開する */
function afterMiss(state: GameState, now: number): GameState {
  const remaining = state.players.some((p) => !state.eliminated.includes(p.id));
  if (remaining && now < state.deadline) {
    return { ...state, phase: "question", answeringPlayerId: null, answerDeadline: null };
  }
  return {
    ...state,
    phase: "reveal",
    revealUntil: now + REVEAL_MS,
    answeringPlayerId: null,
    answerDeadline: null,
    eliminated: [],
  };
}

/** 正解表示の3秒が過ぎたら次の問題へ。10問目のあとは finished */
function advance(state: GameState, now: number): GameState {
  const next = state.questionIndex + 1;
  if (next >= state.questionIndices.length) {
    return { ...state, phase: "finished", revealUntil: null };
  }
  return {
    ...state,
    phase: "question",
    questionIndex: next,
    questionStartedAt: now,
    deadline: now + QUESTION_MS,
    answeringPlayerId: null,
    answerDeadline: null,
    eliminated: [],
    revealUntil: null,
  };
}

export function buzz(
  state: GameState,
  playerId: string,
  q: number,
  now: number
): { state: GameState; error?: string } {
  const s = tick(state, now);
  if (!s.players.some((p) => p.id === playerId)) return { state: s, error: "参加者ではありません" };
  if (s.phase !== "question") return { state: s, error: "今は早押しできません" };
  if (q !== s.questionIndex) return { state: s, error: "古い問題の早押しは無効です" };
  if (s.eliminated.includes(playerId)) return { state: s, error: "この問題は回答済みです" };
  // サーバーが最初に受け取った1人だけが回答権を得る
  return {
    state: {
      ...s,
      phase: "answering",
      answeringPlayerId: playerId,
      answerDeadline: now + ANSWER_MS,
    },
  };
}

export function submitAnswer(
  state: GameState,
  playerId: string,
  q: number,
  choice: number,
  now: number
): { state: GameState; error?: string; correct?: boolean } {
  const s = tick(state, now);
  if (!s.players.some((p) => p.id === playerId)) return { state: s, error: "参加者ではありません" };
  if (s.phase !== "answering" || s.answeringPlayerId !== playerId || q !== s.questionIndex) {
    return { state: s, error: "回答できません" };
  }
  if (typeof choice !== "number" || choice < 0 || choice > 3) {
    return { state: s, error: "選択肢が不正です" };
  }
  const isCorrect = choice === s.correctChoices[s.questionIndex];
  if (isCorrect) {
    return {
      state: {
        ...s,
        players: s.players.map((p) => (p.id === playerId ? { ...p, score: p.score + 10 } : p)),
        phase: "reveal",
        revealUntil: now + REVEAL_MS,
        answeringPlayerId: null,
        answerDeadline: null,
        eliminated: [],
      },
      correct: true,
    };
  }
  // 不正解: -5点でこの問題は失格
  const next: GameState = {
    ...s,
    players: s.players.map((p) => (p.id === playerId ? { ...p, score: p.score - 5 } : p)),
    eliminated: [...s.eliminated, playerId],
  };
  return { state: afterMiss(next, now), correct: false };
}

/** 次に訪れる締め切り。Alarm はここで決まる時刻を1つだけ予約する */
export function nextDeadline(state: GameState): number | null {
  switch (state.phase) {
    case "question":
      return state.deadline;
    case "answering":
      return Math.min(state.deadline, state.answerDeadline ?? state.deadline);
    case "reveal":
      return state.revealUntil;
    default:
      return null;
  }
}

/** 同点は同じ順位（より高い点の人数 + 1） */
export function ranking(state: GameState): Ranked[] {
  return [...state.players]
    .sort((a, b) => b.score - a.score || a.seat - b.seat)
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      rank: state.players.filter((x) => x.score > p.score).length + 1,
    }));
}

export interface PublicPlayer {
  id: string;
  name: string;
  seat: number;
  score: number;
  connected: boolean;
}

export interface PublicState {
  t: "state";
  code: string;
  phase: Phase;
  you: string;
  hostId: string;
  serverNow: number;
  players: PublicPlayer[];
  questionIndex: number;
  questionCount: number;
  question: { text: string; choices: string[] } | null;
  /** 出題中・回答中は送らない。正解表示のときだけ入る */
  correct: number | null;
  answeringPlayerId: string | null;
  eliminated: string[];
  deadline: number | null;
  answerDeadline: number | null;
  revealUntil: number | null;
  ranking: Ranked[];
}

/** ブラウザへ送る全量の状態。正解は reveal のときだけ、token は絶対に送らない */
export function publicState(
  state: GameState,
  you: string,
  serverNow: number,
  questions: { text: string; choices: string[] }[]
): PublicState {
  const inGame = state.phase === "question" || state.phase === "answering" || state.phase === "reveal";
  const q = inGame ? questions[state.questionIndices[state.questionIndex]] : null;
  return {
    t: "state",
    code: state.code,
    phase: state.phase,
    you,
    hostId: state.hostId,
    serverNow,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      score: p.score,
      connected: p.connected,
    })),
    questionIndex: inGame ? state.questionIndex : -1,
    questionCount: state.questionIndices.length || QUESTION_COUNT,
    question: q ? { text: q.text, choices: [...q.choices] } : null,
    correct: state.phase === "reveal" ? state.correctChoices[state.questionIndex] ?? null : null,
    answeringPlayerId: state.answeringPlayerId,
    eliminated: state.phase === "reveal" ? [] : [...state.eliminated],
    deadline: state.phase === "question" ? state.deadline : null,
    answerDeadline: state.phase === "answering" ? state.answerDeadline : null,
    revealUntil: state.phase === "reveal" ? state.revealUntil : null,
    ranking: ranking(state),
  };
}
