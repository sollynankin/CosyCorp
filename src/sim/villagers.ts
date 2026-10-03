// Relationships (DESIGN.md §9): talking, gifts, hearts, courting and the ceremony. Content lives in
// data/villagers.ts and data/dialogue.ts.
import {
  BIRTHDAY_GIFT_MULT,
  DIALOGUE_SPECIFIC_WEIGHT,
  DATING_CAP_HEARTS,
  ENGAGEMENT_DAYS,
  GIFT_POINTS,
  GIFTS_PER_WEEK,
  MAX_POINTS,
  POINTS_PER_HEART,
  TALK_POINTS,
} from '../data/balance';
import { getItem, getVillager, VILLAGERS } from '../data';
import { DIALOGUE } from '../data/dialogue';
import type { DialogueLine, GiftPref, ItemId, VillagerDef } from '../data/types';
import { dayOfSeason, seasonOf, weekdayOf } from './calendar';
import type { CommandResult } from './commands';
import { conditionCount, conditionsHold, heartsOf } from './conditions';
import { emit, toast, type DayContext } from './context';
import { hash32, hashString } from './hash';
import { takeFromSlot } from './inventory';
import type { GameState, VillagerState } from './state';

export { heartsOf };

export function initVillagers(): Record<string, VillagerState> {
  const out: Record<string, VillagerState> = {};
  for (const v of VILLAGERS) {
    out[v.id] = { points: 0, talkedToday: false, giftedToday: false, giftsThisWeek: 0, courting: false, engaged: false, engagedDay: -1, married: false };
  }
  return out;
}

/** Point cap: romanceable villagers stop at DATING_CAP_HEARTS until you are courting. */
export function pointsCap(state: GameState, id: string): number {
  const v = getVillager(id);
  const st = state.villagers[id];
  return v.romanceable && !st.courting ? DATING_CAP_HEARTS * POINTS_PER_HEART : MAX_POINTS;
}

/** Adds (or removes) friendship, clamped to [0, cap]. Returns the change actually applied. */
export function addPoints(state: GameState, id: string, delta: number): number {
  const st = state.villagers[id];
  const before = st.points;
  st.points = Math.max(0, Math.min(pointsCap(state, id), st.points + delta));
  const v = getVillager(id);
  // The Inn sells Ribbon Charms once any sweetheart reaches the dating cap.
  if (v.romanceable && heartsOf(state, id) >= DATING_CAP_HEARTS && !state.flags.includes('eight_hearts_romance')) state.flags.push('eight_hearts_romance');
  return st.points - before;
}

export function isBirthday(v: VillagerDef, day: number): boolean {
  return v.birthday.season === seasonOf(day) && v.birthday.day === dayOfSeason(day);
}

/** Loved, liked or disliked by item id first, then by tag; anything else is neutral. */
export function giftPreference(v: VillagerDef, item: ItemId): GiftPref {
  const tags = getItem(item).tags ?? [];
  const match = (list: string[]) => list.includes(item);
  const matchTag = (list: string[]) => list.some((e) => e.startsWith('tag:') && tags.includes(e.slice(4)));
  for (const [pref, list] of [['loved', v.loves], ['liked', v.likes], ['disliked', v.dislikes]] as const) if (match(list)) return pref;
  for (const [pref, list] of [['loved', v.loves], ['liked', v.likes], ['disliked', v.dislikes]] as const) if (matchTag(list)) return pref;
  return 'neutral';
}

export function giftPoints(v: VillagerDef, item: ItemId, day: number): number {
  return GIFT_POINTS[giftPreference(v, item)] * (isBirthday(v, day) ? BIRTHDAY_GIFT_MULT : 1);
}

/** Line weight: context-aware lines are favoured but never exclusive (DESIGN.md §9). */
export function lineWeight(l: DialogueLine): number {
  return 1 + DIALOGUE_SPECIFIC_WEIGHT * conditionCount(l.when);
}

/** A matching line picked by a weighted hash of (day, villager): talking never consumes RNG. */
export function pickLine(state: GameState, id: string): string {
  const lines = DIALOGUE.filter((l) => l.villager === id && conditionsHold(state, l.when, id));
  if (lines.length === 0) return '...';
  const total = lines.reduce((a, l) => a + lineWeight(l), 0);
  let r = hash32(state.day, hashString(id)) % total;
  for (const l of lines) {
    r -= lineWeight(l);
    if (r < 0) return l.text;
  }
  return lines[lines.length - 1].text;
}

