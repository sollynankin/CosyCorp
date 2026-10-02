// UI controller: routes keys and sim events to panels. The only place that knows about every panel.
import type { Game } from '../game/game';
import { saveLocal } from '../game/save';
import type { Renderer } from '../render/renderer';
import type { SimEvent } from '../sim';
import { Hud } from './hud';
import { showMenu } from './menu';
import { Modals } from './modal';
import { Panels } from './panels';
import { renderReport } from './report';

export class App {
  readonly hud: Hud;
  readonly modals: Modals;
  readonly panels: Panels;

  constructor(root: HTMLElement, readonly game: Game, readonly renderer: Renderer) {
    this.hud = new Hud(root, game);
    this.modals = new Modals(root, game);
    this.panels = new Panels(game, this.modals);
    game.on((e) => this.onEvent(e));
  }

  toast(text: string): void {
    this.hud.toast(text);
  }

  /** Returns true if the key was handled (and should not reach movement). */
  onKey(key: string, e: KeyboardEvent): boolean {
    if (key === 'Escape') {
      if (!this.modals.closeTop()) showMenu(this.game, this.modals, this.renderer, (t) => this.toast(t));
      return true;
    }
    const k = key.toLowerCase();
    if (k === 'i' || key === 'Tab') {
      if (this.modals.top === 'inventory') this.modals.close('inventory');
      else if (!this.modals.open) this.panels.inventory();
      return true;
    }
    void e;
    return false;
  }

  onEvent(e: SimEvent): void {
    switch (e.type) {
      case 'toast':
        this.toast(e.text);
        break;
      case 'fx':
        this.renderer.effects.spawn(e.fx, e.map, e.x, e.y);
        break;
      case 'panel':
        this.openPanel(e.panel);
        break;
      case 'dayEnd': {
        const r = this.game.state.report;
        saveLocal(this.game.state);
        if (r) this.modals.show({ id: 'report', title: 'End of day', wide: true, render: () => renderReport(r, this.game.state.passedOut) });
        break;
      }
      default:
        break;
    }
  }

  openPanel(panel: string): void {
    if (panel === 'home') this.panels.home();
    else if (panel === 'ship') this.panels.shipping();
    else if (panel.startsWith('shop:')) this.panels.shop(panel.slice(5));
    else this.toast('Nobody answers the door.');
  }
}
