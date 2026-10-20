/**
 * ゲームロジック（純粋関数のみ / Durable Object から切り離してテスト可能）
 *
 * すべての判定（回答権の獲得・正誤・得点・順番）はこのモジュールが担い、
 * ブラウザからの申告（押した時刻・選んだ番号）は一切信用しない。
 */

import type { Player, RoomState } from './types';
import { QUESTIONS } from './questions';

export const MAX_PLAYERS = 4;
export const QUESTION_COUNT = 10;
/** 問題が出てから次の問題へ進むまでの時間 */
export const QUESTION_MS = 20_000;
/** 回答権を得た人が解答できる時間 */
export const ANSWER_MS = 10_000;
/** 正解したときの加点 */
export const SCORE_CORRECT = 10;
/** 不正解（時間切れを含む）ときの減点 */
export const SCORE_WRONG = -5;
/** 正解を表示してから次の問題へ進むまでの時間 */
export const REVEAL_MS = 2_500;
/** 不正解のフィードバックを表示してから早押しを再開するまでの時間 */
export const FEEDBACK_MS = 1_500;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; message: string };

export interface Notice {
  message: string;
}

export function createRoom(code: string, now: number): RoomState {
  return {
    code,
    players: [],
    hostId: null,
    phase: 'lobby',
    questionIndex: 0,
    questionStart: now,
    questionDeadline: now,
    answererId: null,
    answerDeadline: null,
    buzzQueue: [],
    correctIndex: null,
    nextAt: null,
    lastAnswererId: null,
    lastChoice: null,
    createdAt: now,
  };
}

export function findPlayer(room: RoomState, id: string): Player | undefined {
  return room.players.find((p) => p.id === id);
}

/**
 * 参加（新規）または再接続（既存トークン）。
 * - 定員 4 名を超える参加は拒否する（理由は画面に出る）
 * - ゲーム開始済みの部屋へ新しい参加はできない（既存トークンの再接続は可）
 */
export function joinRoom(room: RoomState, id: string, name: string, now: number): Result<Player> {
  const existing = findPlayer(room, id);
  if (existing) {
    existing.connected = true;
    if (name && existing.name !== name) existing.name = name;
    return { ok: true, value: existing };
  }
  if (room.players.length >= MAX_PLAYERS) {
    return { ok: false, error: 'room_full', message: `この部屋は定員${MAX_PLAYERS}人までです。現在${room.players.length}人なので参加できません。` };
  }
  if (room.phase !== 'lobby') {
    return { ok: false, error: 'game_in_progress', message: 'すでにゲームが始まっているため、この部屋には参加できません。' };
  }
  const player: Player = {
    id,
    name: name || `プレイヤー${room.players.length + 1}`,
    score: 0,
    connected: true,
    answered: false,
    isAnswerer: false,
    queued: false,
    lastCorrect: null,
    lastChoice: null,
  };
  room.players.push(player);
  if (!room.hostId) room.hostId = player.id;
  void now;
  return { ok: true, value: player };
}

export function setConnected(room: RoomState, id: string, connected: boolean): void {
  const p = findPlayer(room, id);
  if (!p) return;
  p.connected = connected;
  if (!connected) {
    // 切断したプレイヤーは回答権・順番待ちから取り除く（復帰時は再参加扱い）
    if (room.answererId === id) {
      room.answererId = null;
      room.answerDeadline = null;
    }
    room.buzzQueue = room.buzzQueue.filter((x) => x !== id);
    p.isAnswerer = false;
    p.queued = false;
  }
}

export function canStart(room: RoomState): { ok: boolean; message: string } {
  const n = room.players.length;
  if (n < 2) return { ok: false, message: '参加者が2人未満です。あと1人参加すると開始できます。' };
  if (n > MAX_PLAYERS) return { ok: false, message: '定員超過のため開始できません。' };
  return { ok: true, message: '' };
}

export function startGame(room: RoomState, actorId: string, now: number): Result<string> {
  if (room.hostId !== actorId) {
    return { ok: false, error: 'not_host', message: 'ゲームを開始できるのはホストだけです。' };
  }
  if (room.phase !== 'lobby') {
    return { ok: false, error: 'already_started', message: 'ゲームはすでに始まっています。' };
  }
  const startable = canStart(room);
  if (!startable.ok) {
    return { ok: false, error: 'not_enough_players', message: startable.message };
  }
  room.phase = 'question';
  room.questionIndex = 0;
  resetQuestionState(room, now);
  return { ok: true, value: 'ゲームを開始しました！' };
}

