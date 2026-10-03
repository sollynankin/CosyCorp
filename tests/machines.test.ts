// Machines (DESIGN.md §4, §7): sprinkler radius, harvester and planter reach, power, crafters, pickup.
import { describe, expect, it } from 'vitest';
import { CROP_BALANCE, MACHINE_BALANCE, WIND_MULT } from '../src/data/balance';
import { buildContext, countItem, dawnSprinklers, endDay, ensureContext, pickupMachine, soilAt, storedCount } from '../src/sim';
import { build, give, runFactory, sandbox, soil, stock } from './helpers';

/** Tilled soil on every tile of a square around (cx, cy). */
function field(sb: ReturnType<typeof sandbox>, cx: number, cy: number, r: number, crop?: string, days = 0) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x !== cx || y !== cy) soil(sb.s, x, y, crop, days);
}

describe('sprinklers', () => {
  it('a Sprinkler waters exactly the 3×3 around it (Chebyshev radius 1)', () => {
    const sb = sandbox();
    field(sb, 30, 12, 2);
    build(sb, 'sprinkler', 30, 12);
    dawnSprinklers(sb.s, sb.ctx);
    for (let y = 10; y <= 14; y++)
      for (let x = 28; x <= 32; x++) {
        if (x === 30 && y === 12) continue;
        const inside = Math.max(Math.abs(x - 30), Math.abs(y - 12)) <= 1;
        expect(soilAt(sb.s, x, y)!.watered, `${x},${y}`).toBe(inside);
      }
  });

  it('a Pump Sprinkler waters the 5×5 only when powered', () => {
    const sb = sandbox();
    field(sb, 7, 12, 3);
    build(sb, 'pump_sprinkler', 7, 12);
    dawnSprinklers(sb.s, sb.ctx);
    expect(soilAt(sb.s, 6, 12)!.watered).toBe(false);
    build(sb, 'water_wheel', 4, 9);
    dawnSprinklers(sb.s, sb.ctx);
    expect(soilAt(sb.s, 5, 10)!.watered).toBe(true);
    expect(soilAt(sb.s, 9, 14)!.watered).toBe(true);
    expect(soilAt(sb.s, 10, 12)!.watered).toBe(false);
  });

  it('sprinklers water every morning after sleeping', () => {
    const sb = sandbox();
    field(sb, 30, 12, 1, 'radish');
    build(sb, 'sprinkler', 30, 12);
    endDay(sb.s, sb.ctx, false);
    expect(soilAt(sb.s, 31, 13)!.watered).toBe(true);
  });
});

describe('harvester and planter reach', () => {
  it('a Harvester reaches radius 2 and scans row-major', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, 12);
    const days = CROP_BALANCE.radish.growthDays;
    // Ripe at distance 2 (inside) and 3 (outside).
    soil(sb.s, 9, 11, 'radish', days);
    soil(sb.s, 5, 14, 'radish', days);
    soil(sb.s, 10, 12, 'radish', days);
    const h = build(sb, 'harvester', 7, 12, 1);
    const work = MACHINE_BALANCE.harvester.workMinutes!;
    runFactory(sb, work);
    // First in scan order is (9, 11): row 11 comes before row 14.
    expect(soilAt(sb.s, 9, 11)!.crop).toBeNull();
    expect(soilAt(sb.s, 5, 14)!.crop).not.toBeNull();
    runFactory(sb, work * 4);
    expect(soilAt(sb.s, 5, 14)!.crop).toBeNull();
    expect(soilAt(sb.s, 10, 12)!.crop).not.toBeNull(); // distance 3
    expect(h.output.map((s) => s.id)).toEqual(['radish', 'radish']);
    expect(sb.s.today.harvestedMachine).toBe(2);
  });

  it('a Harvester picks fruit from an orchard tree in reach', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, 12);
    sb.s.maps.farm.objects[12 * 44 + 9] = { kind: 'orchard', tree: 'honeypear', age: 99, fruit: 3 };
    const h = build(sb, 'harvester', 7, 12, 1);
    runFactory(sb, MACHINE_BALANCE.harvester.workMinutes!);
    expect(h.output.length).toBe(3);
  });

  it('a Seed Planter sows its hopper on free soil within radius 2', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, 12);
    field(sb, 7, 12, 3);
    const p = build(sb, 'seed_planter', 7, 12, 1);
    p.input.radish_seeds = 30;
    runFactory(sb, MACHINE_BALANCE.seed_planter.workMinutes! * 30);
    let planted = 0;
    for (let y = 9; y <= 15; y++)
      for (let x = 4; x <= 10; x++) {
        const c = soilAt(sb.s, x, y)?.crop;
        if (!c) continue;
        planted++;
        expect(Math.max(Math.abs(x - 7), Math.abs(y - 12))).toBeLessThanOrEqual(2);
      }
    expect(planted).toBe(24);
    expect(p.input.radish_seeds).toBe(6);
    expect(p.status).toBe('idle');
  });

  it('a Seed Planter refuses out-of-season seeds', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, 12);
    field(sb, 7, 12, 2);
    const p = build(sb, 'seed_planter', 7, 12, 1);
    p.input.pumpkin_seeds = 5;
    runFactory(sb, 30);
    expect(p.input.pumpkin_seeds).toBe(5);
  });
});

