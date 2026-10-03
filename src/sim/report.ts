// End-of-day efficiency report (DESIGN.md §13).
import { DAY_MINUTES, PROCESSED_SCORE, REPORT_JAM_FRAC, REPORT_MAX_HINTS, REPORT_STARVED_FRAC, SPOIL_SCORE } from '../data/balance';
import { getMachine } from '../data';
import type { DayContext } from './context';
import type { DayReport, GameState } from './state';

export function buildReport(state: GameState, ctx: DayContext): DayReport {
  const t = state.today;
  const coins = t.coinsShipped + t.coinsChute + t.coinsOther;
  let working = 0;
  let powered = 0;
  const entityTypes: Record<string, string> = {};
  for (const e of state.farm.entities) entityTypes[String(e.id)] = e.type;
  for (const s of Object.values(t.entities)) {
    working += s.working;
    powered += s.working + s.idle + s.blocked;
  }
  return {
    day: state.day,
    stats: t,
    powerSupply: ctx.power.supply,
    powerDemand: ctx.power.demand,
    machines: state.farm.entities.length,
    score: Math.round(coins + PROCESSED_SCORE * t.crafted - SPOIL_SCORE * t.spoiled),
    uptime: powered === 0 ? 0 : working / powered,
    entityTypes,
    goalsCompleted: [],
    levelUps: [...t.levelUps],
    notes: bottleneckNotes(state),
  };
}

/**
 * Optimisation hints: the worst jams and the hungriest machines. A belt that is jammed most of the day
 * points at a slow receiver; a crafter idle most of the day is starved of input.
 */
export function bottleneckNotes(state: GameState): string[] {
  const notes: { score: number; text: string }[] = [];
  for (const e of state.farm.entities) {
    const st = state.today.entities[String(e.id)];
    if (!st) continue;
    const def = getMachine(e.type);
    const minutes = Math.max(1, st.working + st.idle + st.blocked + st.unpowered);
    if ((def.kind === 'belt' || def.kind === 'splitter') && st.blocked / DAY_MINUTES >= REPORT_JAM_FRAC) {
      notes.push({ score: st.blocked, text: `The ${def.name} at (${e.x}, ${e.y}) was jammed ${pctOf(st.blocked, DAY_MINUTES)} of the day: whatever it feeds can't keep up.` });
    } else if (def.kind === 'crafter' && st.idle / minutes >= REPORT_STARVED_FRAC && st.produced > 0) {
      notes.push({ score: st.idle, text: `The ${def.name} at (${e.x}, ${e.y}) sat waiting for input ${pctOf(st.idle, minutes)} of the day.` });
    } else if (st.blocked / minutes >= REPORT_JAM_FRAC && def.kind !== 'belt') {
      notes.push({ score: st.blocked, text: `The ${def.name} at (${e.x}, ${e.y}) was full and blocked ${pctOf(st.blocked, minutes)} of the day.` });
    }
  }
  return notes.sort((a, b) => b.score - a.score).slice(0, REPORT_MAX_HINTS).map((n) => n.text);
}

function pctOf(n: number, d: number): string {
  return `${Math.round((n / d) * 100)}%`;
}
