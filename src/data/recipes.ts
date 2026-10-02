import { RECIPE_WORK_MINUTES } from './balance';
import type { RecipeDef, RecipeInput } from './types';

const press = (id: string, station: string, inputs: RecipeInput[], extra: Partial<RecipeDef> = {}): RecipeDef => ({
  id, station, inputs, output: { item: id, count: 1 }, workMinutes: RECIPE_WORK_MINUTES[id], learned: false, ...extra,
});

// Crafter recipes. ORDER MATTERS: a crafter starts the first recipe whose inputs are all present,
// so multi-input recipes come before single-input ones that share an ingredient.
export const MACHINE_RECIPES: RecipeDef[] = [
  press('harvest_medley', 'preserver', [{ item: 'carrot', count: 2 }, { item: 'beetroot', count: 2 }, { item: 'sunpepper', count: 2 }], { requiresReward: 'medley' }),
  press('strawberry_jam', 'jam_press', [{ item: 'strawberry', count: 3 }]),
  press('bramble_jam', 'jam_press', [{ item: 'blackberry', count: 4 }]),
  press('pear_butter', 'jam_press', [{ item: 'honeypear', count: 2 }]),
  press('pumpkin_butter', 'jam_press', [{ item: 'pumpkin', count: 2 }]),
  press('melon_jam', 'jam_press', [{ item: 'melon', count: 2 }]),
  press('pickled_carrots', 'preserver', [{ item: 'carrot', count: 3 }]),
  press('pickled_beets', 'preserver', [{ item: 'beetroot', count: 3 }]),
  press('pepper_relish', 'preserver', [{ item: 'sunpepper', count: 3 }]),
  press('tomato_passata', 'preserver', [{ item: 'tomato', count: 3 }]),
  press('kale_kraut', 'preserver', [{ item: 'frostkale', count: 3 }]),
  press('radish_pickles', 'preserver', [{ item: 'radish', count: 4 }]),
  press('corn_relish', 'preserver', [{ item: 'sweetcorn', count: 3 }]),
  press('flour', 'mill', [{ item: 'wheat', count: 2 }]),
  press('cheese', 'cheese_press', [{ item: 'milk', count: 1 }]),
];

const craft = (item: string, inputs: RecipeInput[], count = 1, learned = false): RecipeDef => ({
  id: `craft_${item}`, station: 'craft', inputs, output: { item, count }, learned,
});

// Crafting tab (C). Machines are learned from story beats (DESIGN.md §0).
export const CRAFT_RECIPES: RecipeDef[] = [
  craft('chest', [{ item: 'wood', count: 40 }], 1, true),
  craft('fertilizer', [{ item: 'fiber', count: 3 }, { item: 'wood', count: 1 }], 5, true),
  craft('lantern', [{ item: 'copper_ore', count: 1 }, { item: 'quartz', count: 1 }], 2),
  craft('sprinkler', [{ item: 'copper_ore', count: 2 }, { item: 'stone', count: 5 }]),
  craft('pump_sprinkler', [{ item: 'iron_ore', count: 2 }, { item: 'copper_ore', count: 2 }, { item: 'quartz', count: 1 }]),
  craft('conveyor', [{ item: 'wood', count: 2 }, { item: 'fiber', count: 2 }], 4),
  craft('swift_conveyor', [{ item: 'conveyor', count: 4 }, { item: 'iron_ore', count: 1 }], 4),
  craft('splitter', [{ item: 'wood', count: 5 }, { item: 'copper_ore', count: 1 }]),
  craft('harvester', [{ item: 'wood', count: 15 }, { item: 'copper_ore', count: 4 }, { item: 'stone', count: 10 }]),
  craft('seed_planter', [{ item: 'wood', count: 15 }, { item: 'copper_ore', count: 3 }]),
  craft('silo', [{ item: 'wood', count: 50 }, { item: 'stone', count: 40 }]),
  craft('jam_press', [{ item: 'wood', count: 30 }, { item: 'copper_ore', count: 3 }, { item: 'coal', count: 2 }]),
  craft('preserver', [{ item: 'wood', count: 30 }, { item: 'iron_ore', count: 1 }, { item: 'coal', count: 2 }]),
  craft('mill', [{ item: 'stone', count: 40 }, { item: 'wood', count: 20 }, { item: 'iron_ore', count: 2 }]),
  craft('cheese_press', [{ item: 'wood', count: 30 }, { item: 'stone', count: 20 }, { item: 'copper_ore', count: 2 }]),
  craft('market_chute', [{ item: 'wood', count: 25 }, { item: 'copper_ore', count: 2 }]),
  craft('water_wheel', [{ item: 'wood', count: 60 }, { item: 'stone', count: 20 }, { item: 'copper_ore', count: 5 }]),
  craft('windmill', [{ item: 'wood', count: 60 }, { item: 'fiber', count: 20 }, { item: 'iron_ore', count: 3 }]),
  craft('heater', [{ item: 'stone', count: 20 }, { item: 'iron_ore', count: 2 }, { item: 'coal', count: 5 }]),
];

const cook = (item: string, inputs: RecipeInput[], learned = false): RecipeDef => ({
  id: `cook_${item}`, station: 'cook', inputs, output: { item, count: 1 }, learned,
});

export const COOK_RECIPES: RecipeDef[] = [
  cook('radish_salad', [{ item: 'radish', count: 2 }, { item: 'wild_leek', count: 1 }], true),
  cook('tomato_soup', [{ item: 'tomato', count: 2 }]),
  cook('corn_chowder', [{ item: 'sweetcorn', count: 1 }, { item: 'milk', count: 1 }]),
  cook('pumpkin_pie', [{ item: 'pumpkin', count: 1 }, { item: 'flour', count: 1 }, { item: 'egg', count: 1 }]),
  cook('fish_stew', [{ tag: 'fish', count: 2 }, { item: 'carrot', count: 1 }]),
  cook('pancakes', [{ item: 'flour', count: 1 }, { item: 'egg', count: 1 }, { item: 'milk', count: 1 }]),
  cook('berry_tart', [{ item: 'strawberry', count: 2 }, { item: 'flour', count: 1 }]),
  cook('mushroom_toast', [{ tag: 'mushroom', count: 1 }, { item: 'flour', count: 1 }]),
];

export const RECIPES: RecipeDef[] = [...MACHINE_RECIPES, ...CRAFT_RECIPES, ...COOK_RECIPES];
