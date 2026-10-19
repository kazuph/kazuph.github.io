import { QUESTIONS, TOTAL_QUESTIONS, type Question } from "./questions.js";

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const BUZZ_WINDOW_MS = 20_000; // 問題提示から早押し受付の締め切り
export const ANSWER_WINDOW_MS = 10_000; // 回答権を得てから選ぶまでの制限
export const REVEAL_MS = 4_000; // 正解発表を見せる時間
export const CORRECT_POINTS = 10;
export const WRONG_POINTS = -5;

export type Phase = "lobby" | "question" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  lockedOut: boolean; // この問題で既に不正解（または回答権を失った）か
  choice: number | null; // この問題で選んだ選択肢
}

export interface RoomState {
  code: string;
  phase: Phase;
  hostId: string | null;
  players: Player[];
  questionIndex: number; // 0始まり
  answeringPlayerId: string | null;
  buzzDeadline: number | null; // 早押し受付の締め切り（絶対時刻 ms）
  answerDeadline: number | null; // 回答の締め切り（絶対時刻 ms）
  revealDeadline: number | null;
  correctChoice: number | null; // reveal 中のみ公開
  lastEvent: LastEvent | null;
}

export interface LastEvent {
  kind: "buzzed" | "answered" | "timeout" | "reveal" | "started" | "finished";
  playerId?: string;
  playerName?: string;
  correct?: boolean;
  points?: number;
  at: number;
}

export interface JoinResult {
  ok: boolean;
  reason?: string;
  playerId?: string;
}

