// Scenes: heart events trigger on maps; story scenes are queued by quests. The UI shows the head of
// state.sceneQueue and answers with a sceneDone command, which applies the effects (DESIGN.md §9, §10).
import { SCENES } from '../data/scenes';
import type { SceneDef } from '../data/types';
import { giveItem } from './actions';
import { minuteOfClock } from './calendar';
import type { CommandResult } from './commands';
import { conditionsHold } from './conditions';
import type { DayContext } from './context';
import { learnRecipes } from './crafting';
import { updateQuests } from './quests';
import type { GameState } from './state';
import { addPoints } from './villagers';

const byId = new Map(SCENES.map((s) => [s.id, s]));

export function getScene(id: string): SceneDef {
  const s = byId.get(id);
  if (!s) throw new Error(`unknown scene: ${id}`);
  return s;
}

/** Queues the first heart event whose trigger holds on the player's map right now. */
export function checkSceneTriggers(state: GameState): void {
  if (state.sceneQueue.length > 0) return;
  const p = state.player;
  for (const s of SCENES) {
    const t = s.trigger;
    if (!t || t.map !== p.map || state.seenScenes.includes(s.id)) continue;
    if (t.from && state.minute < minuteOfClock(t.from)) continue;
    if (t.to && state.minute > minuteOfClock(t.to)) continue;
    if (!conditionsHold(state, t, s.villager)) continue;
    state.sceneQueue.push({ id: s.id });
    return;
  }
}

export function finishScene(state: GameState, ctx: DayContext, id: string, choice: number): CommandResult {
  const head = state.sceneQueue[0];
  if (!head || head.id !== id) return { ok: false, reason: 'No such scene.' };
  const s = getScene(id);
  state.sceneQueue.shift();
  if (!state.seenScenes.includes(id)) state.seenScenes.push(id);
  const e = s.effects;
  for (const f of e?.flags ?? []) if (!state.flags.includes(f)) state.flags.push(f);
  for (const [v, n] of Object.entries(e?.points ?? {})) addPoints(state, v, n);
  for (const it of e?.items ?? []) giveItem(state, ctx, it.item, it.n);
  if (e?.recipes) learnRecipes(state, e.recipes);
  const c = s.choices?.[choice];
  if (c) {
    if (c.points && s.villager) addPoints(state, s.villager, c.points);
    if (c.flag && !state.flags.includes(c.flag)) state.flags.push(c.flag);
  }
  updateQuests(state, ctx);
  return { ok: true };
}
