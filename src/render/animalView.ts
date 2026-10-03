// Farm animals. On grazing days they wander in front of their building during the day; otherwise they are
// indoors. The wander path is render-only (a smooth function of time and the animal's id), so the sim
// never sees it (CLAUDE.md rule 2).
import * as THREE from 'three';
import { getMapDef } from '../world';
import { canGraze, homeOf } from '../sim/animals';
import type { GameState } from '../sim/state';
import { minuteOfClock } from '../sim/calendar';
import { Batcher, tileMatrix } from './batcher';
import { ball, box, cone, cyl, merge } from './meshes/kit';

const chicken = merge([
  ball(0.17, '#f6f0e4', { y: 0.2, sx: 1.1, sz: 1.3 }, 1),
  ball(0.1, '#f6f0e4', { y: 0.38, z: -0.15 }, 1),
  box(0.05, 0.07, 0.08, '#e84a3a', { y: 0.45, z: -0.15 }),
  cone(0.04, 0.08, '#f0b040', { y: 0.36, z: -0.26, rx: -Math.PI / 2 }, 4),
  cyl(0.015, 0.015, 0.12, '#e0a040', { x: -0.06, y: 0 }, 4),
  cyl(0.015, 0.015, 0.12, '#e0a040', { x: 0.06, y: 0 }, 4),
  ball(0.09, '#e8e0d0', { y: 0.27, z: 0.2, sx: 0.6 }, 0),
]);

const cow = merge([
  box(0.5, 0.42, 0.9, '#f2ece4', { y: 0.38 }),
  box(0.28, 0.2, 0.3, '#2a2420', { x: 0.12, y: 0.62, z: 0.1 }),
  box(0.2, 0.18, 0.24, '#2a2420', { x: -0.14, y: 0.45, z: -0.25 }),
  box(0.3, 0.3, 0.32, '#f2ece4', { y: 0.58, z: -0.58 }),
  box(0.24, 0.14, 0.12, '#e8b0a8', { y: 0.55, z: -0.76 }),
  cone(0.04, 0.12, '#e8dcc0', { x: -0.12, y: 0.86, z: -0.56 }, 5),
  cone(0.04, 0.12, '#e8dcc0', { x: 0.12, y: 0.86, z: -0.56 }, 5),
  box(0.08, 0.38, 0.08, '#e8e0d8', { x: -0.18, z: -0.3 }),
  box(0.08, 0.38, 0.08, '#e8e0d8', { x: 0.18, z: -0.3 }),
  box(0.08, 0.38, 0.08, '#e8e0d8', { x: -0.18, z: 0.3 }),
  box(0.08, 0.38, 0.08, '#e8e0d8', { x: 0.18, z: 0.3 }),
  cyl(0.02, 0.02, 0.3, '#2a2420', { y: 0.35, z: 0.47, rx: 0.3 }, 4),
]);

export class AnimalView {
  readonly group = new THREE.Group();
  private readonly batch = new Batcher();

  constructor() {
    this.group.add(this.batch.group);
  }

  update(state: GameState, time: number): void {
    this.batch.begin();
    const out = state.player.map === 'farm' && canGraze(state) && state.minute >= minuteOfClock('07:00') && state.minute < minuteOfClock('17:30');
    if (out) {
      const buildings = getMapDef('farm').buildings;
      for (const a of state.animals) {
        const b = buildings.find((x) => x.id === homeOf(a))!;
        const cx = b.door.x + 0.5;
        const cy = b.door.y + 2.5;
        const k = a.id * 1.7;
        const sp = a.kind === 'chicken' ? 0.35 : 0.12;
        const x = cx + Math.sin(time * sp + k) * 2.4 + Math.sin(time * sp * 2.3 + k * 3) * 0.6;
        const y = cy + Math.cos(time * sp * 0.8 + k * 2) * 1.3;
        const dx = Math.cos(time * sp + k) * 2.4 * sp + Math.cos(time * sp * 2.3 + k * 3) * 0.6 * sp * 2.3;
        const dy = -Math.sin(time * sp * 0.8 + k * 2) * 1.3 * sp * 0.8;
        const yaw = Math.atan2(-dx, -dy);
        const hop = a.kind === 'chicken' ? Math.abs(Math.sin(time * 9 + k)) * 0.04 : 0;
        this.batch.add(a.kind === 'chicken' ? chicken : cow, tileMatrix(x, y, hop, yaw));
      }
    }
    this.batch.end();
  }

  dispose(): void {
    this.batch.dispose();
  }
}
