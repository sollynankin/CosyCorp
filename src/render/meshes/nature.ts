// Trees, rocks, weeds and other nature props. Geometries whose colour changes with the season are built
// in light greys so the InstancedMesh instance colour (a multiply) can tint them per season.
import type * as THREE from 'three';
import { chip } from './flora';
import { ball, box, cone, cyl, leaf, merge, shade, type Part } from './kit';

const memo = new Map<string, THREE.BufferGeometry>();
function once(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = memo.get(key);
  if (!g) {
    g = build();
    memo.set(key, g);
  }
  return g;
}

/** Deciduous trunk; variant 0 oak, 1 tall, 2 crooked. */
export function treeTrunk(variant: number): THREE.BufferGeometry {
  return once(`trunk${variant}`, () => {
    const h = variant === 1 ? 1.5 : 1.1;
    const parts: Part[] = [cyl(0.13, 0.2, h, '#c07a42', {}, 6)];
    if (variant === 2) parts.push(cyl(0.07, 0.1, 0.6, '#c07a42', { x: 0.1, y: 0.6, rz: -0.7 }, 5));
    parts.push(cyl(0.22, 0.28, 0.12, '#a05e32', {}, 6));
    return merge(parts);
  });
}

/** Canopy in greys (tinted per season). */
export function treeCanopy(variant: number): THREE.BufferGeometry {
  return once(`canopy${variant}`, () => {
    if (variant === 1)
      return merge([
        ball(0.55, '#ffffff', { y: 1.65, sy: 1.25 }, 1),
        ball(0.4, '#ececec', { x: 0.25, y: 2.05, z: 0.1 }, 0),
      ]);
    if (variant === 2)
      return merge([
        ball(0.6, '#ffffff', { x: -0.05, y: 1.45 }, 1),
        ball(0.4, '#e8e8e8', { x: 0.45, y: 1.3, z: 0.1 }, 0),
        ball(0.35, '#f4f4f4', { x: -0.4, y: 1.7, z: -0.2 }, 0),
      ]);
    return merge([
      ball(0.62, '#ffffff', { y: 1.45 }, 1),
      ball(0.45, '#e6e6e6', { x: 0.35, y: 1.3, z: 0.2 }, 0),
      ball(0.42, '#f2f2f2', { x: -0.3, y: 1.65, z: -0.15 }, 0),
      ball(0.35, '#dcdcdc', { x: 0.05, y: 1.95, z: 0.1 }, 0),
    ]);
  });
}

export function stump(): THREE.BufferGeometry {
  return once('stump', () =>
    merge([cyl(0.2, 0.25, 0.28, '#c07a42', {}, 7), cyl(0.17, 0.17, 0.02, '#ffd8a0', { y: 0.28 }, 7), cyl(0.09, 0.09, 0.025, '#f0b070', { y: 0.285 }, 7)]),
  );
}

/** Pine: body in greys for season tint. */
export function pineBody(): THREE.BufferGeometry {
  return once('pine', () =>
    merge([
      cone(0.64, 0.9, '#f0f0f0', { y: 0.45 }, 7),
      cone(0.52, 0.8, '#ffffff', { y: 0.95 }, 7),
      cone(0.38, 0.7, '#e6e6e6', { y: 1.4 }, 7),
    ]),
  );
}
export function pineTrunk(): THREE.BufferGeometry {
  return once('pineTrunk', () => merge([cyl(0.1, 0.14, 0.6, '#a8683a', {}, 5)]));
}
export function pineSnow(): THREE.BufferGeometry {
  return once('pineSnow', () =>
    merge([cone(0.38, 0.36, '#f8fbff', { y: 1.74 }, 7), cone(0.5, 0.24, '#f0f6fa', { y: 1.3 }, 7)]),
  );
}

export function bush(): THREE.BufferGeometry {
  return once('bush', () =>
    merge([
      ball(0.38, '#ffffff', { y: 0.3, sy: 0.8 }, 1),
      ball(0.28, '#e8e8e8', { x: 0.25, y: 0.22, z: 0.12 }, 0),
      ball(0.26, '#f2f2f2', { x: -0.22, y: 0.24, z: -0.1 }, 0),
    ]),
  );
}

/** Pastel rock colours; the variant is picked per tile so a field of stones is never one grey. */
const ROCKS = ['#c8b4f0', '#ffc0a8', '#a8e8cc', '#b8c8ff'];
const ROCKS_D = ['#a890d8', '#f0a088', '#88d0b0', '#98a8f0'];

