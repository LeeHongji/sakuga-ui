// One global configuration shared by the effect engine, lettering, sound and every component.
export const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const config = {
  fx: 'full',          // 'full' | 'lite' | 'off'   how much effect each interaction spawns
  fps: 60,             // 60 | 30 | 24 | 12         effect frame rate: 60 follows the display, 30 is even twos, 12 is choppy on purpose
  sound: true,
  volume: 0.5,
  lettering: true,     // katakana sound-effect words
  fonts: 'google',     // 'google' loads the display faces from Google Fonts, 'system' uses local fallbacks only
  maxParticles: 240,   // hard cap on live effect items; extra spawns are dropped
  maxWords: 12,        // hard cap on lettering on screen
  adaptive: true,      // lower particle counts automatically when frames get slow
};

const subs = new Set();
export function configure(patch) { Object.assign(config, patch); subs.forEach(f => f(config)); return config; }
export function onConfig(f) { subs.add(f); return () => subs.delete(f); }
/* A region can turn the effects down for everything inside it: <section data-sk-fx="lite"> or "off".
   The nearest marked ancestor wins ("full" lifts an outer mark again), and no region goes above the global setting.
   `cap` is the ceiling of the component that is acting now: set from the target of each user event, and around
   every attribute change and timer of an SkElement. */
const CAPS = { off: 0, lite: 0.5 };
let cap = 1;
export function regionOf(el) {
  for (let n = el; n; n = n.parentNode || n.host) { const v = n.dataset && n.dataset.skFx; if (v) return v in CAPS ? CAPS[v] : 1; }
  return 1;
}
export function enter(el) { const was = cap; cap = regionOf(el); return was; }
export function leave(was) { cap = was; }
// 0..1 multiplier for effect amount
export const level = () => Math.min(cap, reduced || config.fx === 'off' ? 0 : config.fx === 'lite' ? 0.5 : 1);
