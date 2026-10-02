// One factory step = one in-game minute of machines and belts (DESIGN.md §4, §5).
import type { DayContext } from './context';
import { tickMachines, waterBySprinklers } from './machines';
import type { GameState } from './state';
import { tickTransfers } from './transfer';

export function factoryStep(state: GameState, ctx: DayContext): void {
  if (state.farm.entities.length > 0) {
    tickMachines(state, ctx, state.today);
    tickTransfers(state, state.today);
  }
  state.step += 1;
}

/** Dawn: sprinklers water their areas. */
export function dawnSprinklers(state: GameState, ctx: DayContext): void {
  waterBySprinklers(state, ctx);
}
