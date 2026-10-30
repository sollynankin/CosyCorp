// Keyboard, mouse and gamepad input. Produces commands for the Game; never touches state directly.
// InputSource is the shared shape of a movement device: Input merges the keyboard's vector with GamepadSource's,
// so either works at any time (and both at once).
import { HOTBAR_SLOTS, PLAYER_SPEED } from '../data/balance';
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
  /** moves a focus ring around the open modal and presses what it rests on (gamepad menu navigation) */
  nav?: PadNavigator;
  /** a short message for the player ("Controller connected") */
  toast?(text: string): void;
  /** a controller button was pressed: a user gesture, so audio may start */
  onPadActivity?(): void;
}

/** What the gamepad needs from the UI to drive menus. */
export interface PadNavigator {
  /** move the focus ring one step: 0 up, 1 right, 2 down, 3 left */
  move(dir: Dir): void;
  /** press whatever has focus */
  activate(): void;
  /** forget the current focus (a new modal opened) */
  reset(): void;
}

// ---- Gamepad ----------------------------------------------------------------------------------------------
// The standard layout (Xbox naming): A use, B interact, X/Y cycle the hotbar, LB/RB rotate the camera, Start the
// menu. A held reels while fishing. GamepadSource turns raw pad state into a move vector and button events;
// Input decides what each event means at that moment (game, build mode, menu).

export type PadButton = 'a' | 'b' | 'x' | 'y' | 'lb' | 'rb' | 'lt' | 'rt' | 'back' | 'start' | 'up' | 'down' | 'left' | 'right';
export interface PadEvent {
  button: PadButton;
  phase: 'press' | 'repeat' | 'release';
  /** a real button, the d-pad, or the left stick pushed past the menu threshold */
  via: 'button' | 'dpad' | 'stick';
}
/** The parts of a Gamepad the source reads (so tests can supply plain objects). */
export interface PadLike {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
  readonly connected?: boolean;
  readonly mapping?: string;
}

/** Button index → name for the "standard" mapping. */
export const PAD_BUTTONS: Record<number, PadButton> = {
  0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 6: 'lt', 7: 'rt', 8: 'back', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right',
};
/** Sticks closer to centre than this read as zero (drift), radially so diagonals aren't clipped. */
export const STICK_DEADZONE = 0.2;
/** A stick counts as a d-pad press in menus beyond this. */
export const STICK_MENU_THRESHOLD = 0.6;
/** Held buttons repeat after this long, then at this rate (ms). */
export const PAD_REPEAT_DELAY = 380;
export const PAD_REPEAT_RATE = 140;
const REPEATING: ReadonlySet<PadButton> = new Set<PadButton>(['a', 'up', 'down', 'left', 'right']);
const DPAD = new Set<PadButton>(['up', 'down', 'left', 'right']);

/** Radial dead zone with a gentle response curve: small pushes walk slowly, a full push is full speed. */
export function stickVector(x: number, y: number, deadzone = STICK_DEADZONE): [number, number] {
  const len = Math.hypot(x, y);
  if (len <= deadzone) return [0, 0];
  const scaled = Math.min(1, (len - deadzone) / (1 - deadzone));
  const k = Math.pow(scaled, 1.25) / len;
  return [x * k, y * k];
}

/** Adds movement vectors from several devices, keeping the result within the unit circle. */
export function mergeMoves(vectors: readonly (readonly [number, number])[]): [number, number] {
  let x = 0;
  let y = 0;
  for (const v of vectors) {
    x += v[0];
    y += v[1];
  }
  const len = Math.hypot(x, y);
  return len > 1 ? [x / len, y / len] : [x, y];
}

export class GamepadSource implements InputSource {
  private left: [number, number] = [0, 0];
  private right: [number, number] = [0, 0];
  private readonly down = new Set<string>();
  private readonly nextRepeat = new Map<string, number>();
  private connectedNow = false;

  constructor(
    private readonly getPads: () => readonly (PadLike | null | undefined)[] = () => (typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []),
  ) {}

  get connected(): boolean {
    return this.connectedNow;
  }

  /** Left stick, dead-zoned. Valid after poll(). */
  moveVector(): [number, number] {
    return this.left;
  }

  /** Right stick, dead-zoned (the camera zoom). Valid after poll(). */
  lookVector(): [number, number] {
    return this.right;
  }

