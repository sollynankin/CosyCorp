// Meadow flora: small whimsical plants scattered on bare grass and water. Every shape bakes its own colours
// (stems stay green whatever the bloom colour is), so each kind × colour is one cached geometry and one
// instanced draw. Petals are cheap leaf shapes; only a few round bits are real balls.
import * as THREE from 'three';
import { ball, cone, cyl, leaf, merge, shade, type Part } from './kit';

export type BloomKind = 'daisy' | 'tulip' | 'bell' | 'pompom' | 'sunflower' | 'mushroom' | 'crystal' | 'curl';

/** Kinds that grow in flower patches vs. the odd ones that pop up on their own. */
export const PATCH_KINDS: BloomKind[] = ['daisy', 'tulip', 'bell', 'pompom', 'sunflower'];
export const ODD_KINDS: BloomKind[] = ['mushroom', 'curl', 'crystal', 'pompom'];

export const MUSHROOM_COLORS = ['#ff5a6a', '#ff9ad0', '#6ab8ff', '#b08aff', '#ffb03a'];
export const CRYSTAL_COLORS = ['#7af0ff', '#ff8ae8', '#9aff9a', '#c8a0ff'];
export const CURL_COLORS = ['#2fe0a0', '#b070f0', '#ff8a5a', '#46c8f0'];

const STEM = '#3fcf58';
const STEM_D = '#2fb84a';
const memo = new Map<string, THREE.BufferGeometry>();

/** A low-poly bead: an icosahedron with no subdivision (20 faces), fine for anything under a few cm. */
export function chip(r: number, color: THREE.ColorRepresentation, t: { x?: number; y?: number; z?: number; sy?: number } = {}): Part {
  const g = new THREE.IcosahedronGeometry(r, 0);
  g.scale(1, t.sy ?? 1, 1);
  g.translate(t.x ?? 0, t.y ?? 0, t.z ?? 0);
  return { geo: g, color };
}

function stemLeaves(h: number, len: number): Part[] {
  return [
    cyl(0.022, 0.03, h, STEM, {}, 6),
    leaf(len, STEM_D, { y: h * 0.18, ry: 0.5, rx: -0.55 }),
    leaf(len * 0.85, STEM, { y: h * 0.12, ry: 3.6, rx: -0.5 }),
  ];
}

