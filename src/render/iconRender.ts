// Item icons for machines, rendered from their real 3D meshes with a small offscreen renderer, so the
// backpack and build bar show exactly what will stand on the farm. One shared WebGL context, created lazily.
import * as THREE from 'three';
import { vertexMat } from './materials';
import { machineMesh } from './meshes/machines';
import { buildCharacter } from './meshes/characters';
import type { Appearance } from '../data/types';

const SIZE = 96;
let gl: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene;
let cam: THREE.OrthographicCamera;
const cache = new Map<string, string>();

function setup(): void {
  gl = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  gl.setSize(SIZE, SIZE, false);
  gl.setClearColor(0x000000, 0);
  gl.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff8ec', '#6a5a4a', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(2, 4, -3);
  scene.add(sun);
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
}

/** Data URL of a machine's icon (front-three-quarter view). */
export function machineIconUrl(type: string): string {
  const hit = cache.get(type);
  if (hit) return hit;
  if (!gl) setup();
  const mm = machineMesh(type);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(mm.body, vertexMat));
  if (mm.spin) {
    const s = new THREE.Mesh(mm.spin.geo, vertexMat);
    s.position.set(...mm.spin.pivot);
    group.add(s);
  }
  scene.add(group);
  const box = new THREE.Box3().setFromObject(group);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length() * 0.5;
  cam.left = -size;
  cam.right = size;
  cam.top = size;
  cam.bottom = -size;
  cam.position.copy(centre).add(new THREE.Vector3(1.3, 1.1, -1.6).normalize().multiplyScalar(10));
  cam.lookAt(centre);
  cam.updateProjectionMatrix();
  gl!.render(scene, cam);
  const url = gl!.domElement.toDataURL();
  scene.remove(group);
  cache.set(type, url);
  return url;
}

const portraits = new Map<string, string>();
let pcam: THREE.PerspectiveCamera | null = null;

/** Head-and-shoulders portrait of a character, rendered once and cached by key. */
export function portraitUrl(key: string, look: Appearance): string {
  const hit = portraits.get(key);
  if (hit) return hit;
  if (!gl) setup();
  pcam ??= new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  const rig = buildCharacter(look);
  scene.add(rig.root);
  const h = look.height;
  pcam.position.set(0.35, h * 0.86, 1.9);
  pcam.lookAt(0, h * 0.8, 0);
  gl!.render(scene, pcam);
  const url = gl!.domElement.toDataURL();
  scene.remove(rig.root);
  portraits.set(key, url);
  return url;
}
