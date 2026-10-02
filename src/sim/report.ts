// End-of-day efficiency report (DESIGN.md §13).
import { PROCESSED_SCORE, SPOIL_SCORE } from '../data/balance';
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
    notes: [],
  };
}
