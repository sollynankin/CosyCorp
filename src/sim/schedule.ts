// Villager positions as a pure function of (day, minute, weather, flags, schedule) (DESIGN.md §9).
// Nothing here is stored in GameState; paths are memoised by endpoints in a module cache.
import { DAY_START_HOUR, FESTIVAL_GATHER_MINUTES, NPC_SPEED, NPC_TALK_RADIUS, TICKS_PER_MINUTE } from '../data/balance';
import { FESTIVALS } from '../data/festivals';
import { VILLAGERS } from '../data/villagers';
import type { Dir, MapId, ScheduleStop, ScheduleVariant, VillagerDef } from '../data/types';
import { dirFromVector, findPath, getMapDef, parseMap } from '../world';
import { dayOfSeason, minuteOfClock, seasonOf } from './calendar';
import { conditionsHold } from './conditions';
import type { GameState } from './state';

export interface NpcPos {
  id: string;
  map: MapId;
  /** tile-centre coordinates (x + 0.5 is a tile centre) */
  x: number;
  y: number;
  facing: Dir;
  moving: boolean;
  hidden: boolean;
}

interface Leg {
  map: MapId;
  /** tiles from start (inclusive) to end (inclusive) */
  tiles: [number, number][];
}

const pathCache = new Map<string, [number, number][]>();
const routeCache = new Map<string, Leg[]>();

/** Static walkability for villagers: terrain, decor, building footprints (doors are open) and initial objects. */
function npcWalkable(map: MapId): (x: number, y: number) => boolean {
  const m = parseMap(map);
  const doors = new Set(m.def.buildings.map((b) => b.door.y * m.w + b.door.x));
  return (x, y) => {
    const i = y * m.w + x;
    if (m.staticBlocked[i]) return false;
    if (m.buildingAt[i] >= 0 && !doors.has(i)) return false;
    const o = m.seedObjects[i];
    return !o || o === 'forageSpot';
  };
}

function legPath(map: MapId, sx: number, sy: number, tx: number, ty: number): [number, number][] {
  const key = `${map}|${sx},${sy}|${tx},${ty}`;
  let p = pathCache.get(key);
  if (!p) {
    const m = parseMap(map);
    const found = findPath(m.w, m.h, npcWalkable(map), sx, sy, tx, ty);
    // Unreachable stops (a data bug, caught by tests) degrade to a jump rather than a crash.
    p = [[sx, sy], ...(found ?? [[tx, ty]])];
    pathCache.set(key, p);
  }
  return p;
}

/** Shortest chain of maps from a to b over warps (BFS in warp declaration order). */
export function mapRoute(a: MapId, b: MapId): MapId[] {
  if (a === b) return [a];
  const prev = new Map<MapId, MapId>([[a, a]]);
  const queue = [a];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const w of getMapDef(cur).warps) {
      if (prev.has(w.to) || w.to.startsWith('mine')) continue;
      prev.set(w.to, cur);
      if (w.to === b) {
        const out = [b];
        for (let c = b; c !== a; ) {
          c = prev.get(c)!;
          out.unshift(c);
        }
        return out;
      }
      queue.push(w.to);
    }
  }
  return [a];
}

/** Legs walking from one stop to the next, across maps. */
export function route(from: ScheduleStop, to: ScheduleStop): Leg[] {
  const key = `${from.map}|${from.x},${from.y}>${to.map}|${to.x},${to.y}`;
  const hit = routeCache.get(key);
  if (hit) return hit;
  const maps = mapRoute(from.map, to.map);
  const legs: Leg[] = [];
  let [sx, sy] = [from.x, from.y];
  for (let k = 0; k < maps.length; k++) {
    const map = maps[k];
    if (k === maps.length - 1) {
      legs.push({ map, tiles: legPath(map, sx, sy, to.x, to.y) });
      break;
    }
    const warp = getMapDef(map).warps.find((w) => w.to === maps[k + 1])!;
    legs.push({ map, tiles: legPath(map, sx, sy, warp.x, warp.y) });
    [sx, sy] = [warp.tx, warp.ty];
  }
  routeCache.set(key, legs);
  return legs;
}

export function routeLength(legs: Leg[]): number {
  return legs.reduce((a, l) => a + l.tiles.length - 1, 0);
}

