import { QUESTIONS, type Question } from "./questions";

export type Phase = "lobby" | "buzz" | "answering" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  locked: boolean;
  isHost: boolean;
}

export interface PublicState {
  roomCode: string;
  phase: Phase;
  players: PublicPlayer[];
  hostId: string;
  qIndex: number; // 0-based, -1 in lobby
  totalQ: number;
  question: { text: string; choices: string[] } | null;
  answeringId: string | null;
  answeringName: string | null;
  lockedIds: string[];
  deadlineQ: number | null;
  deadlineA: number | null;
  revealUntil: number | null;
  correctIndex: number | null; // reveal/finished のときのみ
  lastResult: { playerId: string; playerName: string; choice: number; correct: boolean; timedOut?: boolean } | null;
  revealReason: string | null;
  rankings: { id: string; name: string; score: number }[] | null;
  now: number;
}

export const QUESTION_MS = 20_000;
export const ANSWER_MS = 10_000;
export const REVEAL_MS = 3_000;
export const MAX_PLAYERS = 4;

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export class QuizRoom {
  roomCode: string;
  players = new Map<string, Player>();
  hostId = "";
  phase: Phase = "lobby";
  qIndex = -1;
  questions: Question[] = [];
  buzzWinnerId: string | null = null;
  locked = new Set<string>();
  deadlineQ: number | null = null;
  deadlineA: number | null = null;
  revealUntil: number | null = null;
  revealReason: string | null = null;
  lastResult: PublicState["lastResult"] = null;

  constructor(roomCode: string, questions: Question[] = QUESTIONS) {
    this.roomCode = roomCode;
    this.questions = questions.slice(0, 10);
  }

  get totalQ(): number {
    return this.questions.length;
  }

  playerCount(): number {
    return this.players.size;
  }

  /** 参加（新規 or 復帰）。失敗時は Error を投げる。UIが理由を表示する。 */
  join(name: string, playerId: string | null, now: number): { player: Player; isNew: boolean } {
    void now;
    const clean = (name ?? "").trim().slice(0, 20) || "ななし";
    if (playerId && this.players.has(playerId)) {
      const p = this.players.get(playerId)!;
      p.connected = true;
      if (clean && clean !== p.name) {
        // 名前は維持（なりすまし防止のため上書きしない）
      }
      return { player: p, isNew: false };
    }
    if (this.phase !== "lobby") {
      throw new Error("ゲーム開始後の途中参加はできません");
    }
    if (this.players.size >= MAX_PLAYERS) {
      throw new Error("この部屋は満員です（定員4人）");
    }
    const id = playerId || makeId();
    if (this.players.has(id)) {
      throw new Error("IDが重複しています。もう一度お試しください");
    }
    const p: Player = { id, name: clean, score: 0, connected: true };
    this.players.set(id, p);
    if (!this.hostId) this.hostId = id;
    return { player: p, isNew: true };
  }

  disconnect(playerId: string): void {
    const p = this.players.get(playerId);
    if (p) p.connected = false;
  }

  start(hostId: string, now: number): void {
    if (this.phase !== "lobby") throw new Error("ゲームは既に開始しています");
    if (hostId !== this.hostId) throw new Error("ホストだけが開始できます");
    const n = this.players.size;
    if (n < 2 || n > MAX_PLAYERS) throw new Error("開始できるのは2〜4人のときです");
    this.lastResult = null;
    this.qIndex = 0;
    this.startQuestion(now);
  }

  private startQuestion(now: number): void {
    this.phase = "buzz";
    this.buzzWinnerId = null;
    this.locked.clear();
    this.deadlineQ = now + QUESTION_MS;
    this.deadlineA = null;
    this.revealUntil = null;
    this.revealReason = null;
    this.lastResult = null;
  }

  /** 早押し。true=回答権獲得、false=獲得ならず。順番はサーバー到着順（この関数呼び出し順）。 */
  buzz(playerId: string, now: number): boolean {
    if (this.phase !== "buzz") return false;
    if (this.deadlineQ !== null && now > this.deadlineQ) {
      this.toReveal(now, "時間切れ（20秒経過）");
      return false;
    }
    const p = this.players.get(playerId);
    if (!p) return false;
    if (this.locked.has(playerId)) return false;
    // サーバーが最初に受け取った1人だけ
    this.phase = "answering";
    this.buzzWinnerId = playerId;
    this.deadlineA = now + ANSWER_MS;
    return true;
  }

  /** 回答。サーバー側で正誤判定・加減点する。 */
  answer(playerId: string, choice: number, now: number): { correct: boolean } {
    if (this.phase !== "answering" || this.buzzWinnerId !== playerId) {
      throw new Error("いまは回答できません");
    }
    const q = this.questions[this.qIndex];
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.choices.length) {
      throw new Error("選択肢が不正です");
    }
    if (this.deadlineA !== null && now > this.deadlineA) {
      this.applyMiss(playerId, now, true);
      return { correct: false };
    }
    const p = this.players.get(playerId)!;
    if (choice === q.answer) {
      p.score += 10;
      this.lastResult = { playerId, playerName: p.name, choice, correct: true };
      this.toReveal(now, `${p.name} が正解！ +10点`);
      return { correct: true };
    }
    this.applyMiss(playerId, now, false, choice);
    return { correct: false };
  }

  private applyMiss(playerId: string, now: number, timedOut: boolean, choice = -1): void {
    const p = this.players.get(playerId)!;
    p.score -= 5;
    this.locked.add(playerId);
    this.buzzWinnerId = null;
    this.deadlineA = null;
    if (timedOut) {
      this.lastResult = { playerId, playerName: p.name, choice, correct: false, timedOut: true };
    } else {
      this.lastResult = { playerId, playerName: p.name, choice, correct: false };
    }
    if (this.locked.size >= this.players.size) {
      this.toReveal(now, "全員が回答済み");
    } else {
      // 残りの人で早押し再開（問題全体の20秒制限は継続）
      if (this.deadlineQ !== null && now >= this.deadlineQ) {
        this.toReveal(now, "時間切れ（20秒経過）");
      } else {
        this.phase = "buzz";
        this.revealReason = `${p.name} は不正解…残りの人で早押し再開`;
      }
    }
  }

  /** タイムアウト等の時間遷移。true=変化あり。 */
  tick(now: number): boolean {
    if (this.phase === "buzz" && this.deadlineQ !== null && now >= this.deadlineQ) {
      this.toReveal(now, "時間切れ（20秒経過）");
      return true;
    }
    if (this.phase === "answering") {
      if (this.deadlineA !== null && now >= this.deadlineA) {
        const id = this.buzzWinnerId!;
        this.applyMiss(id, now, true);
        return true;
      }
      if (this.deadlineQ !== null && now >= this.deadlineQ && this.deadlineA !== null && now >= this.deadlineA) {
        // 念のため（通常は deadlineA が先に来る）
      }
    }
    if (this.phase === "reveal" && this.revealUntil !== null && now >= this.revealUntil) {
      this.advance(now);
      return true;
    }
    return false;
  }

  private toReveal(now: number, reason: string): void {
    this.phase = "reveal";
    this.revealUntil = now + REVEAL_MS;
    this.revealReason = reason;
    this.buzzWinnerId = null;
    this.deadlineA = null;
  }

  private advance(now: number): void {
    if (this.qIndex + 1 >= this.totalQ) {
      this.phase = "finished";
      this.revealUntil = null;
      this.deadlineQ = null;
      this.deadlineA = null;
      this.buzzWinnerId = null;
    } else {
      this.qIndex += 1;
      this.startQuestion(now);
    }
  }

  rankings(): { id: string; name: string; score: number }[] {
    return [...this.players.values()]
      .map((p) => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }

  publicState(now: number): PublicState {
    const showAnswer = this.phase === "reveal" || this.phase === "finished";
    // finished のときは最後の問題の正解を見せる
    const qi = this.qIndex >= 0 ? this.questions[this.qIndex] : null;
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: p.connected,
        locked: this.locked.has(p.id),
        isHost: p.id === this.hostId,
      })),
      hostId: this.hostId,
      qIndex: this.qIndex,
      totalQ: this.totalQ,
      question:
        qi && this.phase !== "lobby"
          ? { text: qi.q, choices: qi.choices.slice() }
          : null,
      answeringId: this.phase === "answering" ? this.buzzWinnerId : null,
      answeringName:
        this.phase === "answering" && this.buzzWinnerId
          ? (this.players.get(this.buzzWinnerId)?.name ?? null)
          : null,
      lockedIds: [...this.locked],
      deadlineQ: this.deadlineQ,
      deadlineA: this.phase === "answering" ? this.deadlineA : null,
      revealUntil: this.revealUntil,
      correctIndex: showAnswer && qi ? qi.answer : null,
      lastResult: this.lastResult,
      revealReason: this.revealReason,
      rankings: this.phase === "finished" ? this.rankings() : null,
      now,
    };
  }

  /** DO永続化用スナップショット */
  snapshot(): string {
    return JSON.stringify({
      roomCode: this.roomCode,
      players: [...this.players.values()],
      hostId: this.hostId,
      phase: this.phase,
      qIndex: this.qIndex,
      buzzWinnerId: this.buzzWinnerId,
      locked: [...this.locked],
      deadlineQ: this.deadlineQ,
      deadlineA: this.deadlineA,
      revealUntil: this.revealUntil,
      revealReason: this.revealReason,
      lastResult: this.lastResult,
    });
  }

  static restore(json: string, questions: Question[] = QUESTIONS): QuizRoom {
    const s = JSON.parse(json);
    const r = new QuizRoom(s.roomCode, questions);
    r.players = new Map((s.players as Player[]).map((p) => [p.id, p]));
    r.hostId = s.hostId;
    r.phase = s.phase;
    r.qIndex = s.qIndex;
    r.buzzWinnerId = s.buzzWinnerId;
    r.locked = new Set(s.locked);
    r.deadlineQ = s.deadlineQ;
    r.deadlineA = s.deadlineA;
    r.revealUntil = s.revealUntil;
    r.revealReason = s.revealReason;
    r.lastResult = s.lastResult;
    return r;
  }
}
