// Overnight and morning hooks for systems added in later milestones (villagers, quests, animals, goals).
import type { DayContext } from './context';
import type { GameState } from './state';

/** Runs at day end before the report: per-day evaluation that looks at today. */
export function overnightHooks(_state: GameState, _ctx: DayContext): void {}

/** Runs after the calendar advanced, at 06:00 of the new day. */
export function morningHooks(_state: GameState, _ctx: DayContext): void {}
