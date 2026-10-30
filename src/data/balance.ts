// Every balance number in the game. Logic and data tables read from here (CLAUDE.md rule 5).
// Units: minutes are in-game minutes, distances are metres (1 tile = 1 m).

// ---- Time -------------------------------------------------------------------------------------------
export const TICK_HZ = 10;
export const TICKS_PER_MINUTE = 5;
/** Day runs 06:00 → 02:00. */
export const DAY_START_HOUR = 6;
export const DAY_MINUTES = 20 * 60;
export const DAYS_PER_SEASON = 14;
export const SEASONS_PER_YEAR = 4;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS_PER_YEAR;

// ---- Player -----------------------------------------------------------------------------------------
export const PLAYER_RADIUS = 0.3;
/** metres per tick (3.5 m/s at 10 Hz) */
export const PLAYER_SPEED = 0.35;
/** how far from the player's centre a target tile's centre may be (metres) */
export const REACH = 1.75;
export const MAX_ENERGY = 120;
export const PASS_OUT_ENERGY_FRAC = 0.6;
/** ticks the player is locked while swinging a tool */
export const TOOL_SWING_TICKS = 3;
export const START_COINS = 300;
export const INVENTORY_SLOTS = 30;
export const HOTBAR_SLOTS = 10;
export const STACK_MAX = 999;

// ---- Tools ------------------------------------------------------------------------------------------
export const TOOL_TIERS = 3;
export const TOOL_ENERGY = { hoe: 2, can: 2, axe: 3, pickaxe: 3, scythe: 0, rod: 4 } as const;
/** energy cost multiplier per tier */
export const TOOL_TIER_ENERGY_MULT = [1, 0.85, 0.7];
/** hoe / can: tiles affected in a row in front of the player */
export const TOOL_AREA = [1, 3, 5];
export const CAN_CAPACITY = [20, 40, 70];
/** axe / pickaxe damage per hit */
export const TOOL_DAMAGE = [1, 2, 3];
export const TOOL_UPGRADE_COST: { coins: number; item: string; count: number }[] = [
  { coins: 0, item: 'stone', count: 0 },
  { coins: 400, item: 'copper_ore', count: 5 },
  { coins: 1200, item: 'iron_ore', count: 5 },
];

// ---- Farming ----------------------------------------------------------------------------------------
export const HARDY_WINTER_GROWTH = 0.5;
export const SOIL_REVERT_CHANCE = 0.15;
export const QUALITY_GOLD_BASE = 0.02;
export const QUALITY_GOLD_PER_LEVEL = 0.03;
export const FERTILIZER_GOLD_BONUS = 0.1;
/** price multiplier for normal, silver, gold */
export const QUALITY_PRICE_MULT = [1, 1.25, 1.5];
export const TREE_MATURE_DAYS = 20;

export interface CropBalance {
  seedPrice: number;
  growthDays: number;
  regrowDays?: number;
  harvestCount: number;
}
export const CROP_BALANCE: Record<string, CropBalance> = {
  radish: { seedPrice: 10, growthDays: 3, harvestCount: 1 },
  carrot: { seedPrice: 15, growthDays: 4, harvestCount: 1 },
  strawberry: { seedPrice: 50, growthDays: 6, regrowDays: 3, harvestCount: 1 },
  pea: { seedPrice: 30, growthDays: 5, regrowDays: 2, harvestCount: 2 },
  tomato: { seedPrice: 40, growthDays: 6, regrowDays: 3, harvestCount: 1 },
  sweetcorn: { seedPrice: 60, growthDays: 8, regrowDays: 4, harvestCount: 1 },
  melon: { seedPrice: 80, growthDays: 9, harvestCount: 1 },
  sunpepper: { seedPrice: 35, growthDays: 5, regrowDays: 2, harvestCount: 1 },
  wheat: { seedPrice: 8, growthDays: 4, harvestCount: 1 },
  pumpkin: { seedPrice: 90, growthDays: 9, harvestCount: 1 },
  beetroot: { seedPrice: 20, growthDays: 5, harvestCount: 1 },
  frostkale: { seedPrice: 40, growthDays: 6, harvestCount: 1 },
};
export const SAPLING_PRICE = 600;

