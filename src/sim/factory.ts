// One factory step = one in-game minute of machines and belts (DESIGN.md §4, §5). Filled in at M3.
import type { DayContext } from './context';
import type { GameState } from './state';

export function factoryStep(state: GameState, _ctx: DayContext): void {
  state.step += 1;
}

/** Dawn: sprinklers water their areas. */
export function dawnSprinklers(_state: GameState, _ctx: DayContext): void {}
