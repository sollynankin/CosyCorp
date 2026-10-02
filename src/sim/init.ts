// New game state.
import { CAN_CAPACITY, INVENTORY_SLOTS, MAX_ENERGY, START_COINS, TREE_HP, BOULDER_HP } from '../data/balance';
import { ALL_MAP_IDS, parseMap } from '../world';
import { hash32 } from './hash';
import { addItem } from './inventory';
import type { GameState, MapState, Slot, WorldObject } from './state';
import { emptyDayStats } from './stats';
import { initVillagers } from './villagers';

export const START_POS = { map: 'farm', x: 9.5, y: 7.5 };

function seedMapObjects(id: string): MapState {
  const m = parseMap(id);
  const objects: (WorldObject | null)[] = m.seedObjects.map((o, i) => {
    switch (o) {
      case 'tree':
        return { kind: 'tree', hp: TREE_HP, stump: false, regrow: 0, variant: hash32(i, id.length) % 3 };
      case 'boulder':
        return { kind: 'boulder', hp: BOULDER_HP };
      case 'stone':
        return { kind: 'stone', hp: 1 };
      case 'weeds':
        return { kind: 'weeds' };
      case 'twig':
        return { kind: 'twig' };
      default:
        return null;
    }
  });
  return { objects };
}

export function newGame(seed: number): GameState {
  const farm = parseMap('farm');
  const inventory: Slot[] = new Array(INVENTORY_SLOTS).fill(null);
  for (const t of ['hoe', 'can', 'axe', 'pickaxe', 'scythe', 'rod']) addItem(inventory, t, 1);
  addItem(inventory, 'radish_seeds', 15);
  const maps: Record<string, MapState> = {};
  for (const id of ALL_MAP_IDS) maps[id] = seedMapObjects(id);
  const state: GameState = {
    version: 1,
    seed,
    rng: seed | 0,
    day: 0,
    minute: 0,
    subTick: 0,
    step: 0,
    weather: 'sunny',
    tomorrowWeather: 'sunny',
    player: {
      ...START_POS,
      facing: 2,
      energy: MAX_ENERGY,
      maxEnergy: MAX_ENERGY,
      coins: START_COINS,
      inventory,
      selected: 0,
      tools: { hoe: 0, can: 0, axe: 0, pickaxe: 0, scythe: 0, rod: 0 },
      canWater: CAN_CAPACITY[0],
      swing: 0,
      swingTool: null,
      skillXp: { farming: 0, mining: 0, fishing: 0 },
      fishing: null,
      moving: false,
    },
    farm: {
      soil: new Array(farm.w * farm.h).fill(null),
      entities: [],
      entityAt: new Array(farm.w * farm.h).fill(-1),
      nextEntityId: 1,
      layoutRev: 0,
      shipping: [],
    },
    maps,
    mineDeepest: 0,
    animals: [],
    nextAnimalId: 1,
    overflow: [],
    animalBox: [],
    villagers: initVillagers(),
    flags: [],
    recipes: [],
    rewards: [],
    quests: { active: [], done: [] },
    board: [],
    seenScenes: [],
    sceneQueue: [],
    festival: null,
    shippedTotal: {},
    today: emptyDayStats(),
    season: { coins: 0, spoiled: 0, crafted: 0 },
    report: null,
    passedOut: false,
  };
  return state;
}
