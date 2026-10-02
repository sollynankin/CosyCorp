// Inventory, shops, shipping bin, farmhouse and the pause menu.
import { INVENTORY_SLOTS, HOTBAR_SLOTS, ITEM_ENERGY } from '../data/balance';
import { getItem } from '../data';
import { getShop } from '../data/shops';
import { clockLabel, minuteOfClock, sellPrice, isSellable } from '../sim';
import { isShopOpen, shopStock } from '../sim/shop';
import type { Game } from '../game/game';
import type { ItemStack } from '../sim';
import { h } from './dom';
import { itemIcon } from './icons';
import type { Modals } from './modal';

const QUALITY_NAME = ['', 'Silver', 'Gold'];

export function slotEl(st: ItemStack | null, opts: { sel?: boolean; onclick?: (e: MouseEvent) => void; oncontext?: (e: MouseEvent) => void; title?: string } = {}): HTMLElement {
  const el = h(`div.slot${opts.sel ? '.sel' : ''}`, {
    onclick: opts.onclick,
    oncontextmenu: (e: MouseEvent) => {
      e.preventDefault();
      opts.oncontext?.(e);
    },
    title: opts.title ?? (st ? `${QUALITY_NAME[st.q] ? QUALITY_NAME[st.q] + ' ' : ''}${getItem(st.id).name}` : ''),
  });
  if (st) {
    el.appendChild(h('img', { src: itemIcon(st.id), draggable: 'false' }));
    if (st.n > 1) el.appendChild(h('span.count', String(st.n)));
    if (st.q > 0) el.appendChild(h(`span.star.${st.q === 2 ? 'q-gold' : 'q-silver'}`, '★'));
  }
  return el;
}

export class Panels {
  /** inventory selection for swapping */
  private picked: number | null = null;

  constructor(private readonly game: Game, private readonly modals: Modals) {}

  inventory(): void {
    this.picked = null;
    this.modals.show({ id: 'inventory', title: 'Backpack', wide: true, render: () => this.renderInventory() });
  }

