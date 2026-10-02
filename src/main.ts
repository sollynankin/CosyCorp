// Entry point: build the game, renderer, input and UI, then run the frame loop.
import './style.css';
import { newGame } from './sim';
import { Game } from './game/game';
import { Input } from './game/input';
import { Renderer } from './render/renderer';
import { $ } from './ui/dom';
import { Hud } from './ui/hud';

const canvas = $('#view') as HTMLCanvasElement;
const uiRoot = $('#ui');

const game = new Game(newGame(Date.now() % 100000));
const renderer = new Renderer(canvas, 1);
const hud = new Hud(uiRoot, game);
const input = new Input(canvas, game, renderer, {
  onKey: () => false,
  modalOpen: () => false,
});

game.on((e) => {
  if (e.type === 'toast') hud.toast(e.text);
  if (e.type === 'fx') renderer.effects.spawn(e.fx, e.map, e.x, e.y);
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
  hud.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug handles (CLAUDE.md: game.state, game.send(...), renderer.rig in the console).
Object.assign(window, { game, renderer });
