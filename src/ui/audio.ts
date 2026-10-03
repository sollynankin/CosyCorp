// Procedural audio (WebAudio only, no files). Short synthesised sounds for the sim's events, and a soft ambient
// bed that follows the weather, the time of day, the season and the place. Everything here is browser-side: it
// listens to SimEvents and reads state, never writes it, and nothing in src/sim knows it exists.
//
// The pure parts (which sound an event makes, what the ambient bed should be) are plain functions so tests can
// check them without an AudioContext; the engine below just turns those decisions into oscillators and noise.
import type { SeasonId, WeatherId } from '../data/types';
import { mineFloorNumber } from '../world';
import type { GameState } from '../sim/state';
import type { SimEvent } from '../sim/context';

// ---- What makes a sound ------------------------------------------------------------------------------------

export type SfxName =
  | 'till'
  | 'water'
  | 'plant'
  | 'harvest'
  | 'chop'
  | 'mine'
  | 'splash'
  | 'poof'
  | 'place'
  | 'sparkle'
  | 'bite'
  | 'quest'
  | 'ship'
  | 'catch'
  | 'escape'
  | 'chime';

const FX_SOUNDS: Record<string, SfxName> = {
  till: 'till',
  water: 'water',
  plant: 'plant',
  harvest: 'harvest',
  chop: 'chop',
  mine: 'mine',
  splash: 'splash',
  poof: 'poof',
  place: 'place',
  sparkle: 'sparkle',
};
const NAMED_SOUNDS: Record<string, SfxName> = { bite: 'bite', quest: 'quest', ship: 'ship' };

/** The sound a sim event makes, or null when it is silent. */
export function sfxFor(e: SimEvent): SfxName | null {
  switch (e.type) {
    case 'fx':
      return FX_SOUNDS[e.fx] ?? null;
    case 'sound':
      return NAMED_SOUNDS[e.name] ?? null;
    case 'catch':
      return 'catch';
    case 'escape':
      return 'escape';
    case 'dayEnd':
      return 'chime';
    default:
      return null;
  }
}

// ---- What the ambient bed sounds like -------------------------------------------------------------------

export type Place = 'outdoors' | 'town' | 'mine';

export interface Scene {
  weather: WeatherId;
  season: SeasonId;
  /** 0 = full day, 1 = full night */
  night: number;
  place: Place;
  /** the first couple of hours after dawn: the birds are at their loudest */
  dawn: boolean;
}

