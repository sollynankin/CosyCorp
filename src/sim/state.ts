// GameState: plain JSON only (CLAUDE.md rule 3). Derived data lives in context.ts.
import type { Dir, ItemId, MapId, Quality, SkillId, ToolId, WeatherId } from '../data/types';

export const SAVE_VERSION = 1;

export interface ItemStack {
  id: ItemId;
  q: Quality;
  n: number;
}
export type Slot = ItemStack | null;

export interface FishingState {
  /** 'wait' until the bite, then 'reel' (the catch mini-game) */
  phase: 'wait' | 'reel';
  /** ticks until a bite (wait) */
  biteIn: number;
  fish: ItemId;
  /** 0..1 positions on the catch bar (0 = bottom) */
  fishPos: number;
  fishVel: number;
  zonePos: number;
  zoneVel: number;
  /** catch meter 0..1 */
  progress: number;
  /** water tile cast into */
  tx: number;
  ty: number;
  /** festival derby tally counts this catch */
  derby: boolean;
  /** the reel button is held (set by the reel command) */
  holding: boolean;
  /** ticks until the fish picks a new target */
  retarget: number;
  fishTarget: number;
  /** rolled at the cast: length in cm, its place in the species' range (0..1) and the resulting difficulty */
  lenCm: number;
  size: number;
  difficulty: number;
  /** ticks spent reeling: the fish tires as this grows (see FISH_TIRE_TICKS) */
  reelTicks: number;
}

/** What you have caught of one species (the Fishing tab). */
export interface FishRecord {
  caught: number;
  bestCm: number;
  /** size class of the best catch */
  bestQ: Quality;
  /** catches by size class: normal, silver, gold */
  bySize: [number, number, number];
  /** day of the first catch */
  firstDay: number;
}

export interface PlayerState {
  map: MapId;
  x: number;
  y: number;
  facing: Dir;
  energy: number;
  maxEnergy: number;
  coins: number;
  inventory: Slot[];
  /** hotbar slot 0..HOTBAR_SLOTS-1 */
  selected: number;
  tools: Record<ToolId, number>;
  canWater: number;
  /** ticks left in the current tool swing (movement is locked) */
  swing: number;
  /** last tool swung, for animation */
  swingTool: ToolId | null;
  skillXp: Record<SkillId, number>;
  fishing: FishingState | null;
  /** walked this tick (render uses it for animation) */
  moving: boolean;
}

export interface CropState {
  id: string;
  /** days of growth so far (fractional in winter) */
  days: number;
  withered: boolean;
}

export interface SoilTile {
  watered: boolean;
  fertilized: boolean;
  crop: CropState | null;
}

export type WorldObject =
  | { kind: 'tree'; hp: number; stump: boolean; regrow: number; variant: number }
  | { kind: 'boulder'; hp: number }
  | { kind: 'stone'; hp: number }
  | { kind: 'weeds' }
  | { kind: 'twig' }
  | { kind: 'forage'; item: ItemId }
  | { kind: 'ore'; item: ItemId; hp: number }
  | { kind: 'ladder' }
  | { kind: 'story'; item: ItemId }
  | { kind: 'bunny'; hp: number }
  | { kind: 'orchard'; tree: string; age: number; fruit: number };

export interface MapState {
  /** per tile (row-major) dynamic object, or null */
  objects: (WorldObject | null)[];
}

export interface BeltItem {
  item: ItemId;
  q: Quality;
  age: number;
  /** side the item entered from, for drawing curves */
  from: Dir;
}

export type MachineStatus = 'working' | 'idle' | 'blocked' | 'unpowered';

export interface Entity {
  id: number;
  type: string;
  x: number;
  y: number;
  dir: Dir;
  /** belts and splitters */
  belt: BeltItem[];
  /** crafters: ingredient counts; planters: seed counts */
  input: Record<ItemId, number>;
  /** machine output buffer (harvesters, crafters) */
  output: ItemStack[];
  /** silos and chests */
  stored: ItemStack[];
  /** active crafter recipe */
  recipe: string | null;
  progress: number;
  /** step of the last accepted item (belt entry interval) */
  lastEntry: number;
  /** side last accepted from (merge round robin) */
  inRR: Dir;
  /** splitter output pointer */
  outRR: number;
  status: MachineStatus;
}

