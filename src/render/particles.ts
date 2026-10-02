// Ambient particles around the camera target: rain, storm, snow, petals, leaves, fireflies, chimney smoke.
// Counts scale with the quality setting. Render-only (Math.random is fine here).
import * as THREE from 'three';
import type { SeasonId, WeatherId } from '../data/types';

interface Field {
  points: THREE.Points;
  pos: Float32Array;
  vel: Float32Array;
  n: number;
}

function makeField(scene: THREE.Scene, n: number, color: string, size: number, opacity = 0.9, additive = false): Field {
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);
  return { points, pos, vel, n };
}

const R = 16;

export class Particles {
  private readonly rain: Field;
  private readonly snow: Field;
  private readonly petals: Field;
  private readonly leaves: Field;
  private readonly flies: Field;
  private readonly smoke: Field;
  private flash = 0;
  private flashLight: THREE.AmbientLight;

  constructor(private readonly scene: THREE.Scene, quality: number) {
    const k = [0.35, 0.7, 1][quality] ?? 0.7;
    this.rain = makeField(scene, Math.floor(900 * k), '#a8c8e8', 0.07, 0.7);
    this.snow = makeField(scene, Math.floor(600 * k), '#ffffff', 0.12, 0.95);
    this.petals = makeField(scene, Math.floor(120 * k), '#f8c0d8', 0.11, 0.95);
    this.leaves = makeField(scene, Math.floor(160 * k), '#e08a3a', 0.13, 0.95);
    this.flies = makeField(scene, Math.floor(60 * k), '#f8f080', 0.14, 1, true);
    this.smoke = makeField(scene, Math.floor(80 * k), '#d8d4d0', 0.35, 0.35);
    this.flashLight = new THREE.AmbientLight('#e8f0ff', 0);
    scene.add(this.flashLight);
    for (const f of [this.rain, this.snow, this.petals, this.leaves, this.flies]) this.scatter(f, new THREE.Vector3(), true);
  }

  private scatter(f: Field, c: THREE.Vector3, all: boolean, i0 = 0): void {
    for (let i = all ? 0 : i0; i < (all ? f.n : i0 + 1); i++) {
      f.pos[i * 3] = c.x + (Math.random() - 0.5) * R * 2;
      f.pos[i * 3 + 1] = Math.random() * 12;
      f.pos[i * 3 + 2] = c.z + (Math.random() - 0.5) * R * 2;
      f.vel[i * 3] = (Math.random() - 0.5) * 0.6;
      f.vel[i * 3 + 1] = 0;
      f.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    }
  }

  private step(f: Field, dt: number, c: THREE.Vector3, fall: number, wobble: number, t: number, wind = 0): void {
    f.points.visible = true;
    for (let i = 0; i < f.n; i++) {
      const j = i * 3;
      f.pos[j] += (f.vel[j] + wind + Math.sin(t * 1.3 + i) * wobble) * dt;
      f.pos[j + 1] -= fall * dt * (0.8 + (i % 5) * 0.08);
      f.pos[j + 2] += (f.vel[j + 2] + Math.cos(t * 1.1 + i) * wobble) * dt;
      if (f.pos[j + 1] < 0 || Math.abs(f.pos[j] - c.x) > R || Math.abs(f.pos[j + 2] - c.z) > R) {
        this.scatter(f, c, false, i);
        f.pos[j + 1] = 10 + Math.random() * 3;
      }
    }
    (f.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  update(dt: number, c: THREE.Vector3, season: SeasonId, weather: WeatherId, night: number, indoor: boolean, chimneys: THREE.Vector3[], t: number): void {
    for (const f of [this.rain, this.snow, this.petals, this.leaves, this.flies]) f.points.visible = false;
    if (!indoor) {
      if (weather === 'rain' || weather === 'storm') this.step(this.rain, dt, c, weather === 'storm' ? 22 : 16, 0, t, weather === 'storm' ? 4 : 0.5);
      if (weather === 'snow') this.step(this.snow, dt, c, 1.4, 0.6, t, 0.3);
      if (weather === 'sunny' && season === 'spring') this.step(this.petals, dt, c, 0.7, 0.8, t, 0.4);
      if (weather !== 'snow' && season === 'autumn') this.step(this.leaves, dt, c, 0.9, 1.0, t, 0.6);
      if (season === 'summer' && night > 0.5 && weather === 'sunny') {
        this.flies.points.visible = true;
        for (let i = 0; i < this.flies.n; i++) {
          const j = i * 3;
          if (this.flies.pos[j + 1] > 2.5 || this.flies.pos[j + 1] < 0.2) this.flies.pos[j + 1] = 0.4 + Math.random() * 1.5;
          this.flies.pos[j] += Math.sin(t * 0.7 + i * 1.3) * dt * 0.5;
          this.flies.pos[j + 2] += Math.cos(t * 0.6 + i * 2.1) * dt * 0.5;
          this.flies.pos[j + 1] += Math.sin(t * 1.4 + i) * dt * 0.2;
        }
        (this.flies.points.material as THREE.PointsMaterial).opacity = 0.5 + 0.5 * Math.sin(t * 3);
        (this.flies.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      }
      // Storm lightning: brief ambient flashes.
      if (weather === 'storm') {
        if (this.flash <= 0 && Math.random() < dt * 0.12) this.flash = 0.35;
        this.flash -= dt;
        this.flashLight.intensity = this.flash > 0 ? (Math.sin(this.flash * 40) > 0 ? 2.2 : 0.6) : 0;
      } else this.flashLight.intensity = 0;
    } else this.flashLight.intensity = 0;
    // Chimney smoke rises from the nearest chimneys (lamps are below y 1.95 and skipped).
    const stacks = chimneys.filter((p) => p.y >= 1.95);
    this.smoke.points.visible = stacks.length > 0;
    if (stacks.length) {
      for (let i = 0; i < this.smoke.n; i++) {
        const j = i * 3;
        const s = stacks[i % stacks.length];
        if (this.smoke.vel[j + 1] <= 0 || this.smoke.pos[j + 1] > s.y + 3) {
          this.smoke.pos[j] = s.x;
          this.smoke.pos[j + 1] = s.y + Math.random() * 3;
          this.smoke.pos[j + 2] = s.z;
          this.smoke.vel[j + 1] = 0.5 + Math.random() * 0.3;
        }
        this.smoke.pos[j] += (0.25 + Math.sin(t + i) * 0.1) * dt;
        this.smoke.pos[j + 1] += this.smoke.vel[j + 1] * dt;
      }
      (this.smoke.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  dispose(): void {
    for (const f of [this.rain, this.snow, this.petals, this.leaves, this.flies, this.smoke]) {
      this.scene.remove(f.points);
      f.points.geometry.dispose();
      (f.points.material as THREE.Material).dispose();
    }
    this.scene.remove(this.flashLight);
  }
}
