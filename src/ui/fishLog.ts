// The Fishing tab: a field guide to every fish, with your longest catch of each and how it measures up.
import { FISH_GOLD_AT, FISH_SILVER_AT, QUALITY_PRICE_MULT } from '../data/balance';
import { FISH, type FishDef } from '../data/fish';
import { getItem } from '../data';
import type { Game } from '../game/game';
import { dateLabel, sellPrice } from '../sim';
import { sizeThresholds } from '../sim/fishing';
import { h } from './dom';
import { itemIcon } from './icons';

const SIZE_LABEL = ['Normal', 'Silver ★', 'Gold ★★'];
const SIZE_CLASS = ['', 'q-silver', 'q-gold'];

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function placeText(f: FishDef): string {
  return f.where.map((w) => (w === 'river' ? 'river' : 'lake')).join(' or ');
}

function whenText(f: FishDef): string {
  const parts = [f.seasons.length === 4 ? 'any season' : f.seasons.map(cap).join(', ')];
  if (f.from && f.to) parts.push(`${f.from}–${f.to}`);
  if (f.weather) parts.push(f.weather.join(' or '));
  return parts.join(' · ');
}

/** A bar from the smallest to the biggest length of the species, with the silver and gold lines marked. */
function lengthBar(f: FishDef, bestCm: number | null): HTMLElement {
  const frac = bestCm === null ? 0 : Math.min(1, Math.max(0, (bestCm - f.minCm) / (f.maxCm - f.minCm)));
  const cls = frac >= FISH_GOLD_AT ? 'gold' : frac >= FISH_SILVER_AT ? 'silver' : 'normal';
  return h('div.len-bar',
    h(`div.len-fill.${cls}`, { style: { width: `${frac * 100}%` } }),
    h('div.len-mark.silver', { style: { left: `${FISH_SILVER_AT * 100}%` } }),
    h('div.len-mark.gold', { style: { left: `${FISH_GOLD_AT * 100}%` } }),
  );
}

export function fishLogBody(game: Game): HTMLElement {
  const s = game.state;
  const log = s.fishLog;
  const species = FISH.filter((f) => log[f.item]);
  const total = species.reduce((n, f) => n + log[f.item].caught, 0);
  const sizes = species.reduce((acc, f) => acc.map((n, i) => n + log[f.item].bySize[i]), [0, 0, 0]);
  let longest: { name: string; cm: number } | null = null;
  for (const f of species) if (!longest || log[f.item].bestCm > longest.cm) longest = { name: getItem(f.item).name, cm: log[f.item].bestCm };

  const rows = FISH.map((f) => {
    const rec = log[f.item];
    if (!rec) {
      return h('div.fish-entry.unknown',
        h('img.fish-icon', { src: itemIcon(f.item), draggable: 'false' }),
        h('div.grow', h('div.b', '???'), h('div.small.muted', `Not caught yet. Try the ${placeText(f)}.`)));
    }
    const t = sizeThresholds(f);
    return h('div.fish-entry',
      h('img.fish-icon', { src: itemIcon(f.item), draggable: 'false' }),
      h('div.grow',
        h('div.b', getItem(f.item).name, h(`span.arc.${SIZE_CLASS[rec.bestQ]}`, SIZE_LABEL[rec.bestQ])),
        lengthBar(f, rec.bestCm),
        h('div.small', h('b', `${rec.bestCm} cm`), ` longest (range ${f.minCm}–${f.maxCm} cm) · caught ${rec.caught}`,
          ` (${rec.bySize[0]} normal, ${rec.bySize[1]} silver, ${rec.bySize[2]} gold) · first on ${dateLabel(rec.firstDay)}`),
        h('div.small.muted', `${cap(placeText(f))} · ${whenText(f)}`),
        h('div.small.muted', `Silver from ${t.silverCm} cm (+${Math.round((QUALITY_PRICE_MULT[1] - 1) * 100)}%), gold from ${t.goldCm} cm (+${Math.round((QUALITY_PRICE_MULT[2] - 1) * 100)}%). Sells ${sellPrice(f.item, 0)}g / ${sellPrice(f.item, 1)}g / ${sellPrice(f.item, 2)}g.`),
      ));
  });

  return h('div.fish-log',
    h('div.fish-summary',
      h('div', h('b', `${species.length} / ${FISH.length}`), ' species'),
      h('div', h('b', String(total)), ' fish caught'),
      h('div', h('b', String(sizes[1])), ' silver · ', h('b', String(sizes[2])), ' gold'),
      h('div', longest ? h('span', 'Longest: ', h('b', `${longest.name}, ${longest.cm} cm`)) : 'No fish caught yet'),
    ),
    h('p.muted.small', 'Longer fish are silver or gold and sell for a bonus, but they fight harder. Eat fish from the backpack to restore energy.'),
    h('div.scroll.fish-list', rows),
  );
}
