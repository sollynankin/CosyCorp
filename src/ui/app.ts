// UI controller: routes keys and sim events to panels. The only place that knows about every panel.
import type { Game } from '../game/game';
import { saveLocal } from '../game/save';
import type { Renderer } from '../render/renderer';
import type { SimEvent } from '../sim';
import { getMapDef } from '../world';
import { BuildMode } from './build';
import { Hud } from './hud';
import { showMenu } from './menu';
import { Modals } from './modal';
import { Panels } from './panels';
import { NameTags, People } from './people';
import { renderReport } from './report';
import { FlowLegend, WorksPanels } from './works';
import { FarmPanels } from './farmPanels';
import { FishingOverlay } from './fishing';

const ADVANCE_KEYS = new Set([' ', 'Enter', 'e', 'E']);

export class App {
  readonly hud: Hud;
  readonly modals: Modals;
  readonly panels: Panels;
  readonly works: WorksPanels;
  readonly build: BuildMode;
  readonly legend: FlowLegend;
  readonly people: People;
  readonly tags: NameTags;
  readonly farm: FarmPanels;
  readonly fishing: FishingOverlay;
  /** building id of the last door opened (homes and counters need the door tile) */
  private lastBuilding: string | undefined;

  constructor(root: HTMLElement, readonly game: Game, readonly renderer: Renderer) {
    this.hud = new Hud(root, game);
    this.modals = new Modals(root, game);
    this.people = new People(game, this.modals, renderer);
    this.panels = new Panels(game, this.modals);
    this.panels.counter = (keeper, close) => {
      const b = getMapDef('town').buildings.find((x) => x.panel.startsWith('shop:') && x.id === this.lastBuilding);
      return b ? this.people.counter(keeper, 'town', b.door, close) : null;
    };
    this.works = new WorksPanels(game, this.modals, renderer);
    this.build = new BuildMode(root, game, renderer, (t) => this.toast(t));
    this.legend = new FlowLegend(root, game, renderer);
    this.tags = new NameTags(root, game, renderer);
    this.farm = new FarmPanels(game, this.modals);
    this.fishing = new FishingOverlay(root, game);
    this.panels.extra = (shopId) => (shopId === 'smithy' ? this.farm.upgrades() : null);
    this.panels.kitchen = () => {
      this.modals.close('home');
      this.works.crafting('cook');
    };
    game.on((e) => this.onEvent(e));
  }

  /** Per-frame UI work that is not driven by game changes. */
  frame(): void {
    this.hud.render();
    this.legend.render();
    this.people.frame();
    this.tags.render(this.modals.open);
    this.fishing.render();
  }

  toast(text: string): void {
    this.hud.toast(text);
  }

  /** Returns true if the key was handled (and should not reach movement). */
  onKey(key: string, e: KeyboardEvent): boolean {
    const top = this.modals.top;
    if (top === 'title') return key === 'Escape';
    if (top === 'scene' && ADVANCE_KEYS.has(key)) {
      this.people.advanceOrFinishReply();
      return true;
    }
    if (top === 'dialogue' && ADVANCE_KEYS.has(key)) {
      this.modals.close('dialogue');
      return true;
    }
    if (key === 'Escape' && this.build.active && !this.modals.open) {
      this.build.exit();
      return true;
    }
    if (key === 'Escape') {
      if (!this.modals.closeTop()) showMenu(this.game, this.modals, this.renderer, (t) => this.toast(t));
      return true;
    }
    const k = key.toLowerCase();
    if (k === 'i' || key === 'Tab') {
      if (top === 'inventory') this.modals.close('inventory');
      else if (!this.modals.open) this.panels.inventory();
      return true;
    }
    if (k === 'j') {
      if (top === 'journal') this.modals.close('journal');
      else if (!this.modals.open) this.people.journal();
      return true;
    }
    if (this.modals.open || e.repeat) return false;
    if (k === 'b') {
      this.build.toggle();
      return true;
    }
    if (k === 'c') {
      this.works.crafting('craft');
      return true;
    }
    if (k === 'f') {
      this.renderer.flowOn = !this.renderer.flowOn;
      if (this.renderer.flowOn && this.game.state.player.map !== 'farm') this.toast('The Flow view shows the farm.');
      return true;
    }
    if (k === 'r' && this.build.active) {
      this.build.rotate();
      return true;
    }
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
        this.lastBuilding = e.building;
        this.openPanel(e.panel);
        break;
      case 'dialogue':
        this.people.dialogue(e.villager, e.text, e.hearts, e.gained);
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
    const map = this.game.state.player.map;
    const building = getMapDef(map).buildings.find((b) => b.id === this.lastBuilding);
    if (panel === 'home') this.panels.home();
    else if (panel === 'ship') this.panels.shipping();
    else if (panel.startsWith('shop:')) this.panels.shop(panel.slice(5));
    else if (panel.startsWith('machine:')) this.works.machine(Number(panel.slice(8)));
    else if (panel.startsWith('chest:')) this.works.chest(Number(panel.slice(6)));
    else if (panel === 'craft' || panel === 'cook') this.works.crafting(panel);
    else if (panel === 'works') this.people.works();
    else if (panel === 'board' || panel === 'townhall') this.people.board();
    else if (panel === 'festival') this.people.festival();
    else if (panel === 'coop' || panel === 'barn') this.farm.animals(panel);
    else if (panel === 'lift') this.farm.lift();
    else if (panel.startsWith('home:') && building) this.people.home(panel.slice(5), map, building.door);
    else this.toast('Nobody answers the door.');
  }
}
