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
import { glowMat, saturate, vertexMat } from './materials';
import { buildBuilding, type BuildingMesh } from './meshes/buildings';
import { cropGeometry } from './meshes/crops';
import * as D from './meshes/decor';
import { box, jitter, merge, noise2 } from './meshes/kit';
import * as F from './meshes/flora';
import * as N from './meshes/nature';
import { SEASON_PALETTE } from './palette';
import { buildBackdrop } from './backdrop';
import { buildTerrain, type TerrainView } from './terrain';
import { itemShape } from './meshes/items';

// Tilled soil: a low bed with three furrow ridges (one instanced geometry, tinted dry/wet).
const soilGeo = merge([box(0.94, 0.05, 0.94, '#ffffff', { y: -0.02 }), box(0.9, 0.04, 0.16, '#e4e4e4', { y: 0.02, z: -0.3 }), box(0.9, 0.04, 0.16, '#e4e4e4', { y: 0.02 }), box(0.9, 0.04, 0.16, '#e4e4e4', { y: 0.02, z: 0.3 })]);
const soilMat = saturate(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe8f0', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });

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
  /** meadow flowers, mushrooms, lilies and reeds: no shadows, rebuilt when objects, soil or machines change */
  private readonly flora = new Batcher(vertexMat, { cast: false, receive: true });
  private floraSig = '';
  private backdrop: THREE.Mesh | null = null;
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
    this.group.add(this.terrain.group, this.decor.group, this.decorGlow.group, this.glass.group, this.objects.group, this.crops.group, this.flora.group);
    this.buildDecor(state);
    this.buildBuildings(state);
    this.buildBackdrop();
  }

  private buildBackdrop(): void {
    if (this.backdrop) {
      this.group.remove(this.backdrop);
      this.backdrop.geometry.dispose();
      this.backdrop = null;
    }
    if (this.parsed.def.indoor || this.mapId.startsWith('mine')) return;
    this.backdrop = buildBackdrop(this.parsed, this.season);
    this.group.add(this.backdrop);
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
            this.decor.add(N.pineBody(), tileMatrix(cx, cy, 0.35 * s, r, s * 1.15), pineCol.clone().offsetHSL((jitter(i * 2.7) - 0.5) * 0.09, 0, (jitter(i * 4.1) - 0.5) * 0.12));
            if (pal.snow) this.decor.add(N.pineSnow(), tileMatrix(cx, cy, 0.35 * s, r, s * 1.15));
            break;
          case 'bush':
            this.decor.add(N.bush(), tileMatrix(cx, cy, 0, r, s), bushCol.clone().offsetHSL((jitter(i * 1.9) - 0.5) * 0.06, 0, 0));
            if (jitter(i * 6.6) < 0.6) this.decor.add(N.bushDots(pal.accent[i % pal.accent.length]), tileMatrix(cx, cy, 0, r, s));
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
    const fs = `${this.season}|${this.objSig}|${this.soilSig}|${state.farm.layoutRev}`;
    if (fs !== this.floraSig) {
      this.floraSig = fs;
      this.rebuildFlora(state);
    }
  }

  /**
   * The meadow. Flower patches come from smooth noise, so a patch is one kind in two or three colours; between
   * patches the odd mushroom, crystal or curly fern pops up. Nothing grows on soil, machines, objects, decor
   * or buildings. Water gets lily pads, the shoreline gets reeds.
   */
  private rebuildFlora(state: GameState): void {
    const m = this.parsed;
    const pal = SEASON_PALETTE[this.season];
    const objs = state.maps[this.mapId].objects;
    const onFarm = this.mapId === 'farm';
    const dm = [0.5, 1, 1.25][this.quality] ?? 1;
    const wet = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
      const t = m.terrain[y * m.w + x];
      return t === 'water' || t === 'lake';
    };
    this.flora.begin();
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        const i = y * m.w + x;
        if (m.decor[i] || objs[i]) continue;
        const t = m.terrain[i];
        if (t === 'water' || t === 'lake') {
          if (jitter(i * 9.1) < 0.09 * dm && !(onFarm && state.farm.entityAt[i] >= 0)) {
            const bloomColor = pal.snow || jitter(i * 3.9) < 0.4 ? null : pal.blooms[i % pal.blooms.length];
            this.flora.add(F.lily(bloomColor), tileMatrix(x + 0.5 + (jitter(i * 1.1) - 0.5) * 0.3, y + 0.5, -0.09, jitter(i) * 6.28, 0.9 + jitter(i * 2.2) * 0.4));
          }
          continue;
        }
        if (t !== 'grass' || m.buildingAt[i] >= 0) continue;
        if (onFarm && (state.farm.soil[i] || state.farm.entityAt[i] >= 0)) continue;
        const rot = jitter(i * 1.9) * Math.PI * 2;
        if (wet(x - 1, y) || wet(x + 1, y) || wet(x, y - 1) || wet(x, y + 1)) {
          if (jitter(i * 4.7) < 0.3 * dm) this.flora.add(F.reeds(), tileMatrix(x + 0.5, y + 0.5, 0, rot, 1 + jitter(i) * 0.3));
          continue;
        }
        const r = jitter(i * 1.37);
        const inPatch = !pal.snow && noise2(x * 0.22 + 7, y * 0.22 + 3) > 0.58;
        let kind: F.BloomKind;
        let color: string;
        let count = 1;
        if (inPatch) {
          if (r > 0.5 * dm) continue;
          kind = F.PATCH_KINDS[Math.floor(noise2(x * 0.1 + 90, y * 0.1 + 11) * F.PATCH_KINDS.length * 0.999)];
          const ci = Math.floor(noise2(x * 0.13 + 40, y * 0.13 + 70) * pal.blooms.length * 0.999) + (jitter(i * 2.1) < 0.4 ? 1 : 0);
          color = pal.blooms[ci % pal.blooms.length];
          count = jitter(i * 8.1) < 0.5 ? 2 : 1;
        } else {
          if (r > (pal.snow ? 0.02 : 0.055) * dm) continue;
          const pool: F.BloomKind[] = pal.snow ? ['crystal', 'curl'] : F.ODD_KINDS;
          kind = pool[Math.floor(jitter(i * 5.3) * pool.length * 0.999)];
          const colors = kind === 'mushroom' ? F.MUSHROOM_COLORS : kind === 'crystal' ? F.CRYSTAL_COLORS : kind === 'curl' ? F.CURL_COLORS : pal.blooms;
          color = colors[Math.floor(jitter(i * 7.9) * colors.length * 0.999)];
        }
        for (let k = 0; k < count; k++) {
          const ox = (jitter(i * 3.3 + k * 17) - 0.5) * 0.7;
          const oz = (jitter(i * 4.3 + k * 11) - 0.5) * 0.7;
          this.flora.add(F.bloom(kind, color), tileMatrix(x + 0.5 + ox, y + 0.5 + oz, 0, rot + k * 2, 1.1 + jitter(i * 2.6 + k) * 0.35));
        }
      }
    }
    this.flora.end();
  }

  private rebuildSeason(state: GameState, season: SeasonId): void {
    this.season = season;
    this.group.remove(this.terrain.group);
    this.terrain.dispose();
    this.terrain = buildTerrain(this.parsed, season, this.quality);
    this.group.add(this.terrain.group);
    this.buildBackdrop();
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
    const grey = new THREE.Color('#dce8f4');
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
          const tint = canopy[(i + o.variant) % canopy.length];
          // Render-only silhouettes: most are round and puffy, some are umbrella or soft-serve spires.
          const style = (i * 7 + o.variant) % 10;
          if (style >= 8) {
            this.objects.add(N.spireTrunk(), tileMatrix(x, y, 0, r, s));
            this.objects.add(N.spireCanopy(), tileMatrix(x, y, 0, r, s), tint);
          } else if (style >= 6) {
            this.objects.add(N.umbrellaTrunk(), tileMatrix(x, y, 0, r, s));
            this.objects.add(N.umbrellaCanopy(), tileMatrix(x, y, 0, r, s), tint);
          } else {
            this.objects.add(N.treeTrunk(o.variant), tileMatrix(x, y, 0, r, s));
            this.objects.add(N.treeCanopy(o.variant), tileMatrix(x, y, 0, r, s), tint);
            if (jitter(i * 2.9) < 0.65) this.objects.add(N.treeDots(o.variant, pal.accent[(i * 3) % pal.accent.length]), tileMatrix(x, y, 0, r, s));
          }
          break;
        }
        case 'boulder':
          this.objects.add(N.boulder(i), tileMatrix(x, y, 0, r));
          break;
        case 'stone':
          // Mine rocks are the main thing you break down there, so they read as proper rocks.
          if (this.mapId.startsWith('mine')) this.objects.add(N.boulder(i + 1), tileMatrix(x, y, 0, r, 0.62));
          else this.objects.add(N.smallStone(i), tileMatrix(x, y, 0, r));
          break;
        case 'weeds':
          this.objects.add(N.weeds(), tileMatrix(x, y, 0, r), bushCol.clone().offsetHSL(0, 0, 0.05));
          break;
        case 'twig':
          this.objects.add(N.twig(), tileMatrix(x, y, 0, r));
          break;
        case 'forage':
          this.objects.add(N.bush(), tileMatrix(x, y, 0, r, 0.55), bushCol);
          this.objects.add(N.bushDots(pal.accent[i % pal.accent.length]), tileMatrix(x, y, 0, r, 0.55));
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
    const dry = new THREE.Color('#c8844e');
    const wet = new THREE.Color('#7a4a38');
    const fert = new THREE.Color('#a8683e');
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
    this.flora.dispose();
    if (this.backdrop) this.backdrop.geometry.dispose();
    this.soil?.dispose();
  }
}
