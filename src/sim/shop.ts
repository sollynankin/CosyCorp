// Buying from town shops and shipping (DESIGN.md §8).
import { getItem } from '../data';
import { getShop, type ShopDef, type ShopEntry } from '../data/shops';
import { minuteOfClock, seasonOf, weekdayOf } from './calendar';
import type { CommandResult } from './commands';
import { toast, type DayContext } from './context';
import { isSellable } from './economy';
import { addItem, canFit, pushStack, takeFromSlot } from './inventory';
import type { GameState } from './state';

const OK: CommandResult = { ok: true };
const fail = (reason: string): CommandResult => ({ ok: false, reason });

export function isShopOpen(shop: ShopDef, day: number, minute: number): boolean {
  if (shop.closed.includes(weekdayOf(day))) return false;
  return minute >= minuteOfClock(shop.open) && minute < minuteOfClock(shop.close);
}

/** Stock visible today (season and flag filters). */
export function shopStock(state: GameState, shop: ShopDef): ShopEntry[] {
  const season = seasonOf(state.day);
  return shop.stock.filter(
    (e) =>
      (!e.seasons || e.seasons.includes(season)) &&
      (!e.requiresFlag || state.flags.includes(e.requiresFlag)) &&
      !(e.recipe && state.recipes.includes(e.recipe)),
  );
}

export function buy(state: GameState, ctx: DayContext, shopId: string, item: string, n: number): CommandResult {
  const shop = getShop(shopId);
  if (state.player.map !== shop.map) return fail(`You need to be at ${shop.name}.`);
  if (!isShopOpen(shop, state.day, state.minute)) return fail(`${shop.name} is closed.`);
  const entry = shopStock(state, shop).find((e) => e.item === item);
  if (!entry) return fail("That's not for sale today.");
  if (n < 1 || !Number.isInteger(n)) return fail('Pick a number to buy.');
  if (entry.recipe) n = 1;
  const cost = entry.price * n;
  if (state.player.coins < cost) return fail('Not enough coins.');
  if (entry.recipe) {
    state.recipes.push(entry.recipe);
    state.player.coins -= cost;
    toast(ctx, `Learned a new recipe!`);
    return OK;
  }
  if (!canFit(state.player.inventory, item, n)) return fail('Your backpack is full.');
  state.player.coins -= cost;
  addItem(state.player.inventory, item, n);
  ctx.events.push({ type: 'gain', item, n, q: 0 });
  return OK;
}

/** Put items from a backpack slot into the shipping bin (sold overnight). */
export function ship(state: GameState, ctx: DayContext, slot: number, n: number): CommandResult {
  if (state.player.map !== 'farm') return fail('The shipping bin is on the farm.');
  const st = state.player.inventory[slot];
  if (!st) return fail('Nothing there.');
  if (!isSellable(st.id)) return fail(`${getItem(st.id).name} can't be shipped.`);
  const taken = takeFromSlot(state.player.inventory, slot, n);
  if (!taken) return fail('Nothing there.');
  pushStack(state.farm.shipping, taken);
  ctx.events.push({ type: 'sound', name: 'ship' });
  return OK;
}

/** Takes everything from the farmhouse overflow box that fits. */
export function collectOverflow(state: GameState): CommandResult {
  if (state.overflow.length === 0) return fail('The box is empty.');
  const keep = [];
  for (const st of state.overflow) {
    const left = addItem(state.player.inventory, st.id, st.n, st.q);
    if (left > 0) keep.push({ ...st, n: left });
  }
  state.overflow = keep;
  return keep.length ? fail('Your backpack is full; some items stayed in the box.') : OK;
}
