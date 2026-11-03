import { describe, expect, it } from 'vitest';
import {
  addPlayer,
  answer,
  buzz,
  createLobby,
  publicState,
  startGame,
  tick,
  type GameState,
} from '../../src/game';

const order = Array.from({ length: 10 }, (_, index) => index);

function lobby(size = 4): GameState {
  let state = createLobby('ABC123', { id: 'p1', name: 'Player 1', token: 'secret1' }, 0);
  for (let index = 2; index <= size; index += 1) {
    const result = addPlayer(state, { id: `p${index}`, name: `Player ${index}`, token: `secret${index}` });
    if (result.ok) state = result.state;
  }
  return state;
}

function permutations<T>(values: T[]): T[][] {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, current) => current !== index)).map((rest) => [value, ...rest]),
  );
}

describe('room and game rules', () => {
  it('accepts four players and rejects a fifth with a clear reason', () => {
    const full = lobby();
    const result = addPlayer(full, { id: 'p5', name: 'Player 5', token: 'secret5' });
    expect(result).toEqual({ ok: false, error: '満員です（4人まで）' });
  });

  it('allows only the host to start with two through four players', () => {
    const two = lobby(2);
    expect(startGame(two, 'p2', 0, order).ok).toBe(false);
    expect(startGame(two, 'p1', 0, order).ok).toBe(true);
    expect(startGame(lobby(1), 'p1', 0, order).ok).toBe(false);
    expect(startGame(lobby(), 'p1', 0, order).ok).toBe(true);
    const active = startGame(two, 'p1', 0, order);
    if (!active.ok) throw new Error(active.error);
    expect(addPlayer(active.state, { id: 'p3', name: 'Player 3', token: 'secret3' })).toEqual({
      ok: false,
      error: 'ゲームはもう始まっています',
    });
  });

  it('grants exactly one answer right for every ordering of four simultaneous buzzes', () => {
    const game = startGame(lobby(), 'p1', 0, order);
    if (!game.ok) throw new Error(game.error);
    for (const sequence of permutations(['p1', 'p2', 'p3', 'p4'])) {
      let state = game.state;
      for (const playerId of sequence) {
        const result = buzz(state, playerId, 1, 100);
        if (result.ok) state = result.state;
      }
      expect(state.phase).toBe('answering');
      expect(state.answererId).toBe(sequence[0]);
    }
  });

  it('scores correct and incorrect answers and removes a wrong answerer from this question', () => {
    const started = startGame(lobby(), 'p1', 0, order);
    if (!started.ok) throw new Error(started.error);
    const pressed = buzz(started.state, 'p1', 1, 1);
    if (!pressed.ok) throw new Error(pressed.error);
    const wrong = answer(pressed.state, 'p1', 1, 1, 2, 0);
    if (!wrong.ok) throw new Error(wrong.error);
    expect(wrong.state.players.p1.score).toBe(-5);
    expect(wrong.state.eliminated).toContain('p1');
    expect(buzz(wrong.state, 'p1', 1, 3).ok).toBe(false);
    const nextPress = buzz(wrong.state, 'p2', 1, 4);
    if (!nextPress.ok) throw new Error(nextPress.error);
    const correct = answer(nextPress.state, 'p2', 1, 0, 4, 0);
    expect(correct.ok && correct.state.players.p2.score).toBe(10);
  });

  it('scores an unanswered claim at ten seconds and ends the question at twenty', () => {
    const started = startGame(lobby(), 'p1', 0, order);
    if (!started.ok) throw new Error(started.error);
    const pressed = buzz(started.state, 'p1', 1, 100);
    if (!pressed.ok) throw new Error(pressed.error);
    const timedOut = tick(pressed.state, 10_100);
    expect(timedOut.players.p1.score).toBe(-5);
    expect(timedOut.phase).toBe('question');
    expect(tick(started.state, 20_000).phase).toBe('reveal');
    expect(tick(pressed.state, 20_000).phase).toBe('reveal');
  });

  it('reveals when every player is eliminated and finishes after ten questions', () => {
    const started = startGame(lobby(2), 'p1', 0, order);
    if (!started.ok) throw new Error(started.error);
    const p1 = buzz(started.state, 'p1', 1, 1);
    if (!p1.ok) throw new Error(p1.error);
    const p1wrong = answer(p1.state, 'p1', 1, 1, 1, 0);
    if (!p1wrong.ok) throw new Error(p1wrong.error);
    const p2 = buzz(p1wrong.state, 'p2', 1, 2);
    if (!p2.ok) throw new Error(p2.error);
    const bothWrong = answer(p2.state, 'p2', 1, 2, 2, 0);
    expect(bothWrong.ok && bothWrong.state.phase).toBe('reveal');

    let state = started.state;
    for (let question = 0; question < 10; question += 1) {
      state = tick(state, state.questionDeadline ?? 0);
      state = tick(state, state.revealUntil ?? 0);
    }
    expect(state.phase).toBe('finished');
    expect(publicState(state, 'p1', 300_000).players.map((player) => player.rank)).toEqual([1, 1]);
  });

  it('never sends the answer while a question is active', () => {
    const started = startGame(lobby(), 'p1', 0, order);
    if (!started.ok) throw new Error(started.error);
    expect(publicState(started.state, 'p1', 0).correctChoice).toBeUndefined();
    const reveal = tick(started.state, 20_000);
    expect(publicState(reveal, 'p1', 20_000).correctChoice).toBeDefined();
  });
});
