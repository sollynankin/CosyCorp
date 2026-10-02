// Interacting with machines by hand: feed hoppers, collect outputs, open chests and the inspector.
import { getItem, getMachine } from '../data';
import { giveItem } from './actions';
import type { CommandResult } from './commands';
import { emit, toast, type DayContext } from './context';
import { takeFromSlot } from './inventory';
import { entityAt } from './placement';
import type { GameState } from './state';
import { crafterAccepts, planterAccepts } from './transfer';

const OK: CommandResult = { ok: true };

export function interactMachine(state: GameState, ctx: DayContext, x: number, y: number): CommandResult | null {
  const e = entityAt(state, x, y);
  if (!e) return null;
  const def = getMachine(e.type);
  const p = state.player;
  const held = p.inventory[p.selected];

  // 1. Feed the held item into a planter hopper or crafter buffer.
  if (held && (def.kind === 'planter' || def.kind === 'crafter')) {
    let fed = 0;
    while (p.inventory[p.selected]?.id === held.id) {
      const ok = def.kind === 'planter' ? planterAccepts(e, held.id) : crafterAccepts(state, e, held.id);
      if (!ok) break;
      takeFromSlot(p.inventory, p.selected, 1);
      e.input[held.id] = (e.input[held.id] ?? 0) + 1;
      fed++;
    }
    if (fed > 0) {
      toast(ctx, `Loaded ${fed} ${getItem(held.id).name} into the ${def.name}.`);
      return OK;
    }
  }

  // 2. Collect finished goods.
  if (e.output.length > 0) {
    for (const st of e.output) giveItem(state, ctx, st.id, st.n, st.q);
    e.output = [];
    emit(ctx, { type: 'fx', fx: 'sparkle', map: 'farm', x, y });
    return OK;
  }
  if (def.kind === 'storage' && e.stored.length > 0) {
    for (const st of e.stored) giveItem(state, ctx, st.id, st.n, st.q);
    e.stored = [];
    return OK;
  }

  // 3. Chests and everything else open the inspector panel.
  emit(ctx, { type: 'panel', panel: def.kind === 'chest' ? `chest:${e.id}` : `machine:${e.id}` });
  return OK;
}

/** Chest: move a backpack slot into the chest, or a chest stack into the backpack. */
export function chestMove(state: GameState, ctx: DayContext, entityId: number, fromBackpack: boolean, index: number): CommandResult {
  const e = state.farm.entities.find((o) => o.id === entityId);
  if (!e || getMachine(e.type).kind !== 'chest') return { ok: false, reason: 'No chest.' };
  if (fromBackpack) {
    const st = state.player.inventory[index];
    if (!st) return { ok: false, reason: 'Nothing there.' };
    const same = e.stored.find((s) => s.id === st.id && s.q === st.q);
    if (!same && e.stored.length >= (getMachine(e.type).capacity ?? 0)) return { ok: false, reason: 'The chest is full.' };
    const taken = takeFromSlot(state.player.inventory, index, st.n)!;
    if (same) same.n += taken.n;
    else e.stored.push(taken);
    return OK;
  }
  const st = e.stored[index];
  if (!st) return { ok: false, reason: 'Nothing there.' };
  e.stored.splice(index, 1);
  giveItem(state, ctx, st.id, st.n, st.q);
  return OK;
}
