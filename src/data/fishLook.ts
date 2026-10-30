// How each fish is drawn (icons, the catch bar, the Fishing tab): body shape, colours and a pattern.
// Content only; the drawing code is ui/fishArt.ts.

export type FishShape = 'standard' | 'slim' | 'deep' | 'eel' | 'crayfish';

export type FishPattern =
  | 'bars' //     dark vertical bars (perch)
  | 'spots' //    spots on the flank (trout, sunfish)
  | 'stripe' //   one lateral stripe
  | 'rainbow' //  broad pink stripe and black speckles
  | 'blotches' // koi patches
  | 'scales' //   scale arcs (carp, bream)
  | 'band' //     wavy dark band (bass)
  | 'speckle' //  fine speckles (salmon, catfish)
  | 'dashes' //   light dashes (pike)
  | 'mottle' //   soft blotches (walleye)
  | 'flames' //   flame tongues (emberscale)
  | 'frost' //    snowflakes (frostfin)
  | 'stars' //    sparkles (moonfin)
  | 'scutes' //   bony plates (sturgeon)
  | 'glow'; //    glowing dots and a halo (glowfin)

export interface FishLook {
  shape: FishShape;
  /** back colour, belly colour, fin colour and the pattern's colour */
  body: string;
  belly: string;
  fin: string;
  accent: string;
  pattern: FishPattern;
  /** a second pattern colour where one is not enough */
  accent2?: string;
  /** barbels (catfish) */
  whiskers?: boolean;
}

/** What you see on the line while reeling: every fish looks like this until it is landed. */
export const GENERIC_FISH_LOOK: FishLook = { shape: 'standard', body: '#7ab4e0', belly: '#e8f4ff', fin: '#5a94d0', accent: '#4a80c0', pattern: 'stripe' };

export const FISH_LOOKS: Record<string, FishLook> = {
  minnow: { shape: 'slim', body: '#8ad8f8', belly: '#ffffff', fin: '#ffa0c0', accent: '#2a78d8', pattern: 'stripe' },
  perch: { shape: 'standard', body: '#9ad840', belly: '#fff088', fin: '#ff7a2a', accent: '#2a6a2a', pattern: 'bars' },
  carp: { shape: 'deep', body: '#f0a830', belly: '#fff0a8', fin: '#e8602a', accent: '#b87010', pattern: 'scales', whiskers: true },
  sunfish: { shape: 'deep', body: '#ffc82a', belly: '#ff8a2a', fin: '#ff5a2a', accent: '#28b8f0', accent2: '#ff4a3a', pattern: 'spots' },
  bream: { shape: 'deep', body: '#a8c8f0', belly: '#ffffff', fin: '#6a98e0', accent: '#5a80c0', pattern: 'scales' },
  crayfish: { shape: 'crayfish', body: '#f04a2a', belly: '#ffb070', fin: '#d82a1a', accent: '#ffe0a0', pattern: 'speckle' },
  smelt: { shape: 'slim', body: '#a8e0ff', belly: '#ffffff', fin: '#88c8f0', accent: '#ffffff', accent2: '#4a98e0', pattern: 'stripe' },
  brook_trout: { shape: 'standard', body: '#5a9a3a', belly: '#ff9a4a', fin: '#ff6a3a', accent: '#ff3a5a', accent2: '#98e8ff', pattern: 'spots' },
  rainbow_trout: { shape: 'standard', body: '#78d0a8', belly: '#fff0f0', fin: '#ffa0c8', accent: '#ff6aa8', accent2: '#2a2a3a', pattern: 'rainbow' },
  largemouth_bass: { shape: 'standard', body: '#6ac848', belly: '#f0ffc0', fin: '#48a838', accent: '#1a5a2a', pattern: 'band' },
  salmon: { shape: 'slim', body: '#ff8a7a', belly: '#ffd8c8', fin: '#f04a6a', accent: '#8a1a3a', pattern: 'speckle' },
  koi: { shape: 'deep', body: '#fff4e8', belly: '#ffe8d0', fin: '#ffd0a0', accent: '#ff6a1a', accent2: '#2a2a3a', pattern: 'blotches', whiskers: true },
  pike: { shape: 'slim', body: '#4ab858', belly: '#f0f4a0', fin: '#e8a830', accent: '#f4f488', pattern: 'dashes' },
  walleye: { shape: 'standard', body: '#d8b83a', belly: '#fff4c0', fin: '#c89828', accent: '#6a5018', pattern: 'mottle' },
  catfish: { shape: 'standard', body: '#8a78d0', belly: '#e0d8f8', fin: '#6a5ab0', accent: '#3a2a78', pattern: 'speckle', whiskers: true },
  emberscale: { shape: 'standard', body: '#ff5a2a', belly: '#ffc83a', fin: '#ff2a3a', accent: '#ffee70', pattern: 'flames' },
  frostfin: { shape: 'standard', body: '#88d8ff', belly: '#ffffff', fin: '#e8f8ff', accent: '#ffffff', accent2: '#58a8f0', pattern: 'frost' },
  eel: { shape: 'eel', body: '#38a878', belly: '#f0e898', fin: '#2a8a68', accent: '#a8f8c8', pattern: 'spots' },
  moonfin: { shape: 'deep', body: '#8a78f0', belly: '#e8d8ff', fin: '#c0a8ff', accent: '#fff8a0', pattern: 'stars' },
  sturgeon: { shape: 'slim', body: '#7088b0', belly: '#e8ecf8', fin: '#4a608a', accent: '#c8d4f0', pattern: 'scutes', whiskers: true },
  glowfin: { shape: 'standard', body: '#20e0c0', belly: '#c8fff0', fin: '#6affe0', accent: '#ffffe0', pattern: 'glow' },
};
