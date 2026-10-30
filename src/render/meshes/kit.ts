// Procedural mesh kit. Builders describe a thing as coloured primitive parts; merge() bakes them into one
// non-indexed BufferGeometry with per-vertex colours, so a whole crop, tree or machine is one draw call and
// can be instanced. All sizes are metres (1 tile = 1 m), origin at the tile centre on the ground.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Largest corner radius (metres) for box(): the soft, toy-like edge. */
const BOX_ROUNDING = 0.05;
/** Curved parts never get fewer segments than this, so silhouettes stay round and smooth-shaded. */
const MIN_RADIAL = 12;

export interface Part {
  geo: THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
}

const tmpColor = new THREE.Color();

function place(
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  geo.applyMatrix4(m);
  return geo;
}

export interface Xform {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

function xf(geo: THREE.BufferGeometry, t: Xform): THREE.BufferGeometry {
  return place(geo, t.x ?? 0, t.y ?? 0, t.z ?? 0, t.rx ?? 0, t.ry ?? 0, t.rz ?? 0, t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
}

/**
 * Box whose bottom sits at y (not centred), so stacking reads naturally. Edges are rounded; the radius
 * follows the thinnest side so planks and slabs keep their shape.
 */
export function box(w: number, h: number, d: number, color: THREE.ColorRepresentation, t: Xform = {}): Part {
  const r = Math.min(BOX_ROUNDING, Math.min(w, h, d) * 0.45);
  const g = new RoundedBoxGeometry(w, h, d, 2, r);
  g.translate(0, h / 2, 0);
  return { geo: xf(g, t), color };
}

/** Cylinder (or cone/frustum) with its bottom at y. */
export function cyl(rTop: number, rBot: number, h: number, color: THREE.ColorRepresentation, t: Xform = {}, seg = 8): Part {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, Math.max(seg, MIN_RADIAL));
  g.translate(0, h / 2, 0);
  return { geo: xf(g, t), color };
}

export function cone(r: number, h: number, color: THREE.ColorRepresentation, t: Xform = {}, seg = 8): Part {
  const g = new THREE.ConeGeometry(r, h, Math.max(seg, MIN_RADIAL));
  g.translate(0, h / 2, 0);
  return { geo: xf(g, t), color };
}

/** Ball centred at (x, y, z). Detail 0 is still subdivided once: an icosahedron with detail > 0 shades smooth. */
export function ball(r: number, color: THREE.ColorRepresentation, t: Xform = {}, detail = 0): Part {
  return { geo: xf(new THREE.IcosahedronGeometry(r, detail + 1), t), color };
}

export function sphere(r: number, color: THREE.ColorRepresentation, t: Xform = {}, ws = 8, hs = 6): Part {
  return { geo: xf(new THREE.SphereGeometry(r, Math.max(ws, 16), Math.max(hs, 12)), t), color };
}

export function torus(r: number, tube: number, color: THREE.ColorRepresentation, t: Xform = {}, rs = 6, ts = 12): Part {
  return { geo: xf(new THREE.TorusGeometry(r, tube, Math.max(rs, 8), Math.max(ts, 16)), t), color };
}

/** Flat quad lying on the ground (XZ), centred. */
export function flat(w: number, d: number, color: THREE.ColorRepresentation, t: Xform = {}): Part {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  return { geo: xf(g, t), color };
}

/** A leaf: a flattened, tilted octahedron. */
export function leaf(len: number, color: THREE.ColorRepresentation, t: Xform = {}): Part {
  const g = new THREE.OctahedronGeometry(0.5, 0);
  g.scale(len * 0.52, len * 0.14, len);
  g.translate(0, 0, len * 0.5);
  return { geo: xf(g, t), color };
}

/** Prism roof: a triangular gable spanning w (x) by d (z), ridge along x, sitting at y. */
export function gable(w: number, d: number, h: number, color: THREE.ColorRepresentation, t: Xform = {}): Part {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0);
  shape.lineTo(d / 2, 0);
  shape.lineTo(0, h);
  shape.lineTo(-d / 2, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 });
  g.translate(0, 0, -w / 2);
  g.rotateY(Math.PI / 2);
  return { geo: xf(g, t), color };
}

/**
 * Merge parts into one geometry with a `color` attribute (non-indexed). Primitives keep their own vertex
 * normals, so spheres and cylinders shade smoothly while box faces stay crisp between their rounded edges.
 */
export function merge(parts: Part[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    tmpColor.set(p.color);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
    }
    p.geo.dispose();
    if (g !== p.geo) g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.computeBoundingSphere();
  return out;
}

/** Shift a hex colour's lightness (−1..1) for shading variants. */
export function shade(color: THREE.ColorRepresentation, dl: number): THREE.Color {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + dl)));
}

/** Deterministic pseudo-random for decoration jitter (render-only, never feeds the sim). */
export function jitter(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Smooth value noise in 0..1 (render-only): broad patches for ground colour and flower meadows. */
export function noise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => jitter(a * 73.1 + b * 157.3);
  const top = h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx;
  const bot = h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx;
  return top * (1 - sy) + bot * sy;
}
