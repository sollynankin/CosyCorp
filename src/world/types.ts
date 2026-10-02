import type { Dir, MapId } from '../data/types';

export type Terrain = 'grass' | 'path' | 'stone' | 'boards' | 'sand' | 'water' | 'lake' | 'cliff' | 'glassfloor' | 'minefloor';

/** Static decoration that is part of the map def (never in state). */
export type Decor = 'pine' | 'bush' | 'lamp' | 'board' | 'fountain' | 'glasswall' | 'minemouth' | 'rockwall';

/** Objects seeded into state at new game (they can be removed or regrow). */
export type SeedObject = 'tree' | 'boulder' | 'stone' | 'weeds' | 'twig' | 'forageSpot';

export interface LegendEntry {
  terrain: Terrain;
  decor?: Decor;
  object?: SeedObject;
}

export type BuildingStyle =
  | 'farmhouse'
  | 'shipbin'
  | 'coop'
  | 'barn'
  | 'greenhouse'
  | 'townhall'
  | 'store'
  | 'smithy'
  | 'joinery'
  | 'inn'
  | 'works'
  | 'cottage'
  | 'sluice'
  | 'hut';

export interface BuildingDef {
  id: string;
  name: string;
  style: BuildingStyle;
  x: number;
  y: number;
  w: number;
  h: number;
  /** the door tile on the footprint edge; you interact with it from the tile in front */
  door: { x: number; y: number };
  doorDir: Dir;
  /** UI panel opened by the door (see ui/panels) */
  panel: string;
  /** building exists only once this flag is set (coop, barn) */
  requiresFlag?: string;
  /** colours for the procedural mesh */
  wall: string;
  roof: string;
}

export interface WarpDef {
  x: number;
  y: number;
  to: MapId;
  tx: number;
  ty: number;
  dir: Dir;
}

export interface MapDef {
  id: MapId;
  name: string;
  rows: string[];
  buildings: BuildingDef[];
  warps: WarpDef[];
  /** where fish come from when casting into this map's water */
  fishing?: 'river' | 'lake' | 'mine';
  /** trees on this map regrow from stumps */
  treesRegrow?: boolean;
  /** ambient look: outdoors maps get weather and season tint */
  indoor?: boolean;
}
