// Weather rolls (DESIGN.md §6).
import { getSeason } from '../data';
import type { WeatherId } from '../data/types';
import { seasonOf } from './calendar';
import { isFestivalDay } from './festivalDays';
import { rngWeighted } from './rng';
import type { GameState } from './state';
import { forcedWeather } from './storyWeather';

export function rollWeather(state: GameState, day: number): WeatherId {
  const forced = forcedWeather(state, day);
  if (forced) return forced;
  if (day === 0 || isFestivalDay(day)) return 'sunny';
  const w = getSeason(seasonOf(day)).weather;
  return rngWeighted<WeatherId>(state, [
    ['sunny', w.sunny],
    ['rain', w.rain],
    ['storm', w.storm],
    ['snow', w.snow],
  ]);
}
