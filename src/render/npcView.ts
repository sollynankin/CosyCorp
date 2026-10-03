// Villagers in the 3D view. Positions come from the sim's pure schedule function evaluated at the current
// minute plus the tick fraction, so walking is smooth. Render-only: facing easing and walk phase.
import * as THREE from 'three';
import { TICKS_PER_MINUTE } from '../data/balance';
import { getVillager, VILLAGERS } from '../data';
import { simMinute, villagersOn, type NpcPos } from '../sim';
import type { GameState } from '../sim/state';
import { animateCharacter, buildCharacter, type CharacterRig } from './meshes/characters';
import { damp, dampAngle, FACING_YAW } from './motion';

export class NpcView {
  readonly group = new THREE.Group();
  private readonly rigs = new Map<string, CharacterRig>();
  private readonly phase = new Map<string, number>();
  /** 0..1 walking blend per villager, eased so they start and stop smoothly */
  private readonly move = new Map<string, number>();
  private readonly shown = new Map<string, { x: number; y: number }>();
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
    // A villager who was out of sight reappears where they are, not sliding in from where they vanished.
    const seen = new Set(this.visible.map((p) => p.id));
    for (const id of [...this.shown.keys()]) if (!seen.has(id)) this.shown.delete(id);
    for (const p of this.visible) {
      const rig = this.rigs.get(p.id)!;
      rig.root.visible = true;
      // Ease the drawn position a touch so the step between schedule samples never shows.
      const prev = this.shown.get(p.id);
      const jump = !prev || Math.hypot(prev.x - p.x, prev.y - p.y) > 2;
      const pos = jump ? { x: p.x, y: p.y } : { x: damp(prev.x, p.x, 25, dt), y: damp(prev.y, p.y, 25, dt) };
      this.shown.set(p.id, pos);
      rig.root.position.set(pos.x, 0, pos.y);
      rig.root.rotation.y = dampAngle(rig.root.rotation.y, FACING_YAW[p.facing], 10, dt);
      const mv = damp(this.move.get(p.id) ?? 0, p.moving ? 1 : 0, 10, dt);
      this.move.set(p.id, mv);
      const ph = (this.phase.get(p.id) ?? 0) + dt * (2 + 7 * mv);
      this.phase.set(p.id, ph);
      animateCharacter(rig, ph, mv, 0);
    }
  }

  /** World position of a villager's head (for name tags). */
  headOf(id: string): THREE.Vector3 | null {
    const rig = this.rigs.get(id);
    if (!rig || !rig.root.visible) return null;
    return new THREE.Vector3(rig.root.position.x, getVillager(id).appearance.height + 0.35, rig.root.position.z);
  }
}