// ---- Items: base sell value -------------------------------------------------------------------------
export const ITEM_VALUE: Record<string, number> = {
  // crops
  radish: 30, carrot: 40, strawberry: 70, pea: 22, tomato: 50, sweetcorn: 85, melon: 230, sunpepper: 40,
  wheat: 18, pumpkin: 300, beetroot: 75, frostkale: 95, honeypear: 120,
  // forage
  wild_leek: 25, morel: 60, blackberry: 20, sweet_clover: 30, hazelnut: 35, chanterelle: 70, snowberry: 40,
  winter_root: 45,
  // animal
  egg: 40, milk: 90,
  // minerals and materials
  wood: 2, stone: 2, fiber: 1, hay: 10, coal: 15, copper_ore: 10, iron_ore: 20, quartz: 30, amethyst: 120,
  // fish
  perch: 40, brook_trout: 65, carp: 30, pike: 100, catfish: 120, bream: 45, eel: 85, glowfin: 400,
  minnow: 8, sunfish: 25, crayfish: 35, smelt: 20, rainbow_trout: 75, largemouth_bass: 90, salmon: 140, koi: 200, walleye: 110,
  emberscale: 180, frostfin: 160, moonfin: 220, sturgeon: 300,
  // products
  strawberry_jam: 230, bramble_jam: 110, pear_butter: 330, pumpkin_butter: 680, melon_jam: 520,
  pickled_carrots: 160, pickled_beets: 270, pepper_relish: 150, tomato_passata: 180, kale_kraut: 320,
  radish_pickles: 150, corn_relish: 300, flour: 50, cheese: 230, harvest_medley: 600,
  // dishes
  radish_salad: 110, tomato_soup: 160, corn_chowder: 260, pumpkin_pie: 480, fish_stew: 220, pancakes: 240,
  berry_tart: 300, mushroom_toast: 210,
  // misc
  fertilizer: 5, lantern: 60, ribbon_charm: 0, promise_lantern: 0,
};
/** the least energy any fish restores */
export const FISH_MIN_ENERGY = 20;
/** energy restored when eaten (items not listed are inedible) */
export const ITEM_ENERGY: Record<string, number> = {
  radish: 10, carrot: 12, strawberry: 15, pea: 6, tomato: 12, sweetcorn: 15, melon: 40, sunpepper: 6,
  pumpkin: 0, beetroot: 15, frostkale: 20, honeypear: 30,
  wild_leek: 10, morel: 15, blackberry: 8, hazelnut: 12, chanterelle: 15, snowberry: 10, winter_root: 15,
  egg: 15, milk: 25,
  // fish are a proper meal: at least FISH_MIN_ENERGY, and a bigger species is a bigger meal
  minnow: 20, smelt: 22, crayfish: 22, sunfish: 24, perch: 28, bream: 28, carp: 30, brook_trout: 34, rainbow_trout: 36, largemouth_bass: 38,
  koi: 38, frostfin: 40, emberscale: 42, walleye: 45, eel: 45, pike: 50, moonfin: 50, salmon: 55, catfish: 55, glowfin: 70, sturgeon: 90,
  radish_salad: 40, tomato_soup: 50, corn_chowder: 70, pumpkin_pie: 90, fish_stew: 70, pancakes: 60,
  berry_tart: 70, mushroom_toast: 60,
};

// ---- Economy ----------------------------------------------------------------------------------------
export const AUTO_SELL_MULT = 0.9;
/** shops sell ore and materials at this multiple of base value */
export const SHOP_MARKUP = 2.5;
export const HAY_PRICE = 25;
export const FERTILIZER_PRICE = 15;