export function talkTo(state: GameState, ctx: DayContext, id: string): CommandResult {
  const st = state.villagers[id];
  const v = getVillager(id);
  let gained = 0;
  if (!st.talkedToday) {
    st.talkedToday = true;
    gained = addPoints(state, id, TALK_POINTS);
  }
  let text = pickLine(state, id);
  if (isBirthday(v, state.day)) text = `${text} (It is ${v.name.split(' ')[0]}'s birthday today.)`;
  emit(ctx, { type: 'dialogue', villager: id, text, hearts: heartsOf(state, id), gained });
  return { ok: true };
}

function married(state: GameState): string | null {
  return VILLAGERS.find((v) => state.villagers[v.id].married || state.villagers[v.id].engaged)?.id ?? null;
}

/** Gives the selected backpack item. Special items (Ribbon Charm, Promise Lantern) advance romance instead. */
export function giveGift(state: GameState, ctx: DayContext, id: string, slot: number): CommandResult {
  const p = state.player;
  const stack = p.inventory[slot];
  if (!stack) return { ok: false, reason: 'Nothing to give.' };
  const v = getVillager(id);
  const st = state.villagers[id];
  const item = getItem(stack.id);
  const first = v.name.split(' ')[0];

  if (stack.id === 'ribbon_charm') {
    if (!v.romanceable) return { ok: false, reason: `${first} smiles, but that charm is meant for a sweetheart.` };
    if (st.courting) return { ok: false, reason: `You are already courting ${first}.` };
    if (married(state)) return { ok: false, reason: 'Your heart is already promised.' };
    if (heartsOf(state, id) < DATING_CAP_HEARTS) return { ok: false, reason: `${first} isn't ready for that yet.` };
    takeFromSlot(p.inventory, slot, 1);
    st.courting = true;
    if (!state.flags.includes('courting')) state.flags.push('courting');
    emit(ctx, { type: 'dialogue', villager: id, text: `${first} turns the ribbon over and over, then ties it on. "Yes. Obviously yes."`, hearts: heartsOf(state, id), gained: 0 });
    return { ok: true };
  }
  if (stack.id === 'promise_lantern') {
    if (!st.courting) return { ok: false, reason: `You should be courting ${first} first.` };
    if (st.engaged || st.married) return { ok: false, reason: 'You have already made your promise.' };
    if (heartsOf(state, id) < 10) return { ok: false, reason: `${first} needs a little more time.` };
    takeFromSlot(p.inventory, slot, 1);
    st.engaged = true;
    st.engagedDay = state.day;
    emit(ctx, { type: 'dialogue', villager: id, text: `${first} holds the lantern up to the light. "In ${ENGAGEMENT_DAYS} days, in the square. Don't be late."`, hearts: heartsOf(state, id), gained: 0 });
    return { ok: true };
  }
  if (item.category === 'tool' || item.category === 'machine' || item.category === 'special') return { ok: false, reason: `${first} can't take that.` };
  if (st.giftedToday) return { ok: false, reason: `You already gave ${first} a gift today.` };
  const birthday = isBirthday(v, state.day);
  if (st.giftsThisWeek >= GIFTS_PER_WEEK && !birthday) return { ok: false, reason: `You've given ${first} ${GIFTS_PER_WEEK} gifts this week.` };

  takeFromSlot(p.inventory, slot, 1);
  st.giftedToday = true;
  st.giftsThisWeek += 1;
  const pref = giftPreference(v, stack.id);
  const gained = addPoints(state, id, giftPoints(v, stack.id, state.day));
  const text = birthday ? `${v.giftLines[pref]} And on my birthday, too!` : v.giftLines[pref];
  emit(ctx, { type: 'dialogue', villager: id, text, hearts: heartsOf(state, id), gained });
  if (pref === 'loved') toast(ctx, `${first} loved it!`);
  return { ok: true };
}

/** Morning: daily flags reset, weekly gift counts reset on Monday, and the ceremony when it is time. */
export function villagerMorning(state: GameState): void {
  const monday = weekdayOf(state.day) === 0;
  for (const v of VILLAGERS) {
    const st = state.villagers[v.id];
    st.talkedToday = false;
    st.giftedToday = false;
    if (monday) st.giftsThisWeek = 0;
    if (st.engaged && !st.married && state.day >= st.engagedDay + ENGAGEMENT_DAYS) {
      st.married = true;
      if (!state.flags.includes(`married_${v.id}`)) state.flags.push(`married_${v.id}`);
      if (!state.seenScenes.includes(`ceremony_${v.id}`)) state.sceneQueue.push({ id: `ceremony_${v.id}` });
    }
  }
}
