// Festivals (DESIGN.md §11): one per season in town. Entering town during the window starts it; leaving
// ends it and skips the clock ahead. Attending or not, the end of the day marks it `fest:<id>:<day>`, which
// is what story `attend` objectives look for, so dated beats never wait for the player.
import {
  DERBY_FISH_PRIZE,
  FESTIVAL_ACTIVITY_MINUTES,
  FESTIVAL_LEAVE_MINUTE,
  POD_COUNT,
  POD_PRIZE,
  SECRET_FRIEND_POINTS,
  WEIGHIN_PRIZES,
  WEIGHIN_RIVALS,
} from '../data/balance';
import { getItem, VILLAGERS } from '../data';
import { FESTIVALS, type FestivalSpotDef } from '../data/festivals';
import { dayOfSeason, minuteOfClock, seasonOf, yearOf } from './calendar';
import type { CommandResult } from './commands';
import { emit, toast, type DayContext } from './context';
import { sellPrice } from './economy';
import { factoryStep } from './factory';
import { hash32 } from './hash';
import { takeFromSlot } from './inventory';
import { parseMap } from '../world';
import { updateQuests } from './quests';
import type { GameState } from './state';
import { addPoints } from './villagers';

export function festivalOn(day: number): FestivalSpotDef | null {
  const s = seasonOf(day);
  const d = dayOfSeason(day);
  return FESTIVALS.find((f) => f.season === s && f.day === d) ?? null;
}

export function festivalWindow(f: FestivalSpotDef): [number, number] {
  return [minuteOfClock(f.start), minuteOfClock(f.end)];
}

function markEnded(state: GameState, id: string): void {
  const flag = `fest:${id}:${state.day}`;
  if (!state.flags.includes(flag)) state.flags.push(flag);
}

/** Seed-pod tiles for the Blossom Fair: walkable plaza tiles chosen by hash (no RNG). */
export function podTiles(day: number): [number, number][] {
  const m = parseMap('town');
  const out: [number, number][] = [];
  for (let k = 0; out.length < POD_COUNT && k < 400; k++) {
    const x = 14 + (hash32(day, k, 1) % 20);
    const y = 9 + (hash32(day, k, 2) % 14);
    const i = y * m.w + x;
    if (m.staticBlocked[i] || m.buildingAt[i] >= 0 || m.seedObjects[i]) continue;
    if (out.some(([a, b]) => a === x && b === y)) continue;
    out.push([x, y]);
  }
  return out;
}

/** Called when the player arrives in town. */
export function maybeStartFestival(state: GameState, ctx: DayContext): void {
  const f = festivalOn(state.day);
  if (!f || state.player.map !== 'town') return;
  const [start, end] = festivalWindow(f);
  if (state.minute < start || state.minute >= end) return;
  if (state.festival && state.festival.id === f.id) return;
  if (state.flags.includes(`attended:${f.id}:${state.day}`)) return;
  state.festival = { id: f.id, startMinute: state.minute, score: 0, pods: [], exhibit: null, done: false };
  state.flags.push(`attended:${f.id}:${state.day}`);
  if (f.id === 'blossom') {
    const objs = state.maps.town.objects;
    const m = parseMap('town');
    for (const [x, y] of podTiles(state.day)) if (!objs[y * m.w + x]) objs[y * m.w + x] = { kind: 'story', item: 'seed_pod' };
  }
  // Attending counts for story objectives right away (the finale plays at the festival itself).
  markEnded(state, f.id);
  emit(ctx, { type: 'panel', panel: 'festival' });
  updateQuests(state, ctx);
}

/** Is the timed part of the activity still running? */
export function activityOpen(state: GameState): boolean {
  const fs = state.festival;
  return !!fs && !fs.done && state.minute - fs.startMinute < FESTIVAL_ACTIVITY_MINUTES;
}

export function collectPod(state: GameState, ctx: DayContext, x: number, y: number): boolean {
  const fs = state.festival;
  const m = parseMap('town');
  const objs = state.maps.town.objects;
  const o = objs[y * m.w + x];
  if (!fs || fs.id !== 'blossom' || o?.kind !== 'story' || o.item !== 'seed_pod') return false;
  objs[y * m.w + x] = null;
  if (!activityOpen(state)) {
    toast(ctx, 'The hunt is over, but you keep the pod as a souvenir.');
    return true;
  }
  fs.pods.push(y * m.w + x);
  fs.score += 1;
  toast(ctx, `Seed pod! ${fs.score} of ${POD_COUNT}.`);
  return true;
}

