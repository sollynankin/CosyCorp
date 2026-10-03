// Stretch goals, checked at day end before the report (DESIGN.md §13). Pure functions of today's stats.
import { getMachine } from '../data';
import { GOALS, type GoalDef } from '../data/goals';
import { seasonOf } from './calendar';
import { learnRecipes } from './crafting';
import type { GameState } from './state';

export function goalMet(state: GameState, g: GoalDef): boolean {
  const t = state.today;
  const c = g.check;
  switch (c.kind) {
    case 'chuteDay':
      return t.coinsChute >= c.coins;
    case 'leanDay':
      return t.coinsShipped + t.coinsChute + t.coinsOther >= c.coins && state.farm.entities.length <= c.maxMachines;
    case 'cleanDay':
      return t.harvestedMachine >= c.harvested && t.spoiled === 0;
    case 'uptime': {
      const powered = state.farm.entities.filter((e) => getMachine(e.type).powerDraw > 0);
      if (powered.length < c.machines) return false;
      let working = 0;
      let total = 0;
      for (const e of powered) {
        const st = t.entities[String(e.id)];
        if (!st) return false;
        working += st.working;
        total += st.working + st.idle + st.blocked + st.unpowered;
      }
      return total > 0 && working / total >= c.uptime;
    }
    case 'seasonCrafted':
      return state.season.crafted >= c.count;
  }
}

/** Checks this season's open goals; grants rewards; returns the titles completed today. */
export function checkGoals(state: GameState): string[] {
  const done: string[] = [];
  const season = seasonOf(state.day);
  for (const g of GOALS) {
    if (g.season !== season || state.rewards.includes(g.id)) continue;
    if (!goalMet(state, g)) continue;
    state.rewards.push(g.id, g.reward);
    if (g.recipes) learnRecipes(state, g.recipes);
    done.push(`${g.title}. Reward: ${g.rewardText}`);
  }
  return done;
}
