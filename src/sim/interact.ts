// Interact (E / right click) on a tile: talk, pick up, open doors, harvest, feed machines.
import { buildingAtTile, parseMap } from '../world';
import { emit, type DayContext } from './context';
import { giveItem, handHarvest } from './actions';
import type { CommandResult } from './commands';
import { collectPod, festivalOn } from './festival';
import type { GameState } from './state';
import { interactMachine } from './machineInteract';
import { updateQuests } from './quests';
import { villagerAtTile } from './schedule';
import { talkTo } from './villagers';

const OK: CommandResult = { ok: true };

export function interactTile(state: GameState, ctx: DayContext, x: number, y: number): CommandResult {
  const p = state.player;
  const m = parseMap(p.map);
  const i = y * m.w + x;
  const objs = state.maps[p.map].objects;
  const o = objs[i];

  const villager = villagerAtTile(state, x, y);
  if (villager) return talkTo(state, ctx, villager);

  if (o?.kind === 'forage') {
    objs[i] = null;
    giveItem(state, ctx, o.item, 1);
    emit(ctx, { type: 'fx', fx: 'harvest', map: p.map, x, y });
    return OK;
  }
  if (o?.kind === 'story') {
    if (p.map === 'town' && collectPod(state, ctx, x, y)) {
      emit(ctx, { type: 'fx', fx: 'sparkle', map: p.map, x, y });
      return OK;
    }
    objs[i] = null;
    giveItem(state, ctx, o.item, 1);
    if (!state.flags.includes(`got_${o.item}`)) state.flags.push(`got_${o.item}`);
    emit(ctx, { type: 'fx', fx: 'sparkle', map: p.map, x, y });
    updateQuests(state, ctx);
    return OK;
  }

  // The Weigh-in judging table is the fountain.
  if (p.map === 'town' && m.decor[i] === 'fountain' && state.festival && !state.festival.done && festivalOn(state.day)?.id === 'weighin') {
    emit(ctx, { type: 'panel', panel: 'festival' });
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
  if (m.decor[i] === 'board') {
    emit(ctx, { type: 'panel', panel: 'board' });
    return OK;
  }
  return { ok: false, reason: 'Nothing to do there.' };
}
