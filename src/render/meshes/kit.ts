// Procedural mesh kit. Builders describe a thing as coloured primitive parts; merge() bakes them into one
// non-indexed BufferGeometry with per-vertex colours, so a whole crop, tree or machine is one draw call and
// can be instanced. All sizes are metres (1 tile = 1 m), origin at the tile centre on the ground.
import * as THREE from 'three';

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

/** Box whose bottom sits at y (not centred), so stacking reads naturally. */
export function box(w: number, h: number, d: number, color: THREE.ColorRepresentation, t: Xform = {}): Part {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return { geo: xf(g, t), color };
}

/** Cylinder (or cone/frustum) with its bottom at y. */
export function cyl(rTop: number, rBot: number, h: number, color: THREE.ColorRepresentation, t: Xform = {}, seg = 8): Part {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  g.translate(0, h / 2, 0);
  return { geo: xf(g, t), color };
}

export function cone(r: number, h: number, color: THREE.ColorRepresentation, t: Xform = {}, seg = 8): Part {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(0, h / 2, 0);
  return { geo: xf(g, t), color };
}

/** Low-poly ball centred at (x, y, z). detail 0 = icosahedron. */
export function ball(r: number, color: THREE.ColorRepresentation, t: Xform = {}, detail = 0): Part {
  return { geo: xf(new THREE.IcosahedronGeometry(r, detail), t), color };
}

export function sphere(r: number, color: THREE.ColorRepresentation, t: Xform = {}, ws = 8, hs = 6): Part {
  return { geo: xf(new THREE.SphereGeometry(r, ws, hs), t), color };
}

export function torus(r: number, tube: number, color: THREE.ColorRepresentation, t: Xform = {}, rs = 6, ts = 12): Part {
  return { geo: xf(new THREE.TorusGeometry(r, tube, rs, ts), t), color };
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
  g.scale(len * 0.35, len * 0.08, len);
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
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2);
  g.rotateY(Math.PI / 2);
  return { geo: xf(g, t), color };
}

/** Merge parts into one geometry with a `color` attribute (flat-shaded friendly, non-indexed). */
export function merge(parts: Part[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    g.computeVertexNormals();
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
