import { describe, expect, it } from 'vitest';
import { DAYS_PER_SEASON } from '../src/data/balance';
import { endDay, seasonOf, soilAt } from '../src/sim';
import { sandbox, soil } from './helpers';

function advanceTo(sb: ReturnType<typeof sandbox>, day: number) {
  while (sb.s.day < day) endDay(sb.s, sb.ctx, false);
}

describe('seasons and weather', () => {
  it('crops wither when their season ends; multi-season and hardy crops survive', () => {
    const sb = sandbox();
    advanceTo(sb, DAYS_PER_SEASON - 1); // spring 14
    soil(sb.s, 20, 12, 'radish', 1); // spring only
    soil(sb.s, 21, 12, 'pea', 1); // spring + summer
    endDay(sb.s, sb.ctx, false);
    expect(seasonOf(sb.s.day)).toBe('summer');
    expect(soilAt(sb.s, 20, 12)!.crop!.withered).toBe(true);
    expect(soilAt(sb.s, 21, 12)!.crop!.withered).toBe(false);

    advanceTo(sb, DAYS_PER_SEASON * 3 - 1); // autumn 14
    soil(sb.s, 22, 12, 'frostkale', 1);
    soil(sb.s, 23, 12, 'carrot', 1);
    endDay(sb.s, sb.ctx, false);
    expect(seasonOf(sb.s.day)).toBe('winter');
    expect(soilAt(sb.s, 22, 12)!.crop!.withered).toBe(false);
    expect(soilAt(sb.s, 23, 12)!.crop!.withered).toBe(true);
  });

  it('hardy crops grow at half speed on frozen soil', () => {
    const sb = sandbox();
    advanceTo(sb, DAYS_PER_SEASON * 3);
    soil(sb.s, 22, 12, 'frostkale', 1);
    soilAt(sb.s, 22, 12)!.watered = true;
    endDay(sb.s, sb.ctx, false);
    expect(soilAt(sb.s, 22, 12)!.crop!.days).toBe(1.5);
  });

  it('day 1 is sunny, snow only falls in winter, rain waters the farm', () => {
    const sb = sandbox(5);
    expect(sb.s.weather).toBe('sunny');
    let rainy = 0;
    for (let d = 0; d < DAYS_PER_SEASON * 3; d++) {
      soil(sb.s, 20, 12);
      endDay(sb.s, sb.ctx, false);
      if (seasonOf(sb.s.day) !== 'winter') expect(sb.s.weather).not.toBe('snow');
      if (sb.s.weather === 'rain' || sb.s.weather === 'storm') {
        rainy++;
        expect(soilAt(sb.s, 20, 12)?.watered ?? true).toBe(true);
      }
    }
    expect(rainy).toBeGreaterThan(3);
  });
});