/** Target levels for each layer of the bed (0..1), plus the pad's chord. */
export interface AmbientMix {
  /** brown-noise wind and how bright it is (low-pass cutoff, Hz) */
  wind: number;
  windCutoff: number;
  rain: number;
  rumble: number;
  birds: number;
  crickets: number;
  drips: number;
  bells: number;
  /** the slow pad under everything, and the notes (Hz) it holds */
  pad: number;
  chord: number[];
  /** a music-box pluck now and then, from this scale (Hz) */
  pluck: number;
  scale: number[];
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 0 in daylight, rising through dusk to 1 once it is properly dark (minutes since 06:00). */
export function nightness(minute: number): number {
  return smooth(720, 930, minute);
}

// Low-octave chords for the pad and pentatonic scales for the plucks: bright by day, soft minor by night.
const C_MAJ7 = [130.81, 196.0, 246.94, 329.63];
const A_MIN9 = [110.0, 164.81, 220.0, 293.66];
const D_MIN = [146.83, 174.61, 220.0, 293.66];
const MINE_FIFTHS = [65.41, 98.0, 130.81];
const C_PENT = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
const A_PENT = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

export function ambientMix(scene: Scene): AmbientMix {
  const { weather, season, night, place, dawn } = scene;
  const wet = weather === 'rain' || weather === 'storm';
  const day = 1 - night;
  if (place === 'mine') {
    return { wind: 0.05, windCutoff: 200, rain: 0, rumble: 0.12, birds: 0, crickets: 0, drips: 1, bells: 0, pad: 0.6, chord: MINE_FIFTHS, pluck: 0.15, scale: A_PENT.map((f) => f / 2) };
  }
  const seasonBirds = { spring: 1, summer: 0.75, autumn: 0.4, winter: 0.05 }[season];
  const birds = (wet || weather === 'snow' ? 0 : seasonBirds * day * (dawn ? 1.4 : 1)) * (place === 'town' ? 0.7 : 1);
  const crickets = wet || weather === 'snow' || season === 'winter' ? 0 : night * ({ spring: 0.5, summer: 1, autumn: 0.6, winter: 0 }[season]);
  const wind = weather === 'storm' ? 0.7 : weather === 'snow' ? 0.4 : wet ? 0.25 : season === 'autumn' ? 0.3 : 0.18;
  const windCutoff = weather === 'storm' ? 900 : weather === 'snow' ? 350 : 500;
  const chord = weather === 'storm' ? D_MIN : night > 0.5 ? A_MIN9 : C_MAJ7;
  return {
    wind,
    windCutoff,
    rain: weather === 'storm' ? 0.85 : weather === 'rain' ? 0.55 : 0,
    rumble: weather === 'storm' ? 0.35 : 0,
    birds,
    crickets,
    drips: 0,
    bells: weather === 'snow' || (season === 'winter' && night > 0.3) ? 0.6 : 0,
    pad: wet ? 0.45 : 0.55,
    chord,
    pluck: wet ? 0.5 : weather === 'snow' ? 0.8 : 0.7,
    scale: night > 0.5 || weather === 'storm' ? A_PENT : C_PENT,
  };
}

/** The scene for a game state: what the sim says is the weather, the clock and the map. */
export function sceneOf(state: GameState, season: SeasonId): Scene {
  const minute = state.minute + state.subTick / 5;
  const map = state.player.map;
  return {
    weather: state.weather,
    season,
    night: nightness(minute),
    place: mineFloorNumber(map) > 0 ? 'mine' : map === 'town' ? 'town' : 'outdoors',
    dawn: minute < 150,
  };
}

// ---- The engine -------------------------------------------------------------------------------------------

const MAX_VOICES = 32;
/** The same sound is not retriggered more often than this (seconds): a hoe swing is one sound, not three. */
const MIN_GAP = 0.045;

type NoiseKind = 'white' | 'brown';
type Ctx = AudioContext;

export class AudioEngine {
  private ctx: Ctx | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private meterNode!: AnalyserNode;
  private noise: Record<NoiseKind, AudioBuffer> | null = null;
  private voices = 0;
  private lastPlayed = new Map<SfxName, number>();
  private sceneKey = '';
  private mix: AmbientMix | null = null;
  // ambient layers
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private rainGain!: GainNode;
  private rumbleGain!: GainNode;
  private padGain!: GainNode;
  private padOscs: OscillatorNode[] = [];
  private timer: number | undefined;
  private next = { bird: 0, cricket: 0, drip: 0, pluck: 0, bell: 0 };
  private volumeValue: number;

