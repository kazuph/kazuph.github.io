import { QUESTIONS } from './questions';

// ゲームのルール値。判定はすべてこのファイルの純粋関数でサーバー側が行う。
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const TOTAL_QUESTIONS = 10;
export const QUESTION_MS = 20_000; // 問題が出てから全員が押せる時間
export const ANSWER_MS = 10_000; // 回答権を得てから選ぶまでの時間
export const REVEAL_MS = 5_000; // 正解表示の時間（次の問題までの間）
export const POINTS_CORRECT = 10;
export const POINTS_WRONG = -5;
export const MAX_NAME_LENGTH = 10;

export type Phase = 'lobby' | 'question' | 'reveal' | 'finished';

export interface Player {
  id: string;
  name: string;
  score: number;
  /** この問題で不正解になり、もう押せないか */
  eliminated: boolean;
}

export interface Reveal {
  answer: number;
  headline: string;
  untilMs: number;
}

export interface GameState {
  code: string;
  hostId: string;
  phase: Phase;
  /** 参加順 */
  players: Player[];
  /** QUESTIONS の番号。開始時に決める */
  order: number[];
  /** 0始まりの現在の問題番号 */
  qNo: number;
  questionEndMs: number;
  buzzerId: string | null;
  /** 回答権を持つ人の回答期限（問題の期限を超えない） */
  answerEndMs: number | null;
  reveal: Reveal | null;
  /** 画面下に出す直近の出来事 */
  notice: string | null;
}

export type Result = { ok: true; state: GameState } | { ok: false; error: string };

const ok = (state: GameState): Result => ({ ok: true, state });
const ng = (error: string): Result => ({ ok: false, error });

export function createGame(code: string, host: { id: string; name: string }): GameState {
  return {
    code,
    hostId: host.id,
    phase: 'lobby',
    players: [{ id: host.id, name: host.name, score: 0, eliminated: false }],
    order: [],
    qNo: 0,
    questionEndMs: 0,
    buzzerId: null,
    answerEndMs: null,
    reveal: null,
    notice: null,
  };
}

export function validateName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: '名前を入力してください' };
  const name = raw.trim();
  if (name.length === 0) return { ok: false, error: '名前を入力してください' };
  if (Array.from(name).length > MAX_NAME_LENGTH) {
    return { ok: false, error: `名前は${MAX_NAME_LENGTH}文字以内にしてください` };
  }
  return { ok: true, name };
}

export function joinGame(state: GameState, player: { id: string; name: string }): Result {
  if (state.phase !== 'lobby') return ng('ゲーム中のため、この部屋には今は参加できません');
  if (state.players.some((p) => p.id === player.id)) return ng('すでに参加しています');
  if (state.players.length >= MAX_PLAYERS) {
    return ng(`この部屋は定員${MAX_PLAYERS}人で満員のため、入れません`);
  }
  const s = structuredClone(state);
  if (s.players.length === 0) s.hostId = player.id; // 空になった部屋に入った人がホスト
  s.players.push({ id: player.id, name: player.name, score: 0, eliminated: false });
  return ok(s);
}

/**
 * ロビーでの退出は席を消す（ホストが抜けたら次の参加者がホスト）。
 * ゲーム中の退出は席と点数を残す（同じ部屋を開き直せば点数は保持される）。
 */
export function leaveGame(state: GameState, playerId: string): Result {
  if (state.phase !== 'lobby') return ok(state);
  const s = structuredClone(state);
  s.players = s.players.filter((p) => p.id !== playerId);
  if (s.hostId === playerId && s.players.length > 0) s.hostId = s.players[0].id;
  return ok(s);
}

/**
 * ホストが開始する。2〜4人のときだけ開始でき、問題を pick() で選んで最初の問題を出す。
 */
