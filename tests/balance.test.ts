// Balance pass (HANDOFF task 1): a scripted "reasonable player" (tests/bot.ts) plays two in-game years on
// several seeds, and the pacing it sees is asserted in bands. When a balance edit moves a number outside a
// band, this test is the first thing to say so; re-run with BALANCE_REPORT=1 to print the whole picture.
//
// What the bot is: it farms what pays in season, expands its field as energy and coins allow, upgrades tools,
// builds the machines each beat unlocks, digs for what the quests ask for, hands things in and ships daily.
// What it is not: a cook, angler, herder, forager or festival-goer. Treat its numbers as a floor for a
// player who does the main loop, and as a yardstick: the shape matters more than any single figure.
//
// Findings behind the bands (see HANDOFF.md, "Balance pass"):
//  - The economy compounds quickly: a seed returns 3× its price within a week, so the first fortnight is a
//    bootstrap and the second season is several times the first, whatever the shop prices and tool costs do.
//    Spring to summer therefore sits near 6×, well above the 2-3× the design aimed for. Every knob that was
//    tried (sprinkler and tool costs, seed prices, tool areas, energy costs, crop values, story counts) left
//    that ratio where it was, so the band below documents it rather than hiding it.
//  - From summer on the pace matches the target: summer to autumn is about 3×, and Winter Y1 to Spring Y2
//    about 2×. Winter is the hard season by design and earns roughly half of autumn.
//  - Autumn was the weakest season per tile (no regrowing crop worth planting), so autumn crop values were
//    raised until a full autumn earns about the same as spring.
//  - Every main beat is reachable well before its dated deadline (see QUEST_WINDOWS).
import { beforeAll, describe, expect, it } from 'vitest';
import { dayOf } from '../src/data/quests';
import { Bot, type BotResult } from './bot';

const SEEDS = [3, 5, 8, 11];
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

const runs = new Map<number, BotResult>();

beforeAll(() => {
  for (const seed of SEEDS) runs.set(seed, new Bot(seed).playDays(112));
  if (env.BALANCE_REPORT) {
    for (const [seed, r] of runs) {
      const c = r.seasons.map((x) => x.coins);
      console.log(`seed ${seed}: coins/season ${c.map((v) => `${Math.round(v / 100) / 10}k`).join(' ')}`);
      console.log(`  ratios ${c.slice(1).map((v, i) => (v / c[i]).toFixed(1)).join(' ')}`);
      console.log(`  quests ${Object.entries(r.questDay).map(([k, v]) => `${k}:${v}`).join(' ')}`);
      console.log(`  built ${Object.entries(r.milestones).map(([k, v]) => `${k}:${v}`).join(' ')}`);
      console.log(`  board coins ${r.boardCoins} of ${Math.round(r.coinsEarned)} earned`);
      if (env.BALANCE_REPORT === 'days') console.log(r.log.join('\n'));
    }
  }
}, 120_000);

const each = (fn: (r: BotResult, seed: number) => void) => () => {
  for (const [seed, r] of runs) fn(r, seed);
};

/** Year, season (0..3) → coins earned that season. */
const season = (r: BotResult, year: 1 | 2, s: 0 | 1 | 2 | 3): number => r.seasons[(year - 1) * 4 + s].coins;
const ratio = (a: number, b: number): number => a / b;

