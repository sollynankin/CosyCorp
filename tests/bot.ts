// A scripted "reasonable player" for the balance pass (tests/balance.test.ts).
//
// It plays through the real sim API: tools swing at tiles and cost energy, seeds and ore are bought at real
// shops during real opening hours, machines are crafted from real recipes and placed under the real placement
// rules, quests are handed in at the Works Hall. The only shortcuts are teleports (walking is charged as clock
// time instead of simulated tile by tile) and ending the day directly. It follows the obvious plan a new player
// would: farm what pays in season, expand the field as energy and coins allow, upgrade tools, build the
// machines each beat unlocks, dig for what the quests ask for, hand things in, and ship everything else.
//
// It does NOT cook, fish, keep animals, forage, enter festivals or touch the side arcs, so it is a floor for
// what a real player earns, and a stable yardstick: if a balance edit moves the numbers, the edit mattered.
import {
  DAY_MINUTES,
  DAYS_PER_SEASON,
  PLAYER_SPEED,
  TICKS_PER_MINUTE,
  TOOL_AREA,
  TOOL_ENERGY,
  TOOL_SWING_TICKS,
  TOOL_TIER_ENERGY_MULT,
  TOOL_UPGRADE_COST,
  CROP_BALANCE,
  ITEM_VALUE,
} from '../src/data/balance';
import { CROPS, getCrop, getItem, getRecipe } from '../src/data';
import { SHOPS } from '../src/data/shops';
import type { Dir, ToolId } from '../src/data/types';
import {
  applyCommand,
  countItem,
  endDay,
  ensureContext,
  finishScene,
  giveGift,
  isBlocked,
  isRipe,
  knowsRecipe,
  minuteOfClock,
  objectiveProgress,
  questDef,
  seasonOf,
  step,
  talkTo,
  warpTo,
  type GameState,
} from '../src/sim';
import { isFestivalDay } from '../src/sim/festivalDays';
import { isShopOpen } from '../src/sim/shop';
import { mineFloorNumber, parseMap } from '../src/world';
import { farmIdx, soilAt } from '../src/sim/farming';
import { sandbox, selectItem, stand, type Sandbox } from './helpers';

// ---- Layout ------------------------------------------------------------------------------------------
// Two automated cells beside the stream (harvester in the middle of a 5×5 block, its chute in front, four
// sprinklers around), a Water Wheel touching the stream, and a plain field of sprinkler-lattice east of them.
interface Spot {
  item: string;
  x: number;
  y: number;
  dir: Dir;
  /** extra condition (a second Water Wheel only when a power objective needs it) */
  when?: (b: Bot) => boolean;
}

const CELLS = [
  { cx: 7, cy: 12 },
  { cx: 7, cy: 17 },
];
const WHEELS: [number, number][] = [
  [4, 14],
  [4, 20],
];
const FIELD = { x0: 10, y0: 10, x1: 39, y1: 21 };
const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'];
/** A day's gathering takes at most this much energy, unless the story needs a deep dive (then it takes the day). */
const GATHER_BUDGET = 45;
/** Below this many coins the bot sows whatever returns its seed money fastest. */
const POOR_BELOW = 1200;
/** Share of the purse that may go on seeds in one visit. */
const SEED_SHARE = 0.9;
/** Coins kept back when buying materials, so there is always something for seeds. */
const SEED_FLOOR = 60;
const MOVE_TICKS_PER_TILE = 1 / PLAYER_SPEED;

function buildQueue(): Spot[] {
  const q: Spot[] = [{ item: 'water_wheel', x: WHEELS[0][0], y: WHEELS[0][1], dir: 1 }];
  for (const { cx, cy } of CELLS) {
    q.push({ item: 'market_chute', x: cx + 1, y: cy, dir: 1 }, { item: 'harvester', x: cx, y: cy, dir: 1 });
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) q.push({ item: 'sprinkler', x: cx + dx, y: cy + dy, dir: 0 });
  }
  q.push({ item: 'water_wheel', x: WHEELS[1][0], y: WHEELS[1][1], dir: 1, when: (b) => b.powerShort() });
  for (let y = FIELD.y0 + 1; y <= FIELD.y1; y += 3) for (let x = FIELD.x0 + 1; x <= FIELD.x1; x += 3) q.push({ item: 'sprinkler', x, y, dir: 0 });
  return q;
}

/** Crop tiles in the order they get dug and sown: cell 1, cell 2, then the field row by row. */
function buildPlots(queue: Spot[]): [number, number][] {
  const taken = new Set(queue.map((s) => `${s.x},${s.y}`));
  const out: [number, number][] = [];
  const add = (x: number, y: number) => {
    if (!taken.has(`${x},${y}`)) out.push([x, y]);
  };
  for (const { cx, cy } of CELLS) for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) add(x, y);
  for (let y = FIELD.y0; y <= FIELD.y1; y++) for (let x = FIELD.x0; x <= FIELD.x1; x++) add(x, y);
  return out;
}

const SHOP_OF: Record<string, string> = { stone: 'smithy', coal: 'smithy', copper_ore: 'smithy', iron_ore: 'smithy', wood: 'joinery', fertilizer: 'almanac', hay: 'almanac' };
for (const c of CROPS) SHOP_OF[c.seedItem] = 'almanac';

