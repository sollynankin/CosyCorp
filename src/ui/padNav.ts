// Gamepad navigation for menus: a focus ring that hops between the buttons and sliders of the top modal.
// It walks the DOM (no knowledge of any particular panel), so every panel works with a controller as soon as it
// is built from buttons. The Input class turns d-pad presses into move() and A into activate().
import type { PadNavigator } from '../game/input';
import type { Dir } from '../data/types';

const FOCUSABLE = 'button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
const RING = 'pad-focus';

const centre = (el: Element): [number, number] => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
};

/**
 * The best next element in a direction: ahead of the current one, and as close as possible with a heavier penalty
 * for sideways drift (so "down" prefers the button straight below over one far to the side).
 */
export function pickNeighbour(from: [number, number], candidates: [number, number][], dir: Dir): number {
  const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][dir];
  let best = -1;
  let bestScore = Infinity;
  candidates.forEach(([x, y], i) => {
    const vx = x - from[0];
    const vy = y - from[1];
    const along = vx * dx + vy * dy;
    if (along <= 1) return;
    const across = Math.abs(vx * dy) + Math.abs(vy * dx);
    const score = along + across * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

export class PadNav implements PadNavigator {
  private ring: HTMLElement | null = null;
  /** index of the last focused element, so a re-rendered panel gets its focus back */
  private lastIndex = 0;
  /** the modal the ring was last in: a different one starts fresh */
  private lastTop: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement) {}

  /** The topmost modal, or null. */
  private top(): HTMLElement | null {
    const tops = this.root.querySelectorAll<HTMLElement>(':scope > .modal-backdrop, :scope > .modal-dock');
    return tops.length ? tops[tops.length - 1] : null;
  }

  private items(): HTMLElement[] {
    const top = this.top();
    if (top !== this.lastTop) {
      this.lastTop = top;
      this.ring = null;
      this.lastIndex = 0;
    }
    if (!top) return [];
    return [...top.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0 && !el.classList.contains('close'));
  }

  private focus(el: HTMLElement, items: HTMLElement[]): void {
    this.ring?.classList.remove(RING);
    this.ring = el;
    el.classList.add(RING);
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.lastIndex = Math.max(0, items.indexOf(el));
  }

  /** The element with the ring, if it is still in the open modal. */
  private current(items: HTMLElement[]): HTMLElement | null {
    return this.ring && items.includes(this.ring) ? this.ring : null;
  }

  /** Puts the ring somewhere sensible: the primary button, else wherever it was, else the first control. */
  private ensure(items: HTMLElement[]): HTMLElement | null {
    const cur = this.current(items);
    if (cur) return cur;
    const pick = items.find((el) => el.classList.contains('primary')) ?? items[Math.min(this.lastIndex, items.length - 1)] ?? null;
    if (pick) this.focus(pick, items);
    return pick;
  }

  move(dir: Dir): void {
    const items = this.items();
    if (items.length === 0) return;
    const cur = this.current(items);
    if (!cur) {
      this.ensure(items);
      return;
    }
    // Sliders take left and right themselves.
    if (cur instanceof HTMLInputElement && cur.type === 'range' && (dir === 1 || dir === 3)) {
      this.nudge(cur, dir === 1 ? 1 : -1);
      return;
    }
    const others = items.filter((el) => el !== cur);
    const i = pickNeighbour(centre(cur), others.map(centre), dir);
    if (i >= 0) this.focus(others[i], items);
  }

  private nudge(slider: HTMLInputElement, steps: number): void {
    const step = Number(slider.step) || 1;
    slider.value = String(Math.min(Number(slider.max), Math.max(Number(slider.min), Number(slider.value) + steps * step)));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }

  activate(): void {
    const items = this.items();
    const el = this.ensure(items);
    if (!el) return;
    if (el instanceof HTMLInputElement && el.type === 'range') return;
    el.click();
    // The panel may have re-rendered under us: put the ring back on the same spot next frame.
    requestAnimationFrame(() => {
      const now = this.items();
      if (now.length === 0 || this.current(now)) return;
      this.focus(now[Math.min(this.lastIndex, now.length - 1)], now);
    });
  }

  reset(): void {
    this.ring?.classList.remove(RING);
    this.ring = null;
    this.lastIndex = 0;
  }
}