  private renderInventory(): HTMLElement {
    const s = this.game.state;
    const inv = s.player.inventory;
    const grid = h('div.inv-grid');
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const st = inv[i];
      grid.appendChild(
        slotEl(st, {
          sel: this.picked === i || (this.picked === null && i === s.player.selected),
          onclick: () => {
            if (this.picked === null) {
              this.picked = i;
              if (i < HOTBAR_SLOTS) this.game.now({ type: 'select', slot: i });
              this.modals.refresh();
            } else {
              if (this.picked !== i) this.game.now({ type: 'swap', a: this.picked, b: i });
              this.picked = null;
              this.modals.refresh();
            }
          },
          oncontext: () => {
            if (st && ITEM_ENERGY[st.id]) this.game.now({ type: 'eat', slot: i });
          },
        }),
      );
      if (i === HOTBAR_SLOTS - 1) grid.appendChild(h('div.inv-divider'));
    }
    const sel = this.picked !== null ? inv[this.picked] : inv[s.player.selected];
    const info = h('div.inv-info');
    if (sel) {
      const def = getItem(sel.id);
      info.appendChild(h('div',
        h('h3', `${QUALITY_NAME[sel.q] ? QUALITY_NAME[sel.q] + ' ' : ''}${def.name}`),
        h('div.muted', def.category),
        def.description ? h('p', def.description) : null,
        isSellable(sel.id) ? h('div', `Sells for ${sellPrice(sel.id, sel.q)}g`) : null,
        ITEM_ENERGY[sel.id] ? h('div', `Restores ${ITEM_ENERGY[sel.id]} energy`, ' ', h('button', { onclick: () => this.game.now({ type: 'eat', slot: this.picked ?? s.player.selected }) }, 'Eat')) : null,
      ));
    } else info.append(h('div.muted', 'Click a slot to select it, then another slot to swap. Right-click food to eat.'));
    return h('div.inv', grid, info);
  }

  shop(shopId: string): void {
    this.modals.show({ id: 'shop', title: getShop(shopId).name, wide: true, render: () => this.renderShop(shopId) });
  }

  private renderShop(shopId: string): HTMLElement {
    const s = this.game.state;
    const shop = getShop(shopId);
    if (!isShopOpen(shop, s.day, s.minute)) {
      const days = shop.closed.length ? ` Closed on ${shop.closed.map((d) => ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][d]).join(', ')}.` : '';
      return h('div', h('p', `Closed. Open ${clockLabel(minuteOfClock(shop.open))} to ${clockLabel(minuteOfClock(shop.close))}.${days}`));
    }
    const list = h('div.shop-list.scroll');
    for (const e of shopStock(s, shop)) {
      const name = e.recipe ? `Recipe: ${getItemName(e.recipe.replace('cook_', ''))}` : getItem(e.item).name;
      const afford = s.player.coins >= e.price;
      list.appendChild(
        h(
          'div.shop-row',
          h('img', { src: itemIcon(e.recipe ? e.recipe.replace('cook_', '') : e.item) }),
          h('div.grow', h('div.b', name), h('div.muted.small', e.recipe ? 'Learn to cook it at home.' : getItem(e.item).description ?? getItem(e.item).category)),
          h('div.price', h('span.coin'), String(e.price)),
          h('button', { disabled: !afford, onclick: () => this.game.now({ type: 'buy', shop: shopId, item: e.item, n: 1 }) }, 'Buy'),
          e.recipe ? null : h('button', { disabled: s.player.coins < e.price * 5, onclick: () => this.game.now({ type: 'buy', shop: shopId, item: e.item, n: 5 }) }, '×5'),
        ),
      );
    }
    return h('div', h('div.shop-coins', 'Your coins: ', h('span.coin'), String(s.player.coins)), list);
  }

  shipping(): void {
    this.modals.show({ id: 'ship', title: 'Shipping Bin', wide: true, render: () => this.renderShipping() });
  }

  private renderShipping(): HTMLElement {
    const s = this.game.state;
    const grid = h('div.inv-grid');
    s.player.inventory.forEach((st, i) => {
      const can = !!st && isSellable(st.id);
      const el = slotEl(st, {
        onclick: (e) => can && this.game.now({ type: 'ship', slot: i, n: e.shiftKey ? st!.n : 1 }),
        oncontext: () => can && this.game.now({ type: 'ship', slot: i, n: st!.n }),
        title: st ? `${getItem(st.id).name}${can ? ` (${sellPrice(st.id, st.q)}g each)` : " (can't ship)"}` : '',
      });
      if (st && !can) el.classList.add('dim');
      grid.appendChild(el);
    });
    let total = 0;
    const bin = h('div.bin');
    for (const st of s.farm.shipping) {
      total += sellPrice(st.id, st.q) * st.n;
      bin.appendChild(slotEl(st));
    }
    return h(
      'div',
      h('p.muted', 'Click to ship one, Shift-click or right-click to ship the stack. Everything in the bin sells overnight.'),
      grid,
      h('h3', `In the bin: ${total}g`),
      bin,
    );
  }

  home(): void {
    this.modals.show({ id: 'home', title: 'Farmhouse', render: () => this.renderHome() });
  }

  private renderHome(): HTMLElement {
    const s = this.game.state;
    return h(
      'div.home',
      h('p', 'A creaky bed, a kettle, and great-aunt Ros\'s handwriting on every jar.'),
      h('div.row', h('button.primary', { onclick: () => { this.modals.close('home'); this.game.now({ type: 'sleep' }); } }, 'Sleep (end the day)')),
      s.overflow.length ? h('div.row', h('button', { onclick: () => this.game.now({ type: 'collectOverflow' }) }, `Collect the box (${s.overflow.reduce((a, b) => a + b.n, 0)} items)`)) : null,
    );
  }
}

function getItemName(id: string): string {
  try {
    return getItem(id).name;
  } catch {
    return id;
  }
}