export function startGame(
  state: GameState,
  requesterId: string,
  now: number,
  pick: () => number[] = pickRandomQuestions,
): Result {
  if (state.phase !== 'lobby') return ng('すでに開始しています');
  if (requesterId !== state.hostId) return ng('開始できるのは部屋を作った人だけです');
  const n = state.players.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) {
    return ng(`開始するには${MIN_PLAYERS}〜${MAX_PLAYERS}人そろっている必要があります（今は${n}人）`);
  }
  const s = structuredClone(state);
  s.order = pick();
  s.phase = 'question';
  s.qNo = 0;
  s.questionEndMs = now + QUESTION_MS;
  s.notice = null;
  return ok(s);
}

export function pickRandomQuestions(): number[] {
  const idx = QUESTIONS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, TOTAL_QUESTIONS);
}

/** 早押し。サーバーが最初に受け取った1人だけが回答権を得る（DOは1件ずつ処理する）。 */
export function buzz(input: GameState, playerId: string, now: number): Result {
  const state = advance(input, now);
  if (state.phase !== 'question') return ng('今は押せません');
  if (state.buzzerId !== null) return ng('ほかの人が先に押しました');
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return ng('参加者ではありません');
  if (player.eliminated) return ng('この問題ではもう押せません');
  const s = structuredClone(state);
  s.buzzerId = playerId;
  s.answerEndMs = Math.min(now + ANSWER_MS, s.questionEndMs);
  s.notice = `${player.name}さんが回答権を取りました`;
  return ok(s);
}

/** 回答権を持つ人が4択から選ぶ。正解は+10、不正解は-5。 */
export function answer(input: GameState, playerId: string, choice: unknown, now: number): Result {
  const state = advance(input, now);
  if (state.phase !== 'question' || state.buzzerId === null) return ng('回答権がありません');
  if (state.buzzerId !== playerId) return ng('回答権がありません');
  if (!Number.isInteger(choice) || (choice as number) < 0 || (choice as number) > 3) {
    return ng('選択肢は0〜3で指定してください');
  }
  const q = QUESTIONS[state.order[state.qNo]];
  const player = state.players.find((p) => p.id === playerId)!;
  const s = structuredClone(state);
  if (choice === q.answer) {
    const sp = s.players.find((p) => p.id === playerId)!;
    sp.score += POINTS_CORRECT;
    endQuestion(s, now, `${player.name}さんが正解！ +${POINTS_CORRECT}点`);
  } else {
    wrongAnswer(s, now, playerId, '不正解');
  }
  return ok(s);
}

/**
 * 期限切れの処理（時間切れ・正解表示の終了・次の問題へ進む）を、時刻 now までについて適用する。
 * すべての操作の前に呼ばれ、alarm からも呼ばれる。
 */
export function advance(input: GameState, now: number): GameState {
  const s = structuredClone(input);
  for (let guard = 0; guard < 100; guard++) {
    if (s.phase === 'question') {
      if (s.buzzerId !== null && s.answerEndMs !== null && now >= s.answerEndMs) {
        if (s.answerEndMs >= s.questionEndMs) {
          // 問題の20秒がきたので、回答中でも問題を締める（得点は動かさない）
          endQuestion(s, s.questionEndMs, '時間切れ');
        } else {
          const name = s.players.find((p) => p.id === s.buzzerId)?.name ?? '';
          wrongAnswer(s, s.answerEndMs, s.buzzerId, `${name}さんは回答時間切れ`);
        }
        continue;
      }
      if (s.buzzerId === null && now >= s.questionEndMs) {
        endQuestion(s, s.questionEndMs, '時間切れ');
        continue;
      }
      break;
    }
    if (s.phase === 'reveal' && s.reveal && now >= s.reveal.untilMs) {
      nextQuestion(s, s.reveal.untilMs);
      continue;
    }
    break;
  }
  return s;
}

/** 次に advance を呼ぶべき時刻。alarm の設定に使う。待つものがなければ null。 */
export function nextWakeMs(state: GameState): number | null {
  if (state.phase === 'question') {
    return state.buzzerId !== null && state.answerEndMs !== null ? state.answerEndMs : state.questionEndMs;
  }
  if (state.phase === 'reveal' && state.reveal) return state.reveal.untilMs;
  return null;
}

