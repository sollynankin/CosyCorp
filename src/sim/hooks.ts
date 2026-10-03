// Overnight and morning hooks for the systems layered on the farm day (villagers, quests, festivals).
import type { DayContext } from './context';
import { festivalOvernight } from './festival';
import { updateQuests } from './quests';
import { checkSceneTriggers } from './scenes';
import type { GameState } from './state';
import { villagerMorning } from './villagers';
import { boardMorning } from './board';
import { animalsOvernight } from './animals';

/** Runs at day end before the report: per-day evaluation that looks at today. Returns report notes. */
export function overnightHooks(state: GameState, _ctx: DayContext): string[] {
  festivalOvernight(state);
  return animalsOvernight(state);
}

/** Runs after the calendar advanced, at 06:00 of the new day. */
export function morningHooks(state: GameState, ctx: DayContext): void {
  villagerMorning(state);
  boardMorning(state);
  updateQuests(state, ctx);
  checkSceneTriggers(state);
}
