// Animals (DESIGN.md §12): chickens in the Coop, cows in the Barn. Fed animals (grazing on fine days
// outside winter, otherwise hay from the feeder) produce overnight; petting raises friendship, which raises
// product quality. Products wait in the animal box until collected.
import {
  ANIMAL_GOLD_AT,
  ANIMAL_MATURE_DAYS,
  ANIMAL_SILVER_AT,
  BARN_CAPACITY,
  COOP_CAPACITY,
  MISSED_MEAL_POINTS,
  PET_POINTS,
} from '../data/balance';
import type { Quality } from '../data/types';
import { seasonOf } from './calendar';
import type { CommandResult } from './commands';
import { toast, type DayContext } from './context';
import { hash32 } from './hash';
import { addItem, countItem, removeItem } from './inventory';
import { rngNext } from './rng';
import type { Animal, GameState } from './state';

const NAMES = ['Clover', 'Pip', 'Marigold', 'Biscuit', 'Hazel', 'Pudding', 'Bramble', 'Dot', 'Juniper', 'Toffee', 'Mabel', 'Wren-ish', 'Nutmeg', 'Barley'];

export const homeOf = (a: Animal): 'coop' | 'barn' => (a.kind === 'chicken' ? 'coop' : 'barn');
export const productOf = (a: Animal): string => (a.kind === 'chicken' ? 'egg' : 'milk');

export function capacity(state: GameState, building: 'coop' | 'barn'): number {
  if (!state.flags.includes(`built_${building}`)) return 0;
  return building === 'coop' ? COOP_CAPACITY : BARN_CAPACITY;
}

export function addAnimal(state: GameState, kind: 'chicken' | 'cow'): CommandResult {
  const building = kind === 'chicken' ? 'coop' : 'barn';
  const n = state.animals.filter((a) => homeOf(a) === building).length;
  if (n >= capacity(state, building)) return { ok: false, reason: `The ${building} is full.` };
  const id = state.nextAnimalId++;
  state.animals.push({ id, kind, name: NAMES[hash32(state.seed, id) % NAMES.length], friendship: 0, fed: false, petted: false, ageDays: 0 });
  return { ok: true };
}

/** Grazing days: fine weather outside winter. */
export function canGraze(state: GameState): boolean {
  return (state.weather === 'sunny') && seasonOf(state.day) !== 'winter';
}

export function petAnimal(state: GameState, ctx: DayContext, id: number): CommandResult {
  const a = state.animals.find((x) => x.id === id);
  if (!a) return { ok: false, reason: 'No such animal.' };
  if (a.petted) return { ok: false, reason: `${a.name} has had enough fuss for today.` };
  a.petted = true;
  a.friendship = Math.min(1000, a.friendship + PET_POINTS);
  toast(ctx, `${a.name} ${a.kind === 'chicken' ? 'clucks happily' : 'leans into your hand'}.`);
  return { ok: true };
}

/** Moves all hay from the backpack into a feeder. */
export function fillFeeder(state: GameState, building: 'coop' | 'barn'): CommandResult {
  const n = countItem(state.player.inventory, 'hay');
  if (n === 0) return { ok: false, reason: 'You have no hay. The Joinery and Almanac sell it.' };
  removeItem(state.player.inventory, 'hay', n);
  state.feeders[building] += n;
  return { ok: true };
}

export function collectAnimalBox(state: GameState): CommandResult {
  if (state.animalBox.length === 0) return { ok: false, reason: 'Nothing to collect yet.' };
  const keep = [];
  for (const st of state.animalBox) {
    const left = addItem(state.player.inventory, st.id, st.n, st.q);
    if (left > 0) keep.push({ ...st, n: left });
  }
  state.animalBox = keep;
  return keep.length ? { ok: false, reason: 'Your backpack is full.' } : { ok: true };
}

function productQuality(state: GameState, a: Animal): Quality {
  const r = rngNext(state);
  if (a.friendship >= ANIMAL_GOLD_AT) return r < 0.5 ? 2 : 1;
  if (a.friendship >= ANIMAL_SILVER_AT) return r < 0.5 ? 1 : 0;
  return 0;
}

/** Day end: feeding, produce, friendship. Returns notes for the report. */
export function animalsOvernight(state: GameState): string[] {
  const notes: string[] = [];
  const graze = canGraze(state);
  let hungry = 0;
  for (const a of state.animals) {
    const home = homeOf(a);
    let fed = graze;
    if (!fed && state.feeders[home] > 0) {
      state.feeders[home] -= 1;
      fed = true;
    }
    if (fed && a.ageDays >= ANIMAL_MATURE_DAYS) {
      const q = productQuality(state, a);
      const box = state.animalBox.find((s) => s.id === productOf(a) && s.q === q);
      if (box) box.n += 1;
      else state.animalBox.push({ id: productOf(a), q, n: 1 });
    }
    if (!fed) {
      hungry++;
      a.friendship = Math.max(0, a.friendship - MISSED_MEAL_POINTS);
    }
    a.fed = false;
    a.petted = false;
    a.ageDays += 1;
  }
  if (hungry) notes.push(`${hungry} animal${hungry === 1 ? ' went' : 's went'} hungry. Fill the feeders with hay on rainy days and in winter.`);
  return notes;
}
