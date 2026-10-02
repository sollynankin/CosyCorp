import type { DayContext } from './context';
import type { GameState } from './state';

/** Spends energy. At 0 the player passes out at the end of the tick (sim/tick.ts). */
export function spendEnergy(state: GameState, ctx: DayContext, n: number): void {
  const p = state.player;
  const before = p.energy;
  p.energy = Math.max(0, Math.round((p.energy - n) * 10) / 10);
  if (before > 15 && p.energy <= 15) ctx.events.push({ type: 'toast', text: "You're getting tired." });
}
