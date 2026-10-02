// localStorage autosave and file export/import. Browser-only (lives in game/, not sim/).
import { deserialize, serialize } from '../sim/serialize';
import type { GameState } from '../sim';

const KEY = 'hearthvale.save.v1';
const PREFS = 'hearthvale.prefs.v1';

export function saveLocal(state: GameState): boolean {
  try {
    localStorage.setItem(KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadLocal(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function hasLocalSave(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function exportSave(state: GameState): void {
  const blob = new Blob([serialize(state)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hearthvale-day${state.day + 1}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function importSave(file: File): Promise<GameState> {
  return file.text().then((t) => deserialize(t));
}

export interface Prefs {
  quality: 0 | 1 | 2;
  seenIntro: boolean;
}

export function loadPrefs(): Prefs {
  const def: Prefs = { quality: 1, seenIntro: false };
  try {
    return { ...def, ...(JSON.parse(localStorage.getItem(PREFS) ?? '{}') as Partial<Prefs>) };
  } catch {
    return def;
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS, JSON.stringify(p));
  } catch {
    // private mode: preferences just won't persist
  }
}
