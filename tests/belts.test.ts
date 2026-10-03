// Belt model (DESIGN.md §5): throughput caps, backpressure, merges, splitters, order independence.
import { describe, expect, it } from 'vitest';
import { CROP_BALANCE, MACHINE_BALANCE } from '../src/data/balance';
import { entityAt, soilAt, storedCount } from '../src/sim';
import { build, runFactory, sandbox, soil, stock, type Sandbox } from './helpers';

const Y = 12;

/** silo → n conveyors → chute along row Y, starting at x0. */
function line(sb: Sandbox, belt: string, n: number, items = 200, x0 = 30) {
  const silo = build(sb, 'silo', x0, Y, 1);
  stock(silo, 'radish', items);
  for (let k = 1; k <= n; k++) build(sb, belt, x0 + k, Y, 1);
  build(sb, 'market_chute', x0 + n + 1, Y, 1);
  return silo;
}

describe('belt throughput', () => {
  it('a Conveyor carries one item per entryInterval, arriving after travelMinutes', () => {
    const sb = sandbox();
    line(sb, 'conveyor', 1);
    // Entries at steps 0, 3, 6, ...; item k is sold at step 3k + 6. Steps 0..59 → k = 0..17.
    runFactory(sb, 60);
    expect(sb.s.today.sold.radish).toBe(18);
  });

  it('each extra Conveyor adds travel time but not throughput loss', () => {
    const sb = sandbox();
    line(sb, 'conveyor', 2);
    // Item k sold at 3k + 12. Steps 0..59 → k = 0..15.
    runFactory(sb, 60);
    expect(sb.s.today.sold.radish).toBe(16);
  });

  it('a Swift Conveyor triples the cap', () => {
    const sb = sandbox();
    line(sb, 'swift_conveyor', 1);
    // Item k enters at step k, sold at k + 2. Steps 0..59 → 58 items.
    runFactory(sb, 60);
    expect(sb.s.today.sold.radish).toBe(58);
    const slow = MACHINE_BALANCE.conveyor.entryInterval! / MACHINE_BALANCE.swift_conveyor.entryInterval!;
    expect(slow).toBe(3);
  });
});

describe('backpressure', () => {
  it('a full receiver stops the line; belts fill to capacity and never exceed it', () => {
    const sb = sandbox();
    const src = build(sb, 'silo', 30, Y, 1);
    stock(src, 'radish', 100);
    const c1 = build(sb, 'conveyor', 31, Y, 1);
    const c2 = build(sb, 'conveyor', 32, Y, 1);
    const dst = build(sb, 'silo', 33, Y, 1);
    stock(dst, 'carrot', MACHINE_BALANCE.silo.capacity!);
    const cap = MACHINE_BALANCE.conveyor.capacity!;
    runFactory(sb, 120, () => {
      expect(c1.belt.length).toBeLessThanOrEqual(cap);
      expect(c2.belt.length).toBeLessThanOrEqual(cap);
    });
    expect(c1.belt.length).toBe(cap);
    expect(c2.belt.length).toBe(cap);
    expect(storedCount(src)).toBe(100 - 2 * cap);
    expect(sb.s.today.entities[String(c2.id)].blocked).toBeGreaterThan(0);
    expect(storedCount(dst)).toBe(MACHINE_BALANCE.silo.capacity!);

    // Make room downstream: the jam clears and items flow again, nothing lost.
    dst.stored[0].n -= 10;
    runFactory(sb, 60);
    expect(storedCount(dst)).toBe(MACHINE_BALANCE.silo.capacity!);
    expect(storedCount(src) + c1.belt.length + c2.belt.length + dst.stored.filter((s) => s.id === 'radish').reduce((a, s) => a + s.n, 0)).toBe(100);
  });

  it('a harvester with nowhere to put things fills its buffer and reports blocked', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, Y, 1);
    const h = build(sb, 'harvester', 7, Y, 1);
    const ripe: [number, number][] = [[5, Y - 2], [6, Y - 2], [7, Y - 2], [8, Y - 2], [9, Y - 2], [5, Y + 2], [6, Y + 2]];
    for (const [x, y] of ripe) soil(sb.s, x, y, 'radish', CROP_BALANCE.radish.growthDays);
    runFactory(sb, 60);
    expect(h.output.length).toBe(MACHINE_BALANCE.harvester.outputBuffer);
    expect(h.status).toBe('blocked');
    expect(ripe.filter(([x, y]) => soilAt(sb.s, x, y)!.crop).length).toBe(1);
  });

  it('a machine outside power coverage is unpowered', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, Y, 1);
    const h = build(sb, 'harvester', 30, Y, 1);
    expect(sb.ctx.power.entityFactor[h.id]).toBe(0);
    runFactory(sb, 5);
    expect(h.status).toBe('unpowered');
  });
});

