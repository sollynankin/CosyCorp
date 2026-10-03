// Villagers (DESIGN.md §9): schedule data, relationship maths, gifts, romance, dialogue selection, scenes.
import { describe, expect, it } from 'vitest';
import {
  BIRTHDAY_GIFT_MULT,
  DATING_CAP_HEARTS,
  ENGAGEMENT_DAYS,
  GIFT_POINTS,
  GIFTS_PER_WEEK,
  NPC_SPEED,
  POINTS_PER_HEART,
  TALK_POINTS,
  DIALOGUE_SPECIFIC_WEIGHT,
} from '../src/data/balance';
import { getVillager, VILLAGERS } from '../src/data';
import { DIALOGUE } from '../src/data/dialogue';
import { SCENES } from '../src/data/scenes';
import {
  addPoints,
  checkSceneTriggers,
  endDay,
  finishScene,
  giftPreference,
  giveGift,
  heartsOf,
  minuteOfClock,
  pickLine,
  route,
  routeLength,
  routeReachable,
  talkTo,
  villagerAtTile,
  villagerPos,
} from '../src/sim';
import { dayFor } from '../src/sim/calendar';
import { lineWeight } from '../src/sim/villagers';
import { give, sandbox, selectItem, stand } from './helpers';

describe('schedules (data)', () => {
  it('every stop is reachable and every walk ends before the next departure', () => {
    for (const v of VILLAGERS) {
      for (const variant of v.schedule) {
        const stops = variant.stops;
        for (let k = 1; k < stops.length; k++) {
          const label = `${v.id} ${stops[k - 1].map}(${stops[k - 1].x},${stops[k - 1].y}) → ${stops[k].map}(${stops[k].x},${stops[k].y})`;
          expect(routeReachable(stops[k - 1], stops[k]), label).toBe(true);
          if (k + 1 < stops.length) {
            const walk = routeLength(route(stops[k - 1], stops[k])) / NPC_SPEED;
            const gap = minuteOfClock(stops[k + 1].time) - minuteOfClock(stops[k].time);
            expect(walk, `${label} takes ${walk.toFixed(0)} min, gap ${gap}`).toBeLessThanOrEqual(gap);
          }
        }
      }
    }
  });

  it('positions are a pure function of time: same inputs, same answer, and NPCs arrive', () => {
    const { s } = sandbox();
    const wren = getVillager('wren');
    const a = villagerPos(s, wren, 300.4);
    const b = villagerPos(s, wren, 300.4);
    expect(a).toEqual(b);
    // Day 0 is a Monday: at 07:00 Wren is inside the shop (hidden).
    expect(villagerPos(s, wren, 60).hidden).toBe(true);
    // At 08:30 (150) she has stepped outside to (9, 13).
    const out = villagerPos(s, wren, 150);
    expect([out.map, out.x, out.y, out.hidden]).toEqual(['town', 9.5, 13.5, false]);
  });

  it('festival days move everyone to their spots', () => {
    const { s } = sandbox();
    s.day = dayFor(1, 'spring', 13);
    const p = villagerPos(s, getVillager('bram'), minuteOfClock('12:00'));
    expect([p.map, p.x, p.y]).toEqual(['town', 20.5, 19.5]);
  });
});

