// The eight fish (DESIGN.md §12). `where` is the map's fishing type (MapDef.fishing). Difficulty 0..1 sets
// how fast the fish moves on the catch bar; behaviour sets how it moves.
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
  /** also catchable at the lake when this flag is set (the Heron's reward) */
  lakeFlag?: string;
}

const ALL: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];

export const FISH: FishDef[] = [
  { item: 'perch', where: ['river', 'lake'], seasons: ALL, difficulty: 0.2, behaviour: 'calm' },
  { item: 'brook_trout', where: ['river'], seasons: ['spring', 'summer', 'autumn'], from: '06:00', to: '19:00', difficulty: 0.45, behaviour: 'dart' },
  { item: 'carp', where: ['lake'], seasons: ALL, difficulty: 0.3, behaviour: 'sinker' },
  { item: 'pike', where: ['lake'], seasons: ['summer', 'autumn', 'winter'], difficulty: 0.6, behaviour: 'dart' },
  { item: 'catfish', where: ['river'], seasons: ['spring', 'summer', 'autumn'], weather: ['rain', 'storm'], difficulty: 0.55, behaviour: 'sinker' },
  { item: 'bream', where: ['lake'], seasons: ['spring', 'summer'], difficulty: 0.35, behaviour: 'floater' },
  { item: 'eel', where: ['river', 'lake'], seasons: ['autumn', 'winter'], from: '19:00', to: '02:00', difficulty: 0.65, behaviour: 'dart' },
  { item: 'glowfin', where: ['river'], seasons: ['summer'], from: '18:00', to: '02:00', difficulty: 0.8, behaviour: 'floater', lakeFlag: 'glowfin_dock' },
];
