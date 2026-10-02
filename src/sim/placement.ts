// Placing, rotating and picking up machines on the farm (DESIGN.md §4).
import { getItem, getMachine } from '../data';
import type { Dir } from '../data/types';
import { DX, DY, isWaterTerrain, parseMap } from '../world';
import { emit, type DayContext } from './context';
import { giveItem } from './actions';
import type { CommandResult } from './commands';
import { countItem, removeItem } from './inventory';
import type { Entity, GameState } from './state';

const OK: CommandResult = { ok: true };
const fail = (reason: string): CommandResult => ({ ok: false, reason });

export function entityAt(state: GameState, x: number, y: number): Entity | null {
  const m = parseMap('farm');
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return null;
  const id = state.farm.entityAt[y * m.w + x];
  if (id < 0) return null;
  return state.farm.entities.find((e) => e.id === id) ?? null;
}

export function newEntity(id: number, type: string, x: number, y: number, dir: Dir): Entity {
  return { id, type, x, y, dir, belt: [], input: {}, output: [], stored: [], recipe: null, progress: 0, lastEntry: -1000, inRR: 0, outRR: 0, status: 'idle' };
}

/** Why a machine can't go on (x, y), or null if it can. */
export function placementProblem(state: GameState, type: string, x: number, y: number): string | null {
  const m = parseMap('farm');
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 'Out of bounds.';
  const i = y * m.w + x;
  if (m.staticBlocked[i]) return "Can't build there.";
  const t = m.terrain[i];
  if (t !== 'grass' && t !== 'path' && !(t === 'glassfloor' && state.flags.includes('greenhouse'))) return "Can't build there.";
  if (m.buildingAt[i] >= 0) return 'That spot is reserved for a building.';
  if (state.maps.farm.objects[i]) return 'Clear the ground first.';
  if (state.farm.entityAt[i] >= 0) return 'Something is already there.';
  if (state.farm.soil[i]?.crop) return 'A crop is growing there.';
  const def = getMachine(type);
  if (def.source === 'water') {
    let wet = false;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && isWaterTerrain(m.terrain[ny * m.w + nx])) wet = true;
    }
    if (!wet) return 'A Water Wheel must touch the stream.';
  }
  if (state.player.map === 'farm' && Math.floor(state.player.x) === x && Math.floor(state.player.y) === y && def.kind !== 'belt' && def.kind !== 'splitter') {
    return "You're standing there.";
  }
  return null;
}

export function placeMachine(state: GameState, ctx: DayContext, item: string, x: number, y: number, dir: Dir): CommandResult {
  if (state.player.map !== 'farm') return fail('Machines go on the farm.');
  const def = getItem(item);
  if (def.category !== 'machine' || !def.places) return fail("That isn't a machine.");
  if (countItem(state.player.inventory, item) < 1) return fail(`You have no ${def.name}.`);
  const problem = placementProblem(state, def.places, x, y);
  if (problem) return fail(problem);
  const m = parseMap('farm');
  removeItem(state.player.inventory, item, 1);
  const e = newEntity(state.farm.nextEntityId++, def.places, x, y, dir);
  state.farm.entities.push(e);
  state.farm.entityAt[y * m.w + x] = e.id;
  // Placing on empty tilled soil turns it back into ground.
  state.farm.soil[y * m.w + x] = null;
  state.farm.layoutRev++;
  emit(ctx, { type: 'fx', fx: 'place', map: 'farm', x, y });
  return OK;
}

export function rotateMachine(state: GameState, x: number, y: number, dir?: Dir): CommandResult {
  const e = entityAt(state, x, y);
  if (!e) return fail('Nothing to rotate.');
  e.dir = dir ?? (((e.dir + 1) % 4) as Dir);
  state.farm.layoutRev++;
  return OK;
}

/** Picks a machine up: the machine item and everything inside it go back to the backpack. */
export function pickupMachine(state: GameState, ctx: DayContext, x: number, y: number): CommandResult {
  if (state.player.map !== 'farm') return fail('Machines are on the farm.');
  const e = entityAt(state, x, y);
  if (!e) return fail('Nothing to pick up.');
  const m = parseMap('farm');
  state.farm.entities = state.farm.entities.filter((o) => o.id !== e.id);
  state.farm.entityAt[y * m.w + x] = -1;
  state.farm.layoutRev++;
  giveItem(state, ctx, getMachine(e.type).item, 1);
  for (const b of e.belt) giveItem(state, ctx, b.item, 1, b.q);
  for (const st of [...e.output, ...e.stored]) giveItem(state, ctx, st.id, st.n, st.q);
  for (const [id, n] of Object.entries(e.input)) if (n > 0) giveItem(state, ctx, id, n);
  emit(ctx, { type: 'fx', fx: 'place', map: 'farm', x, y });
  return OK;
}