export interface SeasonRow {
  /** 0-based season counter (0 = Spring Y1) */
  index: number;
  name: string;
  /** coins earned (shipping, chutes, board and quests) */
  coins: number;
  /** coins at the end of the season, in hand */
  purse: number;
  /** of `coins`, what the quest board paid */
  board: number;
  /** tiles with a crop on the last day */
  crops: number;
}

export interface BotResult {
  seasons: SeasonRow[];
  /** absolute day each quest completed */
  questDay: Record<string, number>;
  /** absolute day each tool tier / machine first appeared */
  milestones: Record<string, number>;
  /** board coins earned over the run */
  boardCoins: number;
  coinsEarned: number;
  log: string[];
}

export class Bot {
  readonly sb: Sandbox;
  readonly queue = buildQueue();
  readonly plots = buildPlots(this.queue);
  readonly result: BotResult = { seasons: [], questDay: {}, milestones: {}, boardCoins: 0, coinsEarned: 0, log: [] };
  private seasonCoins = 0;
  private boardCoins = 0;
  private lastEarned = 0;
  private boardAtSeasonStart = 0;
  /** where the player stands, for charging walking time */
  private at = { x: 9.5, y: 7.5 };
  /** items short for the build or the quests, filled by acquire() each day */
  private shortage: Record<string, number> = {};
  private lastTownDay = -9;
  /** items set aside for the next tool upgrade; crafting leaves them alone */
  private held: Record<string, number> = {};
  /** what happened today, for the log */
  private notes: string[] = [];
  /** energy level at which today's gathering stops (set when the trip starts) */
  private gatherStop = 0;
  private tilled = 0;
  private sown = 0;
  private seedSpend = 0;

  constructor(seed: number) {
    this.sb = sandbox(seed);
  }

  get s(): GameState {
    return this.sb.s;
  }
  private get ctx() {
    return this.sb.ctx;
  }

  // ---- Clock and actions ---------------------------------------------------------------------------
  private tick(n: number): void {
    for (let k = 0; k < n && this.s.minute < DAY_MINUTES - 25; k++) step(this.s, this.ctx);
  }
  private minutes(m: number): void {
    this.tick(Math.round(m * TICKS_PER_MINUTE));
  }
  private timeLeft(): number {
    return DAY_MINUTES - 25 - this.s.minute;
  }
  private walkTo(x: number, y: number): void {
    const d = Math.hypot(x - this.at.x, y - this.at.y);
    this.tick(Math.ceil(d * MOVE_TICKS_PER_TILE));
    this.at = { x, y };
  }
  private cmd(c: Parameters<typeof applyCommand>[2]) {
    ensureContext(this.s, this.ctx);
    const r = step(this.s, this.ctx, [c]).results[0];
    this.tick(TOOL_SWING_TICKS);
    return r;
  }
  private toolCost(tool: ToolId): number {
    return TOOL_ENERGY[tool as keyof typeof TOOL_ENERGY] * TOOL_TIER_ENERGY_MULT[this.s.player.tools[tool]];
  }
  private canSwing(tool: ToolId): boolean {
    return this.s.player.energy >= this.toolCost(tool) + 0.6 && this.timeLeft() > 2;
  }
  /** Stands next to (tx, ty), on the side given by dir (the tile the player comes from), and uses the item. */
  private use(tool: string, tx: number, ty: number, from: Dir = 3, mapId = 'farm') {
    selectItem(this.s, tool);
    const [sx, sy] = this.standFor(tx, ty, from, mapId);
    this.walkTo(sx + 0.5, sy + 0.5);
    stand(this.s, sx, sy, 2, mapId);
    return this.cmd({ type: 'use', x: tx, y: ty });
  }
  /** A free tile beside (tx, ty): preferred side first (0 N, 1 E, 2 S, 3 W of the target), then the others. */
  private standFor(tx: number, ty: number, prefer: Dir, mapId: string): [number, number] {
    const off: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (let k = 0; k < 4; k++) {
      const [ox, oy] = off[(prefer + k) % 4];
      if (!isBlocked(this.s, mapId, tx + ox, ty + oy)) return [tx + ox, ty + oy];
    }
    return [tx, ty];
  }

  // ---- The day ---------------------------------------------------------------------------------------
  playDays(days: number): BotResult {
    for (let d = 0; d < days; d++) this.playDay();
    return this.finish();
  }

  private playDay(): void {
    const s = this.s;
    const day = s.day;
    this.drainScenes();
    this.at = { x: s.player.x, y: s.player.y };
    this.acquireNeeds();
    this.buildMachines();
    this.harvest();
    this.waterAll(this.gatherReserve());
    // The shops open at 09:00, so the trip comes after the morning's work.
    if (this.wantsTown()) {
      this.townTrip();
      this.acquireNeeds();
      this.buildMachines();
    }
    this.sowEmpty();
    this.acquireNeeds();
    if (this.wantsGather()) this.gather();
    this.expand();
    // Out of seeds with energy and coins to spare: a second trip beats an idle afternoon.
    if (this.haveSeeds() < 1 && this.s.player.energy > 25 && this.s.player.coins > 100 && this.timeLeft() > 200 && !isFestivalDay(s.day) && this.plots.some(([x, y]) => !this.plotSoil(x, y))) {
      this.townTrip();
      this.expand();
    }
    this.shipAll();
    this.noteQuests(day);
    const soil = s.farm.soil.filter((x) => x).length;
    const crops = s.farm.soil.filter((x) => x?.crop).length;
    const line = `d${day} ${seasonOf(day)} ${['M', 'T', 'W', 'T', 'F', 'S', 'S'][day % 7]} coins ${Math.round(s.player.coins)} soil ${soil} crops ${crops} energy ${Math.round(s.player.energy)} min ${s.minute} ents ${s.farm.entities.length} tools ${Object.values(s.player.tools).join('')} short ${JSON.stringify(this.shortage)} till${this.tilled} sow${this.sown} seedcost${this.seedSpend} [${this.notes.join(' ')}]`;
    this.notes = [];
    this.tilled = this.sown = this.seedSpend = 0;
    this.result.log.push(line);
    endDay(s, this.ctx, false);
    this.recordDay(day);
    this.result.log[this.result.log.length - 1] += ` +${Math.round(this.lastEarned)}`;
    this.drainScenes();
  }

