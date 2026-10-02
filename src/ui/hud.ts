// Always-on HUD: date, clock, weather, coins, energy bar, hotbar and toasts.
import { CAN_CAPACITY, HOTBAR_SLOTS } from '../data/balance';
import { getItem } from '../data';
import { clockLabel, dateLabel } from '../sim';
import type { GameState } from '../sim';
import type { Game } from '../game/game';
import { clear, h } from './dom';
import { itemIcon } from './icons';

const WEATHER_ICON: Record<string, string> = { sunny: '☀', rain: '🌧', storm: '⛈', snow: '❄' };
const QUALITY_STAR = ['', '★', '★'];
const QUALITY_CLASS = ['', 'q-silver', 'q-gold'];

export class Hud {
  private readonly top = h('div.hud-top');
  private readonly bar = h('div.hotbar');
  private readonly energy = h('div.energy');
  private readonly toasts = h('div.toasts');
  private lastSig = '';

  constructor(root: HTMLElement, private readonly game: Game) {
    root.append(this.top, this.bar, this.energy, this.toasts);
  }

  toast(text: string): void {
    const t = h('div.toast', text);
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 4) this.toasts.firstChild!.remove();
    setTimeout(() => t.classList.add('fade'), 2600);
    setTimeout(() => t.remove(), 3200);
  }

  render(): void {
    const s = this.game.state;
    const sig = `${s.day}|${Math.floor(s.minute / 10)}|${s.player.coins}|${Math.round(s.player.energy)}|${s.weather}|${s.player.selected}|${s.player.canWater}|${slotSig(s)}`;
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    clear(this.top).append(
      h('div.hud-date', dateLabel(s.day)),
      h('div.hud-clock', h('span.weather', WEATHER_ICON[s.weather] ?? ''), clockLabel(s.minute)),
      h('div.hud-coins', h('span.coin'), String(s.player.coins)),
    );
    const p = s.player;
    const frac = p.energy / p.maxEnergy;
    clear(this.energy).append(
      h('div.energy-label', 'E'),
      h('div.energy-track', h('div.energy-fill', { style: { height: `${Math.max(0, frac) * 100}%`, background: frac < 0.2 ? '#e0583a' : frac < 0.5 ? '#e8b83a' : '#6cc04a' } })),
    );
    clear(this.bar);
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const st = p.inventory[i];
      const slot = h(`div.slot${i === p.selected ? '.sel' : ''}`, { onclick: () => this.game.send({ type: 'select', slot: i }), title: st ? getItem(st.id).name : '' });
      slot.appendChild(h('span.key', String((i + 1) % 10)));
      if (st) {
        slot.appendChild(h('img', { src: itemIcon(st.id), draggable: 'false' }));
        if (st.n > 1) slot.appendChild(h('span.count', String(st.n)));
        if (st.q > 0) slot.appendChild(h(`span.star.${QUALITY_CLASS[st.q]}`, QUALITY_STAR[st.q]));
        if (st.id === 'can') slot.appendChild(h('div.water', h('div', { style: { width: `${(p.canWater / CAN_CAPACITY[p.tools.can]) * 100}%` } })));
      }
      this.bar.appendChild(slot);
    }
  }
}

function slotSig(s: GameState): string {
  let out = '';
  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    const st = s.player.inventory[i];
    out += st ? `${st.id}:${st.n}:${st.q},` : '-,';
  }
  return out;
}
