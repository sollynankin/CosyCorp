// M6 systems (DESIGN.md §12): mine floors, dust bunnies, fishing, animals, tool upgrades, cooking.
import { describe, expect, it } from 'vitest';
import {
  ANIMAL_MATURE_DAYS,
  BUNNY_ENERGY,
  BUILD_COOP_COST,
  CHICKEN_PRICE,
  LADDER_ROCK_LIMIT,
  TOOL_UPGRADE_COST,
} from '../src/data/balance';
import { applyCommand, countItem, endDay, minuteOfClock, step, warpTo } from '../src/sim';
import { dayFor } from '../src/sim/calendar';
import { fishAvailable } from '../src/sim/fishing';
import { ladderRock, populateFloor } from '../src/sim/mine';
import { give, sandbox, selectItem, stand, type Sandbox } from './helpers';

const W = 22;

describe('mine', () => {
  it('a floor is a pure function of (seed, floor, day) and never consumes RNG', () => {
    const sb = sandbox();
    const rng = sb.s.rng;
    populateFloor(sb.s, 4);
    const a = JSON.stringify(sb.s.maps.mine4.objects);
    populateFloor(sb.s, 4);
    expect(JSON.stringify(sb.s.maps.mine4.objects)).toBe(a);
    expect(sb.s.rng).toBe(rng);
    sb.s.day = 1;
    populateFloor(sb.s, 4);
    expect(JSON.stringify(sb.s.maps.mine4.objects)).not.toBe(a);
  });

  it('deeper floors hold deeper ores', () => {
    const sb = sandbox();
    const ores = (floor: number) => {
      const found = new Set<string>();
      for (let d = 0; d < 20; d++) {
        sb.s.day = d;
        populateFloor(sb.s, floor);
        for (const o of sb.s.maps[`mine${floor}`].objects) if (o?.kind === 'ore') found.add(o.item);
      }
      return found;
    };
    expect(ores(1).has('iron_ore')).toBe(false);
    expect(ores(9).has('iron_ore')).toBe(true);
    expect(ores(9).has('amethyst')).toBe(true);
  });

  it('the ladder is under its rock, or appears after LADDER_ROCK_LIMIT rocks; floor 10 has none', () => {
    const sb = sandbox();
    const { s } = sb;
    warpTo(s, sb.ctx, 'mine2', 10, 2, 2);
    const hidden = ladderRock(s, 2);
    expect(hidden).toBeGreaterThanOrEqual(0);
    // Break the ladder rock with the pickaxe: the ladder shows there.
    s.player.tools.pickaxe = 2;
    const hx = hidden % W;
    const hy = Math.floor(hidden / W);
    stand(s, hx, hy - 1 >= 1 ? hy - 1 : hy + 1, 2, 'mine2');
    s.maps.mine2.objects[hidden] = { kind: 'stone', hp: 1 };
    selectItem(s, 'pickaxe');
    expect(applyCommand(s, sb.ctx, { type: 'use', x: hx, y: hy }).ok).toBe(true);
    expect(s.maps.mine2.objects[hidden]?.kind).toBe('ladder');
    for (let k = 0; k < 4; k++) step(s, sb.ctx); // let the swing finish
    expect(applyCommand(s, sb.ctx, { type: 'interact', x: hx, y: hy }).ok).toBe(true);
    expect(s.player.map).toBe('mine3');
    expect(s.mineDeepest).toBe(3);

    // Without finding it: the limit reveals it.
    const sb2 = sandbox();
    warpTo(sb2.s, sb2.ctx, 'mine3', 10, 2, 2);
    sb2.s.mineBroken = LADDER_ROCK_LIMIT - 1;
    sb2.s.maps.mine3.objects[3 * W + 3] = { kind: 'stone', hp: 1 };
    stand(sb2.s, 3, 4, 0, 'mine3');
    sb2.s.player.tools.pickaxe = 2;
    selectItem(sb2.s, 'pickaxe');
    applyCommand(sb2.s, sb2.ctx, { type: 'use', x: 3, y: 3 });
    expect(sb2.s.maps.mine3.objects.some((o) => o?.kind === 'ladder')).toBe(true);
    expect(ladderRock(sb2.s, 10)).toBe(-1);
  });

  it('the lift needs the depth', () => {
    const sb = sandbox();
    warpTo(sb.s, sb.ctx, 'mine1', 10, 2, 2);
    expect(applyCommand(sb.s, sb.ctx, { type: 'lift', floor: 5 }).ok).toBe(false);
    sb.s.mineDeepest = 5;
    expect(applyCommand(sb.s, sb.ctx, { type: 'lift', floor: 5 }).ok).toBe(true);
    expect(sb.s.player.map).toBe('mine5');
  });

  it('a dust bunny costs energy once and tumbles away; any tool poofs it into coal', () => {
    const sb = sandbox();
    const { s } = sb;
    warpTo(s, sb.ctx, 'mine6', 10, 2, 2);
    s.maps.mine6.objects.fill(null);
    stand(s, 10, 8, 2, 'mine6');
    s.maps.mine6.objects[8 * W + 10] = { kind: 'bunny', hp: 1 };
    const e = s.player.energy;
    step(s, sb.ctx);
    step(s, sb.ctx);
    expect(e - s.player.energy).toBe(BUNNY_ENERGY);
    const at = s.maps.mine6.objects.findIndex((o) => o?.kind === 'bunny');
    expect(at).toBe(9 * W + 10);
    selectItem(s, 'hoe');
    expect(applyCommand(s, sb.ctx, { type: 'use', x: 10, y: 9 }).ok).toBe(true);
    expect(s.maps.mine6.objects[at]).toBeNull();
    expect(countItem(s.player.inventory, 'coal')).toBe(1);
  });
});

