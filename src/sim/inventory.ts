// Inventory helpers over a slot array. Stacks are keyed by (item, quality).
import { STACK_MAX } from '../data/balance';
import { getItem } from '../data';
import type { ItemId, Quality, RecipeInput } from '../data/types';
import type { ItemStack, Slot } from './state';

const stackable = (id: ItemId) => getItem(id).category !== 'tool';

/** Adds items; returns how many did not fit. */
export function addItem(slots: Slot[], id: ItemId, n: number, q: Quality = 0): number {
  let left = n;
  if (stackable(id)) {
    for (const s of slots) {
      if (left <= 0) break;
      if (s && s.id === id && s.q === q && s.n < STACK_MAX) {
        const take = Math.min(left, STACK_MAX - s.n);
        s.n += take;
        left -= take;
      }
    }
  }
  for (let i = 0; i < slots.length && left > 0; i++) {
    if (slots[i]) continue;
    const take = stackable(id) ? Math.min(left, STACK_MAX) : 1;
    slots[i] = { id, q, n: take };
    left -= take;
  }
  return left;
}

export function canFit(slots: Slot[], id: ItemId, n: number, q: Quality = 0): boolean {
  const copy = slots.map((s) => (s ? { ...s } : null));
  return addItem(copy, id, n, q) === 0;
}

export function countItem(slots: Slot[], id: ItemId): number {
  let n = 0;
  for (const s of slots) if (s && s.id === id) n += s.n;
  return n;
}

export function countTag(slots: Slot[], tag: string): number {
  let n = 0;
  for (const s of slots) if (s && getItem(s.id).tags?.includes(tag)) n += s.n;
  return n;
}

export function countInput(slots: Slot[], input: RecipeInput): number {
  return input.item ? countItem(slots, input.item) : countTag(slots, input.tag ?? '');
}

/**
 * Removes n items matching the predicate, lowest quality first (players keep their best goods).
 * Returns the removed stacks. Caller must check the count first.
 */
function removeWhere(slots: Slot[], match: (s: ItemStack) => boolean, n: number): ItemStack[] {
  const removed: ItemStack[] = [];
  let left = n;
  for (const q of [0, 1, 2] as Quality[]) {
    for (let i = 0; i < slots.length && left > 0; i++) {
      const s = slots[i];
      if (!s || s.q !== q || !match(s)) continue;
      const take = Math.min(left, s.n);
      s.n -= take;
      left -= take;
      removed.push({ id: s.id, q: s.q, n: take });
      if (s.n === 0) slots[i] = null;
    }
  }
  return removed;
}

export function removeItem(slots: Slot[], id: ItemId, n: number): ItemStack[] {
  return removeWhere(slots, (s) => s.id === id, n);
}

export function removeInput(slots: Slot[], input: RecipeInput): ItemStack[] {
  if (input.item) return removeItem(slots, input.item, input.count);
  return removeWhere(slots, (s) => !!getItem(s.id).tags?.includes(input.tag ?? ''), input.count);
}

export function hasInputs(slots: Slot[], inputs: RecipeInput[], times = 1): boolean {
  return inputs.every((i) => countInput(slots, i) >= i.count * times);
}

/** Removes n from a specific slot; returns the removed stack or null. */
export function takeFromSlot(slots: Slot[], index: number, n: number): ItemStack | null {
  const s = slots[index];
  if (!s || n <= 0) return null;
  const take = Math.min(n, s.n);
  s.n -= take;
  if (s.n === 0) slots[index] = null;
  return { id: s.id, q: s.q, n: take };
}

/** Merge stacks with the same (id, q) into a compact list (shipping bin, silos). */
export function pushStack(list: ItemStack[], st: ItemStack): void {
  const hit = list.find((s) => s.id === st.id && s.q === st.q);
  if (hit) hit.n += st.n;
  else list.push({ ...st });
}
