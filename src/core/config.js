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
// 0..1 multiplier for effect amount
export const level = () => (reduced || config.fx === 'off' ? 0 : config.fx === 'lite' ? 0.5 : 1);
