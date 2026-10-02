// Test fixtures. sandbox() gives a fresh game with a context; helpers place things directly.
import { buildContext, newGame, step, type Command, type DayContext, type GameState } from '../src/sim';
import { addItem } from '../src/sim/inventory';
import { farmIdx } from '../src/sim/farming';

export interface Sandbox {
  s: GameState;
  ctx: DayContext;
}

export function sandbox(seed = 42): Sandbox {
  const s = newGame(seed);
  const ctx = buildContext(s);
  return { s, ctx };
}

/** Clears farm objects in a rectangle so tests have free ground. */
export function clearFarm(s: GameState, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.maps.farm.objects[farmIdx(x, y)] = null;
}

/** Tilled soil with an optional crop at a growth fraction. */
export function soil(s: GameState, x: number, y: number, crop?: string, days = 0): void {
  s.maps.farm.objects[farmIdx(x, y)] = null;
  s.farm.soil[farmIdx(x, y)] = { watered: false, fertilized: false, crop: crop ? { id: crop, days, withered: false } : null };
}

export function give(s: GameState, id: string, n: number): void {
  addItem(s.player.inventory, id, n);
}

/** Puts the player at a tile centre facing a direction. */
export function stand(s: GameState, x: number, y: number, facing: 0 | 1 | 2 | 3 = 2, map = 'farm'): void {
  s.player.map = map;
  s.player.x = x + 0.5;
  s.player.y = y + 0.5;
  s.player.facing = facing;
}

export function selectItem(s: GameState, id: string): void {
  const i = s.player.inventory.findIndex((sl) => sl?.id === id);
  if (i < 0) throw new Error(`no ${id} in inventory`);
  if (i >= 10) {
    const inv = s.player.inventory;
    [inv[i], inv[9]] = [inv[9], inv[i]];
    s.player.selected = 9;
  } else s.player.selected = i;
}

/** Applies a command and returns its result, then lets swing time pass. */
export function act(sb: Sandbox, cmd: Command) {
  const r = step(sb.s, sb.ctx, [cmd]).results[0];
  for (let k = 0; k < 4; k++) step(sb.s, sb.ctx);
  return r;
}
