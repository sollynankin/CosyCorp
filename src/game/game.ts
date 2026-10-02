// Glue between the pure sim and the browser: owns the state, a fixed-tick clock, the command queue and
// the event stream. UI and input talk to the game only through send() and the event listeners.
import { TICK_HZ } from '../data/balance';
import { applyCommand, buildContext, ensureContext, step, toast, type Command, type CommandResult, type DayContext, type GameState, type SimEvent } from '../sim';

export type Listener = (e: SimEvent) => void;

export class Game {
  state: GameState;
  ctx: DayContext;
  private queue: Command[] = [];
  private acc = 0;
  /** time multiplier for the sim clock (1 = normal); 0 pauses */
  speed = 1;
  /** paused by modals (dialogue, shops, reports) */
  pausedBy = new Set<string>();
  private listeners: Listener[] = [];
  private changeListeners: (() => void)[] = [];
  /** previous and current player positions for render interpolation */
  prev = { x: 0, y: 0, map: '' };
  /** the move vector held this tick (input sets it each frame) */
  moveIntent: [number, number] = [0, 0];
  /** per-tick hook that may add commands (click-to-move path following) */
  tickHook: (() => Command[]) | null = null;

  constructor(state: GameState) {
    this.state = state;
    this.ctx = buildContext(state);
    this.prev = { x: state.player.x, y: state.player.y, map: state.player.map };
  }

  load(state: GameState): void {
    this.state = state;
    this.ctx = buildContext(state);
    this.queue = [];
    this.prev = { x: state.player.x, y: state.player.y, map: state.player.map };
    this.emitChange();
  }

  get paused(): boolean {
    return this.pausedBy.size > 0 || this.speed === 0;
  }

  pause(reason: string, on: boolean): void {
    if (on) this.pausedBy.add(reason);
    else this.pausedBy.delete(reason);
  }

  /** Queue a command for the next tick. */
  send(cmd: Command): void {
    this.queue.push(cmd);
  }

  /** Apply a command right now without advancing time (menus while paused: buying, crafting). */
  now(cmd: Command): CommandResult {
    ensureContext(this.state, this.ctx);
    const r = applyCommand(this.state, this.ctx, cmd);
    if (!r.ok) toast(this.ctx, r.reason);
    ensureContext(this.state, this.ctx);
    this.drain();
    this.emitChange();
    return r;
  }

  on(fn: Listener): void {
    this.listeners.push(fn);
  }

  onChange(fn: () => void): void {
    this.changeListeners.push(fn);
  }

  emitChange(): void {
    for (const f of this.changeListeners) f();
  }

  private drain(): void {
    if (this.ctx.events.length === 0) return;
    const evs = this.ctx.events.splice(0, this.ctx.events.length);
    for (const e of evs) for (const f of this.listeners) f(e);
  }

  /** Advance real time. Returns the interpolation alpha for rendering. */
  advance(dtSeconds: number): number {
    const tickLen = 1 / TICK_HZ;
    if (this.paused) {
      // Menus still apply queued commands immediately (e.g. buying) without advancing time.
      if (this.queue.length) this.flushInstant();
      this.acc = 0;
      return 1;
    }
    this.acc += Math.min(dtSeconds, 0.25) * this.speed;
    let ticked = false;
    while (this.acc >= tickLen) {
      this.acc -= tickLen;
      this.tickOnce();
      ticked = true;
      if (this.paused) break;
    }
    if (ticked) this.emitChange();
    return this.acc / tickLen;
  }

  tickOnce(): void {
    const p = this.state.player;
    this.prev = { x: p.x, y: p.y, map: p.map };
    const cmds = this.queue.splice(0, this.queue.length);
    const extra = this.tickHook ? this.tickHook() : [];
    const [mx, my] = this.moveIntent;
    const all: Command[] = [...cmds, ...extra];
    if ((mx !== 0 || my !== 0) && !all.some((c) => c.type === 'move')) all.unshift({ type: 'move', dx: mx, dy: my });
    step(this.state, this.ctx, all);
    // Teleports (warps, waking up at home) must not be interpolated across.
    if (p.map !== this.prev.map || Math.hypot(p.x - this.prev.x, p.y - this.prev.y) > 2) this.prev = { x: p.x, y: p.y, map: p.map };
    this.drain();
  }

  private flushInstant(): void {
    const cmds = this.queue.splice(0, this.queue.length);
    for (const c of cmds) this.now(c);
  }
}

