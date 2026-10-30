// Colours by season and the day/night light curve. Render-only.
import * as THREE from 'three';
import type { SeasonId, WeatherId } from '../data/types';
import type { Terrain } from '../world';

export interface SeasonPalette {
  grass: string;
  /** the second ground hue; noise blends between the two so the lawn forms soft patches */
  grassAlt: string;
  path: string;
  canopy: string[];
  pine: string;
  bush: string;
  /** colours for blossoms, berries and fruit dots on trees and bushes */
  accent: string[];
  /** meadow flower colours */
  blooms: string[];
  /** distant hill colours behind the map edge */
  hills: string[];
  snow: boolean;
}

// Candy-bright on purpose: saturated greens with minty and golden patches, pink blossom, coral clay.
export const SEASON_PALETTE: Record<SeasonId, SeasonPalette> = {
  spring: {
    grass: '#80d858', grassAlt: '#58d08a', path: '#ffdca0',
    canopy: ['#8cf05a', '#b8f56a', '#ff8cc4', '#ffb0d8', '#5ee8b0'], pine: '#2aa870', bush: '#52e060',
    accent: ['#ffffff', '#ffd0e8', '#fff0a0'], blooms: ['#ff6a9e', '#ffd23a', '#ffffff', '#8a7cff', '#ff9a3a', '#5ad8ff'],
    hills: ['#7ae8c0', '#a8a0ff', '#ffb8d8'], snow: false,
  },
  summer: {
    grass: '#56d05a', grassAlt: '#38c890', path: '#ffd48a',
    canopy: ['#38d060', '#58e070', '#20c8a0', '#98e848', '#ffd23a'], pine: '#1f9f78', bush: '#30d058',
    accent: ['#ff5a6a', '#ffd23a', '#ff9a30'], blooms: ['#ff4a7a', '#ffe03a', '#ff8a20', '#4aa8ff', '#ffffff', '#c860ff'],
    hills: ['#40d8b0', '#7a90ff', '#ffc860'], snow: false,
  },
  autumn: {
    grass: '#c4d44e', grassAlt: '#e8bc44', path: '#f6c490',
    canopy: ['#ff8a20', '#ffc830', '#f04a3a', '#d83a9a', '#ff6a50'], pine: '#1fa070', bush: '#ff9a30',
    accent: ['#ffe070', '#ff5a3a', '#ffb0a0'], blooms: ['#ff6a20', '#ffd030', '#d83a9a', '#ffffff', '#a04af0'],
    hills: ['#ffa040', '#e86a8a', '#b090ff'], snow: false,
  },
  winter: {
    grass: '#f4faff', grassAlt: '#cfe8ff', path: '#f0e4dc',
    canopy: ['#f4faff', '#d8ecff', '#ffe8f4'], pine: '#2fb0a0', bush: '#d8f0ff',
    accent: ['#8ad8ff', '#ff9ac8', '#ffffff'], blooms: ['#8ad8ff', '#ff9ac8', '#c8b0ff'],
    hills: ['#c8e4ff', '#d8d0ff', '#ffe0f0'], snow: true,
  },
};

export function terrainColor(t: Terrain, season: SeasonId, alt: boolean): string {
  const p = SEASON_PALETTE[season];
  switch (t) {
    case 'grass':
      return alt ? p.grassAlt : p.grass;
    case 'path':
      return p.path;
    case 'stone':
      return p.snow ? '#e4e4f4' : '#d4c8e8';
    case 'boards':
      return '#c88a52';
    case 'sand':
      return p.snow ? '#f2ece4' : '#ffe6a0';
    case 'water':
      return '#3cc8f0';
    case 'lake':
      return '#2aa8e8';
    case 'cliff':
      return p.snow ? '#dce6f8' : '#e8a078';
    case 'glassfloor':
      return '#e0c0a8';
    case 'minefloor':
      return '#9a78b0';
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
  { m: 0, sky: '#ffb8a0', sun: '#ffc08a', sunI: 1.2, hemiSky: '#ffd0c0', hemiI: 0.9, night: 0.2 },
  { m: 90, sky: '#78ccff', sun: '#fff0d0', sunI: 2.2, hemiSky: '#d0e8ff', hemiI: 1.1, night: 0 },
  { m: 600, sky: '#78ccff', sun: '#fff4d8', sunI: 2.3, hemiSky: '#d0e8ff', hemiI: 1.1, night: 0 },
  { m: 750, sky: '#ffa878', sun: '#ffa860', sunI: 1.6, hemiSky: '#ffc8b0', hemiI: 0.95, night: 0.15 },
  { m: 840, sky: '#a860b8', sun: '#ff7a8a', sunI: 0.7, hemiSky: '#b090d8', hemiI: 0.7, night: 0.6 },
  { m: 930, sky: '#2a2a6a', sun: '#98a8f0', sunI: 0.45, hemiSky: '#5a68b8', hemiI: 0.6, night: 1 },
  { m: 1200, sky: '#1c1c4a', sun: '#8898e0', sunI: 0.4, hemiSky: '#4a58a0', hemiI: 0.55, night: 1 },
];

const WEATHER_DIM: Record<WeatherId, { light: number; sky: string; mix: number }> = {
  sunny: { light: 1, sky: '#ffffff', mix: 0 },
  rain: { light: 0.7, sky: '#8aa8d0', mix: 0.5 },
  storm: { light: 0.55, sky: '#6a74a8', mix: 0.65 },
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
    hemiGround: new THREE.Color('#e8a8b0'),
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
