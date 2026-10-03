// The mine (DESIGN.md §12): ten floors. Each visit lays out rocks, ore and dust bunnies from
// hash(seed, floor, day), so it never consumes the RNG and the same day always looks the same. The ladder
// hides under one rock, or shows up after LADDER_ROCK_LIMIT rocks.
import {
  BUNNIES_BASE,
  BUNNIES_PER_FLOOR,
  BUNNY_ENERGY,
  BUNNY_HOP_TICKS,
  BUNNY_SIGHT,
  LADDER_ROCK_LIMIT,
  LIFT_FLOORS,
  MINE_ORE_CHANCE,
  MINE_ORE_HP,
  MINE_ORE_TABLE,
  MINE_ROCK_HP,
  MINE_ROCKS_BASE,
  MINE_ROCKS_PER_FLOOR,
  TICKS_PER_MINUTE,
} from '../data/balance';
import { DX, DY, MINE_FLOORS, mineFloorNumber, parseMap } from '../world';
import type { CommandResult } from './commands';
import { emit, toast, type DayContext } from './context';
import { spendEnergy } from './energy';
import { hash32 } from './hash';
import type { GameState } from './state';
import { warpTo } from './warp';

const ENTRY = { x: 10, y: 2 };

function freeForRock(map: string, i: number, w: number): boolean {
  const m = parseMap(map);
  if (m.staticBlocked[i]) return false;
  const x = i % w;
  const y = Math.floor(i / w);
  return !(Math.abs(x - ENTRY.x) <= 1 && y <= ENTRY.y + 1);
}

function pickOre(floor: number, h: number): string {
  const band = [...MINE_ORE_TABLE].reverse().find((b) => floor >= b.from)!;
  const total = band.ores.reduce((a, [, w]) => a + w, 0);
  let r = h % total;
  for (const [item, w] of band.ores) {
    r -= w;
    if (r < 0) return item;
  }
  return band.ores[0][0];
}

/** Tile index of the rock hiding the ladder today, or -1 (bottom floor). */
export function ladderRock(state: GameState, floor: number): number {
  if (floor >= MINE_FLOORS) return -1;
  const rocks = rockTiles(state, floor);
  return rocks.length ? rocks[hash32(state.seed, floor, state.day, 99) % rocks.length] : -1;
}

function rockTiles(state: GameState, floor: number): number[] {
  const map = `mine${floor}`;
  const m = parseMap(map);
  const want = MINE_ROCKS_BASE + floor * MINE_ROCKS_PER_FLOOR;
  const out: number[] = [];
  for (let k = 0; out.length < want && k < want * 8; k++) {
    const i = hash32(state.seed, floor, state.day, k) % (m.w * m.h);
    if (freeForRock(map, i, m.w) && !out.includes(i)) out.push(i);
  }
  return out;
}

/** Lays out a floor on arrival (fresh each visit). */
export function populateFloor(state: GameState, floor: number): void {
  const map = `mine${floor}`;
  const m = parseMap(map);
  const objs = state.maps[map].objects;
  objs.fill(null);
  state.mineBroken = 0;
  const oreChance = MINE_ORE_CHANCE[floor] ?? 0.2;
  for (const i of rockTiles(state, floor)) {
    const h = hash32(state.seed, floor, state.day, i, 3);
    objs[i] = (h % 1000) / 1000 < oreChance ? { kind: 'ore', item: pickOre(floor, h >>> 10), hp: MINE_ORE_HP } : { kind: 'stone', hp: MINE_ROCK_HP };
  }
  const bunnies = Math.floor(BUNNIES_BASE + (floor - 1) * BUNNIES_PER_FLOOR);
  for (let k = 0, placed = 0; placed < bunnies && k < 200; k++) {
    const i = hash32(state.seed, floor, state.day, k, 5) % (m.w * m.h);
    const x = i % m.w;
    const y = Math.floor(i / m.w);
    if (m.staticBlocked[i] || objs[i] || Math.abs(x - ENTRY.x) + Math.abs(y - ENTRY.y) < 6) continue;
    objs[i] = { kind: 'bunny', hp: 1 };
    placed++;
  }
}

