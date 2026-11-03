// 早押しクイズの進行ロジック。Cloudflare に依存しない純粋なモジュール。
// 正誤判定・点数・早押しの順番はすべてここ（＝サーバー側）で決める。
import { QUESTIONS, QUESTIONS_PER_GAME } from "./questions";

export interface GameConfig {
  maxPlayers: number;
  minPlayers: number;
  questionMs: number; // 出題から正解表示までの上限
  answerMs: number; // 回答権を得てから選ぶまでの上限
  revealMs: number; // 正解表示の長さ
  lobbyGraceMs: number; // ロビーで切断したプレイヤーを残しておく時間
  correctPoints: number;
  wrongPoints: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  maxPlayers: 4,
  minPlayers: 2,
  questionMs: 20_000,
  answerMs: 10_000,
  revealMs: 5_000,
  lobbyGraceMs: 15_000,
  correctPoints: 10,
  wrongPoints: -5,
};

export type Phase = "lobby" | "question" | "answering" | "reveal" | "final";

export interface Player {
  id: string; // 他のプレイヤーに見せてよい公開ID
  token: string; // 本人だけが持つ復帰用の秘密（スナップショットには絶対に載せない）
  name: string;
  score: number;
  connected: boolean;
  disconnectedAt: number | null;
}

export interface RevealInfo {
  correctIndex: number;
  outcome: "correct" | "allWrong" | "timeout";
  winnerId: string | null;
}

export interface LogEntry {
  n: number;
  kind: "buzz" | "correct" | "wrong" | "timeout" | "join" | "leave" | "info";
  text: string;
}

interface PlannedQuestion {
  id: number;
  text: string;
  choices: string[];
  answer: number;
}

export interface GameState {
  code: string;
  phase: Phase;
  hostId: string | null;
  players: Player[];
  plan: PlannedQuestion[];
  qIndex: number;
  questionDeadline: number;
  answererId: string | null;
  answerDeadline: number;
  lockedOut: string[];
  revealUntil: number;
  reveal: RevealInfo | null;
  log: LogEntry[];
  logN: number;
}

export type Fail = { ok: false; code: string; message: string };
export type Ok<T = object> = { ok: true } & T;
const fail = (code: string, message: string): Fail => ({ ok: false, code, message });

export function newGame(code: string): GameState {
  return {
    code,
    phase: "lobby",
    hostId: null,
    players: [],
    plan: [],
    qIndex: -1,
    questionDeadline: 0,
    answererId: null,
    answerDeadline: 0,
    lockedOut: [],
    revealUntil: 0,
    reveal: null,
    log: [],
    logN: 0,
  };
}

function pushLog(g: GameState, kind: LogEntry["kind"], text: string) {
  g.log.push({ n: ++g.logN, kind, text });
  if (g.log.length > 6) g.log.shift();
}

const nameOf = (g: GameState, id: string | null) => g.players.find((p) => p.id === id)?.name ?? "?";

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function planQuestions(rng: () => number = Math.random): PlannedQuestion[] {
  return shuffle(QUESTIONS, rng)
    .slice(0, QUESTIONS_PER_GAME)
    .map((q) => {
      const order = shuffle([0, 1, 2, 3], rng);
      return { id: q.id, text: q.text, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
    });
}

/** ロビーで一定時間つながっていないプレイヤーを外し、ホストを引き継ぐ。 */
function purgeLobby(g: GameState, cfg: GameConfig, now: number) {
  if (g.phase !== "lobby") return;
  const gone = g.players.filter((p) => !p.connected && p.disconnectedAt !== null && now - p.disconnectedAt >= cfg.lobbyGraceMs);
  if (!gone.length) return;
  for (const p of gone) pushLog(g, "leave", `${p.name}さんが退室しました`);
  g.players = g.players.filter((p) => !gone.includes(p));
  if (!g.players.some((p) => p.id === g.hostId)) {
    g.hostId = (g.players.find((p) => p.connected) ?? g.players[0])?.id ?? null;
  }
}

export function validName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 12) return null;
  return name;
}

let idSeq = 0;
function randomId(prefix: string, len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return prefix + Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, len * 2) + (idSeq++ % 10);
}

