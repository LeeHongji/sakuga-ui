/* Real damped springs, baked into CSS `linear()` easings.
   The curve is solved once per preset, so spring motion runs on the compositor (CSS transitions or WAAPI)
   with no per-frame JavaScript. */
function solve(k, c) {
  const dt = 1 / 240, pts = [];
  let x = 0, v = 0, t = 0, i = 0;
  while (t < 3) {
    v += (-k * (x - 1) - c * v) * dt; x += v * dt; t += dt;
    if (++i % 4 === 0) pts.push([t, x]);
    if (Math.abs(x - 1) < 0.0015 && Math.abs(v) < 0.02) break;
  }
  const step = Math.max(1, Math.ceil(pts.length / 40));
  const keep = pts.filter((p, n) => n % step === 0);
  const body = keep.map(([tt, xx]) => `${+xx.toFixed(3)} ${+((tt / t) * 100).toFixed(1)}%`).join(', ');
  return { duration: Math.round(t * 1000), easing: `linear(0, ${body}, 1)` };
}
const ok = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
const make = (k, c, fallback, ms) => (ok ? solve(k, c) : { duration: ms, easing: fallback });

export const SPRINGS = {
  spring: make(320, 18, 'cubic-bezier(.3,1.5,.5,1)', 460),   // one clear overshoot: the default
  bounce: make(260, 10, 'cubic-bezier(.3,1.9,.5,1)', 700),   // several bounces: presses and pops
  soft: make(170, 18, 'cubic-bezier(.3,1.2,.5,1)', 420),     // a slight overshoot: large surfaces
  snap: make(620, 34, 'cubic-bezier(.3,1.3,.5,1)', 240),     // quick and tight: small indicators
};
export const SPRING_VARS = Object.entries(SPRINGS).map(([n, s]) => `--sk-${n}:${s.easing};--sk-${n}-t:${s.duration}ms;`).join('');