export function smallStone(v = 0): THREE.BufferGeometry {
  const c = v % ROCKS.length;
  return once(`stone${c}`, () => merge([ball(0.22, ROCKS[c], { y: 0.12, sy: 0.65 }, 0), ball(0.12, ROCKS_D[c], { x: 0.16, y: 0.08, z: 0.1 }, 0), chip(0.06, '#5ae070', { x: -0.05, y: 0.22, sy: 0.5 })]));
}

export function boulder(v = 0): THREE.BufferGeometry {
  const c = v % ROCKS.length;
  return once(`boulder${c}`, () =>
    merge([
      ball(0.45, ROCKS[c], { y: 0.32, sy: 0.75 }, 0),
      ball(0.3, shade(ROCKS[c], 0.06), { x: 0.25, y: 0.25, z: 0.15 }, 0),
      ball(0.25, ROCKS_D[c], { x: -0.25, y: 0.2, z: -0.1 }, 0),
      ball(0.16, '#5ae070', { x: -0.05, y: 0.58, z: 0.05, sy: 0.45 }, 0),
      chip(0.07, '#ff8ac0', { x: 0.04, y: 0.64, z: 0.05 }),
    ]),
  );
}

export function weeds(): THREE.BufferGeometry {
  return once('weeds', () => {
    const parts: Part[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      parts.push(leaf(0.32, k % 2 ? '#ffffff' : '#e4e4e4', { x: Math.cos(a) * 0.08, y: 0.04, z: Math.sin(a) * 0.08, ry: -a + Math.PI / 2, rx: -0.9 }));
    }
    return merge(parts);
  });
}

export function twig(): THREE.BufferGeometry {
  return once('twig', () =>
    merge([
      cyl(0.035, 0.045, 0.55, '#c07a42', { y: 0.05, rz: Math.PI / 2, ry: 0.4 }, 4),
      cyl(0.025, 0.035, 0.25, '#a05e32', { x: 0.05, y: 0.05, z: 0.08, rz: Math.PI / 2, ry: -0.6 }, 4),
    ]),
  );
}

/** Ore rock: a stone with coloured nuggets. */
export function oreRock(color: string): THREE.BufferGeometry {
  return once(`ore${color}`, () =>
    merge([
      ball(0.36, '#a48ccc', { y: 0.26, sy: 0.75 }, 0),
      ball(0.1, color, { x: 0.18, y: 0.36, z: 0.18 }, 0),
      ball(0.08, color, { x: -0.2, y: 0.3, z: 0.12 }, 0),
      ball(0.09, color, { x: 0.02, y: 0.48, z: -0.12 }, 0),
    ]),
  );
}

export function ladder(): THREE.BufferGeometry {
  return once('ladder', () => {
    const parts: Part[] = [box(0.9, 0.04, 0.9, '#2a2018', { y: 0.01 }), box(0.06, 0.06, 0.8, '#9a6c42', { x: -0.25, y: 0.04 }), box(0.06, 0.06, 0.8, '#9a6c42', { x: 0.25, y: 0.04 })];
    for (let k = -1; k <= 1; k++) parts.push(box(0.5, 0.05, 0.06, '#b08050', { y: 0.06, z: k * 0.25 }));
    return merge(parts);
  });
}

export function dustBunny(): THREE.BufferGeometry {
  return once('bunny', () =>
    merge([
      ball(0.24, '#b8b0c0', { y: 0.24 }, 1),
      ball(0.08, '#ffffff', { x: 0.09, y: 0.3, z: 0.18 }, 0),
      ball(0.08, '#ffffff', { x: -0.09, y: 0.3, z: 0.18 }, 0),
      ball(0.04, '#1a1a22', { x: 0.09, y: 0.3, z: 0.24 }, 0),
      ball(0.04, '#1a1a22', { x: -0.09, y: 0.3, z: 0.24 }, 0),
      cone(0.06, 0.2, '#b8b0c0', { x: 0.1, y: 0.42, rz: -0.3 }, 4),
      cone(0.06, 0.2, '#b8b0c0', { x: -0.1, y: 0.42, rz: 0.3 }, 4),
    ]),
  );
}

