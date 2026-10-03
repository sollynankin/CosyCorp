// The 3D view. Reads game state only (CLAUDE.md rule 2); render-only state (camera, particles, animation
// phases, interpolation) lives here.
import * as THREE from 'three';
import { getItem } from '../data';
import { seasonOf } from '../sim/calendar';
import type { GameState } from '../sim/state';
import { getMapDef } from '../world';
import { CameraRig } from './camera';
import { Effects } from './effects';
import { glowMat } from './materials';
import { MapView } from './mapView';
import { animateCharacter, buildCharacter, PLAYER_LOOK, type CharacterRig } from './meshes/characters';
import { toolGeometry } from './meshes/items';
import { vertexMat } from './materials';
import { lightAt } from './palette';
import { Particles } from './particles';
import { computePower, contextKey, type PowerInfo } from '../sim';
import { getMachine } from '../data';
import type { Dir } from '../data/types';
import { FlowOverlay } from './flowOverlay';
import { MachineView, yawFor } from './machineView';
import { NpcView } from './npcView';
import { AnimalView } from './animalView';
import { ghostMat } from './materials';
import { arrowGeo, machineMesh } from './meshes/machines';

export type Quality = 0 | 1 | 2;

export interface Interp {
  /** previous and current player positions for interpolation */
  px0: number;
  py0: number;
  px1: number;
  py1: number;
  alpha: number;
}

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  private readonly hemi = new THREE.HemisphereLight('#ffffff', '#5a4a3a', 1);
  private readonly sun = new THREE.DirectionalLight('#ffffff', 2);
  private readonly lantern = new THREE.PointLight('#ffc070', 0, 9, 1.6);
  private mapView: MapView | null = null;
  private readonly player: CharacterRig;
  private readonly heldTool = new THREE.Mesh(undefined, vertexMat);
  private readonly cursor: THREE.Mesh;
  readonly effects: Effects;
  private particles: Particles;
  private walkPhase = 0;
  private time = 0;
  quality: Quality = 1;
  /** tile under the mouse, set by input */
  hover: { x: number; y: number; ok: boolean } | null = null;
  readonly world = new THREE.Group();
  readonly machines = new MachineView();
  readonly flow = new FlowOverlay();
  readonly npcs = new NpcView();
  readonly animals = new AnimalView();
  /** build ghost: a machine preview under the cursor */
  ghost: { type: string; x: number; y: number; dir: Dir; ok: boolean } | null = null;
  private readonly ghostBody = new THREE.Mesh(undefined, ghostMat);
  private readonly bobber = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: '#e84a3a', roughness: 0.5 }));
  private readonly lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  private readonly fishLine = new THREE.Line(this.lineGeo, new THREE.LineBasicMaterial({ color: '#f4f0e0' }));

  /** Fishing: a bobber on the water (it dips when a fish bites) and a line from the rod. */
  private drawLine(state: GameState): void {
    const fs = state.player.fishing;
    this.bobber.visible = this.fishLine.visible = !!fs;
    if (!fs) return;
    if (!this.bobber.parent) this.scene.add(this.bobber, this.fishLine);
    const dip = fs.phase === 'reel' ? -0.08 + Math.sin(this.time * 18) * 0.04 : Math.sin(this.time * 3) * 0.02;
    this.bobber.position.set(fs.tx + 0.5, -0.36 + dip, fs.ty + 0.5);
    const tip = new THREE.Vector3(0, -1.5, 0);
    this.heldTool.localToWorld(tip);
    const pos = this.lineGeo.getAttribute('position') as THREE.BufferAttribute;
    pos.setXYZ(0, tip.x, tip.y, tip.z);
    pos.setXYZ(1, this.bobber.position.x, this.bobber.position.y + 0.05, this.bobber.position.z);
    pos.needsUpdate = true;
  }
  private readonly ghostArrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthTest: false }));
  private powerKey = '';
  private powerInfo: PowerInfo | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, quality: Quality) {
    this.quality = quality;
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: quality > 0, powerPreference: 'high-performance' });
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.05;
    this.rig = new CameraRig(1);
    this.scene.add(this.world, this.hemi, this.sun, this.sun.target, this.lantern);
    this.applyQuality();
    this.player = buildCharacter(PLAYER_LOOK);
    this.player.hand.add(this.heldTool);
    this.heldTool.castShadow = true;
    this.scene.add(this.player.root);
    const cg = new THREE.RingGeometry(0.36, 0.48, 4, 1);
    cg.rotateX(-Math.PI / 2);
    cg.rotateY(Math.PI / 4);
    this.cursor = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: '#fff8e0', transparent: true, opacity: 0.85, depthWrite: false }));
    this.cursor.renderOrder = 5;
    this.scene.add(this.cursor);
    this.ghostArrow.renderOrder = 30;
    this.scene.add(this.flow.group, this.ghostBody, this.ghostArrow, this.npcs.group, this.animals.group);
    this.effects = new Effects(this.scene);
    this.particles = new Particles(this.scene, quality);
    this.resize();
  }

  applyQuality(): void {
    const q = this.quality;
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, [1, 1.5, 2][q]));
    this.gl.shadowMap.enabled = q > 0;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.sun.castShadow = q > 0;
    const size = [512, 1024, 2048][q];
    this.sun.shadow.mapSize.set(size, size);
    const cam = this.sun.shadow.camera;
    cam.left = -18;
    cam.right = 18;
    cam.top = 18;
    cam.bottom = -18;
    cam.near = 1;
    cam.far = 80;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.map?.dispose();
    (this.sun.shadow as { map: THREE.WebGLRenderTarget | null }).map = null;
  }

  setQuality(q: Quality): void {
    this.quality = q;
    this.applyQuality();
    this.particles.dispose();
    this.particles = new Particles(this.scene, q);
    this.mapView?.dispose();
    if (this.mapView) this.world.remove(this.mapView.group);
    this.mapView = null;
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.gl.setSize(w, h, false);
    this.rig.camera.aspect = w / h;
    this.rig.camera.updateProjectionMatrix();
  }

  get currentMap(): MapView | null {
    return this.mapView;
  }

  private ensureMap(state: GameState): void {
    if (this.mapView && this.mapView.mapId === state.player.map) return;
    if (this.mapView) {
      this.world.remove(this.mapView.group);
      this.mapView.dispose();
    }
    this.mapView = new MapView(state, seasonOf(state.day), this.quality);
    this.world.add(this.mapView.group);
    if (state.player.map === 'farm') this.world.add(this.machines.group);
    else this.world.remove(this.machines.group);
    this.effects.clear();
    this.rig.snap(new THREE.Vector3(state.player.x, 0, state.player.y));
  }

  /** Draw a frame. dt is real seconds since the last frame. */
  render(state: GameState, interp: Interp, dt: number): void {
    this.time += dt;
    this.ensureMap(state);
    const season = seasonOf(state.day);
    const indoor = !!getMapDef(state.player.map).indoor;
    const minute = state.minute + state.subTick / 5;
    this.mapView!.update(state, season, this.time);

    // Lighting
    const L = lightAt(minute, state.weather, indoor);
    this.scene.background = L.sky;
    this.scene.fog = new THREE.Fog(L.sky, 30, 70);
    this.hemi.color.copy(L.hemiSky);
    this.hemi.groundColor.copy(L.hemiGround);
    this.hemi.intensity = L.hemiIntensity;
    this.sun.color.copy(L.sunColor);
    this.sun.intensity = L.sunIntensity;
    glowMat.emissiveIntensity = L.night * 1.6;

    // Player (interpolated)
    const px = interp.px0 + (interp.px1 - interp.px0) * interp.alpha;
    const py = interp.py0 + (interp.py1 - interp.py0) * interp.alpha;
    const p = state.player;
    this.player.root.position.set(px, 0, py);
    const targetYaw = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][p.facing];
    let dy = targetYaw - this.player.root.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.player.root.rotation.y += dy * Math.min(1, dt * 14);
    const moving = p.moving;
    this.walkPhase += dt * (moving ? 11 : 2);
    animateCharacter(this.player, this.walkPhase, moving, p.swing > 0 ? p.swing / 3 : 0);
    const sel = p.inventory[p.selected];
    const tool = sel ? getItem(sel.id).tool : undefined;
    if (tool) {
      this.heldTool.geometry = toolGeometry(tool, p.tools[tool]);
      this.heldTool.visible = true;
      this.heldTool.rotation.x = p.fishing ? -1.2 : 0;
    } else this.heldTool.visible = false;

    // Camera follows the player
    const focus = new THREE.Vector3(px, 0, py);
    this.rig.update(focus, dt);

    // Sun follows the camera target so the shadow map stays dense where we look.
    const az = L.azimuth;
    const el = Math.max(0.25, L.elevation);
    this.sun.position.set(focus.x + Math.cos(az) * 20, 30 * el + 6, focus.z + Math.sin(az) * 12 + 10);
    this.sun.target.position.copy(focus);
    // Player lantern at night so the farm stays readable.
    this.lantern.intensity = L.night * 6;
    this.lantern.position.set(px, 2.2, py + 0.4);

    this.npcs.update(state, interp.alpha, dt);
    this.animals.update(state, this.time);

    // Machines, the Flow overlay and the build ghost (farm only).
    const onFarm = state.player.map === 'farm';
    if (onFarm) {
      const power = this.power(state);
      this.machines.update(state, dt, interp.alpha, power.entityFactor);
      this.flow.group.visible = this.flowOn;
      this.flow.ghostRange = null;
      if (this.ghost) {
        const def = getMachine(this.ghost.type);
        if (def.radius && (def.kind === 'sprinkler' || def.kind === 'harvester' || def.kind === 'planter' || def.kind === 'heater')) this.flow.ghostRange = { kind: def.kind, x: this.ghost.x, y: this.ghost.y, r: def.radius };
      }
      this.flow.update(state, power);
    } else this.flow.group.visible = false;
    this.drawGhost(onFarm);
    this.drawLine(state);

    // Cursor
    if (this.hover) {
      this.cursor.visible = true;
      this.cursor.position.set(this.hover.x + 0.5, 0.06, this.hover.y + 0.5);
      (this.cursor.material as THREE.MeshBasicMaterial).color.set(this.hover.ok ? '#fff8e0' : '#ff8a7a');
    } else this.cursor.visible = false;

    this.effects.update(dt, state.player.map);
    this.particles.update(dt, focus, season, state.weather, L.night, indoor, this.mapView!.chimneys, this.time);
    this.gl.render(this.scene, this.rig.camera);
  }

  /** Screen position (CSS pixels) of a world point, or null when behind the camera. */
  toScreen(p: THREE.Vector3): { x: number; y: number } | null {
    const v = p.clone().project(this.rig.camera);
    if (v.z > 1) return null;
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  /** Flow overlay toggle (F). */
  flowOn = false;

  /** Power for the current layout, cached by the sim's context key. */
  power(state: GameState): PowerInfo {
    const key = contextKey(state);
    if (key !== this.powerKey || !this.powerInfo) {
      this.powerKey = key;
      this.powerInfo = computePower(state);
    }
    return this.powerInfo;
  }

  private drawGhost(onFarm: boolean): void {
    const g = this.ghost;
    const show = !!g && onFarm;
    this.ghostBody.visible = show;
    this.ghostArrow.visible = show;
    if (!g || !show) return;
    this.ghostBody.geometry = machineMesh(g.type).body;
    const yaw = yawFor(g.dir);
    this.ghostBody.position.set(g.x + 0.5, 0.01, g.y + 0.5);
    this.ghostBody.rotation.y = g.type === 'water_wheel' ? 0 : yaw;
    ghostMat.color.set(g.ok ? '#b8ffb8' : '#ff9a8a');
    ghostMat.emissive.set(g.ok ? '#1a5a1a' : '#6a1a1a');
    this.ghostArrow.position.set(g.x + 0.5, 0.25, g.y + 0.5);
    this.ghostArrow.rotation.y = yaw;
    (this.ghostArrow.material as THREE.MeshBasicMaterial).color.set(g.ok ? '#e8ffe0' : '#ffb0a0');
  }
}