describe('fishing', () => {
  function cast(sb: Sandbox, policy: (fs: NonNullable<Sandbox['s']['player']['fishing']>) => boolean): string {
    const { s } = sb;
    // The farm stream at x = 3; stand on the bank.
    stand(s, 4, 12, 3, 'farm');
    s.maps.farm.objects[12 * 44 + 4] = null;
    selectItem(s, 'rod');
    expect(applyCommand(s, sb.ctx, { type: 'use', x: 3, y: 12 }).ok).toBe(true);
    let holding = false;
    for (let t = 0; t < 2000 && s.player.fishing; t++) {
      const fs = s.player.fishing!;
      const want = fs.phase === 'reel' && policy(fs);
      const cmds = want !== holding ? [{ type: 'reel' as const, hold: want }] : [];
      holding = want;
      step(s, sb.ctx, cmds);
    }
    const ev = sb.ctx.events.filter((e) => e.type === 'catch' || e.type === 'escape');
    return ev.length ? ev[ev.length - 1].type : 'none';
  }

  it('a player who tracks the fish catches it; one who never reels loses it', () => {
    const track = (fs: { fishPos: number; zonePos: number }) => fs.fishPos > fs.zonePos + 0.1;
    const sb = sandbox(5);
    expect(cast(sb, track)).toBe('catch');
    expect(sb.s.player.inventory.some((st) => st && ['perch', 'brook_trout', 'catfish', 'eel', 'glowfin'].includes(st.id))).toBe(true);
    const sb2 = sandbox(5);
    expect(cast(sb2, () => false)).toBe('escape');
  });

  it('is deterministic: the same inputs land the same fish', () => {
    const run = () => {
      const sb = sandbox(9);
      cast(sb, (fs) => fs.fishPos > fs.zonePos + 0.1);
      return JSON.stringify(sb.s.player.inventory);
    };
    expect(run()).toBe(run());
  });

  it('fish depend on place, season, time and weather; the Heron opens Glowfin at the lake', () => {
    const { s } = sandbox();
    const at = (map: string) => fishAvailable(s, map).map((f) => f.item);
    expect(at('lake')).toContain('carp');
    expect(at('farm')).not.toContain('carp');
    s.day = dayFor(1, 'summer', 3);
    s.minute = minuteOfClock('20:00');
    expect(at('town')).toContain('glowfin');
    expect(at('lake')).not.toContain('glowfin');
    s.flags.push('glowfin_dock');
    expect(at('lake')).toContain('glowfin');
    s.minute = minuteOfClock('10:00');
    expect(at('town')).not.toContain('glowfin');
    s.weather = 'rain';
    expect(at('town')).toContain('catfish');
  });
});

