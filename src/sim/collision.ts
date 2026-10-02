// Tile blocking and circle movement (DESIGN.md §2).
import { PLAYER_RADIUS } from '../data/balance';
import { getMachine } from '../data';
import type { MapId } from '../data/types';
import { buildingAtTile, inBounds, parseMap } from '../world';
import type { GameState, WorldObject } from './state';

export function objectBlocks(o: WorldObject | null): boolean {
  if (!o) return false;
  return o.kind !== 'forage' && o.kind !== 'ladder' && o.kind !== 'story' && o.kind !== 'bunny';
}

/** Whether a tile blocks walking for the player in the current state. */
export function isBlocked(state: GameState, mapId: MapId, x: number, y: number): boolean {
  const m = parseMap(mapId);
  if (!inBounds(m, x, y)) return true;
  const i = y * m.w + x;
  if (m.staticBlocked[i]) {
    // boards over water are walkable (bridges, docks): their terrain is 'boards', never blocked
    return true;
  }
  if (buildingAtTile(m, x, y, state.flags)) return true;
  if (objectBlocks(state.maps[mapId].objects[i])) return true;
  if (mapId === 'farm') {
    const eid = state.farm.entityAt[i];
    if (eid >= 0) {
      const e = state.farm.entities.find((en) => en.id === eid);
      const kind = e ? getMachine(e.type).kind : null;
      if (kind !== 'belt' && kind !== 'splitter') return true;
    }
  }
  return false;
}

function circleHitsTile(cx: number, cy: number, r: number, tx: number, ty: number): boolean {
  const nx = Math.max(tx, Math.min(cx, tx + 1));
  const ny = Math.max(ty, Math.min(cy, ty + 1));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r - 1e-9;
}

export function circleBlocked(state: GameState, mapId: MapId, cx: number, cy: number, r = PLAYER_RADIUS): boolean {
  for (let ty = Math.floor(cy - r); ty <= Math.floor(cy + r); ty++) {
    for (let tx = Math.floor(cx - r); tx <= Math.floor(cx + r); tx++) {
      if (isBlocked(state, mapId, tx, ty) && circleHitsTile(cx, cy, r, tx, ty)) return true;
    }
  }
  return false;
}

/**
 * Moves a circle by (dx, dy), resolving X then Y so it slides along walls. Returns the new position.
 * If the start position is already inside a blocked tile (e.g. a machine was placed on the player), it
 * moves freely so the player can walk out.
 */
export function moveCircle(state: GameState, mapId: MapId, x: number, y: number, dx: number, dy: number): [number, number] {
  if (circleBlocked(state, mapId, x, y)) return [x + dx, y + dy];
  let nx = x + dx;
  if (circleBlocked(state, mapId, nx, y)) nx = x;
  let ny = y + dy;
  if (circleBlocked(state, mapId, nx, ny)) ny = y;
  return [nx, ny];
}
