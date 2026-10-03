// Farm machines: static bodies (rebuilt when the layout changes), and per frame the spinning parts, status
// lamps and items riding the belts. Belt item positions come from their age plus the fraction of the
// current minute, so motion is smooth although the sim moves items once per in-game minute (DESIGN.md §5).
import * as THREE from 'three';
import { TICKS_PER_MINUTE } from '../data/balance';
import { getItem, getMachine } from '../data';
import type { Dir } from '../data/types';
import type { Entity, GameState, MachineStatus } from '../sim/state';
import { DX, DY, isWaterTerrain, parseMap } from '../world';
import { Batcher, tileMatrix } from './batcher';
import { glowMat, lampMat } from './materials';
import { itemShape } from './meshes/items';
import { lampGeo, machineMesh } from './meshes/machines';

export const STATUS_COLOR: Record<MachineStatus, string> = {
  working: '#5ad06a',
  idle: '#f0b840',
  blocked: '#f05a4a',
  unpowered: '#8a8a96',
};

/** Yaw that turns a north-facing model to face dir (0=N 1=E 2=S 3=W; N is −z). */
export const yawFor = (dir: Dir): number => (-dir * Math.PI) / 2;

/** The stream side of a Water Wheel (it is built facing −x, so the yaw differs). */
function wheelYaw(e: Entity): number {
  const m = parseMap('farm');
  for (const d of [3, 0, 2, 1] as Dir[]) {
    const x = e.x + DX[d];
    const y = e.y + DY[d];
    if (x >= 0 && y >= 0 && x < m.w && y < m.h && isWaterTerrain(m.terrain[y * m.w + x])) return yawFor(((d + 1) % 4) as Dir);
  }
  return 0;
}

export function machineYaw(e: Entity): number {
  return e.type === 'water_wheel' ? wheelYaw(e) : yawFor(e.dir);
}

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const tmpA = new THREE.Matrix4();
const tmpB = new THREE.Matrix4();
const tmpC = new THREE.Color();

export class MachineView {
  readonly group = new THREE.Group();
  private readonly bodies = new Batcher();
  private readonly glows = new Batcher(glowMat, { cast: false, receive: false });
  private readonly spinners = new Batcher();
  private readonly lamps = new Batcher(lampMat, { cast: false, receive: false });
  private readonly items = new Batcher();
  private layoutRev = -1;
  /** render-only spin phase per entity id */
  private readonly phase = new Map<number, number>();

  constructor() {
    this.group.add(this.bodies.group, this.glows.group, this.spinners.group, this.lamps.group, this.items.group);
  }

  /** frac: 0..1 progress through the current in-game minute. */
  update(state: GameState, dt: number, tickAlpha: number, entityFactor: Record<number, number>): void {
    const ents = state.farm.entities;
    if (state.farm.layoutRev !== this.layoutRev) {
      this.layoutRev = state.farm.layoutRev;
      this.bodies.begin();
      this.glows.begin();
      for (const e of ents) {
        const mm = machineMesh(e.type);
        const mtx = tileMatrix(e.x + 0.5, e.y + 0.5, 0, machineYaw(e));
        this.bodies.add(mm.body, mtx);
        if (mm.glow) this.glows.add(mm.glow, mtx);
      }
      this.bodies.end();
      this.glows.end();
    }

    const frac = Math.min(1, (state.subTick + tickAlpha) / TICKS_PER_MINUTE);
    this.spinners.begin();
    this.lamps.begin();
    this.items.begin();
    for (const e of ents) {
      const def = getMachine(e.type);
      const mm = machineMesh(e.type);
      const yaw = machineYaw(e);
      if (mm.spin) {
        const act = activity(state, e, entityFactor[e.id] ?? 0);
        const ph = (this.phase.get(e.id) ?? (e.id * 1.7) % 6.28) + dt * mm.spin.speed * act;
        this.phase.set(e.id, ph);
        const base = tileMatrix(e.x + 0.5, e.y + 0.5, 0, yaw);
        tmpA.copy(base).multiply(tmpB.makeTranslation(mm.spin.pivot[0], mm.spin.pivot[1], mm.spin.pivot[2]));
        tmpA.multiply(tmpB.makeRotationAxis(AXES[mm.spin.axis], ph));
        this.spinners.add(mm.spin.geo, tmpA);
      }
      if (mm.lampY > 0) {
        tmpC.set(STATUS_COLOR[e.status] ?? '#ffffff');
        // Machines without a work cycle show a steady colour from their own state.
        if (def.kind === 'storage' || def.kind === 'seller' || def.kind === 'generator' || def.kind === 'sprinkler' || def.kind === 'splitter') tmpC.set(passiveColor(state, e, entityFactor[e.id] ?? 0));
        this.lamps.add(lampGeo, tileMatrix(e.x + 0.5, e.y + 0.5, mm.lampY, 0), tmpC);
      }
      if (e.belt.length > 0) this.addBeltItems(e, frac);
    }
    this.spinners.end();
    this.lamps.end();
    this.items.end();
  }

