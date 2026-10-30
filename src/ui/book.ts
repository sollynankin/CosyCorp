// One pull-up with tabs along the top: Backpack, Journal, Map and Fishing. The keys I, J, M and K (and the
// buttons in the top-right corner) open it on the matching tab; pressing the key of the open tab closes it.
import { h } from './dom';
import type { Modals } from './modal';

export type BookTab = 'pack' | 'journal' | 'map' | 'fishing';

const TABS: { id: BookTab; label: string; key: string }[] = [
  { id: 'pack', label: 'Backpack', key: 'I' },
  { id: 'journal', label: 'Journal', key: 'J' },
  { id: 'map', label: 'Map', key: 'M' },
  { id: 'fishing', label: 'Fishing', key: 'K' },
];

export interface BookParts {
  /** body of each tab; called on every refresh */
  body: Record<BookTab, () => HTMLElement>;
  /** a tab is about to be shown (reset selections, focus the map on where you are) */
  onShow?: (tab: BookTab) => void;
}

export class Book {
  private tab: BookTab = 'pack';

  constructor(private readonly modals: Modals, private readonly parts: BookParts) {}

  get open(): boolean {
    return this.modals.isOpen('book');
  }

  /** Open on a tab; if the book is already showing it, close; if showing another tab, switch. */
  toggle(tab: BookTab): void {
    if (this.open) {
      if (this.modals.top !== 'book') return;
      if (this.tab === tab) this.modals.close('book');
      else this.show(tab);
      return;
    }
    if (this.modals.open) return;
    this.tab = tab;
    this.parts.onShow?.(tab);
    this.modals.show({ id: 'book', title: 'Pack & Journal', wide: true, render: () => this.render() });
  }

  private show(tab: BookTab): void {
    this.tab = tab;
    this.parts.onShow?.(tab);
    this.modals.refresh();
  }

  private render(): HTMLElement {
    const tabs = h('div.book-tabs', TABS.map((t) =>
      h(`button.tab${t.id === this.tab ? '.on' : ''}`, { title: `${t.label} (${t.key})`, onclick: () => this.show(t.id) }, t.label, h('span.keyhint', t.key))));
    return h('div.book', tabs, this.parts.body[this.tab]());
  }
}
