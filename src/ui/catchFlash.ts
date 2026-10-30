// The reveal: while reeling you only see a plain fish, so a landed fish pops up on screen with its real art, name,
// length and size class for a couple of seconds.
import { QUALITY_PRICE_MULT } from '../data/balance';
import { getItem } from '../data';
import { h } from './dom';
import { itemIcon } from './icons';

const SIZE_LABEL = ['', 'Silver size ★', 'Gold size ★★'];

export class CatchFlash {
  private readonly el = h('div.catch-flash');
  private timer = 0;

  constructor(root: HTMLElement) {
    this.el.style.display = 'none';
    root.appendChild(this.el);
  }

  show(item: string, q: number, cm: number, record: boolean): void {
    const bonus = Math.round((QUALITY_PRICE_MULT[q] - 1) * 100);
    const parts = [
      h('img.catch-art', { src: itemIcon(item), draggable: 'false' }),
      h('div.catch-name', getItem(item).name),
      h('div.catch-len', `${cm} cm`),
    ];
    if (q) parts.push(h(`div.catch-size.${q === 2 ? 'gold' : 'silver'}`, `${SIZE_LABEL[q]} · +${bonus}% price`));
    if (record) parts.push(h('div.catch-record', 'New record!'));
    this.el.replaceChildren(...parts);
    // restart the CSS animation even when a second fish lands quickly
    this.el.style.display = 'none';
    void this.el.offsetWidth;
    this.el.style.display = '';
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => (this.el.style.display = 'none'), 2600);
  }
}