// ---- Machines (DESIGN.md §4, §5) --------------------------------------------------------------------
export interface MachineBalance {
  powerDraw: number;
  radius?: number;
  workMinutes?: number;
  bufferPerItem?: number;
  outputBuffer?: number;
  capacity?: number;
  powerSupply?: number;
  travelMinutes?: number;
  entryInterval?: number;
}
export const MACHINE_BALANCE: Record<string, MachineBalance> = {
  sprinkler: { powerDraw: 0, radius: 1 },
  pump_sprinkler: { powerDraw: 2, radius: 2 },
  seed_planter: { powerDraw: 2, radius: 2, workMinutes: 3, capacity: 60 },
  harvester: { powerDraw: 3, radius: 2, workMinutes: 4, outputBuffer: 6 },
  conveyor: { powerDraw: 0, capacity: 3, travelMinutes: 6, entryInterval: 3 },
  swift_conveyor: { powerDraw: 0, capacity: 3, travelMinutes: 2, entryInterval: 1 },
  splitter: { powerDraw: 0, capacity: 2, travelMinutes: 2, entryInterval: 1 },
  jam_press: { powerDraw: 4, bufferPerItem: 12, outputBuffer: 4 },
  preserver: { powerDraw: 4, bufferPerItem: 12, outputBuffer: 4 },
  mill: { powerDraw: 3, bufferPerItem: 12, outputBuffer: 6 },
  cheese_press: { powerDraw: 3, bufferPerItem: 8, outputBuffer: 4 },
  silo: { powerDraw: 0, capacity: 240 },
  market_chute: { powerDraw: 0 },
  water_wheel: { powerDraw: 0, radius: 5, powerSupply: 12 },
  windmill: { powerDraw: 0, radius: 4, powerSupply: 8 },
  heater: { powerDraw: 4, radius: 2 },
  chest: { powerDraw: 0, capacity: 12 },
};
/** water wheel supply multiplier by story state (DESIGN.md §7) */
export const WATER_MULT_START = 1;
export const WATER_MULT_RESTORED = 2;
export const WATER_MULT_SILTED = 0.5;
/** windmill supply multiplier by weather */
export const WIND_MULT: Record<string, number> = { sunny: 1, rain: 1.25, storm: 1.75, snow: 1 };

// ---- Crafter recipes: work minutes ------------------------------------------------------------------
export const RECIPE_WORK_MINUTES: Record<string, number> = {
  strawberry_jam: 60, bramble_jam: 60, pear_butter: 90, pumpkin_butter: 120, melon_jam: 120,
  pickled_carrots: 90, pickled_beets: 90, pepper_relish: 90, tomato_passata: 60, kale_kraut: 120,
  radish_pickles: 60, corn_relish: 90, harvest_medley: 180,
  flour: 15, cheese: 120,
};

// ---- Skills -----------------------------------------------------------------------------------------
/** cumulative XP needed for levels 1..5 */
export const SKILL_XP_THRESHOLDS = [100, 300, 650, 1150, 1800];
export const MAX_SKILL_LEVEL = 5;
export const XP_HARVEST = 4;
export const XP_STONE = 1;
export const XP_ORE = 5;
export const XP_FISH = 12;

// ---- World objects ----------------------------------------------------------------------------------
export const TREE_HP = 8;
export const STUMP_HP = 4;
export const TREE_WOOD = 10;
export const STUMP_WOOD = 4;
export const TREE_REGROW_DAYS = 6;
export const BOULDER_HP = 6;
export const BOULDER_STONE = 8;
export const STONE_YIELD = 1;
export const TWIG_WOOD = 1;
export const WEEDS_FIBER_CHANCE = 0.6;
/** chance per extra drop roll from mining level */
export const MINING_BONUS_PER_LEVEL = 0.08;

// ---- Foraging ---------------------------------------------------------------------------------------
/** new forage items per map each morning (on '*' spots) */
export const FORAGE_PER_DAY: Record<string, number> = { forest: 6, lake: 3, town: 0, farm: 0 };

// ---- Day report -------------------------------------------------------------------------------------
export const PROCESSED_SCORE = 5;
export const SPOIL_SCORE = 3;
/** report hints: a belt jammed for this share of the day, a crafter idle this share of its minutes */
export const REPORT_JAM_FRAC = 0.2;
export const REPORT_STARVED_FRAC = 0.6;
export const REPORT_MAX_HINTS = 3;

