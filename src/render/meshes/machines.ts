// Procedural machine meshes. Every machine is built facing north (−z = its front/output side) and rotated
// by its dir at draw time. A machine is a static body, an optional glowing part (night windows, heater
// grate) and an optional spinning part (wheels, blades, reels) animated while the machine works.
import type * as THREE from 'three';
import { ball, box, cone, cyl, merge, torus, type Part } from './kit';

export interface Spinner {
  geo: THREE.BufferGeometry;
  /** pivot in machine space (metres) */
  pivot: [number, number, number];
  axis: 'x' | 'y' | 'z';
  /** radians per second at full power */
  speed: number;
}

export interface MachineMesh {
  body: THREE.BufferGeometry;
  glow?: THREE.BufferGeometry;
  spin?: Spinner;
  /** height of the status lamp */
  lampY: number;
}

const WOOD = '#9a6a40';
const DARK = '#6a4628';
const BRASS = '#c89a3a';
const IRON = '#5a5a62';
const TEAL = '#3a7a78';
const RED = '#b8463a';
const STONE = '#a29e92';
const RUBBER = '#3d3833';
const CREAM = '#efe2c4';

/** Chevron pointing to −z, flat on top of a belt. */
function chevron(z: number, y: number, color: string): Part[] {
  return [
    box(0.24, 0.014, 0.06, color, { x: -0.08, y, z, ry: Math.PI / 4 }),
    box(0.24, 0.014, 0.06, color, { x: 0.08, y, z, ry: -Math.PI / 4 }),
  ];
}

/** Belt bed shared by conveyors and the splitter. */
function beltBed(rail: string, chevrons: number): Part[] {
  const parts: Part[] = [
    box(0.96, 0.1, 1.0, DARK),
    box(0.84, 0.03, 1.0, RUBBER, { y: 0.1 }),
    box(0.06, 0.08, 1.0, rail, { x: -0.45, y: 0.1 }),
    box(0.06, 0.08, 1.0, rail, { x: 0.45, y: 0.1 }),
  ];
  for (let k = 0; k < chevrons; k++) parts.push(...chevron(-0.3 + k * 0.3, 0.131, '#8a8070'));
  return parts;
}

