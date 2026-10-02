// Modal panels. One stack; the top panel re-renders whenever the game changes. Any open modal pauses the
// clock (the genre's "time stops in menus").
import type { Game } from '../game/game';
import { clear, h } from './dom';

export interface ModalSpec {
  id: string;
  title: string;
  /** builds the body; called on open and on every game change */
  render: () => HTMLElement;
  wide?: boolean;
  /** dialogue boxes etc. sit at the bottom without a backdrop */
  docked?: boolean;
  onClose?: () => void;
  /** does not pause time (e.g. fishing overlay) */
  live?: boolean;
  noClose?: boolean;
}

export class Modals {
  private stack: { spec: ModalSpec; el: HTMLElement; body: HTMLElement }[] = [];

  constructor(private readonly root: HTMLElement, private readonly game: Game) {
    game.onChange(() => this.refresh());
  }

  get open(): boolean {
    return this.stack.length > 0;
  }

  get top(): string | null {
    return this.stack.length ? this.stack[this.stack.length - 1].spec.id : null;
  }

  isOpen(id: string): boolean {
    return this.stack.some((m) => m.spec.id === id);
  }

  show(spec: ModalSpec): void {
    this.close(spec.id);
    const body = h('div.modal-body');
    const head = h('div.modal-head', h('h2', spec.title), spec.noClose ? null : h('button.close', { onclick: () => this.close(spec.id), title: 'Close (Esc)' }, '✕'));
    const panel = h(`div.modal${spec.wide ? '.wide' : ''}${spec.docked ? '.docked' : ''}`, head, body);
    const el = spec.docked ? h('div.modal-dock', panel) : h('div.modal-backdrop', { onmousedown: (e: MouseEvent) => { if (e.target === el && !spec.noClose) this.close(spec.id); } }, panel);
    this.root.appendChild(el);
    this.stack.push({ spec, el, body });
    if (!spec.live) this.game.pause(`modal:${spec.id}`, true);
    clear(body).appendChild(spec.render());
  }

  close(id?: string): void {
    const i = id ? this.stack.findIndex((m) => m.spec.id === id) : this.stack.length - 1;
    if (i < 0) return;
    const [m] = this.stack.splice(i, 1);
    m.el.remove();
    this.game.pause(`modal:${m.spec.id}`, false);
    m.spec.onClose?.();
  }

  closeTop(): boolean {
    const t = this.stack[this.stack.length - 1];
    if (!t || t.spec.noClose) return false;
    this.close(t.spec.id);
    return true;
  }

  refresh(): void {
    for (const m of this.stack) {
      const scroll = m.body.firstElementChild?.querySelector('.scroll')?.scrollTop ?? 0;
      clear(m.body).appendChild(m.spec.render());
      const sc = m.body.querySelector('.scroll');
      if (sc) sc.scrollTop = scroll;
    }
  }
}
