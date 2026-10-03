// Shared materials. Never create a material per frame or per instance; reuse these.
import * as THREE from 'three';

/** The material for every merged, vertex-coloured mesh (crops, trees, machines, buildings, characters). */
export const vertexMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });

/** Like vertexMat but glows at night (windows, lamps). emissiveIntensity follows the night factor. */
export const glowMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.6,
  emissive: new THREE.Color('#ffc870'),
  emissiveIntensity: 0,
});

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function mat(color: THREE.ColorRepresentation, opts: { transparent?: boolean; opacity?: number; emissive?: string } = {}): THREE.MeshStandardMaterial {
  const key = `${new THREE.Color(color).getHexString()}|${opts.transparent ? 1 : 0}|${opts.opacity ?? 1}|${opts.emissive ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.9,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0),
    });
    cache.set(key, m);
  }
  return m;
}

/** Unlit material for overlays (Flow view, cursor). */
export function flatMat(color: THREE.ColorRepresentation, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false });
}

/** Unlit, tinted per instance: status lamps glow the same day and night. */
export const lampMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

/** Flow overlay layers: unlit, instance-tinted, translucent, drawn over the ground. */
export const overlayFaint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false, depthTest: false });
export const overlayStrong = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false, depthTest: false });
export const overlayDim = new THREE.MeshBasicMaterial({ color: '#0a0c18', transparent: true, opacity: 0.5, depthWrite: false, depthTest: false });

/** Build-mode ghost: translucent, tinted green (ok) or red (blocked). */
export const ghostMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.55, emissive: new THREE.Color('#000000'), depthWrite: false });
