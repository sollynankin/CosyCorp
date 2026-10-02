// Crop meshes by growth stage (0 seed, 1 sprout, 2 growing, 3 ripe) plus a withered variant.
// One builder per CropDef.mesh key; the produce colour comes from CropDef.color.
import type * as THREE from 'three';
import { getCrop } from '../../data';
import { ball, box, cone, cyl, leaf, merge, shade, type Part } from './kit';

const LEAF = '#5fae3f';
const LEAF2 = '#4c9a34';
const STEM = '#6a8a3a';

function seedMound(): Part[] {
  return [ball(0.09, '#6a4a2e', { y: 0.02, sy: 0.5 }, 0), ball(0.03, '#e8d8a0', { y: 0.06 }, 0)];
}

function sprout(n = 2, len = 0.18): Part[] {
  const parts: Part[] = [cyl(0.015, 0.02, 0.1, STEM, {}, 4)];
  for (let k = 0; k < n; k++) parts.push(leaf(len, k % 2 ? LEAF : LEAF2, { y: 0.09, ry: (k / n) * Math.PI * 2, rx: -0.5 }));
  return parts;
}

function rosette(n: number, len: number, color = LEAF, tilt = -0.8, y = 0.02): Part[] {
  const parts: Part[] = [];
  for (let k = 0; k < n; k++) parts.push(leaf(len, k % 2 ? color : shade(color, -0.06), { y, ry: (k / n) * Math.PI * 2 + 0.3, rx: tilt }));
  return parts;
}

type Builder = (stage: number, color: string) => Part[];

const BUILDERS: Record<string, Builder> = {
  root: (stage, color) => {
    if (stage === 1) return sprout(3, 0.2);
    if (stage === 2) return rosette(5, 0.3, LEAF, -1.0);
    return [...rosette(6, 0.36, LEAF, -1.05), ball(0.12, color, { y: 0.06, sy: 0.9 }, 0)];
  },
  leafy: (stage, color) => {
    if (stage === 1) return sprout(3, 0.2);
    if (stage === 2) return rosette(6, 0.3, color, -0.7);
    return [...rosette(8, 0.42, color, -0.6), ...rosette(5, 0.3, shade(color, 0.08).getStyle(), -0.3, 0.08)];
  },
  berryBush: (stage, color) => {
    if (stage === 1) return sprout(3, 0.2);
    const parts: Part[] = [ball(0.24, LEAF2, { y: 0.2, sy: 0.75 }, 0), ball(0.18, LEAF, { x: 0.12, y: 0.24, z: 0.08 }, 0)];
    if (stage === 2) return [...parts, ball(0.04, '#f4f4e8', { x: 0.1, y: 0.35, z: 0.15 }, 0)];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      parts.push(ball(0.06, color, { x: Math.cos(a) * 0.2, y: 0.18 + (k % 2) * 0.1, z: Math.sin(a) * 0.2 }, 0));
    }
    return parts;
  },
  vine: (stage, color) => {
    if (stage === 1) return sprout(2, 0.2);
    const h = stage === 2 ? 0.6 : 0.85;
    const parts: Part[] = [
      cyl(0.015, 0.015, h + 0.1, '#a07850', { x: 0.12 }, 4),
      cyl(0.02, 0.03, h, STEM, {}, 5),
    ];
    for (let k = 0; k < 5; k++) parts.push(leaf(0.18, k % 2 ? LEAF : LEAF2, { y: 0.1 + (k / 5) * h, ry: k * 2.1, rx: -0.4 }));
    if (stage === 3) for (let k = 0; k < 4; k++) parts.push(ball(0.07, color, { x: Math.cos(k * 1.7) * 0.12, y: 0.25 + k * 0.15, z: Math.sin(k * 1.7) * 0.12 }, 0));
    return parts;
  },
  stalk: (stage, color) => {
    if (stage === 1) return sprout(2, 0.22);
    const h = stage === 2 ? 0.8 : 1.25;
    const parts: Part[] = [cyl(0.03, 0.04, h, STEM, {}, 5)];
    for (let k = 0; k < 6; k++) parts.push(leaf(0.35, k % 2 ? LEAF : LEAF2, { y: 0.15 + (k / 6) * h * 0.8, ry: k * 2.4, rx: -0.35 }));
    if (stage === 3) {
      parts.push(cyl(0.05, 0.06, 0.25, color, { x: 0.06, y: h * 0.55, rz: -0.3 }, 6));
      parts.push(cone(0.03, 0.12, '#d8c890', { y: h }, 4));
    }
    return parts;
  },
  gourd: (stage, color) => {
    if (stage === 1) return sprout(2, 0.22);
    const parts: Part[] = [...rosette(5, 0.32, LEAF2, -1.15)];
    for (let k = 0; k < 3; k++) parts.push(ball(0.12, LEAF, { x: Math.cos(k * 2.1) * 0.25, y: 0.1, z: Math.sin(k * 2.1) * 0.25, sy: 0.4 }, 0));
    if (stage === 2) return [...parts, ball(0.1, shade(color, 0.15).getStyle(), { x: 0.05, y: 0.08 }, 0)];
    return [...parts, ball(0.26, color, { y: 0.18, sy: 0.75 }, 1), cyl(0.02, 0.03, 0.08, '#6a5a2a', { y: 0.36 }, 4)];
  },
  grain: (stage, color) => {
    if (stage === 1) return sprout(3, 0.15);
    const parts: Part[] = [];
    const h = stage === 2 ? 0.5 : 0.75;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const x = Math.cos(a) * 0.14;
      const z = Math.sin(a) * 0.14;
      parts.push(cyl(0.01, 0.012, h, stage === 3 ? color : LEAF, { x, z, rx: Math.sin(a) * 0.1, rz: -Math.cos(a) * 0.1 }, 3));
      if (stage === 3) parts.push(box(0.05, 0.16, 0.05, shade(color, -0.05), { x, y: h - 0.04, z }));
    }
    return parts;
  },
};

const memo = new Map<string, THREE.BufferGeometry>();

export function cropGeometry(cropId: string, stage: number, withered: boolean): THREE.BufferGeometry {
  const key = withered ? `withered` : `${cropId}:${stage}`;
  let g = memo.get(key);
  if (!g) {
    if (withered) g = merge([cyl(0.02, 0.03, 0.25, '#8a7a5a', { rz: 0.4 }, 4), leaf(0.2, '#9a8a5a', { y: 0.1, rx: 0.4 }), leaf(0.18, '#8a7048', { y: 0.05, ry: 2, rx: 0.8 })]);
    else if (stage === 0) g = merge(seedMound());
    else {
      const def = getCrop(cropId);
      const b = BUILDERS[def.mesh] ?? BUILDERS.root;
      g = merge(b(stage, def.color));
    }
    memo.set(key, g);
  }
  return g;
}
