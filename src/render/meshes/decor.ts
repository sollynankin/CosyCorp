// Static map decoration meshes (lamps, quest board, fountain, greenhouse glass, mine mouth, cave rock).
import type * as THREE from 'three';
import { ball, box, cone, cyl, merge, torus } from './kit';

const memo = new Map<string, THREE.BufferGeometry>();
function once(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = memo.get(key);
  if (!g) {
    g = build();
    memo.set(key, g);
  }
  return g;
}

export const lampPost = () =>
  once('lamp', () => merge([cyl(0.05, 0.07, 1.7, '#3a3a42', {}, 6), box(0.3, 0.06, 0.3, '#3a3a42', { y: 1.7 }), cone(0.22, 0.18, '#3a3a42', { y: 2.08 }, 4)]));
export const lampGlow = () => once('lampGlow', () => merge([box(0.2, 0.32, 0.2, '#ffe6a8', { y: 1.76 })]));

export const questBoard = () =>
  once('board', () =>
    merge([
      cyl(0.05, 0.05, 1.6, '#6a4a2e', { x: -0.4 }, 5),
      cyl(0.05, 0.05, 1.6, '#6a4a2e', { x: 0.4 }, 5),
      box(1.0, 0.7, 0.08, '#9a6c42', { y: 0.75 }),
      box(0.24, 0.3, 0.02, '#f4ecd8', { x: -0.25, y: 0.9, z: 0.05 }),
      box(0.24, 0.24, 0.02, '#f8e8b8', { x: 0.05, y: 0.95, z: 0.05 }),
      box(0.2, 0.26, 0.02, '#e8f0f4', { x: 0.3, y: 0.85, z: 0.05 }),
      cone(0.62, 0.3, '#7a3a2a', { y: 1.5 }, 4),
    ]),
  );

export const fountain = () =>
  once('fountain', () =>
    merge([
      cyl(0.95, 1.0, 0.4, '#b8b0a4', {}, 12),
      cyl(0.8, 0.8, 0.05, '#5aa0c8', { y: 0.36 }, 12),
      cyl(0.12, 0.16, 0.9, '#a8a094', { y: 0.4 }, 8),
      cyl(0.4, 0.3, 0.12, '#b8b0a4', { y: 1.2 }, 10),
      ball(0.12, '#8ac8e8', { y: 1.42 }, 1),
    ]),
  );

export const glassPane = () => once('glass', () => merge([box(0.96, 1.6, 0.96, '#cfe8f0'), box(1.0, 0.08, 1.0, '#e8e8e0', { y: 1.6 })]));
export const glassFrame = () =>
  once('glassFrame', () =>
    merge([
      box(0.08, 1.7, 0.08, '#e8e8e0', { x: -0.46, z: -0.46 }),
      box(0.08, 1.7, 0.08, '#e8e8e0', { x: 0.46, z: 0.46 }),
      box(1.0, 0.1, 1.0, '#9a8a74'),
    ]),
  );
export const brokenGlass = () => once('glassBroken', () => merge([box(0.08, 1.3, 0.08, '#8a8a80', { x: -0.4, rz: 0.15 }), box(1.0, 0.1, 1.0, '#7a6a58'), box(0.5, 0.06, 0.5, '#b8c8c8', { x: 0.2, y: 0.08, ry: 0.5 })]));

export const mineMouth = () =>
  once('mine', () =>
    merge([
      box(1.0, 1.6, 0.4, '#6a5a4c', { z: 0.4 }),
      box(0.12, 1.4, 0.12, '#7a5636', { x: -0.42, z: 0.15 }),
      box(0.12, 1.4, 0.12, '#7a5636', { x: 0.42, z: 0.15 }),
      box(1.0, 0.14, 0.14, '#7a5636', { y: 1.4, z: 0.15 }),
      box(0.76, 1.32, 0.05, '#120c08', { z: 0.25 }),
    ]),
  );

export const rockWall = (variant: number) =>
  once(`rock${variant}`, () =>
    merge([
      ball(0.62, variant ? '#5a4c40' : '#6a5a4c', { y: 0.5, sy: 1.2 }, 0),
      ball(0.4, '#4a3e34', { x: 0.25, y: 1.0, z: 0.1 }, 0),
      ball(0.35, '#7a6a5a', { x: -0.2, y: 0.25, z: 0.3 }, 0),
    ]),
  );

export const shipLid = () => once('lid', () => merge([torus(0.1, 0.02, '#c8a050', { y: 0.7, rx: Math.PI / 2 })]));

// ---- Festival dressing --------------------------------------------------------------------------------
const FLAG_COLORS = ['#e05a5a', '#f0c040', '#5ab0e0', '#7ad07a', '#e88ad0'];

/** A bunting pole with a string of pennants running along +x for `len` tiles. */
export const buntingPole = () => once('bpole', () => merge([cyl(0.04, 0.05, 2.4, '#8a6440', {}, 5), ball(0.07, '#f0c040', { y: 2.42 }, 0)]));
export const buntingRun = (len: number) =>
  once(`brun${len}`, () => {
    const parts = [box(len, 0.02, 0.02, '#f4ecd8', { x: len / 2, y: 2.25 })];
    for (let k = 0; k < len * 3; k++) {
      const x = (k + 0.5) / 3;
      const sag = Math.sin((x / len) * Math.PI) * 0.25;
      parts.push(cone(0.09, 0.22, FLAG_COLORS[k % FLAG_COLORS.length], { x, y: 2.25 - sag - 0.22, rx: Math.PI }, 3));
    }
    return merge(parts);
  });

export const stall = (color: string) =>
  once(`stall${color}`, () =>
    merge([
      box(1.4, 0.75, 0.7, '#a87a50'),
      box(1.5, 0.06, 0.8, '#7a5636', { y: 0.75 }),
      cyl(0.04, 0.04, 1.3, '#7a5636', { x: -0.68, y: 0.75, z: -0.32 }, 5),
      cyl(0.04, 0.04, 1.3, '#7a5636', { x: 0.68, y: 0.75, z: -0.32 }, 5),
      box(1.6, 0.06, 1.0, color, { y: 2.05, rx: 0.25 }),
      ball(0.12, '#e05a3a', { x: -0.4, y: 0.88 }, 0),
      ball(0.1, '#f0c040', { x: -0.15, y: 0.86 }, 0),
      ball(0.13, '#7ac04a', { x: 0.3, y: 0.88 }, 0),
    ]),
  );

/** A paper lantern hung on a short post (body is the glowing part). */
export const lanternPost = () => once('lpost', () => merge([cyl(0.03, 0.04, 1.9, '#4a3a2a', {}, 5), box(0.5, 0.03, 0.03, '#4a3a2a', { x: 0.2, y: 1.9 })]));
export const lanternBody = () => once('lbody', () => merge([ball(0.17, '#ffb060', { x: 0.4, y: 1.62, sy: 1.25 }, 1), cyl(0.06, 0.06, 0.05, '#4a3a2a', { x: 0.4, y: 1.82 }, 6)]));
