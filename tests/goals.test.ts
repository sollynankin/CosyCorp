// Stretch goals (DESIGN.md §13): checked at day end, rewards cosmetics and rare recipes, never block the story.
import { describe, expect, it } from 'vitest';
import { GOALS } from '../src/data/goals';
import { QUESTS } from '../src/data/quests';
import { endDay } from '../src/sim';
import { build, sandbox, stock } from './helpers';

describe('stretch goals', () => {
  it('a chute-heavy spring day completes the chute goal and unlocks golden belts', () => {
    const sb = sandbox();
    const silo = build(sb, 'silo', 30, 12, 1);
    stock(silo, 'carrot', 40);
    build(sb, 'conveyor', 31, 12, 1);
    build(sb, 'market_chute', 32, 12, 1);
    endDay(sb.s, sb.ctx, false);
    // 40 carrots × round(40 × 0.9) = 1440g through the chute.
    expect(sb.s.report!.goalsCompleted.length).toBe(1);
    expect(sb.s.rewards).toEqual(expect.arrayContaining(['g_spring_chute', 'golden_belts']));
    // A goal completes once.
    stock(silo, 'carrot', 40);
    endDay(sb.s, sb.ctx, false);
    expect(sb.s.report!.goalsCompleted).toEqual([]);
  });

  it('goals of another season do not count', () => {
    const sb = sandbox();
    sb.s.day = 14; // summer
    const silo = build(sb, 'silo', 30, 12, 1);
    stock(silo, 'carrot', 40);
    build(sb, 'conveyor', 31, 12, 1);
    build(sb, 'market_chute', 32, 12, 1);
    endDay(sb.s, sb.ctx, false);
    expect(sb.s.rewards).not.toContain('golden_belts');
    // Summer's lean goal: 1440g with 3 machines.
    expect(sb.s.rewards).toContain('yard_bunting');
    expect(sb.s.recipes).toContain('cook_fish_stew');
  });

  it('no quest depends on a goal reward', () => {
    const rewards = new Set(GOALS.flatMap((g) => [g.id, g.reward]));
    for (const q of QUESTS) for (const f of q.requiresFlags ?? []) expect(rewards.has(f)).toBe(false);
  });
});
