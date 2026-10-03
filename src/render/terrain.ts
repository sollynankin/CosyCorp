// Ground for a map: one instanced box per tile (single draw call), water surfaces with a gentle wave, and
// grass tufts. Rebuilt on map change and season change.
import * as THREE from 'three';
import type { SeasonId } from '../data/types';
import type { ParsedMap } from '../world';
import { jitter, merge, leaf, type Part } from './meshes/kit';
import { terrainColor } from './palette';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
unitBox.translate(0, -0.5, 0);
const groundMat = new THREE.MeshStandardMaterial({ roughness: 1 });

/** Top height of each terrain (metres). */
export function terrainTop(t: string): number {
  switch (t) {
    case 'water':
    case 'lake':
    case 'boards':
      return -0.42;
    case 'cliff':
      return 1.1;
    case 'path':
      return -0.02;
    case 'minefloor':
      return 0;
    default:
      return 0;
  }
}

export interface TerrainView {
  group: THREE.Group;
  water: THREE.Mesh | null;
  update(time: number): void;
  dispose(): void;
}

let waterShader: { uniforms: { uTime: { value: number } } } | null = null;
const waterMat = new THREE.MeshStandardMaterial({ color: '#5cb8e4', transparent: true, opacity: 0.8, roughness: 0.25, metalness: 0.1 });
waterMat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vec4 wp = modelMatrix * vec4(transformed, 1.0);
       transformed.y += sin(wp.x * 1.7 + uTime * 1.3) * 0.03 + cos(wp.z * 2.1 + uTime * 0.9) * 0.03;`,
    );
  waterShader = shader as unknown as { uniforms: { uTime: { value: number } } };
};

const tuftGeo = (() => {
  const parts: Part[] = [];
  for (let k = 0; k < 5; k++) parts.push(leaf(0.16, k % 2 ? '#f4f4f4' : '#dcdcdc', { ry: (k / 5) * Math.PI * 2, rx: -1.15 }));
  return merge(parts);
})();
const tuftMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });

export function buildTerrain(m: ParsedMap, season: SeasonId, quality: number): TerrainView {
  const group = new THREE.Group();
  const n = m.w * m.h;
  const ground = new THREE.InstancedMesh(unitBox, groundMat, n);
  ground.receiveShadow = true;
  ground.castShadow = false;
  const mtx = new THREE.Matrix4();
  const col = new THREE.Color();
  const waterTiles: number[] = [];
  let k = 0;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x;
      const t = m.terrain[i];
      const top = terrainTop(t);
      const depth = t === 'cliff' ? 1.6 : 0.6;
      mtx.makeScale(1, depth + top + 0.5, 1);
      mtx.setPosition(x + 0.5, top, y + 0.5);
      ground.setMatrixAt(k, mtx);
      const alt = ((x + y) & 1) === 0;
      col.set(terrainColor(t, season, alt));
      const j = (jitter(i * 3.1 + m.w) - 0.5) * 0.045;
      col.offsetHSL(0, 0, j);
      if (t === 'water' || t === 'lake' || t === 'boards') col.set('#2a4a5a');
      ground.setColorAt(k, col);
      k++;
      if (t === 'water' || t === 'lake' || t === 'boards') waterTiles.push(i);
    }
  }
  group.add(ground);

  // Boards (bridges and docks) sit over water: plank decks on posts.
  const boards: Part[] = [];
  let water: THREE.Mesh | null = null;
  if (waterTiles.length) {
    const g = new THREE.PlaneGeometry(1, 1, 3, 3);
    g.rotateX(-Math.PI / 2);
    const geos: THREE.BufferGeometry[] = [];
    for (const i of waterTiles) {
      const x = i % m.w;
      const y = (i - x) / m.w;
      const q = g.clone();
      q.translate(x + 0.5, -0.14, y + 0.5);
      geos.push(q);
      if (m.terrain[i] === 'boards') {
        boards.push({ geo: new THREE.BoxGeometry(1, 0.1, 1).translate(x + 0.5, 0.0, y + 0.5), color: '#9a6c42' });
        for (let p = 0; p < 3; p++) boards.push({ geo: new THREE.BoxGeometry(0.04, 0.02, 1.0).translate(x + 0.2 + p * 0.3, 0.06, y + 0.5), color: '#7a5034' });
      }
    }
    const merged = mergeGeos(geos);
    water = new THREE.Mesh(merged, waterMat);
    water.receiveShadow = true;
    group.add(water);
  }
  // Treat boards as part of the ground; their terrain box top is at the water bed, so add deck meshes.
  if (boards.length) {
    const deck = new THREE.Mesh(merge(boards), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);
  }

  // Grass tufts for texture (count scales with quality).
  const density = [0, 0.25, 0.5][quality] ?? 0.25;
  if (density > 0 && season !== 'winter') {
    const tiles: number[] = [];
    for (let i = 0; i < n; i++) if (m.terrain[i] === 'grass' && !m.decor[i] && m.buildingAt[i] < 0 && jitter(i * 7.7) < density) tiles.push(i);
    const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, tiles.length);
    tiles.forEach((i, k2) => {
      const x = i % m.w;
      const y = (i - x) / m.w;
      mtx.makeRotationY(jitter(i) * 6.28);
      mtx.setPosition(x + 0.2 + jitter(i * 1.3) * 0.6, 0, y + 0.2 + jitter(i * 2.3) * 0.6);
      tufts.setMatrixAt(k2, mtx);
      col.set(terrainColor('grass', season, false)).offsetHSL(0, 0.05, -0.08 + jitter(i * 5) * 0.06);
      tufts.setColorAt(k2, col);
    });
    tufts.receiveShadow = true;
    group.add(tufts);
  }

  return {
    group,
    water,
    update(time: number) {
      if (waterShader) waterShader.uniforms.uTime.value = time;
    },
    dispose() {
      ground.dispose();
      group.traverse((o) => {
        if (o instanceof THREE.Mesh && o !== ground && o.geometry !== tuftGeo) o.geometry.dispose();
      });
    },
  };
}

function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const g of geos) {
    const ng = g.index ? g.toNonIndexed() : g;
    ng.computeVertexNormals();
    const p = ng.getAttribute('position');
    const nn = ng.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(nn.getX(i), nn.getY(i), nn.getZ(i));
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
