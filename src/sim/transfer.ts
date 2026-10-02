// Item flow between entities: belts, splitters, machine outputs (DESIGN.md §5).
//
// Every decision in gather/resolve reads the start-of-step state, so the result does not depend on
// iteration order. Do not "optimise" this into a single pass.
import { getItem, getMachine, recipesFor } from '../data';
import type { Dir, ItemId, Quality, RecipeDef } from '../data/types';
import { DX, DY, opposite, parseMap, rotateCCW, rotateCW } from '../world';
import { chuteSell, isSellable } from './economy';
import type { DayStats, Entity, GameState } from './state';
import { statsFor } from './stats';

type SourceSlot = 'belt' | 'output' | 'stored';

interface Offer {
  source: Entity;
  slot: SourceSlot;
  target: Entity;
  /** side of the TARGET the item enters from (direction from target to source) */
  side: Dir;
  item: ItemId;
  q: Quality;
  /** splitter only: index into [front, right, left] used */
  outIndex: number;
}

/** Recipes this crafter can currently run (respects reward-gated recipes). */
export function availableRecipes(state: GameState, machineId: string): RecipeDef[] {
  return recipesFor(machineId).filter((r) => !r.requiresReward || state.rewards.includes(r.requiresReward));
}

export function crafterAccepts(state: GameState, e: Entity, item: ItemId): boolean {
  const def = getMachine(e.type);
  const usable = availableRecipes(state, e.type).some((r) => r.inputs.some((i) => i.item === item));
  return usable && (e.input[item] ?? 0) < (def.bufferPerItem ?? 0);
}

/** The seed a planter holds (it takes one kind at a time), or null when empty. */
export function planterSeed(e: Entity): ItemId | null {
  for (const [id, n] of Object.entries(e.input)) if (n > 0) return id;
  return null;
}

export function planterAccepts(e: Entity, item: ItemId): boolean {
  if (getItem(item).category !== 'seed') return false;
  const cur = planterSeed(e);
  if (cur && cur !== item) return false;
  return (e.input[item] ?? 0) < (getMachine(e.type).capacity ?? 0);
}

export function storedCount(e: Entity): number {
  return e.stored.reduce((a, s) => a + s.n, 0);
}

/** Snapshot acceptance test. `side` is the target side the item would enter from. */
export function canAccept(state: GameState, target: Entity, item: ItemId, side: Dir): boolean {
  const def = getMachine(target.type);
  const since = state.step - target.lastEntry;
  switch (def.kind) {
    case 'belt':
      return side !== target.dir && target.belt.length < (def.capacity ?? 0) && since >= (def.entryInterval ?? 1);
    case 'splitter':
      return side === opposite(target.dir) && target.belt.length < (def.capacity ?? 0) && since >= (def.entryInterval ?? 1);
    case 'crafter':
      return side !== target.dir && crafterAccepts(state, target, item);
    case 'planter':
      return planterAccepts(target, item);
    case 'storage':
      return side !== target.dir && storedCount(target) < (def.capacity ?? 0);
    case 'seller':
      return isSellable(item);
    default:
      return false;
  }
}

/** The item an entity is ready to hand on this step, if any. */
function readyItem(e: Entity): { item: ItemId; q: Quality; slot: SourceSlot } | null {
  const def = getMachine(e.type);
  if (def.kind === 'belt' || def.kind === 'splitter') {
    const head = e.belt[0];
    return head && head.age >= (def.travelMinutes ?? 1) ? { item: head.item, q: head.q, slot: 'belt' } : null;
  }
  if (def.kind === 'harvester' || def.kind === 'crafter') {
    return e.output.length > 0 ? { item: e.output[0].id, q: e.output[0].q, slot: 'output' } : null;
  }
  if (def.kind === 'storage') {
    return e.stored.length > 0 ? { item: e.stored[0].id, q: e.stored[0].q, slot: 'stored' } : null;
  }
  return null;
}

/** Splitter output order relative to its facing: front, right, left. */
export function splitterOutputs(dir: Dir): Dir[] {
  return [dir, rotateCW(dir), rotateCCW(dir)];
}

function neighbour(state: GameState, e: Entity, d: Dir): Entity | null {
  const m = parseMap('farm');
  const x = e.x + DX[d];
  const y = e.y + DY[d];
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return null;
  const id = state.farm.entityAt[y * m.w + x];
  if (id < 0) return null;
  return entityById(state, id);
}

