// Fishing (DESIGN.md §12): cast, a seeded bite delay, then the catch mini-game in the sim tick. The reel
// input arrives as a command each time the button changes, so a replay reproduces every catch.
import {
  BITE_MAX_TICKS,
  BITE_MIN_TICKS,
  FISH_CATCH_RATE,
  FISH_DRAIN_RATE,
  FISH_GOLD_AT,
  FISH_LENGTH_SKEW,
  FISH_LENGTH_SKILL_BONUS,
  FISH_SILVER_AT,
  FISH_SIZE_DIFFICULTY,
  FISH_SIZE_REEL_TIME,
  FISH_START_PROGRESS,
  FISH_ZONE_DAMP,
  FISH_ZONE_GRAVITY,
  FISH_ZONE_LIFT,
  FISH_ZONE_SIZE,
  QUALITY_PRICE_MULT,
  XP_FISH,
} from '../data/balance';
import { FISH, fishDefOf, type FishDef } from '../data/fish';
import { getItem } from '../data';
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
  const def = fishDef(fish);
  const { size, lenCm } = rollLength(state, def);
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
    lenCm,
    size,
    difficulty: fishDifficulty(def, size),
  };
  emit(ctx, { type: 'fx', fx: 'splash', map: p.map, x, y });
  return true;
}

function fishDef(item: string): FishDef {
  return fishDefOf(item)!;
}

/** A big fish fights harder than an average one of its kind, a small one softer. */
export function fishDifficulty(def: FishDef, size: number): number {
  return Math.min(0.98, Math.max(0.05, def.difficulty + (size - 0.5) * FISH_SIZE_DIFFICULTY));
}

/** Size class of a catch from its place in the species' length range: 0 normal, 1 silver, 2 gold. */
export function sizeClass(size: number): Quality {
  return size >= FISH_GOLD_AT ? 2 : size >= FISH_SILVER_AT ? 1 : 0;
}

/** Roll a length: small fish are common, fishing skill nudges the roll up. */
export function rollLength(state: GameState, def: FishDef): { size: number; lenCm: number } {
  const size = Math.min(1, Math.max(0, rngNext(state) ** FISH_LENGTH_SKEW + skillLevel(state, 'fishing') * FISH_LENGTH_SKILL_BONUS));
  return { size, lenCm: Math.round(def.minCm + size * (def.maxCm - def.minCm)) };
}

/** Length in cm at which a species' catch becomes silver and gold (for the Fishing tab and the wiki). */
export function sizeThresholds(def: FishDef): { silverCm: number; goldCm: number } {
  const at = (frac: number) => Math.round(def.minCm + frac * (def.maxCm - def.minCm));
  return { silverCm: at(FISH_SILVER_AT), goldCm: at(FISH_GOLD_AT) };
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
    fs.retarget = Math.round(14 - fs.difficulty * 9);
  }
  const speed = 0.006 + fs.difficulty * 0.02;
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
  fs.progress += inside ? FISH_CATCH_RATE / (1 + fs.size * FISH_SIZE_REEL_TIME) : -FISH_DRAIN_RATE;
  if (fs.progress >= 1) {
    const q = sizeClass(fs.size);
    p.fishing = null;
    giveItem(state, ctx, fs.fish, 1, q);
    gainXp(state, ctx, 'fishing', XP_FISH * (1 + fs.difficulty));
    const record = logCatch(state, fs.fish, fs.lenCm, q);
    const bonus = Math.round((QUALITY_PRICE_MULT[q] - 1) * 100);
    toast(ctx, `${getItem(fs.fish).name}: ${fs.lenCm} cm${q ? `, ${q === 2 ? 'gold' : 'silver'} size (+${bonus}% price)` : ''}${record ? '. A new record!' : ''}`);
    emit(ctx, { type: 'catch', item: fs.fish, q, cm: fs.lenCm, record });
    if (p.map === 'town') derbyCatch(state, ctx);
  } else if (fs.progress <= 0) {
    p.fishing = null;
    emit(ctx, { type: 'escape' });
    toast(ctx, 'It got away.');
  }
}

/** Update the species record. Returns true when this is the longest one so far (a first catch counts). */
function logCatch(state: GameState, item: string, cm: number, q: Quality): boolean {
  const rec = state.fishLog[item];
  if (!rec) {
    const bySize: [number, number, number] = [0, 0, 0];
    bySize[q] = 1;
    state.fishLog[item] = { caught: 1, bestCm: cm, bestQ: q, bySize, firstDay: state.day };
    return true;
  }
  rec.caught += 1;
  rec.bySize[q] += 1;
  if (cm > rec.bestCm) {
    rec.bestCm = cm;
    rec.bestQ = q;
    return true;
  }
  return false;
}

export function reel(state: GameState, hold: boolean): void {
  if (state.player.fishing) state.player.fishing.holding = hold;
}

export function stopFishing(state: GameState): void {
  state.player.fishing = null;
}
