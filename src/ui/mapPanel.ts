// The map: pick an area from the little world chart, see its layout with buildings, exits and where you are.
// Reads state only; drawn on a 2D canvas from the same map data and season colours as the 3D view.
import { getMachine } from '../data';
import type { MapId } from '../data/types';
import type { Game } from '../game/game';
import { SEASON_PALETTE, terrainColor } from '../render/palette';
import { seasonOf } from '../sim/calendar';
import type { GameState } from '../sim/state';
import { getMapDef, parseMap } from '../world';
import { h } from './dom';
import type { Modals } from './modal';

type Area = 'lake' | 'farm' | 'town' | 'forest' | 'mine';

/** The areas in the order you meet them. How they connect: town is east of the farm, the forest south (with the mine below it), the lake north of town. */
const WORLD: { id: Area; label: string }[] = [
  { id: 'farm', label: 'Farm' },
  { id: 'town', label: 'Town' },
  { id: 'lake', label: 'Lake' },
  { id: 'forest', label: 'Forest' },
  { id: 'mine', label: 'Mine' },
];

const MAP_WIDTH = 704;

function areaOf(map: MapId): Area {
  return map.startsWith('mine') ? 'mine' : (map as Area);
}

const AREA_NAMES: Record<string, string> = { farm: 'Penhallow Yard', town: 'Hearthvale Town', forest: 'The Forest', lake: 'The Lake' };

export class MapPanel {
  private view: Area = 'farm';

  constructor(private readonly game: Game, private readonly modals: Modals) {}

  /** Start on the area you are standing in (the book calls this when it opens on the map). */
  focusHere(): void {
    this.view = areaOf(this.game.state.player.map);
  }

  /** The map tab of the book. */
  body(): HTMLElement {
    const s = this.game.state;
    const here = areaOf(s.player.map);
    const chart = h('div.world-chart');
    for (const a of WORLD) {
      chart.appendChild(
        h(`button.world-node${a.id === this.view ? '.on' : ''}`, {
          onclick: () => {
            this.view = a.id;
            this.modals.refresh();
          },
        }, a.label, a.id === here ? h('span.here', ' ●') : null),
      );
    }
    const body = this.view === 'mine' ? this.renderMine(s) : this.renderArea(s, this.view);
    return h('div.map-panel', chart, body);
  }

  private renderMine(s: GameState): HTMLElement {
    const inMine = s.player.map.startsWith('mine');
    return h('div.map-body',
      h('p', 'The mine lies south of the Forest. Each floor is its own cave with a hidden ladder under a rock, and a lift at floors 5 and 10.'),
      h('p.muted', `Deepest floor reached: ${s.mineDeepest}.${inMine ? ` You are on floor ${s.player.map.slice(4)}.` : ''}`));
  }

