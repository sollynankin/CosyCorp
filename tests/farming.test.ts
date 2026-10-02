import { describe, expect, it } from 'vitest';
import { CROP_BALANCE, DAY_MINUTES, TICKS_PER_MINUTE } from '../src/data/balance';
import { countItem, cropStage, endDay, isRipe, runTicks, soilAt } from '../src/sim';
import { act, give, sandbox, selectItem, soil, stand } from './helpers';

describe('hand farming', () => {
  it('till, plant, water, grow through stages, harvest', () => {
    const sb = sandbox();
    const { s } = sb;
    stand(s, 20, 12, 1);
    s.maps.farm.objects[12 * 44 + 21] = null;
    selectItem(s, 'hoe');
    expect(act(sb, { type: 'use', x: 21, y: 12 }).ok).toBe(true);
    expect(soilAt(s, 21, 12)).not.toBeNull();
    selectItem(s, 'radish_seeds');
    expect(act(sb, { type: 'use', x: 21, y: 12 }).ok).toBe(true);
    selectItem(s, 'can');
    expect(act(sb, { type: 'use', x: 21, y: 12 }).ok).toBe(true);
    expect(soilAt(s, 21, 12)!.watered).toBe(true);

    const days = CROP_BALANCE.radish.growthDays;
    const stages: number[] = [];
    for (let d = 0; d < days; d++) {
      soilAt(s, 21, 12)!.watered = true;
      endDay(s, sb.ctx, false);
      stages.push(cropStage(soilAt(s, 21, 12)!.crop!));
    }
    expect(stages).toEqual([1, 2, 3]);
    expect(isRipe(soilAt(s, 21, 12)!.crop)).toBe(true);
    stand(s, 20, 12, 1);
    s.player.selected = 0;
    s.player.inventory[0] = null;
    expect(act(sb, { type: 'interact', x: 21, y: 12 }).ok).toBe(true);
    expect(countItem(s.player.inventory, 'radish')).toBe(1);
    expect(soilAt(s, 21, 12)!.crop).toBeNull();
  });

  it('unwatered crops stall but do not die', () => {
    const sb = sandbox();
    soil(sb.s, 20, 12, 'radish', 1);
    endDay(sb.s, sb.ctx, false);
    expect(soilAt(sb.s, 20, 12)!.crop!.days).toBe(1);
  });

  it('out-of-season seeds are refused', () => {
    const sb = sandbox();
    give(sb.s, 'pumpkin_seeds', 1);
    soil(sb.s, 21, 12);
    stand(sb.s, 20, 12, 1);
    selectItem(sb.s, 'pumpkin_seeds');
    const r = act(sb, { type: 'use', x: 21, y: 12 });
    expect(r.ok).toBe(false);
  });

  it('the day ends at 02:00 by passing out, with reduced energy', () => {
    const sb = sandbox();
    runTicks(sb.s, sb.ctx, DAY_MINUTES * TICKS_PER_MINUTE);
    expect(sb.s.day).toBe(1);
    expect(sb.s.passedOut).toBe(true);
    expect(sb.s.player.energy).toBeLessThan(sb.s.player.maxEnergy);
  });
});
