import {
  ANSWER_TIME_MS,
  HOST_TRANSFER_MS,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  QUESTION_TIME_MS,
  REVEAL_TIME_MS,
  TOTAL_QUESTIONS,
  type ClientMessage,
  type PlayerView,
  type RoomView,
  type ServerMessage,
  type StateMessage,
  type SubPhase,
} from "../shared/types";
import { QUESTIONS, QUESTION_COUNT } from "../shared/questions";

interface Player {
  id: string;
  token: string;
  name: string;
  score: number;
  connected: boolean;
  host: boolean;
  joinedAt: number;
}

interface RoomState {
  createdAt: number;
  /** テスト用に制限時間を短くしたモード（挙動ロジックは同一） */
  fast: boolean;
  players: Player[]; // token がキー。id は "p1","p2"...（他プレイヤーには非公開）
  started: boolean;
  phase: "lobby" | "question" | "results";
  qIndex: number;
  order: number[]; // 出題順（シャッフル済みの問題インデックス）
  subPhase: SubPhase | null;
  answerer: string | null; // playerId
  lockedOut: string[]; // playerId のリスト（この問題でもう押せない）
  questionStart: number;
  questionDeadline: number;
  answerDeadline: number;
  revealEndsAt: number;
  lastResult: StateMessage["room"]["lastResult"];
  hostTransferAt: number | null;
}

interface Durations {
  buzz: number;
  answer: number;
  reveal: number;
  hostTransfer: number;
}