describe('relationship maths', () => {
  it('talking gives TALK_POINTS once a day', () => {
    const sb = sandbox();
    talkTo(sb.s, sb.ctx, 'bram');
    talkTo(sb.s, sb.ctx, 'bram');
    expect(sb.s.villagers.bram.points).toBe(TALK_POINTS);
    endDay(sb.s, sb.ctx, false);
    talkTo(sb.s, sb.ctx, 'bram');
    expect(sb.s.villagers.bram.points).toBe(2 * TALK_POINTS);
  });

  it('gift preference: item beats tag; tags match; unknown is neutral', () => {
    const ilo = getVillager('ilo');
    expect(giftPreference(ilo, 'glowfin')).toBe('loved');
    expect(giftPreference(ilo, 'perch')).toBe('liked');
    expect(giftPreference(ilo, 'frostkale')).toBe('disliked');
    expect(giftPreference(ilo, 'wood')).toBe('neutral');
  });

  it('gift points, one per day, GIFTS_PER_WEEK per week, birthday multiplier', () => {
    const sb = sandbox();
    const { s } = sb;
    give(s, 'hazelnut', 10);
    selectItem(s, 'hazelnut');
    expect(giveGift(s, sb.ctx, 'bram', s.player.selected).ok).toBe(true);
    expect(s.villagers.bram.points).toBe(GIFT_POINTS.loved);
    expect(giveGift(s, sb.ctx, 'bram', s.player.selected).ok).toBe(false);
    endDay(s, sb.ctx, false);
    expect(giveGift(s, sb.ctx, 'bram', s.player.selected).ok).toBe(true);
    endDay(s, sb.ctx, false);
    expect(GIFTS_PER_WEEK).toBe(2);
    expect(giveGift(s, sb.ctx, 'bram', s.player.selected).ok).toBe(false);
    // Monday resets the week (day 7).
    while (s.day < 7) endDay(s, sb.ctx, false);
    expect(giveGift(s, sb.ctx, 'bram', s.player.selected).ok).toBe(true);

    const sb2 = sandbox();
    sb2.s.day = dayFor(1, 'autumn', 3); // Bram's birthday
    give(sb2.s, 'hazelnut', 1);
    selectItem(sb2.s, 'hazelnut');
    giveGift(sb2.s, sb2.ctx, 'bram', sb2.s.player.selected);
    expect(sb2.s.villagers.bram.points).toBe(GIFT_POINTS.loved * BIRTHDAY_GIFT_MULT);
  });

  it('points clamp at zero and at the cap', () => {
    const { s } = sandbox();
    expect(addPoints(s, 'pell', -50)).toBe(0);
    addPoints(s, 'pell', 99999);
    expect(heartsOf(s, 'pell')).toBe(10);
  });

  it('romance: capped at 8 hearts until the Ribbon Charm; Promise Lantern leads to the ceremony', () => {
    const sb = sandbox();
    const { s } = sb;
    addPoints(s, 'wren', 99999);
    expect(heartsOf(s, 'wren')).toBe(DATING_CAP_HEARTS);
    expect(s.flags).toContain('eight_hearts_romance');
    give(s, 'promise_lantern', 1);
    selectItem(s, 'promise_lantern');
    expect(giveGift(s, sb.ctx, 'wren', s.player.selected).ok).toBe(false);
    give(s, 'ribbon_charm', 1);
    selectItem(s, 'ribbon_charm');
    expect(giveGift(s, sb.ctx, 'wren', s.player.selected).ok).toBe(true);
    expect(s.villagers.wren.courting).toBe(true);
    addPoints(s, 'wren', 99999);
    expect(heartsOf(s, 'wren')).toBe(10);
    // Only one sweetheart at a time.
    addPoints(s, 'teo', 99999);
    give(s, 'ribbon_charm', 1);
    selectItem(s, 'ribbon_charm');
    selectItem(s, 'promise_lantern');
    expect(giveGift(s, sb.ctx, 'wren', s.player.selected).ok).toBe(true);
    selectItem(s, 'ribbon_charm');
    expect(giveGift(s, sb.ctx, 'teo', s.player.selected).ok).toBe(false);
    for (let d = 0; d < ENGAGEMENT_DAYS; d++) endDay(s, sb.ctx, false);
    expect(s.villagers.wren.married).toBe(true);
    expect(s.sceneQueue.map((q) => q.id)).toContain('ceremony_wren');
  });
});

