// Colours by season and the day/night light curve. Render-only.
import * as THREE from 'three';
import type { SeasonId, WeatherId } from '../data/types';
import type { Terrain } from '../world';

export interface SeasonPalette {
  grass: string;
  grassAlt: string;
  path: string;
  canopy: string[];
  pine: string;
  bush: string;
  snow: boolean;
}

export const SEASON_PALETTE: Record<SeasonId, SeasonPalette> = {
  spring: { grass: '#7cc45a', grassAlt: '#80c85d', path: '#dcc496', canopy: ['#6fbf4f', '#8ccf5a', '#f2b8cf'], pine: '#3f7f4f', bush: '#5fae4a', snow: false },
  summer: { grass: '#5fae45', grassAlt: '#63b248', path: '#d8be8c', canopy: ['#3f9a3c', '#4fa845', '#5cb24a'], pine: '#2f6f42', bush: '#3f9a3c', snow: false },
  autumn: { grass: '#a3a650', grassAlt: '#a8a954', path: '#ccb080', canopy: ['#e0782c', '#d8a030', '#c0442c'], pine: '#3a6a42', bush: '#b0702c', snow: false },
  winter: { grass: '#e8eef2', grassAlt: '#e3eaef', path: '#cfc4b4', canopy: ['#e8eef2', '#dfe8ee', '#f2f6f8'], pine: '#3d5f52', bush: '#c8d4da', snow: true },
};

export function terrainColor(t: Terrain, season: SeasonId, alt: boolean): string {
  const p = SEASON_PALETTE[season];
  switch (t) {
    case 'grass':
      return alt ? p.grassAlt : p.grass;
    case 'path':
      return p.snow ? '#d8d0c4' : p.path;
    case 'stone':
      return p.snow ? '#d8dce0' : '#b8b0a4';
    case 'boards':
      return '#9a6c42';
    case 'sand':
      return p.snow ? '#e4e2da' : '#e6d29a';
    case 'water':
      return '#3f8fbf';
    case 'lake':
      return '#2f78a8';
    case 'cliff':
      return p.snow ? '#c8ccd0' : '#8a7a68';
    case 'glassfloor':
      return '#a89a84';
    case 'minefloor':
      return '#6a5a4c';
  }
}

export interface LightState {
  sky: THREE.Color;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  /** sun direction elevation 0..1 and azimuth radians */
  elevation: number;
  azimuth: number;
  /** 0 day .. 1 full night (window and lamp glow) */
  night: number;
}

interface Key {
  m: number;
  sky: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiI: number;
  night: number;
}

// Keyframes by minute since 06:00 (0 = 06:00, 720 = 18:00, 1200 = 02:00).
const KEYS: Key[] = [
  { m: 0, sky: '#f4c7a0', sun: '#ffc890', sunI: 1.2, hemiSky: '#ffd8b8', hemiI: 0.9, night: 0.2 },
  { m: 90, sky: '#a8d4f0', sun: '#fff0d8', sunI: 2.2, hemiSky: '#d8ecff', hemiI: 1.1, night: 0 },
  { m: 600, sky: '#a8d4f0', sun: '#fff4e0', sunI: 2.3, hemiSky: '#d8ecff', hemiI: 1.1, night: 0 },
  { m: 750, sky: '#f0b888', sun: '#ffb070', sunI: 1.6, hemiSky: '#ffd0a8', hemiI: 0.95, night: 0.15 },
  { m: 840, sky: '#7a5a8a', sun: '#ff8a6a', sunI: 0.7, hemiSky: '#9a88b8', hemiI: 0.7, night: 0.6 },
  { m: 930, sky: '#1e2a4a', sun: '#8aa0d8', sunI: 0.45, hemiSky: '#4a5a8a', hemiI: 0.55, night: 1 },
  { m: 1200, sky: '#141c34', sun: '#7a90c8', sunI: 0.4, hemiSky: '#3a4a78', hemiI: 0.5, night: 1 },
];

const WEATHER_DIM: Record<WeatherId, { light: number; sky: string; mix: number }> = {
  sunny: { light: 1, sky: '#ffffff', mix: 0 },
  rain: { light: 0.65, sky: '#8a96a4', mix: 0.55 },
  storm: { light: 0.5, sky: '#5a6270', mix: 0.7 },
  snow: { light: 0.8, sky: '#c8d0dc', mix: 0.45 },
};

const c1 = new THREE.Color();
const c2 = new THREE.Color();

export function lightAt(minute: number, weather: WeatherId, indoor: boolean): LightState {
  let a = KEYS[0];
  let b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (minute >= KEYS[i].m && minute <= KEYS[i + 1].m) {
      a = KEYS[i];
      b = KEYS[i + 1];
      break;
    }
  }
  const t = b.m === a.m ? 0 : (minute - a.m) / (b.m - a.m);
  const lerpC = (x: string, y: string) => c1.set(x).lerp(c2.set(y), t).clone();
  const w = WEATHER_DIM[weather];
  const sky = lerpC(a.sky, b.sky);
  sky.lerp(new THREE.Color(w.sky).multiply(sky.clone().addScalar(0.3)), w.mix);
  const dayFrac = Math.min(1, Math.max(0, minute / 900));
  const st: LightState = {
    sky,
    sunColor: lerpC(a.sun, b.sun),
    sunIntensity: (a.sunI + (b.sunI - a.sunI) * t) * w.light,
    hemiSky: lerpC(a.hemiSky, b.hemiSky),
    hemiGround: new THREE.Color('#5a4a3a'),
    hemiIntensity: (a.hemiI + (b.hemiI - a.hemiI) * t) * (0.75 + 0.25 * w.light),
    elevation: Math.sin(Math.PI * Math.min(1, dayFrac)) * 0.85 + 0.15,
    azimuth: -Math.PI * 0.5 + Math.PI * dayFrac,
    night: a.night + (b.night - a.night) * t,
  };
  if (indoor) {
    st.sky = new THREE.Color('#1a1410');
    st.sunColor = new THREE.Color('#ffd8a0');
    st.sunIntensity = 0.8;
    st.hemiSky = new THREE.Color('#d8a878');
    st.hemiIntensity = 1.35;
    st.night = 1;
  }
  return st;
}
