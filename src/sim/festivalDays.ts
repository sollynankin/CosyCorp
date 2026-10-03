// Festival calendar lookup without the festival module's dependencies (weather and conditions use it).
import { DAYS_PER_SEASON } from '../data/balance';
import { FESTIVALS } from '../data/festivals';

const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

export function isFestivalDay(day: number): boolean {
  const season = SEASON_ORDER[Math.floor(day / DAYS_PER_SEASON) % 4];
  const dom = (day % DAYS_PER_SEASON) + 1;
  return FESTIVALS.some((f) => f.season === season && f.day === dom);
}
