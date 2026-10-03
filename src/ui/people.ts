// People and story UI: dialogue box, scene player, journal (J), Works Hall counter, quest board, festival
// panel, villager homes and name tags. Everything changes state only through sim commands.
import { MAX_HEARTS, POD_COUNT, FESTIVAL_ACTIVITY_MINUTES } from '../data/balance';
import { getItem, getVillager, VILLAGERS } from '../data';
import { FESTIVALS } from '../data/festivals';
import type { Objective } from '../data/types';
import type { Game } from '../game/game';
import { portraitUrl } from '../render/iconRender';
import { PLAYER_LOOK } from '../render/meshes/characters';
import type { Renderer } from '../render/renderer';
import {
  carriedFor,
  festivalOn,
  getScene,
  heartsOf,
  objectiveProgress,
  questDef,
  simMinute,
  villagerPos,
  type GameState,
} from '../sim';
import { h } from './dom';
import { itemIcon } from './icons';
import type { Modals } from './modal';
import { slotEl } from './panels';

export function portrait(who: string): string {
  if (who === 'you') return portraitUrl('you', PLAYER_LOOK);
  return portraitUrl(who, getVillager(who).appearance);
}

function speakerName(who: string): string {
  if (who === 'you') return 'You';
  if (who === 'narrator') return '';
  return getVillager(who).name.split(' ')[0];
}

export function heartsEl(n: number, max = MAX_HEARTS): HTMLElement {
  return h('span.hearts', Array.from({ length: max }, (_, i) => h(`span${i < n ? '.on' : ''}`, '♥')));
}

const FESTIVAL_NAME = (id: string) => FESTIVALS.find((f) => f.id === id)?.name ?? id;

export function describeObjective(o: Objective): string {
  switch (o.kind) {
    case 'ship':
      return `Ship ${o.item ? getItem(o.item).name : `${o.category}s`}`;
    case 'deliver': {
      const what = o.item ? getItem(o.item).name : `any ${o.category}`;
      return `Bring ${what} to ${o.to === 'works' ? 'the Works Hall' : getVillager(o.to).name.split(' ')[0]}`;
    }
    case 'deliverKinds':
      return `Bring ${getVillager(o.to).name.split(' ')[0]} different kinds of ${o.category}`;
    case 'reachFloor':
      return `Reach floor ${o.floor} of the mine`;
    case 'pickup':
      return `Find ${getItem(o.item).name}`;
    case 'attend': {
      const f = FESTIVALS.find((x) => x.id === o.festival)!;
      return `${FESTIVAL_NAME(o.festival)} (${f.season[0].toUpperCase()}${f.season.slice(1)} ${f.day})`;
    }
    case 'scene':
      return getScene(o.scene).title;
    case 'hearts':
      return `Become friends with ${getVillager(o.villager).name.split(' ')[0]} (${o.hearts} ♥)`;
    case 'power':
      return 'Farm power supply';
    case 'own':
      return `Place ${o.count} ${o.machine.replace(/_/g, ' ')}`;
    case 'flag':
      return o.flag === 'heron_sailed' ? 'Sail the Heron with Ilo' : o.flag;
  }
}

export class People {
  private sceneLine = 0;
  private sceneId: string | null = null;
  private journalTab: 'quests' | 'friends' = 'quests';

  constructor(private readonly game: Game, private readonly modals: Modals, private readonly renderer: Renderer) {}

  private get s(): GameState {
    return this.game.state;
  }

  private supply = (state: GameState) => this.renderer.power(state).supply;

  // ---- Dialogue ----------------------------------------------------------------------------------
  dialogue(villager: string, text: string, hearts: number, gained: number): void {
    const v = getVillager(villager);
    this.modals.show({
      id: 'dialogue',
      title: v.name,
      docked: true,
      render: () =>
        h('div.talk', { onclick: () => this.modals.close('dialogue') },
          h('img.portrait', { src: portrait(villager) }),
          h('div.grow',
            h('div.talk-text', text),
            h('div.talk-foot', heartsEl(hearts), gained > 0 ? h('span.gain', `+${gained}`) : null, h('span.muted.small', 'Space / click to close')),
          ),
        ),
    });
  }

  // ---- Scenes ------------------------------------------------------------------------------------
  /** Called every frame: opens the scene player when the sim has queued a scene. */
  frame(): void {
    const q = this.s.sceneQueue[0];
    if (!q) return;
    if (this.modals.isOpen('scene') && this.sceneId === q.id) return;
    if (this.modals.open && !this.modals.isOpen('scene')) return;
    this.sceneId = q.id;
    this.sceneLine = 0;
    const sc = getScene(q.id);
    this.modals.show({ id: 'scene', title: sc.title, wide: true, noClose: true, render: () => this.renderScene() });
  }

