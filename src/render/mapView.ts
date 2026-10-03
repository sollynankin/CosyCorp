// Everything static-ish for the current map: terrain, decoration, buildings, world objects, soil and crops.
// Objects, soil and crops rebuild only when their signature (a cheap checksum over state) changes.
import * as THREE from 'three';
import { getItem, getTree } from '../data';
import type { SeasonId } from '../data/types';
import { cropStage, festivalOn } from '../sim';
import type { GameState } from '../sim/state';
import { TREE_MATURE_DAYS } from '../data/balance';
import { buildingAtTile, parseMap, type ParsedMap } from '../world';
import { Batcher, tileMatrix } from './batcher';
import { glowMat } from './materials';
import { buildBuilding, type BuildingMesh } from './meshes/buildings';
import { cropGeometry } from './meshes/crops';
import * as D from './meshes/decor';
import { box, jitter, merge } from './meshes/kit';
import * as N from './meshes/nature';
import { SEASON_PALETTE } from './palette';
import { buildTerrain, type TerrainView } from './terrain';
import { itemShape } from './meshes/items';

// Tilled soil: a low bed with three furrow ridges (one instanced geometry, tinted dry/wet).
const soilGeo = merge([box(0.94, 0.05, 0.94, '#ffffff', { y: -0.02 }), box(0.9, 0.04, 0.16, '#e4e4e4', { y: 0.02, z: -0.3 }), box(0.9, 0.04, 0.16, '#e4e4e4', { y: 0.02 }), box(0.9, 0.04, 0.16, '#e4e4e4', { y: 0.02, z: 0.3 })]);
const soilMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe8f0', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });

const mineRock = new THREE.Color('#c8b8a8');
const ORE_COLORS: Record<string, string> = { copper_ore: '#d8843a', iron_ore: '#c8c8d8', coal: '#2a2424', quartz: '#f0f8ff', amethyst: '#b06ae8', stone: '#9a9a94' };

export class MapView {
  readonly group = new THREE.Group();
  readonly mapId: string;
  readonly parsed: ParsedMap;
  private terrain: TerrainView;
  private season: SeasonId;
  private readonly decor = new Batcher();
  private readonly decorGlow = new Batcher(glowMat, { cast: false, receive: false });
  private readonly glass = new Batcher(glassMat, { cast: false, receive: false });
  private readonly objects = new Batcher();
  private readonly crops = new Batcher();
  private soil: THREE.InstancedMesh | null = null;
  readonly buildings: { def: string; mesh: BuildingMesh }[] = [];
  private objSig = -1;
  private soilSig = -1;
  private builtFlags = '';
  /** festival id and lantern-line state the town dressing was built for */
  private dressKey = '';
  /** world positions of chimneys and lamps (for smoke and night light) */
  chimneys: THREE.Vector3[] = [];

  constructor(state: GameState, season: SeasonId, private readonly quality: number) {
    this.mapId = state.player.map;
    this.parsed = parseMap(this.mapId);
    this.season = season;
    this.terrain = buildTerrain(this.parsed, season, quality);
    this.group.add(this.terrain.group, this.decor.group, this.decorGlow.group, this.glass.group, this.objects.group, this.crops.group);
    this.buildDecor(state);
    this.buildBuildings(state);
  }