describe('merges and splitters', () => {
  it('two sources into one belt alternate fairly', () => {
    const sb = sandbox();
    const a = build(sb, 'silo', 30, Y, 1);
    stock(a, 'radish', 50);
    const b = build(sb, 'silo', 31, Y + 1, 0);
    stock(b, 'carrot', 50);
    build(sb, 'conveyor', 31, Y, 1);
    build(sb, 'market_chute', 32, Y, 1);
    runFactory(sb, 60);
    // Same cap as one source: 18 items, shared 9 / 9.
    expect(sb.s.today.sold.radish).toBe(9);
    expect(sb.s.today.sold.carrot).toBe(9);
  });

  it('head-on belts do not connect', () => {
    const sb = sandbox();
    const silo = build(sb, 'silo', 29, Y, 1);
    stock(silo, 'radish', 10);
    const east = build(sb, 'conveyor', 30, Y, 1);
    const west = build(sb, 'conveyor', 31, Y, 3);
    runFactory(sb, 30);
    expect(east.belt.length).toBe(3);
    expect(west.belt.length).toBe(0);
  });

  it('a splitter deals front → right → left and skips a full output', () => {
    const sb = sandbox();
    const src = build(sb, 'silo', 30, Y, 1);
    stock(src, 'radish', 30);
    build(sb, 'splitter', 31, Y, 1);
    const front = build(sb, 'silo', 32, Y, 1);
    const right = build(sb, 'silo', 31, Y + 1, 2);
    const left = build(sb, 'silo', 31, Y - 1, 0);
    runFactory(sb, 3);
    // First item enters at step 0 and leaves at step 2 to the front.
    expect(storedCount(front)).toBe(1);
    runFactory(sb, 60);
    expect([storedCount(front), storedCount(right), storedCount(left)]).toEqual([10, 10, 10]);

    // Front full: items alternate right / left.
    stock(src, 'carrot', 20);
    stock(front, 'radish', MACHINE_BALANCE.silo.capacity! - storedCount(front));
    runFactory(sb, 60);
    expect([storedCount(right), storedCount(left)]).toEqual([20, 20]);
  });

  it('the result does not depend on entity id order', () => {
    const run = (reverse: boolean) => {
      const sb = sandbox();
      const parts: [string, number, number, 0 | 1 | 2 | 3][] = [
        ['silo', 30, Y, 1], ['silo', 31, Y + 1, 0], ['silo', 31, Y - 1, 2],
        ['conveyor', 31, Y, 1], ['conveyor', 32, Y, 1], ['splitter', 33, Y, 1],
        ['market_chute', 34, Y, 1], ['conveyor', 33, Y + 1, 2], ['market_chute', 33, Y + 2, 1], ['silo', 33, Y - 1, 0],
      ];
      for (const [t, x, y, d] of reverse ? [...parts].reverse() : parts) build(sb, t, x, y, d);
      stock(entityAt(sb.s, 30, Y)!, 'radish', 60);
      stock(entityAt(sb.s, 31, Y + 1)!, 'carrot', 60);
      stock(entityAt(sb.s, 31, Y - 1)!, 'beetroot', 60);
      runFactory(sb, 300);
      const tiles = parts.map(([, x, y]) => {
        const e = entityAt(sb.s, x, y)!;
        return [e.belt.map((b) => `${b.item}:${b.age}`), e.stored];
      });
      return { sold: sb.s.today.sold, tiles };
    };
    expect(run(true)).toEqual(run(false));
  });
});