  advance(): void {
    if (!this.sceneId) return;
    const sc = getScene(this.sceneId);
    if (this.sceneLine < sc.lines.length - 1) {
      this.sceneLine++;
      this.modals.refresh();
    } else if (!sc.choices?.length) this.finish(0);
  }

  private finish(choice: number): void {
    const id = this.sceneId!;
    this.modals.close('scene');
    this.sceneId = null;
    this.game.now({ type: 'sceneDone', id, choice });
  }

  private renderScene(): HTMLElement {
    if (!this.sceneId) return h('div');
    const sc = getScene(this.sceneId);
    const shown = sc.lines.slice(0, this.sceneLine + 1);
    const last = this.sceneLine >= sc.lines.length - 1;
    const log = h('div.scene-log', shown.map((l, i) =>
      h(`div.scene-line${l.who === 'narrator' ? '.narr' : ''}${i === shown.length - 1 ? '.cur' : ''}`,
        l.who === 'narrator' ? null : h('img.portrait.small', { src: portrait(l.who) }),
        h('div', l.who === 'narrator' ? null : h('div.b', speakerName(l.who)), h('div', l.text)))));
    queueMicrotask(() => (log.scrollTop = log.scrollHeight));
    const foot = last && sc.choices?.length
      ? h('div.choices', sc.choices.map((c, i) => h('button', { onclick: () => this.choose(i) }, c.text)))
      : h('div.row', h('button.primary', { onclick: () => this.advance() }, last ? 'Continue' : 'Next'), h('span.muted.small', 'Space / E'));
    return h('div.scene', log, foot);
  }

  private choose(i: number): void {
    const sc = getScene(this.sceneId!);
    const reply = sc.choices![i].reply;
    if (!reply) return this.finish(i);
    // Show the reply as a last line, then finish on the next click.
    this.modals.show({
      id: 'scene', title: sc.title, wide: true, noClose: true,
      render: () => h('div.scene', h('div.scene-log', h('div.scene-line.narr.cur', h('div', reply))), h('div.row', h('button.primary', { onclick: () => this.finish(i) }, 'Continue'))),
    });
    this.sceneLine = Number.MAX_SAFE_INTEGER;
    this.pendingChoice = i;
  }

  pendingChoice = -1;

  /** Space/E on a reply page. */
  advanceOrFinishReply(): void {
    if (this.pendingChoice >= 0 && this.sceneId) {
      const c = this.pendingChoice;
      this.pendingChoice = -1;
      return this.finish(c);
    }
    this.advance();
  }

  // ---- Journal -----------------------------------------------------------------------------------
  journal(): void {
    this.modals.show({ id: 'journal', title: 'Journal', wide: true, render: () => this.renderJournal() });
  }

  private renderJournal(): HTMLElement {
    const tab = (id: 'quests' | 'friends', label: string) =>
      h(`button.tab${this.journalTab === id ? '.on' : ''}`, { onclick: () => { this.journalTab = id; this.modals.refresh(); } }, label);
    return h('div', h('div.tabs', tab('quests', 'Quests'), tab('friends', 'Friends')), this.journalTab === 'quests' ? this.renderQuests() : this.renderFriends());
  }

  private renderQuests(): HTMLElement {
    const s = this.s;
    const active = s.quests.active.map((qp) => {
      const q = questDef(qp.id);
      return h(`div.quest.${q.arc}`,
        q.villager ? h('img.portrait.small', { src: portrait(q.villager) }) : null,
        h('div.grow',
          h('div.b', q.title, h('span.arc', q.arc === 'main' ? 'Story' : 'Side')),
          h('div.muted.small', q.summary),
          h('ul.objs', q.objectives.map((o, i) => {
            const [cur, target] = objectiveProgress(s, qp, i, this.supply);
            return h(`li${cur >= target ? '.done' : ''}`, describeObjective(o), target > 1 ? h('span.prog', ` ${cur}/${target}`) : null);
          })),
        ));
    });
    const board = s.board.filter((b) => !b.done && b.deadline >= s.day);
    return h('div.scroll.journal',
      active.length ? active : h('p.muted', 'Nothing pressing. Enjoy the quiet.'),
      board.length ? h('div', h('h3', 'Quest board'), board.map((b) => h('div.small', `${getVillager(b.villager).name.split(' ')[0]}: ${b.count} ${getItem(b.item).name} (${b.reward}g, by Sunday)`))) : null,
      s.quests.done.length ? h('div', h('h3', 'Done'), h('div.small.muted', s.quests.done.map((id) => questDef(id).title).join(' · '))) : null,
    );
  }

