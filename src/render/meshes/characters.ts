// Characters built from simple parts. Limbs are separate meshes so they can swing; everything else is merged.
// Silhouettes differ by height, build, hair style and accessories (data/villagers.ts appearance).
import * as THREE from 'three';
import type { Appearance } from '../../data/types';
import { vertexMat } from '../materials';
import { ball, box, cone, cyl, merge, shade, sphere, torus, type Part } from './kit';

/** Soft round blob under a character (a shared radial-gradient texture, made on first use in the browser). */
let blobTexture: THREE.Texture | null = null;
function blobShadow(radius: number): THREE.Mesh {
  if (!blobTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(40,24,40,0.55)');
    grad.addColorStop(0.6, 'rgba(40,24,40,0.2)');
    grad.addColorStop(1, 'rgba(40,24,40,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    blobTexture = new THREE.CanvasTexture(c);
    blobTexture.colorSpace = THREE.SRGBColorSpace;
  }
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false }));
  m.position.y = 0.03;
  m.renderOrder = 2;
  return m;
}

export interface CharacterRig {
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  head: THREE.Object3D;
  /** hand-held tool anchor (child of armR) */
  hand: THREE.Group;
  height: number;
}

const BUILD_W: Record<Appearance['build'], number> = { slim: 0.3, average: 0.36, broad: 0.46, round: 0.44 };

function mesh(parts: Part[]): THREE.Mesh {
  const m = new THREE.Mesh(merge(parts), vertexMat);
  m.castShadow = true;
  return m;
}

