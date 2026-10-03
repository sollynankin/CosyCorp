// Shop stock (DESIGN.md §8). Prices come from balance.ts; an entry may be limited to seasons or gated by a flag.
import { BUILD_BARN_COST, BUILD_COOP_COST, CHICKEN_PRICE, COW_PRICE, CROP_BALANCE, FERTILIZER_PRICE, HAY_PRICE, ITEM_VALUE, SAPLING_PRICE, SHOP_MARKUP, SHOP_PRICES } from './balance';
import { CROPS } from './crops';
import type { ItemId, SeasonId } from './types';

export interface ShopEntry {
  item: ItemId;
  price: number;
  seasons?: SeasonId[];
  requiresFlag?: string;
  /** hidden once this flag is set (one-off purchases like buildings) */
  hideFlag?: string;
  /** Joinery services: a building or an animal instead of an item */
  service?: 'coop' | 'barn' | 'chicken' | 'cow';
  /** materials taken along with the coins */
  materials?: { item: ItemId; n: number }[];
  /** recipe this entry teaches instead of giving an item */
  recipe?: string;
}

export interface ShopDef {
  id: string;
  name: string;
  keeper: string;
  map: string;
  /** "HH:MM" open and close */
  open: string;
  close: string;
  /** weekdays closed, 0 = Mon */
  closed: number[];
  stock: ShopEntry[];
}

const seeds: ShopEntry[] = CROPS.map((c) => ({ item: c.seedItem, price: CROP_BALANCE[c.id].seedPrice, seasons: c.seasons.filter((s) => s !== 'winter') }))
  .filter((e) => e.seasons.length > 0);
// Frostkale is the one crop you can sow in winter.
seeds.push({ item: 'frostkale_seeds', price: CROP_BALANCE.frostkale.seedPrice, seasons: ['winter'] });

const ore = (item: ItemId): ShopEntry => ({ item, price: Math.round(ITEM_VALUE[item] * SHOP_MARKUP) });

export const SHOPS: ShopDef[] = [
  {
    id: 'almanac',
    name: 'Almanac & Sundries',
    keeper: 'wren',
    map: 'town',
    open: '09:00',
    close: '18:00',
    closed: [2],
    stock: [
      ...seeds,
      { item: 'fertilizer', price: FERTILIZER_PRICE },
      { item: 'hay', price: HAY_PRICE },
      { item: 'honeypear_sapling', price: SAPLING_PRICE, requiresFlag: 'seed_library' },
    ],
  },
  {
    id: 'smithy',
    name: 'The Smithy',
    keeper: 'teo',
    map: 'town',
    open: '09:00',
    close: '16:00',
    closed: [6],
    stock: [ore('stone'), ore('coal'), ore('copper_ore'), ore('iron_ore')],
  },
  {
    id: 'joinery',
    name: 'Toller Joinery',
    keeper: 'bram',
    map: 'town',
    open: '09:00',
    close: '17:00',
    closed: [1],
    stock: [
      ore('wood'),
      { item: 'chest', price: SHOP_PRICES.chest },
      { item: 'hay', price: HAY_PRICE },
      { item: 'build_coop', price: BUILD_COOP_COST.coins, service: 'coop', hideFlag: 'built_coop', materials: [{ item: 'wood', n: BUILD_COOP_COST.wood }, { item: 'stone', n: BUILD_COOP_COST.stone }] },
      { item: 'build_barn', price: BUILD_BARN_COST.coins, service: 'barn', hideFlag: 'built_barn', requiresFlag: 'built_coop', materials: [{ item: 'wood', n: BUILD_BARN_COST.wood }, { item: 'stone', n: BUILD_BARN_COST.stone }] },
      { item: 'chicken', price: CHICKEN_PRICE, service: 'chicken', requiresFlag: 'built_coop' },
      { item: 'cow', price: COW_PRICE, service: 'cow', requiresFlag: 'built_barn' },
    ],
  },
  {
    id: 'inn',
    name: 'The Kettle Inn',
    keeper: 'pell',
    map: 'town',
    open: '12:00',
    close: '00:00',
    closed: [],
    stock: [
      { item: 'radish_salad', price: SHOP_PRICES.radish_salad },
      { item: 'tomato_soup', price: SHOP_PRICES.tomato_soup, seasons: ['summer', 'autumn'] },
      { item: 'pancakes', price: SHOP_PRICES.pancakes },
      { item: 'cook_tomato_soup', price: SHOP_PRICES.recipe_tomato_soup, recipe: 'cook_tomato_soup' },
      { item: 'cook_pancakes', price: SHOP_PRICES.recipe_pancakes, recipe: 'cook_pancakes' },
      { item: 'cook_corn_chowder', price: SHOP_PRICES.recipe_corn_chowder, recipe: 'cook_corn_chowder' },
      { item: 'ribbon_charm', price: SHOP_PRICES.ribbon_charm, requiresFlag: 'eight_hearts_romance' },
      { item: 'promise_lantern', price: SHOP_PRICES.promise_lantern, requiresFlag: 'courting' },
    ],
  },
];

export function getShop(id: string): ShopDef {
  const s = SHOPS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown shop: ${id}`);
  return s;
}
