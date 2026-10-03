// Panels for animals (coop, barn), the mine lift, and the Smithy's tool upgrades.
import { LIFT_FLOORS, TOOL_UPGRADE_COST } from '../data/balance';
import { getItem } from '../data';
import type { ToolId } from '../data/types';
import type { Game } from '../game/game';
import { capacity, canGraze, homeOf } from '../sim/animals';
import { countItem } from '../sim';
import { h } from './dom';
import { itemIcon } from './icons';
import type { Modals } from './modal';
import { slotEl } from './panels';

const TOOLS: ToolId[] = ['hoe', 'can', 'axe', 'pickaxe', 'scythe', 'rod'];
const TIER = ['Basic', 'Copper', 'Iron'];

export class FarmPanels {
  constructor(private readonly game: Game, private readonly modals: Modals) {}

  animals(building: 'coop' | 'barn'): void {
    this.modals.show({ id: 'animals', title: building === 'coop' ? 'Coop' : 'Barn', wide: true, render: () => this.renderAnimals(building) });
  }

  private renderAnimals(building: 'coop' | 'barn'): HTMLElement {
    const s = this.game.state;
    const list = s.animals.filter((a) => homeOf(a) === building);
    const cap = capacity(s, building);
    const hay = countItem(s.player.inventory, 'hay');
    const graze = canGraze(s);
    const rows = list.map((a) =>
      h('div.quest',
        h('img.portrait.small', { src: itemIcon(a.kind === 'chicken' ? 'egg' : 'milk') }),
        h('div.grow',
          h('div.b', a.name, h('span.arc', a.kind)),
          h('div.small', h('span.hearts', Array.from({ length: 5 }, (_, i) => h(`span${a.friendship >= (i + 1) * 200 ? '.on' : ''}`, '♥'))), a.petted ? ' · petted today' : '')),
        h('button', { disabled: a.petted, onclick: () => this.game.now({ type: 'pet', animal: a.id }) }, 'Pet')));
    return h('div',
      h('p.muted.small', `${list.length}/${cap} animals. ${graze ? 'Fine weather: they graze outside today.' : 'They stay in today and eat hay from the feeder.'}`),
      rows.length ? rows : h('p.muted', `Empty. Buy ${building === 'coop' ? 'chickens' : 'cows'} at Toller Joinery.`),
      h('div.row', h('span', `Feeder: ${s.feeders[building]} hay`), h('button', { disabled: hay === 0, onclick: () => this.game.now({ type: 'feed', building }) }, `Add ${hay} hay`)),
      h('h3', 'Collection box'),
      s.animalBox.length ? h('div.stacks', s.animalBox.map((st) => slotEl(st))) : h('p.muted', 'Nothing yet. Fed animals produce overnight.'),
      s.animalBox.length ? h('button.primary', { onclick: () => this.game.now({ type: 'collectAnimals' }) }, 'Collect') : null,
    );
  }

  lift(): void {
    const s = this.game.state;
    this.modals.show({
      id: 'lift', title: 'The Lift',
      render: () => h('div', h('p', 'A creaking Guild lift. Where to?'),
        h('div.row', LIFT_FLOORS.filter((f) => f <= Math.max(1, s.mineDeepest)).map((f) =>
          h('button.primary', { onclick: () => { this.modals.close('lift'); this.game.now({ type: 'lift', floor: f }); } }, `Floor ${f}`)))),
    });
  }

  /** The upgrade list shown inside the Smithy panel. */
  upgrades(): HTMLElement {
    const s = this.game.state;
    return h('div.upgrades', h('h3', 'Tool upgrades'), TOOLS.map((t) => {
      const tier = s.player.tools[t];
      const next = TOOL_UPGRADE_COST[tier + 1];
      const label = `${TIER[tier]} ${getItem(t).name}`;
      if (!next) return h('div.craft-row', h('img.craft-out', { src: itemIcon(t) }), h('div.grow', h('div.b', label), h('div.muted.small', 'Fully upgraded.')));
      const have = countItem(s.player.inventory, next.item);
      const ok = s.player.coins >= next.coins && have >= next.count;
      return h(`div.craft-row${ok ? '' : '.dim'}`,
        h('img.craft-out', { src: itemIcon(t) }),
        h('div.grow', h('div.b', `${label} → ${TIER[tier + 1]}`),
          h('div.craft-inputs', h('span.craft-in', `${next.coins}g`), h(`span.craft-in${have >= next.count ? '.ok' : '.miss'}`, h('img', { src: itemIcon(next.item) }), `${have}/${next.count}`))),
        h('button.primary', { disabled: !ok, onclick: () => this.game.now({ type: 'upgrade', tool: t }) }, 'Upgrade'));
    }));
  }
}
