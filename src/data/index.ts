// Lookup helpers over the content tables. Unknown ids throw: a typo in data should fail loudly in tests.
import { CROPS, TREES } from './crops';
import { BASE_ITEMS } from './items';
import { MACHINES } from './machines';
import { RECIPES } from './recipes';
import { SEASONS } from './seasons';
import { VILLAGERS } from './villagers';
import type { CropDef, ItemDef, MachineDef, RecipeDef, SeasonDef, SeasonId, TreeDef, VillagerDef } from './types';

const MACHINE_ITEMS: ItemDef[] = MACHINES.map((m) => ({
  id: m.item,
  name: m.name,
  category: 'machine',
  spoils: false,
  places: m.id,
  color: '#b08a5a',
  icon: 'machine',
  description: m.description,
}));

export const ITEMS: ItemDef[] = [...BASE_ITEMS, ...MACHINE_ITEMS];

function index<T extends { id: string }>(list: T[], what: string): (id: string) => T {
  const map = new Map<string, T>();
  for (const x of list) {
    if (map.has(x.id)) throw new Error(`duplicate ${what} id: ${x.id}`);
    map.set(x.id, x);
  }
  return (id: string) => {
    const v = map.get(id);
    if (!v) throw new Error(`unknown ${what}: ${id}`);
    return v;
  };
}

export const getItem = index<ItemDef>(ITEMS, 'item');
export const getCrop = index<CropDef>(CROPS, 'crop');
export const getTree = index<TreeDef>(TREES, 'tree');
export const getMachine = index<MachineDef>(MACHINES, 'machine');
export const getRecipe = index<RecipeDef>(RECIPES, 'recipe');
export const getSeason = index<SeasonDef>(SEASONS, 'season');
export const getVillager = index<VillagerDef>(VILLAGERS, 'villager');

export const hasItem = (id: string): boolean => ITEMS.some((i) => i.id === id);

const recipesByStation = new Map<string, RecipeDef[]>();
for (const r of RECIPES) {
  const list = recipesByStation.get(r.station) ?? [];
  list.push(r);
  recipesByStation.set(r.station, list);
}
export function recipesFor(station: string): RecipeDef[] {
  return recipesByStation.get(station) ?? [];
}

export function cropIsInSeason(cropId: string, season: SeasonId): boolean {
  return getCrop(cropId).seasons.includes(season);
}

export { CROPS, TREES, MACHINES, RECIPES, SEASONS, VILLAGERS };
