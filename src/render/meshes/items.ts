// Small item meshes: belt items, held tools, dropped icons. Belt items share one geometry per icon shape
// (tinted by instance colour) so all items on all belts draw in a handful of instanced calls.
import * as THREE from 'three';
import type { ItemDef, ToolId } from '../../data/types';
import { ball, box, cone, cyl, merge, torus, type Part } from './kit';

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

/**
 * Axe head: a flat wedge in the (z, y) plane with a straight, sharp cutting edge, extruded thin along x.
 * The poll (back) sits on the handle; the blade flares out to the edge.
 */
function axeBlade(color: string): Part {
  const sh = new THREE.Shape();
  sh.moveTo(-0.05, -0.56);
  sh.lineTo(0.07, -0.57);
  sh.lineTo(0.3, -0.47);
  sh.lineTo(0.31, -0.92);
  sh.lineTo(0.07, -0.83);
  sh.lineTo(-0.05, -0.84);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false });
  g.rotateY(-Math.PI / 2);
  g.translate(0.035, 0, 0);
  return { geo: g, color };
}

/** Held tool geometry, oriented to hang from the hand (pointing down −y). Chunky and bright, shaded by colour. */
export function toolGeometry(tool: ToolId, tier: number): THREE.BufferGeometry {
  const key = `tool:${tool}:${tier}`;
  let g = memo.get(key);
  if (g) return g;
  // Pastel head colours by tier: sky, copper-orange, silver-lilac; `rim` is the deeper shade for undersides.
  const head = ['#8ad0ff', '#ffa060', '#e4dcff'][tier] ?? '#8ad0ff';
  const rim = ['#4a8ede', '#e86a2a', '#9a88e0'][tier] ?? '#4a8ede';
  const edge = ['#e8f8ff', '#fff0d8', '#ffffff'][tier] ?? '#e8f8ff';
  const handle = cyl(0.045, 0.05, 0.62, '#e0a060', { y: -0.55 }, 8);
  const grip = cyl(0.05, 0.05, 0.16, '#c0743a', { y: -0.2 }, 8);
  const knob = ball(0.065, '#c0743a', { y: 0.07 }, 0);
  let parts: Part[];
  switch (tool) {
    case 'hoe':
      parts = [handle, grip, knob, box(0.3, 0.15, 0.2, head, { y: -0.7, z: 0.1 }), box(0.3, 0.05, 0.2, rim, { y: -0.7, z: 0.1 }), box(0.3, 0.03, 0.2, edge, { y: -0.58, z: 0.1 })];
      break;
    case 'axe':
      parts = [
        handle,
        grip,
        knob,
        axeBlade(head),
        box(0.12, 0.3, 0.1, rim, { y: -0.86, z: -0.02 }), // darker poll behind the blade
        box(0.075, 0.44, 0.02, edge, { y: -0.92, z: 0.295 }), // bright cutting edge
      ];
      break;
    case 'pickaxe':
      parts = [
        handle,
        grip,
        knob,
        box(0.16, 0.16, 0.16, head, { y: -0.68 }),
        box(0.22, 0.11, 0.11, head, { x: 0.18, y: -0.62, rz: 0.4 }),
        box(0.22, 0.11, 0.11, head, { x: -0.18, y: -0.62, rz: -0.4 }),
        box(0.16, 0.04, 0.16, rim, { y: -0.68 }),
        cone(0.05, 0.14, edge, { x: 0.32, y: -0.58, rz: -1.9 }, 6),
        cone(0.05, 0.14, edge, { x: -0.32, y: -0.58, rz: 1.9 }, 6),
      ];
      break;
    case 'scythe':
      parts = [handle, grip, knob, box(0.1, 0.12, 0.44, head, { y: -0.7, z: 0.2, rx: 0.3 }), box(0.1, 0.04, 0.44, rim, { y: -0.7, z: 0.2, rx: 0.3 }), cone(0.05, 0.16, edge, { y: -0.56, z: 0.46, rx: 1.6 }, 6)];
      break;
    case 'rod':
      parts = [cyl(0.028, 0.048, 1.1, '#9ae070', { y: -1.0 }, 8), cyl(0.05, 0.05, 0.2, '#c0743a', { y: -0.3 }, 8), ball(0.065, '#ffd84a', { y: 0.07 }, 0), ball(0.07, '#ffd84a', { z: 0.08, y: -0.4 }, 0), ball(0.055, '#ff5a6a', { y: -1.5 }, 0)];
      break;
    case 'can': {
      const body = tier === 0 ? '#7ac0f0' : head;
      parts = [
        cyl(0.14, 0.16, 0.26, body, { y: -0.2 }, 10),
        cyl(0.145, 0.145, 0.04, rim, { y: -0.2 }, 10),
        cyl(0.15, 0.15, 0.03, edge, { y: 0.03 }, 10),
        cyl(0.035, 0.055, 0.3, body, { y: -0.1, z: 0.16, rx: 0.9 }, 8),
        ball(0.06, rim, { y: 0.08, z: 0.3 }, 0),
        torus(0.08, 0.022, rim, { z: -0.16, y: -0.09, ry: Math.PI / 2 }, 5, 10),
      ];
      break;
    }
  }
  g = merge(parts);
  memo.set(key, g);
  return g;
}
