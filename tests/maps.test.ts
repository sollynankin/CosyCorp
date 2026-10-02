import { describe, expect, it } from 'vitest';
import { ALL_MAP_IDS, STATIC_MAPS, findPath, getMapDef, parseMap } from '../src/world';
import { isBlocked, newGame } from '../src/sim';

describe('maps', () => {
  it('parse with rectangular rows and known legend chars', () => {
    for (const id of ALL_MAP_IDS) expect(() => parseMap(id)).not.toThrow();
  });

  it("buildings sit on '#' footprints (except flag-gated plots) and doors are on the footprint edge", () => {
    for (const def of STATIC_MAPS) {
      const m = parseMap(def.id);
      for (const b of def.buildings) {
        expect(b.x + b.w <= m.w && b.y + b.h <= m.h, `${b.id} in bounds`).toBe(true);
        if (!b.requiresFlag) {
          for (let y = b.y; y < b.y + b.h; y++)
            for (let x = b.x; x < b.x + b.w; x++) expect(def.rows[y][x], `${b.id} at ${x},${y}`).toBe('#');
        }
        const onEdge = b.door.x >= b.x && b.door.x < b.x + b.w && b.door.y >= b.y && b.door.y < b.y + b.h;
        expect(onEdge, `${b.id} door`).toBe(true);
      }
    }
  });

  it('every warp tile is walkable and lands on a walkable tile that is not itself a warp', () => {
    const s = newGame(1);
    for (const id of ALL_MAP_IDS) {
      const def = getMapDef(id);
      for (const w of def.warps) {
        expect(isBlocked(s, id, w.x, w.y), `${id} warp ${w.x},${w.y}`).toBe(false);
        expect(isBlocked(s, w.to, w.tx, w.ty), `${id} -> ${w.to} landing`).toBe(false);
        const back = getMapDef(w.to).warps.some((o) => o.x === w.tx && o.y === w.ty);
        expect(back, `${id} -> ${w.to} lands on a warp`).toBe(false);
      }
    }
  });

  it('every building door can be reached from the map entry', () => {
    const s = newGame(1);
    for (const def of STATIC_MAPS) {
      const m = parseMap(def.id);
      const entry = def.warps[0];
      // walk from the tile next to the first warp, ignoring removable objects (they can be cleared)
      const walk = (x: number, y: number) => !m.staticBlocked[y * m.w + x] && m.buildingAt[y * m.w + x] < 0;
      for (const b of def.buildings) {
        const DX = [0, 1, 0, -1];
        const DY = [-1, 0, 1, 0];
        const fx = b.door.x + DX[b.doorDir];
        const fy = b.door.y + DY[b.doorDir];
        expect(walk(fx, fy), `${b.id} door front walkable`).toBe(true);
        const path = findPath(m.w, m.h, walk, entry.x, entry.y, fx, fy);
        expect(path, `${def.id}: path to ${b.id}`).not.toBeNull();
      }
    }
    expect(s.day).toBe(0);
  });
});
