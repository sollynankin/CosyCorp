import type { SeasonDef } from './types';

// Weather weights for tomorrow's roll (DESIGN.md §6). Snow only falls in winter.
export const SEASONS: SeasonDef[] = [
  { id: 'spring', name: 'Spring', weather: { sunny: 60, rain: 32, storm: 8, snow: 0 } },
  { id: 'summer', name: 'Summer', weather: { sunny: 72, rain: 16, storm: 12, snow: 0 } },
  { id: 'autumn', name: 'Autumn', weather: { sunny: 58, rain: 32, storm: 10, snow: 0 } },
  { id: 'winter', name: 'Winter', weather: { sunny: 55, rain: 0, storm: 0, snow: 45 } },
];

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
