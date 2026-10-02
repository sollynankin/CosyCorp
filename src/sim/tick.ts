// The fixed tick (DESIGN.md §1). One call = 1/TICK_HZ s of game time.
import { DAY_MINUTES, TICKS_PER_MINUTE } from '../data/balance';
import { applyCommand, type Command, type CommandResult } from './commands';
import { ensureContext, toast, type DayContext } from './context';
import { endDay } from './day';
import { factoryStep } from './factory';
import { tickFishing } from './fishingTick';
import type { GameState } from './state';

export interface TickResult {
  results: CommandResult[];
}

/**
 * Advances the game by one tick: applies the queued commands (in order), then the player's swing and
 * fishing state, then the clock. Every TICKS_PER_MINUTE ticks the minute advances and one factory step runs.
 */
export function step(state: GameState, ctx: DayContext, commands: Command[] = []): TickResult {
  ensureContext(state, ctx);
  state.player.moving = false;
  const results: CommandResult[] = [];
  for (const cmd of commands) {
    const r = applyCommand(state, ctx, cmd);
    results.push(r);
    if (!r.ok && cmd.type !== 'move') toast(ctx, r.reason);
    ensureContext(state, ctx);
  }
  const p = state.player;
  if (p.swing > 0) p.swing -= 1;
  tickFishing(state, ctx);

  if (p.energy <= 0) {
    endDay(state, ctx, true);
    return { results };
  }

  state.subTick += 1;
  if (state.subTick >= TICKS_PER_MINUTE) {
    state.subTick = 0;
    factoryStep(state, ctx);
    state.minute += 1;
    if (state.minute >= DAY_MINUTES) endDay(state, ctx, true);
  }
  return { results };
}

/** Runs n ticks with no input (tests, skipping). */
export function runTicks(state: GameState, ctx: DayContext, n: number): void {
  for (let k = 0; k < n; k++) step(state, ctx);
}
