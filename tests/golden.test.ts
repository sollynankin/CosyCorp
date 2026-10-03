// Golden layout: one full day of a fixed factory must earn an exact number of coins.
//
// If this fails, find out why (CLAUDE.md rule 7). If a rule or balance number changed on purpose,
// re-derive the numbers below by hand, update the derivation and say so in your summary.
//
// Everything sells through Market Chutes (instant, AUTO_SELL_MULT = 0.9, quality 0 throughout so the
// RNG never matters). A day is factory steps 0..1199.
//
// Line A, merge cap: silo A (radish, enters the conveyor from W) and silo B (carrot, from S) feed one
//   Conveyor into a chute. The conveyor takes one item per 3 steps, at steps 0, 3, 6, ...; item k is sold
//   at step 3k + 6, so k = 0..397 sell: 398 items. Round robin starts after side N (inRR = 0): S wins
//   first, then W, alternating, so 199 carrots and 199 radishes.
//   199 × round(40 × 0.9) + 199 × round(30 × 0.9) = 199 × 36 + 199 × 27 = 12 537.
//   Items k = 398, 399 (entered at steps 1194, 1197) are still on the belt at night and spoil: 2 spoiled.
//   Each silo gave 200 of its 240.
// Line B, power-limited crafting: Water Wheel (supply 12) powers a Jam Press (4), a Harvester (3) and two
//   Heaters (4 + 4): demand 15, factor 0.8. Silo P (30 strawberries) → Conveyor → Jam Press → chute.
//   Strawberries reach the press at steps 6, 9, 12; the first jam starts at step 13 and takes
//   60 / 0.8 = 75 steps (done at step 87); each later jam starts as the last ends (the buffer refills in
//   9 steps), so jam k is done at step 75k + 12. All 10 jams (k ≤ 10, step 762) sell:
//   10 × round(230 × 0.9) = 10 × 207 = 2 070.
// Line C, harvester: the Harvester sits next to a honeypear tree with 3 fruit (quality 0). Work 4 at
//   factor 0.8 takes 5 steps; it outputs 3 pears straight into a chute, one per step:
//   3 × round(120 × 0.9) = 3 × 108 = 324.
// Total: 12 537 + 2 070 + 324 = 14 931 coins. Crafted 10. Score = 14 931 + 5 × 10 − 3 × 2 = 14 975.
import { describe, expect, it } from 'vitest';
import { endDay, storedCount } from '../src/sim';
import { build, sandbox, stock } from './helpers';

describe('golden layout', () => {
  it('earns exactly 14 931 coins in one day', () => {
    const sb = sandbox(7);
    const { s } = sb;
    // Line A (east of the yard).
    const a = build(sb, 'silo', 30, 12, 1);
    stock(a, 'radish', 240);
    const b = build(sb, 'silo', 31, 13, 0);
    stock(b, 'carrot', 240);
    build(sb, 'conveyor', 31, 12, 1);
    build(sb, 'market_chute', 32, 12, 1);
    // Line B (by the stream).
    build(sb, 'water_wheel', 4, 12, 1);
    const p = build(sb, 'silo', 5, 11, 1);
    stock(p, 'strawberry', 30);
    build(sb, 'conveyor', 6, 11, 1);
    build(sb, 'jam_press', 7, 11, 2);
    build(sb, 'market_chute', 7, 12, 1);
    build(sb, 'heater', 5, 14, 1);
    build(sb, 'heater', 6, 14, 1);
    // Line C.
    s.maps.farm.objects[10 * 44 + 8] = { kind: 'orchard', tree: 'honeypear', age: 99, fruit: 3 };
    build(sb, 'harvester', 7, 9, 1);
    build(sb, 'market_chute', 8, 9, 1);

    expect(sb.ctx.power.factor).toBe(0.8);
    const coins0 = s.player.coins;
    endDay(s, sb.ctx, false);
    const r = s.report!;
    expect(r.stats.sold).toEqual({ carrot: 199, radish: 199, strawberry_jam: 10, honeypear: 3 });
    expect(r.stats.coinsChute).toBe(14_931);
    expect(s.player.coins - coins0).toBe(14_931);
    expect(r.stats.crafted).toBe(10);
    expect(r.stats.spoiled).toBe(2);
    expect(r.score).toBe(14_975);
    expect([storedCount(a), storedCount(b), storedCount(p)]).toEqual([40, 40, 0]);
    // The press is the bottleneck of line B, so its feed belt jams and the report says so.
    expect(r.notes.some((n) => n.includes('Conveyor at (6, 11) was jammed'))).toBe(true);
  });
});
