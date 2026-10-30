// Crop meshes by growth stage (0 seed, 1 sprout, 2 growing, 3 ripe) plus a withered variant.
// One builder per CropDef.mesh key; the produce colour comes from CropDef.color and a few crops get their own
// leaf colour or flowers (by id) so a field never reads as a single green blur.
import type * as THREE from 'three';
import { getCrop } from '../../data';
import { chip } from './flora';
import { ball, cone, cyl, leaf, merge, shade, torus, type Part } from './kit';

const LEAF = '#4ee052';
const LEAF2 = '#2fcf5a';
const STEM = '#58d048';

/** Leaf colour by crop id: ruby radish tops, plum beet leaves, icy kale. */
const LEAF_TINT: Record<string, string> = {
  radish: '#7ee86a',
  carrot: '#58e060',
  beetroot: '#c0408a',
  frostkale: '#3fd8d0',
};
const lc = (id: string) => LEAF_TINT[id] ?? LEAF;

function seedMound(): Part[] {
  return [ball(0.09, '#a06a3e', { y: 0.02, sy: 0.5 }, 0), ball(0.03, '#fff0b0', { y: 0.06 }, 0), chip(0.02, '#ffffff', { x: 0.05, y: 0.05 })];
}

function sprout(n = 2, len = 0.18, color = LEAF): Part[] {
  const parts: Part[] = [cyl(0.03, 0.04, 0.1, STEM, {}, 5)];
  for (let k = 0; k < n; k++) parts.push(leaf(len * 1.15, k % 2 ? color : LEAF2, { y: 0.09, ry: (k / n) * Math.PI * 2, rx: -0.5 }));
  return parts;
}

function rosette(n: number, len: number, color = LEAF, tilt = -0.8, y = 0.02): Part[] {
  const parts: Part[] = [];
  for (let k = 0; k < n; k++) parts.push(leaf(len, k % 2 ? color : shade(color, -0.06), { y, ry: (k / n) * Math.PI * 2 + 0.3, rx: tilt }));
  return parts;
}

/** A five-petal blossom lying on a plant (white, pink, yellow...). */
function blossom(x: number, y: number, z: number, color: string, r = 0.05): Part[] {
  const parts: Part[] = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    parts.push(chip(r * 0.7, color, { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r, sy: 0.6 }));
  }
  parts.push(chip(r * 0.45, '#ffd23a', { x, y: y + 0.01, z }));
  return parts;
}

type Builder = (stage: number, color: string, id: string) => Part[];