// ---- Shop prices for things without a crop or ore price ---------------------------------------------
export const SHOP_PRICES: Record<string, number> = {
  chest: 150,
  radish_salad: 140,
  tomato_soup: 200,
  pancakes: 260,
  recipe_tomato_soup: 300,
  recipe_pancakes: 400,
  recipe_corn_chowder: 500,
  ribbon_charm: 500,
  promise_lantern: 2000,
};

// ---- Villagers (DESIGN.md §9) ----------------------------------------------------------------------
/** tiles per in-game minute */
export const NPC_SPEED = 1.2;
/** how close (tiles) a villager must be to the clicked tile to talk */
export const NPC_TALK_RADIUS = 0.95;
export const POINTS_PER_HEART = 250;
export const MAX_HEARTS = 10;
export const MAX_POINTS = POINTS_PER_HEART * MAX_HEARTS;
export const DATING_CAP_HEARTS = 8;
export const TALK_POINTS = 20;
export const GIFT_POINTS: Record<'loved' | 'liked' | 'neutral' | 'disliked', number> = { loved: 80, liked: 45, neutral: 20, disliked: -20 };
export const BIRTHDAY_GIFT_MULT = 5;
export const GIFTS_PER_WEEK = 2;
/** days between giving the Promise Lantern and the ceremony */
export const ENGAGEMENT_DAYS = 3;

// ---- Festivals (DESIGN.md §11) ---------------------------------------------------------------------
/** in-game minutes the timed festival activities last */
export const FESTIVAL_ACTIVITY_MINUTES = 180;
/** leaving a festival skips the clock to this minute (22:00) if it is earlier */
export const FESTIVAL_LEAVE_MINUTE = 16 * 60;
export const POD_COUNT = 12;
export const POD_PRIZE = 40;
export const DERBY_FISH_PRIZE = 60;
/** Weigh-in: rival exhibit scores, and coin prizes for 1st/2nd/3rd */
export const WEIGHIN_RIVALS = [420, 300, 180];
export const WEIGHIN_PRIZES = [1200, 600, 250];
/** Lantern Night: friendship bonus for a gift to your secret friend */
export const SECRET_FRIEND_POINTS = 120;
/** how often (in-game minutes) heart-event triggers are re-checked on the current map */
export const SCENE_CHECK_MINUTES = 30;
/** villagers set off for their festival spot this many minutes before it starts */
export const FESTIVAL_GATHER_MINUTES = 60;
/** dialogue: extra pick weight per condition a line lists (DESIGN.md §9) */
export const DIALOGUE_SPECIFIC_WEIGHT = 3;

// ---- Quest board (DESIGN.md §10) -------------------------------------------------------------------
export const BOARD_SIZE = 3;
/** reward = round(value × count × BOARD_REWARD_MULT), at least BOARD_MIN_REWARD */
export const BOARD_REWARD_MULT = 2;
export const BOARD_MIN_REWARD = 60;
export const BOARD_POINTS = 60;

// ---- Mine (DESIGN.md §12) -----------------------------------------------------------------------------
/** rocks per floor: base + per floor */
export const MINE_ROCKS_BASE = 22;
export const MINE_ROCKS_PER_FLOOR = 2;
/** chance a rock is an ore rock, by floor 1..10 */
export const MINE_ORE_CHANCE = [0, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.3];
/** ore table by floor band: [item, weight] */
export const MINE_ORE_TABLE: { from: number; ores: [string, number][] }[] = [
  { from: 1, ores: [['copper_ore', 6], ['coal', 3]] },
  { from: 3, ores: [['copper_ore', 5], ['coal', 3], ['quartz', 2]] },
  { from: 5, ores: [['copper_ore', 3], ['iron_ore', 4], ['coal', 3], ['quartz', 2]] },
  { from: 8, ores: [['iron_ore', 5], ['coal', 3], ['quartz', 2], ['amethyst', 2]] },
];
export const MINE_ROCK_HP = 2;
export const MINE_ORE_HP = 3;
/** the ladder appears after this many rocks even if its rock is still standing */
export const LADDER_ROCK_LIMIT = 12;
/** dust bunnies per floor: base + per floor (floor 1 has none) */
export const BUNNIES_BASE = 0;
export const BUNNIES_PER_FLOOR = 0.6;
/** a bunny hops one tile toward you every this many ticks */
export const BUNNY_HOP_TICKS = 8;
export const BUNNY_ENERGY = 4;
/** bunnies only notice you within this many tiles */
export const BUNNY_SIGHT = 6;
/** floors with a lift stop */
export const LIFT_FLOORS = [1, 5, 10];