  constructor(volume = 0.6, private readonly onGesture?: () => void) {
    this.volumeValue = clamp01(volume);
    if (typeof window === 'undefined') return;
    // Browsers only allow sound after a gesture: wait for the first click, key or touch.
    const unlock = () => {
      this.unlock();
      for (const t of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(t, unlock, true);
    };
    for (const t of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(t, unlock, true);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  get volume(): number {
    return this.volumeValue;
  }

  /** Slider position 0..1. Perceived loudness is roughly squared, so the slider is too. */
  setVolume(v: number): void {
    this.volumeValue = clamp01(v);
    if (this.ctx) this.master.gain.setTargetAtTime(this.volumeValue * this.volumeValue, this.ctx.currentTime, 0.03);
  }

  /** Creates the context (and starts the ambient bed) if it does not exist yet. Safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.build(ctx);
    this.onGesture?.();
    if (ctx.state === 'suspended') void ctx.resume();
    this.timer = window.setInterval(() => this.tickAmbient(), 120);
  }

  /** RMS level of everything being played, 0..1 (for tests and debugging). */
  level(): number {
    if (!this.ctx) return 0;
    const buf = new Float32Array(this.meterNode.fftSize);
    this.meterNode.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
  }

  get running(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  dispose(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    void this.ctx?.close();
    this.ctx = null;
  }

  // ---- Wiring -------------------------------------------------------------------------------------------

  private build(ctx: Ctx): void {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = this.volumeValue * this.volumeValue;
    this.meterNode = ctx.createAnalyser();
    this.meterNode.fftSize = 2048;
    this.master.connect(comp).connect(ctx.destination);
    comp.connect(this.meterNode);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = 0.7;
    this.sfxBus.connect(this.master);
    this.ambBus.connect(this.master);

    // A soft feedback echo, so small sounds bloom a little instead of ticking.
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.21;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2400;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    for (const bus of [this.sfxBus, this.ambBus]) bus.connect(echo);
    echo.connect(damp).connect(feedback).connect(echo);
    damp.connect(wet).connect(this.master);

    this.noise = { white: makeNoise(ctx, 'white'), brown: makeNoise(ctx, 'brown') };

    // Wind: looped brown noise through a low-pass.
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 500;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.loopNoise('brown').connect(this.windFilter).connect(this.windGain).connect(this.ambBus);

    // Rain: looped white noise, band-limited.
    const rainHp = ctx.createBiquadFilter();
    rainHp.type = 'highpass';
    rainHp.frequency.value = 1200;
    const rainLp = ctx.createBiquadFilter();
    rainLp.type = 'lowpass';
    rainLp.frequency.value = 7500;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    this.loopNoise('white').connect(rainHp).connect(rainLp).connect(this.rainGain).connect(this.ambBus);

    // Thunder rumble.
    const rumbleLp = ctx.createBiquadFilter();
    rumbleLp.type = 'lowpass';
    rumbleLp.frequency.value = 110;
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    this.loopNoise('brown').connect(rumbleLp).connect(this.rumbleGain).connect(this.ambBus);

    // The pad: four slow oscillators through a low-pass, breathing with a very slow tremolo.
    const padLp = ctx.createBiquadFilter();
    padLp.type = 'lowpass';
    padLp.frequency.value = 900;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    const breathe = ctx.createGain();
    breathe.gain.value = 1;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.22;
    lfo.connect(lfoDepth).connect(breathe.gain);
    lfo.start();
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = C_MAJ7[i];
      o.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain();
      g.gain.value = 0.07;
      o.connect(g).connect(padLp);
      o.start();
      this.padOscs.push(o);
    }
    padLp.connect(breathe).connect(this.padGain).connect(this.ambBus);
  }

  private loopNoise(kind: NoiseKind): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise![kind];
    src.loop = true;
    src.start(0, Math.random() * 1.5);
    return src;
  }

  // ---- The ambient bed ------------------------------------------------------------------------------------

  /** Call every frame (or whenever convenient) with the current state; it only acts when the scene changes. */
  update(state: GameState, season: SeasonId): void {
    if (!this.ctx) return;
    const scene = sceneOf(state, season);
    // Quantise the night factor so the bed drifts rather than being re-targeted every frame.
    const key = `${scene.weather}|${scene.season}|${scene.place}|${scene.dawn}|${Math.round(scene.night * 10)}`;
    if (key === this.sceneKey) return;
    this.sceneKey = key;
    this.applyMix(ambientMix(scene));
  }

  private applyMix(m: AmbientMix): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const slow = 2.5;
    this.mix = m;
    this.windGain.gain.setTargetAtTime(m.wind * 0.16, t, slow);
    this.windFilter.frequency.setTargetAtTime(m.windCutoff, t, slow);
    this.rainGain.gain.setTargetAtTime(m.rain * 0.1, t, slow);
    this.rumbleGain.gain.setTargetAtTime(m.rumble * 0.5, t, slow);
    this.padGain.gain.setTargetAtTime(m.pad * 0.7, t, slow);
    this.padOscs.forEach((o, i) => o.frequency.setTargetAtTime(m.chord[i % m.chord.length], t, 4));
  }

  private tickAmbient(): void {
    const ctx = this.ctx;
    const m = this.mix;
    if (!ctx || !m || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (m.birds > 0.02 && t >= this.next.bird) {
      this.chirp(t + 0.02, m.birds);
      this.next.bird = t + (2.5 + Math.random() * 5) / m.birds;
    }
    if (m.crickets > 0.02 && t >= this.next.cricket) {
      this.cricket(t + 0.02, m.crickets);
      this.next.cricket = t + 0.9 + Math.random() * 1.4;
    }
    if (m.drips > 0.02 && t >= this.next.drip) {
      this.drip(t + 0.02);
      this.next.drip = t + 1.8 + Math.random() * 4.5;
    }
    if (m.pluck > 0.02 && t >= this.next.pluck) {
      this.pluckNote(t + 0.02, m);
      this.next.pluck = t + 2.2 + Math.random() * 4.5;
    }
    if (m.bells > 0.02 && t >= this.next.bell) {
      this.bell(t + 0.02, m.bells);
      this.next.bell = t + 5 + Math.random() * 7;
    }
  }

  private chirp(t: number, level: number): void {
    const notes = 2 + Math.floor(Math.random() * 3);
    const base = 2300 + Math.random() * 1300;
    for (let i = 0; i < notes; i++) {
      const f0 = base * (1 + Math.random() * 0.25);
      this.osc('sine', f0, f0 * (Math.random() < 0.5 ? 1.3 : 0.8), t + i * 0.11, 0.08, 0.05 * level, this.ambBus);
    }
  }

  private cricket(t: number, level: number): void {
    for (let i = 0; i < 3; i++) this.osc('sine', 4300 + Math.random() * 120, 4300, t + i * 0.055, 0.03, 0.022 * level, this.ambBus, 0.004);
  }

  private drip(t: number): void {
    const f = 900 + Math.random() * 500;
    this.osc('sine', f, f * 0.55, t, 0.14, 0.08, this.ambBus);
    this.osc('sine', f * 0.9, f * 0.5, t + 0.32, 0.12, 0.03, this.ambBus);
  }

  private pluckNote(t: number, m: AmbientMix): void {
    const f = m.scale[Math.floor(Math.random() * m.scale.length)];
    this.osc('triangle', f, f, t, 1.6, 0.05 * m.pluck, this.ambBus, 0.004);
    this.osc('sine', f * 2, f * 2, t, 0.9, 0.015 * m.pluck, this.ambBus, 0.004);
  }

  private bell(t: number, level: number): void {
    const f = Math.random() < 0.5 ? 1760 : 2093;
    this.osc('sine', f, f, t, 2.4, 0.03 * level, this.ambBus, 0.003);
    this.osc('sine', f * 2.76, f * 2.76, t, 1.2, 0.008 * level, this.ambBus, 0.003);
  }

  // ---- Sound effects -----------------------------------------------------------------------------------------

  /** Plays the sound for a sim event, if it has one. */
  play(e: SimEvent): void {
    const name = sfxFor(e);
    if (name) this.sfx(name);
  }

  sfx(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.volumeValue <= 0) return;
    const t = ctx.currentTime;
    if (t - (this.lastPlayed.get(name) ?? -1) < MIN_GAP) return;
    if (this.voices > MAX_VOICES) return;
    this.lastPlayed.set(name, t);
    const j = 1 + (Math.random() - 0.5) * 0.12;
    const bus = this.sfxBus;
    const o = (type: OscillatorType, f0: number, f1: number, at: number, dur: number, vol: number) => this.osc(type, f0, f1, t + at, dur, vol, bus);
    const n = (kind: NoiseKind, at: number, dur: number, vol: number, ft: BiquadFilterType, f0: number, f1: number, q = 1) =>
      this.hiss(kind, t + at, dur, vol, ft, f0, f1, q, bus);
    switch (name) {
      case 'till':
        n('brown', 0, 0.16, 0.7, 'lowpass', 700, 220);
        o('sine', 140 * j, 60, 0, 0.13, 0.4);
        break;
      case 'water':
        n('white', 0, 0.34, 0.22, 'bandpass', 1900, 1100, 0.8);
        o('sine', 500 * j, 900, 0.1, 0.06, 0.06);
        o('sine', 620 * j, 1050, 0.2, 0.06, 0.05);
        break;
      case 'plant':
        n('brown', 0, 0.1, 0.45, 'lowpass', 520, 300);
        o('sine', 230 * j, 150, 0, 0.09, 0.22);
        break;
      case 'harvest':
        o('sine', 520 * j, 930 * j, 0, 0.1, 0.3);
        o('triangle', 1040 * j, 1240 * j, 0.06, 0.12, 0.12);
        n('white', 0, 0.05, 0.05, 'highpass', 3000, 3000);
        break;
      case 'chop':
        o('triangle', 250 * j, 110, 0, 0.1, 0.5);
        n('white', 0, 0.035, 0.3, 'bandpass', 1800, 1200);
        break;
      case 'mine':
        o('triangle', 1100 * j, 700, 0, 0.08, 0.24);
        o('sine', 1650 * j, 1500, 0, 0.1, 0.12);
        n('white', 0, 0.045, 0.25, 'bandpass', 3000, 2000);
        break;
      case 'splash':
        n('white', 0, 0.4, 0.35, 'bandpass', 900, 420, 0.7);
        o('sine', 300 * j, 150, 0, 0.22, 0.15);
        break;
      case 'poof':
        n('brown', 0, 0.26, 0.5, 'lowpass', 900, 180);
        o('sine', 210, 90, 0, 0.2, 0.18);
        break;
      case 'place':
        o('sine', 155 * j, 80, 0, 0.16, 0.5);
        n('brown', 0, 0.06, 0.35, 'lowpass', 420, 300);
        o('triangle', 620 * j, 520, 0, 0.04, 0.1);
        break;
      case 'sparkle':
        [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => {
          o('sine', f * j, f * j, i * 0.07, 0.3, 0.1);
          o('triangle', f * 2 * j, f * 2 * j, i * 0.07, 0.15, 0.025);
        });
        break;
      case 'bite':
        o('sine', 660, 720, 0, 0.1, 0.3);
        o('sine', 880, 940, 0.1, 0.14, 0.3);
        break;
      case 'quest':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          o('triangle', f, f, i * 0.11, 0.55, 0.2);
          o('sine', f * 2, f * 2, i * 0.11, 0.3, 0.04);
        });
        break;
      case 'ship':
        o('sine', 1760, 1760, 0, 0.2, 0.22);
        o('sine', 2349, 2349, 0.06, 0.26, 0.2);
        o('triangle', 3520, 3520, 0.12, 0.12, 0.06);
        break;
      case 'catch':
        o('sine', 400, 1200, 0, 0.22, 0.22);
        o('sine', 1568, 1568, 0.2, 0.55, 0.24);
        o('sine', 2093, 2093, 0.28, 0.6, 0.18);
        break;
      case 'escape':
        o('sine', 520, 260, 0, 0.36, 0.24);
        o('sine', 390, 180, 0.16, 0.4, 0.2);
        break;
      case 'chime':
        [783.99, 659.25, 523.25].forEach((f, i) => {
          o('sine', f, f, i * 0.28, 1.2, 0.16);
          o('triangle', f * 2, f * 2, i * 0.28, 0.6, 0.03);
        });
        break;
    }
  }