  private renderArea(s: GameState, id: string): HTMLElement {
    const m = parseMap(id);
    const season = seasonOf(s.day);
    const pal = SEASON_PALETTE[season];
    const ts = Math.max(8, Math.floor(MAP_WIDTH / m.w));
    const canvas = h('canvas.map-canvas', { width: m.w * ts, height: m.h * ts }) as HTMLCanvasElement;
    const g = canvas.getContext('2d')!;
    const patch = (x: number, y: number) => ((x * 7 + y * 13) % 5) / 5;
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        const i = y * m.w + x;
        const t = m.terrain[i];
        g.fillStyle = t === 'grass' ? (patch(x, y) > 0.5 ? pal.grassAlt : pal.grass) : t === 'water' || t === 'lake' || t === 'boards' ? (t === 'boards' ? '#c88a52' : terrainColor(t, season, false)) : terrainColor(t, season, false);
        g.fillRect(x * ts, y * ts, ts, ts);
        const d = m.decor[i];
        if (d === 'pine') this.dot(g, x, y, ts, pal.pine, 0.42);
        else if (d === 'bush') this.dot(g, x, y, ts, pal.bush, 0.3);
        else if (d === 'lamp') this.dot(g, x, y, ts, '#ffe070', 0.18);
        else if (d === 'fountain') this.dot(g, x, y, ts, '#7ad8ff', 0.4);
        else if (d === 'rockwall') this.dot(g, x, y, ts, '#b0a0c8', 0.4);
        else if (s.maps[id]?.objects[i]?.kind === 'tree') this.dot(g, x, y, ts, pal.canopy[0], 0.4);
      }
    }
    if (id === 'farm') {
      for (let i = 0; i < s.farm.soil.length; i++) {
        const so = s.farm.soil[i];
        if (!so) continue;
        g.fillStyle = so.crop ? '#6fcf4a' : '#b0703c';
        g.fillRect((i % m.w) * ts + 1, Math.floor(i / m.w) * ts + 1, ts - 2, ts - 2);
      }
      for (const e of s.farm.entities) {
        const kind = getMachine(e.type).kind;
        g.fillStyle = kind === 'belt' || kind === 'splitter' ? '#f4e8c0' : '#8a6ad8';
        g.fillRect(e.x * ts + 2, e.y * ts + 2, ts - 4, ts - 4);
      }
    }
    g.textAlign = 'center';
    g.font = `800 ${Math.max(10, Math.round(ts * 0.8))}px Nunito, sans-serif`;
    g.lineJoin = 'round';
    const label = (text: string, cx: number, cy: number, fill = '#ffffff') => {
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(60,34,24,0.85)';
      g.strokeText(text, cx, cy);
      g.fillStyle = fill;
      g.fillText(text, cx, cy);
    };
    for (const b of getMapDef(id).buildings) {
      if (b.requiresFlag && !s.flags.includes(b.requiresFlag)) continue;
      g.fillStyle = b.roof;
      g.fillRect(b.x * ts, b.y * ts, b.w * ts, b.h * ts);
      g.fillStyle = b.wall;
      g.fillRect(b.x * ts + 3, b.y * ts + 3, b.w * ts - 6, b.h * ts - 6);
      g.fillStyle = '#5a3a24';
      g.fillRect(b.door.x * ts + 2, b.door.y * ts + 2, ts - 4, ts - 4);
      label(b.name, (b.x + b.w / 2) * ts, (b.y + b.h / 2) * ts + ts * 0.3);
    }
    for (const w of getMapDef(id).warps) {
      g.fillStyle = '#ffffff';
      g.globalAlpha = 0.55;
      g.fillRect(w.x * ts, w.y * ts, ts, ts);
      g.globalAlpha = 1;
    }
    const seen = new Set<string>();
    for (const w of getMapDef(id).warps) {
      const to = AREA_NAMES[w.to] ?? 'The Mine';
      if (seen.has(to)) continue;
      seen.add(to);
      const ax = Math.min(m.w * ts - 60, Math.max(60, w.x * ts + ts / 2));
      const ay = Math.min(m.h * ts - 8, Math.max(16, w.y * ts + (w.dir === 0 ? ts * 2 : w.dir === 2 ? -ts : ts / 2)));
      label(`→ ${to}`, ax, ay, '#ffe8a0');
    }
    if (s.player.map === id) {
      const px = s.player.x * ts;
      const py = s.player.y * ts;
      g.beginPath();
      g.arc(px, py, ts * 0.9, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fill();
      g.beginPath();
      g.arc(px, py, ts * 0.5, 0, Math.PI * 2);
      g.fillStyle = '#ff4a5a';
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = '#ffffff';
      g.stroke();
      label('You', px, py - ts * 1.1, '#ffd0d0');
    }
    return h('div.map-body',
      h('div.map-title', getMapDef(id).name, s.player.map === id ? h('span.arc', 'you are here') : null),
      h('div.map-wrap', canvas),
      h('div.muted.small', 'White tiles are exits, brown squares are doors, ● marks where you are. Town is east of the farm, the forest south, the lake north of town.'));
  }

  private dot(g: CanvasRenderingContext2D, x: number, y: number, ts: number, color: string, r: number): void {
    g.beginPath();
    g.arc(x * ts + ts / 2, y * ts + ts / 2, ts * r, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
  }
}