/** Orchard tree by growth stage 0 sapling .. 2 mature; fruit drawn separately. */
export function orchardTree(stage: number): THREE.BufferGeometry {
  return once(`orchard${stage}`, () => {
    if (stage === 0) return merge([cyl(0.035, 0.045, 0.5, '#c07a42', {}, 5), leaf(0.2, '#8cf05a', { y: 0.45, rx: -0.6 }), leaf(0.2, '#6ad84a', { y: 0.4, ry: 2, rx: -0.6 })]);
    if (stage === 1) return merge([cyl(0.07, 0.09, 0.9, '#c07a42', {}, 6), ball(0.38, '#6ad84a', { y: 1.0 }, 0), ball(0.26, '#8cf05a', { x: 0.2, y: 0.85 }, 0)]);
    return merge([
      cyl(0.11, 0.15, 1.1, '#c07a42', {}, 6),
      ball(0.6, '#58d048', { y: 1.35 }, 1),
      ball(0.4, '#78e858', { x: 0.35, y: 1.2, z: 0.15 }, 0),
      ball(0.38, '#40c070', { x: -0.3, y: 1.55, z: -0.1 }, 0),
    ]);
  });
}

export function fruit(color: string): THREE.BufferGeometry {
  return once(`fruit${color}`, () => merge([ball(0.09, color, {}, 1), cyl(0.01, 0.01, 0.06, '#5a3a20', { y: 0.07 }, 3)]));
}

/** Dots stuck to the upper part of an ellipsoid (golden-spiral spread): blossoms, berries, apples. */
function surfaceDots(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, n: number, r: number, color: string): Part[] {
  const out: Part[] = [];
  for (let k = 0; k < n; k++) {
    const y = 0.92 - ((k + 0.5) / n) * 1.2;
    const rr = Math.sqrt(1 - y * y);
    const a = k * 2.399963;
    out.push(chip(r, color, { x: cx + Math.cos(a) * rr * rx * 1.03, y: cy + y * ry * 1.03, z: cz + Math.sin(a) * rr * rz * 1.03 }));
  }
  return out;
}

/** Blossoms or fruit on a deciduous canopy (same variants as treeCanopy), baked in `color`. */
export function treeDots(variant: number, color: string): THREE.BufferGeometry {
  return once(`treedots${variant}${color}`, () => {
    if (variant === 1) return merge(surfaceDots(0, 1.65, 0, 0.55, 0.69, 0.55, 14, 0.055, color));
    if (variant === 2) return merge(surfaceDots(-0.05, 1.45, 0, 0.6, 0.6, 0.6, 14, 0.055, color));
    return merge(surfaceDots(0, 1.45, 0, 0.62, 0.62, 0.62, 14, 0.055, color));
  });
}

/** Berries or tiny flowers on a bush, baked in `color`. */
export function bushDots(color: string): THREE.BufferGeometry {
  return once(`bushdots${color}`, () => merge(surfaceDots(0, 0.3, 0, 0.38, 0.3, 0.38, 9, 0.045, color)));
}

/** Umbrella tree: a wide, flat, mushroom-like crown on a crooked trunk (canopy tinted per season). */
export function umbrellaTrunk(): THREE.BufferGeometry {
  return once('umbTrunk', () => merge([cyl(0.1, 0.19, 0.95, '#c07a42', {}, 6), cyl(0.07, 0.1, 0.5, '#c07a42', { x: 0.06, y: 0.8, rz: -0.28 }, 5), cyl(0.22, 0.28, 0.1, '#a05e32', {}, 6)]));
}
export function umbrellaCanopy(): THREE.BufferGeometry {
  return once('umbCanopy', () =>
    merge([
      ball(0.95, '#ffffff', { y: 1.4, sy: 0.55 }, 1),
      ball(0.5, '#e8e8e8', { x: 0.55, y: 1.25, z: 0.2, sy: 0.6 }, 0),
      ball(0.45, '#f2f2f2', { x: -0.5, y: 1.3, z: -0.3, sy: 0.6 }, 0),
      ball(0.3, '#dcdcdc', { x: 0.1, y: 1.65, z: -0.1, sy: 0.7 }, 0),
    ]),
  );
}

/** Spire tree: a tall stack of shrinking puffs, like a scoop of soft-serve (canopy tinted per season). */
export function spireTrunk(): THREE.BufferGeometry {
  return once('spireTrunk', () => merge([cyl(0.08, 0.14, 1.1, '#c07a42', {}, 6), cyl(0.18, 0.24, 0.1, '#a05e32', {}, 6)]));
}
export function spireCanopy(): THREE.BufferGeometry {
  return once('spireCanopy', () =>
    merge([
      ball(0.58, '#ffffff', { y: 1.15, sy: 0.85 }, 1),
      ball(0.46, '#f0f0f0', { y: 1.7, sy: 0.9 }, 1),
      ball(0.33, '#fafafa', { y: 2.15, sy: 0.9 }, 1),
      ball(0.18, '#ffffff', { y: 2.5 }, 0),
    ]),
  );
}