export function emptyState(code: string): RoomState {
  return {
    code,
    phase: "lobby",
    hostId: null,
    players: [],
    questionIndex: 0,
    answeringPlayerId: null,
    buzzDeadline: null,
    answerDeadline: null,
    revealDeadline: null,
    correctChoice: null,
    lastEvent: null,
  };
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** クライアントへ送る安全な状態。正解情報は reveal まで含まれない。 */
export interface QuestionView {
  text: string;
  choices: readonly string[];
}

export interface RoomView extends RoomState {
  totalQuestions: number;
  question: QuestionView | null;
}

/**
 * サーバー権威のゲームエンジン。すべての時刻は引数 `now`（ms）で渡すので
 * テストでは時間を自由に進められる。乱数・外部I/Oは一切使わない。
 */
export class QuizGame {
  state: RoomState;

  constructor(state: RoomState) {
    this.state = state;
  }

  static fromJSON(raw: unknown, code: string): QuizGame {
    const state = raw && typeof raw === "object" ? (raw as RoomState) : emptyState(code);
    state.code = code;
    // 古い保存データに欠けたフィールドがあっても壊れないように補完する。
    const base = emptyState(code);
    return new QuizGame({ ...base, ...state });
  }

  toJSON(): RoomState {
    return clone(this.state);
  }

  /** クライアント向けのビュー。正解の選択肢番号は reveal 中だけ入る。 */
  view(): RoomView {
    const q = this.question();
    return {
      ...clone(this.state),
      totalQuestions: TOTAL_QUESTIONS,
      question: q ? { text: q.text, choices: q.choices } : null,
    };
  }

  get players(): Player[] {
    return this.state.players;
  }

  find(id: string | null): Player | undefined {
    if (!id) return undefined;
    return this.state.players.find((p) => p.id === id);
  }

  question(): Question | null {
    if (this.state.phase === "lobby" || this.state.phase === "finished") return null;
    return QUESTIONS[this.state.questionIndex] ?? null;
  }

  /** 途中参加・復帰を含む入室処理。 */
  join(id: string, name: string, now: number): JoinResult {
    const existing = this.find(id);
    if (existing) {
      existing.connected = true;
      if (name && name !== existing.name) existing.name = name;
      return { ok: true, playerId: id };
    }
    if (this.state.phase !== "lobby") {
      return { ok: false, reason: "この部屋はゲームが始まっています。新しいプレイヤーは参加できません。" };
    }
    if (this.state.players.length >= MAX_PLAYERS) {
      return { ok: false, reason: `部屋が満員です（定員${MAX_PLAYERS}人）。` };
    }
    const player: Player = {
      id,
      name: name || `プレイヤー${this.state.players.length + 1}`,
      score: 0,
      connected: true,
      lockedOut: false,
      choice: null,
    };
    this.state.players.push(player);
    if (!this.state.hostId) this.state.hostId = id;
    this.state.lastEvent = { kind: "started", playerId: id, playerName: player.name, at: now };
    return { ok: true, playerId: id };
  }

  setConnected(id: string, connected: boolean, now: number): void {
    const p = this.find(id);
    if (p) p.connected = connected;
    void now;
  }

  /** ロビー中に切断したプレイヤーは枠を空ける。ゲーム中は復帰用に残す。 */
  leaveLobby(id: string): void {
    if (this.state.phase !== "lobby") return;
    this.state.players = this.state.players.filter((p) => p.id !== id);
    if (this.state.hostId === id) {
      this.state.hostId = this.state.players[0]?.id ?? null;
    }
  }

  canStart(): boolean {
    return (
      this.state.phase === "lobby" &&
      this.state.players.length >= MIN_PLAYERS &&
      this.state.players.length <= MAX_PLAYERS
    );
  }

  start(byId: string, now: number): { ok: boolean; reason?: string } {
    if (this.state.phase !== "lobby") return { ok: false, reason: "すでに開始しています。" };
    if (byId !== this.state.hostId) return { ok: false, reason: "開始できるのはホストだけです。" };
    if (this.state.players.length < MIN_PLAYERS) return { ok: false, reason: `開始には${MIN_PLAYERS}人以上必要です。` };
    if (this.state.players.length > MAX_PLAYERS) return { ok: false, reason: `定員は${MAX_PLAYERS}人です。` };
    this.beginQuestion(0, now);
    return { ok: true };
  }

  private beginQuestion(index: number, now: number): void {
    this.state.questionIndex = index;
    this.state.phase = "question";
    this.state.answeringPlayerId = null;
    this.state.answerDeadline = null;
    this.state.revealDeadline = null;
    this.state.correctChoice = null;
    this.state.buzzDeadline = now + BUZZ_WINDOW_MS;
    for (const p of this.state.players) {
      p.lockedOut = false;
      p.choice = null;
    }
    this.state.lastEvent = { kind: "started", at: now };
  }

  /** 早押し。サーバーが最初に受け取った1人だけが回答権を得る。 */
  buzz(id: string, now: number): { ok: boolean; reason?: string } {
    const p = this.find(id);
    if (!p) return { ok: false, reason: "参加者ではありません。" };
    if (p.lockedOut) return { ok: false, reason: "この問題ではもう押せません。" };
    if (this.state.answeringPlayerId) return { ok: false, reason: "他の人が回答中です。" };
    if (this.state.phase !== "question") return { ok: false, reason: "今は押せません。" };
    this.state.answeringPlayerId = id;
    this.state.phase = "answering";
    this.state.answerDeadline = now + ANSWER_WINDOW_MS;
    this.state.lastEvent = { kind: "buzzed", playerId: id, playerName: p.name, at: now };
    return { ok: true };
  }

  /** 回答。サーバー側で正誤判定して加点する。 */
  answer(id: string, choice: number, now: number): { ok: boolean; reason?: string } {
    const p = this.find(id);
    if (!p) return { ok: false, reason: "参加者ではありません。" };
    if (this.state.phase !== "answering" || this.state.answeringPlayerId !== id) {
      return { ok: false, reason: "回答権がありません。" };
    }
    const q = this.question();
    if (!q) return { ok: false, reason: "問題がありません。" };
    if (choice < 0 || choice > 3 || !Number.isInteger(choice)) {
      return { ok: false, reason: "選択肢が不正です。" };
    }
    const correct = choice === q.correct;
    p.choice = choice;
    p.lockedOut = true;
    p.score += correct ? CORRECT_POINTS : WRONG_POINTS;
    this.state.answeringPlayerId = null;
    this.state.answerDeadline = null;
    this.state.lastEvent = {
      kind: "answered",
      playerId: id,
      playerName: p.name,
      correct,
      points: correct ? CORRECT_POINTS : WRONG_POINTS,
      at: now,
    };
    this.resumeOrReveal(now);
    return { ok: true };
  }

  /** 回答後に早押しを再開できるなら再開し、できなければ正解発表へ。 */
  private resumeOrReveal(now: number): void {
    const elig = this.state.players.filter((p) => !p.lockedOut);
    const buzzEnd = this.state.buzzDeadline ?? 0;
    if (elig.length > 0 && now < buzzEnd) {
      this.state.phase = "question";
      return;
    }
    this.reveal(now);
  }

  private reveal(now: number): void {
    const q = this.question();
    this.state.phase = "reveal";
    this.state.answeringPlayerId = null;
    this.state.answerDeadline = null;
    this.state.correctChoice = q ? q.correct : null;
    this.state.revealDeadline = now + REVEAL_MS;
    this.state.lastEvent = { kind: "reveal", at: now };
  }

  private finish(now: number): void {
    this.state.phase = "finished";
    this.state.answeringPlayerId = null;
    this.state.buzzDeadline = null;
    this.state.answerDeadline = null;
    this.state.revealDeadline = null;
    this.state.lastEvent = { kind: "finished", at: now };
  }

  /** 次の自動遷移が起きる絶対時刻。なければ null。 */
  nextDeadline(): number | null {
    switch (this.state.phase) {
      case "question":
        return this.state.buzzDeadline;
      case "answering":
        return this.state.answerDeadline;
      case "reveal":
        return this.state.revealDeadline;
      default:
        return null;
    }
  }

  /** アラームなどで時間を進めたときの状態遷移。1回につき最大1遷移。 */
  advance(now: number): void {
    const s = this.state;
    if (s.phase === "question") {
      if (s.buzzDeadline !== null && now >= s.buzzDeadline) {
        s.lastEvent = { kind: "timeout", at: now };
        this.reveal(now);
      }
      return;
    }
    if (s.phase === "answering") {
      if (s.answerDeadline !== null && now >= s.answerDeadline) {
        const p = this.find(s.answeringPlayerId);
        if (p) {
          p.lockedOut = true;
          p.choice = null;
        }
        s.answeringPlayerId = null;
        s.answerDeadline = null;
        s.lastEvent = { kind: "timeout", playerId: p?.id, playerName: p?.name, at: now };
        this.resumeOrReveal(now);
      }
      return;
    }
    if (s.phase === "reveal") {
      if (s.revealDeadline !== null && now >= s.revealDeadline) {
        const next = s.questionIndex + 1;
        if (next < TOTAL_QUESTIONS) this.beginQuestion(next, now);
        else this.finish(now);
      }
    }
  }

  /** 再戦: スコアをリセットしてロビーに戻す。 */
  resetToLobby(now: number): void {
    this.state.phase = "lobby";
    this.state.questionIndex = 0;
    this.state.answeringPlayerId = null;
    this.state.buzzDeadline = null;
    this.state.answerDeadline = null;
    this.state.revealDeadline = null;
    this.state.correctChoice = null;
    for (const p of this.state.players) {
      p.score = 0;
      p.lockedOut = false;
      p.choice = null;
    }
    this.state.players = this.state.players.filter((p) => p.connected);
    if (!this.find(this.state.hostId)) this.state.hostId = this.state.players[0]?.id ?? null;
    this.state.lastEvent = { kind: "started", at: now };
  }

  /** ランキング（得点降順、同点は参加順）。 */
  ranking(): Player[] {
    return [...this.state.players].sort((a, b) => b.score - a.score);
  }
}