// ---- Fishing (DESIGN.md §12) --------------------------------------------------------------------------
export const BITE_MIN_TICKS = 15;
export const BITE_MAX_TICKS = 60;
/** catch zone height on the 0..1 bar, by rod tier */
export const FISH_ZONE_SIZE = [0.24, 0.3, 0.36];
export const FISH_ZONE_LIFT = 0.012;
export const FISH_ZONE_GRAVITY = 0.008;
export const FISH_ZONE_DAMP = 0.86;
export const FISH_CATCH_RATE = 0.014;
/** a bigger fish takes longer to reel in: catch rate is divided by 1 + size × this */
export const FISH_SIZE_REEL_TIME = 0.8;
export const FISH_DRAIN_RATE = 0.011;
/**
 * A hooked fish tires. Fatigue grows with the ticks spent reeling: FISH_TIRE_TICKS (24 s at 10 Hz) for a small fish,
 * longer for a big one (× 1 + size × FISH_SIZE_TIRE_TIME). As it tires the fish swims slower (down to
 * 1 - FISH_TIRE_SLOWDOWN of its speed), the meter fills faster (up to 1 + FISH_TIRE_CATCH_BOOST) and drains less
 * (down to 1 - FISH_TIRE_DRAIN_RELIEF). At full fatigue a fish that has not broken loose is landed.
 */
export const FISH_TIRE_TICKS = 240;
export const FISH_SIZE_TIRE_TIME = 0.6;
export const FISH_TIRE_SLOWDOWN = 0.7;
export const FISH_TIRE_CATCH_BOOST = 1.5;
export const FISH_TIRE_DRAIN_RELIEF = 0.8;
export const FISH_START_PROGRESS = 0.3;
/**
 * Fish sizes. A catch rolls a length fraction f in 0..1 of its species' range: roll^FISH_LENGTH_SKEW (so small
 * fish are common) plus FISH_LENGTH_SKILL_BONUS per fishing level. f decides the size class, which is the quality
 * (silver and gold sell at QUALITY_PRICE_MULT), and bigger fish are harder: difficulty shifts by
 * (f - 0.5) × FISH_SIZE_DIFFICULTY.
 */
export const FISH_LENGTH_SKEW = 1.8;
export const FISH_LENGTH_SKILL_BONUS = 0.03;
export const FISH_SILVER_AT = 0.6;
export const FISH_GOLD_AT = 0.85;
export const FISH_SIZE_DIFFICULTY = 0.45;

// ---- Animals (DESIGN.md §12) -----------------------------------------------------------------------
export const COOP_CAPACITY = 4;
export const BARN_CAPACITY = 3;
export const BUILD_COOP_COST = { coins: 1200, wood: 100, stone: 40 };
export const BUILD_BARN_COST = { coins: 3000, wood: 180, stone: 80 };
export const CHICKEN_PRICE = 350;
export const COW_PRICE = 900;
/** friendship 0..1000; petting adds this once a day, missing a meal costs MISSED_MEAL_POINTS */
export const PET_POINTS = 30;
export const MISSED_MEAL_POINTS = 40;
/** product quality from friendship: gold above, silver above */
export const ANIMAL_GOLD_AT = 800;
export const ANIMAL_SILVER_AT = 400;
/** animals start producing after this many days */
export const ANIMAL_MATURE_DAYS = 3;
