import { DAY_MINUTES, DAY_START_HOUR, DAYS_PER_SEASON, DAYS_PER_YEAR } from '../data/balance';
import { SEASONS, WEEKDAYS } from '../data/seasons';
import type { SeasonId } from '../data/types';

export const SEASON_IDS: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];

export function seasonIndex(day: number): number {
  return Math.floor(day / DAYS_PER_SEASON) % 4;
}
export function seasonOf(day: number): SeasonId {
  return SEASON_IDS[seasonIndex(day)];
}
/** 1-based day within the season */
export function dayOfSeason(day: number): number {
  return (day % DAYS_PER_SEASON) + 1;
}
export function yearOf(day: number): number {
  return Math.floor(day / DAYS_PER_YEAR) + 1;
}
/** 0 = Mon .. 6 = Sun */
export function weekdayOf(day: number): number {
  return day % 7;
}
/** Absolute day for (year, season, dayOfSeason). */
export function dayFor(year: number, season: SeasonId, dom: number): number {
  return (year - 1) * DAYS_PER_YEAR + SEASON_IDS.indexOf(season) * DAYS_PER_SEASON + (dom - 1);
}

export function dateLabel(day: number): string {
  return `${WEEKDAYS[weekdayOf(day)]} ${dayOfSeason(day)} ${SEASONS[seasonIndex(day)].name}, Year ${yearOf(day)}`;
}

/** Clock time for a minute-of-day, as 24-hour hours and minutes (may exceed 24 after midnight). */
export function clockOf(minute: number): { h: number; m: number } {
  const total = DAY_START_HOUR * 60 + minute;
  return { h: Math.floor(total / 60), m: total % 60 };
}

export function clockLabel(minute: number): string {
  const { h, m } = clockOf(minute);
  const hh = h % 24;
  const ampm = hh < 12 ? 'am' : 'pm';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(m - (m % 10)).padStart(2, '0')} ${ampm}`;
}

/** Minute-of-day for an "HH:MM" string (hours past midnight wrap, e.g. "01:00" → 1140). */
export function minuteOfClock(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const hours = h < DAY_START_HOUR ? h + 24 : h;
  return (hours - DAY_START_HOUR) * 60 + m;
}

export function isLastMinute(minute: number): boolean {
  return minute >= DAY_MINUTES;
}