function wrongAnswer(s: GameState, now: number, playerId: string, reason: string): void {
  const p = s.players.find((x) => x.id === playerId)!;
  p.score += POINTS_WRONG;
  p.eliminated = true;
  s.buzzerId = null;
  s.answerEndMs = null;
  const eligible = s.players.some((x) => !x.eliminated);
  if (!eligible) {
    endQuestion(s, now, `${p.name}さんが${reason}（${POINTS_WRONG}点）。全員が押せなくなりました`);
    return;
  }
  s.notice = `${p.name}さんが${reason}（${POINTS_WRONG}点）。残りの人で早押しを再開`;
}

function endQuestion(s: GameState, now: number, headline: string): void {
  const q = QUESTIONS[s.order[s.qNo]];
  s.phase = 'reveal';
  s.buzzerId = null;
  s.answerEndMs = null;
  s.reveal = { answer: q.answer, headline, untilMs: now + REVEAL_MS };
  s.notice = headline;
}

function nextQuestion(s: GameState, startMs: number): void {
  s.qNo += 1;
  s.reveal = null;
  s.notice = null;
  for (const p of s.players) p.eliminated = false;
  if (s.qNo >= TOTAL_QUESTIONS) {
    s.phase = 'finished';
    return;
  }
  s.phase = 'question';
  s.questionEndMs = startMs + QUESTION_MS;
}

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  eliminated: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface View {
  code: string;
  phase: Phase;
  you: string;
  serverNow: number;
  hostId: string;
  players: PublicPlayer[];
  canStart: boolean;
  qNo: number;
  total: number;
  question: { text: string; choices: string[] } | null;
  questionEndMs: number | null;
  buzzerId: string | null;
  answerEndMs: number | null;
  canBuzz: boolean;
  canAnswer: boolean;
  reveal: { answer: number; headline: string; untilMs: number } | null;
  notice: string | null;
  ranking: PublicPlayer[] | null;
}

/** 参加者1人の画面に渡す情報。問題中は正解番号を含めない。 */
export function viewFor(state: GameState, viewerId: string, connectedIds: Set<string>, now: number): View {
  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    eliminated: p.eliminated,
    connected: connectedIds.has(p.id),
    isHost: p.id === state.hostId,
  }));
  const me = state.players.find((p) => p.id === viewerId);
  const inGameQ = state.phase === 'question' || state.phase === 'reveal';
  const q = inGameQ ? QUESTIONS[state.order[state.qNo]] : null;
  const n = state.players.length;
  const ranking =
    state.phase === 'finished'
      ? [...players].sort((a, b) => b.score - a.score || indexOf(state, a.id) - indexOf(state, b.id))
      : null;
  return {
    code: state.code,
    phase: state.phase,
    you: viewerId,
    serverNow: now,
    hostId: state.hostId,
    players,
    canStart: viewerId === state.hostId && state.phase === 'lobby' && n >= MIN_PLAYERS && n <= MAX_PLAYERS,
    qNo: state.qNo,
    total: TOTAL_QUESTIONS,
    question: q ? { text: q.text, choices: [...q.choices] } : null,
    questionEndMs: state.phase === 'question' ? state.questionEndMs : null,
    buzzerId: state.buzzerId,
    answerEndMs: state.phase === 'question' ? state.answerEndMs : null,
    canBuzz: state.phase === 'question' && state.buzzerId === null && !!me && !me.eliminated,
    canAnswer: state.phase === 'question' && state.buzzerId === viewerId,
    reveal: state.phase === 'reveal' && state.reveal ? { ...state.reveal } : null,
    notice: state.notice,
    ranking,
  };
}

function indexOf(state: GameState, id: string): number {
  return state.players.findIndex((p) => p.id === id);
}
