// Angled 3/4 camera that follows a target, rotates in 90° steps with easing, and zooms.
import * as THREE from 'three';

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  /** 0..3 quarter turns; 0 = looking north */
  quarter = 0;
  private yaw = 0;
  distance = 24;
  readonly minDist = 10;
  readonly maxDist = 34;
  readonly pitch = (52 * Math.PI) / 180;
  readonly target = new THREE.Vector3();
  private readonly ray = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(30, aspect, 0.5, 200);
  }

  rotate(steps: number): void {
    this.quarter = (this.quarter + steps + 4) % 4;
  }

  zoom(delta: number): void {
    this.distance = Math.max(this.minDist, Math.min(this.maxDist, this.distance * (1 + delta)));
  }

  /** Current yaw in radians (eased). */
  get yawAngle(): number {
    return this.yaw;
  }

  update(focus: THREE.Vector3, dt: number): void {
    // ease target and yaw (shortest arc)
    const goal = this.quarter * (Math.PI / 2);
    let d = goal - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * 8);
    this.target.lerp(focus, Math.min(1, dt * 6));
    const horiz = Math.cos(this.pitch) * this.distance;
    const off = new THREE.Vector3(Math.sin(this.yaw) * horiz, Math.sin(this.pitch) * this.distance, Math.cos(this.yaw) * horiz);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
  }

  snap(focus: THREE.Vector3): void {
    this.target.copy(focus);
    this.yaw = this.quarter * (Math.PI / 2);
    this.update(focus, 0);
  }

  /** Screen point (NDC) to ground position, or null if the ray misses. */
  groundAt(ndcX: number, ndcY: number, height = 0): THREE.Vector3 | null {
    this.ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    this.ground.constant = -height;
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.ground, p) ? p : null;
  }

  /** Rotate a screen-space input vector (x right, y down) into map axes for the current yaw. */
  inputToMap(ix: number, iy: number): [number, number] {
    const c = Math.cos(this.quarter * (Math.PI / 2));
    const s = Math.sin(this.quarter * (Math.PI / 2));
    // At yaw 0, screen right = +x, screen down = +y (south). Rotating the camera by yaw rotates both.
    return [ix * c + iy * s, -ix * s + iy * c];
  }
}
