// The story state machine (DESIGN.md §0, §10). updateQuests runs to a fixed point: activate what is
// eligible, recount objectives from state, complete what is satisfied, repeat. Progress is derived from
// state wherever possible, so it can never be lost or counted twice.
import { getItem, getMachine } from '../data';
import { QUESTS } from '../data/quests';
import type { ItemCategory, Objective, QuestDef, ToolId } from '../data/types';
import { giveItem } from './actions';
import type { CommandResult } from './commands';
import { heartsOf } from './conditions';
import { emit, toast, type DayContext } from './context';
import { learnRecipes } from './crafting';
import { countItem } from './inventory';
import type { GameState, ItemStack, QuestProgress } from './state';
import { addPoints } from './villagers';

const byId = new Map(QUESTS.map((q) => [q.id, q]));

export function questDef(id: string): QuestDef {
  const q = byId.get(id);
  if (!q) throw new Error(`unknown quest: ${id}`);
  return q;
}

export const isQuestDone = (state: GameState, id: string): boolean => state.quests.done.includes(id);
export const activeQuest = (state: GameState, id: string): QuestProgress | null => state.quests.active.find((q) => q.id === id) ?? null;

function shippedOf(state: GameState, o: { item?: string; category?: ItemCategory }): number {
  if (o.item) return state.shippedTotal[o.item] ?? 0;
  let n = 0;
  for (const [id, count] of Object.entries(state.shippedTotal)) if (getItem(id).category === o.category) n += count;
  return n;
}

/** The farm's water + wind supply, derived from the layout (same rule as sim/power.ts). */
export type SupplyFn = (state: GameState) => number;

/** [current, target] for one objective. */
export function objectiveProgress(state: GameState, qp: QuestProgress, i: number, supply: SupplyFn): [number, number] {
  const o = questDef(qp.id).objectives[i];
  switch (o.kind) {
    case 'ship':
      return [Math.min(o.count, shippedOf(state, o) - (qp.base[i] ?? 0)), o.count];
    case 'deliver':
      return [Math.min(o.count, qp.progress[i] ?? 0), o.count];
    case 'deliverKinds':
      return [Math.min(o.kinds, qp.kinds[i]?.length ?? 0), o.kinds];
    case 'reachFloor':
      return [Math.min(o.floor, state.mineDeepest), o.floor];
    case 'pickup':
      return [state.flags.includes(`got_${o.item}`) ? 1 : 0, 1];
    case 'attend':
      return [festivalEndedSince(state, o.festival, qp.since) ? 1 : 0, 1];
    case 'scene':
      return [state.seenScenes.includes(o.scene) ? 1 : 0, 1];
    case 'hearts':
      return [Math.min(o.hearts, heartsOf(state, o.villager)), o.hearts];
    case 'power':
      return [Math.min(o.supply, Math.floor(supply(state))), o.supply];
    case 'own':
      return [Math.min(o.count, state.farm.entities.filter((e) => e.type === o.machine).length), o.count];
    case 'flag':
      return [state.flags.includes(o.flag) ? 1 : 0, 1];
  }
}

/** Festival-end flags look like `fest:<id>:<day>`, set at the end of the festival day either way. */
function festivalEndedSince(state: GameState, festival: string, since: number): boolean {
  const prefix = `fest:${festival}:`;
  return state.flags.some((f) => f.startsWith(prefix) && Number(f.slice(prefix.length)) >= since);
}

function eligible(state: GameState, q: QuestDef): boolean {
  if (isQuestDone(state, q.id) || activeQuest(state, q.id)) return false;
  if (!q.requires.every((r) => isQuestDone(state, r))) return false;
  if (q.requiresFlags && !q.requiresFlags.every((f) => state.flags.includes(f))) return false;
  return q.earliest === undefined || state.day >= q.earliest;
}

function activate(state: GameState, ctx: DayContext, q: QuestDef): void {
  const base = q.objectives.map((o) => (o.kind === 'ship' ? shippedOf(state, o) : 0));
  state.quests.active.push({ id: q.id, progress: q.objectives.map(() => 0), base, kinds: q.objectives.map(() => []), since: state.day });
  for (const f of q.onStart?.flags ?? []) if (!state.flags.includes(f)) state.flags.push(f);
  if (q.onStart?.scene) queueScene(state, q.onStart.scene);
  if (q.objectives.length && !q.onStart?.scene) toast(ctx, `New ${q.arc === 'main' ? 'story' : 'side'} quest: ${q.title}`);
}

export function queueScene(state: GameState, id: string): void {
  if (!state.seenScenes.includes(id) && !state.sceneQueue.some((s) => s.id === id)) state.sceneQueue.push({ id });
}

function grant(state: GameState, ctx: DayContext, q: QuestDef): void {
  const r = q.rewards;
  if (r.coins) {
    state.player.coins += r.coins;
    state.today.coinsOther += r.coins;
  }
  for (const it of r.items ?? []) giveItem(state, ctx, it.item, it.n);
  const learned = learnRecipes(state, [...(r.blueprints ?? []), ...(r.recipes ?? [])]);
  if (learned.length) toast(ctx, `Learned: ${learned.map((id) => recipeLabel(id)).join(', ')}`);
  for (const f of r.flags ?? []) if (!state.flags.includes(f)) state.flags.push(f);
  if (r.removeFlags) state.flags = state.flags.filter((f) => !r.removeFlags!.includes(f));
  for (const [v, n] of Object.entries(r.points ?? {})) addPoints(state, v, n);
  for (const [tool, tier] of Object.entries(r.tools ?? {}) as [ToolId, number][]) state.player.tools[tool] = Math.max(state.player.tools[tool], tier);
  if (r.scene) queueScene(state, r.scene);
}

