// Shared condition test for schedules, dialogue and scene triggers (data/types.ts Conditions).
import { POINTS_PER_HEART } from '../data/balance';
import type { Conditions } from '../data/types';
import { seasonOf, weekdayOf } from './calendar';
import { isFestivalDay } from './festivalDays';
import type { GameState } from './state';

export function heartsOf(state: GameState, villager: string): number {
  return Math.floor((state.villagers[villager]?.points ?? 0) / POINTS_PER_HEART);
}

/** True when every listed condition holds. `villager` scopes hearts/courting/married; `map` is the player's. */
export function conditionsHold(state: GameState, c: Conditions | undefined, villager?: string, day = state.day): boolean {
  if (!c) return true;
  if (c.season && !c.season.includes(seasonOf(day))) return false;
  if (c.weather && !c.weather.includes(state.weather)) return false;
  if (c.weekday && !c.weekday.includes(weekdayOf(day))) return false;
  if (c.minDay !== undefined && day < c.minDay) return false;
  if (c.flags && !c.flags.every((f) => state.flags.includes(f))) return false;
  if (c.notFlags && c.notFlags.some((f) => state.flags.includes(f))) return false;
  if (c.map && state.player.map !== c.map) return false;
  if (c.festival !== undefined && isFestivalDay(day) !== c.festival) return false;
  if (villager) {
    const v = state.villagers[villager];
    const hearts = heartsOf(state, villager);
    if (c.minHearts !== undefined && hearts < c.minHearts) return false;
    if (c.maxHearts !== undefined && hearts > c.maxHearts) return false;
    if (c.courting !== undefined && (v?.courting ?? false) !== c.courting) return false;
    if (c.married !== undefined && (v?.married ?? false) !== c.married) return false;
  }
  return true;
}

/** How many conditions a block lists (dialogue specificity). */
export function conditionCount(c: Conditions | undefined): number {
  if (!c) return 0;
  let n = 0;
  for (const v of Object.values(c)) if (v !== undefined) n++;
  return n;
}
