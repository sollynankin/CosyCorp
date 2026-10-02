import type { CropDef, TreeDef } from './types';

// Order is the order of the seed shelf. Growth numbers are in balance.ts (CROP_BALANCE).
export const CROPS: CropDef[] = [
  { id: 'radish', name: 'Radish', seasons: ['spring'], hardy: false, harvestItem: 'radish', seedItem: 'radish_seeds', mesh: 'root', color: '#d8445a' },
  { id: 'carrot', name: 'Carrot', seasons: ['spring', 'autumn'], hardy: false, harvestItem: 'carrot', seedItem: 'carrot_seeds', mesh: 'root', color: '#e8862a' },
  { id: 'strawberry', name: 'Strawberry', seasons: ['spring'], hardy: false, harvestItem: 'strawberry', seedItem: 'strawberry_seeds', mesh: 'berryBush', color: '#e0303c' },
  { id: 'pea', name: 'Pea', seasons: ['spring', 'summer'], hardy: false, harvestItem: 'pea', seedItem: 'pea_seeds', mesh: 'vine', color: '#7ccf4a' },
  { id: 'tomato', name: 'Tomato', seasons: ['summer'], hardy: false, harvestItem: 'tomato', seedItem: 'tomato_seeds', mesh: 'vine', color: '#e5452c' },
  { id: 'sweetcorn', name: 'Sweetcorn', seasons: ['summer', 'autumn'], hardy: false, harvestItem: 'sweetcorn', seedItem: 'sweetcorn_seeds', mesh: 'stalk', color: '#f2cf4a' },
  { id: 'melon', name: 'Melon', seasons: ['summer'], hardy: false, harvestItem: 'melon', seedItem: 'melon_seeds', mesh: 'gourd', color: '#7fbf5a' },
  { id: 'sunpepper', name: 'Sunpepper', seasons: ['summer'], hardy: false, harvestItem: 'sunpepper', seedItem: 'sunpepper_seeds', mesh: 'berryBush', color: '#f59a1c' },
  { id: 'wheat', name: 'Wheat', seasons: ['summer', 'autumn'], hardy: false, harvestItem: 'wheat', seedItem: 'wheat_seeds', mesh: 'grain', color: '#e3c26a' },
  { id: 'pumpkin', name: 'Pumpkin', seasons: ['autumn'], hardy: false, harvestItem: 'pumpkin', seedItem: 'pumpkin_seeds', mesh: 'gourd', color: '#e9781f' },
  { id: 'beetroot', name: 'Beetroot', seasons: ['autumn'], hardy: false, harvestItem: 'beetroot', seedItem: 'beetroot_seeds', mesh: 'root', color: '#8e1f45' },
  { id: 'frostkale', name: 'Frostkale', seasons: ['autumn', 'winter'], hardy: true, harvestItem: 'frostkale', seedItem: 'frostkale_seeds', mesh: 'leafy', color: '#4f8f8a' },
];

export const TREES: TreeDef[] = [
  { id: 'honeypear', name: 'Honeypear Tree', fruitItem: 'honeypear', fruitSeasons: ['autumn'], saplingItem: 'honeypear_sapling', color: '#e6c34a' },
];
