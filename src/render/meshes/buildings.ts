// Building meshes. A building is a Group centred on its footprint with the door on side `doorDir`.
// Walls/roof use vertexMat; windows use glowMat so they light up at night; snow caps show only in winter.
import * as THREE from 'three';
import type { Dir } from '../../data/types';
import type { BuildingDef } from '../../world';
import { glowMat, vertexMat } from '../materials';
import { ball, box, cone, cyl, gable, merge, shade, torus, type Part } from './kit';

interface Spec {
  wallH: number;
  roofH: number;
  chimney?: boolean;
  sign?: string;
  stilts?: boolean;
  wheel?: boolean;
  flatRoof?: boolean;
}

const SPECS: Record<string, Spec> = {
  farmhouse: { wallH: 1.7, roofH: 1.2, chimney: true },
  shipbin: { wallH: 0.6, roofH: 0 },
  coop: { wallH: 1.2, roofH: 0.8 },
  barn: { wallH: 2.0, roofH: 1.4 },
  greenhouse: { wallH: 1.6, roofH: 1 },
  townhall: { wallH: 2.2, roofH: 1.5, sign: '#e8c84a' },
  store: { wallH: 1.8, roofH: 1.2, sign: '#5aa06a', chimney: true },
  smithy: { wallH: 1.7, roofH: 1.0, sign: '#d86a2a', chimney: true },
  joinery: { wallH: 1.8, roofH: 1.2, sign: '#c89a5a' },
  inn: { wallH: 2.1, roofH: 1.4, sign: '#c8402a', chimney: true },
  works: { wallH: 2.2, roofH: 1.3, wheel: true, sign: '#9ac0a0' },
  cottage: { wallH: 1.5, roofH: 1.3, chimney: true },
  sluice: { wallH: 1.6, roofH: 1.0, wheel: true },
  hut: { wallH: 1.3, roofH: 0.9, stilts: true },
};

/** Rotate a part list so local +z (front) faces the door direction. */
function facingRotation(dir: Dir): number {
  // local front is +z (south). N=0 → face −z.
  return [Math.PI, Math.PI / 2, 0, -Math.PI / 2][dir];
}

export interface BuildingMesh {
  group: THREE.Group;
  /** spinning parts (water wheels) */
  spinners: THREE.Object3D[];
  /** shown only in winter */
  snow: THREE.Object3D[];
  /** chimney smoke anchor in world-local coordinates */
  chimney: THREE.Vector3 | null;
}