export function enterMine(state: GameState, ctx: DayContext, from: string, to: string): void {
  const floor = mineFloorNumber(to);
  populateFloor(state, floor);
  if (floor === 1 && from === 'forest' && state.mineDeepest >= LIFT_FLOORS[1]) emit(ctx, { type: 'panel', panel: 'lift' });
}

/** A rock broke: count it, and reveal the ladder under its rock or after enough rocks. */
export function onRockBroken(state: GameState, ctx: DayContext, map: string, x: number, y: number): void {
  const floor = mineFloorNumber(map);
  if (!floor) return;
  state.mineBroken += 1;
  const m = parseMap(map);
  const objs = state.maps[map].objects;
  if (objs.some((o) => o?.kind === 'ladder')) return;
  const i = y * m.w + x;
  const hidden = ladderRock(state, floor);
  if (hidden < 0) return;
  if (i === hidden || state.mineBroken >= LADDER_ROCK_LIMIT) {
    objs[i] = { kind: 'ladder' };
    toast(ctx, 'A ladder down!');
  }
}

export function climbDown(state: GameState, ctx: DayContext): CommandResult {
  const floor = mineFloorNumber(state.player.map);
  if (!floor || floor >= MINE_FLOORS) return { ok: false, reason: 'This is the bottom.' };
  warpTo(state, ctx, `mine${floor + 1}`, ENTRY.x, ENTRY.y, 2);
  return { ok: true };
}

export function takeLift(state: GameState, ctx: DayContext, floor: number): CommandResult {
  if (mineFloorNumber(state.player.map) !== 1) return { ok: false, reason: 'The lift is on the first floor.' };
  if (!LIFT_FLOORS.includes(floor) || floor > Math.max(1, state.mineDeepest)) return { ok: false, reason: "The lift doesn't go there yet." };
  if (floor !== 1) warpTo(state, ctx, `mine${floor}`, ENTRY.x, ENTRY.y, 2);
  return { ok: true };
}

/** Dust bunnies hop toward you; touching one costs energy and bounces you back. */
export function tickMine(state: GameState, ctx: DayContext): void {
  const p = state.player;
  const floor = mineFloorNumber(p.map);
  if (!floor) return;
  const m = parseMap(p.map);
  const objs = state.maps[p.map].objects;
  const t = state.minute * TICKS_PER_MINUTE + state.subTick;
  const px = Math.floor(p.x);
  const py = Math.floor(p.y);
  if (t % BUNNY_HOP_TICKS === 0) {
    const bunnies: number[] = [];
    for (let i = 0; i < objs.length; i++) if (objs[i]?.kind === 'bunny') bunnies.push(i);
    for (const i of bunnies) {
      const bx = i % m.w;
      const by = Math.floor(i / m.w);
      const dx = px - bx;
      const dy = py - by;
      if (Math.abs(dx) + Math.abs(dy) > BUNNY_SIGHT || (dx === 0 && dy === 0)) continue;
      const step = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      const ni = (by + step[1]) * m.w + bx + step[0];
      if (m.staticBlocked[ni] || objs[ni]) continue;
      objs[ni] = objs[i];
      objs[i] = null;
    }
  }
  const here = py * m.w + px;
  if (objs[here]?.kind === 'bunny') {
    spendEnergy(state, ctx, BUNNY_ENERGY);
    emit(ctx, { type: 'fx', fx: 'poof', map: p.map, x: px, y: py });
    toast(ctx, 'Oof! A dust bunny.');
    // Bounce: the bunny tumbles away from you (or dissolves if it has nowhere to go), so one touch costs once.
    const d = p.facing;
    const bi = (py + DY[d]) * m.w + px + DX[d];
    const bunny = objs[here];
    objs[here] = null;
    if (!m.staticBlocked[bi] && !objs[bi]) objs[bi] = bunny;
  }
}
