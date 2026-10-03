import { CROPS, TREES } from './crops';
import type { ItemDef } from './types';

// Base values and energy live in balance.ts (ITEM_VALUE, ITEM_ENERGY).

const crop = (id: string, name: string, color: string, icon: ItemDef['icon'], tags: string[]): ItemDef => ({
  id, name, category: 'crop', spoils: true, color, icon, tags,
});

const cropItems: ItemDef[] = [
  crop('radish', 'Radish', '#d8445a', 'round', ['vegetable']),
  crop('carrot', 'Carrot', '#e8862a', 'long', ['vegetable']),
  crop('strawberry', 'Strawberry', '#e0303c', 'round', ['fruit']),
  crop('pea', 'Pea Pod', '#7ccf4a', 'long', ['vegetable']),
  crop('tomato', 'Tomato', '#e5452c', 'round', ['vegetable', 'fruit']),
  crop('sweetcorn', 'Sweetcorn', '#f2cf4a', 'long', ['vegetable']),
  crop('melon', 'Melon', '#7fbf5a', 'round', ['fruit']),
  crop('sunpepper', 'Sunpepper', '#f59a1c', 'long', ['vegetable']),
  crop('wheat', 'Wheat', '#e3c26a', 'leaf', ['grain']),
  crop('pumpkin', 'Pumpkin', '#e9781f', 'round', ['vegetable']),
  crop('beetroot', 'Beetroot', '#8e1f45', 'round', ['vegetable']),
  crop('frostkale', 'Frostkale', '#4f8f8a', 'leaf', ['vegetable']),
  crop('honeypear', 'Honeypear', '#e6c34a', 'round', ['fruit']),
];

const seedItems: ItemDef[] = CROPS.map((c) => ({
  id: c.seedItem,
  name: `${c.name} Seeds`,
  category: 'seed' as const,
  spoils: false,
  plants: c.id,
  color: c.color,
  icon: 'bag' as const,
}));

const saplingItems: ItemDef[] = TREES.map((t) => ({
  id: t.saplingItem,
  name: `${t.name.replace(' Tree', '')} Sapling`,
  category: 'sapling' as const,
  spoils: false,
  plants: t.id,
  color: '#6a8a3a',
  icon: 'leaf' as const,
}));

const forage = (id: string, name: string, color: string, icon: ItemDef['icon'], tags: string[] = []): ItemDef => ({
  id, name, category: 'forage', spoils: true, color, icon, tags,
});

const forageItems: ItemDef[] = [
  forage('wild_leek', 'Wild Leek', '#9bd36a', 'long', ['vegetable']),
  forage('morel', 'Morel', '#a57a4f', 'round', ['mushroom']),
  forage('blackberry', 'Blackberry', '#4b2a5e', 'round', ['fruit']),
  forage('sweet_clover', 'Sweet Clover', '#e8a8d0', 'leaf'),
  forage('hazelnut', 'Hazelnut', '#a0703a', 'round'),
  forage('chanterelle', 'Chanterelle', '#f0a73a', 'round', ['mushroom']),
  forage('snowberry', 'Snowberry', '#eef4ff', 'round', ['fruit']),
  forage('winter_root', 'Winter Root', '#b7a07a', 'long', ['vegetable']),
];

const fish = (id: string, name: string, color: string): ItemDef => ({
  id, name, category: 'fish', spoils: true, color, icon: 'fish', tags: ['fish'],
});

const fishItems: ItemDef[] = [
  fish('perch', 'Perch', '#9fb04a'),
  fish('brook_trout', 'Brook Trout', '#c9897a'),
  fish('carp', 'Carp', '#b49a5a'),
  fish('pike', 'Pike', '#6f8a5a'),
  fish('catfish', 'Catfish', '#6b6255'),
  fish('bream', 'Bream', '#c8c08a'),
  fish('eel', 'Eel', '#4f5a4a'),
  fish('glowfin', 'Glowfin', '#7ff0e0'),
];

const product = (id: string, name: string, color: string, icon: ItemDef['icon'] = 'jar'): ItemDef => ({
  id, name, category: 'product', spoils: false, color, icon,
});

const productItems: ItemDef[] = [
  product('strawberry_jam', 'Strawberry Jam', '#d8243a'),
  product('bramble_jam', 'Bramble Jam', '#4b1f4e'),
  product('pear_butter', 'Pear Butter', '#d8b03a'),
  product('pumpkin_butter', 'Pumpkin Butter', '#e07a1f'),
  product('melon_jam', 'Melon Jam', '#8fd07a'),
  product('pickled_carrots', 'Pickled Carrots', '#e8862a'),
  product('pickled_beets', 'Pickled Beets', '#8e1f45'),
  product('pepper_relish', 'Pepper Relish', '#f08a1c'),
  product('tomato_passata', 'Tomato Passata', '#c42a1c', 'bottle'),
  product('kale_kraut', 'Kale Kraut', '#4f8f6a'),
  product('radish_pickles', 'Radish Pickles', '#e06a8a'),
  product('corn_relish', 'Corn Relish', '#e8c23a'),
  product('flour', 'Flour', '#f2eadc', 'bag'),
  product('cheese', 'Cheese', '#f2cf5a', 'box'),
  product('harvest_medley', 'Harvest Medley', '#c7652a'),
];

const dish = (id: string, name: string, color: string): ItemDef => ({
  id, name, category: 'dish', spoils: false, color, icon: 'bowl',
});

