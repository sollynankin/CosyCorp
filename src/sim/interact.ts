// Interact (E / right click) on a tile: harvest, pick up, open doors, feed machines.
import { buildingAtTile, parseMap } from '../world';
import { emit, type DayContext } from './context';
import { giveItem, handHarvest } from './actions';
import type { CommandResult } from './commands';
import type { GameState } from './state';
import { interactMachine } from './machineInteract';

const OK: CommandResult = { ok: true };

export function interactTile(state: GameState, ctx: DayContext, x: number, y: number): CommandResult {
  const p = state.player;
  const m = parseMap(p.map);
  const i = y * m.w + x;
  const objs = state.maps[p.map].objects;
  const o = objs[i];

  if (o?.kind === 'forage') {
    objs[i] = null;
    giveItem(state, ctx, o.item, 1);
    emit(ctx, { type: 'fx', fx: 'harvest', map: p.map, x, y });
    return OK;
  }

  const b = buildingAtTile(m, x, y, state.flags);
  if (b) {
    emit(ctx, { type: 'panel', panel: b.panel, building: b.id });
    return OK;
  }

  if (p.map === 'farm') {
    if (handHarvest(state, ctx, x, y)) return OK;
    const r = interactMachine(state, ctx, x, y);
    if (r) return r;
  }
  return { ok: false, reason: 'Nothing to do there.' };
}
