import { MAX_SKILL_LEVEL, SKILL_XP_THRESHOLDS } from '../data/balance';
import type { SkillId } from '../data/types';
import type { DayContext } from './context';
import type { GameState } from './state';

export function levelForXp(xp: number): number {
  let lvl = 0;
  while (lvl < MAX_SKILL_LEVEL && xp >= SKILL_XP_THRESHOLDS[lvl]) lvl++;
  return lvl;
}

export function skillLevel(state: GameState, skill: SkillId): number {
  return levelForXp(state.player.skillXp[skill]);
}

export function gainXp(state: GameState, ctx: DayContext, skill: SkillId, xp: number): void {
  const before = skillLevel(state, skill);
  state.player.skillXp[skill] += xp;
  const after = skillLevel(state, skill);
  if (after > before) {
    ctx.events.push({ type: 'toast', text: `${skill[0].toUpperCase()}${skill.slice(1)} level ${after}!` });
    state.today.levelUps.push(`${skill} ${after}`);
  }
}
