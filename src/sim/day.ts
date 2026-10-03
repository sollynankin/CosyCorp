// End of day and the next morning (DESIGN.md §1). Order matters; keep it in sync with the design doc.
import { CAN_CAPACITY, DAY_MINUTES, PASS_OUT_ENERGY_FRAC } from '../data/balance';
import { seasonOf } from './calendar';
import { ensureContext, type DayContext } from './context';
import { applyMorningWeather, applySeasonChange, growOvernight } from './farming';
import { dawnSprinklers, factoryStep } from './factory';
import { START_POS } from './init';
import { buildReport } from './report';
import { sellShipping } from './economy';
import { spoilOvernight } from './spoilage';
import type { GameState } from './state';
import { emptyDayStats } from './stats';
import { rollWeather } from './weather';
import { regrowTrees, respawnForage } from './worldDaily';
import { overnightHooks, morningHooks } from './hooks';
import { checkGoals } from './goals';

export function endDay(state: GameState, ctx: DayContext, passedOut: boolean): void {
  // 1. Machines finish the day (sleeping early never loses production).
  while (state.step < DAY_MINUTES) factoryStep(state, ctx);
  state.player.fishing = null;
  // 2. Shipping bin.
  sellShipping(state);
  // 3. Spoilage of raw goods on belts and in machine buffers.
  spoilOvernight(state);
  const t = state.today;
  state.season.coins += t.coinsShipped + t.coinsChute + t.coinsOther;
  state.season.crafted += t.crafted;
  // 4. Story/relationship/animal/goal hooks that look at today, then the report.
  const notes = overnightHooks(state, ctx);
  state.report = buildReport(state, ctx);
  state.report.notes.push(...notes);
  state.report.goalsCompleted = checkGoals(state);
  // 5. Overnight growth uses today's season and heat.
  growOvernight(state, ctx.heat);
  regrowTrees(state);
  // 6. Calendar.
  const oldSeason = seasonOf(state.day);
  state.day += 1;
  const newSeason = seasonOf(state.day);
  if (newSeason !== oldSeason) {
    const withered = applySeasonChange(state, newSeason, ctx.heat);
    if (withered > 0) state.report.notes.push(`${withered} crops withered as ${newSeason} arrived.`);
    state.season = { coins: 0, spoiled: 0, crafted: 0 };
  }
  // 7. Weather.
  state.weather = state.tomorrowWeather;
  state.tomorrowWeather = rollWeather(state, state.day + 1);
  // 8. Morning.
  newMorning(state, ctx, passedOut);
}

function newMorning(state: GameState, ctx: DayContext, passedOut: boolean): void {
  state.minute = 0;
  state.subTick = 0;
  state.step = 0;
  state.today = emptyDayStats();
  state.passedOut = passedOut;
  const p = state.player;
  p.energy = passedOut ? Math.round(p.maxEnergy * PASS_OUT_ENERGY_FRAC) : p.maxEnergy;
  p.map = START_POS.map;
  p.x = START_POS.x;
  p.y = START_POS.y;
  p.facing = 2;
  p.swing = 0;
  p.fishing = null;
  p.canWater = Math.max(p.canWater, 0);
  if (p.canWater > CAN_CAPACITY[p.tools.can]) p.canWater = CAN_CAPACITY[p.tools.can];
  respawnForage(state, state.day);
  applyMorningWeather(state);
  ensureContext(state, ctx);
  dawnSprinklers(state, ctx);
  morningHooks(state, ctx);
  ctx.events.push({ type: 'dayEnd' });
}