function recipeLabel(id: string): string {
  const item = id.replace(/^(craft|cook)_/, '');
  try {
    return getItem(item).name;
  } catch {
    return getMachine(item).name;
  }
}

/** Runs the state machine to a fixed point. `supply` is the farm power supply (from DayContext). */
export function updateQuests(state: GameState, ctx: DayContext, supply: SupplyFn = () => ctx.power.supply): void {
  for (let guard = 0; guard < 50; guard++) {
    let changed = false;
    for (const q of QUESTS) {
      if (eligible(state, q)) {
        activate(state, ctx, q);
        changed = true;
      }
    }
    for (const qp of [...state.quests.active]) {
      const q = questDef(qp.id);
      const done = q.objectives.every((_, i) => {
        const [cur, target] = objectiveProgress(state, qp, i, supply);
        return cur >= target;
      });
      if (!done) continue;
      state.quests.active = state.quests.active.filter((a) => a.id !== qp.id);
      state.quests.done.push(qp.id);
      grant(state, ctx, q);
      if (!q.rewards.scene) toast(ctx, `Quest complete: ${q.title}`);
      emit(ctx, { type: 'sound', name: 'quest' });
      changed = true;
    }
    if (!changed) return;
  }
}

// ---- Deliveries -------------------------------------------------------------------------------------

function matches(o: Objective, id: string): boolean {
  if (o.kind !== 'deliver' && o.kind !== 'deliverKinds') return false;
  const def = getItem(id);
  if (o.kind === 'deliverKinds') return def.category === o.category;
  return o.item ? o.item === id : def.category === o.category;
}

/** Takes up to n items from the backpack that satisfy pred, lowest quality first. */
function takeMatching(state: GameState, pred: (id: string) => boolean, n: number): ItemStack[] {
  const inv = state.player.inventory;
  const taken: ItemStack[] = [];
  const order = inv.map((s, i) => ({ s, i })).filter((x) => x.s && pred(x.s.id)).sort((a, b) => a.s!.q - b.s!.q || a.i - b.i);
  for (const { i } of order) {
    if (n <= 0) break;
    const st = inv[i]!;
    const k = Math.min(n, st.n);
    st.n -= k;
    n -= k;
    taken.push({ id: st.id, q: st.q, n: k });
    if (st.n <= 0) inv[i] = null;
  }
  return taken;
}

/** Hands over what the backpack has for one objective. Returns how many items went in. */
function deliverInto(state: GameState, qp: QuestProgress, i: number, onlyItem?: string): number {
  const o = questDef(qp.id).objectives[i];
  if (o.kind === 'deliver') {
    const need = o.count - (qp.progress[i] ?? 0);
    if (need <= 0) return 0;
    const got = takeMatching(state, (id) => matches(o, id) && (!onlyItem || id === onlyItem), need).reduce((a, s) => a + s.n, 0);
    qp.progress[i] = (qp.progress[i] ?? 0) + got;
    return got;
  }
  if (o.kind === 'deliverKinds') {
    let got = 0;
    const have = qp.kinds[i] ?? (qp.kinds[i] = []);
    for (const st of state.player.inventory) {
      if (have.length >= o.kinds) break;
      if (!st || !matches(o, st.id) || have.includes(st.id) || (onlyItem && st.id !== onlyItem)) continue;
      have.push(st.id);
      takeMatching(state, (id) => id === st.id, 1);
      got++;
    }
    return got;
  }
  return 0;
}

/** Works Hall: hand over everything you carry for one quest's 'works' deliveries. */
export function deliverAtWorks(state: GameState, ctx: DayContext, questId: string): CommandResult {
  const qp = activeQuest(state, questId);
  if (!qp) return { ok: false, reason: 'That request is not open.' };
  let got = 0;
  questDef(questId).objectives.forEach((o, i) => {
    if ((o.kind === 'deliver' || o.kind === 'deliverKinds') && o.to === 'works') got += deliverInto(state, qp, i);
  });
  if (got === 0) return { ok: false, reason: "You don't have anything they need yet." };
  toast(ctx, `Handed over ${got} item${got === 1 ? '' : 's'}.`);
  updateQuests(state, ctx);
  return { ok: true };
}

/** Using an item on a villager hands it in when one of their quests wants it. Null when nothing wants it. */
export function deliverToVillager(state: GameState, ctx: DayContext, villager: string, item: string): CommandResult | null {
  for (const qp of state.quests.active) {
    const q = questDef(qp.id);
    for (let i = 0; i < q.objectives.length; i++) {
      const o = q.objectives[i];
      if ((o.kind !== 'deliver' && o.kind !== 'deliverKinds') || o.to !== villager || !matches(o, item)) continue;
      const got = deliverInto(state, qp, i, item);
      if (got === 0) continue;
      toast(ctx, `Gave ${got} ${getItem(item).name} for "${q.title}".`);
      updateQuests(state, ctx);
      return { ok: true };
    }
  }
  return null;
}

/** Items a quest still needs from the backpack at a delivery point (for UI hints). */
export function stillNeeded(qp: QuestProgress, i: number): number {
  const o = questDef(qp.id).objectives[i];
  if (o.kind === 'deliver') return Math.max(0, o.count - (qp.progress[i] ?? 0));
  if (o.kind === 'deliverKinds') return Math.max(0, o.kinds - (qp.kinds[i]?.length ?? 0));
  return 0;
}

export function carriedFor(state: GameState, o: Objective): number {
  if (o.kind === 'deliver' && o.item) return countItem(state.player.inventory, o.item);
  return state.player.inventory.reduce((a, s) => a + (s && matches(o, s.id) ? s.n : 0), 0);
}
