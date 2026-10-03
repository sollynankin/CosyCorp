// Entry point: build the game, renderer, input and UI, then run the frame loop.
import './style.css';
import { newGame, seasonOf } from './sim';
import { Game } from './game/game';
import { Input } from './game/input';
import { loadLocal, loadPrefs, saveLocal } from './game/save';
import { Renderer } from './render/renderer';
import { App } from './ui/app';
import { AudioEngine } from './ui/audio';
import { $ } from './ui/dom';
import { showTitle } from './ui/menu';

const canvas = $('#view') as HTMLCanvasElement;
const uiRoot = $('#ui');

const prefs = loadPrefs();
const saved = loadLocal();
const game = new Game(saved ?? newGame((Date.now() % 1000000) + 1));
const renderer = new Renderer(canvas, prefs.quality);
const audio = new AudioEngine(prefs.volume);
game.on((e) => audio.play(e));
const app = new App(uiRoot, game, renderer, audio);
const input = new Input(canvas, game, renderer, {
  onKey: (key, e) => app.onKey(key, e),
  modalOpen: () => app.modals.open,
});

input.buildMode = app.build;
showTitle(game, app.modals, !!saved);
window.addEventListener('resize', () => renderer.resize());

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  input.update();
  const alpha = game.advance(dt);
  const p = game.state.player;
  renderer.render(game.state, { px0: game.prev.x, py0: game.prev.y, px1: p.x, py1: p.y, alpha }, dt);
  app.frame();
  audio.update(game.state, seasonOf(game.state.day));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug handles for the browser console (see CLAUDE.md).
Object.assign(window, { game, renderer, app, audio, saveLocal });
