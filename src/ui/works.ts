// Panels for the Works: crafting (C), the machine inspector, chests, and the Flow overlay legend.
import { getItem, getMachine, getRecipe, RECIPES } from '../data';
import type { RecipeDef, RecipeInput } from '../data/types';
import type { Game } from '../game/game';
import type { Renderer } from '../render/renderer';
import { STATUS_COLOR } from '../render/machineView';
import { RANGE_COLOR } from '../render/flowOverlay';
import { availableRecipes, countInput, knownRecipes, knowsRecipe, planterSeed, storedCount, type Entity } from '../sim';
import { clear, h } from './dom';
import { itemIcon } from './icons';
import type { Modals } from './modal';
import { slotEl } from './panels';

const STATUS_LABEL = { working: 'Working', idle: 'Idle', blocked: 'Blocked', unpowered: 'No power' } as const;
const DIR_NAME = ['north', 'east', 'south', 'west'];

function inputLabel(i: RecipeInput): string {
  return i.item ? getItem(i.item).name : `any ${i.tag}`;
}

function inputIcon(i: RecipeInput): string {
  return itemIcon(i.item ?? (i.tag === 'fish' ? 'perch' : 'morel'));
}

export class WorksPanels {
  constructor(private readonly game: Game, private readonly modals: Modals, private readonly renderer: Renderer) {}

  // ---- Crafting -----------------------------------------------------------------------------------
  crafting(station: 'craft' | 'cook' = 'craft'): void {
    const title = station === 'craft' ? 'Workbench' : 'Kitchen';
    this.modals.show({ id: 'craft', title, wide: true, render: () => this.renderCrafting(station) });
  }

  private renderCrafting(station: 'craft' | 'cook'): HTMLElement {
    const s = this.game.state;
    const inv = s.player.inventory;
    const known = knownRecipes(s, station);
    const locked = RECIPES.filter((r) => r.station === station && !knowsRecipe(s, r)).length;
    const list = h('div.craft-list.scroll');
    for (const r of known) {
      const can = (times: number) => r.inputs.every((i) => countInput(inv, i) >= i.count * times);
      const out = getItem(r.output.item);
      list.appendChild(
        h(`div.craft-row${can(1) ? '' : '.dim'}`,
          h('img.craft-out', { src: itemIcon(r.output.item) }),
          h('div.grow',
            h('div.b', `${out.name}${r.output.count > 1 ? ` ×${r.output.count}` : ''}`),
            h('div.muted.small', out.description ?? ''),
            h('div.craft-inputs', r.inputs.map((i) => {
              const have = countInput(inv, i);
              return h(`span.craft-in${have >= i.count ? '.ok' : '.miss'}`, { title: inputLabel(i) }, h('img', { src: inputIcon(i) }), `${have}/${i.count}`);
            })),
          ),
          h('button.primary', { disabled: !can(1), onclick: () => this.game.now({ type: 'craft', recipe: r.id, n: 1 }) }, station === 'craft' ? 'Make' : 'Cook'),
          h('button', { disabled: !can(5), onclick: () => this.game.now({ type: 'craft', recipe: r.id, n: 5 }) }, '×5'),
        ),
      );
    }
    const foot = locked > 0 ? h('p.muted.small', `${locked} more ${station === 'craft' ? 'blueprints are' : 'recipes are'} still to be found. Restoring the Works teaches new ones.`) : null;
    return h('div', list, foot);
  }

  // ---- Machine inspector ---------------------------------------------------------------------------
  machine(id: number): void {
    this.modals.show({ id: 'machine', title: 'Machine', wide: true, render: () => this.renderMachine(id) });
  }

  private entity(id: number): Entity | null {
    return this.game.state.farm.entities.find((e) => e.id === id) ?? null;
  }

