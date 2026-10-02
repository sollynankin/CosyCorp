import type { ItemId, SeasonId } from './types';

// What can spawn on forage spots, by season. Picks are uniform over the list (repeat an id to weight it).
export const FORAGE_TABLE: Record<SeasonId, ItemId[]> = {
  spring: ['wild_leek', 'wild_leek', 'morel'],
  summer: ['blackberry', 'sweet_clover', 'sweet_clover'],
  autumn: ['hazelnut', 'chanterelle', 'blackberry'],
  winter: ['snowberry', 'winter_root', 'winter_root'],
};
