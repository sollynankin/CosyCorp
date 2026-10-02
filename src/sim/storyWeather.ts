// Story beats that force tomorrow's weather (the Thaw Flood storm, M5).
import type { WeatherId } from '../data/types';
import type { GameState } from './state';

export function forcedWeather(_state: GameState, _day: number): WeatherId | null {
  return null;
}