/** 同じ部屋をもう一度遊ぶ（ホストのみ） */
export function restartGame(room: RoomState, actorId: string, now: number): Result<string> {
  if (room.hostId !== actorId) {
    return { ok: false, error: 'not_host', message: 'やり直せるのはホストだけです。' };
  }
  room.phase = 'lobby';
  room.questionIndex = 0;
  room.answererId = null;
  room.answerDeadline = null;
  room.buzzQueue = [];
  room.correctIndex = null;
  room.nextAt = null;
  room.lastAnswererId = null;
  room.lastChoice = null;
  for (const p of room.players) {
    p.score = 0;
    p.answered = false;
    p.isAnswerer = false;
    p.queued = false;
    p.lastCorrect = null;
    p.lastChoice = null;
  }
  void now;
  return { ok: true, value: 'スコアをリセットしました。' };
}

function resetQuestionState(room: RoomState, now: number): void {
  room.questionStart = now;
  room.questionDeadline = now + QUESTION_MS;
  room.answererId = null;
  room.answerDeadline = null;
  room.buzzQueue = [];
  room.correctIndex = null;
  room.nextAt = null;
  room.lastAnswererId = null;
  room.lastChoice = null;
  for (const p of room.players) {
    p.answered = false;
    p.isAnswerer = false;
    p.queued = false;
    p.lastCorrect = null;
    p.lastChoice = null;
  }
}

/**
 * 早押し。サーバーが最初に受け取った人だけが回答権を得る。
 * 回答権が既に他の人に渡っている場合は「順番待ち」としてキューに積む。
 */
export function buzz(room: RoomState, playerId: string, now: number): Result<string> {
  if (room.phase !== 'question') {
    return { ok: false, error: 'not_buzzing', message: '今は早押しできません。' };
  }
  const p = findPlayer(room, playerId);
  if (!p) {
    return { ok: false, error: 'unknown_player', message: '参加情報が見つかりません。' };
  }
  if (p.answered) {
    return { ok: false, error: 'already_answered', message: 'この問題ではすでに回答済みです。' };
  }
  if (room.answererId === playerId) {
    return { ok: false, error: 'already_answerer', message: 'すでに回答権を持っています。' };
  }
  if (room.answererId === null) {
    room.answererId = playerId;
    room.answerDeadline = now + ANSWER_MS;
    p.isAnswerer = true;
    p.queued = false;
    return { ok: true, value: `${p.name} が回答権を得ました！` };
  }
  // すでに回答権がある場合は順番待ち（この問題で再び押せない）
  if (!p.queued && !room.buzzQueue.includes(playerId)) {
    room.buzzQueue.push(playerId);
    p.queued = true;
  }
  return { ok: true, value: `${p.name} は順番待ちになりました。` };
}

/**
 * 回答。回答権を持つプレイヤーだけが実行できる。
 */
export function answer(room: RoomState, playerId: string, choice: number, now: number): Result<{ correct: boolean; score: number }> {
  if (room.phase !== 'question') {
    return { ok: false, error: 'not_answering', message: '今は回答できません。' };
  }
  if (room.answererId !== playerId) {
    return { ok: false, error: 'not_answerer', message: '回答権を持っていません。' };
  }
  const p = findPlayer(room, playerId);
  if (!p) {
    return { ok: false, error: 'unknown_player', message: '参加情報が見つかりません。' };
  }
  const question = QUESTIONS[room.questionIndex];
  if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
    return { ok: false, error: 'invalid_choice', message: '選択肢が不正です。' };
  }
  if (room.answerDeadline !== null && now > room.answerDeadline) {
    // 期限切れ
    return applyAnswer(room, p, -1, now);
  }
  return applyAnswer(room, p, choice, now);
}

function applyAnswer(room: RoomState, p: Player, choice: number, now: number): Result<{ correct: boolean; score: number }> {
  const question = QUESTIONS[room.questionIndex];
  const correct = choice === question.correct;
  p.answered = true;
  p.isAnswerer = false;
  p.queued = false;
  p.lastCorrect = correct;
  p.lastChoice = choice >= 0 ? choice : null;
  room.lastAnswererId = p.id;
  room.lastChoice = p.lastChoice;
  if (correct) {
    p.score += SCORE_CORRECT;
    room.correctIndex = question.correct;
    room.answererId = null;
    room.answerDeadline = null;
    room.phase = 'reveal';
    room.nextAt = now + REVEAL_MS;
    return { ok: true, value: { correct: true, score: p.score } };
  }
  p.score += SCORE_WRONG;
  room.answererId = null;
  room.answerDeadline = null;
  room.phase = 'feedback';
  room.nextAt = now + FEEDBACK_MS;
  return { ok: true, value: { correct: false, score: p.score } };
}

