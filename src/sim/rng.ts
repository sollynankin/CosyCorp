// Seeded RNG (mulberry32). Its state lives in GameState.rng so it survives save/load.
// Never use Math.random() inside src/sim.

export function rngNext(holder: { rng: number }): number {
  let t = (holder.rng = (holder.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max] inclusive. */
export function rngInt(holder: { rng: number }, min: number, max: number): number {
  return min + Math.floor(rngNext(holder) * (max - min + 1));
}

export function rngPick<T>(holder: { rng: number }, list: readonly T[]): T {
  return list[Math.floor(rngNext(holder) * list.length)];
}

/** Weighted pick over [key, weight] pairs; weights need not sum to 1. */
export function rngWeighted<K>(holder: { rng: number }, pairs: [K, number][]): K {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rngNext(holder) * total;
  for (const [k, w] of pairs) {
    if (r < w) return k;
    r -= w;
  }
  return pairs[pairs.length - 1][0];
}
