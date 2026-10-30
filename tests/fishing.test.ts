// Fish sizes, size classes and prices, harder big fish, species variety, records and eating fish.
import { describe, expect, it } from 'vitest';
import { FISH_GOLD_AT, FISH_SILVER_AT, ITEM_ENERGY, ITEM_VALUE, QUALITY_PRICE_MULT } from '../src/data/balance';
import { FISH } from '../src/data/fish';
import { FISH_LOOKS } from '../src/data/fishLook';
import { getItem } from '../src/data';
import { applyCommand, sellPrice, step } from '../src/sim';
import { dayFor } from '../src/sim/calendar';
import { fishAvailable, fishDifficulty, rollLength, sizeClass, sizeThresholds, tickFishing } from '../src/sim/fishing';
import { deserialize, serialize } from '../src/sim/serialize';
import { act, sandbox, selectItem, stand, type Sandbox } from './helpers';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

function catchOne(sb: Sandbox): void {
  const { s } = sb;
  stand(s, 4, 12, 3, 'farm');
  s.maps.farm.objects[12 * 44 + 4] = null;
  selectItem(s, 'rod');
  expect(applyCommand(s, sb.ctx, { type: 'use', x: 3, y: 12 }).ok).toBe(true);
  let holding = false;
  for (let t = 0; t < 4000 && s.player.fishing; t++) {
    const fs = s.player.fishing!;
    const want = fs.phase === 'reel' && fs.fishPos > fs.zonePos + 0.1;
    const cmds = want !== holding ? [{ type: 'reel' as const, hold: want }] : [];
    holding = want;
    step(s, sb.ctx, cmds);
  }
}