export function scheduleFor(state: GameState, v: VillagerDef, day = state.day): ScheduleVariant {
  const base = v.schedule.find((s) => conditionsHold(state, s.when, v.id, day)) ?? v.schedule[v.schedule.length - 1];
  // Festival days: everyone walks to their spot an hour early and goes home when it ends.
  const f = FESTIVALS.find((x) => x.season === seasonOf(day) && x.day === dayOfSeason(day));
  const spot = f?.spots[v.id];
  if (!f || !spot) return base;
  const home = base.stops[0];
  const leave = clockLabel24(minuteOfClock(f.start) - FESTIVAL_GATHER_MINUTES);
  return { stops: [home, { time: leave, map: 'town', x: spot[0], y: spot[1] }, { ...home, time: f.end }] };
}

function clockLabel24(minute: number): string {
  const total = minute + DAY_START_HOUR * 60;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Where a villager is at a (fractional) minute of the current day. */
export function villagerPos(state: GameState, v: VillagerDef, minute: number): NpcPos {
  const stops = scheduleFor(state, v).stops;
  let k = 0;
  for (let i = 0; i < stops.length; i++) if (minuteOfClock(stops[i].time) <= minute) k = i;
  const dest = stops[k];
  const origin = k === 0 ? stops[0] : stops[k - 1];
  const legs = route(origin, dest);
  const total = routeLength(legs);
  const walked = Math.max(0, (minute - minuteOfClock(dest.time)) * NPC_SPEED);
  if (walked >= total) return { id: v.id, map: dest.map, x: dest.x + 0.5, y: dest.y + 0.5, facing: 2, moving: false, hidden: !!dest.hidden };
  let d = walked;
  for (const leg of legs) {
    const n = leg.tiles.length - 1;
    if (d > n) {
      d -= n;
      continue;
    }
    const i = Math.min(n - 1, Math.floor(d));
    const f = n === 0 ? 0 : d - i;
    const [ax, ay] = leg.tiles[i];
    const [bx, by] = leg.tiles[Math.min(n, i + 1)];
    const facing = dirFromVector(bx - ax, by - ay, 2) as Dir;
    return { id: v.id, map: leg.map, x: ax + (bx - ax) * f + 0.5, y: ay + (by - ay) * f + 0.5, facing, moving: true, hidden: false };
  }
  return { id: v.id, map: dest.map, x: dest.x + 0.5, y: dest.y + 0.5, facing: 2, moving: false, hidden: !!dest.hidden };
}

/** The sim's current fractional minute (the render layer adds its own tick fraction). */
export function simMinute(state: GameState): number {
  return state.minute + state.subTick / TICKS_PER_MINUTE;
}

/** Visible villagers on a map at a minute. */
export function villagersOn(state: GameState, map: MapId, minute = simMinute(state)): NpcPos[] {
  const out: NpcPos[] = [];
  for (const v of VILLAGERS) {
    const p = villagerPos(state, v, minute);
    if (p.map === map && !p.hidden) out.push(p);
  }
  return out;
}

/** The villager standing at (or walking through) a tile, if any: the nearest within NPC_TALK_RADIUS. */
export function villagerAtTile(state: GameState, x: number, y: number): string | null {
  let best: string | null = null;
  let bestD = NPC_TALK_RADIUS;
  for (const p of villagersOn(state, state.player.map)) {
    const d = Math.hypot(p.x - (x + 0.5), p.y - (y + 0.5));
    if (d <= bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return best;
}

/** Data check: every leg between two stops has a real path (no fallback jumps). */
export function routeReachable(from: ScheduleStop, to: ScheduleStop): boolean {
  const maps = mapRoute(from.map, to.map);
  if (maps[maps.length - 1] !== to.map) return false;
  let [sx, sy] = [from.x, from.y];
  for (let k = 0; k < maps.length; k++) {
    const m = parseMap(maps[k]);
    const last = k === maps.length - 1;
    const warp = last ? null : getMapDef(maps[k]).warps.find((w) => w.to === maps[k + 1])!;
    const [tx, ty] = warp ? [warp.x, warp.y] : [to.x, to.y];
    if (!findPath(m.w, m.h, npcWalkable(maps[k]), sx, sy, tx, ty)) return false;
    if (warp) [sx, sy] = [warp.tx, warp.ty];
  }
  return true;
}
