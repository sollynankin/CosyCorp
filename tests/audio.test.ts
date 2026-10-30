// The pure half of src/ui/audio.ts: which sound an event makes and what the ambient bed should be. The
// WebAudio engine itself needs a browser; these rules do not.
import { describe, expect, it } from 'vitest';
import { ambientMix, nightness, sceneOf, sfxFor, type Scene } from '../src/ui/audio';
import { newGame, seasonOf, type SimEvent } from '../src/sim';

const scene = (over: Partial<Scene> = {}): Scene => ({ weather: 'sunny', season: 'spring', night: 0, place: 'outdoors', dawn: false, ...over });

describe('sound effects', () => {
  it('every fx the sim emits has a sound', () => {
    const fx: Extract<SimEvent, { type: 'fx' }>['fx'][] = ['till', 'water', 'harvest', 'chop', 'mine', 'splash', 'poof', 'plant', 'place', 'sparkle'];
    for (const f of fx) expect(sfxFor({ type: 'fx', fx: f, map: 'farm', x: 0, y: 0 }), f).not.toBeNull();
  });

  it('the named sounds, catches and escapes each have one', () => {
    expect(sfxFor({ type: 'sound', name: 'bite' })).toBe('bite');
    expect(sfxFor({ type: 'sound', name: 'quest' })).toBe('quest');
    expect(sfxFor({ type: 'sound', name: 'ship' })).toBe('ship');
    expect(sfxFor({ type: 'catch', item: 'perch', q: 0, cm: 20, record: false })).toBe('catch');
    expect(sfxFor({ type: 'escape' })).toBe('escape');
  });

  it('bookkeeping events are silent', () => {
    expect(sfxFor({ type: 'toast', text: 'hi' })).toBeNull();
    expect(sfxFor({ type: 'gain', item: 'wood', n: 1, q: 0 })).toBeNull();
    expect(sfxFor({ type: 'sound', name: 'something-new' })).toBeNull();
  });
});

describe('ambient bed', () => {
  it('rain and storms bring rain, and only storms bring thunder', () => {
    expect(ambientMix(scene()).rain).toBe(0);
    expect(ambientMix(scene({ weather: 'rain' })).rain).toBeGreaterThan(0);
    expect(ambientMix(scene({ weather: 'storm' })).rain).toBeGreaterThan(ambientMix(scene({ weather: 'rain' })).rain);
    expect(ambientMix(scene({ weather: 'rain' })).rumble).toBe(0);
    expect(ambientMix(scene({ weather: 'storm' })).rumble).toBeGreaterThan(0);
  });

  it('birds sing by day and fall quiet in rain, at night and in deep winter; crickets take the night', () => {
    expect(ambientMix(scene()).birds).toBeGreaterThan(0.5);
    expect(ambientMix(scene({ weather: 'rain' })).birds).toBe(0);
    expect(ambientMix(scene({ night: 1 })).birds).toBeLessThan(0.05);
    expect(ambientMix(scene({ season: 'winter' })).birds).toBeLessThan(0.1);
    expect(ambientMix(scene({ season: 'summer', night: 1 })).crickets).toBeGreaterThan(0.5);
    expect(ambientMix(scene({ season: 'summer' })).crickets).toBe(0);
    expect(ambientMix(scene({ season: 'winter', night: 1 })).crickets).toBe(0);
  });

  it('dawn is the loudest chorus', () => {
    expect(ambientMix(scene({ dawn: true })).birds).toBeGreaterThan(ambientMix(scene()).birds);
  });

  it('the mine is all drips and low tones', () => {
    const m = ambientMix(scene({ place: 'mine' }));
    expect(m.drips).toBeGreaterThan(0);
    expect(m.birds + m.crickets + m.rain).toBe(0);
    expect(Math.max(...m.chord)).toBeLessThan(150);
  });

  it('snow brings wind and bells; night changes the key', () => {
    const snow = ambientMix(scene({ weather: 'snow', season: 'winter' }));
    expect(snow.bells).toBeGreaterThan(0);
    expect(snow.windCutoff).toBeLessThan(ambientMix(scene()).windCutoff);
    expect(ambientMix(scene({ night: 1 })).chord).not.toEqual(ambientMix(scene()).chord);
  });

  it('every level is a sane fraction', () => {
    for (const weather of ['sunny', 'rain', 'storm', 'snow'] as const)
      for (const season of ['spring', 'summer', 'autumn', 'winter'] as const)
        for (const place of ['outdoors', 'town', 'mine'] as const)
          for (const night of [0, 0.5, 1])
            for (const dawn of [false, true]) {
              const m = ambientMix({ weather, season, night, place, dawn });
              for (const k of ['wind', 'rain', 'rumble', 'crickets', 'drips', 'bells', 'pad', 'pluck'] as const) {
                expect(m[k], `${k} ${weather} ${season} ${place}`).toBeGreaterThanOrEqual(0);
                expect(m[k], `${k} ${weather} ${season} ${place}`).toBeLessThanOrEqual(1);
              }
              expect(m.birds).toBeGreaterThanOrEqual(0);
              expect(m.birds).toBeLessThanOrEqual(1.5);
              expect(m.chord.length).toBeGreaterThan(0);
              expect(m.scale.length).toBeGreaterThan(0);
            }
  });

  it('nightness rises smoothly through dusk', () => {
    expect(nightness(0)).toBe(0);
    expect(nightness(600)).toBe(0);
    expect(nightness(1000)).toBe(1);
    expect(nightness(820)).toBeGreaterThan(0.2);
    expect(nightness(820)).toBeLessThan(0.8);
    expect(nightness(900)).toBeGreaterThan(nightness(800));
  });

  it('reads the scene off the game state', () => {
    const s = newGame(1);
    s.weather = 'storm';
    s.minute = 1000;
    s.player.map = 'mine3';
    const sc = sceneOf(s, seasonOf(s.day));
    expect(sc).toMatchObject({ weather: 'storm', place: 'mine', dawn: false });
    expect(sc.night).toBe(1);
    s.player.map = 'town';
    expect(sceneOf(s, 'spring').place).toBe('town');
  });
});

describe('audio stays out of the sim', () => {
  it('nothing under src/sim or src/world mentions the audio module', () => {
    const sources = import.meta.glob(['../src/sim/**/*.ts', '../src/world/**/*.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(sources).length).toBeGreaterThan(20);
    for (const [file, text] of Object.entries(sources)) expect(/audio|AudioContext|WebAudio/i.test(text), file).toBe(false);
  });
});
