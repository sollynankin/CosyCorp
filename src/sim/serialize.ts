// Save format: the GameState as JSON (DESIGN.md §15). migrate() upgrades older versions in place.
import { ALL_MAP_IDS } from '../world';
import { newGame } from './init';
import { SAVE_VERSION, type GameState } from './state';
import { initVillagers } from './villagers';

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState {
  const raw = JSON.parse(json) as Partial<GameState> & { version?: number };
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') throw new Error('Not a Cosycorp save.');
  if (raw.version > SAVE_VERSION) throw new Error('This save is from a newer version of the game.');
  return migrate(raw as GameState);
}

/**
 * Fills fields added after a save was written, using new-game defaults. Keep this additive: never drop
 * player progress.
 */
export function migrate(s: GameState): GameState {
  const fresh = newGame(s.seed ?? 1);
  for (const k of Object.keys(fresh) as (keyof GameState)[]) {
    if (s[k] === undefined) (s as unknown as Record<string, unknown>)[k] = fresh[k];
  }
  for (const id of ALL_MAP_IDS) if (!s.maps[id]) s.maps[id] = fresh.maps[id];
  const villagers = initVillagers();
  for (const id of Object.keys(villagers)) if (!s.villagers[id]) s.villagers[id] = villagers[id];
  for (const k of Object.keys(fresh.player) as (keyof GameState['player'])[]) {
    if (s.player[k] === undefined) (s.player as unknown as Record<string, unknown>)[k] = fresh.player[k];
  }
  // A cast saved mid-reel from before sizes existed has no length; drop it rather than reel a NaN fish.
  const f = s.player.fishing;
  if (f && (f.lenCm === undefined || f.difficulty === undefined || f.reelTicks === undefined)) s.player.fishing = null;
  s.version = SAVE_VERSION;
  return s;
}
