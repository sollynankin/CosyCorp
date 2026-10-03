// Fishing overlay: "waiting for a bite", then the catch bar. Holding Space or the mouse raises the green
// zone (Input sends reel commands when the button changes); keep the fish inside it until the meter fills.
import { FISH_ZONE_SIZE } from '../data/balance';
import { getItem } from '../data';
import type { Game } from '../game/game';
import { h } from './dom';
import { itemIcon } from './icons';

export class FishingOverlay {
  private readonly el = h('div.fishing');
  private readonly bar = h('div.fish-bar');
  private readonly zone = h('div.fish-zone');
  private readonly fish = h('img.fish-marker');
  private readonly meter = h('div.fish-meter', h('div'));
  private readonly label = h('div.fish-label');

  constructor(root: HTMLElement, private readonly game: Game) {
    this.bar.append(this.zone, this.fish);
    this.el.append(this.label, h('div.fish-row', this.bar, this.meter));
    this.el.style.display = 'none';
    root.appendChild(this.el);
  }

  render(): void {
    const fs = this.game.state.player.fishing;
    if (!fs) {
      this.el.style.display = 'none';
      return;
    }
    this.el.style.display = '';
    if (fs.phase === 'wait') {
      this.label.textContent = 'Waiting for a bite… (Esc to reel in)';
      this.bar.style.visibility = 'hidden';
      this.meter.style.visibility = 'hidden';
      return;
    }
    this.label.textContent = 'Hold Space or the mouse to raise the net. Keep the fish inside!';
    this.bar.style.visibility = '';
    this.meter.style.visibility = '';
    const size = FISH_ZONE_SIZE[this.game.state.player.tools.rod];
    this.zone.style.bottom = `${fs.zonePos * 100}%`;
    this.zone.style.height = `${size * 100}%`;
    this.fish.style.bottom = `calc(${fs.fishPos * 100}% - 12px)`;
    (this.fish as HTMLImageElement).src = itemIcon(fs.fish);
    this.fish.title = getItem(fs.fish).name;
    const inside = fs.fishPos >= fs.zonePos && fs.fishPos <= fs.zonePos + size;
    this.zone.classList.toggle('hit', inside);
    (this.meter.firstElementChild as HTMLElement).style.height = `${Math.max(0, fs.progress) * 100}%`;
  }
}
