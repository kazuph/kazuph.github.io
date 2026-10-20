/**
 * Durable Object レベルの結合テスト（Workers ランタイム上で実行）
 *
 * - 部屋の永続化（DO を evict しても状態が残る）
 * - アラームによる自動進行
 * - DO のメッセージハンドラ（join / start / buzz / answer）の挙動
 *
 * 注意点: この環境ではテストランナーから worker への HTTP プロキシ
 * （miniflare の fetch プロキシ）が使えないため、worker の fetch ハンドラを
 * 直接呼び出して検証する。
 */

import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import worker from '../../src/worker';
import { QUESTIONS } from '../../src/questions';

const stubOf = (code: string) => env.ROOM.getByName(code);

/** 本番と同じ hibernation API でソケットを受け入れる */
function makeSocket(state: DurableObjectState): WebSocket {
  const pair = new WebSocketPair();
  const server = pair[1];
  state.acceptWebSocket(server);
  return server;
}

async function callWorker(request: Request): Promise<Response> {
  return worker.fetch(request, env as any);
}

describe('Worker の HTTP API', () => {
  it('POST /api/rooms で部屋コードが発行される', async () => {
    const res = await callWorker(new Request('http://localhost/api/rooms', { method: 'POST' }));
    const data = (await res.json()) as { ok: boolean; code: string };
    expect(data.ok).toBe(true);
    expect(data.code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('存在しない部屋コードは 404', async () => {
    const res = await callWorker(new Request('http://localhost/api/rooms/ZZZZZZ'));
    expect(res.status).toBe(404);
  });

  it('作った部屋は照会できる', async () => {
    const created = (await (
      await callWorker(new Request('http://localhost/api/rooms', { method: 'POST' }))
    ).json()) as { code: string };
    const res = await callWorker(new Request(`http://localhost/api/rooms/${created.code}`));
    const data = (await res.json()) as { ok: boolean; code: string; phase: string };
    expect(data.ok).toBe(true);
    expect(data.code).toBe(created.code);
    expect(data.phase).toBe('lobby');
  });
});

describe('Durable Object の状態', () => {
  it('部屋の状態がストレージに保存される（DO が再起動しても復元できる）', async () => {
    const stub = stubOf('WSAVE1');
    await stub.fetch(new Request('https://room/create?code=WSAVE1'));

    await (runInDurableObject as any)(stub, async (instance: any, state: DurableObjectState) => {
      // 1 プレイヤー = 1 ソケット（本番の WebSocket と同じ構成）
      const p1 = makeSocket(state);
      const p2 = makeSocket(state);
      await instance.webSocketMessage(p1, JSON.stringify({ t: 'join', id: 'p1', name: 'いち' }));
      await instance.webSocketMessage(p2, JSON.stringify({ t: 'join', id: 'p2', name: 'に' }));
    });

    const before = await (runInDurableObject as any)(stub, (instance: any) => instance.getRoom());
    expect(before.players).toHaveLength(2);
    expect(before.hostId).toBe('p1');

    // 永続ストレージに状態が保存されている（DO が再起動してもここから復元される）
    const stored = (await (runInDurableObject as any)(stub, async (instance: any, state: DurableObjectState) => {
      return (await state.storage.get('room')) as any;
    })) as any;
    expect(stored.players).toHaveLength(2);
    expect(stored.players[0].name).toBe('いち');
    expect(stored.hostId).toBe('p1');
  });

  it('DO のメッセージハンドラで join / start / buzz / answer が処理される', async () => {
    const stub = stubOf('WMSG01');
    await stub.fetch(new Request('https://room/create?code=WMSG01'));

    await (runInDurableObject as any)(stub, async (instance: any, state: DurableObjectState) => {
      const sockets = [makeSocket(state), makeSocket(state), makeSocket(state), makeSocket(state), makeSocket(state)];
      const send = (i: number, msg: unknown) => instance.webSocketMessage(sockets[i], JSON.stringify(msg));

      await send(0, { t: 'join', id: 'p1', name: 'いち' });
      await send(1, { t: 'join', id: 'p2', name: 'に' });
      await send(2, { t: 'join', id: 'p3', name: 'さん' });
      // 4人目は参加できる
      await send(3, { t: 'join', id: 'p4', name: 'よん' });
      // 5人目は拒否される（room_full）
      await send(4, { t: 'join', id: 'p5', name: 'ご' });
      const room = instance.getRoom();
      expect(room.players).toHaveLength(4);

      // ホスト（1人目）だけが開始できる
      await send(1, { t: 'start' });
      expect(instance.getRoom().phase).toBe('lobby');
      await send(0, { t: 'start' });
      expect(instance.getRoom().phase).toBe('question');

      // 先に届いた 1 人だけが回答権を持つ
      await send(0, { t: 'buzz' });
      await send(1, { t: 'buzz' });
      expect(instance.getRoom().answererId).toBe('p1');

      // 正解なら +10 点
      await send(0, { t: 'answer', choice: QUESTIONS[0].correct });
      expect(instance.getRoom().players[0].score).toBe(10);
      expect(instance.getRoom().phase).toBe('reveal');
    });
  });

  it('アラームが鳴ると経過時間に従って自動進行する', async () => {
    const stub = stubOf('WALRM1');
    await stub.fetch(new Request('https://room/create?code=WALRM1'));

    await (runInDurableObject as any)(stub, async (instance: any, state: DurableObjectState) => {
      const p1 = makeSocket(state);
      const p2 = makeSocket(state);
      await instance.webSocketMessage(p1, JSON.stringify({ t: 'join', id: 'p1', name: 'いち' }));
      await instance.webSocketMessage(p2, JSON.stringify({ t: 'join', id: 'p2', name: 'に' }));
      await instance.webSocketMessage(p1, JSON.stringify({ t: 'start' }));
      // 問題の締切を過去にずらす（タイマー発火を再現）
      instance.getRoom().questionDeadline = Date.now() - 1;
    });

    // 登録済みのアラームを即座に実行する
    const ran = await runDurableObjectAlarm(stub);
    expect(ran).toBe(true);

    const room = await (runInDurableObject as any)(stub, (instance: any) => instance.getRoom());
    expect(room.phase).toBe('reveal');
    expect(room.correctIndex).not.toBeNull();
  });
});
