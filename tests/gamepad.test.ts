// The pure half of gamepad support (src/game/input.ts): dead zones, merging with the keyboard, and turning raw
// button state into press / repeat / release events. What each event does in the game is Input's business and
// needs a browser; the mapping below is what it reads.
import { describe, expect, it } from 'vitest';
import {
  GamepadSource,
  mergeMoves,
  PAD_BUTTONS,
  PAD_REPEAT_DELAY,
  PAD_REPEAT_RATE,
  STICK_DEADZONE,
  stickVector,
  type PadButton,
  type PadLike,
} from '../src/game/input';
import { pickNeighbour } from '../src/ui/padNav';

/** A fake pad whose state tests poke directly. */
function fakePad() {
  const pad = {
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    connected: true,
    mapping: 'standard',
  };
  const press = (name: PadButton, down = true) => {
    const index = Number(Object.entries(PAD_BUTTONS).find(([, n]) => n === name)![0]);
    pad.buttons[index] = { pressed: down, value: down ? 1 : 0 };
  };
  return { pad: pad as PadLike & typeof pad, press };
}

describe('stick dead zone', () => {
  it('reads zero inside the dead zone and full speed at full tilt', () => {
    expect(stickVector(0.1, 0.1)).toEqual([0, 0]);
    expect(stickVector(STICK_DEADZONE, 0)).toEqual([0, 0]);
    const [x, y] = stickVector(1, 0);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
  });

  it('keeps the direction, and a gentle push is a slow walk', () => {
    const [x, y] = stickVector(0.5, 0.5);
    expect(x).toBeCloseTo(y);
    expect(Math.hypot(x, y)).toBeGreaterThan(0);
    expect(Math.hypot(x, y)).toBeLessThan(0.6);
    expect(Math.hypot(...stickVector(0.35, 0))).toBeLessThan(Math.hypot(...stickVector(0.7, 0)));
  });

  it('never exceeds the unit circle, even for a square-gated diagonal', () => {
    for (const [ax, ay] of [[1, 1], [-1, 1], [0.9, -0.95]]) expect(Math.hypot(...stickVector(ax, ay))).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe('merging devices', () => {
  it('either device alone passes through', () => {
    expect(mergeMoves([[1, 0], [0, 0]])).toEqual([1, 0]);
    expect(mergeMoves([[0, 0], [0, -0.4]])).toEqual([0, -0.4]);
  });

  it('both at once add up and are capped at full speed', () => {
    const [x, y] = mergeMoves([[1, 0], [0.6, 0.8]]);
    expect(Math.hypot(x, y)).toBeCloseTo(1);
    expect(mergeMoves([[1, 0], [-1, 0]])).toEqual([0, 0]);
  });
});

describe('GamepadSource', () => {
  it('has the layout the controls promise', () => {
    expect(PAD_BUTTONS[0]).toBe('a');
    expect(PAD_BUTTONS[1]).toBe('b');
    expect(PAD_BUTTONS[2]).toBe('x');
    expect(PAD_BUTTONS[3]).toBe('y');
    expect(PAD_BUTTONS[4]).toBe('lb');
    expect(PAD_BUTTONS[5]).toBe('rb');
    expect(PAD_BUTTONS[9]).toBe('start');
  });

  it('reports presses once and releases once', () => {
    const { pad, press } = fakePad();
    const src = new GamepadSource(() => [pad]);
    expect(src.poll(0)).toEqual([]);
    press('a');
    expect(src.poll(16)).toEqual([{ button: 'a', phase: 'press', via: 'button' }]);
    expect(src.held('a')).toBe(true);
    expect(src.poll(32)).toEqual([]);
    press('a', false);
    expect(src.poll(48)).toEqual([{ button: 'a', phase: 'release', via: 'button' }]);
    expect(src.held('a')).toBe(false);
  });

  it('A repeats while held (to keep tilling), B does not', () => {
    const { pad, press } = fakePad();
    const src = new GamepadSource(() => [pad]);
    press('a');
    press('b');
    src.poll(0);
    expect(src.poll(PAD_REPEAT_DELAY - 1)).toEqual([]);
    expect(src.poll(PAD_REPEAT_DELAY)).toEqual([{ button: 'a', phase: 'repeat', via: 'button' }]);
    expect(src.poll(PAD_REPEAT_DELAY + PAD_REPEAT_RATE - 1)).toEqual([]);
    expect(src.poll(PAD_REPEAT_DELAY + PAD_REPEAT_RATE)).toEqual([{ button: 'a', phase: 'repeat', via: 'button' }]);
  });

  it('the d-pad is tagged as such, and triggers count past half way', () => {
    const { pad } = fakePad();
    const src = new GamepadSource(() => [pad]);
    pad.buttons[12] = { pressed: true, value: 1 };
    pad.buttons[7] = { pressed: false, value: 0.8 };
    const evs = src.poll(0);
    expect(evs).toContainEqual({ button: 'up', phase: 'press', via: 'dpad' });
    expect(evs).toContainEqual({ button: 'rt', phase: 'press', via: 'button' });
  });

  it('the left stick walks, and also reads as a d-pad for menus once pushed far enough', () => {
    const { pad } = fakePad();
    const src = new GamepadSource(() => [pad]);
    pad.axes[0] = 0.3;
    let evs = src.poll(0);
    expect(src.moveVector()[0]).toBeGreaterThan(0);
    expect(evs).toEqual([]);
    pad.axes[0] = 0.9;
    pad.axes[1] = -0.2;
    evs = src.poll(16);
    expect(evs).toEqual([{ button: 'right', phase: 'press', via: 'stick' }]);
    pad.axes[0] = 0;
    pad.axes[1] = 0;
    evs = src.poll(32);
    expect(evs).toEqual([{ button: 'right', phase: 'release', via: 'stick' }]);
    expect(src.moveVector()).toEqual([0, 0]);
  });

  it('the right stick is the zoom', () => {
    const { pad } = fakePad();
    const src = new GamepadSource(() => [pad]);
    pad.axes[3] = 1;
    src.poll(0);
    expect(src.lookVector()[1]).toBeGreaterThan(0.9);
    expect(src.moveVector()).toEqual([0, 0]);
  });

  it('unplugging releases everything that was held (a reel must not stay down)', () => {
    const { pad, press } = fakePad();
    let pads: (PadLike | null)[] = [pad];
    const src = new GamepadSource(() => pads);
    press('a');
    src.poll(0);
    expect(src.connected).toBe(true);
    pads = [null];
    expect(src.poll(16)).toEqual([{ button: 'a', phase: 'release', via: 'button' }]);
    expect(src.connected).toBe(false);
    expect(src.held('a')).toBe(false);
  });

  it('prefers a pad with the standard layout and skips disconnected ones', () => {
    const odd = fakePad();
    odd.pad.mapping = '';
    const std = fakePad();
    const gone = fakePad();
    gone.pad.connected = false;
    std.press('x');
    odd.press('y');
    const src = new GamepadSource(() => [gone.pad, odd.pad, std.pad]);
    expect(src.poll(0)).toEqual([{ button: 'x', phase: 'press', via: 'button' }]);
  });

  it('works with no pad at all', () => {
    const src = new GamepadSource(() => []);
    expect(src.poll(0)).toEqual([]);
    expect(src.moveVector()).toEqual([0, 0]);
    expect(src.connected).toBe(false);
  });
});

describe('menu focus', () => {
  const grid: [number, number][] = [
    [100, 100], [300, 100], // row 1
    [100, 200], [300, 200], // row 2
  ];

  it('moves to the nearest control in the direction pressed', () => {
    expect(pickNeighbour([100, 100], grid.slice(1), 1)).toBe(0); // right → (300,100)
    expect(pickNeighbour([100, 100], grid.slice(1), 2)).toBe(1); // down → (100,200)
    expect(pickNeighbour([300, 200], [grid[0], grid[1], grid[2]], 0)).toBe(1); // up → (300,100)
    expect(pickNeighbour([300, 200], [grid[0], grid[1], grid[2]], 3)).toBe(2); // left → (100,200)
  });

  it('prefers straight ahead over a nearer control off to the side', () => {
    expect(pickNeighbour([100, 100], [[140, 160], [100, 220]], 2)).toBe(1);
  });

  it('stays put at the edge', () => {
    expect(pickNeighbour([100, 100], [[300, 100], [100, 200]], 0)).toBe(-1);
    expect(pickNeighbour([100, 100], [[300, 100], [100, 200]], 3)).toBe(-1);
  });
});
