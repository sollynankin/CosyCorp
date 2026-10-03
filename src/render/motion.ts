// Frame-rate independent easing for the view. Render-only: the sim never sees any of this.

/** Exponential approach: moves `current` toward `target`, covering 1 − e^−1 of the gap every 1/lambda seconds. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** The same for angles (radians), turning the short way round. */
export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return current + d * (1 - Math.exp(-lambda * dt));
}

/** Yaw (radians) that points a character that faces +z at yaw 0 along map direction (dx, dy). */
export const yawOf = (dx: number, dy: number): number => Math.atan2(dx, dy);

/** Yaw for the sim's four facings (0=N 1=E 2=S 3=W). */
export const FACING_YAW = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];
