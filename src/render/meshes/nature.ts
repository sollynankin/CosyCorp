// Trees, rocks, weeds and other nature props. Geometries whose colour changes with the season are built
// in light greys so the InstancedMesh instance colour (a multiply) can tint them per season.
import type * as THREE from 'three';
import { ball, box, cone, cyl, leaf, merge, type Part } from './kit';

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
    const parts: Part[] = [cyl(0.12, 0.18, h, '#7a5636', {}, 6)];
    if (variant === 2) parts.push(cyl(0.06, 0.09, 0.6, '#7a5636', { x: 0.1, y: 0.6, rz: -0.7 }, 5));
    parts.push(cyl(0.2, 0.26, 0.12, '#6a4a2e', {}, 6));
    return merge(parts);
  });
}

/** Canopy in greys (tinted per season). */
export function treeCanopy(variant: number): THREE.BufferGeometry {
  return once(`canopy${variant}`, () => {
    if (variant === 1)
      return merge([
        ball(0.55, '#f4f4f4', { y: 1.65, sy: 1.25 }, 1),
        ball(0.4, '#d8d8d8', { x: 0.25, y: 2.05, z: 0.1 }, 0),
      ]);
    if (variant === 2)
      return merge([
        ball(0.6, '#f0f0f0', { x: -0.05, y: 1.45 }, 1),
        ball(0.4, '#d4d4d4', { x: 0.45, y: 1.3, z: 0.1 }, 0),
        ball(0.35, '#e4e4e4', { x: -0.4, y: 1.7, z: -0.2 }, 0),
      ]);
    return merge([
      ball(0.62, '#f4f4f4', { y: 1.45 }, 1),
      ball(0.45, '#d6d6d6', { x: 0.35, y: 1.3, z: 0.2 }, 0),
      ball(0.42, '#e6e6e6', { x: -0.3, y: 1.65, z: -0.15 }, 0),
      ball(0.35, '#cacaca', { x: 0.05, y: 1.95, z: 0.1 }, 0),
    ]);
  });
}

export function stump(): THREE.BufferGeometry {
  return once('stump', () =>
    merge([cyl(0.2, 0.25, 0.28, '#7a5636', {}, 7), cyl(0.17, 0.17, 0.02, '#d8b480', { y: 0.28 }, 7)]),
  );
}

/** Pine: body in greys for season tint. */
export function pineBody(): THREE.BufferGeometry {
  return once('pine', () =>
    merge([
      cone(0.62, 0.9, '#e8e8e8', { y: 0.45 }, 7),
      cone(0.5, 0.8, '#f4f4f4', { y: 0.95 }, 7),
      cone(0.36, 0.7, '#dcdcdc', { y: 1.4 }, 7),
    ]),
  );
}
export function pineTrunk(): THREE.BufferGeometry {
  return once('pineTrunk', () => merge([cyl(0.1, 0.14, 0.6, '#6a4a2e', {}, 5)]));
}
export function pineSnow(): THREE.BufferGeometry {
  return once('pineSnow', () =>
    merge([cone(0.38, 0.36, '#f8fbff', { y: 1.74 }, 7), cone(0.5, 0.24, '#f0f6fa', { y: 1.3 }, 7)]),
  );
}

export function bush(): THREE.BufferGeometry {
  return once('bush', () =>
    merge([
      ball(0.38, '#f0f0f0', { y: 0.3, sy: 0.8 }, 1),
      ball(0.28, '#d8d8d8', { x: 0.25, y: 0.22, z: 0.12 }, 0),
      ball(0.26, '#e4e4e4', { x: -0.22, y: 0.24, z: -0.1 }, 0),
    ]),
  );
}

export function smallStone(): THREE.BufferGeometry {
  return once('stone', () => merge([ball(0.22, '#9a9a94', { y: 0.12, sy: 0.65 }, 0), ball(0.12, '#8a8a84', { x: 0.16, y: 0.08, z: 0.1 }, 0)]));
}

export function boulder(): THREE.BufferGeometry {
  return once('boulder', () =>
    merge([
      ball(0.45, '#8f8f88', { y: 0.32, sy: 0.75 }, 0),
      ball(0.3, '#a0a098', { x: 0.25, y: 0.25, z: 0.15 }, 0),
      ball(0.25, '#7f7f78', { x: -0.25, y: 0.2, z: -0.1 }, 0),
    ]),
  );
}

export function weeds(): THREE.BufferGeometry {
  return once('weeds', () => {
    const parts: Part[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      parts.push(leaf(0.32, k % 2 ? '#e8e8e8' : '#c8c8c8', { x: Math.cos(a) * 0.08, y: 0.04, z: Math.sin(a) * 0.08, ry: -a + Math.PI / 2, rx: -0.9 }));
    }
    return merge(parts);
  });
}

export function twig(): THREE.BufferGeometry {
  return once('twig', () =>
    merge([
      cyl(0.03, 0.04, 0.55, '#7a5636', { y: 0.05, rz: Math.PI / 2, ry: 0.4 }, 4),
      cyl(0.02, 0.03, 0.25, '#6a4a2e', { x: 0.05, y: 0.05, z: 0.08, rz: Math.PI / 2, ry: -0.6 }, 4),
    ]),
  );
}

/** Ore rock: a stone with coloured nuggets. */
export function oreRock(color: string): THREE.BufferGeometry {
  return once(`ore${color}`, () =>
    merge([
      ball(0.36, '#7a706a', { y: 0.26, sy: 0.75 }, 0),
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
    if (stage === 0) return merge([cyl(0.03, 0.04, 0.5, '#7a5636', {}, 5), leaf(0.2, '#7cbf4a', { y: 0.45, rx: -0.6 }), leaf(0.2, '#6aaf3a', { y: 0.4, ry: 2, rx: -0.6 })]);
    if (stage === 1) return merge([cyl(0.06, 0.08, 0.9, '#7a5636', {}, 6), ball(0.38, '#6aaf3a', { y: 1.0 }, 0), ball(0.26, '#7cbf4a', { x: 0.2, y: 0.85 }, 0)]);
    return merge([
      cyl(0.1, 0.14, 1.1, '#7a5636', {}, 6),
      ball(0.6, '#5f9f3a', { y: 1.35 }, 1),
      ball(0.4, '#6fb04a', { x: 0.35, y: 1.2, z: 0.15 }, 0),
      ball(0.38, '#549436', { x: -0.3, y: 1.55, z: -0.1 }, 0),
    ]);
  });
}

export function fruit(color: string): THREE.BufferGeometry {
  return once(`fruit${color}`, () => merge([ball(0.09, color, {}, 1), cyl(0.01, 0.01, 0.06, '#5a3a20', { y: 0.07 }, 3)]));
}