  private renderMachine(id: number): HTMLElement {
    const e = this.entity(id);
    if (!e) {
      queueMicrotask(() => this.modals.close('machine'));
      return h('div', 'Gone.');
    }
    const s = this.game.state;
    const def = getMachine(e.type);
    const power = this.renderer.power(s);
    const factor = power.entityFactor[e.id] ?? 0;
    const st = s.today.entities[String(e.id)];
    const steps = Math.max(1, st ? st.working + st.idle + st.blocked + st.unpowered : 0);
    const pct = (n: number) => `${Math.round((n / steps) * 100)}%`;
    const rows: (HTMLElement | null)[] = [];

    const worker = def.kind === 'harvester' || def.kind === 'planter' || def.kind === 'crafter' || def.kind === 'heater';
    rows.push(h('div.mach-head',
      h('img', { src: itemIcon(def.item) }),
      h('div.grow', h('div.b', def.name), h('div.muted.small', def.description)),
      worker ? h('span.status-chip', { style: { background: STATUS_COLOR[e.status] } }, STATUS_LABEL[e.status]) : null,
    ));

    const facts: [string, string][] = [];
    if (def.kind !== 'sprinkler' || def.needsPower) facts.push(['Faces', DIR_NAME[e.dir]]);
    if (def.powerDraw > 0) facts.push(['Power', factor <= 0 ? `none (needs ${def.powerDraw}, out of range)` : `${Math.round(factor * 100)}% (draws ${def.powerDraw})`]);
    if (def.kind === 'generator') facts.push(['Supplies', `${power.supply.toFixed(1)} total on the farm, ${power.demand} drawn`]);
    if (def.radius) facts.push(['Reach', `${def.radius * 2 + 1}×${def.radius * 2 + 1}`]);
    if (def.kind === 'belt' || def.kind === 'splitter') facts.push(['Speed', `1 item per ${def.entryInterval} min, ${def.travelMinutes} min to cross`]);
    if (st) {
      if (worker) facts.push(['Today', `${st.produced} made · working ${pct(st.working)} · idle ${pct(st.idle)} · blocked ${pct(st.blocked)}`]);
      else if (def.kind === 'seller') facts.push(['Today', `${st.produced} sold`]);
      else if (st.moved) facts.push(['Today', `${st.moved} moved${st.blocked ? `, jammed ${st.blocked} min` : ''}`]);
    }
    rows.push(h('div.facts', facts.map(([k, v]) => h('div.fact', h('span.muted', k), h('span', v)))));

    if (def.kind === 'crafter') rows.push(this.crafterBody(e));
    if (def.kind === 'planter') {
      const seed = planterSeed(e);
      rows.push(h('div', h('h3', 'Hopper'), seed ? h('div.stacks', slotEl({ id: seed, q: 0, n: e.input[seed] })) : h('p.muted', 'Empty. Hold seeds and press E on the planter, or run a belt into it.')));
    }
    if (e.output.length) rows.push(h('div', h('h3', `Output (${e.output.length}/${def.outputBuffer ?? 0})`), stacksEl(e.output), h('p.muted.small', 'Press E on the machine to collect.')));
    if (def.kind === 'storage') rows.push(h('div', h('h3', `Stored ${storedCount(e)}/${def.capacity}`), e.stored.length ? stacksEl(e.stored) : h('p.muted', 'Empty.')));
    if (e.belt.length) rows.push(h('div', h('h3', 'On the belt'), stacksEl(e.belt.map((b) => ({ id: b.item, q: b.q, n: 1 })))));

    rows.push(h('div.row',
      h('button', { onclick: () => this.game.now({ type: 'rotate', x: e.x, y: e.y }) }, 'Rotate'),
      h('button', { onclick: () => { this.game.now({ type: 'pickup', x: e.x, y: e.y }); this.modals.close('machine'); } }, 'Pick up'),
    ));
    return h('div.mach', rows);
  }

