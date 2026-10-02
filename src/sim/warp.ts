// Map transitions (DESIGN.md §2).
import { parseMap, warpAt } from '../world';
import type { DayContext } from './context';
import { enterMap } from './mapEnter';
import type { GameState } from './state';

/** If the player stands on a warp tile, move them to its target. */
export function checkWarp(state: GameState, ctx: DayContext): boolean {
  const p = state.player;
  const m = parseMap(p.map);
  const w = warpAt(m, Math.floor(p.x), Math.floor(p.y));
  if (!w) return false;
  warpTo(state, ctx, w.to, w.tx, w.ty, w.dir);
  return true;
}

export function warpTo(state: GameState, ctx: DayContext, map: string, tx: number, ty: number, dir: 0 | 1 | 2 | 3): void {
  const p = state.player;
  const from = p.map;
  p.map = map;
  p.x = tx + 0.5;
  p.y = ty + 0.5;
  p.facing = dir;
  p.moving = false;
  enterMap(state, ctx, from, map);
  ctx.events.push({ type: 'warp', to: map });
}
