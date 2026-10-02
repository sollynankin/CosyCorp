// Soil and crops on the farm (DESIGN.md §3).
import {
  CROP_BALANCE,
  FERTILIZER_GOLD_BONUS,
  HARDY_WINTER_GROWTH,
  QUALITY_GOLD_BASE,
  QUALITY_GOLD_PER_LEVEL,
  SOIL_REVERT_CHANCE,
  TREE_MATURE_DAYS,
} from '../data/balance';
import { getCrop, getTree } from '../data';
import type { Quality, SeasonId } from '../data/types';
import { parseMap } from '../world';
import { seasonOf } from './calendar';
import { rngNext } from './rng';
import { skillLevel } from './skills';
import type { CropState, GameState, ItemStack, SoilTile } from './state';

export const farmMap = () => parseMap('farm');

export function farmIdx(x: number, y: number): number {
  return y * farmMap().w + x;
}

export function soilAt(state: GameState, x: number, y: number): SoilTile | null {
  const m = farmMap();
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return null;
  return state.farm.soil[y * m.w + x];
}

/** Ground that the hoe can turn on the farm (not counting objects, entities or buildings). */
export function isTillableGround(state: GameState, x: number, y: number): boolean {
  const m = farmMap();
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
  const i = y * m.w + x;
  if (m.decor[i]) return false;
  const t = m.terrain[i];
  if (t === 'glassfloor') return state.flags.includes('greenhouse');
  if (t !== 'grass' && t !== 'path') return false;
  // building footprints (even unbuilt coop/barn plots stay untillable so they can be built later)
  return m.buildingAt[i] < 0;
}

export function growthDays(cropId: string): number {
  return CROP_BALANCE[cropId].growthDays;
}

export function cropStage(crop: CropState): 0 | 1 | 2 | 3 {
  if (crop.withered) return 0;
  const f = crop.days / growthDays(crop.id);
  if (f >= 1) return 3;
  if (f >= 2 / 3) return 2;
  if (f >= 1 / 3) return 1;
  return 0;
}

export function isRipe(crop: CropState | null): boolean {
  return !!crop && !crop.withered && crop.days >= growthDays(crop.id);
}

/** Whether a crop may be planted (or keep growing) on a tile with the given heat in a season. */
export function isPlantableIn(cropId: string, season: SeasonId, heat: number): boolean {
  if (heat > 0) return true;
  const crop = getCrop(cropId);
  if (season === 'winter') return crop.hardy;
  return crop.seasons.includes(season);
}

export function plantCrop(state: GameState, x: number, y: number, cropId: string): void {
  const s = soilAt(state, x, y);
  if (!s) throw new Error('plantCrop: no soil');
  s.crop = { id: cropId, days: 0, withered: false };
}

export function rollQuality(state: GameState, fertilized: boolean): Quality {
  const gold = QUALITY_GOLD_BASE + skillLevel(state, 'farming') * QUALITY_GOLD_PER_LEVEL + (fertilized ? FERTILIZER_GOLD_BONUS : 0);
  const r = rngNext(state);
  if (r < gold) return 2;
  if (r < gold * 3) return 1;
  return 0;
}

/** Harvests a ripe crop; returns the produce or null. Regrowing crops step back. */
export function harvestTile(state: GameState, x: number, y: number): ItemStack[] | null {
  const s = soilAt(state, x, y);
  if (!s || !isRipe(s.crop)) return null;
  const crop = s.crop!;
  const def = getCrop(crop.id);
  const bal = CROP_BALANCE[crop.id];
  const out: ItemStack[] = [];
  for (let k = 0; k < bal.harvestCount; k++) {
    const q = rollQuality(state, s.fertilized);
    const hit = out.find((o) => o.q === q);
    if (hit) hit.n += 1;
    else out.push({ id: def.harvestItem, q, n: 1 });
  }
  if (bal.regrowDays) crop.days = bal.growthDays - bal.regrowDays;
  else {
    s.crop = null;
    s.fertilized = false;
  }
  return out;
}

/** Orchard tree on a farm tile (stored as a world object). */
export function orchardAt(state: GameState, x: number, y: number) {
  const o = state.maps.farm.objects[farmIdx(x, y)];
  return o && o.kind === 'orchard' ? o : null;
}

export function harvestOrchard(state: GameState, x: number, y: number): ItemStack[] | null {
  const o = orchardAt(state, x, y);
  if (!o || o.fruit <= 0) return null;
  const n = o.fruit;
  o.fruit = 0;
  return [{ id: getTree(o.tree).fruitItem, q: 0, n }];
}

/**
 * Overnight growth (DESIGN.md §3). `heat` is per farm tile. Runs before the calendar advances, so it uses
 * today's season.
 */
export function growOvernight(state: GameState, heat: number[]): void {
  const season = seasonOf(state.day);
  const m = farmMap();
  for (let i = 0; i < state.farm.soil.length; i++) {
    const s = state.farm.soil[i];
    if (!s) continue;
    if (s.crop && !s.crop.withered && s.watered) {
      let rate = 1;
      if (season === 'winter') rate = heat[i] > 0 ? heat[i] : getCrop(s.crop.id).hardy ? HARDY_WINTER_GROWTH : 0;
      s.crop.days = Math.min(growthDays(s.crop.id), s.crop.days + rate);
    }
    s.watered = false;
    // Empty, untended soil slowly returns to grass (never in the greenhouse).
    if (!s.crop && m.terrain[i] !== 'glassfloor' && rngNext(state) < SOIL_REVERT_CHANCE) state.farm.soil[i] = null;
  }
  for (const o of state.maps.farm.objects) {
    if (!o || o.kind !== 'orchard') continue;
    if (o.age < TREE_MATURE_DAYS) {
      if (season !== 'winter') o.age += 1;
    } else if (getTree(o.tree).fruitSeasons.includes(season)) {
      o.fruit = Math.min(3, o.fruit + 1);
    }
  }
}

/** Season change: crops that cannot live in the new season wither (DESIGN.md §3). */
export function applySeasonChange(state: GameState, newSeason: SeasonId, heat: number[]): number {
  let withered = 0;
  for (let i = 0; i < state.farm.soil.length; i++) {
    const s = state.farm.soil[i];
    if (!s?.crop || s.crop.withered) continue;
    const crop = getCrop(s.crop.id);
    const ok = crop.seasons.includes(newSeason) || (newSeason === 'winter' && crop.hardy) || heat[i] > 0;
    if (!ok) {
      s.crop.withered = true;
      withered++;
    }
  }
  for (const o of state.maps.farm.objects) {
    if (o?.kind === 'orchard') o.fruit = 0;
  }
  return withered;
}

/** Rain and snow: rain waters every outdoor soil tile at dawn; snow does not (frozen ground). */
export function applyMorningWeather(state: GameState): void {
  if (state.weather !== 'rain' && state.weather !== 'storm') return;
  const m = farmMap();
  for (let i = 0; i < state.farm.soil.length; i++) {
    const s = state.farm.soil[i];
    if (s && m.terrain[i] !== 'glassfloor') s.watered = true;
  }
}