/** Chibi proportions: a big head, a short body and stubby legs read as friendly at the game's camera distance. */
export function buildCharacter(a: Appearance, withShadow = true): CharacterRig {
  const H = a.height;
  const legH = H * 0.34;
  const torsoH = H * 0.3;
  const headR = H * 0.15;
  const bw = BUILD_W[a.build];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  if (withShadow) root.add(blobShadow(bw * 1.25));

  // Legs pivot at the hip.
  const mkLeg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * bw * 0.25, legH, 0);
    const legW = a.build === 'slim' ? 0.09 : 0.11;
    const m = mesh([box(legW, legH - 0.08, legW * 1.1, a.bottom, { y: -legH + 0.08 }), box(legW * 1.1, 0.08, legW * 1.6, a.shoes, { y: -legH, z: 0.03 })]);
    pivot.add(m);
    body.add(pivot);
    return pivot;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  // Torso
  const torso: Part[] = [];
  if (a.build === 'round') torso.push(sphere(bw * 0.62, a.top, { y: legH + torsoH * 0.45, sy: 1.1 }, 10, 8));
  else torso.push(box(bw, torsoH, bw * 0.6, a.top, { y: legH }));
  torso.push(box(bw * 0.92, 0.07, bw * 0.62, shade(a.bottom, -0.1), { y: legH - 0.02 }));
  if (a.accessories.includes('apron')) torso.push(box(bw * 0.8, torsoH * 0.9 + legH * 0.35, 0.03, a.accent, { y: legH - legH * 0.35, z: bw * 0.31 + (a.build === 'round' ? 0.06 : 0) }));
  if (a.accessories.includes('scarf')) torso.push(torus(bw * 0.38, 0.05, a.accent, { y: legH + torsoH - 0.02, rx: Math.PI / 2 }, 5, 10), box(0.08, 0.28, 0.04, a.accent, { x: 0.08, y: legH + torsoH - 0.3, z: bw * 0.33 }));
  if (a.accessories.includes('cloak')) torso.push(box(bw * 1.15, torsoH + legH * 0.6, 0.05, a.accent, { y: legH * 0.4, z: -bw * 0.34 }));
  if (a.accessories.includes('satchel')) torso.push(box(0.18, 0.16, 0.08, a.accent, { x: -bw * 0.55, y: legH + 0.02, z: 0.04 }), box(0.03, 0.03, 0.03, a.accent, { x: 0, y: legH + torsoH * 0.5 }));
  body.add(mesh(torso));

  // Arms pivot at the shoulder.
  const mkArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (bw / 2 + 0.05), legH + torsoH - 0.05, 0);
    const armL = torsoH * 1.05;
    pivot.add(mesh([box(0.08, armL, 0.09, a.top, { y: -armL }), ball(0.05, a.skin, { y: -armL - 0.03 }, 0)]));
    body.add(pivot);
    return pivot;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  const hand = new THREE.Group();
  hand.position.set(0, -torsoH * 1.05 - 0.04, 0.02);
  armR.add(hand);

  // Head
  const head = new THREE.Group();
  head.position.set(0, legH + torsoH + 0.04, 0);
  const hp: Part[] = [box(0.08, 0.06, 0.08, a.skin), sphere(headR, a.skin, { y: headR + 0.04 }, 10, 8)];
  const hy = headR + 0.04;
  // eyes and cheeks
  for (const s of [-1, 1]) {
    hp.push(ball(headR * 0.13, '#2a2018', { x: s * headR * 0.38, y: hy, z: headR * 0.88, sz: 0.6 }, 0));
    hp.push(ball(headR * 0.05, '#ffffff', { x: s * headR * 0.38 + headR * 0.04, y: hy + headR * 0.06, z: headR * 0.96 }, 0));
    hp.push(ball(headR * 0.16, '#f4a0a0', { x: s * headR * 0.66, y: hy - headR * 0.3, z: headR * 0.72, sz: 0.5 }, 0));
  }
  switch (a.hairStyle) {
    case 'short':
      hp.push(sphere(headR * 1.06, a.hair, { y: hy + headR * 0.18, sy: 0.75, z: -0.01 }, 10, 6));
      break;
    case 'tuft':
      hp.push(sphere(headR * 1.05, a.hair, { y: hy + headR * 0.2, sy: 0.7, z: -0.02 }, 10, 6), cone(0.05, 0.12, a.hair, { y: hy + headR * 0.85, rz: 0.3 }, 5));
      break;
    case 'bun':
      hp.push(sphere(headR * 1.06, a.hair, { y: hy + headR * 0.15, sy: 0.8, z: -0.02 }, 10, 6), sphere(headR * 0.5, a.hair, { y: hy + headR * 0.95, z: -headR * 0.35 }, 8, 6));
      break;
    case 'long':
      hp.push(sphere(headR * 1.08, a.hair, { y: hy + headR * 0.12, sy: 0.85, z: -0.02 }, 10, 6), box(headR * 2.0, headR * 2.3, headR * 0.9, a.hair, { y: hy - headR * 1.9, z: -headR * 0.45 }));
      break;
    case 'braids':
      hp.push(sphere(headR * 1.06, a.hair, { y: hy + headR * 0.15, sy: 0.8, z: -0.02 }, 10, 6));
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) hp.push(ball(headR * 0.28, a.hair, { x: s * headR * 0.85, y: hy - headR * (0.5 + k * 0.45), z: -headR * 0.1 }, 0));
      break;
    case 'curly':
      for (let k = 0; k < 9; k++) {
        const ang = (k / 9) * Math.PI * 2;
        hp.push(ball(headR * 0.42, a.hair, { x: Math.cos(ang) * headR * 0.75, y: hy + headR * 0.45 + Math.sin(k * 1.7) * 0.02, z: Math.sin(ang) * headR * 0.75 - 0.02 }, 0));
      }
      hp.push(ball(headR * 0.55, a.hair, { y: hy + headR * 0.85 }, 0));
      break;
    case 'bald':
      hp.push(sphere(headR * 1.02, a.hair, { y: hy - headR * 0.1, sy: 0.6, z: -headR * 0.15 }, 10, 6));
      break;
  }
  if (a.accessories.includes('glasses') || a.accessories.includes('goggles')) {
    const goggles = a.accessories.includes('goggles');
    const gy = goggles ? hy + headR * 0.75 : hy + 0.01;
    for (const s of [-1, 1]) hp.push(torus(goggles ? 0.04 : 0.03, 0.008, goggles ? '#c8a050' : '#3a3030', { x: s * headR * 0.38, y: gy, z: headR * 0.92 }, 4, 10));
    if (goggles) hp.push(torus(headR * 1.02, 0.012, '#5a3a24', { y: gy, rx: Math.PI / 2 }, 4, 16));
  }
  if (a.accessories.includes('rainhat')) hp.push(cyl(headR * 1.6, headR * 1.6, 0.03, a.accent, { y: hy + headR * 0.55 }, 12), cyl(headR * 0.85, headR * 1.05, headR * 0.7, a.accent, { y: hy + headR * 0.55 }, 10));
  if (a.accessories.includes('flatcap')) hp.push(cyl(headR * 1.05, headR * 1.08, headR * 0.35, a.accent, { y: hy + headR * 0.55 }, 10), box(headR * 1.4, 0.025, headR * 0.8, shade(a.accent, -0.1), { y: hy + headR * 0.58, z: headR * 0.8 }));
  if (a.accessories.includes('strawhat')) hp.push(cyl(headR * 1.7, headR * 1.7, 0.025, '#e8c870', { y: hy + headR * 0.55 }, 14), cyl(headR * 0.9, headR * 1.0, headR * 0.6, '#e8c870', { y: hy + headR * 0.5 }, 10), torus(headR * 0.98, 0.015, a.accent, { y: hy + headR * 0.62, rx: Math.PI / 2 }, 4, 12));
  if (a.accessories.includes('headscarf')) hp.push(sphere(headR * 1.12, a.accent, { y: hy + headR * 0.25, sy: 0.75, z: -0.015 }, 10, 6), ball(headR * 0.3, a.accent, { y: hy + headR * 0.2, z: -headR * 1.05 }, 0));
  head.add(mesh(hp));
  body.add(head);

  if (a.accessories.includes('clipboard')) {
    const cb = mesh([box(0.2, 0.26, 0.02, '#a87a4a'), box(0.16, 0.2, 0.025, '#f4f0e4', { y: 0.03 })]);
    cb.position.set(0, -0.02, 0.08);
    cb.rotation.x = -0.6;
    armL.add(cb);
    cb.position.y = -torsoH;
  }
  // soft contact shadow is handled by the renderer's shadow map
  return { root, body, legL, legR, armL, armR, head, hand, height: H };
}