function entityById(state: GameState, id: number): Entity | null {
  // Entities are kept in id order, so a binary search is safe.
  const list = state.farm.entities;
  let lo = 0;
  let hi = list.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].id === id) return list[mid];
    if (list[mid].id < id) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}

function gatherOffers(state: GameState): Offer[] {
  const offers: Offer[] = [];
  for (const source of state.farm.entities) {
    const ready = readyItem(source);
    if (!ready) continue;
    const kind = getMachine(source.type).kind;
    if (kind === 'splitter') {
      const outs = splitterOutputs(source.dir);
      for (let k = 0; k < 3; k++) {
        const outIndex = (source.outRR + k) % 3;
        const d = outs[outIndex];
        const target = neighbour(state, source, d);
        if (target && canAccept(state, target, ready.item, opposite(d))) {
          offers.push({ source, slot: ready.slot, target, side: opposite(d), item: ready.item, q: ready.q, outIndex });
          break;
        }
      }
      continue;
    }
    const d = source.dir;
    const target = neighbour(state, source, d);
    if (target && canAccept(state, target, ready.item, opposite(d))) {
      offers.push({ source, slot: ready.slot, target, side: opposite(d), item: ready.item, q: ready.q, outIndex: -1 });
    }
  }
  return offers;
}

/** Pick one offer per target: first side clockwise after the side it last accepted from. */
function resolveOffers(offers: Offer[]): Offer[] {
  const best = new Map<number, Offer>();
  const rank = (o: Offer) => (o.side - o.target.inRR - 1 + 8) % 4;
  for (const o of offers) {
    const current = best.get(o.target.id);
    if (!current || rank(o) < rank(current)) best.set(o.target.id, o);
  }
  // Apply in source id order for readability; the outcome does not depend on it.
  return [...best.values()].sort((a, b) => a.source.id - b.source.id);
}

function takeFromSource(o: Offer): void {
  if (o.slot === 'belt') o.source.belt.shift();
  else if (o.slot === 'output') o.source.output.shift();
  else {
    const head = o.source.stored[0];
    head.n -= 1;
    if (head.n <= 0) o.source.stored.shift();
  }
  if (o.outIndex >= 0) o.source.outRR = (o.outIndex + 1) % 3;
}

/** Appends to a FIFO run-length list: merges only with the last run so order is preserved. */
export function pushFifo(list: { id: ItemId; q: Quality; n: number }[], id: ItemId, q: Quality, n = 1): void {
  const last = list[list.length - 1];
  if (last && last.id === id && last.q === q) last.n += n;
  else list.push({ id, q, n });
}

function deliver(state: GameState, today: DayStats, o: Offer): void {
  const t = o.target;
  t.inRR = o.side;
  switch (getMachine(t.type).kind) {
    case 'belt':
    case 'splitter':
      t.belt.push({ item: o.item, q: o.q, age: 0, from: o.side });
      t.lastEntry = state.step;
      break;
    case 'crafter':
    case 'planter':
      t.input[o.item] = (t.input[o.item] ?? 0) + 1;
      break;
    case 'storage':
      pushFifo(t.stored, o.item, o.q);
      break;
    case 'seller':
      chuteSell(state, { id: o.item, q: o.q, n: 1 });
      statsFor(today, t.id).produced += 1;
      break;
    default:
      throw new Error(`deliver: ${t.type} cannot receive`);
  }
}

/** Factory step parts 3 (transfers) and 4 (belt aging + stats). */
export function tickTransfers(state: GameState, today: DayStats): void {
  const winners = resolveOffers(gatherOffers(state));
  const moved = new Set<number>();
  for (const o of winners) {
    takeFromSource(o);
    deliver(state, today, o);
    moved.add(o.source.id);
    statsFor(today, o.source.id).moved += 1;
  }
  for (const e of state.farm.entities) {
    if (e.belt.length === 0) continue;
    const def = getMachine(e.type);
    if (def.kind !== 'belt' && def.kind !== 'splitter') continue;
    // A belt whose head was ready but could not leave counts as blocked this step.
    if (!moved.has(e.id) && e.belt[0].age >= (def.travelMinutes ?? 1)) statsFor(today, e.id).blocked += 1;
    for (const b of e.belt) b.age += 1;
  }
}