  private addBeltItems(e: Entity, frac: number): void {
    const def = getMachine(e.type);
    const travel = def.travelMinutes ?? 1;
    const span = Math.max(1, travel - 1);
    const gap = 1 / Math.max(2, def.capacity ?? 3);
    let ahead = 1 + gap;
    for (const b of e.belt) {
      // The sim ages an item at the end of the step it entered, so age 1 = just arrived.
      let t = Math.min(1, Math.max(0, (b.age - 1 + frac) / span));
      t = Math.min(t, ahead - gap);
      ahead = t;
      const [x, z] = beltPoint(e, b.from, t);
      const it = getItem(b.item);
      tmpC.set(it.color);
      this.items.add(itemShape(it.icon), tileMatrix(x, z, 0.13, t * 2 + e.id, 0.95), tmpC);
    }
  }

  dispose(): void {
    for (const b of [this.bodies, this.glows, this.spinners, this.lamps, this.items]) b.dispose();
  }
}

/** Point along a belt tile: from the entry side to the centre, then to the front. t in 0..1. */
export function beltPoint(e: Entity, from: Dir, t: number): [number, number] {
  const cx = e.x + 0.5;
  const cy = e.y + 0.5;
  if (t < 0.5) {
    const k = 0.5 - t;
    return [cx + DX[from] * k, cy + DY[from] * k];
  }
  const k = t - 0.5;
  return [cx + DX[e.dir] * k, cy + DY[e.dir] * k];
}

function activity(state: GameState, e: Entity, factor: number): number {
  const def = getMachine(e.type);
  switch (def.kind) {
    case 'generator':
      return 1;
    case 'sprinkler':
      // They spray at dawn; afterwards they idle with a slow drift.
      return state.minute < 45 ? (def.needsPower && factor <= 0 ? 0 : 3) : 0.05;
    case 'splitter':
      return e.belt.length > 0 ? 1 : 0;
    default:
      return e.status === 'working' ? Math.max(0.2, factor) : 0;
  }
}

export function passiveColor(state: GameState, e: Entity, factor: number): string {
  const def = getMachine(e.type);
  if (def.kind === 'generator') return '#6ab8f0';
  if (def.needsPower && factor <= 0) return STATUS_COLOR.unpowered;
  if (def.kind === 'storage') {
    const n = e.stored.reduce((a, s) => a + s.n, 0);
    return n >= (def.capacity ?? 1) ? STATUS_COLOR.blocked : n > 0 ? STATUS_COLOR.working : STATUS_COLOR.idle;
  }
  const st = state.today.entities[String(e.id)];
  if (def.kind === 'seller') return st && st.produced > 0 ? STATUS_COLOR.working : STATUS_COLOR.idle;
  return STATUS_COLOR.working;
}
