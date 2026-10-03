// Story walk (DESIGN.md §0, §10): a scripted player who only does the obvious thing for each active objective
// must reach the finale. Run twice: attending festivals, and skipping every festival (dated beats must
// complete anyway). Also checks the side arcs and that nothing is left stuck.
import { describe, expect, it } from 'vitest';
import { getVillager } from '../src/data';
import { FESTIVALS } from '../src/data/festivals';
import { dayOf, QUESTS } from '../src/data/quests';
import type { Objective } from '../src/data/types';
import {
  applyCommand,
  checkSceneTriggers,
  endDay,
  ensureContext,
  festivalOn,
  finishScene,
  giveGift,
  heartsOf,
  minuteOfClock,
  objectiveProgress,
  placeMachine,
  questDef,
  talkTo,
  updateQuests,
  warpTo,
  interactTile,
  type GameState,
} from '../src/sim';
import { deliverToVillager } from '../src/sim/quests';
import { clearFarm, give, sandbox, selectItem, type Sandbox } from './helpers';

const FORAGE = ['wild_leek', 'morel', 'blackberry', 'sweet_clover', 'hazelnut'];

function drainScenes(sb: Sandbox, log: string[]): void {
  for (let guard = 0; sb.s.sceneQueue.length && guard < 20; guard++) {
    const id = sb.s.sceneQueue[0].id;
    log.push(`${sb.s.day}:${id}`);
    expect(finishScene(sb.s, sb.ctx, id, 0).ok).toBe(true);
  }
}

function befriend(sb: Sandbox, id: string): void {
  const s = sb.s;
  talkTo(s, sb.ctx, id);
  const loved = getVillager(id).loves[0];
  give(s, loved, 1);
  selectItem(s, loved);
  giveGift(s, sb.ctx, id, s.player.selected);
}

function home(sb: Sandbox): void {
  if (sb.s.player.map !== 'farm') warpTo(sb.s, sb.ctx, 'farm', 9, 7, 2);
}

let wheels = 0;
function addWheel(sb: Sandbox): void {
  const y = 9 + wheels * 2;
  wheels++;
  clearFarm(sb.s, 4, y, 4, y);
  give(sb.s, 'water_wheel', 1);
  expect(placeMachine(sb.s, sb.ctx, 'water_wheel', 4, y, 1).ok).toBe(true);
  ensureContext(sb.s, sb.ctx);
}

/** Does the obvious thing for one unmet objective. */
function work(sb: Sandbox, qid: string, o: Objective, opts: { festivals: boolean }): void {
  const s = sb.s;
  switch (o.kind) {
    case 'ship':
      s.farm.shipping.push({ id: o.item ?? 'radish', q: 0, n: o.count });
      return;
    case 'deliver':
      give(s, o.item ?? 'radish', o.count);
      if (o.to === 'works') expect(applyCommand(s, sb.ctx, { type: 'deliver', quest: qid }).ok).toBe(true);
      else deliverToVillager(s, sb.ctx, o.to, o.item ?? 'radish');
      return;
    case 'deliverKinds':
      for (const f of FORAGE) {
        give(s, f, 1);
        deliverToVillager(s, sb.ctx, o.to, f);
      }
      return;
    case 'reachFloor':
      for (let f = 1; f <= o.floor; f++) warpTo(s, sb.ctx, `mine${f}`, 10, 2, 2);
      home(sb);
      return;
    case 'pickup': {
      const floor = o.item === 'logbook' ? 5 : 3;
      warpTo(s, sb.ctx, `mine${floor}`, 10, 2, 2);
      const objs = s.maps[`mine${floor}`].objects;
      const i = objs.findIndex((x) => x?.kind === 'story' && x.item === o.item);
      expect(i, `${o.item} should be waiting on floor ${floor}`).toBeGreaterThanOrEqual(0);
      const w = 22;
      expect(interactTile(s, sb.ctx, i % w, Math.floor(i / w)).ok).toBe(true);
      home(sb);
      return;
    }
    case 'attend': {
      const f = festivalOn(s.day);
      if (!opts.festivals || !f || f.id !== o.festival) return;
      s.minute = minuteOfClock(f.start);
      warpTo(s, sb.ctx, 'town', 1, 15, 1);
      home(sb);
      return;
    }
    case 'hearts':
      befriend(sb, o.villager);
      return;
    case 'power':
      while (sb.ctx.power.supply < o.supply) addWheel(sb);
      updateQuests(s, sb.ctx);
      return;
    case 'flag':
      if (o.flag === 'heron_sailed') {
        befriend(sb, 'ilo');
        if (heartsOf(s, 'ilo') >= 5) {
          s.minute = minuteOfClock('10:00');
          warpTo(s, sb.ctx, 'lake', 24, 26, 0);
          home(sb);
        }
      }
      return;
    default:
      return;
  }
}

