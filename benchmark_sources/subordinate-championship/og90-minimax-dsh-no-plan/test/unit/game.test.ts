import { describe, expect, it } from 'vitest';
import {
  ANSWER_MS,
  MAX_PLAYERS,
  QUESTION_COUNT,
  QUESTION_MS,
  REVEAL_MS,
  SCORE_CORRECT,
  SCORE_WRONG,
  answer,
  buzz,
  canStart,
  createRoom,
  joinRoom,
  ranking,
  restartGame,
  startGame,
  tick,
} from '../../src/game';
import { QUESTIONS } from '../../src/questions';
import type { RoomState } from '../../src/types';

const T0 = 1_700_000_000_000;

function roomWith(players: number): RoomState {
  const room = createRoom('TEST01', T0);
  for (let i = 0; i < players; i++) {
    joinRoom(room, `p${i + 1}`, `プレイヤー${i + 1}`, T0);
  }
  return room;
}

describe('問題バンク', () => {
  it('10問が内蔵されている', () => {
    expect(QUESTIONS).toHaveLength(QUESTION_COUNT);
  });

  it('すべて4択で、正解の index が範囲内', () => {
    for (const q of QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(4);
    }
  });

  it('選択肢の重複がない', () => {
    for (const q of QUESTIONS) {
      expect(new Set(q.options).size).toBe(4);
    }
  });
});

describe('参加（joinRoom）', () => {
  it('4人まで参加できる', () => {
    const room = roomWith(4);
    expect(room.players).toHaveLength(4);
    expect(room.players[0].name).toBe('プレイヤー1');
  });

  it('5人目は入れず、理由が返る', () => {
    const room = roomWith(4);
    const result = joinRoom(room, 'p5', 'もう1人', T0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('room_full');
      expect(result.message).toContain('4人まで');
    }
    expect(room.players).toHaveLength(4);
  });

  it('最初に参加した人がホストになる', () => {
    const room = roomWith(3);
    expect(room.hostId).toBe('p1');
  });

  it('同じトークンで再参加すると点数を保ったまま復帰する', () => {
    const room = roomWith(2);
    room.players[0].score = 30;
    room.players[0].connected = false;
    const result = joinRoom(room, 'p1', 'プレイヤー1', T0 + 1000);
    expect(result.ok).toBe(true);
    expect(room.players[0].score).toBe(30);
    expect(room.players[0].connected).toBe(true);
    expect(room.players).toHaveLength(2);
  });
});

describe('開始（startGame）', () => {
  it('ホストだけが開始できる', () => {
    const room = roomWith(2);
    const result = startGame(room, 'p2', T0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('not_host');
    expect(room.phase).toBe('lobby');
  });

  it('2人未満では開始できない', () => {
    const room = roomWith(1);
    expect(canStart(room).ok).toBe(false);
    const result = startGame(room, 'p1', T0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('not_enough_players');
  });

  it('2〜4人で開始できる（第1問から始まる）', () => {
    const room = roomWith(3);
    const result = startGame(room, 'p1', T0);
    expect(result.ok).toBe(true);
    expect(room.phase).toBe('question');
    expect(room.questionIndex).toBe(0);
    expect(room.questionDeadline).toBe(T0 + QUESTION_MS);
  });
});

describe('早押し（buzz）', () => {
  it('サーバーが最初に受け取った1人だけが回答権を得る', () => {
    const room = roomWith(4);
    startGame(room, 'p1', T0);
    const first = buzz(room, 'p3', T0 + 100);
    const second = buzz(room, 'p1', T0 + 101);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(room.answererId).toBe('p3');
    expect(room.answerDeadline).toBe(T0 + 100 + ANSWER_MS);
    // 2人目は順番待ち
    expect(room.buzzQueue).toEqual(['p1']);
    expect(room.players.find((p) => p.id === 'p1')!.queued).toBe(true);
  });

  it('回答権を持つ人は2回押せない', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    buzz(room, 'p1', T0 + 10);
    const again = buzz(room, 'p1', T0 + 20);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe('already_answerer');
    expect(room.answererId).toBe('p1');
  });

  it('ロビーでは早押しできない', () => {
    const room = roomWith(2);
    const result = buzz(room, 'p1', T0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('not_buzzing');
  });
});

describe('回答（answer）', () => {
  it('正解は +10 点', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    buzz(room, 'p1', T0 + 10);
    const choice = QUESTIONS[0].correct;
    const result = answer(room, 'p1', choice, T0 + 20);
    expect(result.ok).toBe(true);
    expect(room.players[0].score).toBe(SCORE_CORRECT);
    expect(room.phase).toBe('reveal');
    expect(room.correctIndex).toBe(QUESTIONS[0].correct);
  });

  it('不正解は -5 点', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    buzz(room, 'p1', T0 + 10);
    const wrong = (QUESTIONS[0].correct + 1) % 4;
    answer(room, 'p1', wrong, T0 + 20);
    expect(room.players[0].score).toBe(SCORE_WRONG);
    expect(room.phase).toBe('feedback');
  });

  it('回答権のない人の回答は受け付けない', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    buzz(room, 'p1', T0 + 10);
    const result = answer(room, 'p2', QUESTIONS[0].correct, T0 + 20);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('not_answerer');
    expect(room.players[1].score).toBe(0);
  });

  it('不正解の 사람은その問題で押せなくなる', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    buzz(room, 'p1', T0 + 10);
    answer(room, 'p1', (QUESTIONS[0].correct + 1) % 4, T0 + 20);
    tick(room, T0 + 20 + 2000); // feedback を終えて次の問題へ
    const again = buzz(room, 'p1', T0 + 5000);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe('already_answered');
  });

  it('不正解になると順番待ちの人に回答権が移る', () => {
    const room = roomWith(3);
    startGame(room, 'p1', T0);
    buzz(room, 'p1', T0 + 10);
    buzz(room, 'p2', T0 + 20); // 順番待ち
    answer(room, 'p1', (QUESTIONS[0].correct + 1) % 4, T0 + 30);
    expect(room.phase).toBe('feedback');
    tick(room, T0 + 30 + 2000);
    expect(room.phase).toBe('question');
    expect(room.answererId).toBe('p2');
    expect(room.answerDeadline).toBe(T0 + 30 + 2000 + ANSWER_MS);
  });

  it('10秒以内に答えなければ -5 点（時間切れ）', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    buzz(room, 'p1', T0 + 10);
    tick(room, T0 + 10 + ANSWER_MS + 1);
    expect(room.players[0].score).toBe(SCORE_WRONG);
    expect(room.answererId).toBeNull();
  });
});

