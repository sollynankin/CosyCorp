// The fish (DESIGN.md §12). `where` is the map's fishing type (MapDef.fishing). Difficulty 0..1 is the base for an
// average-sized fish; the actual catch gets harder for bigger fish (FISH_SIZE_DIFFICULTY). Behaviour sets how the
// fish moves on the catch bar. minCm..maxCm is the length range a catch is rolled from.
import type { ItemId, SeasonId, WeatherId } from './types';

export type FishBehaviour = 'calm' | 'dart' | 'sinker' | 'floater';

export interface FishDef {
  item: ItemId;
  where: ('river' | 'lake')[];
  seasons: SeasonId[];
  /** "HH:MM" window; omit for any time */
  from?: string;
  to?: string;
  weather?: WeatherId[];
  difficulty: number;
  behaviour: FishBehaviour;
  /** length range in centimetres */
  minCm: number;
  maxCm: number;
  /** also catchable at the lake when this flag is set (the Heron's reward) */
  lakeFlag?: string;
}

const ALL: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];

export const FISH: FishDef[] = [
  // Everyday fish
  { item: 'minnow', where: ['river', 'lake'], seasons: ALL, difficulty: 0.1, behaviour: 'calm', minCm: 4, maxCm: 9 },
  { item: 'perch', where: ['river', 'lake'], seasons: ALL, difficulty: 0.2, behaviour: 'calm', minCm: 15, maxCm: 40 },
  { item: 'carp', where: ['lake'], seasons: ALL, difficulty: 0.3, behaviour: 'sinker', minCm: 30, maxCm: 90 },
  { item: 'sunfish', where: ['lake'], seasons: ['spring', 'summer', 'autumn'], difficulty: 0.2, behaviour: 'floater', minCm: 8, maxCm: 25 },
  { item: 'bream', where: ['lake'], seasons: ['spring', 'summer'], difficulty: 0.35, behaviour: 'floater', minCm: 20, maxCm: 45 },
  { item: 'crayfish', where: ['river'], seasons: ['spring', 'summer'], difficulty: 0.3, behaviour: 'sinker', minCm: 6, maxCm: 15 },
  // Season specials
  { item: 'smelt', where: ['river'], seasons: ['winter', 'spring'], difficulty: 0.25, behaviour: 'dart', minCm: 8, maxCm: 20 },
  { item: 'brook_trout', where: ['river'], seasons: ['spring', 'summer', 'autumn'], from: '06:00', to: '19:00', difficulty: 0.45, behaviour: 'dart', minCm: 20, maxCm: 50 },
  { item: 'rainbow_trout', where: ['river'], seasons: ['spring', 'summer'], from: '06:00', to: '19:00', difficulty: 0.5, behaviour: 'dart', minCm: 25, maxCm: 70 },
  { item: 'largemouth_bass', where: ['lake'], seasons: ['summer', 'autumn'], difficulty: 0.5, behaviour: 'sinker', minCm: 25, maxCm: 60 },
  { item: 'salmon', where: ['river'], seasons: ['autumn'], difficulty: 0.6, behaviour: 'dart', minCm: 50, maxCm: 100 },
  { item: 'koi', where: ['lake'], seasons: ['spring', 'summer'], difficulty: 0.45, behaviour: 'calm', minCm: 40, maxCm: 80 },
  { item: 'pike', where: ['lake'], seasons: ['summer', 'autumn', 'winter'], difficulty: 0.6, behaviour: 'dart', minCm: 50, maxCm: 130 },
  { item: 'walleye', where: ['lake'], seasons: ['autumn', 'winter'], from: '17:00', to: '02:00', difficulty: 0.55, behaviour: 'sinker', minCm: 35, maxCm: 80 },
  // Weather and night fish
  { item: 'catfish', where: ['river'], seasons: ['spring', 'summer', 'autumn'], weather: ['rain', 'storm'], difficulty: 0.55, behaviour: 'sinker', minCm: 40, maxCm: 120 },
  { item: 'emberscale', where: ['river'], seasons: ALL, weather: ['rain', 'storm'], difficulty: 0.65, behaviour: 'dart', minCm: 15, maxCm: 35 },
  { item: 'frostfin', where: ['lake'], seasons: ['winter'], weather: ['snow'], difficulty: 0.6, behaviour: 'floater', minCm: 20, maxCm: 50 },
  { item: 'eel', where: ['river', 'lake'], seasons: ['autumn', 'winter'], from: '19:00', to: '02:00', difficulty: 0.65, behaviour: 'dart', minCm: 40, maxCm: 100 },
  { item: 'moonfin', where: ['lake'], seasons: ALL, from: '20:00', to: '02:00', difficulty: 0.7, behaviour: 'floater', minCm: 20, maxCm: 45 },
  // Rare and big
  { item: 'sturgeon', where: ['lake'], seasons: ['summer'], from: '10:00', to: '19:00', difficulty: 0.85, behaviour: 'sinker', minCm: 100, maxCm: 220 },
  { item: 'glowfin', where: ['river'], seasons: ['summer'], from: '18:00', to: '02:00', difficulty: 0.8, behaviour: 'floater', minCm: 25, maxCm: 60, lakeFlag: 'glowfin_dock' },
];

export function fishDefOf(item: ItemId): FishDef | undefined {
  return FISH.find((f) => f.item === item);
}