function walk(opts: { festivals: boolean; sides: boolean }): { s: GameState; log: string[]; finaleDay: number } {
  wheels = 0;
  const sb = sandbox(11);
  const s = sb.s;
  const log: string[] = [];
  let finaleDay = -1;
  for (let guard = 0; guard < 3 * 56 && finaleDay < 0; guard++) {
    drainScenes(sb, log);
    // Side arcs start from heart events: an attentive player befriends Ilo and Saffi and visits them.
    if (opts.sides) {
      for (const v of ['ilo', 'saffi']) befriend(sb, v);
      s.minute = minuteOfClock('10:00');
      warpTo(sb.s, sb.ctx, 'lake', 24, 26, 0);
      drainScenes(sb, log);
      warpTo(sb.s, sb.ctx, 'forest', 21, 1, 2);
      drainScenes(sb, log);
      home(sb);
    }
    for (let pass = 0; pass < 3; pass++) {
      for (const qp of [...s.quests.active]) {
        const q = questDef(qp.id);
        q.objectives.forEach((o, i) => {
          const live = s.quests.active.find((a) => a.id === qp.id);
          if (!live) return;
          const [cur, target] = objectiveProgress(s, live, i, () => sb.ctx.power.supply);
          if (cur < target) work(sb, qp.id, o, opts);
        });
        drainScenes(sb, log);
      }
    }
    if (s.seenScenes.includes('finale')) finaleDay = s.day;
    s.minute = Math.max(s.minute, 0);
    endDay(s, sb.ctx, false);
    drainScenes(sb, log);
    if (finaleDay < 0 && s.seenScenes.includes('finale')) finaleDay = s.day - 1;
  }
  return { s, log, finaleDay };
}

describe('story walk', () => {
  it('an attentive player reaches the finale on Lantern Night of year 2, with both side arcs done', () => {
    const { s, log, finaleDay } = walk({ festivals: true, sides: true });
    const lanternY2 = dayOf(2, 3, FESTIVALS.find((f) => f.id === 'lantern')!.day);
    expect(finaleDay, log.join(' ')).toBe(lanternY2);
    for (const q of QUESTS) expect(s.quests.done, `quest ${q.id}`).toContain(q.id);
    expect(s.quests.active).toEqual([]);
    expect(s.flags).toEqual(expect.arrayContaining(['yard_wheel', 'pressing_room', 'sluice_open', 'great_wheel', 'greenhouse', 'lantern_line', 'finale', 'heron_sailed', 'seed_library']));
    expect(s.flags).not.toContain('silted');
    // Beats happen in order.
    const order = ['arrival', 'first_harvest', 'yard_wheel', 'pressing_room', 'logbook', 'open_together', 'thaw_flood', 'great_wheel', 'lantern_line', 'finale'];
    const idx = order.map((id) => log.findIndex((l) => l.endsWith(`:${id}`)));
    expect(idx.every((v) => v >= 0), log.join(' ')).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    // The flood hits on Spring 4 of year 2, with a storm.
    expect(log.find((l) => l.endsWith(':thaw_flood'))).toBe(`${dayOf(2, 0, 4)}:thaw_flood`);
    // Blueprints were learned along the way.
    expect(s.recipes).toEqual(expect.arrayContaining(['craft_sprinkler', 'craft_conveyor', 'craft_jam_press', 'craft_windmill']));
  });

  it('a player who skips every festival still reaches the finale (dated beats never wait)', () => {
    const { s, log, finaleDay } = walk({ festivals: false, sides: false });
    expect(finaleDay, log.join(' ')).toBeGreaterThan(0);
    expect(finaleDay).toBeLessThanOrEqual(dayOf(2, 3, 14));
    expect(s.quests.done).toContain('blossom');
    expect(log.some((l) => l.endsWith(':missed_festival'))).toBe(true);
    for (const q of QUESTS.filter((x) => x.arc === 'main')) expect(s.quests.done).toContain(q.id);
  });

  it('every quest reference is valid', () => {
    const ids = new Set(QUESTS.map((q) => q.id));
    for (const q of QUESTS) for (const r of q.requires) expect(ids.has(r), `${q.id} requires ${r}`).toBe(true);
    void checkSceneTriggers;
  });
});

describe('quest board', () => {
  it('posts on Mondays from in-season items, pays coins and friendship, and expires on Sunday', async () => {
    const { BOARD_POINTS, BOARD_SIZE } = await import('../src/data/balance');
    const { boardPool, fulfilBoard } = await import('../src/sim');
    const sb = sandbox(3);
    const s = sb.s;
    expect(s.board.length).toBe(BOARD_SIZE);
    const pool = boardPool(s.day).map((p) => p.item);
    for (const b of s.board) expect(pool).toContain(b.item);
    const b = s.board[0];
    expect(fulfilBoard(s, sb.ctx, 0).ok).toBe(false);
    give(s, b.item, b.count);
    const coins = s.player.coins;
    expect(fulfilBoard(s, sb.ctx, 0).ok).toBe(true);
    expect(s.player.coins - coins).toBe(b.reward);
    expect(s.villagers[b.villager].points).toBe(BOARD_POINTS);
    // Next Monday a new board replaces it.
    while (s.day < 7) endDay(s, sb.ctx, false);
    expect(s.board.every((x) => x.id.startsWith('b7_'))).toBe(true);
  });
});