/**
 * Walk cycle and idle breathing. `phase` is in radians; `move` is 0..1 and blends smoothly between standing
 * and walking (the caller eases it, so starting and stopping never pop). The body squashes and stretches a
 * little with each step, which is most of what makes it look bouncy rather than stiff.
 */
export function animateCharacter(r: CharacterRig, phase: number, move: number, swing: number): void {
  const amp = 0.6 * move;
  const s = Math.sin(phase);
  r.legL.rotation.x = s * amp;
  r.legR.rotation.x = -s * amp;
  r.armL.rotation.x = -s * amp * 0.8;
  r.armR.rotation.x = swing > 0 ? -2.2 + (1 - swing) * 2.6 : s * amp * 0.8;
  const hop = Math.abs(s);
  const breathe = Math.sin(phase * 0.5) * (1 - move);
  r.body.position.y = hop * 0.07 * move + breathe * 0.01;
  // Stretch on the way up, squash on landing; volume stays about constant.
  const sy = 1 + (hop - 0.5) * 0.08 * move + breathe * 0.012;
  r.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  r.body.rotation.x = 0.1 * move;
  r.head.rotation.z = s * 0.06 * move;
  r.head.rotation.x = -0.05 * move;
}

export const PLAYER_LOOK: Appearance = {
  height: 1.6,
  build: 'average',
  skin: '#e8b890',
  hair: '#5a3a24',
  hairStyle: 'short',
  top: '#4f7fbf',
  bottom: '#5a4a3a',
  shoes: '#3a2a20',
  accessories: ['strawhat'],
  accent: '#c84a3a',
};
