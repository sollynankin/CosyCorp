// Overnight world upkeep: stumps regrow, forage respawns (DESIGN.md §12).
import { FORAGE_PER_DAY, TREE_HP } from '../data/balance';
import { FORAGE_TABLE } from '../data/forage';
import { STATIC_MAPS, parseMap } from '../world';
import { seasonOf } from './calendar';
import { rngInt, rngPick } from './rng';
import type { GameState } from './state';

export function regrowTrees(state: GameState): void {
  for (const def of STATIC_MAPS) {
    if (!def.treesRegrow) continue;
    for (const o of state.maps[def.id].objects) {
      if (o?.kind !== 'tree' || !o.stump) continue;
      o.regrow -= 1;
      if (o.regrow <= 0) {
        o.stump = false;
        o.hp = TREE_HP;
      }
    }
  }
}

/** Clears yesterday's forage and spawns new items on free forage spots ('*'). */
export function respawnForage(state: GameState, day: number): void {
  const table = FORAGE_TABLE[seasonOf(day)];
  for (const def of STATIC_MAPS) {
    const n = FORAGE_PER_DAY[def.id] ?? 0;
    const m = parseMap(def.id);
    const objs = state.maps[def.id].objects;
    const spots: number[] = [];
    for (let i = 0; i < objs.length; i++) {
      if (objs[i]?.kind === 'forage') objs[i] = null;
      if (m.seedObjects[i] === 'forageSpot' && !objs[i]) spots.push(i);
    }
    for (let k = 0; k < n && spots.length > 0; k++) {
      const pick = rngInt(state, 0, spots.length - 1);
      const i = spots.splice(pick, 1)[0];
      objs[i] = { kind: 'forage', item: rngPick(state, table) };
    }
  }
}