describe('自動進行（tick）', () => {
  it('問題から20秒たったら正解を表示して次の問題へ', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    tick(room, T0 + QUESTION_MS + 1);
    expect(room.phase).toBe('reveal');
    expect(room.correctIndex).toBe(QUESTIONS[0].correct);
    tick(room, T0 + QUESTION_MS + 1 + REVEAL_MS + 1);
    expect(room.phase).toBe('question');
    expect(room.questionIndex).toBe(1);
  });

  it('全員が回答したら正解を表示して次の問題へ', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    buzz(room, 'p1', T0 + 10);
    answer(room, 'p1', QUESTIONS[0].correct, T0 + 20);
    tick(room, T0 + 20 + REVEAL_MS + 1);
    expect(room.phase).toBe('question');
    expect(room.questionIndex).toBe(1);
  });

  it('10問終わると最終結果になる', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    for (let i = 0; i < QUESTION_COUNT; i++) {
      // 全員正解して 1 問ずつ進める
      for (const p of room.players) {
        if (!p.answered) {
          buzz(room, p.id, T0);
          answer(room, p.id, QUESTIONS[room.questionIndex].correct, T0 + 1);
        }
      }
      tick(room, T0 + 1 + REVEAL_MS + 1);
    }
    expect(room.phase).toBe('result');
    expect(room.questionIndex).toBe(QUESTION_COUNT - 1);
  });
});

describe('順位（ranking）', () => {
  it('点数の多い順に並ぶ。同点は同順位', () => {
    const room = roomWith(3);
    room.players[0].score = 10;
    room.players[1].score = 20;
    room.players[2].score = 20;
    const r = ranking(room);
    expect(r.map((x) => x.id)).toEqual(['p2', 'p3', 'p1']);
    expect(r[0].rank).toBe(1);
    expect(r[1].rank).toBe(1);
    expect(r[2].rank).toBe(3);
  });
});

describe('やり直し（restartGame）', () => {
  it('ホストが全員のスコアを 0 に戻してロビーへ', () => {
    const room = roomWith(2);
    startGame(room, 'p1', T0);
    room.players[0].score = 50;
    const result = restartGame(room, 'p1', T0);
    expect(result.ok).toBe(true);
    expect(room.phase).toBe('lobby');
    expect(room.players.every((p) => p.score === 0)).toBe(true);
  });
});

describe('定員', () => {
  it('定員は4人', () => {
    expect(MAX_PLAYERS).toBe(4);
  });
});
