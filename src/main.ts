// Entry point: build the game, renderer, input and UI, then run the frame loop.
import './style.css';
import { newGame } from './sim';
import { Game } from './game/game';
import { Input } from './game/input';
import { loadLocal, loadPrefs } from './game/save';
import { Renderer } from './render/renderer';
import { App } from './ui/app';
import { $ } from './ui/dom';

const canvas = $('#view') as HTMLCanvasElement;
const uiRoot = $('#ui');

const prefs = loadPrefs();
const game = new Game(loadLocal() ?? newGame((Date.now() % 1000000) + 1));
const renderer = new Renderer(canvas, prefs.quality);
const app = new App(uiRoot, game, renderer);
const input = new Input(canvas, game, renderer, {
  onKey: (key, e) => app.onKey(key, e),
  modalOpen: () => app.modals.open,
});

window.addEventListener('resize', () => renderer.resize());

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  input.update();
  const alpha = game.advance(dt);
  const p = game.state.player;
  renderer.render(game.state, { px0: game.prev.x, py0: game.prev.y, px1: p.x, py1: p.y, alpha }, dt);
  app.hud.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug handles for the browser console (see CLAUDE.md).
Object.assign(window, { game, renderer, app });