const BUILDERS: Record<string, Builder> = {
  root: (stage, color, id) => {
    const leafC = lc(id);
    if (stage === 1) return sprout(3, 0.2, leafC);
    if (stage === 2) return rosette(5, 0.3, leafC, -1.0);
    const tops = rosette(7, 0.36, leafC, -1.05, 0.14);
    // ruby veins: pink stems on radish, plum on beetroot
    const stems = id === 'carrot' ? [] : [cyl(0.012, 0.016, 0.16, shade(color, 0.1), { x: 0.05, y: 0.08, rz: -0.3 }, 4), cyl(0.012, 0.016, 0.16, shade(color, 0.1), { x: -0.05, y: 0.08, rz: 0.3 }, 4)];
    if (id === 'carrot') return [...tops, cone(0.075, 0.24, color, { y: 0.24, rx: Math.PI }, 8), ball(0.07, shade(color, 0.12), { y: 0.2, sy: 0.5 }, 0)];
    return [...tops, ...stems, ball(0.13, color, { y: 0.07, sy: 0.92 }, 0), chip(0.04, '#ffffff', { x: 0.0, y: 0.0, z: 0.0, sy: 0.5 })];
  },
  leafy: (stage, _color, id) => {
    const leafC = lc(id);
    if (stage === 1) return sprout(3, 0.2, leafC);
    if (stage === 2) return rosette(6, 0.3, leafC, -0.7);
    // frilly layers with a plum heart and frosted tips
    const tips: Part[] = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3;
      tips.push(chip(0.035, '#ffffff', { x: Math.cos(a) * 0.3, y: 0.2, z: Math.sin(a) * 0.3 }));
    }
    return [...rosette(8, 0.42, leafC, -0.6), ...rosette(5, 0.3, shade(leafC, 0.1).getStyle(), -0.3, 0.08), ball(0.1, '#9a6af0', { y: 0.2, sy: 0.8 }, 0), ...tips];
  },
  berryBush: (stage, color, id) => {
    if (stage === 1) return sprout(3, 0.2);
    const parts: Part[] = [ball(0.24, LEAF2, { y: 0.2, sy: 0.75 }, 0), ball(0.18, LEAF, { x: 0.12, y: 0.24, z: 0.08 }, 0), ball(0.14, shade(LEAF, 0.06), { x: -0.14, y: 0.22, z: -0.06 }, 0)];
    if (stage === 2) {
      return [...parts, ...blossom(0.1, 0.36, 0.14, id === 'sunpepper' ? '#fff0a0' : '#ffffff'), ...blossom(-0.12, 0.34, -0.08, id === 'sunpepper' ? '#fff0a0' : '#ffffff', 0.04)];
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const x = Math.cos(a) * 0.2;
      const z = Math.sin(a) * 0.2;
      const y = 0.2 + (k % 2) * 0.1;
      if (id === 'sunpepper') parts.push(cone(0.05, 0.16, color, { x, y: y + 0.1, z, rx: Math.PI, rz: (k % 2 ? 0.2 : -0.2) }, 8), ball(0.03, '#3fcf58', { x, y: y + 0.12, z }, 0));
      else parts.push(ball(0.07, color, { x, y, z, sy: 1.15 }, 0), chip(0.032, '#3fcf58', { x, y: y + 0.075, z, sy: 0.5 }), chip(0.012, '#fff0a0', { x: x + 0.03, y: y + 0.01, z: z + 0.05 }));
    }
    return parts;
  },
  vine: (stage, color, id) => {
    if (stage === 1) return sprout(2, 0.2);
    const h = stage === 2 ? 0.6 : 0.85;
    const parts: Part[] = [
      cyl(0.02, 0.02, h + 0.1, '#e0a060', { x: 0.12 }, 4), // stake
      ball(0.03, '#ffd23a', { x: 0.12, y: h + 0.1 }, 0),
      cyl(0.035, 0.05, h, STEM, {}, 6),
    ];
    for (let k = 0; k < 5; k++) parts.push(leaf(0.2, k % 2 ? LEAF : LEAF2, { y: 0.1 + (k / 5) * h, ry: k * 2.1, rx: -0.4 }));
    const flower = id === 'pea' ? '#ffb0e0' : '#ffe84a';
    if (stage === 2) {
      parts.push(...blossom(0.0, h * 0.9, 0.1, flower), ...blossom(0.06, h * 0.55, -0.1, flower, 0.04));
      return parts;
    }
    for (let k = 0; k < 4; k++) {
      const x = Math.cos(k * 1.7) * 0.13;
      const z = Math.sin(k * 1.7) * 0.13;
      const y = 0.25 + k * 0.15;
      if (id === 'pea') parts.push(ball(0.05, color, { x, y, z, sx: 0.5, sy: 1.9, sz: 0.55 }, 0), chip(0.02, shade(color, 0.2), { x, y: y + 0.1, z }));
      else parts.push(ball(0.085, color, { x, y, z, sy: 0.88 }, 0), chip(0.04, '#3fcf58', { x, y: y + 0.07, z, sy: 0.4 }), chip(0.02, '#ffffff', { x: x + 0.03, y: y + 0.03, z: z + 0.06 }));
    }
    return parts;
  },
  stalk: (stage, color) => {
    if (stage === 1) return sprout(2, 0.22);
    const h = stage === 2 ? 0.8 : 1.25;
    const parts: Part[] = [cyl(0.05, 0.065, h, STEM, {}, 6)];
    for (let k = 0; k < 6; k++) parts.push(leaf(0.38, k % 2 ? LEAF : LEAF2, { y: 0.15 + (k / 6) * h * 0.8, ry: k * 2.4, rx: -0.35 }));
    // purple-pink tassel on top, ripe or not
    for (let k = 0; k < 5; k++) parts.push(cone(0.012, 0.14, k % 2 ? '#ff8ad0' : '#c870ff', { y: h - 0.02, rz: (k - 2) * 0.35, ry: k * 1.3 }, 4));
    if (stage === 3) {
      // a fat gold cob in a green husk, and a smaller one lower down
      for (const [yy, s, side] of [[h * 0.55, 1, 1], [h * 0.35, 0.75, -1]] as const) {
        parts.push(ball(0.07 * s, color, { x: 0.08 * side, y: yy, z: 0.03, sx: 0.9, sy: 2.1, sz: 0.9 }, 0));
        parts.push(leaf(0.22 * s, '#6aea58', { x: 0.08 * side, y: yy - 0.1, z: 0.03, ry: side > 0 ? 1.6 : -1.6, rx: -1.3 }));
        parts.push(leaf(0.2 * s, '#4ede4e', { x: 0.08 * side, y: yy - 0.1, z: 0.03, ry: side > 0 ? 0.9 : -0.9, rx: -1.35 }));
      }
    }
    return parts;
  },
  gourd: (stage, color, id) => {
    if (stage === 1) return sprout(2, 0.22);
    const parts: Part[] = [...rosette(5, 0.32, LEAF2, -1.15)];
    for (let k = 0; k < 3; k++) parts.push(ball(0.12, LEAF, { x: Math.cos(k * 2.1) * 0.25, y: 0.1, z: Math.sin(k * 2.1) * 0.25, sy: 0.4 }, 0));
    // curly tendrils
    parts.push(torus(0.05, 0.01, '#58d048', { x: 0.3, y: 0.06, z: -0.12, rx: Math.PI / 2 }, 4, 12), torus(0.035, 0.009, '#58d048', { x: -0.28, y: 0.05, z: 0.18, rx: Math.PI / 2 }, 4, 12));
    if (stage === 2) return [...parts, ...blossom(0.05, 0.12, 0.0, '#ffd23a', 0.07)];
    if (id === 'melon') {
      const stripe = shade(color, -0.18);
      return [
        ...parts,
        ball(0.24, color, { y: 0.2, sx: 1.15, sy: 0.92 }, 1),
        torus(0.255, 0.014, stripe, { y: 0.2, sx: 1.12, sy: 0.9 }, 4, 20),
        torus(0.255, 0.014, stripe, { y: 0.2, ry: Math.PI / 3, sx: 1.12, sy: 0.9 }, 4, 20),
        torus(0.255, 0.014, stripe, { y: 0.2, ry: -Math.PI / 3, sx: 1.12, sy: 0.9 }, 4, 20),
        cyl(0.02, 0.03, 0.08, '#8aaa3a', { y: 0.4 }, 4),
      ];
    }
    // pumpkin: three ribs fused at an angle, so it looks ridged and plump
    return [
      ...parts,
      ball(0.2, color, { y: 0.19, sx: 0.8, sy: 0.85 }, 1),
      ball(0.2, shade(color, 0.05), { y: 0.19, sx: 0.8, sy: 0.85, ry: Math.PI / 3 }, 1),
      ball(0.2, shade(color, -0.05), { y: 0.19, sx: 0.8, sy: 0.85, ry: -Math.PI / 3 }, 1),
      cyl(0.025, 0.04, 0.1, '#8aaa3a', { y: 0.34, rz: 0.15 }, 5),
      leaf(0.14, '#4ede4e', { y: 0.36, ry: 1.0, rx: -0.2 }),
    ];
  },
  grain: (stage, color) => {
    if (stage === 1) return sprout(3, 0.15);
    const parts: Part[] = [];
    const h = stage === 2 ? 0.5 : 0.75;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const x = Math.cos(a) * 0.14;
      const z = Math.sin(a) * 0.14;
      parts.push(cyl(0.02, 0.024, h, stage === 3 ? shade(color, 0.05) : LEAF, { x, z, rx: Math.sin(a) * 0.1, rz: -Math.cos(a) * 0.1 }, 3));
      if (stage === 3) {
        parts.push(ball(0.032, color, { x, y: h - 0.02, z, sy: 3.2 }, 0));
        parts.push(cone(0.006, 0.08, '#fff0b0', { x, y: h + 0.07, z }, 3));
      }
    }
    // a cheeky red poppy among the wheat
    if (stage === 3) parts.push(cyl(0.01, 0.01, 0.5, STEM, { x: 0.02, z: 0.2 }, 3), ball(0.05, '#ff4a4a', { x: 0.02, y: 0.52, z: 0.2, sy: 0.7 }, 0), chip(0.018, '#2a1a16', { x: 0.02, y: 0.54, z: 0.2 }));
    return parts;
  },
};

const memo = new Map<string, THREE.BufferGeometry>();

export function cropGeometry(cropId: string, stage: number, withered: boolean): THREE.BufferGeometry {
  const key = withered ? `withered` : `${cropId}:${stage}`;
  let g = memo.get(key);
  if (!g) {
    if (withered) g = merge([cyl(0.025, 0.035, 0.25, '#b09060', { rz: 0.4 }, 4), leaf(0.2, '#c8a860', { y: 0.1, rx: 0.4 }), leaf(0.18, '#b88850', { y: 0.05, ry: 2, rx: 0.8 })]);
    else if (stage === 0) g = merge(seedMound());
    else {
      const def = getCrop(cropId);
      const b = BUILDERS[def.mesh] ?? BUILDERS.root;
      g = merge(b(stage, def.color, cropId));
    }
    memo.set(key, g);
  }
  return g;
}
