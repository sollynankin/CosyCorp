// Stretch goals (DESIGN.md §13): optional optimisation challenges, one or two per season. They never block
// the story. Rewards are cosmetics (flags in state.rewards that meshes read) and rare recipes.
import type { SeasonId } from './types';

export type GoalCheck =
  /** coins from Market Chutes in one day */
  | { kind: 'chuteDay'; coins: number }
  /** total coins in one day with at most this many machines placed */
  | { kind: 'leanDay'; coins: number; maxMachines: number }
  /** machine-harvested crops in one day with nothing spoiled */
  | { kind: 'cleanDay'; harvested: number }
  /** at least this many powered machines, all-day uptime at least this share */
  | { kind: 'uptime'; machines: number; uptime: number }
  /** items crafted by machines over the season so far */
  | { kind: 'seasonCrafted'; count: number };

export interface GoalDef {
  id: string;
  season: SeasonId;
  title: string;
  check: GoalCheck;
  /** cosmetic or recipe-gate flag added to state.rewards */
  reward: string;
  /** recipes learned too */
  recipes?: string[];
  rewardText: string;
}

export const GOALS: GoalDef[] = [
  {
    id: 'g_spring_chute', season: 'spring', title: 'Sell 400g through Market Chutes in one day',
    check: { kind: 'chuteDay', coins: 400 }, reward: 'golden_belts', rewardText: 'Brass-bright conveyor rails',
  },
  {
    id: 'g_spring_clean', season: 'spring', title: 'Machines harvest 30 crops in one day with nothing spoiled',
    check: { kind: 'cleanDay', harvested: 30 }, reward: 'medley', rewardText: 'Recipe: Harvest Medley (Preserver)',
  },
  {
    id: 'g_summer_lean', season: 'summer', title: 'Earn 900g in one day with at most 15 machines placed',
    check: { kind: 'leanDay', coins: 900, maxMachines: 15 }, reward: 'yard_bunting', rewardText: 'Bunting over Penhallow Yard',
    recipes: ['cook_fish_stew'],
  },
  {
    id: 'g_autumn_uptime', season: 'autumn', title: 'Run 6 or more powered machines at 80% uptime for a whole day',
    check: { kind: 'uptime', machines: 6, uptime: 0.8 }, reward: 'farm_lanterns', rewardText: 'Lanterns along the farm path',
    recipes: ['cook_pumpkin_pie'],
  },
  {
    id: 'g_winter_crafted', season: 'winter', title: 'Machines craft 40 goods this winter',
    check: { kind: 'seasonCrafted', count: 40 }, reward: 'weathervane', rewardText: 'A brass heron weathervane on the farmhouse',
  },
];