/** 新規参加、またはトークンによる復帰。 */
export function join(g: GameState, cfg: GameConfig, now: number, nameRaw: unknown, token?: unknown): Fail | Ok<{ player: Player; resumed: boolean }> {
  purgeLobby(g, cfg, now);
  if (typeof token === "string" && token) {
    const p = g.players.find((x) => x.token === token);
    if (p) {
      p.connected = true;
      p.disconnectedAt = null;
      return { ok: true, player: p, resumed: true };
    }
  }
  if (g.phase !== "lobby") return fail("GAME_STARTED", "この部屋はすでにゲームが始まっているため、途中参加できません");
  if (g.players.length >= cfg.maxPlayers) return fail("ROOM_FULL", `この部屋は満員です（定員${cfg.maxPlayers}人）`);
  const name = validName(nameRaw);
  if (!name) return fail("BAD_NAME", "名前は1〜12文字で入力してください");
  if (g.players.some((p) => p.name === name)) return fail("NAME_TAKEN", `「${name}」さんはすでに部屋にいます。別の名前にしてください`);
  const player: Player = { id: randomId("p"), token: randomId("t", 16), name, score: 0, connected: true, disconnectedAt: null };
  g.players.push(player);
  if (!g.hostId) g.hostId = player.id;
  pushLog(g, "join", `${name}さんが参加しました`);
  return { ok: true, player, resumed: false };
}

export function disconnect(g: GameState, now: number, playerId: string) {
  const p = g.players.find((x) => x.id === playerId);
  if (!p) return;
  p.connected = false;
  p.disconnectedAt = now;
}

export function start(g: GameState, cfg: GameConfig, now: number, playerId: string, rng: () => number = Math.random): Fail | Ok {
  purgeLobby(g, cfg, now);
  if (g.phase !== "lobby") return fail("BAD_PHASE", "すでにゲームが始まっています");
  if (playerId !== g.hostId) return fail("NOT_HOST", "開始できるのは部屋を作った人だけです");
  const n = g.players.length;
  if (n < cfg.minPlayers || n > cfg.maxPlayers) return fail("BAD_COUNT", `開始できるのは${cfg.minPlayers}〜${cfg.maxPlayers}人のときです（いま${n}人）`);
  g.plan = planQuestions(rng);
  g.qIndex = -1;
  for (const p of g.players) p.score = 0;
  pushLog(g, "info", "ゲーム開始！");
  nextQuestion(g, cfg, now);
  return { ok: true };
}

function nextQuestion(g: GameState, cfg: GameConfig, now: number) {
  g.qIndex++;
  g.reveal = null;
  g.answererId = null;
  g.lockedOut = [];
  if (g.qIndex >= g.plan.length) {
    g.phase = "final";
    pushLog(g, "info", "全問終了！最終結果");
    return;
  }
  g.phase = "question";
  g.questionDeadline = now + cfg.questionMs;
  g.answerDeadline = 0;
  g.revealUntil = 0;
}

function doReveal(g: GameState, cfg: GameConfig, now: number, outcome: RevealInfo["outcome"], winnerId: string | null) {
  g.phase = "reveal";
  g.answererId = null;
  g.revealUntil = now + cfg.revealMs;
  g.reveal = { correctIndex: g.plan[g.qIndex].answer, outcome, winnerId };
}

/** 早押し。呼ばれた順（＝サーバーが受け取った順）に処理され、最初の1人だけが回答権を得る。 */
export function buzz(g: GameState, cfg: GameConfig, now: number, playerId: string): Fail | Ok {
  tick(g, cfg, now);
  const p = g.players.find((x) => x.id === playerId);
  if (!p) return fail("NO_PLAYER", "プレイヤーが見つかりません");
  if (g.phase !== "question") {
    if (g.phase === "answering") return fail("TAKEN", `${nameOf(g, g.answererId)}さんが先に押しました`);
    return fail("BAD_PHASE", "いまは押せません");
  }
  if (g.lockedOut.includes(playerId)) return fail("LOCKED", "この問題ではもう押せません");
  g.phase = "answering";
  g.answererId = playerId;
  g.answerDeadline = now + cfg.answerMs;
  pushLog(g, "buzz", `${p.name}さんが早押し！`);
  return { ok: true };
}

export function answer(g: GameState, cfg: GameConfig, now: number, playerId: string, choice: unknown): Fail | Ok {
  tick(g, cfg, now);
  if (g.phase !== "answering" || g.answererId !== playerId) return fail("NOT_ANSWERER", "回答権がありません");
  if (typeof choice !== "number" || !Number.isInteger(choice) || choice < 0 || choice > 3) return fail("BAD_CHOICE", "選択肢が正しくありません");
  const q = g.plan[g.qIndex];
  const p = g.players.find((x) => x.id === playerId)!;
  if (choice === q.answer) {
    p.score += cfg.correctPoints;
    pushLog(g, "correct", `${p.name}さん正解！ +${cfg.correctPoints}`);
    doReveal(g, cfg, now, "correct", p.id);
  } else {
    wrong(g, cfg, now, p, `${p.name}さん不正解… ${cfg.wrongPoints}`, "wrong");
  }
  return { ok: true };
}

