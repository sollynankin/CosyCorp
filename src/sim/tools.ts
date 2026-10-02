// Tool actions on tiles (DESIGN.md §3). Each returns true if it did something (energy is only spent then).
import {
  BOULDER_STONE,
  CAN_CAPACITY,
  STONE_YIELD,
  STUMP_HP,
  STUMP_WOOD,
  TOOL_AREA,
  TOOL_DAMAGE,
  TOOL_ENERGY,
  TOOL_TIER_ENERGY_MULT,
  TREE_REGROW_DAYS,
  TREE_WOOD,
  TWIG_WOOD,
  WEEDS_FIBER_CHANCE,
  XP_ORE,
  XP_STONE,
  MINING_BONUS_PER_LEVEL,
} from '../data/balance';
import type { Dir, ItemId, ToolId } from '../data/types';
import { DX, DY, inBounds, isWaterTerrain, parseMap } from '../world';
import { emit, toast, type DayContext } from './context';
import { farmIdx, isTillableGround, soilAt } from './farming';
import { giveItem, handHarvest } from './actions';
import { rngNext } from './rng';
import { gainXp, skillLevel } from './skills';
import type { GameState } from './state';
import { startFishing } from './fishing';
import { onRockBroken } from './mine';

export function toolEnergy(state: GameState, tool: ToolId): number {
  const tier = state.player.tools[tool];
  return Math.round(TOOL_ENERGY[tool] * TOOL_TIER_ENERGY_MULT[tier] * 10) / 10;
}

/** Tiles a hoe or can swing affects: a row of TOOL_AREA[tier] tiles starting at the target, away from the player. */
export function areaTiles(state: GameState, tool: ToolId, x: number, y: number, dir: Dir): [number, number][] {
  const n = tool === 'hoe' || tool === 'can' ? TOOL_AREA[state.player.tools[tool]] : 1;
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) out.push([x + DX[dir] * k, y + DY[dir] * k]);
  return out;
}

function hasEntity(state: GameState, x: number, y: number): boolean {
  return state.farm.entityAt[farmIdx(x, y)] >= 0;
}

function hoeTile(state: GameState, ctx: DayContext, x: number, y: number): boolean {
  if (state.player.map !== 'farm') return false;
  const i = farmIdx(x, y);
  const obj = state.maps.farm.objects[i];
  const soil = state.farm.soil[i];
  if (soil) return false;
  if (obj || hasEntity(state, x, y) || !isTillableGround(state, x, y)) return false;
  state.farm.soil[i] = { watered: false, fertilized: false, crop: null };
  emit(ctx, { type: 'fx', fx: 'till', map: 'farm', x, y });
  return true;
}

function waterTile(state: GameState, ctx: DayContext, x: number, y: number): boolean {
  if (state.player.map !== 'farm' || state.player.canWater <= 0) return false;
  const s = soilAt(state, x, y);
  if (!s || s.watered) return false;
  s.watered = true;
  state.player.canWater -= 1;
  emit(ctx, { type: 'fx', fx: 'water', map: 'farm', x, y });
  return true;
}

function damageObject(state: GameState, ctx: DayContext, tool: 'axe' | 'pickaxe', x: number, y: number): boolean {
  const mapId = state.player.map;
  const m = parseMap(mapId);
  const i = y * m.w + x;
  const objs = state.maps[mapId].objects;
  const o = objs[i];
  if (!o) return false;
  const dmg = TOOL_DAMAGE[state.player.tools[tool]];
  if (tool === 'axe') {
    if (o.kind === 'twig') {
      objs[i] = null;
      giveItem(state, ctx, 'wood', TWIG_WOOD);
      emit(ctx, { type: 'fx', fx: 'chop', map: mapId, x, y });
      return true;
    }
    if (o.kind !== 'tree') return false;
    o.hp -= dmg;
    emit(ctx, { type: 'fx', fx: 'chop', map: mapId, x, y });
    if (o.hp <= 0) {
      if (!o.stump) {
        giveItem(state, ctx, 'wood', TREE_WOOD);
        o.stump = true;
        o.hp = STUMP_HP;
        o.regrow = TREE_REGROW_DAYS;
      } else {
        giveItem(state, ctx, 'wood', STUMP_WOOD);
        objs[i] = null;
      }
    }
    return true;
  }
  // pickaxe
  if (o.kind === 'stone' || o.kind === 'boulder' || o.kind === 'ore') {
    o.hp -= dmg;
    emit(ctx, { type: 'fx', fx: 'mine', map: mapId, x, y });
    if (o.hp > 0) return true;
    objs[i] = null;
    const bonus = rngNext(state) < skillLevel(state, 'mining') * MINING_BONUS_PER_LEVEL ? 1 : 0;
    if (o.kind === 'stone') {
      giveItem(state, ctx, 'stone', STONE_YIELD + bonus);
      gainXp(state, ctx, 'mining', XP_STONE);
    } else if (o.kind === 'boulder') {
      giveItem(state, ctx, 'stone', BOULDER_STONE + bonus);
      gainXp(state, ctx, 'mining', XP_STONE * 3);
    } else {
      giveItem(state, ctx, o.item, 1 + bonus);
      gainXp(state, ctx, 'mining', XP_ORE);
    }
    onRockBroken(state, ctx, mapId, x, y);
    return true;
  }
  return false;
}

