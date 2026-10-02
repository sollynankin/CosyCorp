// Machine behaviours per kind (DESIGN.md §4). Called once per factory step, in entity id order.
import { XP_HARVEST } from '../data/balance';
import { getItem, getMachine, getRecipe } from '../data';
import { tilesInRadius } from '../world';
import { seasonOf } from './calendar';
import type { DayContext } from './context';
import { farmMap, harvestOrchard, harvestTile, isPlantableIn, isRipe } from './farming';
import { pushFifo, availableRecipes, planterSeed } from './transfer';
import type { DayStats, Entity, GameState, MachineStatus } from './state';
import { recordStatus, statsFor } from './stats';

/** Work completes at `progress >= work - EPS`, so fractional power factors (e.g. 2/3) don't lose a step. */
const EPS = 1e-9;

/** First ripe crop or fruiting tree in reach (scan order), or null. */
export function findRipeInReach(state: GameState, e: Entity): [number, number] | null {
  const m = farmMap();
  const radius = getMachine(e.type).radius ?? 0;
  for (const [x, y] of tilesInRadius(m.w, m.h, e.x, e.y, radius)) {
    const i = y * m.w + x;
    if (isRipe(state.farm.soil[i]?.crop ?? null)) return [x, y];
    const o = state.maps.farm.objects[i];
    if (o?.kind === 'orchard' && o.fruit > 0) return [x, y];
  }
  return null;
}

/** First free tilled tile in reach where the planter's seed can go, or null. */
export function findPlantableInReach(state: GameState, e: Entity, heat: number[]): [number, number] | null {
  const seed = planterSeed(e);
  if (!seed) return null;
  const cropId = getItem(seed).plants!;
  const season = seasonOf(state.day);
  const m = farmMap();
  const radius = getMachine(e.type).radius ?? 0;
  for (const [x, y] of tilesInRadius(m.w, m.h, e.x, e.y, radius)) {
    const i = y * m.w + x;
    const s = state.farm.soil[i];
    if (s && !s.crop && state.farm.entityAt[i] < 0 && isPlantableIn(cropId, season, heat[i])) return [x, y];
  }
  return null;
}

function tickHarvester(state: GameState, ctx: DayContext, e: Entity, factor: number, today: DayStats): MachineStatus {
  const def = getMachine(e.type);
  const work = def.workMinutes ?? 1;
  if (factor <= 0) return 'unpowered';
  if (e.output.length >= (def.outputBuffer ?? 1)) return 'blocked';
  e.progress = Math.min(work, e.progress + factor);
  const target = findRipeInReach(state, e);
  if (!target) return 'idle';
  if (e.progress >= work - EPS) {
    const items = harvestTile(state, target[0], target[1]) ?? harvestOrchard(state, target[0], target[1]) ?? [];
    for (const st of items) for (let k = 0; k < st.n; k++) e.output.push({ id: st.id, q: st.q, n: 1 });
    const n = items.reduce((a, s) => a + s.n, 0);
    e.progress = 0;
    statsFor(today, e.id).produced += n;
    today.harvestedMachine += n;
    // Machines earn a little farming XP for the farmer who built them.
    state.player.skillXp.farming += XP_HARVEST / 4;
    ctx.events.push({ type: 'fx', fx: 'harvest', map: 'farm', x: target[0], y: target[1] });
  }
  return 'working';
}

function tickPlanter(state: GameState, ctx: DayContext, e: Entity, factor: number, today: DayStats): MachineStatus {
  const work = getMachine(e.type).workMinutes ?? 1;
  if (factor <= 0) return 'unpowered';
  const seed = planterSeed(e);
  if (!seed) return 'idle';
  e.progress = Math.min(work, e.progress + factor);
  const target = findPlantableInReach(state, e, ctx.heat);
  if (!target) return 'idle';
  if (e.progress >= work - EPS) {
    const m = farmMap();
    state.farm.soil[target[1] * m.w + target[0]]!.crop = { id: getItem(seed).plants!, days: 0, withered: false };
    e.input[seed] -= 1;
    if (e.input[seed] <= 0) delete e.input[seed];
    e.progress = 0;
    statsFor(today, e.id).produced += 1;
  }
  return 'working';
}

function tickCrafter(state: GameState, e: Entity, factor: number, today: DayStats): MachineStatus {
  const def = getMachine(e.type);
  if (factor <= 0) return 'unpowered';
  if (e.recipe === null) {
    if (e.output.length >= (def.outputBuffer ?? 1)) return 'blocked';
    const recipe = availableRecipes(state, e.type).find((r) => r.inputs.every((i) => (e.input[i.item!] ?? 0) >= i.count));
    if (!recipe) return 'idle';
    for (const i of recipe.inputs) e.input[i.item!] -= i.count;
    e.recipe = recipe.id;
    e.progress = 0;
  }
  const recipe = getRecipe(e.recipe);
  e.progress += factor;
  if (e.progress >= (recipe.workMinutes ?? 1) - EPS) {
    for (let k = 0; k < recipe.output.count; k++) e.output.push({ id: recipe.output.item, q: 0, n: 1 });
    statsFor(today, e.id).produced += recipe.output.count;
    today.crafted += recipe.output.count;
    e.recipe = null;
    e.progress = 0;
  }
  return 'working';
}

/** Factory step part 2. */
export function tickMachines(state: GameState, ctx: DayContext, today: DayStats): void {
  for (const e of state.farm.entities) {
    const def = getMachine(e.type);
    const factor = ctx.power.entityFactor[e.id] ?? 0;
    let status: MachineStatus | null = null;
    switch (def.kind) {
      case 'harvester':
        status = tickHarvester(state, ctx, e, factor, today);
        break;
      case 'planter':
        status = tickPlanter(state, ctx, e, factor, today);
        break;
      case 'crafter':
        status = tickCrafter(state, e, factor, today);
        break;
      case 'heater':
        status = factor > 0 ? 'working' : 'unpowered';
        break;
      default:
        break;
    }
    if (status) {
      e.status = status;
      recordStatus(today, e.id, status);
    }
  }
}

/** Dawn: sprinklers water soil in their radius (pump sprinklers only if powered). */
export function waterBySprinklers(state: GameState, ctx: DayContext): number {
  const m = farmMap();
  let watered = 0;
  for (const e of state.farm.entities) {
    const def = getMachine(e.type);
    if (def.kind !== 'sprinkler') continue;
    if (def.needsPower && (ctx.power.entityFactor[e.id] ?? 0) <= 0) continue;
    for (const [x, y] of tilesInRadius(m.w, m.h, e.x, e.y, def.radius ?? 0)) {
      const s = state.farm.soil[y * m.w + x];
      if (s && !s.watered) {
        s.watered = true;
        watered++;
      }
    }
  }
  return watered;
}

export { pushFifo };