  private renderFriends(): HTMLElement {
    const s = this.s;
    return h('div.scroll.friends', VILLAGERS.map((v) => {
      const st = s.villagers[v.id];
      const status = st.married ? 'Married' : st.engaged ? 'Engaged' : st.courting ? 'Courting' : v.romanceable ? 'Single' : '';
      return h('div.friend',
        h('img.portrait.small', { src: portrait(v.id) }),
        h('div.grow',
          h('div.b', v.name, status ? h('span.arc', status) : null),
          h('div.muted.small', v.role),
          h('div.small', heartsEl(heartsOf(s, v.id)), ` · birthday ${v.birthday.season} ${v.birthday.day} · gifts this week ${st.giftsThisWeek}/2`, st.talkedToday ? ' · talked today' : ''),
        ));
    }));
  }

  // ---- Works Hall --------------------------------------------------------------------------------
  works(): void {
    this.modals.show({ id: 'works', title: 'Works Hall', wide: true, render: () => this.renderWorks() });
  }

  private renderWorks(): HTMLElement {
    const s = this.s;
    const rows = s.quests.active
      .filter((qp) => questDef(qp.id).objectives.some((o) => (o.kind === 'deliver' || o.kind === 'deliverKinds') && o.to === 'works'))
      .map((qp) => {
        const q = questDef(qp.id);
        let carrying = 0;
        const objs = q.objectives.map((o, i) => {
          const [cur, target] = objectiveProgress(s, qp, i, this.supply);
          const isWorks = (o.kind === 'deliver' || o.kind === 'deliverKinds') && o.to === 'works';
          const have = isWorks && cur < target ? carriedFor(s, o) : 0;
          carrying += have;
          return h(`li${cur >= target ? '.done' : ''}`, o.kind === 'deliver' && o.item ? h('img.inl', { src: itemIcon(o.item) }) : null, describeObjective(o), h('span.prog', ` ${cur}/${target}`), have ? h('span.have', ` (carrying ${have})`) : null);
        });
        return h('div.quest.main', h('div.grow', h('div.b', q.title), h('ul.objs', objs)),
          h('button.primary', { disabled: carrying === 0, onclick: () => this.game.now({ type: 'deliver', quest: qp.id }) }, 'Hand over'));
      });
    const greeting = s.flags.includes('sluice_open') ? 'Odile is humming at the counter. She stops when she sees you, then starts again.' : 'Odile looks up from a ledger. "Well? What have you brought?"';
    return h('div', h('div.talk', h('img.portrait', { src: portrait('odile') }), h('div.talk-text', greeting)), rows.length ? rows : h('p.muted', 'Nothing to hand over right now.'));
  }

  // ---- Quest board -------------------------------------------------------------------------------
  board(): void {
    this.modals.show({ id: 'board', title: 'Quest Board', wide: true, render: () => this.renderBoard() });
  }

  private renderBoard(): HTMLElement {
    const s = this.s;
    if (s.board.length === 0) return h('p.muted', 'The board is empty. New requests go up on Monday.');
    return h('div', h('p.muted.small', 'New requests every Monday. Each one is open until Sunday.'), s.board.map((b, i) => {
      const have = s.player.inventory.reduce((a, st) => a + (st?.id === b.item ? st.n : 0), 0);
      const expired = b.deadline < s.day;
      return h(`div.quest${b.done || expired ? '.dim' : ''}`,
        h('img.portrait.small', { src: portrait(b.villager) }),
        h('div.grow',
          h('div.b', `${getVillager(b.villager).name.split(' ')[0]} would like ${b.count} ${getItem(b.item).name}`),
          h('div.small', h('img.inl', { src: itemIcon(b.item) }), ` You have ${have} · reward ${b.reward}g and friendship`)),
        b.done ? h('span.arc', 'Done') : h('button.primary', { disabled: have < b.count || expired, onclick: () => this.game.now({ type: 'board', index: i }) }, 'Hand over'));
    }));
  }

  // ---- Festival ----------------------------------------------------------------------------------
  festival(): void {
    this.modals.show({ id: 'festival', title: FESTIVAL_NAME(festivalOn(this.s.day)?.id ?? ''), wide: true, render: () => this.renderFestival() });
  }

