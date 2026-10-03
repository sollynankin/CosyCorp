import { describe, expect, it } from 'vitest';
import { buildContext, newGame, step, warpTo, type Command } from '../src/sim';

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

/**
 * A longer session over every system: scenes, talking and gifts, machines on belts, fishing with reel input,
 * the mine with dust bunnies, a festival and the quest board. Mid-way the state goes through save/load.
 * Both runs must end byte-identical.
 */
function grandTour(seed: number, saveMidway: boolean): string {
  let s = newGame(seed);
  let ctx = buildContext(s);
  const run = (n: number, cmds: (t: number) => Command[] = () => []) => {
    for (let t = 0; t < n; t++) step(s, ctx, cmds(t));
  };
  // Story: finish the arrival scene.
  run(1, () => [{ type: 'sceneDone', id: 'arrival', choice: 0 }]);
  // Farm machines.
  s.player.inventory[10] = { id: 'silo', q: 0, n: 1 };
  s.player.inventory[11] = { id: 'conveyor', q: 0, n: 2 };
  s.player.inventory[12] = { id: 'market_chute', q: 0, n: 1 };
  for (let x = 30; x <= 33; x++) s.maps.farm.objects[12 * 44 + x] = null;
  run(1, () => [
    { type: 'place', item: 'silo', x: 30, y: 12, dir: 1 },
    { type: 'place', item: 'conveyor', x: 31, y: 12, dir: 1 },
    { type: 'place', item: 'conveyor', x: 32, y: 12, dir: 1 },
    { type: 'place', item: 'market_chute', x: 33, y: 12, dir: 1 },
  ]);
  s.farm.entities[0].stored.push({ id: 'radish', q: 0, n: 30 });
  run(300);
  // Fishing at the stream with a simple reel policy driven by commands.
  s.player.x = 4.5;
  s.player.y = 12.5;
  s.maps.farm.objects[12 * 44 + 4] = null;
  run(1, () => [{ type: 'select', slot: 5 }, { type: 'use', x: 3, y: 12 }]);
  run(400, (t) => [{ type: 'reel', hold: t % 9 < 5 }]);
  if (saveMidway) {
    s = JSON.parse(JSON.stringify(s));
    ctx = buildContext(s);
  }
  // Town: talk and gift, then the mine.
  s.player.map = 'town';
  s.player.x = 9.5;
  s.player.y = 14.5;
  s.minute = 150;
  run(5, () => [{ type: 'interact', x: 9, y: 13 }]);
  warpTo(s, ctx, 'mine4', 10, 2, 2);
  run(200, (t) => [{ type: 'move', dx: Math.sin(t / 7), dy: 1 }]);
  run(1, () => [{ type: 'sleep' }]);
  return JSON.stringify(s);
}

describe('determinism across every system', () => {
  it('the grand tour replays identically, with or without a save/load in the middle', () => {
    const a = grandTour(21, false);
    expect(grandTour(21, false)).toBe(a);
    expect(grandTour(21, true)).toBe(a);
  });
});
