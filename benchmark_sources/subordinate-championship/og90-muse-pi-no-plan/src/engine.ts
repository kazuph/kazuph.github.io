import { QUESTIONS } from "./questions.js";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOTAL_QUESTIONS = QUESTIONS.length; // 10
export const QUESTION_TIME_MS = 20_000;
export const ANSWER_TIME_MS = 10_000;
export const REVEAL_TIME_MS = 3_000;
export const SCORE_CORRECT = 10;
export const SCORE_WRONG = -5;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  token: string;
  score: number;
  connected: boolean;
  isHost: boolean;
}

export interface LastResult {
  kind:
    | "correct" // 正解
    | "wrong" // 不正解
    | "timeout-answer" // 回答時間切れ
    | "timeout-question" // 出題時間切れ（誰も押さなかった等）
    | "reveal"; // 全員押せなくなった
  playerId?: string;
  playerName?: string;
  choice?: number;
  correctIndex?: number;
}

export interface RoomSnapshot {
  code: string;
  phase: Phase;
  players: Player[];
  questionIndex: number; // 0-based。finished時は TOTAL_QUESTIONS
  totalQuestions: number;
  lockedOut: string[]; // この問題で押せなくなった playerId
  buzzWinnerId: string | null; // answering中の回答者
  questionEndsAt: number | null;
  answerEndsAt: number | null;
  revealEndsAt: number | null;
  lastResult: LastResult | null;
  questionCounter: number; // 出題回数（再送検出用）
}

export interface PublicQuestion {
  text: string;
  choices: [string, string, string, string];
}

/** クライアントに送る公開ステート（正解は reveal/finished のみ含む） */
export interface PublicState {
  code: string;
  phase: Phase;
  players: { id: string; name: string; score: number; connected: boolean; isHost: boolean }[];
  questionIndex: number;
  totalQuestions: number;
  question: PublicQuestion | null;
  correctIndex: number | null;
  buzzWinnerId: string | null;
  buzzWinnerName: string | null;
  lockedOut: string[];
  questionEndsAt: number | null;
  answerEndsAt: number | null;
  revealEndsAt: number | null;
  serverNow: number;
  lastResult: LastResult | null;
  questionCounter: number;
  ranking: { id: string; name: string; score: number }[] | null;
}

export type EngineError =
  | "ROOM_FULL"
  | "NAME_TAKEN"
  | "GAME_STARTED"
  | "NOT_HOST"
  | "NEED_2_TO_4_PLAYERS"
  | "ALREADY_STARTED"
  | "NOT_QUESTION_PHASE"
  | "LOCKED_OUT"
  | "NOT_YOUR_TURN"
  | "BAD_CHOICE"
  | "UNKNOWN_PLAYER";

export function engineErrorMessage(code: EngineError): string {
  switch (code) {
    case "ROOM_FULL":
      return "この部屋は定員4人に達しています。別の部屋に入ってください。";
    case "NAME_TAKEN":
      return "その名前はこの部屋で使われています。別の名前を入力してください。";
    case "GAME_STARTED":
      return "この部屋はゲーム開始後のため参加できません。";
    case "NOT_HOST":
      return "開始できるのはホスト（部屋を作った人）だけです。";
    case "NEED_2_TO_4_PLAYERS":
      return "開始できるのは2〜4人のときだけです。";
    case "ALREADY_STARTED":
      return "ゲームはすでに始まっています。";
    case "NOT_QUESTION_PHASE":
      return "今は早押しできません。";
    case "LOCKED_OUT":
      return "あなたはこの問題ではもう押せません。";
    case "NOT_YOUR_TURN":
      return "回答権がありません。";
    case "BAD_CHOICE":
      return "選択肢が不正です。";
    case "UNKNOWN_PLAYER":
      return "プレイヤーが見つかりません。再参加してください。";
  }
}

