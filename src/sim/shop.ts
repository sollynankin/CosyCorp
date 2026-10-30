// Buying from town shops and shipping (DESIGN.md §8).
import { getItem } from '../data';
import { getShop, type ShopDef, type ShopEntry } from '../data/shops';
import { minuteOfClock, seasonOf, weekdayOf } from './calendar';
import type { CommandResult } from './commands';
import { toast, type DayContext } from './context';
import { isSellable, sellNow } from './economy';
import { addItem, canFit, countItem, removeItem, takeFromSlot } from './inventory';
import { addAnimal } from './animals';
import { TOOL_UPGRADE_COST } from '../data/balance';
import type { ToolId } from '../data/types';
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
      (!e.hideFlag || !state.flags.includes(e.hideFlag)) &&
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
  if (entry.service) return buyService(state, ctx, entry);
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

/** Put items from a backpack slot into the shipping bin: they sell at once and the coins are yours. */
export function ship(state: GameState, ctx: DayContext, slot: number, n: number): CommandResult {
  if (state.player.map !== 'farm') return fail('The shipping bin is on the farm.');
  const st = state.player.inventory[slot];
  if (!st) return fail('Nothing there.');
  if (!isSellable(st.id)) return fail(`${getItem(st.id).name} can't be shipped.`);
  const taken = takeFromSlot(state.player.inventory, slot, n);
  if (!taken) return fail('Nothing there.');
  const coins = sellNow(state, taken);
  toast(ctx, `Sold ${taken.n} ${getItem(taken.id).name} for ${coins}g.`);
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

/** Joinery services: buildings (coins + materials) and animals (need room in their building). */
function buyService(state: GameState, ctx: DayContext, entry: ShopEntry): CommandResult {
  const inv = state.player.inventory;
  for (const m of entry.materials ?? []) if (countItem(inv, m.item) < m.n) return fail(`Bram needs ${m.n} ${getItem(m.item).name} for that.`);
  if (entry.service === 'chicken' || entry.service === 'cow') {
    const r = addAnimal(state, entry.service);
    if (!r.ok) return r;
    toast(ctx, `Your new ${entry.service} is waiting in the ${entry.service === 'chicken' ? 'coop' : 'barn'}.`);
  } else {
    state.flags.push(`built_${entry.service}`);
    toast(ctx, `Bram and Teo raise the ${entry.service} by nightfall. It's ready!`);
  }
  for (const m of entry.materials ?? []) removeItem(inv, m.item, m.n);
  state.player.coins -= entry.price;
  return OK;
}

/** The Smithy upgrades a tool one tier for coins and ore (TOOL_UPGRADE_COST). */
export function upgradeTool(state: GameState, ctx: DayContext, tool: ToolId): CommandResult {
  const shop = getShop('smithy');
  if (state.player.map !== shop.map) return fail('Teo works at the Smithy.');
  if (!isShopOpen(shop, state.day, state.minute)) return fail('The Smithy is closed.');
  const tier = state.player.tools[tool];
  const cost = TOOL_UPGRADE_COST[tier + 1];
  if (!cost) return fail('That tool is as good as it gets.');
  if (state.player.coins < cost.coins) return fail('Not enough coins.');
  if (countItem(state.player.inventory, cost.item) < cost.count) return fail(`Teo needs ${cost.count} ${getItem(cost.item).name}.`);
  state.player.coins -= cost.coins;
  removeItem(state.player.inventory, cost.item, cost.count);
  state.player.tools[tool] = tier + 1;
  toast(ctx, `Teo hands it back, still warm. Your ${getItem(tool).name} is ${['', 'copper', 'iron'][tier + 1]} now.`);
  return OK;
}
