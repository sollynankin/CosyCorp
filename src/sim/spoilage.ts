// Overnight spoilage (DESIGN.md §4): raw goods on belts and in machine buffers spoil; silos and chests keep.
import { getItem, getMachine } from '../data';
import type { GameState } from './state';

export function spoilOvernight(state: GameState): number {
  let spoiled = 0;
  for (const e of state.farm.entities) {
    const kind = getMachine(e.type).kind;
    if (kind === 'storage' || kind === 'chest') continue;
    const keep = e.belt.filter((b) => !getItem(b.item).spoils);
    spoiled += e.belt.length - keep.length;
    e.belt = keep;
    const outKeep = e.output.filter((s) => !getItem(s.id).spoils);
    for (const s of e.output) if (getItem(s.id).spoils) spoiled += s.n;
    e.output = outKeep;
    if (kind === 'crafter') {
      for (const id of Object.keys(e.input)) {
        if (getItem(id).spoils && e.input[id] > 0) {
          spoiled += e.input[id];
          e.input[id] = 0;
        }
      }
    }
  }
  state.today.spoiled += spoiled;
  state.season.spoiled += spoiled;
  return spoiled;
}
