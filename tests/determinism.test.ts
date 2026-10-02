import { describe, expect, it } from 'vitest';
import { buildContext, newGame, step, type Command } from '../src/sim';

/** A scripted session: walk, swing tools, wait. Same seed + same commands must give identical state. */
function play(seed: number): string {
  const s = newGame(seed);
  const ctx = buildContext(s);
  const script: Command[][] = [];
  for (let t = 0; t < 600; t++) {
    const cmds: Command[] = [];
    if (t < 40) cmds.push({ type: 'move', dx: 1, dy: 0.3 });
    else if (t < 80) cmds.push({ type: 'move', dx: 0, dy: 1 });
    if (t % 25 === 0) cmds.push({ type: 'select', slot: (t / 25) % 5 });
    if (t % 25 === 1) cmds.push({ type: 'use', x: Math.floor(s.player.x) + 1, y: Math.floor(s.player.y) });
    script.push(cmds);
  }
  for (let day = 0; day < 3; day++) {
    for (const cmds of script) step(s, ctx, cmds);
    step(s, ctx, [{ type: 'sleep' }]);
  }
  return JSON.stringify(s);
}

describe('determinism', () => {
  it('same seed and commands give identical state', () => {
    expect(play(7)).toBe(play(7));
  });
  it('different seeds diverge (weather, quality rolls)', () => {
    expect(play(7)).not.toBe(play(8));
  });
  it('state survives a JSON round trip mid-game and continues identically', () => {
    const a = newGame(3);
    const ctxA = buildContext(a);
    for (let t = 0; t < 200; t++) step(a, ctxA, [{ type: 'move', dx: 1, dy: 0 }]);
    const b = JSON.parse(JSON.stringify(a));
    const ctxB = buildContext(b);
    for (let t = 0; t < 300; t++) {
      step(a, ctxA, [{ type: 'move', dx: 0, dy: 1 }]);
      step(b, ctxB, [{ type: 'move', dx: 0, dy: 1 }]);
    }
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});