function legs(w: number, d: number, h: number, color = DARK): Part[] {
  const out: Part[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(box(0.08, h, 0.08, color, { x: (sx * w) / 2, z: (sz * d) / 2 }));
  return out;
}

const memo = new Map<string, MachineMesh>();

export function machineMesh(type: string): MachineMesh {
  let m = memo.get(type);
  if (!m) {
    m = buildMachine(type);
    memo.set(type, m);
  }
  return m;
}

function buildMachine(type: string): MachineMesh {
  switch (type) {
    case 'sprinkler':
      return {
        body: merge([cyl(0.14, 0.18, 0.08, STONE), cyl(0.035, 0.035, 0.32, BRASS, { y: 0.08 }, 6)]),
        spin: { geo: merge([cyl(0.1, 0.1, 0.05, BRASS, {}, 8), box(0.34, 0.03, 0.04, BRASS, { y: 0.02 }), ball(0.035, '#7ab8d8', { x: 0.17, y: 0.035 }), ball(0.035, '#7ab8d8', { x: -0.17, y: 0.035 })]), pivot: [0, 0.4, 0], axis: 'y', speed: 1.5 },
        lampY: 0.55,
      };
    case 'pump_sprinkler':
      return {
        body: merge([
          box(0.5, 0.12, 0.5, STONE),
          cyl(0.16, 0.18, 0.4, '#4a7aa8', { x: 0.1, y: 0.12, z: 0.1 }, 10),
          cyl(0.17, 0.17, 0.04, BRASS, { x: 0.1, y: 0.52, z: 0.1 }, 10),
          cyl(0.04, 0.04, 0.45, BRASS, { x: -0.15, y: 0.12, z: -0.12 }, 6),
          box(0.08, 0.06, 0.24, IRON, { x: -0.15, y: 0.4, z: 0.0 }),
        ]),
        spin: { geo: merge([cyl(0.12, 0.12, 0.05, BRASS, {}, 8), box(0.46, 0.03, 0.05, BRASS, { y: 0.02 }), box(0.05, 0.03, 0.46, BRASS, { y: 0.02 })]), pivot: [-0.15, 0.6, -0.12], axis: 'y', speed: 2.2 },
        lampY: 0.8,
      };
    case 'seed_planter':
      return {
        body: merge([
          ...legs(0.6, 0.6, 0.35),
          box(0.7, 0.06, 0.7, DARK, { y: 0.35 }),
          cyl(0.42, 0.22, 0.42, '#6a9a4a', { y: 0.41 }, 4),
          cyl(0.43, 0.43, 0.04, BRASS, { y: 0.83 }, 4),
          box(0.12, 0.3, 0.12, IRON, { y: 0.08, z: -0.36, rx: 0.5 }),
          ball(0.05, '#d8c070', { y: 0.86 }),
        ]),
        lampY: 1.0,
      };
    case 'harvester':
      return {
        body: merge([
          box(0.62, 0.42, 0.6, RED, { z: 0.08 }),
          box(0.66, 0.06, 0.64, DARK, { y: 0.42, z: 0.08 }),
          box(0.2, 0.3, 0.2, IRON, { y: 0.48, z: 0.2 }),
          cyl(0.05, 0.06, 0.18, '#3a3a3a', { y: 0.78, z: 0.2 }, 6),
          box(0.08, 0.3, 0.3, IRON, { x: -0.32, y: 0.08, z: -0.28 }),
          box(0.08, 0.3, 0.3, IRON, { x: 0.32, y: 0.08, z: -0.28 }),
          box(0.66, 0.06, 0.12, BRASS, { y: 0.04, z: -0.42 }),
        ]),
        spin: (() => {
          const parts: Part[] = [cyl(0.03, 0.03, 0.58, IRON, { rz: Math.PI / 2, x: 0.29 }, 6)];
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2;
            parts.push(box(0.56, 0.03, 0.05, BRASS, { y: Math.sin(a) * 0.12 - 0.015, z: Math.cos(a) * 0.12, rx: a }));
          }
          return { geo: merge(parts), pivot: [0, 0.22, -0.32] as [number, number, number], axis: 'x' as const, speed: -4 };
        })(),
        lampY: 0.95,
      };
    case 'conveyor':
      return { body: merge(beltBed(BRASS, 3)), lampY: -1 };
    case 'swift_conveyor':
      return { body: merge([...beltBed('#4a8ac8', 0), ...chevron(-0.32, 0.131, '#a8d0f0'), ...chevron(-0.18, 0.131, '#a8d0f0'), ...chevron(0.12, 0.131, '#a8d0f0'), ...chevron(0.26, 0.131, '#a8d0f0')]), lampY: -1 };
    case 'splitter':
      return {
        body: merge([
          box(0.96, 0.1, 0.96, DARK),
          box(0.84, 0.03, 0.84, RUBBER, { y: 0.1 }),
          ...chevron(-0.3, 0.131, '#e0b050'),
          ...chevron(0.0, 0.131, '#e0b050'),
          box(0.12, 0.2, 0.12, TEAL, { x: -0.42, y: 0.1, z: 0.42 }),
          box(0.12, 0.2, 0.12, TEAL, { x: 0.42, y: 0.1, z: 0.42 }),
          box(0.12, 0.2, 0.12, TEAL, { x: -0.42, y: 0.1, z: -0.42 }),
          box(0.12, 0.2, 0.12, TEAL, { x: 0.42, y: 0.1, z: -0.42 }),
        ]),
        spin: { geo: merge([cyl(0.06, 0.06, 0.06, BRASS, {}, 6), box(0.08, 0.04, 0.3, BRASS, { z: -0.15 })]), pivot: [0, 0.3, 0], axis: 'y', speed: 3 },
        lampY: 0.55,
      };
    case 'jam_press':
      return {
        body: merge([
          box(0.8, 0.1, 0.8, DARK),
          cyl(0.3, 0.26, 0.36, '#a83a4a', { y: 0.1 }, 10),
          cyl(0.31, 0.31, 0.04, BRASS, { y: 0.44 }, 10),
          box(0.08, 0.95, 0.08, WOOD, { x: -0.36, y: 0.1 }),
          box(0.08, 0.95, 0.08, WOOD, { x: 0.36, y: 0.1 }),
          box(0.8, 0.1, 0.12, WOOD, { y: 1.0 }),
          cyl(0.035, 0.035, 0.5, IRON, { y: 0.52 }, 6),
          box(0.14, 0.12, 0.1, '#c84a5a', { y: 0.12, z: -0.4 }),
        ]),
        spin: { geo: merge([torus(0.16, 0.025, BRASS, { rx: Math.PI / 2 }, 4, 10), box(0.32, 0.03, 0.03, BRASS), box(0.03, 0.03, 0.32, BRASS)]), pivot: [0, 1.16, 0], axis: 'y', speed: 1.2 },
        lampY: 1.35,
      };
    case 'preserver':
      return {
        body: merge([
          box(0.8, 0.1, 0.8, STONE),
          cyl(0.32, 0.34, 0.6, '#c8783a', { y: 0.1 }, 12),
          cyl(0.2, 0.32, 0.16, '#d8884a', { y: 0.7 }, 12),
          cyl(0.04, 0.05, 0.3, BRASS, { y: 0.86 }, 6),
          torus(0.33, 0.025, BRASS, { y: 0.3, rx: Math.PI / 2 }, 4, 14),
          torus(0.33, 0.025, BRASS, { y: 0.55, rx: Math.PI / 2 }, 4, 14),
          cyl(0.07, 0.07, 0.14, '#e8d8a0', { x: -0.28, y: 0.1, z: -0.3 }, 8),
          cyl(0.07, 0.07, 0.14, '#d86a4a', { x: 0.28, y: 0.1, z: -0.3 }, 8),
        ]),
        glow: merge([box(0.18, 0.12, 0.02, '#ffb060', { y: 0.2, z: -0.33 })]),
        lampY: 1.3,
      };
    case 'mill':
      return {
        body: merge([
          cyl(0.42, 0.46, 0.5, STONE, {}, 8),
          cyl(0.44, 0.44, 0.06, '#8a867c', { y: 0.5 }, 8),
          box(0.16, 0.16, 0.2, WOOD, { y: 0.1, z: -0.48 }),
          cyl(0.03, 0.03, 0.4, IRON, { y: 0.56 }, 6),
        ]),
        spin: { geo: merge([cyl(0.36, 0.36, 0.12, '#c8c4b8', {}, 10), box(0.6, 0.04, 0.05, DARK, { y: 0.12 })]), pivot: [0, 0.56, 0], axis: 'y', speed: 0.8 },
        lampY: 1.05,
      };
    case 'cheese_press':
      return {
        body: merge([
          box(0.8, 0.12, 0.6, WOOD),
          box(0.08, 0.8, 0.08, DARK, { x: -0.32, y: 0.12 }),
          box(0.08, 0.8, 0.08, DARK, { x: 0.32, y: 0.12 }),
          box(0.72, 0.1, 0.12, DARK, { y: 0.88 }),
          cyl(0.22, 0.22, 0.2, '#f0c850', { y: 0.12 }, 12),
          box(0.5, 0.06, 0.4, WOOD, { y: 0.5 }),
          cyl(0.03, 0.03, 0.4, IRON, { y: 0.56 }, 6),
        ]),
        lampY: 1.15,
      };
    case 'silo':
      return {
        body: merge([
          cyl(0.42, 0.44, 1.9, CREAM, {}, 12),
          torus(0.43, 0.02, '#b8a888', { y: 0.6, rx: Math.PI / 2 }, 3, 16),
          torus(0.43, 0.02, '#b8a888', { y: 1.2, rx: Math.PI / 2 }, 3, 16),
          cone(0.48, 0.5, '#a8483a', { y: 1.9 }, 12),
          box(0.26, 0.3, 0.06, DARK, { y: 0.0, z: -0.42 }),
          box(0.08, 1.4, 0.04, IRON, { x: 0.3, y: 0.3, z: -0.32 }),
        ]),
        lampY: 2.55,
      };
    case 'market_chute':
      return {
        body: merge([
          ...legs(0.56, 0.56, 0.4),
          cyl(0.46, 0.2, 0.42, WOOD, { y: 0.4, ry: Math.PI / 4 }, 4),
          cyl(0.46, 0.46, 0.04, BRASS, { y: 0.82, ry: Math.PI / 4 }, 4),
          box(0.18, 0.4, 0.18, DARK, { y: 0.0 }),
          box(0.04, 0.5, 0.04, DARK, { x: 0.3, y: 0.82, z: 0.3 }),
          cyl(0.13, 0.13, 0.03, '#e8c040', { x: 0.3, y: 1.28, z: 0.3, rx: Math.PI / 2 }, 12),
        ]),
        lampY: 1.0,
      };
    case 'water_wheel': {
      // Built with the wheel on the −x side (toward the stream); the renderer turns it to face the water.
      const r = 0.62;
      const parts: Part[] = [torus(r, 0.04, DARK, {}, 4, 16), torus(r * 0.45, 0.03, DARK, {}, 4, 10), cyl(0.07, 0.07, 0.36, IRON, { rx: Math.PI / 2, z: -0.18 }, 8)];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        parts.push(box(0.05, r, 0.05, WOOD, { rz: a - Math.PI / 2 }));
        parts.push(box(0.24, 0.05, 0.26, '#a87a50', { x: Math.cos(a) * r, y: Math.sin(a) * r - 0.025, z: -0.13, rz: a }));
      }
      const g = merge(parts);
      g.rotateY(Math.PI / 2);
      return {
        body: merge([
          box(0.5, 0.5, 0.7, STONE, { x: 0.18 }),
          box(0.08, 0.95, 0.08, DARK, { x: -0.1, z: -0.3 }),
          box(0.08, 0.95, 0.08, DARK, { x: -0.1, z: 0.3 }),
          box(0.56, 0.1, 0.76, DARK, { x: 0.18, y: 0.5 }),
          cyl(0.1, 0.12, 0.25, BRASS, { x: 0.18, y: 0.6 }, 8),
        ]),
        spin: { geo: g, pivot: [-0.36, 0.7, 0], axis: 'x', speed: 0.9 },
        lampY: 1.0,
      };
    }
    case 'windmill': {
      const blades: Part[] = [cyl(0.08, 0.08, 0.12, BRASS, { rx: Math.PI / 2, z: -0.06 }, 8)];
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        // box() grows from its base, so after rz = a − π/2 each part extends outward along angle a.
        blades.push(box(0.05, 0.8, 0.03, DARK, { z: -0.12, rz: a - Math.PI / 2 }));
        blades.push(box(0.22, 0.58, 0.02, CREAM, { x: Math.cos(a) * 0.2 + Math.cos(a + Math.PI / 2) * 0.12, y: Math.sin(a) * 0.2 + Math.sin(a + Math.PI / 2) * 0.12, z: -0.13, rz: a - Math.PI / 2 }));
      }
      return {
        body: merge([
          cyl(0.24, 0.4, 1.6, '#e8dcc0', {}, 8),
          cone(0.32, 0.4, '#7a4a3a', { y: 1.6 }, 8),
          box(0.18, 0.3, 0.06, DARK, { z: -0.35 }),
          box(0.12, 0.12, 0.05, '#4a6a88', { y: 0.9, z: -0.3 }),
        ]),
        glow: merge([box(0.1, 0.1, 0.02, '#ffd080', { y: 0.91, z: -0.33 })]),
        spin: { geo: merge(blades), pivot: [0, 1.55, -0.3], axis: 'z', speed: 1.4 },
        lampY: 2.2,
      };
    }
    case 'heater':
      return {
        body: merge([
          box(0.6, 0.08, 0.6, STONE),
          box(0.5, 0.5, 0.5, IRON, { y: 0.08 }),
          box(0.56, 0.06, 0.56, '#4a4a52', { y: 0.58 }),
          cyl(0.07, 0.07, 0.45, '#3a3a40', { x: 0.14, y: 0.64, z: 0.14 }, 6),
          box(0.1, 0.06, 0.1, BRASS, { x: -0.18, y: 0.64, z: -0.18 }),
        ]),
        glow: merge([box(0.3, 0.18, 0.02, '#ff8a30', { y: 0.2, z: -0.26 })]),
        lampY: 1.2,
      };
    case 'chest':
      return {
        body: merge([
          box(0.7, 0.36, 0.5, WOOD),
          box(0.72, 0.14, 0.52, '#a87444', { y: 0.36 }),
          box(0.74, 0.04, 0.06, IRON, { y: 0.16, z: 0 }),
          box(0.1, 0.12, 0.04, BRASS, { y: 0.3, z: -0.26 }),
        ]),
        lampY: -1,
      };
    default:
      return { body: merge([box(0.6, 0.6, 0.6, '#ff00ff')]), lampY: 0.8 };
  }
}

/** Status lamp bead (white; tinted per instance). */
export const lampGeo = merge([ball(0.07, '#ffffff', {}, 1)]);
/** Small arrow for the Flow overlay and the build ghost (white; tinted). Points to −z. */
export const arrowGeo = merge([box(0.12, 0.02, 0.36, '#ffffff', { z: 0.06 }), cone(0.18, 0.26, '#ffffff', { rx: -Math.PI / 2, z: -0.12 }, 3)]);
