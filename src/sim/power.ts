// Power and heat, derived from the farm layout (DESIGN.md §7). Pure functions of state.
import { WATER_MULT_RESTORED, WATER_MULT_SILTED, WATER_MULT_START, WIND_MULT } from '../data/balance';
import { getMachine } from '../data';
import { parseMap, tilesInRadius } from '../world';
import type { GameState } from './state';

export interface PowerInfo {
  supply: number;
  /** total draw of machines inside coverage */
  demand: number;
  /** 0..1 shared by every connected machine */
  factor: number;
  /** per farm tile: inside some generator's coverage */
  covered: boolean[];
  /** per entity id: the speed multiplier it runs at (1 for machines that need no power) */
  entityFactor: Record<number, number>;
}

export function waterMultiplier(flags: string[]): number {
  if (flags.includes('silted')) return WATER_MULT_SILTED;
  if (flags.includes('sluice_open')) return WATER_MULT_RESTORED;
  return WATER_MULT_START;
}

export function generatorSupply(state: GameState, type: string): number {
  const def = getMachine(type);
  const base = def.powerSupply ?? 0;
  if (def.source === 'water') return base * waterMultiplier(state.flags);
  if (def.source === 'wind') return base * (WIND_MULT[state.weather] ?? 1);
  return base;
}

export function computePower(state: GameState): PowerInfo {
  const m = parseMap('farm');
  const covered = new Array<boolean>(m.w * m.h).fill(false);
  let supply = 0;
  for (const e of state.farm.entities) {
    const def = getMachine(e.type);
    if (def.kind !== 'generator') continue;
    supply += generatorSupply(state, e.type);
    covered[e.y * m.w + e.x] = true;
    for (const [x, y] of tilesInRadius(m.w, m.h, e.x, e.y, def.radius ?? 0)) covered[y * m.w + x] = true;
  }
  let demand = 0;
  for (const e of state.farm.entities) {
    const def = getMachine(e.type);
    if (def.powerDraw > 0 && covered[e.y * m.w + e.x]) demand += def.powerDraw;
  }
  const factor = demand === 0 ? 1 : Math.min(1, supply / demand);
  const entityFactor: Record<number, number> = {};
  for (const e of state.farm.entities) {
    const def = getMachine(e.type);
    entityFactor[e.id] = def.powerDraw > 0 ? (covered[e.y * m.w + e.x] ? factor : 0) : 1;
  }
  return { supply, demand, factor, covered, entityFactor };
}

/** Per farm tile heat 0..1: the best power factor of any heater covering it; greenhouse floor is 1. */
export function computeHeat(state: GameState, power: PowerInfo): number[] {
  const m = parseMap('farm');
  const heat = new Array<number>(m.w * m.h).fill(0);
  if (state.flags.includes('greenhouse')) {
    for (let i = 0; i < heat.length; i++) if (m.terrain[i] === 'glassfloor' && !m.decor[i]) heat[i] = 1;
  }
  for (const e of state.farm.entities) {
    const def = getMachine(e.type);
    if (def.kind !== 'heater') continue;
    const f = power.entityFactor[e.id] ?? 0;
    if (f <= 0) continue;
    for (const [x, y] of tilesInRadius(m.w, m.h, e.x, e.y, def.radius ?? 0)) {
      const i = y * m.w + x;
      heat[i] = Math.max(heat[i], f);
    }
  }
  return heat;
}