  /** Books yesterday's earnings into the season tally. */
  private recordDay(day: number): void {
    const st = this.s.report!.stats;
    const earned = st.coinsShipped + st.coinsChute + st.coinsOther;
    this.lastEarned = earned;
    this.seasonCoins += earned;
    this.result.coinsEarned += earned;
    if ((day + 1) % DAYS_PER_SEASON === 0) {
      const index = Math.floor(day / DAYS_PER_SEASON);
      const crops = this.s.farm.soil.filter((x) => x?.crop).length;
      this.result.seasons.push({ index, name: SEASON_NAMES[index % 4], coins: this.seasonCoins, purse: this.s.player.coins, board: this.boardCoins - this.boardAtSeasonStart, crops });
      this.seasonCoins = 0;
      this.boardAtSeasonStart = this.boardCoins;
    }
  }

  private noteQuests(day: number): void {
    for (const id of this.s.quests.done) if (!(id in this.result.questDay)) this.result.questDay[id] = day;
  }

  private drainScenes(): void {
    for (let g = 0; g < 30 && this.s.sceneQueue.length; g++) finishScene(this.s, this.ctx, this.s.sceneQueue[0].id, 0);
    this.noteQuests(this.s.day);
  }

  private finish(): BotResult {
    this.result.boardCoins = this.boardCoins;
    return this.result;
  }

  // ---- Farming ---------------------------------------------------------------------------------------
  private plotSoil(x: number, y: number) {
    return soilAt(this.s, x, y);
  }