/** Derby: the fishing module calls this for every catch in town during the festival. */
export function derbyCatch(state: GameState, ctx: DayContext): void {
  const fs = state.festival;
  if (!fs || fs.id !== 'derby' || !activityOpen(state)) return;
  fs.score += 1;
  toast(ctx, `Derby catch! ${fs.score} so far.`);
}

export function exhibit(state: GameState, ctx: DayContext, slot: number): CommandResult {
  const fs = state.festival;
  if (!fs || fs.id !== 'weighin' || fs.done) return { ok: false, reason: 'There is no judging today.' };
  if (fs.exhibit) return { ok: false, reason: 'You have already entered something.' };
  const st = state.player.inventory[slot];
  if (!st) return { ok: false, reason: 'Pick something to exhibit.' };
  const cat = getItem(st.id).category;
  if (cat !== 'crop' && cat !== 'product' && cat !== 'animal' && cat !== 'fish' && cat !== 'forage') return { ok: false, reason: 'The judges want produce.' };
  const taken = takeFromSlot(state.player.inventory, slot, 1)!;
  fs.exhibit = taken;
  fs.score = sellPrice(taken.id, taken.q);
  toast(ctx, `You entered your ${getItem(taken.id).name}. The judges are scribbling.`);
  return { ok: true };
}

/** Lantern Night's secret friend, fixed per year by hash. */
export function secretFriend(day: number): string {
  return VILLAGERS[hash32(yearOf(day), 77) % VILLAGERS.length].id;
}

export function secretFriendGift(state: GameState, ctx: DayContext, villager: string): void {
  const fs = state.festival;
  if (!fs || fs.id !== 'lantern' || fs.done || fs.score > 0 || secretFriend(state.day) !== villager) return;
  fs.score = 1;
  addPoints(state, villager, SECRET_FRIEND_POINTS);
  toast(ctx, 'They were your secret friend! They light a lantern for you.');
}

/** Ends the festival: prizes, pods cleared, clock skipped ahead if it was early. */
export function endFestival(state: GameState, ctx: DayContext): void {
  const fs = state.festival;
  if (!fs || fs.done) return;
  fs.done = true;
  let prize = 0;
  if (fs.id === 'blossom') {
    prize = fs.score * POD_PRIZE;
    const objs = state.maps.town.objects;
    for (let i = 0; i < objs.length; i++) if (objs[i]?.kind === 'story' && (objs[i] as { item: string }).item === 'seed_pod') objs[i] = null;
  } else if (fs.id === 'derby') prize = fs.score * DERBY_FISH_PRIZE;
  else if (fs.id === 'weighin' && fs.exhibit) {
    const place = WEIGHIN_RIVALS.filter((r) => r > fs.score).length;
    prize = WEIGHIN_PRIZES[place] ?? 0;
    toast(ctx, place < 3 ? `Your ${getItem(fs.exhibit.id).name} placed ${['first', 'second', 'third'][place]}!` : 'No ribbon this year. The judges liked your enthusiasm.');
  }
  if (prize > 0) {
    state.player.coins += prize;
    state.today.coinsOther += prize;
    toast(ctx, `Festival prize: ${prize}g`);
  }
  if (state.minute < FESTIVAL_LEAVE_MINUTE) {
    state.minute = FESTIVAL_LEAVE_MINUTE;
    state.subTick = 0;
    while (state.step < state.minute) factoryStep(state, ctx);
  }
}

/** On leaving town; also called each minute to close the festival when its window ends. */
export function festivalTick(state: GameState, ctx: DayContext): void {
  const fs = state.festival;
  if (!fs || fs.done) return;
  const f = festivalOn(state.day);
  if (!f || state.player.map !== 'town' || state.minute >= festivalWindow(f)[1]) endFestival(state, ctx);
}

/** Day end: every festival day is marked ended for the story, attended or not; a missed one is noted. */
export function festivalOvernight(state: GameState): void {
  const f = festivalOn(state.day);
  if (!f) return;
  const attended = state.flags.includes(`attended:${f.id}:${state.day}`);
  markEnded(state, f.id);
  state.festival = null;
  const storyCares = state.quests.active.some((q) => q.id === 'blossom' || q.id === 'finale');
  if (!attended && storyCares && !state.sceneQueue.some((s) => s.id === 'missed_festival')) state.sceneQueue.push({ id: 'missed_festival' });
}