describe('animals', () => {
  function atJoinery(sb: Sandbox): void {
    stand(sb.s, 37, 13, 0, 'town');
    sb.s.minute = minuteOfClock('10:00');
    sb.s.day = 0; // Monday: open
  }

  it('the Joinery builds a coop for coins and materials, then sells chickens', () => {
    const sb = sandbox();
    const { s } = sb;
    atJoinery(sb);
    s.player.coins = 10000;
    expect(applyCommand(s, sb.ctx, { type: 'buy', shop: 'joinery', item: 'chicken', n: 1 }).ok).toBe(false);
    expect(applyCommand(s, sb.ctx, { type: 'buy', shop: 'joinery', item: 'build_coop', n: 1 }).ok).toBe(false);
    give(s, 'wood', BUILD_COOP_COST.wood);
    give(s, 'stone', BUILD_COOP_COST.stone);
    expect(applyCommand(s, sb.ctx, { type: 'buy', shop: 'joinery', item: 'build_coop', n: 1 }).ok).toBe(true);
    expect(s.flags).toContain('built_coop');
    expect(countItem(s.player.inventory, 'wood')).toBe(0);
    expect(s.player.coins).toBe(10000 - BUILD_COOP_COST.coins);
    expect(applyCommand(s, sb.ctx, { type: 'buy', shop: 'joinery', item: 'chicken', n: 1 }).ok).toBe(true);
    expect(s.player.coins).toBe(10000 - BUILD_COOP_COST.coins - CHICKEN_PRICE);
    expect(s.animals.length).toBe(1);
  });

  it('fed, mature animals produce overnight; hungry ones do not; petting raises quality', () => {
    const sb = sandbox();
    const { s } = sb;
    s.flags.push('built_coop');
    applyCommand(s, sb.ctx, { type: 'pet', animal: 999 });
    s.animals.push({ id: 1, kind: 'chicken', name: 'Pip', friendship: 900, fed: false, petted: false, ageDays: ANIMAL_MATURE_DAYS });
    s.weather = 'rain';
    endDay(s, sb.ctx, false);
    expect(s.animalBox).toEqual([]);
    expect(s.report!.notes.some((n) => /hungry/.test(n))).toBe(true);
    give(s, 'hay', 3);
    expect(applyCommand(s, sb.ctx, { type: 'feed', building: 'coop' }).ok).toBe(true);
    expect(s.feeders.coop).toBe(3);
    s.weather = 'rain';
    expect(applyCommand(s, sb.ctx, { type: 'pet', animal: 1 }).ok).toBe(true);
    expect(applyCommand(s, sb.ctx, { type: 'pet', animal: 1 }).ok).toBe(false);
    endDay(s, sb.ctx, false);
    expect(s.feeders.coop).toBe(2);
    expect(s.animalBox.length).toBe(1);
    expect(s.animalBox[0].id).toBe('egg');
    expect(s.animalBox[0].q).toBeGreaterThanOrEqual(1);
    expect(applyCommand(s, sb.ctx, { type: 'collectAnimals' }).ok).toBe(true);
    expect(countItem(s.player.inventory, 'egg')).toBe(1);
  });
});

describe('tools and kitchen', () => {
  it('the Smithy upgrades a tool for coins and ore', () => {
    const sb = sandbox();
    const { s } = sb;
    stand(s, 8, 18, 2, 'town');
    s.minute = minuteOfClock('10:00');
    const cost = TOOL_UPGRADE_COST[1];
    s.player.coins = cost.coins;
    expect(applyCommand(s, sb.ctx, { type: 'upgrade', tool: 'axe' }).ok).toBe(false);
    give(s, cost.item, cost.count);
    expect(applyCommand(s, sb.ctx, { type: 'upgrade', tool: 'axe' }).ok).toBe(true);
    expect(s.player.tools.axe).toBe(1);
    expect(s.player.coins).toBe(0);
  });

  it('cooking a known recipe uses its ingredients; unknown recipes are refused', () => {
    const sb = sandbox();
    const { s } = sb;
    give(s, 'radish', 2);
    give(s, 'wild_leek', 1);
    expect(applyCommand(s, sb.ctx, { type: 'craft', recipe: 'cook_radish_salad', n: 1 }).ok).toBe(true);
    expect(countItem(s.player.inventory, 'radish_salad')).toBe(1);
    expect(countItem(s.player.inventory, 'radish')).toBe(0);
    expect(applyCommand(s, sb.ctx, { type: 'craft', recipe: 'cook_pancakes', n: 1 }).ok).toBe(false);
  });
});
