// Pause menu: save, export/import, quality, controls help, new game.
import type { Game } from '../game/game';
import { exportSave, importSave, loadPrefs, saveLocal, savePrefs } from '../game/save';
import { dateLabel, newGame } from '../sim';
import type { Renderer, Quality } from '../render/renderer';
import type { AudioEngine } from './audio';
import { h } from './dom';
import type { Modals } from './modal';

export const CONTROLS: [string, string][] = [
  ['WASD / arrows', 'walk (relative to the camera)'],
  ['Left click', 'use the selected item on a tile (walks there if far)'],
  ['Right click / E', 'interact: talk, open doors, harvest, pick up'],
  ['Space', 'use the selected item on the tile in front'],
  ['1–0, Shift+wheel', 'pick a hotbar slot'],
  ['Wheel', 'zoom'],
  ['[ and ]', 'rotate the camera'],
  ['I or Tab', 'backpack'],
  ['C', 'crafting'],
  ['B', 'build mode: click to place, drag to paint belts, R rotate, right click pick up'],
  ['F', 'Flow overlay'],
  ['J', 'journal: quests and friends'],
  ['Esc', 'close / menu'],
];

export function showMenu(game: Game, modals: Modals, renderer: Renderer, audio: AudioEngine, toast: (t: string) => void): void {
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } }) as HTMLInputElement;
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    importSave(f)
      .then((s) => {
        game.load(s);
        modals.close('menu');
        toast('Save loaded.');
      })
      .catch((e: Error) => toast(`Could not load: ${e.message}`));
  });
  modals.show({
    id: 'menu',
    title: 'Hearthvale',
    render: () => {
      const prefs = loadPrefs();
      return h(
        'div.menu',
        h('button.primary', { onclick: () => modals.close('menu') }, 'Resume'),
        h('button', { onclick: () => toast(saveLocal(game.state) ? 'Saved.' : 'Could not save (storage blocked).') }, 'Save now'),
        h('button', { onclick: () => exportSave(game.state) }, 'Export save file'),
        h('button', { onclick: () => fileInput.click() }, 'Import save file'),
        fileInput,
        h(
          'div.row',
          'Quality: ',
          (['Low', 'Medium', 'High'] as const).map((label, q) =>
            h(`button${prefs.quality === q ? '.primary' : ''}`, {
              onclick: () => {
                savePrefs({ ...prefs, quality: q as Quality });
                renderer.setQuality(q as Quality);
                modals.refresh();
              },
            }, label),
          ),
        ),
        volumeRow(audio),
        h('h3', 'Controls'),
        h('table.controls', CONTROLS.map(([k, v]) => h('tr', h('td.b', k), h('td', v)))),
        h('button', {
          onclick: () => {
            if (confirm('Start a new game? Your autosave will be replaced at the next morning.')) {
              game.load(newGame((Date.now() % 1000000) + 1));
              modals.close('menu');
            }
          },
        }, 'New game'),
      );
    },
  });
}

/** Title card on load: continue the autosave or start fresh. Time is paused while it is open. */
export function showTitle(game: Game, modals: Modals, hasSave: boolean): void {
  modals.show({
    id: 'title',
    title: 'Hearthvale',
    noClose: true,
    render: () =>
      h('div.menu.title-card',
        h('p.tagline', 'A run-down workshop-farm, a sleepy valley town, and the Works waiting to be woken.'),
        hasSave ? h('button.primary', { onclick: () => modals.close('title') }, `Continue (${dateLabel(game.state.day)})`) : null,
        h(`button${hasSave ? '' : '.primary'}`, {
          onclick: () => {
            if (hasSave && !confirm('Start a new game? Your autosave will be replaced at the next morning.')) return;
            if (hasSave) game.load(newGame((Date.now() % 1000000) + 1));
            modals.close('title');
          },
        }, 'New game'),
        h('p.muted.small', 'WASD to walk · click or Space to use a tool · E to talk and interact · I backpack · J journal · C craft · B build · F flow view · Esc menu'),
      ),
  });
}

/** The volume slider. It updates the label in place: re-rendering the menu mid-drag would drop the thumb. */
function volumeRow(audio: AudioEngine): HTMLElement {
  const label = h('span.vol-value', `${Math.round(audio.volume * 100)}%`);
  const slider = h('input.vol', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(audio.volume * 100), 'aria-label': 'Volume' }) as HTMLInputElement;
  slider.addEventListener('input', () => {
    audio.setVolume(Number(slider.value) / 100);
    label.textContent = `${slider.value}%`;
  });
  // Letting go saves the choice and plays a sample, so you can hear where you set it.
  slider.addEventListener('change', () => {
    savePrefs({ ...loadPrefs(), volume: audio.volume });
    audio.unlock();
    audio.sfx('harvest');
  });
  return h('div.row.volume', 'Volume: ', slider, label);
}