  private renderFestival(): HTMLElement {
    const s = this.s;
    const f = festivalOn(s.day);
    const fs = s.festival;
    if (!f || !fs) return h('p', 'The square is quiet.');
    const left = Math.max(0, FESTIVAL_ACTIVITY_MINUTES - (s.minute - fs.startMinute));
    const status: (HTMLElement | null)[] = [];
    if (f.id === 'blossom') status.push(h('div.b', `Pods found: ${fs.score} / ${POD_COUNT} · ${Math.round(left)} minutes left`));
    if (f.id === 'derby') status.push(h('div.b', `Fish caught: ${fs.score} · ${Math.round(left)} minutes left`));
    if (f.id === 'weighin') {
      if (fs.exhibit) status.push(h('div.b', `Your entry: ${getItem(fs.exhibit.id).name} (score ${fs.score}). Results when you leave.`));
      else {
        const grid = h('div.inv-grid');
        s.player.inventory.forEach((st, i) => {
          const ok = !!st && ['crop', 'product', 'animal', 'fish', 'forage'].includes(getItem(st.id).category);
          const el = slotEl(st, { onclick: () => ok && this.game.now({ type: 'exhibit', slot: i }) });
          if (st && !ok) el.classList.add('dim');
          grid.appendChild(el);
        });
        status.push(h('div', h('div.b', 'Pick your exhibit:'), grid));
      }
    }
    if (f.id === 'lantern') status.push(h('div.b', fs.score > 0 ? 'You found your secret friend!' : 'Somebody in town is your secret friend tonight. Any gift will do.'));
    return h('div', h('p', f.blurb), status, h('p.muted.small', 'Leave town to end the festival. The clock will skip ahead to the evening.'));
  }

  // ---- Homes and shop counters -------------------------------------------------------------------
  /** Whether a villager is indoors at the given door right now. */
  insideAt(id: string, map: string, x: number, y: number): boolean {
    const p = villagerPos(this.s, getVillager(id), simMinute(this.s));
    return p.hidden && p.map === map && Math.floor(p.x) === x && Math.floor(p.y) === y;
  }

  home(id: string, map: string, door: { x: number; y: number }): void {
    const v = getVillager(id);
    const inside = this.insideAt(id, map, door.x, door.y);
    this.modals.show({
      id: 'home', title: `${v.name.split(' ')[0]}'s place`,
      render: () => h('div', inside
        ? h('div.talk', h('img.portrait', { src: portrait(id) }), h('div.grow', h('div.talk-text', `${v.name.split(' ')[0]} is home.`), h('button.primary', { onclick: () => { this.modals.close('home'); this.game.now({ type: 'talk', villager: id }); } }, 'Chat')))
        : h('p', 'Nobody answers. They must be out.')),
    });
  }

  /** "Wren is behind the counter" with a chat button, for shop panels. */
  counter(keeper: string, map: string, door: { x: number; y: number }, close: () => void): HTMLElement | null {
    if (!this.insideAt(keeper, map, door.x, door.y)) return null;
    const first = getVillager(keeper).name.split(' ')[0];
    return h('div.counter', h('img.portrait.small', { src: portrait(keeper) }), h('span.grow', `${first} is behind the counter.`), h('button', { onclick: () => { close(); this.game.now({ type: 'talk', villager: keeper }); } }, `Chat with ${first}`));
  }
}

/** Name tags over nearby villagers. */
export class NameTags {
  private readonly el = h('div.nametags');
  private readonly tags = new Map<string, HTMLElement>();

  constructor(root: HTMLElement, private readonly game: Game, private readonly renderer: Renderer) {
    root.appendChild(this.el);
  }

  render(hidden: boolean): void {
    const p = this.game.state.player;
    const seen = new Set<string>();
    if (!hidden) {
      for (const n of this.renderer.npcs.visible) {
        if (Math.hypot(n.x - p.x, n.y - p.y) > 9) continue;
        const head = this.renderer.npcs.headOf(n.id);
        const sp = head && this.renderer.toScreen(head);
        if (!sp) continue;
        let tag = this.tags.get(n.id);
        if (!tag) {
          tag = h('div.nametag', getVillager(n.id).name.split(' ')[0]);
          this.tags.set(n.id, tag);
          this.el.appendChild(tag);
        }
        tag.style.transform = `translate(${Math.round(sp.x)}px, ${Math.round(sp.y)}px) translate(-50%, -100%)`;
        tag.style.display = '';
        seen.add(n.id);
      }
    }
    for (const [id, tag] of this.tags) if (!seen.has(id)) tag.style.display = 'none';
  }
}
