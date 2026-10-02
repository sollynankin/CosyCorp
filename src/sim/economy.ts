// Prices and selling (DESIGN.md §8).
import { AUTO_SELL_MULT, ITEM_VALUE, QUALITY_PRICE_MULT } from '../data/balance';
import type { ItemId, Quality } from '../data/types';
import type { GameState, ItemStack } from './state';

export function baseValue(id: ItemId): number {
  return ITEM_VALUE[id] ?? 0;
}

export function sellPrice(id: ItemId, q: Quality): number {
  return Math.round(baseValue(id) * QUALITY_PRICE_MULT[q]);
}

export function isSellable(id: ItemId): boolean {
  return baseValue(id) > 0;
}

function recordSale(state: GameState, id: ItemId, n: number): void {
  state.today.sold[id] = (state.today.sold[id] ?? 0) + n;
  state.shippedTotal[id] = (state.shippedTotal[id] ?? 0) + n;
}

/** Overnight sale of the shipping bin. Returns coins earned. */
export function sellShipping(state: GameState): number {
  let coins = 0;
  for (const st of state.farm.shipping) {
    coins += sellPrice(st.id, st.q) * st.n;
    recordSale(state, st.id, st.n);
  }
  state.farm.shipping = [];
  state.player.coins += coins;
  state.today.coinsShipped += coins;
  return coins;
}

/** Market Chute: instant sale at AUTO_SELL_MULT. */
export function chuteSell(state: GameState, st: ItemStack): number {
  const coins = Math.round(sellPrice(st.id, st.q) * AUTO_SELL_MULT) * st.n;
  recordSale(state, st.id, st.n);
  state.player.coins += coins;
  state.today.coinsChute += coins;
  return coins;
}