  // ---- Building blocks -------------------------------------------------------------------------------------

  /** One enveloped oscillator, optionally gliding from f0 to f1. */
  private osc(type: OscillatorType, f0: number, f1: number, at: number, dur: number, vol: number, dest: AudioNode, attack = 0.006): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(dest);
    o.start(at);
    o.stop(at + dur + 0.05);
    this.voices++;
    o.onended = () => {
      this.voices--;
      g.disconnect();
    };
  }

  /** A burst of filtered noise. */
  private hiss(kind: NoiseKind, at: number, dur: number, vol: number, ft: BiquadFilterType, f0: number, f1: number, q: number, dest: AudioNode): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise![kind];
    const f = ctx.createBiquadFilter();
    f.type = ft;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.05);
    this.voices++;
    src.onended = () => {
      this.voices--;
      g.disconnect();
    };
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
}

/** Two seconds of looping noise. Brown noise is integrated white noise, scaled back up to a usable level. */
function makeNoise(ctx: Ctx, kind: NoiseKind): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w;
    else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  // Cross-fade the loop point so the loop does not click.
  const fade = Math.floor(ctx.sampleRate * 0.02);
  for (let i = 0; i < fade; i++) {
    const a = i / fade;
    d[i] = d[i] * a + d[len - fade + i] * (1 - a);
  }
  return buf;
}
