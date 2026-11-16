/* Shared squash-and-stretch presets. All of them animate transform-like properties only,
   so they run on the compositor and never trigger layout. */
import { reduced, level } from './config.js';
import { SPRINGS } from './spring.js';

const K = {
  press: [[{ scale: '1 1' }, { scale: '1.08 .8', offset: 0.3 }, { scale: '.96 1.07', offset: 0.65 }, { scale: '1 1' }], 260],
  squish: [[{ scale: '1 1' }, { scale: '1.14 .8', offset: 0.3 }, { scale: '.93 1.12', offset: 0.6 }, { scale: '1 1' }], 240],
  pop: [[{ scale: '.4' }, { scale: '1.28', offset: 0.5 }, { scale: '.93', offset: 0.78 }, { scale: '1' }], 280],
  land: [[{ scale: '1.28 .7' }, { scale: '.92 1.12', offset: 0.5 }, { scale: '1 1' }], 220],
  beat: [[{ scale: '1' }, { scale: '.5', offset: 0.22 }, { scale: '1.6', offset: 0.52 }, { scale: '.9', offset: 0.78 }, { scale: '1' }], 360],
  dip: [[{ scale: '1' }, { scale: '.8', offset: 0.4 }, { scale: '1' }], 180],
  // something already on screen reacting to a change: it never shrinks far, unlike `pop`, which is an entrance.
  // Uses transform so it multiplies with whatever scale the element is resting at (a hovered star, say).
  pulse: [[{ transform: 'scale(1)' }, { transform: 'scale(.88)', offset: 0.25 }, { transform: 'scale(1.12)', offset: 0.6 }, { transform: 'scale(1)' }], 220],
  nope: [[{ translate: '0' }, { translate: '-7px' }, { translate: '6px' }, { translate: '-4px' }, { translate: '3px' }, { translate: '0' }], 300],
  // anticipation, a rotated impact frame held for two frames, an unfold over four more, then overshoot and settle
  impact: [[
    { transform: 'none' }, { transform: 'scale(1.1,.55)', offset: 0.15 }, { transform: 'scale(1.22,.3)', offset: 0.26 },
    { transform: 'rotate(-5deg) scale(1.5,.62)', offset: 0.27 }, { transform: 'rotate(-5deg) scale(1.5,.62)', offset: 0.335 },
    { transform: 'rotate(-3deg) scale(1.4,.88)', offset: 0.37 }, { transform: 'rotate(-1deg) scale(1.28,1.16)', offset: 0.41 },
    { transform: 'scale(1.2,1.24)', offset: 0.455 }, { transform: 'scale(1.1,1.12)', offset: 0.57 },
    { transform: 'scale(.95,.93)', offset: 0.7 }, { transform: 'scale(1.03)', offset: 0.85 }, { transform: 'none' },
  ], 520],
  slam: [[{ transform: 'scale(1.4) rotate(-3deg)', opacity: 0 }, { transform: 'scale(.94) rotate(.6deg)', opacity: 1, offset: 0.55 }, { transform: 'scale(1.03)', opacity: 1, offset: 0.8 }, { transform: 'none', opacity: 1 }], 260],
  drop: [[{ transform: 'translateY(-10px) scale(.9,.6)', opacity: 0 }, { transform: 'translateY(2px) scale(1.04,1.06)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], 200],
  leave: [[{ transform: 'none', opacity: 1 }, { transform: 'scale(1.05,.9)', opacity: 1, offset: 0.3 }, { transform: 'scale(.6,.3)', opacity: 0 }], 140],
};

/* play a named preset on an element. Returns the Animation, or null when motion is reduced. */
export function anim(el, name, opts) {
  if (!el || reduced || level() === 0) return null;
  const [kf, dur] = K[name];
  return el.animate(kf, Object.assign({ duration: dur, easing: 'linear' }, opts));
}
/* free-form keyframes with the same reduced-motion rule */
export function play(el, kf, opts) {
  if (!el || reduced || level() === 0) return null;
  return el.animate(kf, opts);
}
/* animate with a baked spring curve: spring(el, [from, to], 'bounce'). Presets: spring, bounce, soft, snap */
export function spring(el, kf, name = 'spring', opts) {
  if (!el || reduced || level() === 0) return null;
  const s = SPRINGS[name] || SPRINGS.spring;
  return el.animate(kf, Object.assign({ duration: s.duration, easing: s.easing }, opts));
}
/* stepped camera shake */
export function shake(el, amp = 5, dur = 220) {
  if (!el || reduced || level() === 0) return null;
  const n = Math.max(3, Math.round(dur / 40)), k = [];
  for (let i = 0; i < n; i++) { const f = 1 - i / n; k.push({ translate: `${((Math.random() - 0.5) * 2 * amp * f).toFixed(1)}px ${((Math.random() - 0.5) * 2 * amp * f).toFixed(1)}px` }); }
  k.push({ translate: '0 0' });
  return el.animate(k, { duration: dur, easing: `steps(${n}, end)` });
}
// smear in from one side: used by toast, drawer, tab panels
export function zipIn(el, dx = -460, sx = 3.2) {
  return play(el, [
    { transform: `translateX(${dx}px) scale(${sx},.42)` },
    { transform: `translateX(${dx * 0.28}px) scale(${sx * 0.9},.5)`, offset: 0.45 },
    { transform: `translateX(${-dx * 0.02}px) scale(1.3,.84)`, offset: 0.62 },
    { transform: 'translateX(0) scale(.94,1.07)', offset: 0.8 },
    { transform: 'none' },
  ], { duration: 330, easing: 'linear' });
}
export function zipOut(el, dx = 480) {
  return play(el, [{ transform: 'none' }, { transform: `translateX(${-dx * 0.025}px) scale(.9,1.1)`, offset: 0.3 }, { transform: `translateX(${dx}px) scale(3.2,.4)` }], { duration: 230, easing: 'ease-in', fill: 'forwards' });
}
