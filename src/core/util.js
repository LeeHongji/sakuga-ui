// Small shared helpers. Nothing here touches the DOM at import time.
import { enter, leave } from './config.js';
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const E = {
  outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outQuad: t => 1 - (1 - t) * (1 - t),
  inQuad: t => t * t,
  inCubic: t => t * t * t,
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export const newR = () => rng((Math.random() * 4e9) | 0);
export const now = () => performance.now() / 1000;

// page-space rect of an element (one layout read; call it once per interaction, not per frame)
export function rectOf(el) {
  const b = el.getBoundingClientRect(), x = scrollX, y = scrollY;
  return { l: b.left + x, t: b.top + y, r: b.right + x, b: b.bottom + y, w: b.width, h: b.height, cx: b.left + x + b.width / 2, cy: b.top + y + b.height / 2 };
}
// a cancellable list of timeouts: at(ms, fn), at.clear(). With a host, each callback runs under that element's effect region
export function timeline(host) {
  let ts = [];
  const at = (ms, fn) => { ts.push(setTimeout(host ? () => { const was = enter(host); try { fn(); } finally { leave(was); } } : fn, ms)); };
  at.clear = () => { ts.forEach(clearTimeout); ts = []; };
  return at;
}
