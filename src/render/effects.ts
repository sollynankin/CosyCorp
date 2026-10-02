// Short-lived visual effects driven by sim fx events (dust puffs, splashes, chips). Render-only.
import * as THREE from 'three';

interface Puff {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  max: number;
  map: string;
}

const FX_COLORS: Record<string, string[]> = {
  till: ['#8a6040', '#a07850'],
  water: ['#8ac8f0', '#c8e8ff'],
  harvest: ['#8fd066', '#f4e8a0'],
  chop: ['#c89a62', '#8a6440'],
  mine: ['#a8a8a0', '#787870'],
  splash: ['#8ac8f0', '#ffffff'],
  poof: ['#d8d0e0', '#ffffff'],
  plant: ['#6a4a2e', '#8fd066'],
  place: ['#f4e8c0', '#ffffff'],
  sparkle: ['#fff4a0', '#ffd860'],
};

const geo = new THREE.IcosahedronGeometry(0.06, 0);

export class Effects {
  private readonly puffs: Puff[] = [];
  private readonly mats = new Map<string, THREE.MeshBasicMaterial>();

  constructor(private readonly scene: THREE.Scene) {}

  private matFor(c: string): THREE.MeshBasicMaterial {
    let m = this.mats.get(c);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: c, transparent: true });
      this.mats.set(c, m);
    }
    return m;
  }

  spawn(fx: string, map: string, x: number, y: number): void {
    const cols = FX_COLORS[fx] ?? FX_COLORS.place;
    const n = fx === 'sparkle' ? 14 : 9;
    for (let k = 0; k < n; k++) {
      const mesh = new THREE.Mesh(geo, this.matFor(cols[k % cols.length]).clone());
      mesh.position.set(x + 0.5 + (Math.random() - 0.5) * 0.4, 0.15, y + 0.5 + (Math.random() - 0.5) * 0.4);
      const up = fx === 'water' || fx === 'splash' ? 2.2 : 1.6;
      const vel = new THREE.Vector3((Math.random() - 0.5) * 1.6, up * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * 1.6);
      this.scene.add(mesh);
      this.puffs.push({ mesh, vel, life: 0, max: 0.5 + Math.random() * 0.3, map });
    }
  }

  update(dt: number, map: string): void {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life += dt;
      p.vel.y -= 6 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const t = p.life / p.max;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      p.mesh.visible = p.map === map;
      if (t >= 1) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.puffs.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.puffs) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.puffs.length = 0;
  }
}
