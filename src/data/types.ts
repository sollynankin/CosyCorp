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
  /** known from the start when true; otherwise it must be learned (in state.recipes). Crafter recipes ignore this */
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

// ---- Villagers, dialogue and scenes (DESIGN.md §9) ---------------------------------------------------

/** Conditions shared by schedules, dialogue lines and scene triggers. Every listed condition must hold. */
export interface Conditions {
  season?: SeasonId[];
  weather?: WeatherId[];
  /** 0 = Mon */
  weekday?: number[];
  minHearts?: number;
  maxHearts?: number;
  flags?: string[];
  notFlags?: string[];
  map?: MapId;
  festival?: boolean;
  courting?: boolean;
  married?: boolean;
  /** first absolute day this can happen */
  minDay?: number;
}

export interface ScheduleStop {
  /** "HH:MM": when the villager sets off toward this stop */
  time: string;
  map: MapId;
  x: number;
  y: number;
  /** indoors: not drawn, not talkable */
  hidden?: boolean;
}

export interface ScheduleVariant {
  when?: Conditions;
  stops: ScheduleStop[];
}

export type GiftPref = 'loved' | 'liked' | 'neutral' | 'disliked';

export interface VillagerDef {
  id: string;
  name: string;
  /** one line for the journal */
  role: string;
  romanceable: boolean;
  birthday: { season: SeasonId; day: number };
  appearance: Appearance;
  /** item ids or `tag:<tag>` */
  loves: string[];
  likes: string[];
  dislikes: string[];
  giftLines: Record<GiftPref, string>;
  /** first matching variant wins: put specific variants first */
  schedule: ScheduleVariant[];
}

export interface DialogueLine {
  villager: string;
  text: string;
  when?: Conditions;
}

export interface SceneLine {
  /** villager id, 'you' or 'narrator' */
  who: string;
  text: string;
}

export interface SceneChoice {
  text: string;
  reply?: string;
  points?: number;
  flag?: string;
}

export interface SceneDef {
  id: string;
  /** heart events name their villager; story scenes may not */
  villager?: string;
  /** when it plays by itself on entering `map` (omit for scenes queued by quests) */
  trigger?: Conditions & { map: MapId; from?: string; to?: string };
  title: string;
  lines: SceneLine[];
  choices?: SceneChoice[];
  effects?: { flags?: string[]; points?: Record<string, number>; items?: { item: ItemId; n: number }[]; recipes?: string[] };
}

// ---- Quests (DESIGN.md §10) ------------------------------------------------------------------------

export type Objective =
  /** ship items since the quest became active (by item id or by category) */
  | { kind: 'ship'; item?: ItemId; category?: ItemCategory; count: number }
  /** hand items over at the Works Hall ('works') or to a villager */
  | { kind: 'deliver'; to: string; item?: ItemId; category?: ItemCategory; count: number }
  /** hand over this many different kinds of a category (one each) */
  | { kind: 'deliverKinds'; to: string; category: ItemCategory; kinds: number }
  | { kind: 'reachFloor'; floor: number }
  /** a story object picked up in the world */
  | { kind: 'pickup'; item: ItemId }
  /** a festival on or after activation has ended (attended or missed: dated beats never wait) */
  | { kind: 'attend'; festival: string }
  | { kind: 'scene'; scene: string }
  | { kind: 'hearts'; villager: string; hearts: number }
  /** farm power supply at least this much */
  | { kind: 'power'; supply: number }
  /** machines of a type placed on the farm */
  | { kind: 'own'; machine: string; count: number }
  | { kind: 'flag'; flag: string };

export interface QuestRewards {
  coins?: number;
  items?: { item: ItemId; n: number }[];
  /** craft_* recipe ids */
  blueprints?: string[];
  recipes?: string[];
  flags?: string[];
  removeFlags?: string[];
  points?: Record<string, number>;
  /** tool upgrades granted directly */
  tools?: Partial<Record<ToolId, number>>;
  /** scene queued on completion */
  scene?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  arc: 'main' | 'side';
  /** who it is about (journal portrait) */
  villager?: string;
  summary: string;
  requires: string[];
  /** flags that must be set (side arcs start from heart events) */
  requiresFlags?: string[];
  /** absolute day */
  earliest?: number;
  objectives: Objective[];
  /** on activation: flags set and a scene queued */
  onStart?: { flags?: string[]; scene?: string };
  rewards: QuestRewards;
}

export interface FestivalDef {
  id: string;
  name: string;
  season: SeasonId;
  day: number;
  /** "HH:MM" */
  start: string;
  end: string;
  blurb: string;
}
