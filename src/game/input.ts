// Keyboard + mouse input. Produces commands for the Game; never touches state directly.
// InputSource is the extension point for a gamepad: implement moveVector() and the action callbacks.
import { HOTBAR_SLOTS } from '../data/balance';
import { entityAt, facingTile, inReach, isBlocked, placementProblem, type Command } from '../sim';
import { getItem } from '../data';
import type { Dir } from '../data/types';
import { DX, DY, dirFromVector, findPath, parseMap } from '../world';
import type { Renderer } from '../render/renderer';
import type { Game } from './game';

export interface InputSource {
  /** screen-space move vector (x right, y down), length ≤ 1 */
  moveVector(): [number, number];
}

export interface InputCallbacks {
  /** keys that open panels and menus (handled by the UI) */
  onKey(key: string, e: KeyboardEvent): boolean;
  /** true while a modal owns the keyboard */
  modalOpen(): boolean;
}

type PendingAction = { cmd: Command; tx: number; ty: number } | null;

export class Input implements InputSource {
  private keys = new Set<string>();
  private mouse = { x: 0, y: 0, inside: false };
  private path: [number, number][] = [];
  private pending: PendingAction = null;
  private stuck = 0;
  private lastPos = { x: 0, y: 0 };
  buildMode: { active: boolean; onClick(x: number, y: number, button: number): void; onHover(x: number, y: number): void; onRelease(): void } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: Game,
    private readonly renderer: Renderer,
    private readonly cb: InputCallbacks,
  ) {
    window.addEventListener('keydown', (e) => this.keyDown(e));
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.setReel(false);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.setReel(false);
    });
    canvas.addEventListener('mousemove', (e) => {
      this.mouse = { x: e.clientX, y: e.clientY, inside: true };
    });
    canvas.addEventListener('mouseleave', () => (this.mouse.inside = false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => this.click(e));
    window.addEventListener('mouseup', () => {
      this.buildMode?.onRelease();
      this.setReel(false);
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.shiftKey || e.ctrlKey) {
        const dir = Math.sign(e.deltaY);
        const s = this.game.state.player.selected;
        this.game.send({ type: 'select', slot: (s + dir + HOTBAR_SLOTS) % HOTBAR_SLOTS });
      } else this.renderer.rig.zoom(Math.sign(e.deltaY) * 0.08);
    }, { passive: false });
    game.tickHook = () => this.followPath();
  }

  moveVector(): [number, number] {
    if (this.cb.modalOpen()) return [0, 0];
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    return [x, y];
  }

  /** Called every frame: updates the move intent and the hovered tile. */
  update(): void {
    const [ix, iy] = this.moveVector();
    if (ix !== 0 || iy !== 0) this.cancelPath();
    const [mx, my] = this.renderer.rig.inputToMap(ix, iy);
    this.game.moveIntent = [mx, my];
    const t = this.hoverTile();
    if (t) {
      const ok = inReach(this.game.state, t[0], t[1]);
      this.renderer.hover = { x: t[0], y: t[1], ok };
      if (this.buildMode?.active) this.buildMode.onHover(t[0], t[1]);
      else this.renderer.ghost = this.heldMachineGhost(t[0], t[1], ok);
    } else {
      this.renderer.hover = null;
      if (!this.buildMode?.active) this.renderer.ghost = null;
    }
  }

  /** With a machine in hand, preview where it would go (its front faces away from the player). */
  private heldMachineGhost(x: number, y: number, inReachNow: boolean) {
    const s = this.game.state;
    const st = s.player.inventory[s.player.selected];
    if (!st || s.player.map !== 'farm') return null;
    const item = getItem(st.id);
    if (item.category !== 'machine' || !item.places || entityAt(s, x, y)) return null;
    const dir = dirFromVector(x + 0.5 - s.player.x, y + 0.5 - s.player.y, s.player.facing) as Dir;
    return { type: item.places, x, y, dir, ok: inReachNow && placementProblem(s, item.places, x, y) === null };
  }

  hoverTile(): [number, number] | null {
    if (!this.mouse.inside) return null;
    const r = this.canvas.getBoundingClientRect();
    const nx = ((this.mouse.x - r.left) / r.width) * 2 - 1;
    const ny = -((this.mouse.y - r.top) / r.height) * 2 + 1;
    const p = this.renderer.rig.groundAt(nx, ny);
    if (!p) return null;
    const m = parseMap(this.game.state.player.map);
    const x = Math.floor(p.x);
    const y = Math.floor(p.z);
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return null;
    return [x, y];
  }

  private keyDown(e: KeyboardEvent): void {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    // While fishing, Space holds the reel and Esc reels in; nothing else reaches the game.
    if (this.game.state.player.fishing && !this.cb.modalOpen()) {
      e.preventDefault();
      if (e.code === 'Space' && !e.repeat) this.setReel(true);
      if (e.key === 'Escape') this.game.send({ type: 'stopFishing' });
      return;
    }
    if (this.cb.onKey(e.key, e)) {
      e.preventDefault();
      return;
    }
    if (this.cb.modalOpen()) return;
    this.keys.add(e.code);
    const g = this.game;
    if (/^Digit[0-9]$/.test(e.code)) {
      const n = Number(e.code.slice(5));
      g.send({ type: 'select', slot: n === 0 ? 9 : n - 1 });
      return;
    }
    switch (e.code) {
      case 'Space': {
        e.preventDefault();
        const [x, y] = this.actionTile();
        g.send({ type: 'use', x, y });
        break;
      }
      case 'KeyE': {
        const [x, y] = this.actionTile();
        g.send({ type: 'interact', x, y });
        break;
      }
      case 'BracketLeft':
        this.renderer.rig.rotate(-1);
        break;
      case 'BracketRight':
        this.renderer.rig.rotate(1);
        break;
    }
  }

  /** Hovered tile if it is in reach, else the tile in front of the player. */
  private actionTile(): [number, number] {
    const t = this.hoverTile();
    if (t && inReach(this.game.state, t[0], t[1])) return t;
    return facingTile(this.game.state);
  }

  private reeling = false;

  /** Sends a reel command only when the button state changes (the sim keeps it until the next one). */
  private setReel(hold: boolean): void {
    if (hold === this.reeling) return;
    this.reeling = hold;
    if (this.game.state.player.fishing || !hold) this.game.send({ type: 'reel', hold });
  }

  private click(e: MouseEvent): void {
    if (this.cb.modalOpen()) return;
    if (this.game.state.player.fishing) {
      if (e.button === 0) this.setReel(true);
      return;
    }
    const t = this.hoverTile();
    if (!t) return;
    if (this.buildMode?.active) {
      this.buildMode.onClick(t[0], t[1], e.button);
      return;
    }
    const [x, y] = t;
    const s = this.game.state;
    const sel = s.player.inventory[s.player.selected];
    // Left click uses the selected item; right click interacts. Empty hands: left click interacts.
    const cmd: Command = e.button === 2 || !sel ? { type: 'interact', x, y } : { type: 'use', x, y };
    if (inReach(s, x, y)) {
      this.cancelPath();
      this.game.send(cmd);
      return;
    }
    // Out of reach: walk next to it, then act on arrival.
    this.walkTo(x, y, cmd);
  }

  private walkTo(x: number, y: number, cmd: Command): void {
    const s = this.game.state;
    const m = parseMap(s.player.map);
    const sx = Math.floor(s.player.x);
    const sy = Math.floor(s.player.y);
    const walk = (tx: number, ty: number) => !isBlocked(s, s.player.map, tx, ty);
    // Goal: the target itself if walkable (then act from the last step), else the best free neighbour.
    let best: [number, number][] | null = null;
    const goals: [number, number][] = walk(x, y) ? [[x, y]] : [];
    for (let d = 0; d < 4; d++) if (walk(x + DX[d], y + DY[d])) goals.push([x + DX[d], y + DY[d]]);
    for (const [gx, gy] of goals) {
      const p = findPath(m.w, m.h, walk, sx, sy, gx, gy);
      if (p && (!best || p.length < best.length)) best = p;
    }
    if (!best) return;
    this.path = best;
    this.pending = { cmd, tx: x, ty: y };
    this.stuck = 0;
  }

  cancelPath(): void {
    this.path = [];
    this.pending = null;
  }

  private followPath(): Command[] {
    const s = this.game.state;
    const p = s.player;
    if (this.pending && inReach(s, this.pending.tx, this.pending.ty) && this.path.length <= 1) {
      const cmd = this.pending.cmd;
      this.cancelPath();
      return [cmd];
    }
    if (this.path.length === 0) return [];
    const [wx, wy] = this.path[0];
    const dx = wx + 0.5 - p.x;
    const dy = wy + 0.5 - p.y;
    if (Math.hypot(dx, dy) < 0.2) {
      this.path.shift();
      return this.followPath();
    }
    if (Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y) < 0.01) this.stuck++;
    else this.stuck = 0;
    this.lastPos = { x: p.x, y: p.y };
    if (this.stuck > 8) {
      this.cancelPath();
      return [];
    }
    return [{ type: 'move', dx, dy }];
  }
}