function build(kind: BloomKind, color: string): Part[] {
  switch (kind) {
    case 'daisy': {
      const parts = stemLeaves(0.3, 0.14);
      for (let k = 0; k < 9; k++) parts.push(leaf(0.12, k % 2 ? color : shade(color, 0.06), { y: 0.31, ry: (k / 9) * Math.PI * 2, rx: -0.12 }));
      parts.push(ball(0.04, '#ffd23a', { y: 0.325, sy: 0.7 }, 0));
      return parts;
    }
    case 'tulip': {
      const parts = stemLeaves(0.3, 0.2);
      parts.push(ball(0.075, color, { y: 0.35, sy: 1.35 }, 0));
      parts.push(ball(0.05, shade(color, 0.08), { x: 0.045, y: 0.36, sy: 1.3, z: 0.01 }, 0));
      parts.push(ball(0.05, shade(color, -0.06), { x: -0.045, y: 0.36, sy: 1.3, z: -0.01 }, 0));
      return parts;
    }
    case 'bell': {
      const parts: Part[] = [cyl(0.02, 0.03, 0.34, STEM, { rz: 0.12 }, 6), leaf(0.16, STEM_D, { y: 0.03, ry: 1.2, rx: -0.5 })];
      for (let k = 0; k < 3; k++) {
        const x = 0.04 + k * 0.012;
        const y = 0.13 + k * 0.08;
        parts.push(cyl(0.012, 0.055 - k * 0.008, 0.085, k % 2 ? shade(color, 0.1) : color, { x: k % 2 ? -x : x, y, z: k * 0.015 }, 8));
        parts.push(cyl(0.058 - k * 0.008, 0.058 - k * 0.008, 0.014, '#ffffff', { x: k % 2 ? -x : x, y, z: k * 0.015 }, 8));
      }
      return parts;
    }
    case 'pompom': {
      const parts = [cyl(0.024, 0.032, 0.34, STEM, {}, 6), leaf(0.2, STEM_D, { y: 0.03, ry: 0.4, rx: -0.5 }), ball(0.1, color, { y: 0.4 }, 0)];
      for (let k = 0; k < 7; k++) {
        const a = k * 2.4;
        const up = ((k % 3) - 1) * 0.55;
        parts.push(chip(0.04, shade(color, 0.14), { x: Math.cos(a) * Math.cos(up) * 0.1, y: 0.4 + Math.sin(up) * 0.1, z: Math.sin(a) * Math.cos(up) * 0.1 }));
      }
      return parts;
    }
    case 'sunflower': {
      const parts: Part[] = [cyl(0.03, 0.042, 0.56, STEM, {}, 8), leaf(0.24, STEM_D, { y: 0.14, ry: 0.8, rx: -0.4 }), leaf(0.2, STEM, { y: 0.26, ry: 4, rx: -0.45 })];
      for (let k = 0; k < 12; k++) parts.push(leaf(0.12, k % 2 ? color : shade(color, 0.08), { y: 0.585, ry: (k / 12) * Math.PI * 2, rx: -0.1 }));
      parts.push(cyl(0.065, 0.07, 0.04, '#8a4a22', { y: 0.57 }, 10), chip(0.035, '#b8682e', { y: 0.615, sy: 0.5 }));
      return parts;
    }
    case 'mushroom': {
      const stalk = '#fff6e4';
      const parts: Part[] = [cyl(0.032, 0.045, 0.12, stalk, {}, 8), ball(0.105, color, { y: 0.14, sy: 0.65 }, 0)];
      for (let k = 0; k < 5; k++) {
        const a = k * 1.25;
        const r = k === 0 ? 0 : 0.055;
        parts.push(chip(0.022, '#ffffff', { x: Math.cos(a) * r, y: 0.14 + 0.067 * Math.sqrt(1 - (r / 0.105) ** 2) + 0.004, z: Math.sin(a) * r }));
      }
      // a small friend beside it
      parts.push(cyl(0.02, 0.028, 0.07, stalk, { x: 0.13, z: 0.06 }, 6), ball(0.06, shade(color, 0.1), { x: 0.13, y: 0.085, z: 0.06, sy: 0.65 }, 0), chip(0.014, '#ffffff', { x: 0.13, y: 0.122, z: 0.06 }));
      return parts;
    }
    case 'crystal': {
      return [
        ball(0.08, '#cbb8e8', { y: 0.01, sy: 0.45 }, 0),
        ball(0.05, color, { x: 0.0, y: 0.15, sy: 2.8 }, 0),
        ball(0.04, shade(color, 0.12), { x: 0.07, y: 0.1, z: 0.03, sy: 2.5 }, 0),
        ball(0.035, shade(color, -0.08), { x: -0.06, y: 0.09, z: -0.03, sy: 2.2 }, 0),
        chip(0.016, '#ffffff', { x: 0.01, y: 0.29, z: 0.02 }),
      ];
    }
    case 'curl': {
      // A fiddlehead fern: rises, then curls over into a tight spiral of shrinking beads.
      const parts: Part[] = [cyl(0.026, 0.036, 0.22, shade(color, -0.1), {}, 6)];
      const cx = 0.1;
      const cy = 0.22;
      for (let k = 0; k < 12; k++) {
        const a = Math.PI - k * 0.55;
        const r = 0.1 - k * 0.0065;
        parts.push(chip(0.04 - k * 0.002, k % 2 ? color : shade(color, 0.1), { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }));
      }
      parts.push(leaf(0.2, shade(color, -0.04), { y: 0.02, ry: 1.6, rx: -0.6 }), leaf(0.18, color, { y: 0.02, ry: 4.4, rx: -0.55 }));
      return parts;
    }
  }
}

export function bloom(kind: BloomKind, color: string): THREE.BufferGeometry {
  const key = `${kind}:${color}`;
  let g = memo.get(key);
  if (!g) {
    g = merge(build(kind, color));
    memo.set(key, g);
  }
  return g;
}

/** A floating lily pad with a lotus flower on top (or a bare pad when bloomColor is null). */
export function lily(bloomColor: string | null): THREE.BufferGeometry {
  const key = `lily:${bloomColor}`;
  let g = memo.get(key);
  if (!g) {
    const parts: Part[] = [cyl(0.23, 0.23, 0.02, '#3ccf6a', {}, 14), cyl(0.2, 0.2, 0.012, '#5ae88a', { y: 0.018 }, 14)];
    if (bloomColor) {
      for (let k = 0; k < 8; k++) parts.push(leaf(0.13, k % 2 ? bloomColor : shade(bloomColor, 0.08), { y: 0.04, ry: (k / 8) * Math.PI * 2, rx: -0.75 }));
      parts.push(chip(0.035, '#ffe060', { y: 0.06 }));
    }
    g = merge(parts);
    memo.set(key, g);
  }
  return g;
}

/** Cattail reeds for the water's edge. */
export function reeds(): THREE.BufferGeometry {
  let g = memo.get('reeds');
  if (!g) {
    const parts: Part[] = [];
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7;
      const x = Math.cos(a) * 0.09;
      const z = Math.sin(a) * 0.09;
      const h = 0.5 + (k % 3) * 0.12;
      parts.push(cyl(0.022, 0.03, h, '#4fd060', { x, z, rz: Math.cos(a) * 0.08, rx: Math.sin(a) * 0.08 }, 5));
      parts.push(cyl(0.038, 0.038, 0.12, '#a05a2e', { x, z, y: h - 0.06 }, 6));
      parts.push(cone(0.008, 0.06, '#d0a060', { x, z, y: h + 0.04 }, 4));
    }
    g = merge(parts);
    memo.set('reeds', g);
  }
  return g;
}
