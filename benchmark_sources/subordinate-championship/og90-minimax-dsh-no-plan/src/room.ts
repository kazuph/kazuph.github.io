/**
 * 1 部屋 = 1 Durable Object。
 *
 * - 部屋コードが Durable Object の ID そのもの（コード → DO の解決が不要）
 * - ゲーム状態は Durable Object のストレージに保存（再起動・再接続でも保持）
 * - WebSocket は Hibernation API で保持（DO が止まっても接続は生き残る）
 * - 早押し・正誤・得点・順番の判定はすべてこの DO 側で行う
 */

import {
  QUESTION_COUNT,
  answer as answerAction,
  buzz as buzzAction,
  createRoom,
  everyoneAnswered,
  findPlayer,
  joinRoom,
  nextDeadline,
  ranking,
  restartGame,
  setConnected,
  startGame,
  tick,
} from './game';
import { QUESTIONS } from './questions';
import type { ClientMessage, RoomState, ServerMessage, StateMessage } from './types';

const STORAGE_KEY = 'room';

interface Attachment {
  playerId: string | null;
}

export class Room {
  private ctx: DurableObjectState;
  private room: RoomState | null = null;
  /**
   * Durable Object の各イベント（WebSocket メッセージ / アラーム / fetch）は
   * 同時に走ることがあるため、ストレージ書き込みは直列化する。
   * （並列書き込みだとローカル開発時の SQLite が "database is locked" になる）
   */
  private writeChain: Promise<unknown> = Promise.resolve();
  /** 書き込み待ちの保存要求（まとめて 1 回だけ書き込む） */
  private pendingSave: Promise<void> | null = null;
  /** 状態の変更回数（保存の合流判定に使う） */
  private version = 0;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
    // 起動時に状態を読み込む（hibernation から復帰したときも必ず通る）
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<RoomState>(STORAGE_KEY);
      this.room = stored ?? null;
    });
  }

  /** テスト・デバッグ用 */
  getRoom(): RoomState | null {
    return this.room;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/create') {
      if (this.room) {
        return json({ ok: false, error: 'exists' });
      }
      const code = url.searchParams.get('code') ?? '';
      this.room = createRoom(code, Date.now());
      await this.save();
      return json({ ok: true, code });
    }

    if (url.pathname === '/state') {
      if (!this.room) return json({ ok: false, error: 'not_found' });
      return json({ ok: true, room: this.room });
    }

    if (url.pathname === '/ws' || url.pathname.endsWith('/ws')) {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ playerId: null } satisfies Attachment);
      return new Response(null, { status: 101, webSocket: client });
    }

    return json({ ok: false, error: 'not_found' }, 404);
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      return;
    }

    // 経過時間の処理（アラームの遅延を補正）
    if (this.room && tick(this.room, Date.now())) {
      await this.save();
      await this.broadcast();
    }

    const room = this.room;
    if (!room) {
      this.sendTo(ws, { t: 'error', code: 'room_not_found', message: 'その部屋コードの部屋は存在しません。' });
      this.closeSocket(ws, 4004, 'room_not_found');
      return;
    }

    const attachment = ws.deserializeAttachment() as Attachment | null;
    const playerId = attachment?.playerId ?? null;

    switch (msg.t) {
      case 'join': {
        const result = joinRoom(room, msg.id, msg.name, Date.now());
        if (!result.ok) {
          this.sendTo(ws, { t: 'error', code: result.error, message: result.message });
          this.closeSocket(ws, 4001, result.error);
          return;
        }
        // 同じプレイヤーの古い接続があれば閉じる（再読み込み時）
        this.closeDuplicateSockets(result.value.id, ws);
        ws.serializeAttachment({ playerId: result.value.id } satisfies Attachment);
        this.sendTo(ws, { t: 'joined', you: result.value.id });
        await this.save();
        await this.broadcast();
        return;
      }
      case 'start': {
        if (!playerId) return;
        const result = startGame(room, playerId, Date.now());
        if (!result.ok) {
          this.sendTo(ws, { t: 'error', code: result.error, message: result.message });
          await this.broadcast();
          return;
        }
        this.notify(result.value);
        await this.save();
        await this.broadcast();
        return;
      }
      case 'buzz': {
        if (!playerId) return;
        const result = buzzAction(room, playerId, Date.now());
        if (!result.ok) {
          this.sendTo(ws, { t: 'error', code: result.error, message: result.message });
          await this.broadcast();
          return;
        }
        this.notify(result.value);
        await this.save();
        await this.broadcast();
        return;
      }
      case 'answer': {
        if (!playerId) return;
        const result = answerAction(room, playerId, msg.choice, Date.now());
        if (!result.ok) {
          this.sendTo(ws, { t: 'error', code: result.error, message: result.message });
          await this.broadcast();
          return;
        }
        const p = findPlayer(room, playerId);
        this.notify(
          result.value.correct
            ? `${p?.name ?? 'プレイヤー'} が正解！ +10点`
            : `${p?.name ?? 'プレイヤー'} は不正解… -5点`,
        );
        await this.save();
        await this.broadcast();
        return;
      }
      case 'restart': {
        if (!playerId) return;
        const result = restartGame(room, playerId, Date.now());
        if (!result.ok) {
          this.sendTo(ws, { t: 'error', code: result.error, message: result.message });
          return;
        }
        this.notify(result.value);
        await this.save();
        await this.broadcast();
        return;
      }
      default:
        return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleDisconnect(ws);
  }

  private async handleDisconnect(ws: WebSocket): Promise<void> {
    const room = this.room;
    if (!room) return;
    const attachment = ws.deserializeAttachment() as Attachment | null;
    const playerId = attachment?.playerId ?? null;
    if (!playerId) return;
    // 同じプレイヤーの他の接続が残っているなら「切断」扱いにしない
    const stillConnected = this.ctx.getWebSockets().some((other) => {
      if (other === ws) return false;
      const attachment = other.deserializeAttachment() as Attachment | null;
      if (attachment?.playerId !== playerId) return false;
      // すでに閉じているソケットは「接続中」とみなさない
      const readyState = (other as unknown as { readyState?: number }).readyState;
      return readyState === undefined || readyState === 0 || readyState === 1;
    });
    if (stillConnected) return;
    setConnected(room, playerId, false);
    await this.save();
    await this.broadcast();
  }

  async alarm(): Promise<void> {
    const room = this.room;
    if (!room) return;
    if (tick(room, Date.now())) {
      await this.save();
      await this.broadcast();
    }
    await this.scheduleAlarm();
  }

  private closeSocket(ws: WebSocket, code: number, reason: string): void {
    try {
      ws.close(code, reason);
    } catch {
      /* すでに閉じている場合は無視 */
    }
  }

  private closeDuplicateSockets(playerId: string, keep: WebSocket): void {
    for (const other of this.ctx.getWebSockets()) {
      if (other === keep) continue;
      const attachment = other.deserializeAttachment() as Attachment | null;
      if (attachment?.playerId === playerId) {
        this.closeSocket(other, 4000, 'replaced');
      }
    }
  }

  private notify(message: string): void {
    for (const ws of this.ctx.getWebSockets()) {
      this.sendTo(ws, { t: 'notice', message });
    }
  }

  private sendTo(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      /* ignore */
    }
  }

  /** 参加者全員に（本人用の情報を添えて）最新状態を配信する */
  private async broadcast(): Promise<void> {
    const room = this.room;
    if (!room) return;
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      this.sendTo(ws, this.buildState(room, attachment?.playerId ?? null));
    }
    await this.scheduleAlarm();
  }

  private buildState(room: RoomState, you: string | null): StateMessage {
    const now = Date.now();
    const inGame = room.phase === 'question' || room.phase === 'feedback' || room.phase === 'reveal';
    const question = inGame
      ? {
          index: room.questionIndex,
          total: QUESTION_COUNT,
          text: QUESTIONS[room.questionIndex].text,
          options: QUESTIONS[room.questionIndex].options,
          explanation: QUESTIONS[room.questionIndex].explanation,
        }
      : null;
    const isAnswerer = you !== null && room.answererId === you;
    return {
      t: 'state',
      code: room.code,
      phase: room.phase,
      you,
      hostId: room.hostId,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: p.connected,
        answered: p.answered,
        isAnswerer: p.isAnswerer,
        queued: p.queued,
        lastCorrect: p.lastCorrect,
        lastChoice: p.lastChoice,
        isHost: room.hostId === p.id,
      })),
      question,
      answererId: room.answererId,
      answerRemainingMs: isAnswerer && room.answerDeadline !== null ? Math.max(0, room.answerDeadline - now) : null,
      questionRemainingMs: inGame ? Math.max(0, room.questionDeadline - now) : 0,
      questionDeadline: room.questionDeadline,
      answerDeadline: room.answerDeadline,
      revealCorrectIndex: room.phase === 'reveal' ? room.correctIndex : null,
      lastAnswererId: room.lastAnswererId,
      lastChoice: room.lastChoice,
      phaseRemainingMs:
        room.nextAt !== null && (room.phase === 'feedback' || room.phase === 'reveal') ? Math.max(0, room.nextAt - now) : null,
      everyoneAnswered: everyoneAnswered(room),
      serverNow: now,
      ranking: ranking(room),
    };
  }

  private async scheduleAlarm(): Promise<void> {
    const room = this.room;
    if (!room) return;
    const at = nextDeadline(room, Date.now());
    if (at === null) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(at);
  }

  /**
   * 状態を保存する。短時間に複数の変更が重なった場合は 1 回にまとめて書き込む。
   * ローカル開発では複数の部屋が同じ SQLite ファイルを使うため、
   * 一時的に "database is locked" になることがあるが、軽くリトライして保存する。
   */
  private async save(): Promise<void> {
    if (!this.room) return;
    this.version += 1;
    if (!this.pendingSave) {
      this.pendingSave = this.writeLoop().finally(() => {
        this.pendingSave = null;
      });
    }
    await this.pendingSave;
  }

  private async writeLoop(): Promise<void> {
    for (;;) {
      const version = this.version;
      // 短時間に連続する変更は 1 回にまとめる（書き込みの競合を減らす）
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (version !== this.version) continue;
      const snapshot = this.room;
      if (!snapshot) return;
      let saved = false;
      for (let attempt = 0; attempt < 6 && !saved; attempt++) {
        try {
          await this.ctx.storage.put(STORAGE_KEY, snapshot);
          saved = true;
        } catch (err) {
          console.warn('room state の保存に失敗しました（リトライします）', attempt + 1, err);
          await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
        }
      }
      if (!saved) console.error('room state の保存に失敗しました');
      // 書き込み中にさらに変更があれば、最新状態を書き直す
      if (version === this.version) return;
    }
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
