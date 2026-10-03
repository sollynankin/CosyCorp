// Story beats that force a day's weather: the Thaw Flood storm (DESIGN.md §0, beat 5).
import { QUESTS } from '../data/quests';
import type { WeatherId } from '../data/types';
import type { GameState } from './state';

const FLOOD_DAY = QUESTS.find((q) => q.id === 'great_wheel')!.earliest!;

export function forcedWeather(state: GameState, day: number): WeatherId | null {
  // The storm comes the night the flood can happen, and only if the gates were reopened (beat 4).
  if (day === FLOOD_DAY && state.quests.done.includes('open_together')) return 'storm';
  return null;
}