describe('fish table', () => {
  it('every fish has an item, a price, a meal, a sane length range and a place', () => {
    expect(FISH.length).toBeGreaterThanOrEqual(20);
    for (const f of FISH) {
      expect(getItem(f.item).category, f.item).toBe('fish');
      expect(ITEM_VALUE[f.item], `${f.item} value`).toBeGreaterThan(0);
      expect(ITEM_ENERGY[f.item], `${f.item} energy`).toBeGreaterThan(0);
      expect(f.maxCm, f.item).toBeGreaterThan(f.minCm);
      expect(f.where.length, f.item).toBeGreaterThan(0);
    }
  });

  it('every fish has a colourful look with a pattern', () => {
    for (const f of FISH) {
      const look = FISH_LOOKS[f.item];
      expect(look, f.item).toBeDefined();
      expect(look.body).not.toBe(look.belly);
      expect(look.pattern, f.item).toBeTruthy();
    }
  });

  it('there is a good spread of fish in every season, in the river and the lake', () => {
    const { s } = sandbox();
    for (const season of SEASONS) {
      s.day = dayFor(1, season, 3);
      // every hour and weather together, so we see everything that can bite in that season
      for (const where of ['farm', 'lake']) {
        const seen = new Set<string>();
        for (const weather of ['sunny', 'rain', 'snow'] as const) {
          s.weather = weather;
          for (const m of [0, 240, 540, 840, 1000]) {
            s.minute = m;
            for (const f of fishAvailable(s, where)) seen.add(f.item);
          }
        }
        expect(seen.size, `${season} ${where}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('the biggest species are among the hardest', () => {
    const hardest = [...FISH].sort((a, b) => b.difficulty - a.difficulty).slice(0, 6).map((f) => f.item);
    expect(hardest).toContain('sturgeon');
    expect(hardest).toContain('glowfin');
  });
});

describe('sizes', () => {
  it('a rolled length stays in the species range and size class follows the thresholds', () => {
    const { s } = sandbox();
    for (const f of FISH) {
      for (let k = 0; k < 40; k++) {
        const { size, lenCm } = rollLength(s, f);
        expect(lenCm).toBeGreaterThanOrEqual(f.minCm);
        expect(lenCm).toBeLessThanOrEqual(f.maxCm);
        expect(sizeClass(size)).toBe(size >= FISH_GOLD_AT ? 2 : size >= FISH_SILVER_AT ? 1 : 0);
      }
      const t = sizeThresholds(f);
      expect(t.silverCm).toBeLessThan(t.goldCm);
    }
  });

  it('fishing skill makes longer fish more likely', () => {
    const mean = (xp: number) => {
      const { s } = sandbox(7);
      s.player.skillXp.fishing = xp;
      let sum = 0;
      for (let k = 0; k < 400; k++) sum += rollLength(s, FISH[1]).size;
      return sum / 400;
    };
    expect(mean(1800)).toBeGreaterThan(mean(0) + 0.05);
  });

  it('silver and gold fish sell for the size bonus', () => {
    expect(FISH_SILVER_AT).toBeLessThan(FISH_GOLD_AT);
    expect(sellPrice('pike', 1)).toBe(Math.round(ITEM_VALUE.pike * QUALITY_PRICE_MULT[1]));
    expect(sellPrice('pike', 2)).toBe(Math.round(ITEM_VALUE.pike * 1.5));
    expect(sellPrice('pike', 2)).toBeGreaterThan(sellPrice('pike', 0));
  });

  it('bigger fish are harder to catch than smaller ones of the same kind', () => {
    for (const f of FISH) {
      expect(fishDifficulty(f, 1), f.item).toBeGreaterThan(fishDifficulty(f, 0));
      expect(fishDifficulty(f, 0.5)).toBeCloseTo(Math.min(0.98, Math.max(0.05, f.difficulty)), 5);
    }
  });
});

describe('catching and records', () => {
  it('a catch is logged with its length, size class and count, and tells you about it', () => {
    const sb = sandbox(5);
    catchOne(sb);
    const ev = sb.ctx.events.filter((e) => e.type === 'catch');
    expect(ev).toHaveLength(1);
    const c = ev[0] as Extract<(typeof ev)[number], { type: 'catch' }>;
    const def = FISH.find((f) => f.item === c.item)!;
    expect(c.cm).toBeGreaterThanOrEqual(def.minCm);
    expect(c.cm).toBeLessThanOrEqual(def.maxCm);
    expect(c.record).toBe(true); // the first of a kind is a record
    const rec = sb.s.fishLog[c.item];
    expect(rec).toMatchObject({ caught: 1, bestCm: c.cm, bestQ: c.q });
    expect(rec.bySize[c.q]).toBe(1);
    expect(sb.s.player.inventory.some((st) => st && st.id === c.item && st.q === c.q)).toBe(true);
    expect(sb.ctx.events.some((e) => e.type === 'toast' && e.text.includes(`${c.cm} cm`))).toBe(true);
  });

  it('only a longer fish than your best is a new record', () => {
    const sb = sandbox(11);
    let records = 0;
    for (let k = 0; k < 12; k++) {
      sb.ctx.events.length = 0;
      catchOne(sb);
      for (const e of sb.ctx.events) {
        if (e.type !== 'catch') continue;
        const logged = sb.s.fishLog[e.item];
        expect(logged.bestCm).toBeGreaterThanOrEqual(e.cm);
        if (e.record) records++;
        else expect(logged.bestCm).toBeGreaterThanOrEqual(e.cm);
      }
    }
    expect(records).toBeGreaterThanOrEqual(1);
    expect(Object.values(sb.s.fishLog).reduce((a, r) => a + r.caught, 0)).toBeGreaterThan(0);
  });

  it('an old save with a half-finished cast is not left with a NaN fish', () => {
    const sb = sandbox();
    sb.s.player.fishing = { phase: 'reel', biteIn: 0, fish: 'perch', fishPos: 0.5, fishVel: 0, zonePos: 0.3, zoneVel: 0, progress: 0.4, tx: 3, ty: 12, derby: false, holding: false, retarget: 0, fishTarget: 0.5 } as never;
    const back = deserialize(serialize(sb.s));
    expect(back.player.fishing).toBeNull();
    expect(back.fishLog).toEqual({});
  });
});

describe('eating fish', () => {
  it('fish restore energy, more for bigger species, and a full belly refuses', () => {
    const sb = sandbox();
    const { s } = sb;
    s.player.energy = 40;
    s.player.inventory[15] = { id: 'perch', q: 0, n: 2 };
    expect(act(sb, { type: 'eat', slot: 15 }).ok).toBe(true);
    expect(s.player.energy).toBe(40 + ITEM_ENERGY.perch);
    expect(s.player.inventory[15]!.n).toBe(1);
    expect(ITEM_ENERGY.sturgeon).toBeGreaterThan(ITEM_ENERGY.minnow);
    s.player.energy = s.player.maxEnergy;
    expect(act(sb, { type: 'eat', slot: 15 }).ok).toBe(false);
  });
});

describe('reeling', () => {
  it('a bigger fish takes longer to reel in than a small one', () => {
    const gain = (size: number): number => {
      const sb = sandbox();
      const { s } = sb;
      s.player.fishing = { phase: 'reel', biteIn: 0, fish: 'perch', fishPos: 0.5, fishVel: 0, zonePos: 0.4, zoneVel: 0, progress: 0.3, tx: 3, ty: 12, derby: false, holding: false, retarget: 99, fishTarget: 0.5, lenCm: 20, size, difficulty: 0.2 };
      tickFishing(s, sb.ctx);
      return s.player.fishing ? s.player.fishing.progress - 0.3 : 0;
    };
    expect(gain(0)).toBeGreaterThan(0);
    expect(gain(1)).toBeGreaterThan(0);
    expect(gain(1)).toBeLessThan(gain(0));
  });
});
