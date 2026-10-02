// End-of-day efficiency report (DESIGN.md §13).
import { getItem, getMachine } from '../data';
import { dateLabel } from '../sim';
import type { DayReport } from '../sim';
import { h } from './dom';

export function renderReport(r: DayReport, passedOut: boolean): HTMLElement {
  const t = r.stats;
  const coins = t.coinsShipped + t.coinsChute + t.coinsOther;
  const sold = Object.entries(t.sold).sort((a, b) => b[1] - a[1]);
  const machines = Object.entries(t.entities)
    .map(([id, st]) => ({ id, type: r.entityTypes[id], ...st }))
    .filter((m) => m.type && getMachine(m.type).kind !== 'belt' && getMachine(m.type).kind !== 'splitter')
    .sort((a, b) => b.produced - a.produced);
  const belts = Object.entries(t.entities).filter(([id]) => r.entityTypes[id] && ['belt', 'splitter'].includes(getMachine(r.entityTypes[id]).kind));
  const beltMoved = belts.reduce((a, [, s]) => a + s.moved, 0);
  const beltBlocked = belts.reduce((a, [, s]) => a + s.blocked, 0);
  const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '–');

  return h(
    'div.report',
    passedOut ? h('p.warn', 'You passed out! Someone carried you home. You start the day a little tired.') : null,
    h('div.report-date', dateLabel(r.day)),
    h(
      'div.stat-row',
      stat('Coins earned', `${coins}g`),
      stat('Score', String(r.score)),
      stat('Harvested', `${t.harvestedHand + t.harvestedMachine}`, `${t.harvestedHand} by hand · ${t.harvestedMachine} by machine`),
      stat('Spoiled', String(t.spoiled), t.spoiled ? 'raw goods left on belts or in buffers' : 'nothing wasted'),
    ),
    h(
      'div.cols',
      h(
        'div',
        h('h3', 'Income'),
        line('Shipping bin', `${t.coinsShipped}g`),
        line('Market Chute', `${t.coinsChute}g`),
        line('Other', `${t.coinsOther}g`),
        sold.length ? h('div.sold', sold.slice(0, 8).map(([id, n]) => h('div.chip', `${getItem(id).name} ×${n}`))) : h('div.muted', 'Nothing sold today.'),
      ),
      h(
        'div',
        h('h3', 'The Works'),
        r.machines === 0
          ? h('div.muted', 'No machines yet. Restore the Works to unlock automation.')
          : [
              line('Power', `${r.powerSupply} supply / ${r.powerDemand} demand`),
              line('Uptime', pct(r.uptime, 1)),
              line('Crafted', String(t.crafted)),
              belts.length ? line('Belts', `${beltMoved} moves · ${beltBlocked} jammed minutes`) : null,
              machines.length
                ? h(
                    'table.mtable',
                    h('tr', h('th', 'Machine'), h('th', 'Made'), h('th', 'Working'), h('th', 'Idle'), h('th', 'Blocked')),
                    machines.slice(0, 10).map((m) => {
                      const total = m.working + m.idle + m.blocked + m.unpowered;
                      return h('tr', h('td', getMachine(m.type).name), h('td', String(m.produced)), h('td', pct(m.working, total)), h('td', pct(m.idle, total)), h('td', pct(m.blocked + m.unpowered, total)));
                    }),
                  )
                : null,
            ],
      ),
    ),
    r.levelUps.length ? h('div.notes', r.levelUps.map((l) => h('div.note', `Level up: ${l}`))) : null,
    r.goalsCompleted.length ? h('div.notes', r.goalsCompleted.map((g) => h('div.note.good', `Stretch goal complete: ${g}`))) : null,
    r.notes.length ? h('div.notes', r.notes.map((n) => h('div.note', n))) : null,
  );
}

function stat(label: string, value: string, sub?: string): HTMLElement {
  return h('div.stat', h('div.stat-v', value), h('div.stat-l', label), sub ? h('div.stat-s', sub) : null);
}

function line(label: string, value: string): HTMLElement {
  return h('div.line', h('span', label), h('span.b', value));
}
