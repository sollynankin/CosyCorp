// Small shared player actions: giving items, hand harvest.
import { XP_HARVEST } from '../data/balance';
import type { ItemId, Quality } from '../data/types';
import { emit, toast, type DayContext } from './context';
import { harvestOrchard, harvestTile } from './farming';
import { addItem, pushStack } from './inventory';
import { gainXp } from './skills';
import type { GameState } from './state';

/**
 * Puts items in the backpack. Anything that does not fit goes to the farmhouse overflow box (collected from
 * the home panel), so items are never lost.
 */
export function giveItem(state: GameState, ctx: DayContext, id: ItemId, n: number, q: Quality = 0): void {
  if (n <= 0) return;
  const left = addItem(state.player.inventory, id, n, q);
  if (left > 0) {
    pushStack(state.overflow, { id, q, n: left });
    toast(ctx, 'Backpack full: the rest went to the farmhouse box.');
  }
  emit(ctx, { type: 'gain', item: id, n, q });
}

/** Harvest a ripe crop or a fruiting orchard tree on the farm into the backpack. */
export function handHarvest(state: GameState, ctx: DayContext, x: number, y: number): boolean {
  if (state.player.map !== 'farm') return false;
  const out = harvestTile(state, x, y) ?? harvestOrchard(state, x, y);
  if (!out) return false;
  for (const st of out) {
    giveItem(state, ctx, st.id, st.n, st.q);
    state.today.harvestedHand += st.n;
  }
  gainXp(state, ctx, 'farming', XP_HARVEST);
  emit(ctx, { type: 'fx', fx: 'harvest', map: 'farm', x, y });
  return true;
}
