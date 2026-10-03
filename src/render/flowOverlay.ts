// Flow overlay (F, DESIGN.md §14). Dims the scene and draws, flat and always on top: belt throughput as a
// heatmap with direction arrows, jammed belts in red, machine status rings, power coverage dots and the
// work ranges of sprinklers, harvesters, planters and heaters. It must stay readable whatever the 3D art
// looks like, so it ignores depth and uses plain unlit colours.
import * as THREE from 'three';
import { getMachine } from '../data';
import type { MachineKind } from '../data/types';
import type { PowerInfo } from '../sim/power';
import type { GameState } from '../sim/state';
import { parseMap, tilesInRadius } from '../world';
import { Batcher, tileMatrix } from './batcher';
import { overlayDim, overlayFaint, overlayStrong } from './materials';
import { arrowGeo } from './meshes/machines';
import { flat, merge } from './meshes/kit';
import { passiveColor, STATUS_COLOR, yawFor } from './machineView';

export const RANGE_COLOR: Partial<Record<MachineKind, string>> = {
  sprinkler: '#4ac0f0',
  harvester: '#f09a3a',
  planter: '#7ad04a',
  heater: '#f05a7a',
};

const tileGeo = merge([flat(0.98, 0.98, '#ffffff')]);
const beltGeo = merge([flat(0.78, 0.78, '#ffffff')]);
const dotGeo = merge([flat(0.3, 0.3, '#ffffff')]);
const ringGeo = (() => {
  const g = new THREE.RingGeometry(0.38, 0.5, 20, 1);
  g.rotateX(-Math.PI / 2);
  return merge([{ geo: g, color: '#ffffff' }]);
})();

const COLD = new THREE.Color('#2a4a9a');
const WARM = new THREE.Color('#3ad07a');
const HOT = new THREE.Color('#f0e040');
const JAM = new THREE.Color(STATUS_COLOR.blocked);
const tmp = new THREE.Color();

/** Heat colour for a utilisation 0..1. */
function heat(u: number): THREE.Color {
  return u < 0.5 ? tmp.copy(COLD).lerp(WARM, u * 2) : tmp.copy(WARM).lerp(HOT, (u - 0.5) * 2);
}

export class FlowOverlay {
  readonly group = new THREE.Group();
  private readonly dim: THREE.Mesh;
  private readonly faint = new Batcher(overlayFaint, { cast: false, receive: false });
  private readonly strong = new Batcher(overlayStrong, { cast: false, receive: false });
  private key = '';
  /** extra range preview for the build ghost: [kind, x, y, radius] */
  ghostRange: { kind: MachineKind; x: number; y: number; r: number } | null = null;

  constructor() {
    const m = parseMap('farm');
    const g = new THREE.PlaneGeometry(m.w + 40, m.h + 40);
    g.rotateX(-Math.PI / 2);
    this.dim = new THREE.Mesh(g, overlayDim);
    this.dim.position.set(m.w / 2, 0.02, m.h / 2);
    this.dim.renderOrder = 20;
    this.group.add(this.dim, this.faint.group, this.strong.group);
    this.group.visible = false;
  }

  set visible(v: boolean) {
    this.group.visible = v;
    if (!v) this.key = '';
  }

  get visible(): boolean {
    return this.group.visible;
  }

  update(state: GameState, power: PowerInfo): void {
    if (!this.group.visible) return;
    const gr = this.ghostRange;
    const key = `${state.farm.layoutRev}|${state.day}|${state.step}|${gr ? `${gr.kind}${gr.x},${gr.y}` : ''}`;
    if (key === this.key) return;
    this.key = key;
    const m = parseMap('farm');
    const ents = state.farm.entities;
    this.faint.begin();
    this.strong.begin();

    // Work ranges (faint, so overlaps read as stronger colour).
    const range = (kind: MachineKind, x: number, y: number, r: number) => {
      tmp.set(RANGE_COLOR[kind] ?? '#ffffff');
      for (const [tx, ty] of tilesInRadius(m.w, m.h, x, y, r)) this.faint.add(tileGeo, tileMatrix(tx + 0.5, ty + 0.5, 0.05), tmp);
    };
    for (const e of ents) {
      const def = getMachine(e.type);
      if (RANGE_COLOR[def.kind] && def.radius) range(def.kind, e.x, e.y, def.radius);
    }
    if (gr) range(gr.kind, gr.x, gr.y, gr.r);

    // Power coverage dots.
    tmp.set('#6ab8f0');
    for (let i = 0; i < power.covered.length; i++) {
      if (power.covered[i]) this.faint.add(dotGeo, tileMatrix((i % m.w) + 0.5, Math.floor(i / m.w) + 0.5, 0.06), tmp);
    }

    // Belts: utilisation heatmap (items moved today against the belt's cap so far), red when jammed.
    const minutes = Math.max(1, state.step);
    for (const e of ents) {
      const def = getMachine(e.type);
      const st = state.today.entities[String(e.id)];
      if (def.kind === 'belt' || def.kind === 'splitter') {
        const moved = st?.moved ?? 0;
        const cap = minutes / (def.entryInterval ?? 1);
        const jammed = (st?.blocked ?? 0) / minutes > 0.25 && e.belt.length >= (def.capacity ?? 1);
        this.strong.add(beltGeo, tileMatrix(e.x + 0.5, e.y + 0.5, 0.07), jammed ? JAM : heat(Math.min(1, moved / cap)));
        tmp.set('#ffffff');
        this.strong.add(arrowGeo, tileMatrix(e.x + 0.5, e.y + 0.5, 0.08, yawFor(e.dir), 0.9), tmp);
        continue;
      }
      const factor = power.entityFactor[e.id] ?? 0;
      const worker = def.kind === 'harvester' || def.kind === 'planter' || def.kind === 'crafter' || def.kind === 'heater';
      tmp.set(worker ? STATUS_COLOR[e.status] : passiveColor(state, e, factor));
      this.strong.add(ringGeo, tileMatrix(e.x + 0.5, e.y + 0.5, 0.07), tmp);
      if (def.kind === 'harvester' || def.kind === 'crafter' || def.kind === 'storage') {
        tmp.set('#ffffff');
        this.strong.add(arrowGeo, tileMatrix(e.x + 0.5, e.y + 0.5, 0.08, yawFor(e.dir), 0.7), tmp);
      }
    }
    this.faint.end();
    this.strong.end();
    this.faint.group.traverse((o) => (o.renderOrder = 21));
    this.strong.group.traverse((o) => (o.renderOrder = 22));
  }

  dispose(): void {
    this.faint.dispose();
    this.strong.dispose();
    this.dim.geometry.dispose();
  }
}