const dishItems: ItemDef[] = [
  dish('radish_salad', 'Radish Salad', '#e06a7a'),
  dish('tomato_soup', 'Tomato Soup', '#d8442c'),
  dish('corn_chowder', 'Corn Chowder', '#f0d880'),
  dish('pumpkin_pie', 'Pumpkin Pie', '#d8822a'),
  dish('fish_stew', 'Fish Stew', '#c08a5a'),
  dish('pancakes', 'Pancakes', '#e8b86a'),
  dish('berry_tart', 'Berry Tart', '#c8304a'),
  dish('mushroom_toast', 'Mushroom Toast', '#a87a4a'),
];

const mat = (id: string, name: string, category: ItemDef['category'], color: string, icon: ItemDef['icon']): ItemDef => ({
  id, name, category, spoils: false, color, icon,
});

const materialItems: ItemDef[] = [
  mat('wood', 'Wood', 'material', '#9a6a3a', 'long'),
  mat('stone', 'Stone', 'mineral', '#9a9a94', 'round'),
  mat('fiber', 'Fibre', 'material', '#8fae4a', 'leaf'),
  mat('hay', 'Hay', 'material', '#d8c26a', 'leaf'),
  mat('coal', 'Coal', 'mineral', '#2e2a2a', 'round'),
  mat('copper_ore', 'Copper Ore', 'mineral', '#c8743a', 'gem'),
  mat('iron_ore', 'Iron Ore', 'mineral', '#8a8a9a', 'gem'),
  mat('quartz', 'Quartz', 'mineral', '#e8f0f4', 'gem'),
  mat('amethyst', 'Amethyst', 'mineral', '#9a5ad8', 'gem'),
  mat('fertilizer', 'Fertiliser', 'material', '#6a4a2a', 'bag'),
  mat('lantern', 'Jar Lantern', 'material', '#f6d36a', 'bottle'),
  { id: 'egg', name: 'Egg', category: 'animal', spoils: true, color: '#f4ead8', icon: 'egg' },
  { id: 'milk', name: 'Milk', category: 'animal', spoils: true, color: '#f8f8f4', icon: 'bottle' },
];

const specialItems: ItemDef[] = [
  { id: 'ribbon_charm', name: 'Ribbon Charm', category: 'special', spoils: false, color: '#e05a8a', icon: 'leaf', description: 'Give to someone you love (8 hearts) to start courting.' },
  { id: 'promise_lantern', name: 'Promise Lantern', category: 'special', spoils: false, color: '#f6c84a', icon: 'bottle', description: 'Give to your sweetheart at 10 hearts.' },
  { id: 'logbook', name: "Hollis's Logbook", category: 'special', spoils: false, color: '#5a3a2a', icon: 'box', description: 'Water-stained. The last entry is underlined twice.' },
  { id: 'seed_tin', name: 'Seed Tin', category: 'special', spoils: false, color: '#8a9aa8', icon: 'box', description: 'A dented tin with "Rook" scratched on the lid.' },
  { id: 'build_coop', name: 'Coop', category: 'special', spoils: false, color: '#d8b47a', icon: 'box', description: 'Bram builds a coop for up to 4 chickens on the plot north of the field.' },
  { id: 'build_barn', name: 'Barn', category: 'special', spoils: false, color: '#b8463a', icon: 'box', description: 'Bram builds a barn for up to 3 cows next to the coop.' },
  { id: 'chicken', name: 'Chicken', category: 'special', spoils: false, color: '#f4ead8', icon: 'egg', description: 'Lays an egg every day it is fed. Lives in the coop.' },
  { id: 'cow', name: 'Cow', category: 'special', spoils: false, color: '#f0e8e0', icon: 'bottle', description: 'Gives milk every day it is fed. Lives in the barn.' },
  { id: 'seed_pod', name: 'Seed Pod', category: 'special', spoils: false, color: '#e8a0c0', icon: 'egg', description: 'A painted pod from the Blossom Fair hunt.' },
];

const toolItems: ItemDef[] = [
  { id: 'hoe', name: 'Hoe', category: 'tool', spoils: false, tool: 'hoe', color: '#8a6a4a', icon: 'tool' },
  { id: 'can', name: 'Watering Can', category: 'tool', spoils: false, tool: 'can', color: '#5a8ab8', icon: 'tool' },
  { id: 'axe', name: 'Axe', category: 'tool', spoils: false, tool: 'axe', color: '#a84a3a', icon: 'tool' },
  { id: 'pickaxe', name: 'Pickaxe', category: 'tool', spoils: false, tool: 'pickaxe', color: '#7a7a8a', icon: 'tool' },
  { id: 'scythe', name: 'Scythe', category: 'tool', spoils: false, tool: 'scythe', color: '#b8b8a8', icon: 'tool' },
  { id: 'rod', name: 'Fishing Rod', category: 'tool', spoils: false, tool: 'rod', color: '#6a8a4a', icon: 'tool' },
];

// Machine items are generated from MACHINES in data/index.ts to keep one source of truth.
export const BASE_ITEMS: ItemDef[] = [
  ...toolItems,
  ...cropItems,
  ...seedItems,
  ...saplingItems,
  ...forageItems,
  ...fishItems,
  ...productItems,
  ...dishItems,
  ...materialItems,
  ...specialItems,
];