function scytheTile(state: GameState, ctx: DayContext, x: number, y: number): boolean {
  const mapId = state.player.map;
  const m = parseMap(mapId);
  const i = y * m.w + x;
  const o = state.maps[mapId].objects[i];
  if (o?.kind === 'weeds') {
    state.maps[mapId].objects[i] = null;
    if (rngNext(state) < WEEDS_FIBER_CHANCE) giveItem(state, ctx, 'fiber', 1);
    emit(ctx, { type: 'fx', fx: 'harvest', map: mapId, x, y });
    return true;
  }
  if (o?.kind === 'bunny') {
    state.maps[mapId].objects[i] = null;
    giveItem(state, ctx, 'coal', 1);
    emit(ctx, { type: 'fx', fx: 'poof', map: mapId, x, y });
    return true;
  }
  if (mapId !== 'farm') return false;
  const s = soilAt(state, x, y);
  if (s?.crop?.withered) {
    s.crop = null;
    emit(ctx, { type: 'fx', fx: 'harvest', map: mapId, x, y });
    return true;
  }
  return handHarvest(state, ctx, x, y);
}

/** Applies a tool to the target tile (and its area). Returns true if anything happened. */
export function useTool(state: GameState, ctx: DayContext, tool: ToolId, x: number, y: number): boolean {
  const p = state.player;
  const m = parseMap(p.map);
  if (!inBounds(m, x, y)) return false;
  switch (tool) {
    case 'hoe': {
      let any = false;
      for (const [tx, ty] of areaTiles(state, 'hoe', x, y, p.facing)) if (inBounds(m, tx, ty) && hoeTile(state, ctx, tx, ty)) any = true;
      // Hoe also pokes anything a bunny-shaped (light monster) on the target, like any tool.
      return poofBunny(state, ctx, x, y) || any;
    }
    case 'can': {
      if (isWaterTerrain(m.terrain[y * m.w + x])) {
        const cap = CAN_CAPACITY[p.tools.can];
        if (p.canWater >= cap) return false;
        p.canWater = cap;
        emit(ctx, { type: 'fx', fx: 'splash', map: p.map, x, y });
        return true;
      }
      if (p.canWater <= 0) {
        toast(ctx, 'The watering can is empty. Refill it at any water.');
        return false;
      }
      let any = false;
      for (const [tx, ty] of areaTiles(state, 'can', x, y, p.facing)) if (inBounds(m, tx, ty) && waterTile(state, ctx, tx, ty)) any = true;
      return poofBunny(state, ctx, x, y) || any;
    }
    case 'axe':
      return poofBunny(state, ctx, x, y) || damageObject(state, ctx, 'axe', x, y);
    case 'pickaxe':
      return poofBunny(state, ctx, x, y) || damageObject(state, ctx, 'pickaxe', x, y) || unTill(state, ctx, x, y);
    case 'scythe':
      return scytheTile(state, ctx, x, y);
    case 'rod':
      return startFishing(state, ctx, x, y);
  }
}

function unTill(state: GameState, ctx: DayContext, x: number, y: number): boolean {
  if (state.player.map !== 'farm') return false;
  const i = farmIdx(x, y);
  const s = state.farm.soil[i];
  if (!s || s.crop) return false;
  state.farm.soil[i] = null;
  emit(ctx, { type: 'fx', fx: 'till', map: 'farm', x, y });
  return true;
}

function poofBunny(state: GameState, ctx: DayContext, x: number, y: number): boolean {
  const mapId = state.player.map;
  const m = parseMap(mapId);
  const i = y * m.w + x;
  const o = state.maps[mapId].objects[i];
  if (o?.kind !== 'bunny') return false;
  state.maps[mapId].objects[i] = null;
  giveItem(state, ctx, 'coal' as ItemId, 1);
  emit(ctx, { type: 'fx', fx: 'poof', map: mapId, x, y });
  return true;
}
