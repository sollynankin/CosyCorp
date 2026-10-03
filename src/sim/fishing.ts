// Fishing (DESIGN.md §12): cast, a seeded bite delay, then the catch mini-game in the sim tick. The reel
// input arrives as a command each time the button changes, so a replay reproduces every catch.
import {
  BITE_MAX_TICKS,
  BITE_MIN_TICKS,
  FISH_CATCH_RATE,
  FISH_DRAIN_RATE,
  FISH_GOLD_BASE,
  FISH_GOLD_PER_LEVEL,
  FISH_START_PROGRESS,
  FISH_ZONE_DAMP,
  FISH_ZONE_GRAVITY,
  FISH_ZONE_LIFT,
  FISH_ZONE_SIZE,
  XP_FISH,
} from '../data/balance';
import { FISH, type FishDef } from '../data/fish';
import type { Quality } from '../data/types';
import { getMapDef, isWaterTerrain, parseMap } from '../world';
import { giveItem } from './actions';
import { minuteOfClock, seasonOf } from './calendar';
import { emit, toast, type DayContext } from './context';
import { derbyCatch } from './festival';
import { rngInt, rngNext, rngWeighted } from './rng';
import { gainXp, skillLevel } from './skills';
import type { GameState } from './state';

/** Fish that can bite here and now. */
export function fishAvailable(state: GameState, map: string): FishDef[] {
  const where = getMapDef(map).fishing;
  const season = seasonOf(state.day);
  return FISH.filter((f) => {
    const placeOk = (where === 'river' || where === 'lake') && (f.where.includes(where) || (where === 'lake' && !!f.lakeFlag && state.flags.includes(f.lakeFlag)));
    if (!placeOk || !f.seasons.includes(season)) return false;
    if (f.weather && !f.weather.includes(state.weather)) return false;
    if (f.from && f.to) {
      const a = minuteOfClock(f.from);
      const b = minuteOfClock(f.to);
      if (state.minute < a || state.minute > b) return false;
    }
    return true;
  });
}

export function startFishing(state: GameState, ctx: DayContext, x: number, y: number): boolean {
  const p = state.player;
  const m = parseMap(p.map);
  if (!isWaterTerrain(m.terrain[y * m.w + x])) return false;
  const pool = fishAvailable(state, p.map);
  if (pool.length === 0) {
    toast(ctx, 'Nothing seems to be biting here.');
    return false;
  }
  // Harder fish are rarer.
  const fish = rngWeighted(state, pool.map((f) => [f.item, 1.4 - f.difficulty] as [string, number]));
  p.fishing = {
    phase: 'wait',
    biteIn: rngInt(state, BITE_MIN_TICKS, BITE_MAX_TICKS),
    fish,
    fishPos: 0.5,
    fishVel: 0,
    zonePos: 0.35,
    zoneVel: 0,
    progress: FISH_START_PROGRESS,
    tx: x,
    ty: y,
    derby: false,
    holding: false,
    retarget: 0,
    fishTarget: 0.5,
  };
  emit(ctx, { type: 'fx', fx: 'splash', map: p.map, x, y });
  return true;
}

function fishDef(item: string): FishDef {
  return FISH.find((f) => f.item === item)!;
}

/** Next target for the fish marker, by behaviour. */
function nextTarget(state: GameState, f: FishDef, cur: number): number {
  const r = rngNext(state);
  switch (f.behaviour) {
    case 'calm':
      return Math.min(1, Math.max(0, cur + (r - 0.5) * 0.4));
    case 'dart':
      return r;
    case 'sinker':
      return r * 0.55;
    case 'floater':
      return 0.45 + r * 0.55;
  }
}

function catchQuality(state: GameState): Quality {
  const gold = FISH_GOLD_BASE + skillLevel(state, 'fishing') * FISH_GOLD_PER_LEVEL;
  const r = rngNext(state);
  return r < gold ? 2 : r < gold * 3 ? 1 : 0;
}

export function tickFishing(state: GameState, ctx: DayContext): void {
  const p = state.player;
  const fs = p.fishing;
  if (!fs) return;
  if (fs.phase === 'wait') {
    fs.biteIn -= 1;
    if (fs.biteIn <= 0) {
      fs.phase = 'reel';
      emit(ctx, { type: 'sound', name: 'bite' });
    }
    return;
  }
  const f = fishDef(fs.fish);
  // Fish: moves toward a target, picking a new one every so often (faster for harder fish).
  if (--fs.retarget <= 0) {
    fs.fishTarget = nextTarget(state, f, fs.fishPos);
    fs.retarget = Math.round(14 - f.difficulty * 9);
  }
  const speed = 0.006 + f.difficulty * 0.02;
  fs.fishVel = fs.fishVel * 0.8 + Math.sign(fs.fishTarget - fs.fishPos) * speed * 0.2 * 5;
  fs.fishPos = Math.min(1, Math.max(0, fs.fishPos + Math.max(-speed, Math.min(speed, fs.fishVel))));
  // Zone: lift while held, gravity otherwise, bounce gently off the ends.
  const size = FISH_ZONE_SIZE[p.tools.rod];
  fs.zoneVel = (fs.zoneVel + (fs.holding ? FISH_ZONE_LIFT : -FISH_ZONE_GRAVITY)) * FISH_ZONE_DAMP;
  fs.zonePos += fs.zoneVel;
  if (fs.zonePos < 0) {
    fs.zonePos = 0;
    fs.zoneVel = Math.abs(fs.zoneVel) * 0.3;
  }
  if (fs.zonePos > 1 - size) {
    fs.zonePos = 1 - size;
    fs.zoneVel = 0;
  }
  const inside = fs.fishPos >= fs.zonePos && fs.fishPos <= fs.zonePos + size;
  fs.progress += inside ? FISH_CATCH_RATE : -FISH_DRAIN_RATE;
  if (fs.progress >= 1) {
    const q = catchQuality(state);
    p.fishing = null;
    giveItem(state, ctx, fs.fish, 1, q);
    gainXp(state, ctx, 'fishing', XP_FISH * (1 + f.difficulty));
    emit(ctx, { type: 'catch', item: fs.fish, q });
    if (p.map === 'town') derbyCatch(state, ctx);
  } else if (fs.progress <= 0) {
    p.fishing = null;
    emit(ctx, { type: 'escape' });
    toast(ctx, 'It got away.');
  }
}

export function reel(state: GameState, hold: boolean): void {
  if (state.player.fishing) state.player.fishing.holding = hold;
}

export function stopFishing(state: GameState): void {
  state.player.fishing = null;
}
