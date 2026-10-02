import { describe, expect, it } from 'vitest';
import { CROP_BALANCE, ITEM_VALUE, QUALITY_PRICE_MULT } from '../src/data/balance';
import { countItem, endDay, sellPrice } from '../src/sim';
import { minuteOfClock } from '../src/sim/calendar';
import { deserialize, serialize } from '../src/sim/serialize';
import { act, give, sandbox, stand } from './helpers';

describe('shipping and shops', () => {
  it('ships items overnight at quality-adjusted prices', () => {
    const sb = sandbox();
    const { s } = sb;
    s.player.inventory[20] = { id: 'radish', q: 2, n: 3 };
    s.player.inventory[21] = { id: 'carrot', q: 0, n: 2 };
    expect(act(sb, { type: 'ship', slot: 20, n: 3 }).ok).toBe(true);
    expect(act(sb, { type: 'ship', slot: 21, n: 1 }).ok).toBe(true);
    const coins = s.player.coins;
    endDay(s, sb.ctx, false);
    const expected = 3 * Math.round(ITEM_VALUE.radish * QUALITY_PRICE_MULT[2]) + ITEM_VALUE.carrot;
    expect(s.player.coins - coins).toBe(expected);
    expect(s.report!.stats.coinsShipped).toBe(expected);
    expect(countItem(s.player.inventory, 'carrot')).toBe(1);
  });

  it('refuses to ship tools and things worth nothing', () => {
    const sb = sandbox();
    expect(act(sb, { type: 'ship', slot: 0, n: 1 }).ok).toBe(false);
  });

  it('buys seeds only when the shop is open, in season and affordable', () => {
    const sb = sandbox();
    const { s } = sb;
    stand(s, 9, 14, 0, 'town');
    s.minute = minuteOfClock('08:00');
    expect(act(sb, { type: 'buy', shop: 'almanac', item: 'carrot_seeds', n: 2 }).ok).toBe(false); // closed
    s.minute = minuteOfClock('10:00');
    const before = s.player.coins;
    expect(act(sb, { type: 'buy', shop: 'almanac', item: 'carrot_seeds', n: 2 }).ok).toBe(true);
    expect(s.player.coins).toBe(before - 2 * CROP_BALANCE.carrot.seedPrice);
    expect(act(sb, { type: 'buy', shop: 'almanac', item: 'pumpkin_seeds', n: 1 }).ok).toBe(false); // autumn only
    s.player.coins = 1;
    expect(act(sb, { type: 'buy', shop: 'almanac', item: 'carrot_seeds', n: 1 }).ok).toBe(false);
  });

  it('sellPrice rounds per item', () => {
    expect(sellPrice('radish', 1)).toBe(Math.round(ITEM_VALUE.radish * 1.25));
  });
});

describe('save and load', () => {
  it('round-trips the full state and keeps playing identically', () => {
    const sb = sandbox(11);
    give(sb.s, 'carrot_seeds', 3);
    endDay(sb.s, sb.ctx, false);
    const copy = deserialize(serialize(sb.s));
    expect(copy).toEqual(sb.s);
    const sb2 = { s: copy, ctx: sandbox().ctx };
    endDay(sb.s, sb.ctx, false);
    endDay(sb2.s, sb2.ctx, false);
    expect(serialize(sb2.s)).toBe(serialize(sb.s));
  });

  it('rejects garbage and fills missing fields from defaults', () => {
    expect(() => deserialize('{"hello":1}')).toThrow();
    const sb = sandbox();
    const raw = JSON.parse(serialize(sb.s));
    delete raw.board;
    delete raw.player.skillXp;
    const s = deserialize(JSON.stringify(raw));
    expect(s.board).toEqual([]);
    expect(s.player.skillXp.farming).toBe(0);
  });
});