const NORMAL: Durations = {
  buzz: QUESTION_TIME_MS,
  answer: ANSWER_TIME_MS,
  reveal: REVEAL_TIME_MS,
  hostTransfer: HOST_TRANSFER_MS,
};
// ロジックは同じまま待ち時間だけ短くしたテスト用設定
const FAST: Durations = { buzz: 2_500, answer: 1_500, reveal: 600, hostTransfer: 2_000 };

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newId(n: number): string {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < n; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s;
}

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class RoomDO {
  private s: RoomState | null = null;
  private readonly storage: DurableObjectStorage;

  constructor(
    private readonly state: DurableObjectState,
    _env: unknown,
  ) {
    this.storage = state.storage;
    // 起動時にストレージから状態を復元（wrangler dev の再起動や再読み込みに耐える）
    state.blockConcurrencyWhile(async () => {
      const saved = await this.storage.get<RoomState>("room");
      this.s = saved ?? null;
      if (this.s) {
        // 復元直後は全員未接続として扱う（WS が再接続してきたら true に戻る）
        for (const p of this.s.players) p.connected = false;
        await this.scheduleAlarm();
      }
    });
  }

  // ---------- 内部ユーティリティ ----------

  private requireRoom(): RoomState {
    if (!this.s) throw new Error("room not initialised");
    return this.s;
  }

  private durations(): Durations {
    return this.requireRoom().fast ? FAST : NORMAL;
  }

  private playerByToken(token: string | null): Player | undefined {
    return this.requireRoom().players.find((p) => p.token === token);
  }

  private playerById(id: string | null): Player | undefined {
    return this.requireRoom().players.find((p) => p.id === id);
  }

  private async save(): Promise<void> {
    if (this.s) await this.storage.put("room", this.s);
  }

  private broadcast(): void {
    const msg = this.stateMessage(null);
    const raw = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(raw);
      } catch {
        /* 切断済みは close ハンドラで処理される */
      }
    }
  }

  private stateMessage(forToken: string | null): StateMessage {
    const s = this.requireRoom();
    const me = this.playerByToken(forToken);
    const q = s.order[s.qIndex];
    const reveal = s.phase === "question" && s.subPhase === "reveal";
    const room: RoomView = {
      code: this.roomCode(),
      phase: s.phase,
      subPhase: s.phase === "question" ? s.subPhase : null,
      questionIndex: s.qIndex,
      questionCount: Math.min(QUESTION_COUNT, TOTAL_QUESTIONS),
      question:
        s.phase === "question" && q !== undefined
          ? { text: QUESTIONS[q].text, choices: [...QUESTIONS[q].choices] }
          : null,
      correctIndex: reveal && q !== undefined ? QUESTIONS[q].correctIndex : null,
      questionDeadline: s.phase === "question" && s.subPhase === "buzzing" ? s.questionDeadline : null,
      answerDeadline: s.phase === "question" && s.subPhase === "answering" ? s.answerDeadline : null,
      revealEndsAt: s.phase === "question" && s.subPhase === "reveal" ? s.revealEndsAt : null,
      hostId: s.players.find((p) => p.host)?.id ?? "",
      lastResult: s.lastResult,
    };
    const players: PlayerView[] = s.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      host: p.host,
      lockedOut: s.phase === "question" && s.lockedOut.includes(p.id),
      answering: s.phase === "question" && s.subPhase === "answering" && s.answerer === p.id,
    }));
    const msg: StateMessage = {
      type: "state",
      serverTime: Date.now(),
      you: me ? me.id : null,
      room,
      players,
    };
    return msg;
  }

  private roomCode(): string {
    // RoomDO は部屋コードごとに idFromName で作られる（idFromName("ABCD") → id.name === "ABCD"）
    return this.state.id.name ?? "";
  }

  // ---------- HTTP（Worker から内部呼び出しされる） ----------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/internal/create" && request.method === "POST") {
      const body = (await request.json()) as { name?: string; fast?: boolean };
      if (this.s) {
        return Response.json({ error: "exists" }, { status: 409 });
      }
      const name = this.sanitizeName(body.name);
      if (!name) return Response.json({ error: "名前を入力してください" }, { status: 400 });
      const token = crypto.randomUUID();
      const id = "p1";
      this.s = {
        createdAt: Date.now(),
        fast: body.fast === true,
        players: [{ id, token, name, score: 0, connected: false, host: true, joinedAt: Date.now() }],
        started: false,
        phase: "lobby",
        qIndex: 0,
        order: [],
        subPhase: null,
        answerer: null,
        lockedOut: [],
        questionStart: 0,
        questionDeadline: 0,
        answerDeadline: 0,
        revealEndsAt: 0,
        lastResult: null,
        hostTransferAt: null,
      };
      await this.save();
      return Response.json({ token });
    }

    if (url.pathname === "/internal/join" && request.method === "POST") {
      const body = (await request.json()) as { name?: string };
      const s = this.s;
      if (!s) {
        // このコードの部屋はまだ作られていない
        return Response.json({ error: "部屋が見つかりません" }, { status: 404 });
      }
      const name = this.sanitizeName(body.name);
      if (!name) return Response.json({ error: "名前を入力してください" }, { status: 400 });
      if (s.players.length >= MAX_PLAYERS) {
        return Response.json({ error: `満員です（1部屋${MAX_PLAYERS}人まで）` }, { status: 409 });
      }
      if (s.started) {
        return Response.json({ error: "ゲーム進行中は新しく参加できません" }, { status: 409 });
      }
      const token = crypto.randomUUID();
      const id = `p${s.players.length + 1}`;
      s.players.push({
        id,
        token,
        name,
        score: 0,
        connected: false,
        host: false,
        joinedAt: Date.now(),
      });
      await this.save();
      return Response.json({ token });
    }

    if (url.pathname === "/ws" && (request.headers.get("Upgrade") ?? "") === "websocket") {
      return this.handleWebSocket(url);
    }

    return new Response("Not Found", { status: 404 });
  }

  private sanitizeName(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const name = v.trim().slice(0, 12);
    return name.length > 0 ? name : null;
  }

  // ---------- WebSocket（Hibernation API） ----------

  private async handleWebSocket(url: URL): Promise<Response> {
    const token = url.searchParams.get("token") ?? "";
    const pair = new WebSocketPair();
    const server = pair[1];

    if (!this.playerByToken(token)) {
      server.accept();
      server.send(JSON.stringify({ type: "error", message: "参加情報が無効です。最初の画面からやり直してください" }));
      server.close(4001, "invalid token");
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    this.state.acceptWebSocket(server, [token]);
    const p = this.playerByToken(token)!;
    const wasConnected = p.connected;
    p.connected = true;
    if (p.host) this.requireRoom().hostTransferAt = null; // ホストが戻ってきた
    await this.save();
    await this.scheduleAlarm();
    // 本人に即スナップショット、全員に接続状態の更新を配る
    server.send(JSON.stringify(this.stateMessage(token)));
    if (!wasConnected) this.broadcast();

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const tags = this.state.getTags(ws);
    const token = tags[0] ?? null;
    const p = this.playerByToken(token);
    if (!p) {
      try {
        ws.close(4001, "invalid token");
      } catch { /* noop */ }
      return;
    }
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ClientMessage;
    } catch {
      return;
    }
    const s = this.requireRoom();
    const now = Date.now();

    switch (msg.type) {
      case "ping":
        ws.send(JSON.stringify(this.stateMessage(token)));
        break;
      case "start": {
        if (!p.host || s.phase !== "lobby") return this.sendError(ws, "開始できるのはホストだけです");
        if (s.players.length < MIN_PLAYERS_TO_START || s.players.length > MAX_PLAYERS) {
          return this.sendError(ws, `開始できるのは${MIN_PLAYERS_TO_START}〜${MAX_PLAYERS}人のときです`);
        }
        this.startGame();
        break;
      }
      case "restart": {
        if (!p.host || s.phase !== "results") return this.sendError(ws, "ホストだけがリスタートできます");
        this.resetToLobby();
        break;
      }
      case "buzz": {
        if (s.phase !== "question" || s.subPhase !== "buzzing") return;
        if (!p.connected || s.lockedOut.includes(p.id)) return;
        // サーバーが最初に受け取った 1 人だけが回答権を得る（DO は直列に処理されるので競合しない）
        this.grantAnswer(p, now);
        break;
      }
      case "answer": {
        if (s.phase !== "question" || s.subPhase !== "answering") return;
        if (s.answerer !== p.id) return;
        const choice = Number((msg as { choice: unknown }).choice);
        if (!Number.isInteger(choice) || choice < 0 || choice > 3) return;
        this.handleAnswer(p, choice, now);
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.markDisconnectedIfLast(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.markDisconnectedIfLast(ws);
  }

  private async markDisconnectedIfLast(ws: WebSocket): Promise<void> {
    const tags = this.state.getTags(ws);
    const token = tags[0] ?? null;
    const p = this.playerByToken(token);
    if (!p) return;
    // 同一プレイヤーの他ソケット（再接続の二重張り）が残っていれば切断扱いにしない
    const others = this.state.getWebSockets(token).filter((w) => w !== ws);
    if (others.length > 0) return;
    if (!p.connected) return;
    p.connected = false;
    const s = this.requireRoom();
    if (p.host && s.players.some((q) => q.connected && !q.host)) {
      s.hostTransferAt = Date.now() + this.durations().hostTransfer;
    }
    await this.save();
    await this.scheduleAlarm();
    this.broadcast();
  }

  private sendError(ws: WebSocket, message: string): void {
    try {
      ws.send(JSON.stringify({ type: "error", message } satisfies ServerMessage));
    } catch { /* noop */ }
  }

  // ---------- ゲームロジック ----------

  private startGame(): void {
    const s = this.requireRoom();
    s.started = true;
    s.phase = "question";
    s.qIndex = -1;
    s.order = shuffle([...QUESTIONS.keys()]);
    for (const p of s.players) p.score = 0;
    this.startQuestion(Date.now());
  }

  private resetToLobby(): void {
    const s = this.requireRoom();
    s.started = false;
    s.phase = "lobby";
    s.subPhase = null;
    s.answerer = null;
    s.lockedOut = [];
    s.lastResult = null;
    s.order = [];
    s.qIndex = 0;
    for (const p of s.players) p.score = 0;
    void this.persistAndBroadcast();
  }

  private startQuestion(now: number): void {
    const s = this.requireRoom();
    s.qIndex += 1;
    s.subPhase = "buzzing";
    s.answerer = null;
    s.lockedOut = [];
    s.lastResult = null;
    s.questionStart = now;
    s.questionDeadline = now + this.durations().buzz;
    s.answerDeadline = 0;
    s.revealEndsAt = 0;
    void this.persistAndBroadcast();
  }

  private grantAnswer(p: Player, now: number): void {
    const s = this.requireRoom();
    s.subPhase = "answering";
    s.answerer = p.id;
    s.answerDeadline = now + this.durations().answer;
    void this.persistAndBroadcast();
  }

  private handleAnswer(p: Player, choice: number, now: number): void {
    const s = this.requireRoom();
    const qi = s.order[s.qIndex];
    const correct = QUESTIONS[qi].correctIndex === choice;
    if (correct) {
      p.score += 10;
      s.lastResult = { playerId: p.id, outcome: "correct", delta: 10 };
      this.toReveal(now);
    } else {
      p.score -= 5;
      s.lastResult = { playerId: p.id, outcome: "wrong", delta: -5 };
      s.lockedOut.push(p.id);
      this.resumeBuzzing(now);
    }
  }

  /** 不正解・失答のあと、まだ押せる人がいれば早押しを再開、いなければ正解表示へ */
  private resumeBuzzing(now: number): void {
    const s = this.requireRoom();
    const canBuzz = s.players.some((p) => p.connected && !s.lockedOut.includes(p.id));
    s.answerer = null;
    if (canBuzz && now < s.questionDeadline) {
      s.subPhase = "buzzing";
      s.answerDeadline = 0;
    } else {
      this.toReveal(now);
      return;
    }
    void this.persistAndBroadcast();
  }

  private toReveal(now: number): void {
    const s = this.requireRoom();
    s.subPhase = "reveal";
    s.answerer = null;
    s.revealEndsAt = now + this.durations().reveal;
    void this.persistAndBroadcast();
  }

  private nextAfterReveal(now: number): void {
    const s = this.requireRoom();
    if (s.qIndex + 1 >= QUESTION_COUNT) {
      s.phase = "results";
      s.subPhase = null;
      s.lastResult = null;
      void this.persistAndBroadcast();
    } else {
      this.startQuestion(now);
    }
  }

  // ---------- タイマー（Durable Object アラームでサーバー権限の期限管理） ----------

  private async scheduleAlarm(): Promise<void> {
    const s = this.s;
    if (!s) return;
    let t: number | null = null;
    if (s.phase === "question") {
      if (s.subPhase === "buzzing") t = s.questionDeadline;
      else if (s.subPhase === "answering") t = s.answerDeadline;
      else if (s.subPhase === "reveal") t = s.revealEndsAt;
    } else if (s.hostTransferAt != null) {
      t = s.hostTransferAt;
    }
    const current = await this.storage.getAlarm();
    if (t != null) {
      if (current !== t) await this.storage.setAlarm(t);
    } else if (current != null) {
      await this.storage.deleteAlarm();
    }
  }

  async alarm(): Promise<void> {
    const s = this.s;
    if (!s) return;
    const now = Date.now();
    if (s.hostTransferAt != null && now >= s.hostTransferAt) {
      s.hostTransferAt = null;
      if (!s.players.some((p) => p.host && p.connected)) {
        const next = s.players.find((p) => p.connected);
        if (next) {
          for (const p of s.players) p.host = false;
          next.host = true;
        }
      }
      await this.save();
      this.broadcast();
      await this.scheduleAlarm();
      return;
    }
    if (s.phase === "question") {
      if (s.subPhase === "buzzing" && now >= s.questionDeadline) {
        // 20秒たったら（または全員押せなくなったら）正解を表示して次へ
        this.toReveal(now);
      } else if (s.subPhase === "answering" && now >= s.answerDeadline) {
        const p = this.playerById(s.answerer);
        if (p) {
          p.score -= 5;
          s.lastResult = { playerId: p.id, outcome: "timeout", delta: -5 };
          s.lockedOut.push(p.id);
        }
        this.resumeBuzzing(now);
      } else if (s.subPhase === "reveal" && now >= s.revealEndsAt) {
        this.nextAfterReveal(now);
      } else {
        await this.scheduleAlarm();
        return;
      }
    }
  }

  private async persistAndBroadcast(): Promise<void> {
    await this.save();
    await this.scheduleAlarm();
    this.broadcast();
  }

  // ---------- テスト用フック（integration テストから runInDurableObject 経由で使う） ----------

  __test = {
    getCorrectIndex: (): number => {
      const s = this.requireRoom();
      return QUESTIONS[s.order[s.qIndex]].correctIndex;
    },
  };
}