  private crafterBody(e: Entity): HTMLElement {
    const s = this.game.state;
    const recipes = availableRecipes(s, e.type);
    const cur = e.recipe ? getRecipe(e.recipe) : null;
    const prog = cur ? Math.min(1, e.progress / (cur.workMinutes ?? 1)) : 0;
    const inputs = Object.entries(e.input).filter(([, n]) => n > 0).map(([id, n]) => ({ id, q: 0 as const, n }));
    return h('div',
      h('h3', 'Working on'),
      cur ? h('div.progress', h('img', { src: itemIcon(cur.output.item) }), h('div.bar', h('div', { style: { width: `${prog * 100}%` } })), h('span.small', `${getItem(cur.output.item).name}`)) : h('p.muted', 'Nothing yet.'),
      h('h3', 'Input'),
      inputs.length ? stacksEl(inputs) : h('p.muted', 'Empty. Hold an ingredient and press E, or feed it by belt (any side but the front).'),
      h('h3', 'Recipes'),
      h('div.recipes', recipes.map((r: RecipeDef) => h('div.recipe',
        r.inputs.map((i) => h('span.craft-in', h('img', { src: inputIcon(i) }), `${i.count}`)),
        h('span.arrow', '→'),
        h('img', { src: itemIcon(r.output.item) }),
        h('span.small', `${getItem(r.output.item).name} · ${r.workMinutes} min`),
      ))),
    );
  }

  // ---- Chest ---------------------------------------------------------------------------------------
  chest(id: number): void {
    this.modals.show({ id: 'chest', title: 'Chest', wide: true, render: () => this.renderChest(id) });
  }

  private renderChest(id: number): HTMLElement {
    const e = this.entity(id);
    if (!e) return h('div', 'Gone.');
    const s = this.game.state;
    const cap = getMachine(e.type).capacity ?? 0;
    const chest = h('div.inv-grid');
    for (let i = 0; i < cap; i++) {
      const st = e.stored[i] ?? null;
      chest.appendChild(slotEl(st, { onclick: () => st && this.game.now({ type: 'chest', entity: id, fromBackpack: false, index: i }) }));
    }
    const pack = h('div.inv-grid');
    s.player.inventory.forEach((st, i) => pack.appendChild(slotEl(st, { onclick: () => st && this.game.now({ type: 'chest', entity: id, fromBackpack: true, index: i }) })));
    return h('div', h('p.muted', 'Click a stack to move it across.'), h('h3', 'Chest'), chest, h('h3', 'Backpack'), pack);
  }
}

function stacksEl(list: { id: string; q: 0 | 1 | 2; n: number }[]): HTMLElement {
  return h('div.stacks', list.map((st) => slotEl(st)));
}

/** The legend shown while the Flow overlay is on. */
export class FlowLegend {
  private readonly el = h('div.flow-legend');
  private sig = '';

  constructor(root: HTMLElement, private readonly game: Game, private readonly renderer: Renderer) {
    root.appendChild(this.el);
    this.el.style.display = 'none';
  }

  render(): void {
    const on = this.renderer.flowOn && this.game.state.player.map === 'farm';
    this.el.style.display = on ? '' : 'none';
    if (!on) return;
    const s = this.game.state;
    const p = this.renderer.power(s);
    const t = s.today;
    const sig = `${p.supply}|${p.demand}|${t.coinsChute}|${t.harvestedMachine}|${t.crafted}|${s.farm.entities.length}`;
    if (sig === this.sig) return;
    this.sig = sig;
    const dot = (c: string) => h('span.dot', { style: { background: c } });
    clear(this.el).append(
      h('div.b', 'Flow view'),
      h('div', `Power ${p.supply.toFixed(1)} supply / ${p.demand} demand · ${Math.round(p.factor * 100)}% speed`),
      h('div', `Today: ${t.harvestedMachine} picked · ${t.crafted} crafted · ${t.coinsChute}g sold by chute`),
      h('div.legend-row', dot(STATUS_COLOR.working), 'working', dot(STATUS_COLOR.idle), 'idle', dot(STATUS_COLOR.blocked), 'blocked', dot(STATUS_COLOR.unpowered), 'no power'),
      h('div.legend-row', h('span.grad'), 'belt use (low → at cap)', dot(STATUS_COLOR.blocked), 'jammed'),
      h('div.legend-row', dot(RANGE_COLOR.sprinkler!), 'water', dot(RANGE_COLOR.harvester!), 'harvest', dot(RANGE_COLOR.planter!), 'plant', dot(RANGE_COLOR.heater!), 'heat', dot('#6ab8f0'), 'powered tile'),
      h('div.muted.small', 'F to close'),
    );
  }
}