describe('power', () => {
  it('connected machines share supply: factor = min(1, supply / demand)', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, 12);
    const supply = MACHINE_BALANCE.water_wheel.powerSupply!;
    build(sb, 'jam_press', 6, 11);
    build(sb, 'harvester', 6, 13);
    build(sb, 'heater', 8, 11);
    const demand = 4 + 3 + 4;
    expect(sb.ctx.power.supply).toBe(supply);
    expect(sb.ctx.power.demand).toBe(demand);
    expect(sb.ctx.power.factor).toBe(1);
    build(sb, 'heater', 8, 13);
    expect(sb.ctx.power.factor).toBeCloseTo(supply / (demand + 4));
  });

  it('the water multiplier follows the story; the windmill follows the weather', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, 12);
    sb.s.flags.push('sluice_open');
    ensureContext(sb.s, sb.ctx);
    expect(sb.ctx.power.supply).toBe(MACHINE_BALANCE.water_wheel.powerSupply! * 2);
    sb.s.flags.push('silted');
    ensureContext(sb.s, sb.ctx);
    expect(sb.ctx.power.supply).toBe(MACHINE_BALANCE.water_wheel.powerSupply! / 2);

    const sb2 = sandbox();
    build(sb2, 'windmill', 30, 12);
    sb2.s.weather = 'storm';
    expect(buildContext(sb2.s).power.supply).toBe(MACHINE_BALANCE.windmill.powerSupply! * WIND_MULT.storm);
  });

  it('half power means half speed', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, 12);
    const press = build(sb, 'jam_press', 6, 12, 1);
    // 12 supply against 4 + 4×5 = 24 demand: factor 0.5.
    for (const [x, y] of [[6, 10], [8, 10], [6, 14], [8, 14], [8, 12]] as const) build(sb, 'heater', x, y);
    expect(sb.ctx.power.factor).toBe(0.5);
    press.input.strawberry = 3;
    runFactory(sb, 119);
    expect(press.output.length).toBe(0);
    runFactory(sb, 1);
    expect(press.output.map((s) => s.id)).toEqual(['strawberry_jam']);
  });
});

describe('crafters, storage and pickup', () => {
  it('reward-gated recipes stay locked; the first matching recipe in data order wins', () => {
    const sb = sandbox();
    build(sb, 'water_wheel', 4, 12);
    const pres = build(sb, 'preserver', 6, 12, 1);
    pres.input = { carrot: 3, beetroot: 2, sunpepper: 2 };
    runFactory(sb, 1);
    expect(pres.recipe).toBe('pickled_carrots');
    const sb2 = sandbox();
    sb2.s.rewards.push('medley');
    build(sb2, 'water_wheel', 4, 12);
    const p2 = build(sb2, 'preserver', 6, 12, 1);
    p2.input = { carrot: 3, beetroot: 2, sunpepper: 2 };
    runFactory(sb2, 1);
    expect(p2.recipe).toBe('harvest_medley');
  });

  it('raw goods on belts spoil overnight; silos keep them; preserves never spoil', () => {
    const sb = sandbox();
    const silo = build(sb, 'silo', 30, 12, 1);
    stock(silo, 'radish', 10);
    const belt = build(sb, 'conveyor', 31, 12, 1);
    build(sb, 'silo', 32, 12, 2); // faces away: refuses nothing from the west
    belt.belt.push({ item: 'pickled_carrots', q: 0, age: 0, from: 3 });
    runFactory(sb, 1);
    const before = storedCount(silo);
    endDay(sb.s, sb.ctx, false);
    expect(sb.s.report!.stats.spoiled).toBe(0);
    expect(storedCount(silo) + storedCount(sb.s.farm.entities[2])).toBe(10 + 1);
    expect(before).toBeLessThan(10);

    // A dead-end belt: the radish spoils, the preserve survives.
    const dead = build(sb, 'conveyor', 35, 12, 1);
    dead.belt.push({ item: 'radish', q: 0, age: 0, from: 3 }, { item: 'pickled_carrots', q: 0, age: 0, from: 3 });
    endDay(sb.s, sb.ctx, false);
    expect(sb.s.report!.stats.spoiled).toBe(1);
    expect(dead.belt.map((b) => b.item)).toEqual(['pickled_carrots']);
  });

  it('picking a machine up returns it and its contents', () => {
    const sb = sandbox();
    const silo = build(sb, 'silo', 30, 12, 1);
    stock(silo, 'carrot', 7);
    sb.s.player.inventory.fill(null);
    give(sb.s, 'hoe', 1);
    expect(pickupMachine(sb.s, sb.ctx, 30, 12).ok).toBe(true);
    expect(countItem(sb.s.player.inventory, 'silo')).toBe(1);
    expect(countItem(sb.s.player.inventory, 'carrot')).toBe(7);
    expect(sb.s.farm.entities.length).toBe(0);
  });
});