  /** A harvester only counts once something stands in front of it to take what it picks and it has power. */
  private harvesterWorks(e: { id: number; x: number; y: number; dir: Dir }): boolean {
    const front = this.s.farm.entities.find((o) => o.x === e.x + [0, 1, 0, -1][e.dir] && o.y === e.y + [-1, 0, 1, 0][e.dir]);
    return !!front && front.type === 'market_chute' && (this.ctx.power.entityFactor[e.id] ?? 0) > 0;
  }
  /** Crops a working harvester already looks after are skipped by hand. */
  private harvesterCovers(x: number, y: number): boolean {
    return this.s.farm.entities.some((e) => e.type === 'harvester' && Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) <= 2 && this.harvesterWorks(e));
  }
  private sprinklerCovers(x: number, y: number): boolean {
    return this.s.farm.entities.some((e) => (e.type === 'sprinkler' || e.type === 'pump_sprinkler') && Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) <= (e.type === 'sprinkler' ? 1 : 2));
  }

  /** Expected net coins for one tile over the days a crop can live from `day`, or -Infinity if it can't be sown. */
  private cropScore(cropId: string, day: number): number {
    const crop = getCrop(cropId);
    const bal = CROP_BALANCE[cropId];
    const price = ITEM_VALUE[crop.harvestItem] ?? 0;
    // Days until the first season the crop cannot survive.
    let horizon = 0;
    while (horizon < 60 && (crop.seasons.includes(seasonOf(day + horizon)) || (seasonOf(day + horizon) === 'winter' && crop.hardy))) horizon++;
    const rate = seasonOf(day) === 'winter' ? 0.5 : 1;
    const grow = bal.growthDays / rate;
    if (horizon < grow + 1) return -Infinity;
    const regrow = bal.regrowDays ? bal.regrowDays / rate : 0;
    const harvests = regrow ? 1 + Math.floor((horizon - grow) / regrow) : Math.floor(horizon / grow);
    const seeds = regrow ? 1 : harvests;
    return harvests * price * bal.harvestCount - seeds * bal.seedPrice;
  }

  /** Net coins per coin of seed per day: what matters while seed money is the limit. */
  private cropRoi(cropId: string, day: number): number {
    const net = this.cropScore(cropId, day);
    if (net === -Infinity) return -Infinity;
    const bal = CROP_BALANCE[cropId];
    const cycles = bal.regrowDays ? 1 : Math.max(1, Math.floor(net / Math.max(1, ITEM_VALUE[getCrop(cropId).harvestItem] * bal.harvestCount - bal.seedPrice)));
    return net / (bal.seedPrice * cycles * (bal.growthDays + 1));
  }

  /** Seed items worth sowing today, best first. */
  private rankedSeeds(day: number, have: boolean): string[] {
    // Short of coins, the fastest return on a seed wins; with money to spare, the most per tile.
    const poor = this.s.player.coins < POOR_BELOW;
    const scored: [string, number][] = [];
    for (const c of CROPS) {
      if (have && countItem(this.s.player.inventory, c.seedItem) === 0) continue;
      if (c.id === 'honeypear') continue;
      const score = poor ? this.cropRoi(c.id, day) : this.cropScore(c.id, day) / (CROP_BALANCE[c.id].growthDays + 2);
      if (score > 0) scored.push([c.seedItem, score]);
    }
    scored.sort((p, q) => q[1] - p[1]);
    // A sensible farmer doesn't plant one crop everywhere: a runner-up within reach of the best takes a third of the tiles.
    const top = scored[0]?.[1] ?? 0;
    return scored.filter(([, sc], i) => i < 2 && sc >= top * 0.6).map(([id]) => id);
  }

  /** Which of the ranked seeds goes on tile (x, y): every third tile takes the runner-up. */
  private seedFor(ranked: string[], x: number, y: number): string | null {
    if (ranked.length === 0) return null;
    return ranked.length > 1 && (x * 7 + y * 3) % 3 === 0 ? ranked[1] : ranked[0];
  }

  private harvest(): void {
    // The scythe is free, so only time limits it.
    for (const [x, y] of this.plots) {
      const soil = this.plotSoil(x, y);
      if (!soil?.crop) continue;
      if (!(soil.crop.withered || (isRipe(soil.crop) && !this.harvesterCovers(x, y)))) continue;
      if (this.timeLeft() < 5) break;
      this.use('scythe', x, y, 3);
    }
  }

  private sowEmpty(): void {
    for (const [x, y] of this.plots) {
      const soil = this.plotSoil(x, y);
      if (!soil || soil.crop) continue;
      if (!this.sow(x, y)) break;
    }
  }

  private sow(x: number, y: number): boolean {
    const ranked = this.rankedSeeds(this.s.day, true);
    // Fall back to the other crop when the wanted seed has run out.
    const wanted = this.seedFor(this.rankedSeeds(this.s.day, false), x, y);
    const seed = wanted && ranked.includes(wanted) ? wanted : ranked[0];
    if (!seed || this.timeLeft() < 3) return false;
    const r = this.use(seed, x, y, 3);
    if (r.ok) this.sown++;
    return r.ok;
  }

  private waterAll(floor = 0): void {
    const s = this.s;
    if (s.weather === 'rain' || s.weather === 'storm') return;
    for (const [x, y] of this.plots) {
      const soil = this.plotSoil(x, y);
      if (!soil?.crop || soil.watered || soil.crop.withered) continue;
      if (this.sprinklerCovers(x, y)) continue;
      if (s.player.energy < floor + this.toolCost('can')) return;
      if (!this.ensureCan()) return;
      if (!this.canSwing('can')) return;
      // Water in a row: one swing covers TOOL_AREA tiles east of the target.
      this.use('can', x, y, 3);
    }
  }

  private ensureCan(): boolean {
    const p = this.s.player;
    if (p.canWater > 0) return true;
    if (!this.canSwing('can')) return false;
    // The stream runs down x = 2..3.
    this.use('can', 3, Math.round(this.at.y), 1);
    return p.canWater > 0;
  }

  private dugRoom(): number {
    return TOOL_AREA[this.s.player.tools.hoe];
  }

  /** Digs and sows new plots while energy lasts (keeping what the day's other jobs need). */
  private expand(): void {
    const s = this.s;
    for (const [x, y] of this.plots) {
      if (this.plotSoil(x, y)) continue;
      if (this.timeLeft() < 8 || this.haveSeeds() < 1) return;
      if (s.player.energy < this.toolCost('hoe') + this.toolCost('can') + 1) return;
      if (!this.clearTile(x, y)) continue;
      const r = this.use('hoe', x, y, 3);
      if (!r.ok) continue;
      this.tilled++;
      // The hoe may have dug a short row east of the target; sowing handles whatever soil exists.
      if (this.sow(x, y) && !this.sprinklerCovers(x, y) && s.weather !== 'rain' && s.weather !== 'storm') {
        if (this.ensureCan() && this.canSwing('can')) this.use('can', x, y, 3);
      }
      // Sow any extra soil the hoe's area produced (and water it too).
      for (let k = 1; k < this.dugRoom(); k++) {
        const sx = x + k;
        const soil = this.plotSoil(sx, y);
        if (soil && !soil.crop && this.plots.some(([px, py]) => px === sx && py === y)) this.sow(sx, y);
      }
    }
  }

  /** Cuts weeds and breaks twigs and small stones; trees and boulders are left alone (not worth the energy here). */
  private clearTile(x: number, y: number): boolean {
    const o = this.s.maps.farm.objects[farmIdx(x, y)];
    if (!o) return true;
    if (o.kind === 'weeds') return this.use('scythe', x, y, 3).ok;
    if (o.kind === 'twig') return this.canSwing('axe') && this.use('axe', x, y, 3).ok;
    if (o.kind === 'stone') {
      if (!this.canSwing('pickaxe')) return false;
      this.use('pickaxe', x, y, 3);
      return !this.s.maps.farm.objects[farmIdx(x, y)];
    }
    return false;
  }

  /** Energy the morning's watering leaves for gathering when something is short. */
  private gatherReserve(): number {
    return this.wantsGather() ? 50 : 0;
  }

  // ---- What we need ------------------------------------------------------------------------------------
  powerShort(): boolean {
    return this.s.quests.active.some((qp) => questDef(qp.id).objectives.some((o, i) => o.kind === 'power' && objectiveProgress(this.s, qp, i, () => this.ctx.power.supply)[0] < o.supply));
  }

  /** Gets `n` of an item into the backpack by crafting if it can; records the raw shortfall otherwise. */
  private acquire(item: string, n: number, depth = 0): boolean {
    const inv = this.s.player.inventory;
    const have = countItem(inv, item) - (this.held[item] ?? 0);
    if (have >= n) return true;
    const rid = `craft_${item}`;
    let known = false;
    try {
      known = knowsRecipe(this.s, getRecipe(rid));
    } catch {
      known = false;
    }
    if (known && depth < 3) {
      const r = getRecipe(rid);
      const times = Math.ceil((n - have) / r.output.count);
      let ok = true;
      for (const input of r.inputs) if (input.item && !this.acquire(input.item, input.count * times, depth + 1)) ok = false;
      if (ok) {
        const res = this.cmd({ type: 'craft', recipe: rid, n: times });
        return res.ok && countItem(this.s.player.inventory, item) >= n;
      }
      return false;
    }
    this.shortage[item] = Math.max(this.shortage[item] ?? 0, n - have);
    return false;
  }

  private carried(item: string): number {
    return countItem(this.s.player.inventory, item);
  }

  /** Everything the main story and the build ask for right now. Crafts what it can, records what is short. */
  private acquireNeeds(): void {
    this.shortage = {};
    this.held = {};
    // The next tool upgrade comes first: its ore is set aside before machines can use it.
    const next = this.nextUpgrade();
    if (next) {
      const cost = TOOL_UPGRADE_COST[this.s.player.tools[next] + 1];
      // Ore is only worth chasing once the coins for the upgrade are nearly there.
      if (cost.count > 0 && this.s.player.coins >= cost.coins) {
        this.held[cost.item] = cost.count;
        if (this.carried(cost.item) < cost.count) this.shortage[cost.item] = cost.count - this.carried(cost.item);
      }
    }
    // Main-arc deliveries.
    for (const qp of this.s.quests.active) {
      const q = questDef(qp.id);
      if (q.arc !== 'main') continue;
      q.objectives.forEach((o, i) => {
        if (o.kind !== 'deliver' || o.to !== 'works' || !o.item) return;
        const left = o.count - (qp.progress[i] ?? 0);
        if (left > 0) this.acquire(o.item, left);
      });
    }
    // The next few machines in the queue.
    let batch = 0;
    for (const spot of this.queue) {
      if (this.placed(spot) || (spot.when && !spot.when(this)) || batch >= 4) continue;
      if (!this.obtainable(spot.item)) continue;
      this.acquire(spot.item, Math.min(4, this.remaining(spot.item)));
      batch++;
    }
  }

  private obtainable(item: string): boolean {
    if (this.carried(item) > 0) return true;
    try {
      return knowsRecipe(this.s, getRecipe(`craft_${item}`));
    } catch {
      return false;
    }
  }

  private remaining(item: string): number {
    return this.queue.filter((q) => q.item === item && !this.placed(q) && (!q.when || q.when(this))).length;
  }

  private placed(spot: Spot): boolean {
    return this.s.farm.entities.some((e) => e.x === spot.x && e.y === spot.y && e.type === getItem(spot.item).places);
  }

  /** Tools are upgraded evenly, hoe and can first; the pickaxe jumps the queue once the story sends us digging. */
  private nextUpgrade(): ToolId | null {
    const tools = this.s.player.tools;
    if (this.needsDeeperMine() && tools.pickaxe < 1) return 'pickaxe';
    const lowest = Math.min(tools.hoe, tools.can, tools.pickaxe, tools.axe);
    if (lowest >= 2) return null;
    return (['hoe', 'can', 'pickaxe', 'axe'] as ToolId[]).find((t) => tools[t] === lowest) ?? null;
  }

  // ---- Building ----------------------------------------------------------------------------------------
  private buildMachines(): void {
    for (const spot of this.queue) {
      if (this.placed(spot) || (spot.when && !spot.when(this))) continue;
      if (this.carried(spot.item) < 1) continue;
      if (this.timeLeft() < 10) return;
      if (!this.clearTile(spot.x, spot.y)) continue;
      const [sx, sy] = this.standFor(spot.x, spot.y, 3, 'farm');
      this.walkTo(sx + 0.5, sy + 0.5);
      stand(this.s, sx, sy, 1, 'farm');
      const r = this.cmd({ type: 'place', item: spot.item, x: spot.x, y: spot.y, dir: spot.dir });
      if (r.ok && !(spot.item in this.result.milestones)) this.result.milestones[spot.item] = this.s.day;
    }
  }

  // ---- Gathering ---------------------------------------------------------------------------------------
  private affordable(item: string, n: number): boolean {
    const price = Math.round((ITEM_VALUE[item] ?? 10) * 2.5);
    return this.s.player.coins - SEED_FLOOR >= price * n * 1.1;
  }

  private mustGather(): [string, number][] {
    return Object.entries(this.shortage).filter(([item, n]) => !(item in SHOP_OF) || !this.affordable(item, n));
  }

  private wantsGather(): boolean {
    return (this.mustGather().length > 0 || this.needsDeeperMine()) && this.s.player.energy > 12 && this.timeLeft() > 120;
  }

  private gather(): void {
    const need = Object.fromEntries(this.mustGather());
    const mineItems = ['copper_ore', 'iron_ore', 'coal', 'quartz'];
    const wantsMine = mineItems.some((i) => need[i]) || this.needsDeeperMine();
    // Wood and fibre/stones on the farm first (cheap and close), the mine for ore.
    if (need.wood) this.chopTrees(need.wood);
    if (need.stone && !wantsMine) this.breakFarmRocks(need.stone);
    if (need.fiber) this.cutWeeds(need.fiber);
    if (wantsMine && this.s.player.energy > 25 && this.timeLeft() > 150) this.mineTrip(need);
  }

  private needsDeeperMine(): boolean {
    if (this.s.player.tools.pickaxe < 1) return false;
    return this.s.quests.active.some((qp) => questDef(qp.id).objectives.some((o, i) => (o.kind === 'reachFloor' || o.kind === 'pickup') && objectiveProgress(this.s, qp, i, () => 0)[0] < objectiveProgress(this.s, qp, i, () => 0)[1]) && questDef(qp.id).arc === 'main');
  }

  private chopTrees(n: number): void {
    const objs = this.s.maps.farm.objects;
    const m = parseMap('farm');
    const trees: number[] = [];
    for (let i = 0; i < objs.length; i++) if (objs[i]?.kind === 'tree') trees.push(i);
    for (const i of trees) {
      if (this.carried('wood') >= n || !this.canSwing('axe')) return;
      const x = i % m.w;
      const y = Math.floor(i / m.w);
      for (let g = 0; g < 14 && objs[i] && this.canSwing('axe'); g++) this.use('axe', x, y, 2);
    }
  }

  private breakFarmRocks(n: number): void {
    const objs = this.s.maps.farm.objects;
    const m = parseMap('farm');
    const rocks: number[] = [];
    for (let i = 0; i < objs.length; i++) if (objs[i]?.kind === 'boulder' || objs[i]?.kind === 'stone') rocks.push(i);
    // Boulders first: eight stone for six swings.
    rocks.sort((a, b) => Number(objs[b]?.kind === 'boulder') - Number(objs[a]?.kind === 'boulder') || a - b);
    for (const i of rocks) {
      if (this.carried('stone') >= n || !this.canSwing('pickaxe')) return;
      const x = i % m.w;
      const y = Math.floor(i / m.w);
      for (let g = 0; g < 8 && objs[i] && this.canSwing('pickaxe'); g++) this.use('pickaxe', x, y, 2);
    }
  }

  private cutWeeds(n: number): void {
    const objs = this.s.maps.farm.objects;
    const m = parseMap('farm');
    for (let i = 0; i < objs.length && this.carried('fiber') < n; i++) {
      if (objs[i]?.kind !== 'weeds') continue;
      if (this.timeLeft() < 20) return;
      this.use('scythe', i % m.w, Math.floor(i / m.w), 2);
    }
  }

  /** The lowest floor whose ore table has the item. */
  private floorFor(item: string): number {
    return ({ copper_ore: 1, coal: 1, quartz: 3, iron_ore: 5 } as Record<string, number>)[item] ?? 1;
  }

  private mineTrip(need: Record<string, number>): void {
    const s = this.s;
    let goal = Math.max(1, ...Object.keys(need).map((i) => this.floorFor(i)));
    if (this.needsDeeperMine()) goal = Math.max(goal, 5);
    this.gatherStop = this.needsDeeperMine() || goal >= 3 ? 6 : Math.max(6, s.player.energy - GATHER_BUDGET);
    this.notes.push(`mine>${goal}(${Math.round(s.player.energy)}e)`);
    this.minutes(35);
    warpTo(s, this.ctx, 'mine1', 10, 2, 2);
    this.at = { x: 10.5, y: 2.5 };
    let floor = 1;
    // The lift takes us to the deepest stop we have already reached.
    if (goal >= 5 && s.mineDeepest >= 5) {
      this.cmd({ type: 'lift', floor: 5 });
      floor = mineFloorNumber(s.player.map);
    }
    const base: Record<string, number> = {};
    for (const item of Object.keys(need)) base[item] = this.carried(item);
    const done = () => Object.entries(need).every(([item, n]) => this.carried(item) - base[item] >= n);
    for (let guard = 0; guard < 40; guard++) {
      floor = mineFloorNumber(s.player.map);
      if (floor === 0) break;
      const descend = floor < goal || this.needsDeeperMine() && floor < 5;
      this.workFloor(descend, descend ? () => false : done);
      if (s.player.energy < 5 || this.timeLeft() < 40) break;
      this.pickStory(floor);
      if (!descend && done()) break;
      // On to the next floor when there is a ladder.
      if (!this.climb()) break;
    }
    this.notes.push(`floor${mineFloorNumber(s.player.map)} e${Math.round(s.player.energy)}`);
    warpTo(s, this.ctx, 'farm', 9, 7, 2);
    this.at = { x: 9.5, y: 7.5 };
    this.minutes(25);
  }

  /** Breaks rocks nearest-first; stops early once the ladder shows if we want to go deeper. */
  private workFloor(descend: boolean, enough: () => boolean): void {
    const s = this.s;
    const map = s.player.map;
    const m = parseMap(map);
    const objs = s.maps[map].objects;
    for (let guard = 0; guard < 80; guard++) {
      if (!this.canSwing('pickaxe') || enough() || this.s.player.energy < this.gatherStop) return;
      if (descend && objs.some((o) => o?.kind === 'ladder')) return;
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < objs.length; i++) {
        const k = objs[i]?.kind;
        if (k !== 'stone' && k !== 'ore') continue;
        const d = Math.hypot((i % m.w) + 0.5 - this.at.x, Math.floor(i / m.w) + 0.5 - this.at.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) return;
      const x = best % m.w;
      const y = Math.floor(best / m.w);
      for (let g = 0; g < 6 && objs[best] && this.canSwing('pickaxe'); g++) this.use('pickaxe', x, y, 0, map);
    }
  }

  /** Picks up a story object (the logbook) waiting on this floor. */
  private pickStory(floor: number): boolean {
    const s = this.s;
    const map = s.player.map;
    const m = parseMap(map);
    const objs = s.maps[map].objects;
    const i = objs.findIndex((o) => o?.kind === 'story');
    if (i >= 0 && floor <= 5) {
      const [sx, sy] = this.standFor(i % m.w, Math.floor(i / m.w), 0, map);
      this.walkTo(sx + 0.5, sy + 0.5);
      stand(s, sx, sy, 2, map);
      this.cmd({ type: 'interact', x: i % m.w, y: Math.floor(i / m.w) });
    }
    return true;
  }

  private climb(): boolean {
    const s = this.s;
    const map = s.player.map;
    const m = parseMap(map);
    const i = s.maps[map].objects.findIndex((o) => o?.kind === 'ladder');
    if (i < 0) return false;
    const [sx, sy] = this.standFor(i % m.w, Math.floor(i / m.w), 0, map);
    this.walkTo(sx + 0.5, sy + 0.5);
    stand(s, sx, sy, 2, map);
    const before = s.player.map;
    this.cmd({ type: 'interact', x: i % m.w, y: Math.floor(i / m.w) });
    this.at = { x: s.player.x, y: s.player.y };
    return s.player.map !== before;
  }

  // ---- Town ----------------------------------------------------------------------------------------------
  private buyList(): [string, number][] {
    const out: [string, number][] = [];
    for (const [item, n] of Object.entries(this.shortage)) if (item in SHOP_OF && this.affordable(item, n)) out.push([item, n]);
    return out;
  }

  /** Seeds worth carrying: the soil that will be empty, plus the new ground there is energy to dig. */
  private seedsWanted(): number {
    const s = this.s;
    const next = seasonOf(s.day + 1);
    let unsoiled = 0;
    let empty = 0;
    let soon = 0;
    for (const [x, y] of this.plots) {
      const soil = this.plotSoil(x, y);
      if (!soil) unsoiled++;
      else if (!soil.crop || soil.crop.withered || !getCrop(soil.crop.id).seasons.includes(next)) empty++;
      else if (!CROP_BALANCE[soil.crop.id].regrowDays && soil.crop.days >= CROP_BALANCE[soil.crop.id].growthDays - 3) soon++;
    }
    return empty + soon + Math.min(unsoiled, 25 * (1 + 2 * s.player.tools.hoe));
  }

  private haveSeeds(): number {
    return this.s.player.inventory.reduce((a, st) => a + (st && getItem(st.id).category === 'seed' ? st.n : 0), 0);
  }

  private doneCoins(): boolean {
    return this.s.player.coins > 40;
  }

  private wantsTown(): boolean {
    const s = this.s;
    if (isFestivalDay(s.day) || this.timeLeft() < 160) return false;
    if (s.day === this.lastTownDay) return false;
    if (this.buyList().length > 0) return true;
    if (this.haveSeeds() < this.seedsWanted() * 0.4 && this.doneCoins()) return true;
    if (this.canHandIn()) return true;
    if (this.boardHits().length > 0) return true;
    if (this.upgradeReady()) return true;
    // Talk to Odile now and then while a quest needs her friendship.
    return s.quests.active.some((qp) => questDef(qp.id).objectives.some((o) => o.kind === 'hearts')) && s.day - this.lastTownDay >= 2;
  }

  private canHandIn(): boolean {
    return this.s.quests.active.some((qp) => {
      const q = questDef(qp.id);
      return q.arc === 'main' && q.objectives.some((o, i) => o.kind === 'deliver' && o.to === 'works' && o.item && this.carried(o.item) > 0 && (qp.progress[i] ?? 0) < o.count);
    });
  }

  private boardHits(): number[] {
    const out: number[] = [];
    this.s.board.forEach((b, i) => {
      if (!b.done && b.deadline >= this.s.day && this.carried(b.item) >= b.count) out.push(i);
    });
    return out;
  }

  private upgradeReady(): boolean {
    const t = this.nextUpgrade();
    if (!t) return false;
    const cost = TOOL_UPGRADE_COST[this.s.player.tools[t] + 1];
    return this.s.player.coins >= cost.coins + 100 && this.carried(cost.item) >= cost.count;
  }

  private townTrip(): void {
    const s = this.s;
    this.lastTownDay = s.day;
    this.notes.push('town');
    this.minutes(40);
    warpTo(s, this.ctx, 'town', 1, 15, 1);
    // Shops open at 09:00 or later; arrive then.
    const open = minuteOfClock('09:00');
    if (s.minute < open) this.tick((open - s.minute) * TICKS_PER_MINUTE);
    this.drainScenes();
    this.friendship();
    // Hand in, then trade.
    for (const qp of [...s.quests.active]) {
      const q = questDef(qp.id);
      if (q.arc === 'main' && q.objectives.some((o) => o.kind === 'deliver' && o.to === 'works')) this.cmd({ type: 'deliver', quest: qp.id });
    }
    for (const i of this.boardHits()) {
      const coins = s.player.coins;
      if (this.cmd({ type: 'board', index: i }).ok) this.boardCoins += s.player.coins - coins;
    }
    // Upgrade a tool.
    const up = this.nextUpgrade();
    if (up && this.upgradeReady()) {
      const r = this.cmd({ type: 'upgrade', tool: up });
      if (r.ok) this.result.milestones[`${up}${s.player.tools[up]}`] = s.day;
      this.notes.push(`up-${up}:${r.ok}`);
    }
    // Seeds first (they pay for themselves in days); materials with what is left.
    this.buySeeds();
    for (const [item, n] of this.buyList()) {
      this.buy(item, n);
      this.notes.push(`buy-${item}`);
    }
    this.minutes(5);
    warpTo(s, this.ctx, 'farm', 9, 7, 2);
    this.at = { x: 9.5, y: 7.5 };
    this.minutes(35);
    this.drainScenes();
  }

  private friendship(): void {
    const s = this.s;
    for (const v of ['odile']) {
      if (!s.quests.active.some((qp) => questDef(qp.id).objectives.some((o) => o.kind === 'hearts' && o.villager === v))) continue;
      talkTo(s, this.ctx, v);
      // A neutral crop is twenty points; the weekly cap is two gifts.
      const slot = s.player.inventory.findIndex((st) => st && getItem(st.id).category === 'crop');
      if (slot >= 0) giveGift(s, this.ctx, v, slot);
    }
  }

  private buy(item: string, n: number): void {
    const shop = SHOPS.find((x) => x.id === SHOP_OF[item]);
    if (!shop || !isShopOpen(shop, this.s.day, this.s.minute)) return;
    const entry = shop.stock.find((e) => e.item === item);
    if (!entry) return;
    const afford = Math.floor((this.s.player.coins - SEED_FLOOR) / entry.price);
    const qty = Math.min(n, afford);
    if (qty > 0) this.cmd({ type: 'buy', shop: shop.id, item, n: qty });
  }

  private buySeeds(): void {
    const shop = SHOPS.find((x) => x.id === 'almanac')!;
    if (!isShopOpen(shop, this.s.day, this.s.minute)) return;
    const ranked = this.rankedSeeds(this.s.day + 1, false);
    if (ranked.length === 0) return;
    let want = Math.max(0, this.seedsWanted() - this.haveSeeds());
    let budget = this.s.player.coins * SEED_SHARE;
    ranked.forEach((seed, i) => {
      const entry = shop.stock.find((e) => e.item === seed && (!e.seasons || e.seasons.includes(seasonOf(this.s.day))));
      if (!entry) return;
      // Two thirds of the order for the best crop, the rest for the runner-up.
      const share = i === 0 && ranked.length > 1 ? Math.ceil(want * (2 / 3)) : want;
      const qty = Math.min(share, Math.floor(budget / entry.price));
      if (qty <= 0) return;
      if (this.cmd({ type: 'buy', shop: 'almanac', item: seed, n: qty }).ok) {
        this.seedSpend += qty * entry.price;
        budget -= qty * entry.price;
        want -= qty;
      }
    });
  }

  // ---- Shipping ----------------------------------------------------------------------------------------
  /** What to hold back from the bin: quest deliveries, board requests, a few crops for the Works Hall. */
  private reserved(): Record<string, number> {
    const r: Record<string, number> = {};
    const add = (id: string, n: number) => (r[id] = Math.max(r[id] ?? 0, n));
    for (const qp of this.s.quests.active) {
      const q = questDef(qp.id);
      if (q.arc !== 'main') continue;
      q.objectives.forEach((o, i) => {
        if (o.kind === 'deliver' && o.to === 'works' && o.item) add(o.item, o.count - (qp.progress[i] ?? 0));
      });
    }
    for (const b of this.s.board) if (!b.done && b.deadline >= this.s.day) add(b.item, b.count);
    return r;
  }

  private cropsHeldForQuest(): number {
    let n = 0;
    for (const qp of this.s.quests.active) {
      const q = questDef(qp.id);
      q.objectives.forEach((o, i) => {
        if (o.kind === 'deliver' && o.to === 'works' && !o.item && o.category === 'crop') n += o.count - (qp.progress[i] ?? 0);
      });
    }
    return n;
  }

  private shipAll(): void {
    const s = this.s;
    const hold = this.reserved();
    let cropsHeld = this.cropsHeldForQuest();
    const inv = s.player.inventory;
    for (let slot = 0; slot < inv.length; slot++) {
      const st = inv[slot];
      if (!st) continue;
      const def = getItem(st.id);
      if (def.category !== 'crop' && def.category !== 'forage' && def.category !== 'fish' && def.category !== 'animal' && def.category !== 'product') continue;
      let keep = hold[st.id] ?? 0;
      if (def.category === 'crop' && cropsHeld > 0) {
        const k = Math.min(cropsHeld, st.n);
        keep = Math.max(keep, k);
        cropsHeld -= k;
      }
      keep = Math.min(keep, st.n);
      if (hold[st.id]) hold[st.id] = Math.max(0, hold[st.id] - keep);
      const n = st.n - keep;
      if (n > 0) this.cmd({ type: 'ship', slot, n });
    }
  }
}