function wrong(g: GameState, cfg: GameConfig, now: number, p: Player, text: string, kind: LogEntry["kind"]) {
  p.score += cfg.wrongPoints;
  g.lockedOut.push(p.id);
  g.answererId = null;
  g.answerDeadline = 0;
  pushLog(g, kind, text);
  if (g.lockedOut.length >= g.players.length) {
    doReveal(g, cfg, now, "allWrong", null);
  } else if (now >= g.questionDeadline) {
    doReveal(g, cfg, now, "timeout", null);
  } else {
    g.phase = "question";
  }
}

/** 時間切れの処理。何度呼んでも安全（冪等）。 */
export function tick(g: GameState, cfg: GameConfig, now: number) {
  for (let guard = 0; guard < 50; guard++) {
    if (g.phase === "lobby") {
      purgeLobby(g, cfg, now);
      return;
    }
    if (g.phase === "question" && now >= g.questionDeadline) {
      pushLog(g, "timeout", "時間切れ！");
      doReveal(g, cfg, now, "timeout", null);
      continue;
    }
    if (g.phase === "answering" && now >= g.answerDeadline) {
      const p = g.players.find((x) => x.id === g.answererId)!;
      wrong(g, cfg, now, p, `${p.name}さん時間切れ… ${cfg.wrongPoints}`, "timeout");
      continue;
    }
    if (g.phase === "reveal" && now >= g.revealUntil) {
      nextQuestion(g, cfg, now);
      continue;
    }
    return;
  }
}

/** 次に tick が必要になる時刻（なければ null）。Durable Object のアラームに使う。 */
export function nextWake(g: GameState, cfg: GameConfig): number | null {
  switch (g.phase) {
    case "question":
      return g.questionDeadline;
    case "answering":
      return g.answerDeadline;
    case "reveal":
      return g.revealUntil;
    case "lobby": {
      const ds = g.players.filter((p) => !p.connected && p.disconnectedAt !== null).map((p) => p.disconnectedAt! + cfg.lobbyGraceMs);
      return ds.length ? Math.min(...ds) : null;
    }
    default:
      return null;
  }
}

export interface Snapshot {
  t: "state";
  now: number;
  code: string;
  phase: Phase;
  you: string;
  hostId: string | null;
  players: { id: string; name: string; score: number; connected: boolean; locked: boolean }[];
  qIndex: number;
  total: number;
  question: { text: string; choices: string[] } | null;
  questionDeadline: number | null;
  answererId: string | null;
  answerDeadline: number | null;
  reveal: RevealInfo | null;
  revealUntil: number | null;
  ranking: { id: string; name: string; score: number; rank: number }[] | null;
  log: LogEntry[];
  config: { maxPlayers: number; minPlayers: number; questionMs: number; answerMs: number; revealMs: number };
}

export function snapshot(g: GameState, cfg: GameConfig, now: number, you: string): Snapshot {
  const inGame = g.phase === "question" || g.phase === "answering" || g.phase === "reveal";
  const q = inGame ? g.plan[g.qIndex] : null;
  let ranking: Snapshot["ranking"] = null;
  if (g.phase === "final") {
    const sorted = g.players.slice().sort((a, b) => b.score - a.score);
    ranking = sorted.map((p) => ({ id: p.id, name: p.name, score: p.score, rank: sorted.findIndex((x) => x.score === p.score) + 1 }));
  }
  return {
    t: "state",
    now,
    code: g.code,
    phase: g.phase,
    you,
    hostId: g.hostId,
    players: g.players.map((p) => ({ id: p.id, name: p.name, score: p.score, connected: p.connected, locked: g.lockedOut.includes(p.id) })),
    qIndex: g.qIndex,
    total: g.plan.length || QUESTIONS_PER_GAME,
    question: q ? { text: q.text, choices: q.choices } : null,
    questionDeadline: g.phase === "question" || g.phase === "answering" ? g.questionDeadline : null,
    answererId: g.answererId,
    answerDeadline: g.phase === "answering" ? g.answerDeadline : null,
    reveal: g.phase === "reveal" ? g.reveal : null,
    revealUntil: g.phase === "reveal" ? g.revealUntil : null,
    ranking,
    log: g.log,
    config: { maxPlayers: cfg.maxPlayers, minPlayers: cfg.minPlayers, questionMs: cfg.questionMs, answerMs: cfg.answerMs, revealMs: cfg.revealMs },
  };
}
