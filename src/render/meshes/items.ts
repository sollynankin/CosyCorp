// Small item meshes: belt items, held tools, dropped icons. Belt items share one geometry per icon shape
// (tinted by instance colour) so all items on all belts draw in a handful of instanced calls.
import type * as THREE from 'three';
import type { ItemDef, ToolId } from '../../data/types';
import { ball, box, cone, cyl, merge, type Part } from './kit';

const memo = new Map<string, THREE.BufferGeometry>();

/** Item shapes in white-ish greys (instance colour tints them). */
export function itemShape(icon: ItemDef['icon']): THREE.BufferGeometry {
  let g = memo.get(icon);
  if (g) return g;
  let parts: Part[];
  switch (icon) {
    case 'jar':
      parts = [cyl(0.1, 0.1, 0.18, '#f0f0f0', {}, 8), cyl(0.105, 0.105, 0.04, '#9a7a5a', { y: 0.18 }, 8)];
      break;
    case 'bottle':
      parts = [cyl(0.07, 0.08, 0.18, '#f0f0f0', {}, 8), cyl(0.03, 0.04, 0.08, '#e0e0e0', { y: 0.18 }, 6)];
      break;
    case 'bag':
      parts = [ball(0.12, '#f0f0f0', { y: 0.1, sy: 0.9 }, 1), cone(0.05, 0.08, '#d8d8d8', { y: 0.19 }, 5)];
      break;
    case 'box':
      parts = [box(0.22, 0.14, 0.18, '#f0f0f0')];
      break;
    case 'long':
      parts = [cyl(0.05, 0.03, 0.3, '#f0f0f0', { y: 0.05, rz: Math.PI / 2 }, 6)];
      break;
    case 'leaf':
      parts = [box(0.22, 0.04, 0.12, '#f0f0f0', { ry: 0.4 }), box(0.18, 0.04, 0.1, '#dcdcdc', { y: 0.04, ry: -0.5 })];
      break;
    case 'fish':
      parts = [ball(0.1, '#f0f0f0', { y: 0.08, sx: 1.8, sz: 0.7 }, 1), cone(0.07, 0.1, '#dcdcdc', { x: -0.22, y: 0.08, rz: Math.PI / 2 }, 4)];
      break;
    case 'gem':
      parts = [ball(0.12, '#f0f0f0', { y: 0.1 }, 0)];
      break;
    case 'egg':
      parts = [ball(0.08, '#f0f0f0', { y: 0.09, sy: 1.3 }, 1)];
      break;
    case 'bowl':
      parts = [cyl(0.13, 0.08, 0.08, '#f0f0f0', {}, 10)];
      break;
    default:
      parts = [ball(0.11, '#f0f0f0', { y: 0.1 }, 1)];
  }
  g = merge(parts);
  memo.set(icon, g);
  return g;
}

/** Held tool geometry, oriented to hang from the hand (pointing down −y). */
export function toolGeometry(tool: ToolId, tier: number): THREE.BufferGeometry {
  const key = `tool:${tool}:${tier}`;
  let g = memo.get(key);
  if (g) return g;
  const metal = ['#8a8a8a', '#c8743a', '#c8ccd4'][tier] ?? '#8a8a8a';
  const handle = cyl(0.025, 0.025, 0.6, '#8a6440', { y: -0.55 }, 5);
  let parts: Part[];
  switch (tool) {
    case 'hoe':
      parts = [handle, box(0.2, 0.04, 0.12, metal, { y: -0.6, z: 0.06 })];
      break;
    case 'axe':
      parts = [handle, box(0.04, 0.16, 0.18, metal, { y: -0.62, z: 0.08 })];
      break;
    case 'pickaxe':
      parts = [handle, box(0.36, 0.05, 0.05, metal, { y: -0.6 })];
      break;
    case 'scythe':
      parts = [handle, box(0.04, 0.04, 0.38, metal, { y: -0.58, z: 0.18, rx: 0.3 })];
      break;
    case 'rod':
      parts = [cyl(0.015, 0.025, 1.1, '#6a8a4a', { y: -1.0 }, 5)];
      break;
    case 'can':
      parts = [cyl(0.1, 0.12, 0.2, metal === '#8a8a8a' ? '#5a8ab8' : metal, { y: -0.2 }, 8), cyl(0.02, 0.03, 0.22, '#5a8ab8', { y: -0.15, z: 0.12, rx: 0.9 }, 5)];
      break;
  }
  g = merge(parts);
  memo.set(key, g);
  return g;
}
