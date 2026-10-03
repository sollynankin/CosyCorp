// DayContext: derived data rebuilt from state (CLAUDE.md rule 3). Never saved.
// It is rebuilt when the farm layout revision, the day or the story water state changes.
import type { ItemId, Quality } from '../data/types';
import { computeHeat, computePower, waterMultiplier, type PowerInfo } from './power';
import type { GameState } from './state';

export type SimEvent =
  | { type: 'toast'; text: string }
  | { type: 'panel'; panel: string; building?: string }
  | { type: 'gain'; item: ItemId; n: number; q: Quality }
  | { type: 'fx'; fx: 'till' | 'water' | 'harvest' | 'chop' | 'mine' | 'splash' | 'poof' | 'plant' | 'place' | 'sparkle'; map: string; x: number; y: number }
  | { type: 'warp'; to: string }
  | { type: 'scene'; id: string }
  | { type: 'dayEnd' }
  | { type: 'catch'; item: ItemId; q: Quality }
  | { type: 'escape' }
  | { type: 'sound'; name: string }
  | { type: 'dialogue'; villager: string; text: string; hearts: number; gained: number };

export interface DayContext {
  /** key the context was built for; see contextKey */
  key: string;
  power: PowerInfo;
  /** per farm tile: heat 0..1 (winter growth) */
  heat: number[];
  /** events produced since the game layer last drained them */
  events: SimEvent[];
}

export function contextKey(state: GameState): string {
  return `${state.farm.layoutRev}|${state.day}|${state.weather}|${waterMultiplier(state.flags)}|${state.flags.includes('greenhouse')}`;
}

export function buildContext(state: GameState, events: SimEvent[] = []): DayContext {
  const power = computePower(state);
  return { key: contextKey(state), power, heat: computeHeat(state, power), events };
}

/** Returns ctx if still valid, else a rebuilt one that keeps the pending events. */
export function ensureContext(state: GameState, ctx: DayContext): DayContext {
  if (ctx.key === contextKey(state)) return ctx;
  const fresh = buildContext(state, ctx.events);
  ctx.key = fresh.key;
  ctx.power = fresh.power;
  ctx.heat = fresh.heat;
  return ctx;
}

export function emit(ctx: DayContext, e: SimEvent): void {
  ctx.events.push(e);
}

export function toast(ctx: DayContext, text: string): void {
  ctx.events.push({ type: 'toast', text });
}
