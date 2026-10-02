// Content types. Tables reference each other by string id; lookups in data/index.ts throw on unknown ids.

export type Dir = 0 | 1 | 2 | 3;
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherId = 'sunny' | 'rain' | 'storm' | 'snow';
export type ItemId = string;
export type MapId = string;
export type ToolId = 'hoe' | 'can' | 'axe' | 'pickaxe' | 'scythe' | 'rod';
export type Quality = 0 | 1 | 2;
export type SkillId = 'farming' | 'mining' | 'fishing';

export type ItemCategory =
  | 'crop'
  | 'forage'
  | 'animal'
  | 'fish'
  | 'mineral'
  | 'material'
  | 'product'
  | 'dish'
  | 'seed'
  | 'sapling'
  | 'machine'
  | 'tool'
  | 'special';

export interface ItemDef {
  id: ItemId;
  name: string;
  category: ItemCategory;
  /** raw goods spoil overnight on belts and in machine buffers (DESIGN.md §4) */
  spoils: boolean;
  /** tags used by recipes (`fish`, `mushroom`, `fruit`, `vegetable`) */
  tags?: string[];
  /** for seeds: the crop they plant. For saplings: the tree. For machines: the machine def. For tools: the tool. */
  plants?: string;
  places?: string;
  tool?: ToolId;
  /** colour used by the generic item icon and belt-item mesh */
  color: string;
  /** icon shape for the generic icon renderer */
  icon: 'round' | 'long' | 'leaf' | 'jar' | 'bag' | 'box' | 'fish' | 'gem' | 'bowl' | 'tool' | 'machine' | 'egg' | 'bottle';
  description?: string;
}

export interface CropDef {
  id: string;
  name: string;
  seasons: SeasonId[];
  /** survives and grows (slowly) on frozen winter soil */
  hardy: boolean;
  harvestItem: ItemId;
  seedItem: ItemId;
  /** mesh builder key in render/meshes/crops */
  mesh: string;
  /** main colour of the produce, used by meshes */
  color: string;
}

export interface TreeDef {
  id: string;
  name: string;
  fruitItem: ItemId;
  fruitSeasons: SeasonId[];
  saplingItem: ItemId;
  color: string;
}

export interface WeatherWeights {
  sunny: number;
  rain: number;
  storm: number;
  snow: number;
}

export interface SeasonDef {
  id: SeasonId;
  name: string;
  weather: WeatherWeights;
}

export type MachineKind =
  | 'sprinkler'
  | 'planter'
  | 'harvester'
  | 'belt'
  | 'splitter'
  | 'crafter'
  | 'storage'
  | 'seller'
  | 'generator'
  | 'heater'
  | 'chest';

export interface MachineDef {
  id: string;
  name: string;
  kind: MachineKind;
  item: ItemId;
  powerDraw: number;
  radius?: number;
  workMinutes?: number;
  bufferPerItem?: number;
  outputBuffer?: number;
  capacity?: number;
  powerSupply?: number;
  /** generator: 'water' must sit next to the stream; 'wind' scales with weather */
  source?: 'water' | 'wind';
  /** sprinkler: needs power at dawn */
  needsPower?: boolean;
  /** belts */
  travelMinutes?: number;
  entryInterval?: number;
  mesh: string;
  description: string;
}

export interface RecipeInput {
  item?: ItemId;
  tag?: string;
  count: number;
}

export interface RecipeDef {
  id: string;
  /** machine id for crafter recipes, 'craft' for the crafting tab, 'cook' for the hearth */
  station: string;
  inputs: RecipeInput[];
  output: { item: ItemId; count: number };
  /** crafter recipes only */
  workMinutes?: number;
  /** recipe must be learned (in state.recipes) unless this is false */
  learned?: boolean;
  requiresReward?: string;
}

export type HairStyle = 'short' | 'bun' | 'long' | 'braids' | 'curly' | 'bald' | 'tuft';
export type Accessory = 'apron' | 'scarf' | 'glasses' | 'goggles' | 'rainhat' | 'cloak' | 'clipboard' | 'flatcap' | 'headscarf' | 'satchel' | 'strawhat';

/** Drives the procedural character mesh (render/meshes/characters.ts). Heights in metres. */
export interface Appearance {
  height: number;
  build: 'slim' | 'average' | 'broad' | 'round';
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  shoes: string;
  accessories: Accessory[];
  accent: string;
}
