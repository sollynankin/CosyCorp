// Player commands. Every player action goes through applyCommand so the command log fully determines the
// game (DESIGN.md §15). Commands return a player-facing reason instead of throwing.
import { HOTBAR_SLOTS, ITEM_ENERGY, PLAYER_SPEED, REACH, TOOL_SWING_TICKS } from '../data/balance';
import { getItem } from '../data';
import type { Dir } from '../data/types';
import { dirFromVector, inBounds, parseMap } from '../world';
import { emit, toast, type DayContext } from './context';
import { moveCircle } from './collision';
import { farmIdx, isPlantableIn, plantCrop, soilAt } from './farming';
import { seasonOf } from './calendar';
import { takeFromSlot } from './inventory';
import { interactTile } from './interact';
import { toolEnergy, useTool } from './tools';
import type { GameState } from './state';
import { spendEnergy } from './energy';
import { checkWarp } from './warp';
import { endDay } from './day';
import { buy, collectOverflow, ship } from './shop';
import { pickupMachine, placeMachine, rotateMachine } from './placement';
import { chestMove } from './machineInteract';

export type Command =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'use'; x: number; y: number }
  | { type: 'interact'; x: number; y: number }
  | { type: 'select'; slot: number }
  | { type: 'swap'; a: number; b: number }
  | { type: 'eat'; slot: number }
  | { type: 'sleep' }
  | { type: 'buy'; shop: string; item: string; n: number }
  | { type: 'ship'; slot: number; n: number }
  | { type: 'collectOverflow' }
  | { type: 'place'; item: string; x: number; y: number; dir: Dir }
  | { type: 'pickup'; x: number; y: number }
  | { type: 'rotate'; x: number; y: number; dir?: Dir }
  | { type: 'chest'; entity: number; fromBackpack: boolean; index: number };

export type CommandResult = { ok: true } | { ok: false; reason: string };

const OK: CommandResult = { ok: true };
const fail = (reason: string): CommandResult => ({ ok: false, reason });

/** Distance check from the player's centre to the target tile's centre. */
export function inReach(state: GameState, x: number, y: number): boolean {
  const p = state.player;
  const dx = x + 0.5 - p.x;
  const dy = y + 0.5 - p.y;
  return dx * dx + dy * dy <= REACH * REACH;
}

/** The tile directly in front of the player. */
export function facingTile(state: GameState): [number, number] {
  const p = state.player;
  const DXs = [0, 1, 0, -1];
  const DYs = [-1, 0, 1, 0];
  return [Math.floor(p.x) + DXs[p.facing], Math.floor(p.y) + DYs[p.facing]];
}

function faceToward(state: GameState, x: number, y: number): void {
  const p = state.player;
  const tx = Math.floor(p.x);
  const ty = Math.floor(p.y);
  if (tx === x && ty === y) return;
  p.facing = dirFromVector(x + 0.5 - p.x, y + 0.5 - p.y, p.facing) as Dir;
}

export function busy(state: GameState): boolean {
  return state.player.swing > 0 || state.player.fishing !== null;
}

function cmdMove(state: GameState, ctx: DayContext, dx: number, dy: number): CommandResult {
  const p = state.player;
  if (busy(state)) return OK;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return OK;
  // Normalise (diagonals are not faster) and scale to one tick of walking.
  const sx = (dx / len) * PLAYER_SPEED * Math.min(1, len);
  const sy = (dy / len) * PLAYER_SPEED * Math.min(1, len);
  p.facing = dirFromVector(dx, dy, p.facing);
  const [nx, ny] = moveCircle(state, p.map, p.x, p.y, sx, sy);
  p.moving = nx !== p.x || ny !== p.y;
  p.x = nx;
  p.y = ny;
  checkWarp(state, ctx);
  return OK;
}

