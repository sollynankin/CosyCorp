// The Town Hall quest board (DESIGN.md §10): every Monday the RNG posts BOARD_SIZE requests for in-season
// things; each runs to the following Sunday and pays coins plus friendship.
import { BOARD_MIN_REWARD, BOARD_POINTS, BOARD_REWARD_MULT, BOARD_SIZE } from '../data/balance';
import { CROPS, getItem, VILLAGERS } from '../data';
import { FORAGE_TABLE } from '../data/forage';
import type { ItemId } from '../data/types';
import { seasonOf, weekdayOf } from './calendar';
import type { CommandResult } from './commands';
import { toast, type DayContext } from './context';
import { baseValue } from './economy';
import { countItem, removeItem } from './inventory';
import { rngInt, rngPick } from './rng';
import type { GameState } from './state';
import { addPoints } from './villagers';

/** What can be asked for this season: in-season crops (not in winter's frozen fields), forage, basics. */
export function boardPool(day: number): { item: ItemId; min: number; max: number }[] {
  const season = seasonOf(day);
  const crops = CROPS.filter((c) => c.seasons.includes(season)).map((c) => ({ item: c.harvestItem, min: 3, max: 8 }));
  const forage = [...new Set(FORAGE_TABLE[season])].map((item) => ({ item, min: 2, max: 5 }));
  const basics = [{ item: 'wood', min: 20, max: 50 }, { item: 'stone', min: 20, max: 40 }, { item: 'copper_ore', min: 3, max: 8 }];
  return [...crops, ...forage, ...basics];
}

export function postBoard(state: GameState): void {
  const pool = boardPool(state.day);
  const deadline = state.day + (6 - weekdayOf(state.day));
  state.board = [];
  for (let k = 0; k < BOARD_SIZE; k++) {
    const pick = rngPick(state, pool);
    const villager = rngPick(state, VILLAGERS).id;
    const count = rngInt(state, pick.min, pick.max);
    const reward = Math.max(BOARD_MIN_REWARD, Math.round(baseValue(pick.item) * count * BOARD_REWARD_MULT));
    state.board.push({ id: `b${state.day}_${k}`, villager, item: pick.item, count, reward, deadline, done: false });
  }
}

/** Morning: post on Mondays (and the very first morning), drop expired requests. */
export function boardMorning(state: GameState): void {
  if (weekdayOf(state.day) === 0) postBoard(state);
  else state.board = state.board.filter((b) => b.done || b.deadline >= state.day);
}

export function fulfilBoard(state: GameState, ctx: DayContext, index: number): CommandResult {
  const b = state.board[index];
  if (!b || b.done) return { ok: false, reason: 'That request is closed.' };
  if (b.deadline < state.day) return { ok: false, reason: 'Too late for that one.' };
  if (countItem(state.player.inventory, b.item) < b.count) return { ok: false, reason: `You need ${b.count} ${getItem(b.item).name}.` };
  removeItem(state.player.inventory, b.item, b.count);
  b.done = true;
  state.player.coins += b.reward;
  state.today.coinsOther += b.reward;
  addPoints(state, b.villager, BOARD_POINTS);
  toast(ctx, `Request done! +${b.reward}g`);
  return { ok: true };
}
