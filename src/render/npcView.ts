// Villagers in the 3D view. Positions come from the sim's pure schedule function evaluated at the current
// minute plus the tick fraction, so walking is smooth. Render-only: facing easing and walk phase.
import * as THREE from 'three';
import { TICKS_PER_MINUTE } from '../data/balance';
import { getVillager, VILLAGERS } from '../data';
import { simMinute, villagersOn, type NpcPos } from '../sim';
import type { GameState } from '../sim/state';
import { animateCharacter, buildCharacter, type CharacterRig } from './meshes/characters';

const YAW = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];

export class NpcView {
  readonly group = new THREE.Group();
  private readonly rigs = new Map<string, CharacterRig>();
  private readonly phase = new Map<string, number>();
  /** villagers drawn this frame (for name tags) */
  visible: NpcPos[] = [];

  constructor() {
    for (const v of VILLAGERS) {
      const rig = buildCharacter(v.appearance);
      rig.root.visible = false;
      this.rigs.set(v.id, rig);
      this.group.add(rig.root);
    }
  }

  update(state: GameState, tickAlpha: number, dt: number): void {
    const minute = simMinute(state) + tickAlpha / TICKS_PER_MINUTE;
    this.visible = villagersOn(state, state.player.map, minute);
    for (const rig of this.rigs.values()) rig.root.visible = false;
    for (const p of this.visible) {
      const rig = this.rigs.get(p.id)!;
      rig.root.visible = true;
      rig.root.position.set(p.x, 0, p.y);
      let dy = YAW[p.facing] - rig.root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      rig.root.rotation.y += dy * Math.min(1, dt * 10);
      const ph = (this.phase.get(p.id) ?? 0) + dt * (p.moving ? 9 : 2);
      this.phase.set(p.id, ph);
      animateCharacter(rig, ph, p.moving, 0);
    }
  }

  /** World position of a villager's head (for name tags). */
  headOf(id: string): THREE.Vector3 | null {
    const rig = this.rigs.get(id);
    if (!rig || !rig.root.visible) return null;
    return new THREE.Vector3(rig.root.position.x, getVillager(id).appearance.height + 0.35, rig.root.position.z);
  }
}