describe('coin pacing (bot, 2 years)', () => {
  it('plays all eight seasons', each((r) => expect(r.seasons).toHaveLength(8)));

  it('year 1 spring is a modest bootstrap', each((r, seed) => {
    const spring = season(r, 1, 0);
    expect(spring, `seed ${seed}`).toBeGreaterThan(2_000);
    expect(spring, `seed ${seed}`).toBeLessThan(12_000);
  }));

  // Bootstrap: the first two weeks have little to compound. Far above the 2-3× target, and documented above.
  it('summer is several times spring', each((r, seed) => {
    const x = ratio(season(r, 1, 1), season(r, 1, 0));
    expect(x, `seed ${seed}`).toBeGreaterThan(3.5);
    expect(x, `seed ${seed}`).toBeLessThan(9);
  }));

  // The target: about 2-3× (a little slack either side for weather and the bot's own luck).
  it('autumn is 2-4× summer', each((r, seed) => {
    const x = ratio(season(r, 1, 2), season(r, 1, 1));
    expect(x, `seed ${seed}`).toBeGreaterThan(2);
    expect(x, `seed ${seed}`).toBeLessThan(4);
  }));

  it('winter is the hard season but not a collapse', each((r, seed) => {
    const x = ratio(season(r, 1, 3), season(r, 1, 2));
    expect(x, `seed ${seed}`).toBeGreaterThan(0.25);
    expect(x, `seed ${seed}`).toBeLessThan(1);
  }));

  it('year 2 spring is about twice year 1 winter', each((r, seed) => {
    const x = ratio(season(r, 2, 0), season(r, 1, 3));
    expect(x, `seed ${seed}`).toBeGreaterThan(1.5);
    expect(x, `seed ${seed}`).toBeLessThan(3.5);
  }));

  it('year 2 stays level: no season is under a third of the best, and winter trails autumn', each((r, seed) => {
    const y2 = [0, 1, 2, 3].map((s) => season(r, 2, s as 0 | 1 | 2 | 3));
    expect(Math.min(...y2), `seed ${seed}`).toBeGreaterThan(Math.max(...y2) / 3);
    expect(y2[3], `seed ${seed}`).toBeLessThan(y2[2]);
  }));

  it('the quest board is a bonus, not the economy', each((r, seed) => {
    expect(r.boardCoins, `seed ${seed}`).toBeGreaterThan(0);
    expect(r.boardCoins / r.coinsEarned, `seed ${seed}`).toBeLessThan(0.06);
  }));
});

/**
 * When each main quest should show as complete, in absolute days [earliest, latest]. The upper bounds leave about a
 * season (14 days) before whatever the beat is aimed at; the lower bounds catch a beat becoming trivial.
 */
const QUEST_WINDOWS: Record<string, [number, number, string]> = {
  first_harvest: [2, 8, 'sprinklers come this early'],
  gears: [5, 16, 'before or just after the Blossom Fair (Spring 13)'],
  // Festival objectives complete when the festival day ends, so they show as done the next morning.
  blossom: [13, 13, 'the fair is on Spring 13 whether or not you go'],
  pressing: [13, 28, 'a fortnight after the sluice quests open (Summer 1)'],
  undersluice: [14, 42, 'opens Summer 1, then a dive to floor 5'],
  // open_together must be done before the Thaw Flood (Spring 4 Y2 = day 59), a season ahead = 45.
  open_together: [26, dayOf(2, 0, 4) - 14, 'a season before the Thaw Flood'],
  // The flood is dated; the repair follows it within two weeks.
  great_wheel: [dayOf(2, 0, 4), dayOf(2, 0, 4) + 14, 'two weeks after the Thaw Flood'],
  // The finale is on Winter 13 Y2 (day 110); the Lantern Line is due a season before.
  lantern_line: [dayOf(2, 0, 4), dayOf(2, 3, 13) - 14, 'a season before Lantern Night'],
  finale: [dayOf(2, 3, 13) + 1, dayOf(2, 3, 13) + 1, 'Lantern Night itself'],
};

describe('main story timing (bot, 2 years)', () => {
  for (const [id, [lo, hi, why]] of Object.entries(QUEST_WINDOWS)) {
    it(`${id} completes between day ${lo} and ${hi} (${why})`, each((r, seed) => {
      expect(r.questDay[id], `seed ${seed}: ${id} never completed`).toBeDefined();
      expect(r.questDay[id], `seed ${seed}`).toBeGreaterThanOrEqual(lo);
      expect(r.questDay[id], `seed ${seed}`).toBeLessThanOrEqual(hi);
    }));
  }

  it('beats happen in story order', each((r, seed) => {
    const order = ['first_harvest', 'gears', 'pressing', 'undersluice', 'open_together', 'great_wheel', 'lantern_line', 'finale'];
    const days = order.map((id) => r.questDay[id]);
    expect([...days].sort((a, b) => a - b), `seed ${seed}`).toEqual(days);
  }));
});

describe('bot determinism', () => {
  it('the same seed gives the same two years', () => {
    const again = new Bot(SEEDS[0]).playDays(112);
    expect(again.seasons).toEqual(runs.get(SEEDS[0])!.seasons);
    expect(again.questDay).toEqual(runs.get(SEEDS[0])!.questDay);
  });
});
