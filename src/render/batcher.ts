// Instance batcher: collect (geometry, matrix, colour) records, then sync one InstancedMesh per geometry.
// Layers call begin(), add() for every visible thing, then end(). Capacity grows in powers of two.
import * as THREE from 'three';
import { vertexMat } from './materials';

interface Bucket {
  geo: THREE.BufferGeometry;
  mesh: THREE.InstancedMesh | null;
  matrices: Float32Array;
  colors: Float32Array;
  n: number;
}

const WHITE = new THREE.Color(1, 1, 1);

export class Batcher {
  readonly group = new THREE.Group();
  private readonly buckets = new Map<THREE.BufferGeometry, Bucket>();

  constructor(
    private readonly material: THREE.Material = vertexMat,
    private readonly shadows: { cast: boolean; receive: boolean } = { cast: true, receive: true },
  ) {}

  begin(): void {
    for (const b of this.buckets.values()) b.n = 0;
  }

  add(geo: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.Color = WHITE): void {
    let b = this.buckets.get(geo);
    if (!b) {
      b = { geo, mesh: null, matrices: new Float32Array(16 * 16), colors: new Float32Array(3 * 16), n: 0 };
      this.buckets.set(geo, b);
    }
    if ((b.n + 1) * 16 > b.matrices.length) {
      const mm = new Float32Array(b.matrices.length * 2);
      mm.set(b.matrices);
      b.matrices = mm;
      const cc = new Float32Array(b.colors.length * 2);
      cc.set(b.colors);
      b.colors = cc;
    }
    m.toArray(b.matrices, b.n * 16);
    b.colors[b.n * 3] = color.r;
    b.colors[b.n * 3 + 1] = color.g;
    b.colors[b.n * 3 + 2] = color.b;
    b.n++;
  }

  end(): void {
    for (const b of this.buckets.values()) {
      const cap = b.matrices.length / 16;
      if (!b.mesh || b.mesh.instanceMatrix.count < cap) {
        if (b.mesh) {
          this.group.remove(b.mesh);
          b.mesh.dispose();
        }
        if (b.n === 0) {
          b.mesh = null;
          continue;
        }
        b.mesh = new THREE.InstancedMesh(b.geo, this.material, cap);
        b.mesh.castShadow = this.shadows.cast;
        b.mesh.receiveShadow = this.shadows.receive;
        b.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
        b.mesh.frustumCulled = false;
        this.group.add(b.mesh);
      }
      const mesh = b.mesh;
      (mesh.instanceMatrix.array as Float32Array).set(b.matrices.subarray(0, b.n * 16));
      (mesh.instanceColor!.array as Float32Array).set(b.colors.subarray(0, b.n * 3));
      mesh.count = b.n;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const b of this.buckets.values()) b.mesh?.dispose();
    this.buckets.clear();
    this.group.clear();
  }
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

/** Matrix for a thing on tile (x, y) with yaw rotation and uniform/height scale. */
export function tileMatrix(x: number, y: number, h = 0, rotY = 0, scale = 1, sy = scale): THREE.Matrix4 {
  tmpP.set(x, h, y);
  tmpQ.setFromAxisAngle(Y, rotY);
  tmpS.set(scale, sy, scale);
  return tmpM.compose(tmpP, tmpQ, tmpS);
}