let idCounter = 0;
export function makeId(prefix = "p"): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function makeToken(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createInitialSnapshot(code: string): RoomSnapshot {
  return {
    code,
    phase: "lobby",
    players: [],
    questionIndex: 0,
    totalQuestions: TOTAL_QUESTIONS,
    lockedOut: [],
    buzzWinnerId: null,
    questionEndsAt: null,
    answerEndsAt: null,
    revealEndsAt: null,
    lastResult: null,
    questionCounter: 0,
  };
}

export class RoomEngine {
  state: RoomSnapshot;

  constructor(snapshot?: RoomSnapshot, code = "") {
    this.state = snapshot ?? createInitialSnapshot(code);
  }

  get phase(): Phase {
    return this.state.phase;
  }

  findByToken(token: string): Player | undefined {
    return this.state.players.find((p) => p.token === token);
  }

  findById(id: string): Player | undefined {
    return this.state.players.find((p) => p.id === id);
  }

  /** 参加（新規 or トークンによる復帰）。復帰時は score を保持する。 */
  join(name: string, token?: string): { player: Player; isRejoin: boolean } | { error: EngineError } {
    const clean = (name ?? "").trim().slice(0, 20);
    if (token) {
      const existing = this.findByToken(token);
      if (existing) {
        existing.connected = true;
        if (clean && clean !== existing.name) {
          // 同じトークンの名前変更は許可（なりすまし防止のため名前重複チェック）
          const clash = this.state.players.some((p) => p.id !== existing.id && p.name === clean);
          if (!clash) existing.name = clean;
        }
        return { player: existing, isRejoin: true };
      }
    }
    if (!clean) return { error: "UNKNOWN_PLAYER" };
    if (this.state.phase !== "lobby") return { error: "GAME_STARTED" };
    if (this.state.players.length >= MAX_PLAYERS) return { error: "ROOM_FULL" };
    if (this.state.players.some((p) => p.name === clean)) return { error: "NAME_TAKEN" };
    const player: Player = {
      id: makeId("p"),
      name: clean,
      token: makeToken(),
      score: 0,
      connected: true,
      isHost: this.state.players.length === 0,
    };
    this.state.players.push(player);
    return { player, isRejoin: false };
  }

  setConnected(playerId: string, connected: boolean): void {
    const p = this.findById(playerId);
    if (p) p.connected = connected;
  }

  removePlayer(playerId: string): boolean {
    // ロビー中の離脱のみ削除可。ゲーム中はスコア保持のため残す。
    if (this.state.phase !== "lobby") {
      this.setConnected(playerId, false);
      return false;
    }
    const idx = this.state.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return false;
    const [removed] = this.state.players.splice(idx, 1);
    if (removed.isHost && this.state.players.length > 0) {
      this.state.players[0].isHost = true;
    }
    return true;
  }

  start(hostId: string, now: number): { error?: EngineError } {
    const host = this.findById(hostId);
    if (!host) return { error: "UNKNOWN_PLAYER" };
    if (!host.isHost) return { error: "NOT_HOST" };
    if (this.state.phase !== "lobby") return { error: "ALREADY_STARTED" };
    if (this.state.players.length < MIN_PLAYERS || this.state.players.length > MAX_PLAYERS) {
      return { error: "NEED_2_TO_4_PLAYERS" };
    }
    this.state.questionIndex = 0;
    this.state.lastResult = null;
    this.startQuestion(now);
    return {};
  }

  private startQuestion(now: number): void {
    this.state.phase = "question";
    this.state.lockedOut = [];
    this.state.buzzWinnerId = null;
    this.state.answerEndsAt = null;
    this.state.revealEndsAt = null;
    this.state.questionEndsAt = now + QUESTION_TIME_MS;
    this.state.questionCounter += 1;
    this.state.lastResult = null;
  }

  /** 早押し。サーバーが受け取った順に処理される前提で、先着1人だけが回答権を得る。 */
  buzz(playerId: string, now: number): { error?: EngineError; won?: boolean } {
    this.tick(now);
    if (this.state.phase !== "question") return { error: "NOT_QUESTION_PHASE" };
    const p = this.findById(playerId);
    if (!p) return { error: "UNKNOWN_PLAYER" };
    if (this.state.lockedOut.includes(playerId)) return { error: "LOCKED_OUT" };
    if (this.state.questionEndsAt !== null && now >= this.state.questionEndsAt) {
      this.tick(now);
      return { error: "NOT_QUESTION_PHASE" };
    }
    this.state.phase = "answering";
    this.state.buzzWinnerId = playerId;
    this.state.answerEndsAt = now + ANSWER_TIME_MS;
    return { won: true };
  }

  /** 回答。回答権を持つ本人のみ。正誤判定・点数はサーバーが決める。 */
  answer(playerId: string, choice: number, now: number): { error?: EngineError; correct?: boolean } {
    this.tick(now);
    if (this.state.phase !== "answering") return { error: "NOT_YOUR_TURN" };
    if (this.state.buzzWinnerId !== playerId) return { error: "NOT_YOUR_TURN" };
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return { error: "BAD_CHOICE" };
    const p = this.findById(playerId);
    if (!p) return { error: "UNKNOWN_PLAYER" };
    const q = QUESTIONS[this.state.questionIndex];
    if (!q) return { error: "NOT_YOUR_TURN" };
    if (choice === q.answer) {
      p.score += SCORE_CORRECT;
      this.enterReveal(
        now,
        { kind: "correct", playerId, playerName: p.name, choice, correctIndex: q.answer },
      );
      return { correct: true };
    }
    p.score += SCORE_WRONG;
    this.state.lockedOut.push(playerId);
    this.state.buzzWinnerId = null;
    this.state.answerEndsAt = null;
    if (this.state.lockedOut.length >= this.state.players.length) {
      this.enterReveal(
        now,
        { kind: "reveal", playerId, playerName: p.name, choice, correctIndex: q.answer },
      );
    } else {
      this.state.phase = "question";
      this.state.lastResult = {
        kind: "wrong",
        playerId,
        playerName: p.name,
        choice,
        correctIndex: undefined,
      };
    }
    return { correct: false };
  }

  private enterReveal(now: number, result: LastResult): void {
    this.state.phase = "reveal";
    this.state.buzzWinnerId = null;
    this.state.answerEndsAt = null;
    this.state.revealEndsAt = now + REVEAL_TIME_MS;
    this.state.lastResult = result;
  }

  /** タイマー進行。DOのalarmおよび各アクションの前処理から呼ぶ。 */
  tick(now: number): boolean {
    const s = this.state;
    if (s.phase === "answering" && s.answerEndsAt !== null && now >= s.answerEndsAt) {
      const winnerId = s.buzzWinnerId;
      const winner = winnerId ? this.findById(winnerId) : undefined;
      if (winnerId && !s.lockedOut.includes(winnerId)) s.lockedOut.push(winnerId);
      s.buzzWinnerId = null;
      s.answerEndsAt = null;
      if (s.lockedOut.length >= s.players.length) {
        const q = QUESTIONS[s.questionIndex];
        this.enterReveal(now, {
          kind: "reveal",
          playerId: winnerId ?? undefined,
          playerName: winner?.name,
          correctIndex: q?.answer,
        });
      } else {
        s.phase = "question";
        s.lastResult = {
          kind: "timeout-answer",
          playerId: winnerId ?? undefined,
          playerName: winner?.name,
        };
      }
      return true;
    }
    if (s.phase === "question" && s.questionEndsAt !== null && now >= s.questionEndsAt) {
      const q = QUESTIONS[s.questionIndex];
      this.enterReveal(now, { kind: "timeout-question", correctIndex: q?.answer });
      return true;
    }
    if (s.phase === "reveal" && s.revealEndsAt !== null && now >= s.revealEndsAt) {
      this.advance(now);
      return true;
    }
    return false;
  }

  private advance(now: number): void {
    const s = this.state;
    s.questionIndex += 1;
    s.revealEndsAt = null;
    if (s.questionIndex >= TOTAL_QUESTIONS) {
      s.phase = "finished";
      s.questionEndsAt = null;
      s.answerEndsAt = null;
      s.lockedOut = [];
      s.buzzWinnerId = null;
    } else {
      this.startQuestion(now);
    }
  }

  /** ホストが「もう一度遊ぶ」を押したとき（finished/lobbyに戻す）。 */
  resetToLobby(requesterId: string): { error?: EngineError } {
    const p = this.findById(requesterId);
    if (!p) return { error: "UNKNOWN_PLAYER" };
    if (!p.isHost) return { error: "NOT_HOST" };
    if (this.state.phase !== "finished") return { error: "ALREADY_STARTED" };
    for (const pl of this.state.players) pl.score = 0;
    this.state.questionIndex = 0;
    this.state.phase = "lobby";
    this.state.lockedOut = [];
    this.state.buzzWinnerId = null;
    this.state.questionEndsAt = null;
    this.state.answerEndsAt = null;
    this.state.revealEndsAt = null;
    this.state.lastResult = null;
    this.state.questionCounter += 1;
    return {};
  }

  /** 次に発火すべきタイマー時刻（alarm用）。なければ null。 */
  nextDeadline(): number | null {
    const s = this.state;
    if (s.phase === "answering" && s.answerEndsAt !== null) {
      // 回答タイマーを優先しつつ、出題タイマーが先ならそちらも考慮
      if (s.questionEndsAt !== null && s.questionEndsAt < s.answerEndsAt) return s.questionEndsAt;
      return s.answerEndsAt;
    }
    if (s.phase === "question") return s.questionEndsAt;
    if (s.phase === "reveal") return s.revealEndsAt;
    return null;
  }

  ranking(): { id: string; name: string; score: number }[] {
    return [...this.state.players]
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"))
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));
  }

  toPublic(now: number): PublicState {
    const s = this.state;
    const showAnswer = s.phase === "reveal" || s.phase === "finished";
    const q = s.questionIndex < TOTAL_QUESTIONS ? QUESTIONS[s.questionIndex] : null;
    const winner = s.buzzWinnerId ? this.findById(s.buzzWinnerId) : undefined;
    let correctIndex: number | null = null;
    if (showAnswer) {
      if (q) {
        if (s.lastResult?.correctIndex !== undefined) correctIndex = s.lastResult.correctIndex;
        else correctIndex = q.answer;
      } else if (s.phase === "finished" && s.lastResult?.correctIndex !== undefined) {
        // 最終問題の正解を結果画面でも参照できるようにする
        correctIndex = s.lastResult.correctIndex;
      }
    }
    return {
      code: s.code,
      phase: s.phase,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: p.connected,
        isHost: p.isHost,
      })),
      questionIndex: s.questionIndex,
      totalQuestions: s.totalQuestions,
      question:
        q && (s.phase === "question" || s.phase === "answering" || s.phase === "reveal")
          ? { text: q.text, choices: q.choices }
          : null,
      correctIndex,
      buzzWinnerId: s.phase === "answering" ? s.buzzWinnerId : null,
      buzzWinnerName: s.phase === "answering" ? (winner?.name ?? null) : null,
      lockedOut: [...s.lockedOut],
      questionEndsAt: s.questionEndsAt,
      answerEndsAt: s.answerEndsAt,
      revealEndsAt: s.revealEndsAt,
      serverNow: now,
      lastResult: s.lastResult,
      questionCounter: s.questionCounter,
      ranking: s.phase === "finished" ? this.ranking() : null,
    };
  }
}
