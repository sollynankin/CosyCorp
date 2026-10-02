// Mine floor layouts. The rock walls are a pure function of the floor number, so every floor keeps its
// shape. Rocks, ore and the ladder are rolled into state each time you enter (sim/mine.ts).
import { hash32 } from '../sim/hash';
import type { MapDef } from './types';

export const MINE_FLOORS = 10;
export const MINE_W = 22;
export const MINE_H = 18;

export function mineFloorNumber(mapId: string): number {
  const m = /^mine(\d+)$/.exec(mapId);
  return m ? Number(m[1]) : 0;
}

const defs = new Map<number, MapDef>();

export function mineFloorDef(floor: number): MapDef {
  const hit = defs.get(floor);
  if (hit) return hit;
  const rows: string[] = [];
  for (let y = 0; y < MINE_H; y++) {
    let row = '';
    for (let x = 0; x < MINE_W; x++) {
      const edge = x === 0 || y === 0 || x === MINE_W - 1 || y === MINE_H - 1;
      // Irregular cave edge: a second ring of wall on a hash, never near the entry at (10, 2).
      const ring = x === 1 || y === 1 || x === MINE_W - 2 || y === MINE_H - 2;
      const nearEntry = Math.abs(x - 10) <= 2 && y <= 4;
      const inner = !ring && !edge && !nearEntry && hash32(floor, x, y, 7) % 100 < 4;
      const wall = edge || (ring && !nearEntry && hash32(floor, x, y) % 3 === 0) || inner;
      row += wall ? 'W' : ',';
    }
    rows.push(row);
  }
  const def: MapDef = {
    id: `mine${floor}`,
    name: `The Under-Sluice, floor ${floor}`,
    rows,
    buildings: [],
    // The way up is the ladder at the entry tile (handled as a warp so it is always there).
    warps: [{ x: 10, y: 1, to: floor === 1 ? 'forest' : `mine${floor - 1}`, tx: floor === 1 ? 21 : 10, ty: floor === 1 ? 28 : 2, dir: 2 }],
    fishing: 'mine',
    indoor: true,
  };
  // The ladder-up tile must be walkable.
  def.rows[1] = def.rows[1].slice(0, 10) + ',' + def.rows[1].slice(11);
  defs.set(floor, def);
  return def;
}