export interface FarmState {
  soil: (SoilTile | null)[];
  entities: Entity[];
  /** entity id per farm tile, -1 for none */
  entityAt: number[];
  nextEntityId: number;
  /** bumped whenever the layout changes; DayContext rebuilds when it differs */
  layoutRev: number;
  /** items in the shipping bin, sold overnight */
  shipping: ItemStack[];
}

export interface EntityDayStats {
  produced: number;
  moved: number;
  working: number;
  idle: number;
  blocked: number;
  unpowered: number;
}

export interface DayStats {
  coinsShipped: number;
  coinsChute: number;
  coinsOther: number;
  harvestedHand: number;
  harvestedMachine: number;
  crafted: number;
  spoiled: number;
  /** entity id -> stats */
  entities: Record<string, EntityDayStats>;
  /** item id -> count sold (shipping + chute) */
  sold: Record<ItemId, number>;
  levelUps: string[];
}

export interface DayReport {
  day: number;
  stats: DayStats;
  powerSupply: number;
  powerDemand: number;
  machines: number;
  score: number;
  uptime: number;
  /** entity id -> type, captured at report time so removed machines still show */
  entityTypes: Record<string, string>;
  goalsCompleted: string[];
  levelUps: string[];
  notes: string[];
}

export interface VillagerState {
  points: number;
  talkedToday: boolean;
  giftedToday: boolean;
  giftsThisWeek: number;
  /** romanceable only */
  courting: boolean;
  engaged: boolean;
  /** day the Promise Lantern was given, -1 if never */
  engagedDay: number;
  married: boolean;
}

export interface QuestProgress {
  id: string;
  /** objective index -> stored progress (deliveries) */
  progress: number[];
  /** objective index -> shipped count at activation (ship objectives count from here) */
  base: number[];
  /** objective index -> item kinds already handed over (deliverKinds) */
  kinds: string[][];
  /** day the quest became active */
  since: number;
}

export interface BoardRequest {
  id: string;
  villager: string;
  item: ItemId;
  count: number;
  reward: number;
  deadline: number;
  done: boolean;
}

export interface Animal {
  id: number;
  kind: 'chicken' | 'cow';
  name: string;
  friendship: number;
  fed: boolean;
  petted: boolean;
  ageDays: number;
}

export interface SceneQueueEntry {
  id: string;
}

export interface FestivalState {
  id: string;
  /** minute the festival started (for timed activities) */
  startMinute: number;
  score: number;
  /** spring pod hunt: collected pod indices */
  pods: number[];
  /** autumn: exhibited item */
  exhibit: ItemStack | null;
  done: boolean;
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  /** absolute day, 0 = Spring 1, Year 1 */
  day: number;
  /** minutes since 06:00 */
  minute: number;
  /** tick within the current minute (0..TICKS_PER_MINUTE-1) */
  subTick: number;
  /** factory steps run today (== minutes simulated for machines) */
  step: number;
  weather: WeatherId;
  tomorrowWeather: WeatherId;
  player: PlayerState;
  farm: FarmState;
  maps: Record<MapId, MapState>;
  /** per species records of what you have caught: counts and the longest fish */
  fishLog: Record<ItemId, FishRecord>;
  /** deepest mine floor reached (lift unlocks at 5 and 10) */
  mineDeepest: number;
  /** rocks broken on the current mine floor since entering (ladder reveal) */
  mineBroken: number;
  /** hay in the coop and barn feeders */
  feeders: { coop: number; barn: number };
  animals: Animal[];
  nextAnimalId: number;
  /** items that did not fit in the backpack, waiting in the farmhouse box */
  overflow: ItemStack[];
  /** animal products waiting in the coop/barn box */
  animalBox: ItemStack[];
  villagers: Record<string, VillagerState>;
  /** story, world and reward flags */
  flags: string[];
  /** learned recipes (craft_*, cook_*, machine recipes) */
  recipes: string[];
  rewards: string[];
  quests: { active: QuestProgress[]; done: string[] };
  board: BoardRequest[];
  /** scenes already played */
  seenScenes: string[];
  /** scenes waiting to play (UI pops them) */
  sceneQueue: SceneQueueEntry[];
  festival: FestivalState | null;
  /** items shipped ever, by id (quests count from activation using snapshots) */
  shippedTotal: Record<ItemId, number>;
  today: DayStats;
  /** season-to-date stats for stretch goals */
  season: { coins: number; spoiled: number; crafted: number };
  report: DayReport | null;
  /** set when the day ended by passing out */
  passedOut: boolean;
}