export function buildBuilding(b: BuildingDef): BuildingMesh {
  const spec = SPECS[b.style] ?? SPECS.farmhouse;
  const group = new THREE.Group();
  const spinners: THREE.Object3D[] = [];
  const snow: THREE.Object3D[] = [];
  // Work in a frame where the door side is +z; width along x is the side the door is on.
  const sideways = b.doorDir === 1 || b.doorDir === 3;
  const W = (sideways ? b.h : b.w) - 0.15;
  const D = (sideways ? b.w : b.h) - 0.15;
  // Door offset along the front, from the footprint centre.
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const doorCentre = sideways ? b.door.y + 0.5 - cy : b.door.x + 0.5 - cx;
  const doorOff = b.doorDir === 0 || b.doorDir === 1 ? -doorCentre : doorCentre;
  const wall = new THREE.Color(b.wall);
  const roof = new THREE.Color(b.roof);
  const parts: Part[] = [];
  const glow: Part[] = [];
  const snowParts: Part[] = [];
  let chimney: THREE.Vector3 | null = null;

  if (b.style === 'shipbin') {
    parts.push(box(W, 0.55, D, wall), box(W + 0.08, 0.1, D + 0.08, roof, { y: 0.55 }));
    for (let k = -1; k <= 1; k += 2) parts.push(box(0.06, 0.56, D + 0.02, shade(wall, -0.1), { x: (k * W) / 2.2 }));
    snowParts.push(box(W + 0.1, 0.05, D + 0.1, '#f4f8fb', { y: 0.65 }));
  } else {
    const base = spec.stilts ? 0.45 : 0;
    if (spec.stilts) for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(cyl(0.07, 0.07, base, '#6a4a2e', { x: (sx * W) / 2.4, z: (sz * D) / 2.4 }, 5));
    if (spec.stilts) parts.push(box(W + 0.3, 0.08, D + 0.6, '#9a6c42', { y: base - 0.08, z: 0.2 }));
    // stone plinth and walls
    parts.push(box(W + 0.1, 0.18, D + 0.1, '#e0c8b0', { y: base }));
    parts.push(box(W, spec.wallH, D, wall, { y: base + 0.18 }));
    // corner beams
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(box(0.12, spec.wallH, 0.12, '#c8844a', { x: (sx * W) / 2, y: base + 0.18, z: (sz * D) / 2 }));
    const top = base + 0.18 + spec.wallH;
    // roof (ridge along the wider side)
    if (spec.roofH > 0) {
      parts.push(gable(W + 0.4, D + 0.4, spec.roofH, roof, { y: top }));
      parts.push(box(W + 0.5, 0.08, 0.14, shade(roof, 0.14), { y: top + spec.roofH - 0.03 }));
      snowParts.push(gable(W + 0.44, D + 0.44, spec.roofH * 0.35, '#f4f8fb', { y: top + spec.roofH * 0.66 }));
    }
    // door
    parts.push(box(0.62, 1.05, 0.08, shade(roof, 0.04), { x: doorOff, y: base + 0.18, z: D / 2 + 0.01 }));
    parts.push(box(0.74, 0.08, 0.1, '#fff8ec', { x: doorOff, y: base + 1.23, z: D / 2 + 0.02 }));
    parts.push(ball(0.04, '#e8c84a', { x: doorOff + 0.2, y: base + 0.75, z: D / 2 + 0.06 }, 0));
    // windows on the front (skip the door position)
    const nWin = Math.max(1, Math.floor(W / 1.6));
    for (let k = 0; k < nWin; k++) {
      const wx = -W / 2 + ((k + 0.5) * W) / nWin;
      if (Math.abs(wx - doorOff) < 0.7) continue;
      parts.push(box(0.6, 0.6, 0.06, '#fff8ec', { x: wx, y: base + 0.75, z: D / 2 + 0.01 }));
      // shutters in the roof colour and a flower box under the sill
      parts.push(box(0.14, 0.6, 0.05, shade(roof, 0.05), { x: wx - 0.4, y: base + 0.75, z: D / 2 + 0.02 }), box(0.14, 0.6, 0.05, shade(roof, 0.05), { x: wx + 0.4, y: base + 0.75, z: D / 2 + 0.02 }));
      parts.push(box(0.62, 0.1, 0.16, '#c8844a', { x: wx, y: base + 0.6, z: D / 2 + 0.1 }));
      for (let f = 0; f < 4; f++) parts.push(ball(0.06, ['#ff6a9e', '#ffd23a', '#ffffff', '#8a7cff'][(f + k) % 4], { x: wx - 0.22 + f * 0.147, y: base + 0.72, z: D / 2 + 0.1 }, 0));
      glow.push(box(0.48, 0.48, 0.06, '#bfeaff', { x: wx, y: base + 0.81, z: D / 2 + 0.03 }));
    }
    // side windows
    for (const sx of [-1, 1]) glow.push(box(0.06, 0.45, 0.45, '#bfeaff', { x: (sx * W) / 2 + sx * 0.02, y: base + 0.85 }));
    if (spec.chimney) {
      parts.push(box(0.35, spec.roofH + 0.5, 0.35, '#e8806a', { x: W / 3, y: top, z: -D / 6 }));
      chimney = new THREE.Vector3(W / 3, top + spec.roofH + 0.5, -D / 6);
    }
    if (spec.sign) {
      parts.push(box(0.05, 0.05, 0.5, '#5a3a24', { x: doorOff - 0.75, y: base + 1.55, z: D / 2 + 0.25 }));
      parts.push(box(0.5, 0.36, 0.05, spec.sign, { x: doorOff - 0.75, y: base + 1.15, z: D / 2 + 0.48 }));
    }
    // style details
    if (b.style === 'barn') {
      parts.push(box(1.2, 1.5, 0.06, '#f4ece0', { x: doorOff, y: 0.18, z: D / 2 + 0.03 }));
      parts.push(box(1.0, 1.3, 0.07, '#9a3a30', { x: doorOff, y: 0.28, z: D / 2 + 0.04 }));
    }
    if (b.style === 'coop') parts.push(box(0.5, 0.3, 0.6, '#c8a060', { x: W / 2 + 0.2, y: 0.18 }));
    if (b.style === 'smithy') parts.push(box(0.5, 0.35, 0.25, '#3a3a42', { x: -W / 2 - 0.4, y: 0, z: D / 3 }), box(0.7, 0.12, 0.3, '#4a4a52', { x: -W / 2 - 0.4, y: 0.35, z: D / 3 }));
    if (b.style === 'inn') parts.push(cyl(0.18, 0.22, 0.3, '#5a5a5a', { x: doorOff - 0.75, y: base + 0.75, z: D / 2 + 0.48 }, 8));
    if (b.style === 'townhall') {
      parts.push(box(0.9, 1.0, 0.9, wall, { y: top + spec.roofH * 0.5 }));
      parts.push(cone(0.75, 0.9, roof, { y: top + spec.roofH * 0.5 + 1.0 }, 4));
      glow.push(cyl(0.25, 0.25, 0.04, '#fff4d0', { y: top + spec.roofH * 0.5 + 0.55, z: 0.46, rx: Math.PI / 2 }, 12));
    }
    if (b.style === 'cottage') {
      for (let k = 0; k < 4; k++) parts.push(ball(0.22, k % 2 ? '#e86a8a' : '#6aaf4a', { x: -W / 2 + 0.3 + k * 0.35, y: 0.2, z: D / 2 + 0.3 }, 0));
    }
  }

  const rot = facingRotation(b.doorDir);
  const body = new THREE.Mesh(merge(parts), vertexMat);
  body.castShadow = true;
  body.receiveShadow = true;
  const inner = new THREE.Group();
  inner.add(body);
  if (glow.length) inner.add(new THREE.Mesh(merge(glow), glowMat));
  if (snowParts.length) {
    const s = new THREE.Mesh(merge(snowParts), vertexMat);
    inner.add(s);
    snow.push(s);
  }
  if (spec.wheel) {
    const wheel = waterWheel(1.0);
    wheel.position.set(-W / 2 - 0.25, 1.0, 0);
    wheel.rotation.y = Math.PI / 2;
    inner.add(wheel);
    spinners.push(wheel.children[0]);
  }
  inner.rotation.y = rot;
  group.add(inner);
  group.position.set(cx, 0, cy);
  if (chimney) chimney.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(group.position);
  return { group, spinners, snow, chimney };
}

/** A paddle water wheel; child 0 spins around local z. */
export function waterWheel(r: number): THREE.Group {
  const g = new THREE.Group();
  const parts: Part[] = [torus(r, 0.05, '#7a5636', {}, 5, 16), torus(r * 0.45, 0.04, '#6a4a2e', {}, 4, 10), cyl(0.09, 0.09, 0.3, '#4a4a52', { rx: Math.PI / 2, z: -0.15 }, 8)];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    parts.push(box(0.06, r, 0.06, '#8a6440', { rz: a - Math.PI / 2 }));
    parts.push(box(0.32, 0.06, 0.3, '#9a7450', { x: Math.cos(a) * r, y: Math.sin(a) * r - 0.03, z: -0.15, rz: a }));
  }
  const spin = new THREE.Mesh(merge(parts), vertexMat);
  spin.castShadow = true;
  g.add(spin);
  return g;
}