  private buildDecor(state: GameState): void {
    const m = this.parsed;
    const pal = SEASON_PALETTE[this.season];
    const pineCol = new THREE.Color(pal.pine);
    const bushCol = new THREE.Color(pal.bush);
    this.decor.begin();
    this.decorGlow.begin();
    this.glass.begin();
    // Lamps re-register below; drop the old ones so rebuilds don't stack duplicates.
    this.chimneys = this.chimneys.filter((c) => c.y !== 1.9);
    const greenhouse = state.flags.includes('greenhouse');
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        const i = y * m.w + x;
        const d = m.decor[i];
        if (!d) continue;
        const cx = x + 0.5;
        const cy = y + 0.5;
        const r = jitter(i) * Math.PI * 2;
        const s = 0.85 + jitter(i * 3.3) * 0.35;
        switch (d) {
          case 'pine':
            this.decor.add(N.pineTrunk(), tileMatrix(cx, cy, 0, r, s));
            this.decor.add(N.pineBody(), tileMatrix(cx, cy, 0.35 * s, r, s * 1.15), pineCol);
            if (pal.snow) this.decor.add(N.pineSnow(), tileMatrix(cx, cy, 0.35 * s, r, s * 1.15));
            break;
          case 'bush':
            this.decor.add(N.bush(), tileMatrix(cx, cy, 0, r, s), bushCol);
            break;
          case 'lamp':
            this.decor.add(D.lampPost(), tileMatrix(cx, cy, 0, 0));
            this.decorGlow.add(D.lampGlow(), tileMatrix(cx, cy, 0, 0));
            this.chimneys.push(new THREE.Vector3(cx, 1.9, cy));
            break;
          case 'board':
            this.decor.add(D.questBoard(), tileMatrix(cx, cy, 0, 0));
            break;
          case 'fountain':
            // the fountain is 2×2; draw it once from its top-left tile
            if (m.decor[i - 1] !== 'fountain' && m.decor[i - m.w] !== 'fountain') this.decor.add(D.fountain(), tileMatrix(x + 1, y + 1, 0, 0));
            break;
          case 'glasswall':
            if (greenhouse) {
              this.decor.add(D.glassFrame(), tileMatrix(cx, cy, 0, 0));
              this.glass.add(D.glassPane(), tileMatrix(cx, cy, 0.1, 0));
            } else this.decor.add(D.brokenGlass(), tileMatrix(cx, cy, 0, r));
            break;
          case 'minemouth':
            if (m.decor[i - 1] === 'minemouth') this.decor.add(D.mineMouth(), tileMatrix(x, cy, 0, 0, 1.6));
            break;
          case 'rockwall':
            this.decor.add(D.rockWall(i % 2), tileMatrix(cx, cy, 0, r, 0.9 + jitter(i) * 0.3));
            break;
        }
      }
    }
    if (this.mapId === 'town') this.dressTown(state);
    if (this.mapId === 'farm') this.dressFarm(state);
    this.decor.end();
    this.decorGlow.end();
    this.glass.end();
  }

  /** Stretch-goal cosmetics on the farm (DESIGN.md §13). */
  private dressFarm(state: GameState): void {
    this.dressKey = state.rewards.join(',');
    const r = state.rewards;
    if (r.includes('yard_bunting')) {
      for (const x of [6, 19]) this.decor.add(D.buntingPole(), tileMatrix(x + 0.5, 7.5, 0, 0));
      this.decor.add(D.buntingRun(13), tileMatrix(6.5, 7.5, 0, 0));
    }
    if (r.includes('farm_lanterns')) {
      for (let x = 12; x < 43; x += 5) {
        this.decor.add(D.lanternPost(), tileMatrix(x + 0.5, 7.5, 0, 0));
        this.decorGlow.add(D.lanternBody(), tileMatrix(x + 0.5, 7.5, 0, 0));
      }
    }
    if (r.includes('weathervane')) this.decor.add(D.weathervane(), tileMatrix(10, 4.5, 3.0, 0));
  }

  private townDressKey(state: GameState): string {
    return `${festivalOn(state.day)?.id ?? ''}|${state.flags.includes('lantern_line')}`;
  }

  /** Festival day dressing for the plaza, and the Lantern Line along Kettle Street once it is restored. */
  private dressTown(state: GameState): void {
    this.dressKey = this.townDressKey(state);
    const f = festivalOn(state.day);
    if (f && f.id !== 'lantern') {
      for (const [x, y] of [[17, 10], [17, 21], [30, 10], [30, 21]] as const) this.decor.add(D.buntingPole(), tileMatrix(x + 0.5, y + 0.5, 0, 0));
      for (const y of [10, 21]) this.decor.add(D.buntingRun(13), tileMatrix(17.5, y + 0.5, 0, 0));
      const awnings = ['#e05a5a', '#5ab0e0', '#f0c040', '#7ad07a'];
      [[19, 19], [22, 19], [26, 19], [28, 12]].forEach(([x, y], k) => this.decor.add(D.stall(awnings[k]), tileMatrix(x + 0.5, y + 0.5, 0, 0)));
    }
    if (state.flags.includes('lantern_line') || f?.id === 'lantern') {
      for (let x = 2; x < 44; x += 4) {
        if (x >= 16 && x <= 31) continue;
        this.decor.add(D.lanternPost(), tileMatrix(x + 0.5, 14.5, 0, 0));
        this.decorGlow.add(D.lanternBody(), tileMatrix(x + 0.5, 14.5, 0, 0));
      }
    }
  }

  private buildBuildings(state: GameState): void {
    for (const b of this.buildings) this.group.remove(b.mesh.group);
    this.buildings.length = 0;
    this.chimneys = this.chimneys.filter((c) => c.y < 1.95);
    for (const b of this.parsed.def.buildings) {
      if (b.requiresFlag && !state.flags.includes(b.requiresFlag)) continue;
      const mesh = buildBuilding(b);
      for (const s of mesh.snow) s.visible = this.season === 'winter';
      this.group.add(mesh.group);
      this.buildings.push({ def: b.id, mesh });
      if (mesh.chimney) this.chimneys.push(mesh.chimney);
    }
    this.builtFlags = state.flags.join(',');
  }

  /** Called every frame. */
  update(state: GameState, season: SeasonId, time: number): void {
    if (season !== this.season) this.rebuildSeason(state, season);
    if (this.mapId === 'town' && this.townDressKey(state) !== this.dressKey) this.buildDecor(state);
    if (this.mapId === 'farm' && state.rewards.join(',') !== this.dressKey) this.buildDecor(state);
    if (state.flags.join(',') !== this.builtFlags) {
      this.buildBuildings(state);
      this.buildDecor(state);
    }
    this.terrain.update(time);
    for (const b of this.buildings) for (const sp of b.mesh.spinners) sp.rotation.z = time * 0.8;
    const sig = this.objectSignature(state);
    if (sig !== this.objSig) {
      this.objSig = sig;
      this.rebuildObjects(state, time);
    }
    if (this.mapId === 'farm') {
      const ss = this.soilSignature(state);
      if (ss !== this.soilSig) {
        this.soilSig = ss;
        this.rebuildSoil(state);
      }
    }
  }

  private rebuildSeason(state: GameState, season: SeasonId): void {
    this.season = season;
    this.group.remove(this.terrain.group);
    this.terrain.dispose();
    this.terrain = buildTerrain(this.parsed, season, this.quality);
    this.group.add(this.terrain.group);
    this.buildDecor(state);
    for (const b of this.buildings) for (const s of b.mesh.snow) s.visible = season === 'winter';
    this.objSig = -1;
  }

  private objectSignature(state: GameState): number {
    const objs = state.maps[this.mapId].objects;
    let h = 7;
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (!o) continue;
      let v = i * 31 + o.kind.length;
      if (o.kind === 'tree') v += o.hp * 7 + (o.stump ? 1000 : 0);
      else if (o.kind === 'orchard') v += o.age * 13 + o.fruit * 101;
      else if (o.kind === 'forage' || o.kind === 'ore' || o.kind === 'story') v += o.item.length * 17 + o.item.charCodeAt(0);
      if ('hp' in o) v += o.hp * 3;
      h = (Math.imul(h, 16777619) ^ v) | 0;
    }
    return h;
  }

  private rebuildObjects(state: GameState, time: number): void {
    const m = this.parsed;
    const objs = state.maps[this.mapId].objects;
    const pal = SEASON_PALETTE[this.season];
    const canopy = pal.canopy.map((c) => new THREE.Color(c));
    const bushCol = new THREE.Color(pal.bush);
    const grey = new THREE.Color('#b8b8b0');
    this.objects.begin();
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (!o) continue;
      const x = (i % m.w) + 0.5;
      const y = Math.floor(i / m.w) + 0.5;
      const r = jitter(i) * Math.PI * 2;
      switch (o.kind) {
        case 'tree': {
          if (o.stump) {
            this.objects.add(N.stump(), tileMatrix(x, y, 0, r));
            break;
          }
          const s = 0.9 + jitter(i * 1.7) * 0.3;
          this.objects.add(N.treeTrunk(o.variant), tileMatrix(x, y, 0, r, s));
          this.objects.add(N.treeCanopy(o.variant), tileMatrix(x, y, 0, r, s), canopy[(i + o.variant) % canopy.length]);
          break;
        }
        case 'boulder':
          this.objects.add(N.boulder(), tileMatrix(x, y, 0, r));
          break;
        case 'stone':
          // Mine rocks are the main thing you break down there, so they read as proper rocks.
          if (this.mapId.startsWith('mine')) this.objects.add(N.boulder(), tileMatrix(x, y, 0, r, 0.62), mineRock);
          else this.objects.add(N.smallStone(), tileMatrix(x, y, 0, r));
          break;
        case 'weeds':
          this.objects.add(N.weeds(), tileMatrix(x, y, 0, r), bushCol.clone().offsetHSL(0, 0, 0.05));
          break;
        case 'twig':
          this.objects.add(N.twig(), tileMatrix(x, y, 0, r));
          break;
        case 'forage':
          this.objects.add(N.bush(), tileMatrix(x, y, 0, r, 0.55), bushCol);
          this.objects.add(itemShape(getItem(o.item).icon), tileMatrix(x, y, 0.32, r, 1.1), new THREE.Color(getItem(o.item).color));
          break;
        case 'ore':
          this.objects.add(N.oreRock(ORE_COLORS[o.item] ?? '#c8c8c8'), tileMatrix(x, y, 0, r));
          break;
        case 'ladder':
          this.objects.add(N.ladder(), tileMatrix(x, y, 0, 0));
          break;
        case 'story':
          this.objects.add(itemShape(getItem(o.item).icon), tileMatrix(x, y, 0.05, r, 1.6), new THREE.Color(getItem(o.item).color));
          break;
        case 'bunny':
          this.objects.add(N.dustBunny(), tileMatrix(x, y, Math.abs(Math.sin(time * 4 + i)) * 0.1, r));
          break;
        case 'orchard': {
          const stage = o.age >= TREE_MATURE_DAYS ? 2 : o.age >= TREE_MATURE_DAYS / 2 ? 1 : 0;
          this.objects.add(N.orchardTree(stage), tileMatrix(x, y, 0, r), this.season === 'winter' ? grey : undefined);
          const fc = getTree(o.tree).color;
          for (let k = 0; k < o.fruit; k++) this.objects.add(N.fruit(fc), tileMatrix(x + Math.cos(k * 2.3) * 0.4, y + Math.sin(k * 2.3) * 0.4, 1.0 + k * 0.15, 0));
          break;
        }
      }
    }
    this.objects.end();
  }

  private soilSignature(state: GameState): number {
    let h = 3;
    const soil = state.farm.soil;
    for (let i = 0; i < soil.length; i++) {
      const s = soil[i];
      if (!s) continue;
      let v = i * 13 + (s.watered ? 1 : 0) + (s.fertilized ? 2 : 0);
      if (s.crop) v += s.crop.id.charCodeAt(0) * 7 + s.crop.id.length * 131 + Math.floor(s.crop.days * 4) * 1009 + (s.crop.withered ? 50000 : 0);
      h = (Math.imul(h, 16777619) ^ v) | 0;
    }
    return h;
  }

  private rebuildSoil(state: GameState): void {
    const m = this.parsed;
    const soil = state.farm.soil;
    const tiles: number[] = [];
    for (let i = 0; i < soil.length; i++) if (soil[i]) tiles.push(i);
    if (this.soil) {
      this.group.remove(this.soil);
      this.soil.dispose();
    }
    this.soil = new THREE.InstancedMesh(soilGeo, soilMat, Math.max(1, tiles.length));
    this.soil.receiveShadow = true;
    this.soil.count = tiles.length;
    const mtx = new THREE.Matrix4();
    const dry = new THREE.Color('#9a6a44');
    const wet = new THREE.Color('#4e3420');
    const fert = new THREE.Color('#6a5040');
    const c = new THREE.Color();
    tiles.forEach((i, k) => {
      const s = soil[i]!;
      mtx.makeTranslation((i % m.w) + 0.5, 0.0, Math.floor(i / m.w) + 0.5);
      this.soil!.setMatrixAt(k, mtx);
      c.copy(s.watered ? wet : s.fertilized ? fert : dry).offsetHSL(0, 0, (jitter(i) - 0.5) * 0.03);
      this.soil!.setColorAt(k, c);
    });
    this.group.add(this.soil);

    this.crops.begin();
    for (const i of tiles) {
      const s = soil[i]!;
      if (!s.crop) continue;
      const stage = cropStage(s.crop);
      const g = cropGeometry(s.crop.id, stage, s.crop.withered);
      const x = (i % m.w) + 0.5;
      const y = Math.floor(i / m.w) + 0.5;
      this.crops.add(g, tileMatrix(x, y, 0.03, jitter(i * 5.1) * Math.PI * 2, 1.25 + jitter(i) * 0.12));
    }
    this.crops.end();
  }

  /** Is (x, y) inside a building on this map (for hiding characters behind doors)? */
  buildingAt(state: GameState, x: number, y: number) {
    return buildingAtTile(this.parsed, x, y, state.flags);
  }

  dispose(): void {
    this.terrain.dispose();
    this.decor.dispose();
    this.decorGlow.dispose();
    this.glass.dispose();
    this.objects.dispose();
    this.crops.dispose();
    this.soil?.dispose();
  }
}