describe('dialogue', () => {
  it('only lines whose conditions hold are said, and specific lines are favoured by weight', () => {
    const sb = sandbox();
    const { s } = sb;
    const count = (pred: () => void, text: RegExp) => {
      let n = 0;
      for (let d = 0; d < 200; d++) {
        s.day = d % 14; // keep it spring
        pred();
        if (text.test(pickLine(s, 'odile'))) n++;
      }
      return n;
    };
    s.weather = 'sunny';
    expect(count(() => {}, /Good for the roses/)).toBe(0);
    s.weather = 'rain';
    // Odile's matching lines in spring rain: 3 generic (weight 1) and the rain line (weight 1 + 3 × 1 = 4).
    const g = DIALOGUE.filter((l) => l.villager === 'odile' && !l.when).length;
    expect(lineWeight(DIALOGUE.find((l) => /Good for the roses/.test(l.text))!)).toBe(1 + DIALOGUE_SPECIFIC_WEIGHT);
    const rain = count(() => {}, /Good for the roses/);
    expect(rain).toBeGreaterThan(0);
    // The 14 spring days repeat, so the rain line shows on a fixed subset of them; it must beat any one generic line.
    const generic = count(() => {}, /Mind the yard wheel/);
    expect(rain).toBeGreaterThanOrEqual(generic);
    expect(g).toBe(3);
  });

  it('story flags unlock lines', () => {
    const sb = sandbox();
    const { s } = sb;
    let seen = false;
    s.flags.push('yard_wheel');
    for (let d = 0; d < 56 && !seen; d++) {
      s.day = d;
      seen = /yard wheel turns again/.test(pickLine(s, 'odile'));
    }
    expect(seen).toBe(true);
  });

  it('the pick is stable within a day, varies across days, and never consumes RNG', () => {
    const sb = sandbox();
    const { s } = sb;
    const rng = s.rng;
    const a = pickLine(s, 'maudie');
    expect(pickLine(s, 'maudie')).toBe(a);
    expect(s.rng).toBe(rng);
    const seen = new Set<string>();
    for (let d = 0; d < 14; d++) {
      s.day = d;
      seen.add(pickLine(s, 'maudie'));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('every villager has unconditioned fallback lines and all dialogue names real villagers', () => {
    for (const v of VILLAGERS) expect(DIALOGUE.some((l) => l.villager === v.id && !l.when)).toBe(true);
    for (const l of DIALOGUE) expect(() => getVillager(l.villager)).not.toThrow();
  });

  it('talking to a villager on the map works through interact', () => {
    const sb = sandbox();
    const { s } = sb;
    // 08:30 on Monday: Wren steps out in front of the Almanac at (9, 13).
    s.minute = 150;
    stand(s, 9, 14, 0, 'town');
    expect(villagerAtTile(s, 9, 13)).toBe('wren');
    const r = sb.ctx.events.length;
    expect(talkTo(s, sb.ctx, 'wren').ok).toBe(true);
    expect(sb.ctx.events.slice(r).some((e) => e.type === 'dialogue')).toBe(true);
  });
});

describe('heart events', () => {
  it('play once when the trigger holds, and the choice adds points', () => {
    const sb = sandbox();
    const { s } = sb;
    s.sceneQueue = [];
    addPoints(s, 'teo', 2 * POINTS_PER_HEART);
    stand(s, 20, 15, 2, 'town');
    s.minute = minuteOfClock('10:00');
    checkSceneTriggers(s);
    expect(s.sceneQueue.map((q) => q.id)).toEqual(['teo_2']);
    const before = s.villagers.teo.points;
    expect(finishScene(s, sb.ctx, 'teo_2', 0).ok).toBe(true);
    expect(s.villagers.teo.points - before).toBe(SCENES.find((x) => x.id === 'teo_2')!.choices![0].points);
    checkSceneTriggers(s);
    expect(s.sceneQueue.some((q) => q.id === 'teo_2')).toBe(false);
  });

  it('every scene names known villagers', () => {
    const ids = new Set([...VILLAGERS.map((v) => v.id), 'you', 'narrator']);
    for (const sc of SCENES) for (const l of sc.lines) expect(ids.has(l.who), `${sc.id}: ${l.who}`).toBe(true);
  });
});