/** 回答|time out（10 秒以内に選しなかった） */
function timeoutAnswer(room: RoomState, playerId: string, now: number): void {
  const p = findPlayer(room, playerId);
  if (!p) return;
  p.answered = true;
  p.isAnswerer = false;
  p.queued = false;
  p.lastCorrect = false;
  p.lastChoice = null;
  room.lastAnswererId = p.id;
  room.lastChoice = null;
  p.score += SCORE_WRONG;
  room.answererId = null;
  room.answerDeadline = null;
  room.phase = 'feedback';
  room.nextAt = now + FEEDBACK_MS;
}

/**
 * 経過時間に応じた自動進行。アラームやクライアントからの通知で呼ばれる。
 * 状態が変わったかどうかを返す。
 */
export function tick(room: RoomState, now: number): boolean {
  let changed = false;
  // 期限は 1 つだけ処理する（呼び出し側で再度 tick する）
  for (let guard = 0; guard < 10; guard++) {
    if (room.phase === 'question') {
      if (room.answererId !== null && room.answerDeadline !== null && now >= room.answerDeadline) {
        timeoutAnswer(room, room.answererId, now);
        changed = true;
        continue;
      }
      if (now >= room.questionDeadline) {
        room.phase = 'reveal';
        room.correctIndex = QUESTIONS[room.questionIndex].correct;
        room.answererId = null;
        room.answerDeadline = null;
        room.nextAt = now + REVEAL_MS;
        changed = true;
        continue;
      }
      if (everyoneAnswered(room)) {
        room.phase = 'reveal';
        room.correctIndex = QUESTIONS[room.questionIndex].correct;
        room.answererId = null;
        room.answerDeadline = null;
        room.nextAt = now + REVEAL_MS;
        changed = true;
        continue;
      }
      break;
    }
    if (room.phase === 'feedback' && room.nextAt !== null && now >= room.nextAt) {
      changed = true;
      // 不正解 → 次の人有給（待機列が空なら早押しを再開）
      const next = room.buzzQueue.shift();
      if (next) {
        const p = findPlayer(room, next);
        if (p && !p.answered) {
          p.queued = false;
          p.isAnswerer = true;
          room.answererId = next;
          room.answerDeadline = now + ANSWER_MS;
          room.phase = 'question';
          room.nextAt = null;
          continue;
        }
      }
      if (everyoneAnswered(room)) {
        room.phase = 'reveal';
        room.correctIndex = QUESTIONS[room.questionIndex].correct;
        room.nextAt = now + REVEAL_MS;
        continue;
      }
      room.phase = 'question';
      room.nextAt = null;
      continue;
    }
    if (room.phase === 'reveal' && room.nextAt !== null && now >= room.nextAt) {
      changed = true;
      if (room.questionIndex + 1 >= QUESTION_COUNT) {
        room.phase = 'result';
        room.nextAt = null;
        room.correctIndex = null;
        break;
      }
      room.questionIndex += 1;
      resetQuestionState(room, now);
      room.phase = 'question';
      continue;
    }
    break;
  }
  return changed;
}

export function everyoneAnswered(room: RoomState): boolean {
  if (room.players.length === 0) return false;
  return room.players.every((p) => p.answered);
}

export interface RankingEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
}

export function ranking(room: RoomState): RankingEntry[] {
  const sorted = [...room.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // 同点なら先にJOINした人が上位
    return room.players.indexOf(a) - room.players.indexOf(b);
  });
  return sorted.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    // 同点は同順位（ Competition ranking）
    rank: room.players.filter((other) => other.score > p.score).length + 1,
  }));
}

/** 次にアラーム wakes すべき時刻（null ならアラーム不要） */
export function nextDeadline(room: RoomState, now: number): number | null {
  const candidates: number[] = [];
  if (room.phase === 'question') {
    if (room.answererId !== null && room.answerDeadline !== null) candidates.push(room.answerDeadline);
    candidates.push(room.questionDeadline);
  } else if ((room.phase === 'feedback' || room.phase === 'reveal') && room.nextAt !== null) {
    candidates.push(room.nextAt);
  }
  if (candidates.length === 0) return null;
  const min = Math.min(...candidates);
  return min > now ? min : now + 1;
}
