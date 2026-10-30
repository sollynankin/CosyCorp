// Soft pastel hills ringing the map, so the view past the edge shows colour instead of bare sky.
// Static per map and season; fog fades the far ones toward the sky colour.
import * as THREE from 'three';
import type { SeasonId } from '../data/types';
import type { ParsedMap } from '../world';
import { vertexMat } from './materials';
import { ball, jitter, merge, type Part } from './meshes/kit';
import { SEASON_PALETTE } from './palette';

export function buildBackdrop(m: ParsedMap, season: SeasonId): THREE.Mesh {
  const pal = SEASON_PALETTE[season];
  const parts: Part[] = [];
  const hill = (x: number, z: number, k: number) => {
    const r = 2.5 + jitter(k * 1.7) * 2.5;
    parts.push(ball(r, pal.hills[Math.floor(jitter(k * 3.1) * pal.hills.length * 0.999)], { x, y: -r * 0.45, z, sx: 1.6, sz: 1.6, sy: 0.45 + jitter(k * 2.3) * 0.2 }, 1));
  };
  let k = 1;
  for (let x = -6; x < m.w + 8; x += 5) {
    hill(x + jitter(k) * 3, -9 - jitter(k * 5) * 6, k++);
    hill(x + jitter(k) * 3, m.h + 9 + jitter(k * 5) * 6, k++);
  }
  for (let z = 0; z < m.h; z += 5) {
    hill(-9 - jitter(k * 5) * 6, z + jitter(k) * 3, k++);
    hill(m.w + 9 + jitter(k * 5) * 6, z + jitter(k) * 3, k++);
  }
  const mesh = new THREE.Mesh(merge(parts), vertexMat);
  mesh.receiveShadow = false;
  return mesh;
}
