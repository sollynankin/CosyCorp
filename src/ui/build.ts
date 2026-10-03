// Build mode (B): a palette of the machines in your backpack and a ghost under the cursor. Click places,
// dragging paints belt lines (each belt turns to follow the drag), R rotates, right click picks up, and a
// left click on an existing machine rotates it. Everything goes through sim commands.
import { getItem, getMachine } from '../data';
import type { Dir } from '../data/types';
import type { Game } from '../game/game';
import type { Renderer } from '../render/renderer';
import { entityAt, placementProblem } from '../sim';
import { dirFromVector } from '../world';
import { clear, h } from './dom';
import { itemIcon } from './icons';

export class BuildMode {
  active = false;
  item: string | null = null;
  dir: Dir = 1;
  private readonly bar = h('div.build-bar');
  private dragging = false;
  private last: [number, number] | null = null;
  private hover: [number, number] | null = null;
  /** tiles this drag placed belts on (their place commands may not have run yet) */
  private readonly painted = new Set<string>();

  constructor(root: HTMLElement, private readonly game: Game, private readonly renderer: Renderer, private readonly toast: (t: string) => void) {
    root.appendChild(this.bar);
    this.bar.style.display = 'none';
    game.onChange(() => this.active && this.renderBar());
  }

  toggle(): void {
    if (this.active) this.exit();
    else this.enter();
  }

  enter(): void {
    if (this.game.state.player.map !== 'farm') {
      this.toast('Machines are built on the farm.');
      return;
    }
    this.active = true;
    const machines = this.machineItems();
    if (!this.item || !machines.some((m) => m.id === this.item)) this.item = machines[0]?.id ?? null;
    this.bar.style.display = '';
    this.renderBar();
  }

  exit(): void {
    this.active = false;
    this.dragging = false;
    this.bar.style.display = 'none';
    this.renderer.ghost = null;
  }

  rotate(): void {
    this.dir = ((this.dir + 1) % 4) as Dir;
  }

  /** Step the selected machine in the bar (gamepad: X and Y). */
  cycle(step: number): void {
    const items = this.machineItems();
    if (items.length === 0) return;
    const at = Math.max(0, items.findIndex((m) => m.id === this.item));
    this.item = items[(at + step + items.length) % items.length].id;
    this.renderBar();
  }

  /** Machine items in the backpack, merged by id, in backpack order. */
  private machineItems(): { id: string; n: number }[] {
    const out: { id: string; n: number }[] = [];
    for (const st of this.game.state.player.inventory) {
      if (!st || getItem(st.id).category !== 'machine') continue;
      const hit = out.find((o) => o.id === st.id);
      if (hit) hit.n += st.n;
      else out.push({ id: st.id, n: st.n });
    }
    return out;
  }

  private renderBar(): void {
    const items = this.machineItems();
    if (this.item && !items.some((m) => m.id === this.item)) this.item = items[0]?.id ?? null;
    clear(this.bar).append(
      h('div.build-title', 'Build'),
      items.length === 0
        ? h('div.build-empty', 'No machines in your backpack. Craft some with C.')
        : h('div.build-items', items.map((m) =>
            h(`div.build-item${m.id === this.item ? '.sel' : ''}`, { onclick: () => { this.item = m.id; this.renderBar(); }, title: getItem(m.id).description ?? '' },
              h('img', { src: itemIcon(m.id), draggable: 'false' }),
              h('span.build-n', String(m.n)),
              h('span.build-name', getItem(m.id).name)))),
      h('div.build-help', 'Click: place · Drag: paint belts · R: rotate · Right click: pick up · F: flow view · B: done'),
    );
  }

  /** Called every frame with the hovered tile. */
  onHover(x: number, y: number): void {
    if (!this.active) return;
    const s = this.game.state;
    if (s.player.map !== 'farm') {
      this.exit();
      return;
    }
    const moved = !this.hover || this.hover[0] !== x || this.hover[1] !== y;
    this.hover = [x, y];
    if (this.dragging && moved && this.item && this.isBelt(this.item)) this.paintTo(x, y);
    const type = this.item ? getItem(this.item).places ?? null : null;
    this.renderer.ghost = type && !entityAt(s, x, y) ? { type, x, y, dir: this.dir, ok: placementProblem(s, type, x, y) === null } : null;
  }

  onClick(x: number, y: number, button: number): void {
    if (!this.active) return;
    const s = this.game.state;
    const e = entityAt(s, x, y);
    if (button === 2) {
      if (e) this.game.send({ type: 'pickup', x, y });
      return;
    }
    if (button !== 0) return;
    if (e) {
      this.game.send({ type: 'rotate', x, y });
      return;
    }
    if (!this.item) {
      this.toast('Pick a machine from the build bar.');
      return;
    }
    this.place(x, y, this.dir);
    if (this.isBelt(this.item)) {
      this.dragging = true;
      this.last = [x, y];
    }
  }

  onRelease(): void {
    this.dragging = false;
    this.painted.clear();
    this.last = null;
  }

  private isBelt(item: string): boolean {
    const k = getMachine(getItem(item).places!).kind;
    return k === 'belt';
  }

  private place(x: number, y: number, dir: Dir): void {
    const s = this.game.state;
    const problem = placementProblem(s, getItem(this.item!).places!, x, y);
    if (problem) {
      if (!this.dragging) this.toast(problem);
      return;
    }
    this.game.send({ type: 'place', item: this.item!, x, y, dir });
    if (this.dragging || this.isBelt(this.item!)) this.painted.add(`${x},${y}`);
  }

  /** Extends a painted belt line to (x, y): the previous belt turns toward the new tile. */
  private paintTo(x: number, y: number): void {
    // The mouse can skip tiles between frames: walk there one tile at a time (x first, then y).
    while (this.last && (this.last[0] !== x || this.last[1] !== y)) {
      const [lx, ly] = this.last;
      if (lx !== x) this.paintStep(lx + Math.sign(x - lx), ly);
      else this.paintStep(lx, ly + Math.sign(y - ly));
    }
  }

  private paintStep(x: number, y: number): void {
    const last = this.last!;
    const d = dirFromVector(x - last[0], y - last[1], this.dir) as Dir;
    this.dir = d;
    const prev = entityAt(this.game.state, last[0], last[1]);
    // A belt placed earlier in this drag may still be queued, so remember our own placements.
    if ((prev && this.isBelt(prev.type)) || this.painted.has(`${last[0]},${last[1]}`)) this.game.send({ type: 'rotate', x: last[0], y: last[1], dir: d });
    this.place(x, y, d);
    this.last = [x, y];
  }
}
