// Map lookup, parsing and static queries. Pure: parsed maps are memoised by id and never mutated.
import type { Dir, MapId } from '../data/types';
import { LEGEND } from './legend';
import { FARM } from './maps/farm';
import { FOREST } from './maps/forest';
import { LAKE } from './maps/lake';
import { mineFloorDef, MINE_FLOORS } from './mine';
import { TOWN } from './maps/town';
import type { BuildingDef, Decor, MapDef, SeedObject, Terrain } from './types';

export * from './types';
export { MINE_FLOORS, mineFloorNumber } from './mine';

export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

export const STATIC_MAPS: MapDef[] = [FARM, TOWN, FOREST, LAKE];

export interface ParsedMap {
  def: MapDef;
  w: number;
  h: number;
  terrain: Terrain[];
  decor: (Decor | null)[];
  seedObjects: (SeedObject | null)[];
  /** building index per tile, -1 if none (includes buildings gated by flags) */
  buildingAt: number[];
  /** static blocking: terrain + decor (buildings are checked separately because some are gated) */
  staticBlocked: boolean[];
}

const cache = new Map<MapId, ParsedMap>();

export function getMapDef(id: MapId): MapDef {
  const s = STATIC_MAPS.find((m) => m.id === id);
  if (s) return s;
  const floor = /^mine(\d+)$/.exec(id);
  if (floor) return mineFloorDef(Number(floor[1]));
  throw new Error(`unknown map: ${id}`);
}

export const ALL_MAP_IDS: MapId[] = [
  ...STATIC_MAPS.map((m) => m.id),
  ...Array.from({ length: MINE_FLOORS }, (_, i) => `mine${i + 1}`),
];

export function parseMap(id: MapId): ParsedMap {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = getMapDef(id);
  const h = def.rows.length;
  const w = def.rows[0].length;
  const terrain: Terrain[] = [];
  const decor: (Decor | null)[] = [];
  const seedObjects: (SeedObject | null)[] = [];
  const staticBlocked: boolean[] = [];
  for (let y = 0; y < h; y++) {
    const row = def.rows[y];
    if (row.length !== w) throw new Error(`map ${id}: row ${y} has length ${row.length}, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const e = LEGEND[row[x]];
      if (!e) throw new Error(`map ${id}: unknown legend char '${row[x]}' at ${x},${y}`);
      terrain.push(e.terrain);
      decor.push(e.decor ?? null);
      seedObjects.push(e.object ?? null);
      staticBlocked.push(isBlockingTerrain(e.terrain) || (!!e.decor && e.decor !== 'minemouth'));
    }
  }
  const buildingAt = new Array<number>(w * h).fill(-1);
  def.buildings.forEach((b, bi) => {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) buildingAt[y * w + x] = bi;
  });
  const parsed: ParsedMap = { def, w, h, terrain, decor, seedObjects, buildingAt, staticBlocked };
  cache.set(id, parsed);
  return parsed;
}

export function isBlockingTerrain(t: Terrain): boolean {
  return t === 'water' || t === 'lake' || t === 'cliff';
}

export function isWaterTerrain(t: Terrain): boolean {
  return t === 'water' || t === 'lake';
}

export function inBounds(m: ParsedMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < m.w && y < m.h;
}

export function tileIndex(m: ParsedMap, x: number, y: number): number {
  return y * m.w + x;
}

/** Building at a tile if it exists in this state (flags gate coop and barn). */
export function buildingAtTile(m: ParsedMap, x: number, y: number, flags: string[]): BuildingDef | null {
  if (!inBounds(m, x, y)) return null;
  const bi = m.buildingAt[y * m.w + x];
  if (bi < 0) return null;
  const b = m.def.buildings[bi];
  if (b.requiresFlag && !flags.includes(b.requiresFlag)) return null;
  return b;
}

export function warpAt(m: ParsedMap, x: number, y: number) {
  return m.def.warps.find((w) => w.x === x && w.y === y) ?? null;
}

/** Tiles within Chebyshev radius r of (cx, cy), row-major, clipped to the map. */
export function tilesInRadius(w: number, h: number, cx: number, cy: number, r: number): [number, number][] {
  const out: [number, number][] = [];
  for (let y = cy - r; y <= cy + r; y++) {
    if (y < 0 || y >= h) continue;
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || x >= w) continue;
      if (x === cx && y === cy) continue;
      out.push([x, y]);
    }
  }
  return out;
}

export function opposite(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}
export function rotateCW(d: Dir): Dir {
  return ((d + 1) % 4) as Dir;
}
export function rotateCCW(d: Dir): Dir {
  return ((d + 3) % 4) as Dir;
}

/** Direction from a vector, preferring the larger axis. */
export function dirFromVector(dx: number, dy: number, fallback: Dir): Dir {
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3;
  return dy > 0 ? 2 : 0;
}

/**
 * Breadth-first path over walkable tiles (4-neighbour). `walkable(x, y)` decides blocking, so callers can
 * include or exclude dynamic objects. Returns the tile list from start (exclusive) to goal (inclusive), or
 * null. Deterministic: neighbours are expanded in N, E, S, W order.
 */
export function findPath(
  w: number,
  h: number,
  walkable: (x: number, y: number) => boolean,
  sx: number,
  sy: number,
  gx: number,
  gy: number,
  maxNodes = 4000,
): [number, number][] | null {
  if (sx === gx && sy === gy) return [];
  const prev = new Int32Array(w * h).fill(-1);
  const start = sy * w + sx;
  const goal = gy * w + gx;
  prev[start] = start;
  const queue = [start];
  let head = 0;
  while (head < queue.length && head < maxNodes) {
    const cur = queue[head++];
    if (cur === goal) break;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (prev[ni] !== -1) continue;
      if (ni !== goal && !walkable(nx, ny)) continue;
      prev[ni] = cur;
      queue.push(ni);
    }
  }
  if (prev[goal] === -1) return null;
  const path: [number, number][] = [];
  for (let c = goal; c !== start; c = prev[c]) path.push([c % w, Math.floor(c / w)]);
  return path.reverse();
}
