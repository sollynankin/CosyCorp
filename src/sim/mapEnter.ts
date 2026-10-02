// Hooks that run when the player enters a map: mine floor generation, festivals, heart events.
import type { DayContext } from './context';
import type { GameState } from './state';

export function enterMap(_state: GameState, _ctx: DayContext, _from: string, _to: string): void {}
