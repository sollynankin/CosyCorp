import type { LegendEntry } from './types';

// ASCII legend shared by every map. '#' marks a building footprint (the footprint itself comes from
// MapDef.buildings; the '#' is there so the ASCII reads well and tests can check they agree).
export const LEGEND: Record<string, LegendEntry> = {
  '.': { terrain: 'grass' },
  ':': { terrain: 'path' },
  '_': { terrain: 'stone' },
  '=': { terrain: 'boards' },
  s: { terrain: 'sand' },
  '~': { terrain: 'water' },
  O: { terrain: 'lake' },
  '^': { terrain: 'cliff' },
  '#': { terrain: 'path' },
  P: { terrain: 'grass', decor: 'pine' },
  b: { terrain: 'grass', decor: 'bush' },
  L: { terrain: 'path', decor: 'lamp' },
  Q: { terrain: 'stone', decor: 'board' },
  F: { terrain: 'stone', decor: 'fountain' },
  g: { terrain: 'glassfloor', decor: 'glasswall' },
  h: { terrain: 'glassfloor' },
  M: { terrain: 'path', decor: 'minemouth' },
  T: { terrain: 'grass', object: 'tree' },
  R: { terrain: 'grass', object: 'boulder' },
  r: { terrain: 'grass', object: 'stone' },
  w: { terrain: 'grass', object: 'weeds' },
  t: { terrain: 'grass', object: 'twig' },
  '*': { terrain: 'grass', object: 'forageSpot' },
  // mine floors
  ',': { terrain: 'minefloor' },
  W: { terrain: 'minefloor', decor: 'rockwall' },
};
