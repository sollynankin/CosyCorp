// Hooks that run when the player enters a map: mine depth and story objects, festivals, heart events.
import { MINE_FLOORS, mineFloorNumber, parseMap } from '../world';
import type { DayContext } from './context';
import { festivalTick, maybeStartFestival } from './festival';
import { updateQuests } from './quests';
import { enterMine } from './mine';
import { checkSceneTriggers } from './scenes';
import type { GameState } from './state';

/** Story objects that wait on a mine floor while a quest needs them (picked up with E). */
const STORY_OBJECTS: { item: string; floor: number }[] = [
  { item: 'logbook', floor: 5 },
  { item: 'seed_tin', floor: 3 },
];

export function enterMap(state: GameState, ctx: DayContext, from: string, to: string): void {
  if (from === 'town' && to !== 'town') festivalTick(state, ctx);
  const floor = mineFloorNumber(to);
  if (floor > 0) {
    state.mineDeepest = Math.min(MINE_FLOORS, Math.max(state.mineDeepest, floor));
    enterMine(state, ctx, from, to);
    placeStoryObjects(state, to, floor);
  }
  if (to === 'town') maybeStartFestival(state, ctx);
  updateQuests(state, ctx);
  checkSceneTriggers(state);
}

function placeStoryObjects(state: GameState, map: string, floor: number): void {
  const m = parseMap(map);
  const objs = state.maps[map].objects;
  for (const so of STORY_OBJECTS) {
    if (so.floor !== floor || state.flags.includes(`got_${so.item}`)) continue;
    const wanted = state.quests.active.some((q) => q.id === (so.item === 'logbook' ? 'undersluice' : 'seed_tin'));
    if (!wanted || objs.some((o) => o?.kind === 'story' && o.item === so.item)) continue;
    // The far corner of the floor from the ladder: the first open tile scanning up from the bottom right.
    for (let i = objs.length - 1; i >= 0; i--) {
      if (m.staticBlocked[i] || objs[i]) continue;
      objs[i] = { kind: 'story', item: so.item };
      break;
    }
  }
}
