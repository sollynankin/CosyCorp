// Crafting (C) and cooking (farmhouse kitchen). Recipes are data; a recipe is usable when it is `learned`
// from the start or its id is in state.recipes (story and quest rewards add them, DESIGN.md §0).
import { getItem, getRecipe, RECIPES } from '../data';
import type { RecipeDef } from '../data/types';
import { giveItem } from './actions';
import type { CommandResult } from './commands';
import { toast, type DayContext } from './context';
import { hasInputs, removeInput } from './inventory';
import type { GameState } from './state';

export function knowsRecipe(state: GameState, r: RecipeDef): boolean {
  return r.learned || state.recipes.includes(r.id);
}

/** Known recipes for a hand station ('craft' or 'cook'), in data order. */
export function knownRecipes(state: GameState, station: 'craft' | 'cook'): RecipeDef[] {
  return RECIPES.filter((r) => r.station === station && knowsRecipe(state, r));
}

/** Teaches recipes; returns the ids that were new. */
export function learnRecipes(state: GameState, ids: string[]): string[] {
  const fresh = ids.filter((id) => !state.recipes.includes(id));
  state.recipes.push(...fresh);
  return fresh;
}

export function craftRecipe(state: GameState, ctx: DayContext, recipeId: string, times: number): CommandResult {
  let r: RecipeDef;
  try {
    r = getRecipe(recipeId);
  } catch {
    return { ok: false, reason: 'Unknown recipe.' };
  }
  if (r.station !== 'craft' && r.station !== 'cook') return { ok: false, reason: 'That is made by a machine.' };
  if (!knowsRecipe(state, r)) return { ok: false, reason: "You don't know that recipe yet." };
  const n = Math.max(1, Math.floor(times));
  const inv = state.player.inventory;
  if (!hasInputs(inv, r.inputs, n)) return { ok: false, reason: 'Missing ingredients.' };
  for (let k = 0; k < n; k++) for (const input of r.inputs) removeInput(inv, input);
  giveItem(state, ctx, r.output.item, r.output.count * n);
  toast(ctx, `${r.station === 'cook' ? 'Cooked' : 'Made'} ${r.output.count * n} × ${getItem(r.output.item).name}.`);
  return { ok: true };
}