  held(button: PadButton): boolean {
    return this.down.has(button);
  }

  /** The first connected pad, preferring one with the standard layout. */
  private pad(): PadLike | null {
    let fallback: PadLike | null = null;
    for (const p of this.getPads()) {
      if (!p || p.connected === false) continue;
      if (p.mapping === 'standard') return p;
      fallback ??= p;
    }
    return fallback;
  }

  /** Reads the pad and returns the button events since the last call. `now` is in milliseconds. */
  poll(now: number): PadEvent[] {
    const events: PadEvent[] = [];
    const pad = this.pad();
    this.connectedNow = !!pad;
    if (!pad) {
      this.left = [0, 0];
      this.right = [0, 0];
      for (const key of [...this.down]) this.settle(key, false, now, events);
      return events;
    }
    for (const [index, name] of Object.entries(PAD_BUTTONS)) {
      const b = pad.buttons[Number(index)];
      this.settle(name, !!b && (b.pressed || b.value > 0.5), now, events, DPAD.has(name) ? 'dpad' : 'button');
    }
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    this.left = stickVector(ax, ay);
    this.right = stickVector(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
    // The left stick doubles as a d-pad in menus (Input ignores these events while walking).
    const dir: PadButton = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : ay > 0 ? 'down' : 'up';
    const pushed = Math.hypot(ax, ay) > STICK_MENU_THRESHOLD;
    for (const d of DPAD) this.settle(`stick-${d}`, pushed && d === dir, now, events, 'stick');
    return events;
  }

  private settle(key: string, pressed: boolean, now: number, out: PadEvent[], via: PadEvent['via'] = 'button'): void {
    const stick = key.startsWith('stick-');
    const button = (stick ? key.slice(6) : key) as PadButton;
    const was = this.down.has(key);
    if (pressed && !was) {
      this.down.add(key);
      this.nextRepeat.set(key, now + PAD_REPEAT_DELAY);
      out.push({ button, phase: 'press', via });
    } else if (pressed && was && REPEATING.has(button) && now >= (this.nextRepeat.get(key) ?? Infinity)) {
      this.nextRepeat.set(key, now + PAD_REPEAT_RATE);
      out.push({ button, phase: 'repeat', via });
    } else if (!pressed && was) {
      this.down.delete(key);
      this.nextRepeat.delete(key);
      out.push({ button, phase: 'release', via: stick ? 'stick' : DPAD.has(button) ? 'dpad' : 'button' });
    }
  }
}

/** Gamepad controls as shown in the pause menu. */
export const PAD_CONTROLS: [string, string][] = [
  ['Left stick', 'walk (push gently to walk slowly)'],
  ['A', 'use the selected item on the tile in front; hold to keep going, or to reel in a fish'],
  ['B', 'interact: talk, open doors, harvest, pick up'],
  ['X / Y', 'previous / next hotbar slot'],
  ['LB / RB', 'rotate the camera'],
  ['Right stick', 'zoom'],
  ['Start', 'menu (and reel in while fishing)'],
  ['Back', 'backpack'],
  ['D-pad', 'up journal · left craft · right build mode · down flow view'],
  ['In menus', 'D-pad or left stick moves, A presses, B closes'],
  ['Build mode', 'A place (hold and walk to paint belts) · B pick up · X / Y choose machine · RT rotate'],
];

/** Walking ramps up and down over roughly this many seconds, instead of jumping to full speed and back. */
const MOVE_RAMP_UP = 0.1;
const MOVE_RAMP_DOWN = 0.07;

type PendingAction = { cmd: Command; tx: number; ty: number } | null;

/** Wheel delta that counts as one step (a standard mouse notch is 100). */
const WHEEL_STEP = 80;

export class Input implements InputSource {
  private keys = new Set<string>();
  private mouse = { x: 0, y: 0, inside: false };
  private path: [number, number][] = [];
  private pending: PendingAction = null;
  private stuck = 0;
  private lastPos = { x: 0, y: 0 };
  /** the eased move vector (screen space); a partial length walks proportionally slower */
  private eased: [number, number] = [0, 0];
  private lastUpdate = performance.now();
  private wheelAcc = 0;
  private wheelAt = 0;
  /** the gamepad; its vector is merged with the keyboard's every frame */
  readonly pad = new GamepadSource();
  /** which device moved last: the hover cursor follows the mouse, or the tile in front of the player */
  private device: 'mouse' | 'pad' = 'mouse';
  buildMode: {
    active: boolean;
    onClick(x: number, y: number, button: number): void;
    onHover(x: number, y: number): void;
    onRelease(): void;
    rotate(): void;
    /** step the selected machine in the build bar (-1 previous, 1 next) */
    cycle(step: number): void;
  } | null = null;

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
      this.device = 'mouse';
    });
    canvas.addEventListener('mouseleave', () => (this.mouse.inside = false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      this.device = 'mouse';
      this.click(e);
    });
    window.addEventListener('mouseup', () => {
      this.buildMode?.onRelease();
      this.setReel(false);
    });
    // The wheel steps through the hotbar; Ctrl+wheel zooms. A notched mouse sends ~100 per click and a
    // trackpad a stream of small deltas, so accumulate and step once per WHEEL_STEP.
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) {
        this.renderer.rig.zoom(Math.sign(e.deltaY) * 0.08);
        return;
      }
      if (this.cb.modalOpen()) return;
      const now = performance.now();
      if (now - this.wheelAt > 250) this.wheelAcc = 0;
      this.wheelAt = now;
      // deltaMode 1 (Firefox with a notched wheel) reports lines, not pixels
      this.wheelAcc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      // Steps from one event build on each other (the sim applies the commands on the next tick).
      let slot = this.game.state.player.selected;
      while (Math.abs(this.wheelAcc) >= WHEEL_STEP) {
        const dir = Math.sign(this.wheelAcc);
        this.wheelAcc -= dir * WHEEL_STEP;
        if (this.buildMode?.active) this.buildMode.cycle(dir);
        else {
          slot = (slot + dir + HOTBAR_SLOTS) % HOTBAR_SLOTS;
          this.game.send({ type: 'select', slot });
        }
      }
    }, { passive: false });
    game.tickHook = () => this.followPath();
    window.addEventListener('gamepadconnected', () => this.cb.toast?.('Controller connected.'));
    window.addEventListener('gamepaddisconnected', () => {
      this.setReel(false);
      this.cb.toast?.('Controller disconnected.');
    });
  }

  /** WASD and the arrow keys. */
  private keyboardVector(): [number, number] {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    return [x, y];
  }

  /** Keyboard and gamepad together: either works at any time, and pushing both just adds up (capped at full speed). */
  moveVector(): [number, number] {
    if (this.cb.modalOpen()) return [0, 0];
    return mergeMoves([this.keyboardVector(), this.pad.moveVector()]);
  }

  /** Called every frame: reads the pad, updates the move intent and the hovered tile. */
  update(): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastUpdate) / 1000);
    this.lastUpdate = now;
    for (const ev of this.pad.poll(now)) this.onPad(ev);
    const [, lookY] = this.pad.lookVector();
    if (lookY !== 0 && !this.cb.modalOpen()) this.renderer.rig.zoom(lookY * dt * 1.4);
    const [rx, ry] = this.moveVector();
    if (rx !== 0 || ry !== 0) this.cancelPath();
    const [px, py] = this.pad.moveVector();
    if (px !== 0 || py !== 0) this.device = 'pad';
    const [ix, iy] = this.ease(rx, ry, dt);
    const [mx, my] = this.renderer.rig.inputToMap(ix, iy);
    this.game.moveIntent = [mx, my];
    // The mouse points at a tile; with a pad the target is the tile in front of the player.
    const t = this.device === 'pad' && !this.cb.modalOpen() && this.pad.connected ? this.facingInBounds() : this.hoverTile();
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

  /**
   * Eases the raw stick or key vector so the player accelerates and brakes instead of snapping between
   * standing and full speed. The sim already scales a short vector to a slower step (cmdMove).
   */
  private ease(rx: number, ry: number, dt: number): [number, number] {
    const e = this.eased;
    for (let k = 0; k < 2; k++) {
      const target = k === 0 ? rx : ry;
      const speeding = Math.abs(target) > Math.abs(e[k]);
      e[k] += (target - e[k]) * (1 - Math.exp(-dt / (speeding ? MOVE_RAMP_UP : MOVE_RAMP_DOWN)));
      if (target === 0 && Math.abs(e[k]) < 0.03) e[k] = 0;
    }
    return [e[0], e[1]];
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

  private facingInBounds(): [number, number] | null {
    const [x, y] = facingTile(this.game.state);
    const m = parseMap(this.game.state.player.map);
    return x < 0 || y < 0 || x >= m.w || y >= m.h ? null : [x, y];
  }

  // ---- Gamepad buttons -----------------------------------------------------------------------------------

  private onPad(ev: PadEvent): void {
    if (ev.phase !== 'release') this.cb.onPadActivity?.();
    // Walking is not "using the pad" for stick-as-dpad events; any real button is.
    if (ev.phase !== 'release' && ev.via !== 'stick') this.device = 'pad';
    if (this.cb.modalOpen()) this.padInMenu(ev);
    else if (ev.via !== 'stick') this.padInGame(ev);
  }

  /** Menus: the d-pad (or stick) moves the focus ring, A presses, B closes, Start toggles the menu. */
  private padInMenu(ev: PadEvent): void {
    if (ev.phase === 'release') return;
    const key = (k: string) => new KeyboardEvent('keydown', { key: k });
    switch (ev.button) {
      case 'a':
        // Scenes and dialogue advance on a key; everything else is a button to press.
        if (ev.phase === 'press' && !this.cb.onKey(' ', key(' '))) this.cb.nav?.activate();
        break;
      case 'b':
      case 'start':
        if (ev.phase === 'press') this.cb.onKey('Escape', key('Escape'));
        break;
      case 'back':
        if (ev.phase === 'press') this.cb.onKey('i', key('i'));
        break;
      case 'up':
        this.cb.nav?.move(0);
        break;
      case 'right':
        this.cb.nav?.move(1);
        break;
      case 'down':
        this.cb.nav?.move(2);
        break;
      case 'left':
        this.cb.nav?.move(3);
        break;
    }
  }

  /** The game: A uses (and reels), B interacts, X/Y cycle, LB/RB turn the camera, Start opens the menu. */
  private padInGame(ev: PadEvent): void {
    const g = this.game;
    const fishing = !!g.state.player.fishing;
    const build = this.buildMode?.active ? this.buildMode : null;
    if (ev.button === 'a' && ev.phase === 'release') {
      this.setReel(false);
      build?.onRelease();
      return;
    }
    if (ev.phase === 'release') return;
    const press = ev.phase === 'press';
    const key = (k: string) => this.cb.onKey(k, new KeyboardEvent('keydown', { key: k }));
    switch (ev.button) {
      case 'a': {
        if (fishing) {
          if (press) this.setReel(true);
          return;
        }
        const [x, y] = facingTile(g.state);
        if (build) build.onClick(x, y, 0);
        else {
          this.cancelPath();
          g.send({ type: 'use', x, y });
        }
        break;
      }
      case 'b': {
        if (!press) return;
        if (fishing) {
          g.send({ type: 'stopFishing' });
          return;
        }
        const [x, y] = facingTile(g.state);
        if (build) build.onClick(x, y, 2);
        else g.send({ type: 'interact', x, y });
        break;
      }
      case 'start':
        if (!press) return;
        if (fishing) g.send({ type: 'stopFishing' });
        else key('Escape');
        break;
      case 'x':
      case 'y': {
        if (!press) return;
        const step = ev.button === 'x' ? -1 : 1;
        if (build) build.cycle(step);
        else g.send({ type: 'select', slot: (g.state.player.selected + step + HOTBAR_SLOTS) % HOTBAR_SLOTS });
        break;
      }
      case 'lb':
        if (press) this.renderer.rig.rotate(-1);
        break;
      case 'rb':
        if (press) this.renderer.rig.rotate(1);
        break;
      case 'rt':
        if (press) build?.rotate();
        break;
      // The d-pad and Back open the panels the keyboard opens with a letter.
      case 'back':
        if (press) key('i');
        break;
      case 'up':
        if (press) key('j');
        break;
      case 'left':
        if (press) key('c');
        break;
      case 'right':
        if (press) key('b');
        break;
      case 'down':
        if (press) key('f');
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
    let dx = wx + 0.5 - p.x;
    let dy = wy + 0.5 - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.2) {
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
    // Full speed along the path, but never a step longer than the distance left (no overshoot at corners).
    const k = Math.min(1, dist / PLAYER_SPEED) / dist;
    dx *= k;
    dy *= k;
    return [{ type: 'move', dx, dy }];
  }
}
