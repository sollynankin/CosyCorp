// Fishing overlay: "waiting for a bite", then the catch bar. Holding Space, the pad's A or the mouse raises the green
// zone (Input sends reel commands when the button changes); keep the fish inside it until the meter fills.
import { FISH_GOLD_AT, FISH_SILVER_AT, FISH_ZONE_SIZE } from '../data/balance';
import type { Game } from '../game/game';
import { h } from './dom';
import { fishFatigue } from '../sim/fishing';
import { genericFishIcon } from './icons';

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
      this.label.textContent = 'Waiting… (Esc to reel in)';
      this.bar.style.visibility = 'hidden';
      this.meter.style.visibility = 'hidden';
      return;
    }
    // The bigger the fish, the louder the reel: a hint before you land it.
    const big = fs.size >= FISH_GOLD_AT ? 'HUGE! ' : fs.size >= FISH_SILVER_AT ? 'Big one! ' : '';
    const tired = fishFatigue(fs);
    this.label.textContent = tired > 0.85 ? 'Nearly spent!' : tired > 0.5 ? `${big}It is tiring` : `${big}Hold to raise`;
    this.bar.style.visibility = '';
    this.meter.style.visibility = '';
    const size = FISH_ZONE_SIZE[this.game.state.player.tools.rod];
    this.zone.style.bottom = `${fs.zonePos * 100}%`;
    this.zone.style.height = `${size * 100}%`;
    this.fish.style.bottom = `calc(${fs.fishPos * 100}% - 14px)`;
    // Every fish is the same plain fish until it is landed: no species art, no name, no tooltip.
    (this.fish as HTMLImageElement).src = genericFishIcon();
    // a tiring fish droops and fades a little, so you can see it giving in
    this.fish.style.opacity = String(1 - tired * 0.35);
    this.fish.style.transform = `rotate(${tired * 25}deg)`;
    const inside = fs.fishPos >= fs.zonePos && fs.fishPos <= fs.zonePos + size;
    this.zone.classList.toggle('hit', inside);
    (this.meter.firstElementChild as HTMLElement).style.height = `${Math.max(0, fs.progress) * 100}%`;
  }
}