function cmdUse(state: GameState, ctx: DayContext, x: number, y: number): CommandResult {
  const p = state.player;
  if (busy(state)) return fail('Busy.');
  const m = parseMap(p.map);
  if (!inBounds(m, x, y)) return fail('Out of reach.');
  if (!inReach(state, x, y)) return fail('Out of reach.');
  faceToward(state, x, y);
  const slot = p.inventory[p.selected];
  if (!slot) return interactTile(state, ctx, x, y);
  const item = getItem(slot.id);
  if (item.tool) {
    const cost = toolEnergy(state, item.tool);
    p.swing = TOOL_SWING_TICKS;
    p.swingTool = item.tool;
    const did = useTool(state, ctx, item.tool, x, y);
    if (did) spendEnergy(state, ctx, cost);
    return did ? OK : fail('Nothing to do there.');
  }
  if (item.category === 'seed') return plantFromSlot(state, ctx, x, y);
  // Anything else falls back to interacting (placing machines, feeding hoppers, eating is separate).
  return interactTile(state, ctx, x, y);
}

export function plantFromSlot(state: GameState, ctx: DayContext, x: number, y: number): CommandResult {
  const p = state.player;
  const slot = p.inventory[p.selected];
  if (!slot) return fail('Nothing selected.');
  const item = getItem(slot.id);
  if (p.map !== 'farm') return fail('Seeds go in tilled soil on the farm.');
  const s = soilAt(state, x, y);
  if (!s) return fail('Till the ground first.');
  if (s.crop) return fail('Something is already growing there.');
  const cropId = item.plants!;
  if (!isPlantableIn(cropId, seasonOf(state.day), ctx.heat[farmIdx(x, y)])) {
    return fail(`${getItem(slot.id).name} won't grow in ${seasonOf(state.day)}.`);
  }
  takeFromSlot(p.inventory, p.selected, 1);
  plantCrop(state, x, y, cropId);
  emit(ctx, { type: 'fx', fx: 'plant', map: 'farm', x, y });
  return OK;
}

function cmdInteract(state: GameState, ctx: DayContext, x: number, y: number): CommandResult {
  if (busy(state)) return fail('Busy.');
  if (!inReach(state, x, y)) return fail('Out of reach.');
  faceToward(state, x, y);
  return interactTile(state, ctx, x, y);
}

function cmdEat(state: GameState, ctx: DayContext, slotIndex: number): CommandResult {
  const p = state.player;
  const slot = p.inventory[slotIndex];
  if (!slot) return fail('Nothing there.');
  const energy = ITEM_ENERGY[slot.id];
  if (!energy) return fail(`You can't eat ${getItem(slot.id).name}.`);
  if (p.energy >= p.maxEnergy) return fail("You're not hungry.");
  takeFromSlot(p.inventory, slotIndex, 1);
  p.energy = Math.min(p.maxEnergy, p.energy + energy);
  toast(ctx, `Ate ${getItem(slot.id).name}. +${energy} energy`);
  return OK;
}

export function applyCommand(state: GameState, ctx: DayContext, cmd: Command): CommandResult {
  switch (cmd.type) {
    case 'move':
      return cmdMove(state, ctx, cmd.dx, cmd.dy);
    case 'use':
      return cmdUse(state, ctx, cmd.x, cmd.y);
    case 'interact':
      return cmdInteract(state, ctx, cmd.x, cmd.y);
    case 'select':
      if (cmd.slot < 0 || cmd.slot >= HOTBAR_SLOTS) return fail('No such slot.');
      state.player.selected = cmd.slot;
      return OK;
    case 'swap': {
      const inv = state.player.inventory;
      if (cmd.a < 0 || cmd.b < 0 || cmd.a >= inv.length || cmd.b >= inv.length) return fail('No such slot.');
      [inv[cmd.a], inv[cmd.b]] = [inv[cmd.b], inv[cmd.a]];
      return OK;
    }
    case 'eat':
      return cmdEat(state, ctx, cmd.slot);
    case 'sleep':
      if (state.player.map !== 'farm') return fail('Your bed is at the farmhouse.');
      endDay(state, ctx, false);
      return OK;
    case 'buy':
      return buy(state, ctx, cmd.shop, cmd.item, cmd.n);
    case 'ship':
      return ship(state, ctx, cmd.slot, cmd.n);
    case 'collectOverflow':
      return collectOverflow(state);
    case 'place':
      return placeMachine(state, ctx, cmd.item, cmd.x, cmd.y, cmd.dir);
    case 'pickup':
      return pickupMachine(state, ctx, cmd.x, cmd.y);
    case 'rotate':
      return rotateMachine(state, cmd.x, cmd.y, cmd.dir);
    case 'chest':
      return chestMove(state, ctx, cmd.entity, cmd.fromBackpack, cmd.index);
  }
}
