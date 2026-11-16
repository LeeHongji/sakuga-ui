/* Moves: the shared vocabulary of "acts" built from effect primitives, lettering and sound.
   Components call these instead of talking to the engine directly, which is what keeps the
   whole library looking and sounding like one hand drew it. */
import * as FX from './fx.js';
import * as SND from './sound.js';
import { sfx } from './lettering.js';
import { anim, shake } from './motion.js';
import { rectOf, rnd, clamp, TAU } from './util.js';

export const say = (word, o) => sfx(word, o);

/* small press feedback for ordinary controls */
export function tap(el, sound = 'tap') {
  const q = rectOf(el);
  FX.ticks({ x: q.cx, y: q.t - 5, angle: -Math.PI / 2, len: 8, dist: 2, life: 0.28 });
  SND.play(sound);   // the squash itself is the CSS spring on .press / .lift
  return q;
}
/* a puff of smoke */
export function poof(x, y, r = 10, o = {}) {
  FX.puff(Object.assign({ x, y, r, vy: -30, life: 0.6 }, o));
  if (!o.silent) SND.play('puff');
}
/* landing dust on both sides of a point */
export function dust(x, y, r = 6, spread = 14) {
  FX.puff({ x: x - spread, y, r, n: 3, vx: -40, vy: -6, life: 0.4, lw: 1.5 });
  FX.puff({ x: x + spread, y, r, n: 3, vx: 40, vy: -6, life: 0.4, lw: 1.5 });
}
/* a four-point sparkle with its "ting" */
export function twinkle(x, y, r = 11, o = {}) {
  const it = FX.sparkle(Object.assign({ x, y, r, life: 1.1 }, o));
  if (!o.silent) SND.play('ting', null, o.delay || 0);
  return it;
}
/* crystals thrown from a point */
export function shards(x, y, n = 8, speed = 300, o = {}) {
  for (let i = 0, m = FX.amount(n); i < m; i++) {
    const a = rnd(0, TAU), sp = rnd(speed * 0.4, speed);
    FX.shard(Object.assign({ x: x + rnd(-8, 8), y: y + rnd(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - speed * 0.3, size: rnd(6, 11), life: rnd(0.5, 0.95) }, o));
  }
}
/* the big hit: starburst behind `el`, corner puffs, shards, surprise ticks */
export function boom(x, y, k = 1, el = null, br = 105 * k) {
  FX.burst({ x, y, r: br, life: 0.5, behind: el });
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 4 + (i * Math.PI) / 2 + rnd(-0.25, 0.25), cx = Math.cos(a), sy = Math.sin(a);
    FX.puff({ x: x + cx * 92 * k, y: y + sy * 44 * k, r: 17 * k, vx: cx * 120 * k, vy: sy * 60 * k - 20, life: rnd(0.75, 1.05) });
  }
  shards(x, y, 10, 460 * k, { size: rnd(9, 14) * k });
  FX.ticks({ x: x - 96 * k, y: y - 62 * k, angle: -2.5, len: 15 });
  FX.ticks({ x: x + 100 * k, y: y - 58 * k, angle: -0.6, len: 15 });
  SND.play('tinkle', null, 0.12);
}
/* three smoke rings drifting up and away */
export function rings(x, y) {
  [[20, 0, 0], [15, 0.09, 26], [9, 0.18, 46]].forEach(([r, delay, off]) =>
    FX.ring({ x: x + off, y: y - off * 0.3, r, vx: 46, vy: -62, life: 1.25 - delay, delay }));
}
/* full key-animation hit on an element: anticipation, impact frame, explosion, word */
export function impact(el, o = {}) {
  // o.skip (ms): start part-way in, for a press that was already held down and has done its own wind-up
  const q = rectOf(el), k = o.scale || 1, stage = o.stage || el, skip = o.skip || 0;
  const a = anim(el, 'impact'); if (a && skip) a.currentTime = skip;
  SND.play('squash');
  FX.arcs({ x: q.l - 10, y: q.cy, dir: -1 }); FX.arcs({ x: q.r + 10, y: q.cy, dir: 1 });
  setTimeout(() => {
    el.toggleAttribute('data-inv', true);
    FX.burst({ x: q.cx, y: q.cy, r: 40 * k, life: 0.1, needles: 6, behind: el });
    if (o.word !== '') sfx(o.word || 'ドン!', { voice: o.voice || 'impact', x: q.cx + 2, y: q.t - 50 * k, size: (o.size || 62) * k, hold: 720 });
  }, 140 - skip);
  // the starburst is sized from the element so that, needles included, it stays within about twice its width
  setTimeout(() => { boom(q.cx, q.cy + 4, k, el, clamp(q.w * 0.5, 50, 106) * k); shake(stage, 6 * k, 240); }, 190 - skip);
  setTimeout(() => { el.toggleAttribute('data-inv', false); rings(q.cx + 18, q.t - 16); }, 290 - skip);
  return q;
}
/* speed lines trailing behind something that just moved */
export function streak(x, y, angle, len = 44, n = 4, o = {}) {
  FX.lines(Object.assign({ x, y, angle, n, len, spread: 30, dist: 30, life: 0.3 }, o));
}
/* a pair of crescent blades crossing a rect, used for "cut" moments */
export function cut(q, o = {}) {
  const th = o.angle == null ? -0.42 : o.angle, len = o.len || 190, drift = o.drift == null ? len * 0.37 : o.drift, u = len / 190;
  FX.slash({ x: q.cx + 8 * u, y: q.cy - 6 * u, angle: th, len, bulge: -19 * Math.max(0.6, u), life: 0.5, drift });
  if (o.pair !== false) FX.slash({ x: q.cx - 12 * u, y: q.cy + 14 * u, angle: Math.PI + th, len: len * 0.88, bulge: -17 * Math.max(0.6, u), life: 0.52, drift, delay: 0.04 });
  FX.lines({ x: q.cx - 70 * u, y: q.cy + 46 * u, angle: th + Math.PI, n: 4, len: 46 * Math.max(0.6, u), spread: 26 * u, dist: 40 * u, life: 0.3, w: 2.4 });
}
/* a shower of small stickers (hearts, stars) */
export function shower(x, y, shape = 'star', n = 8, o = {}) {
  for (let i = 0, m = FX.amount(n); i < m; i++) {
    const a = -Math.PI / 2 + rnd(-1.25, 1.25), sp = rnd(170, 340);
    FX.sticker(Object.assign({ shape, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: rnd(5, 10), life: rnd(0.55, 0.9), g: 160 }, o));
  }
}
/* a ball that hops from one point to another in an arc, then calls back */
export function hop(a, b, o = {}) {
  const dur = o.dur || 0.3, h = o.height == null ? 44 : o.height, r = o.r || 7.5, side = o.side || 'x';
  const p = u => {
    const s = Math.sin(Math.PI * u) * h, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    return side === 'x' ? [a.x + (b.x - a.x) * u - s, a.y + (b.y - a.y) * e] : [a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * u - s];
  };
  const it = FX.add({
    layer: 'front', life: dur, keep: true,
    draw(ctx, age, u) {
      const [x, y] = p(u), [x2, y2] = p(Math.min(1, u + 0.03)), st = 1 + 0.55 * Math.sin(Math.PI * u);
      ctx.translate(x, y); ctx.rotate(Math.atan2(y2 - y, x2 - x)); ctx.scale(st, 1 / st);
      // o.hollow: the ball dissolves on the way down and is gone before it reaches what it lands on, so that stays readable
      const k = o.hollow ? clamp(1 - (u - 0.45) / 0.3, 0, 1) : 1;
      if (k <= 0) return;
      ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = o.color || FX.C.ink; ctx.fill();
    },
  });
  setTimeout(() => o.done && o.done(), dur * 1000);
  return it;
}
