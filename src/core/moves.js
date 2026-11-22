/* Moves: the shared vocabulary of "acts" built from effect primitives, lettering and sound.
   Components call these instead of talking to the engine directly, which is what keeps the
   whole library looking and sounding like one hand drew it. */
import * as FX from './fx.js';
import * as SND from './sound.js';
import { sfx } from './lettering.js';
import { anim, play, shake, zipOut } from './motion.js';
import { rectOf, rnd, clamp, lerp, TAU } from './util.js';

export const say = (word, o) => sfx(word, o);

/* small press feedback for ordinary controls: the squash (the CSS spring on .press / .lift, or the held press of
   sk-button) carries it, and a sound. No drawn mark: an everyday tap is not a surprise, and a mark on every tap stops
   meaning anything */
export function tap(el, sound = 'tap') {
  const q = rectOf(el);
  SND.play(sound);
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
  FX.ticks({ x: x - 96 * k, y: y - 62 * k, angle: -2.5, len: 15, color: FX.C.pink });
  FX.ticks({ x: x + 100 * k, y: y - 58 * k, angle: -0.6, len: 15, color: FX.C.pink });
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
  // three beats in `dur`: it sits and squashes, it flies stretched as fast as it is moving (long near the ground, round
  // at the top of the arc), it lands, squashes and wobbles out. o.hit fires on touchdown, o.done when it is still
  const dur = o.dur || 0.42, h = o.height == null ? 44 : o.height, r = o.r || 7.5, side = o.side || 'x', G = 0.14, FL = 0.58;
  const p = u => {
    const s = Math.sin(Math.PI * u) * h, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    return side === 'x' ? [a.x + (b.x - a.x) * u - s, a.y + (b.y - a.y) * e] : [a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * u - s];
  };
  let len = 0;
  for (let i = 0; i < 20; i++) { const [x0, y0] = p(i / 20), [x1, y1] = p((i + 1) / 20); len += Math.hypot(x1 - x0, y1 - y0); }
  const dirAt = u => { const [x0, y0] = p(Math.max(0, u - 0.01)), [x1, y1] = p(Math.min(1, u + 0.01)); return [Math.atan2(y1 - y0, x1 - x0), Math.hypot(x1 - x0, y1 - y0) / (Math.min(1, u + 0.01) - Math.max(0, u - 0.01)) / len]; };
  const [up] = dirAt(0), [down] = dirAt(1);
  const it = FX.add({
    layer: 'front', life: dur, keep: true,
    draw(ctx, age, U) {
      let x, y, ang, along;
      if (U < G) {                                              // gathering: squashed along the way it will leave
        const q = U / G; [x, y] = p(0); ang = up; along = 1 - 0.3 * Math.sin(q * Math.PI / 2);
      } else if (U < G + FL) {
        const u = (U - G) / FL, [a2, sp] = dirAt(u); [x, y] = p(u); ang = a2;
        const st = 1 + 0.55 * Math.tanh((sp / 1.3) ** 2);
        along = u < 0.08 ? lerp(0.7, st, u / 0.08) : st;          // the squash springs into the stretch in a frame or two
      } else {                                                  // touchdown: flat, then a damped wobble back to round
        const q = (U - G - FL) / (1 - G - FL), t = q * (1 - G - FL) * dur;
        [x, y] = p(1); ang = down; along = 1 - 0.34 * Math.exp(-t * 16) * Math.cos(t * 44) * (1 - q * q);
      }
      ctx.translate(x, y); ctx.rotate(ang); ctx.scale(along, 1 / Math.sqrt(along));
      // o.hollow: the ball shrinks to nothing on the way down and is gone before it reaches what it lands on, so that
      // stays readable. It shrinks rather than fades: drawn things keep full ink to the end
      const k = o.hollow ? clamp(1 - ((U - G) / FL - 0.45) / 0.3, 0, 1) : 1;
      if (k <= 0) return;
      ctx.beginPath(); ctx.arc(0, 0, r * k, 0, TAU); ctx.fillStyle = o.color || FX.C.ink; ctx.fill();
    },
  });
  setTimeout(() => o.hit && o.hit(), (G + FL) * dur * 1000);
  setTimeout(() => o.done && o.done(), dur * 1000);
  return it;
}

/* ---------- moves built on the manga shelf (fx-manga.js) ----------
   Each is a technique with its sound word. The word's voice brings the sound; pass { word: '' } to keep the picture
   and play a plain sound instead. */
const voiced = (o, text, voice, x, y, size, sound) => { if (o.word === '') SND.play(sound); else sfx(o.word || text, { voice: o.voice || voice, x, y, size: o.size || size }); };
const boxOf = q => ({ l: q.l, t: q.t, w: q.w, h: q.h });
/* 気付き線: it has just noticed something */
export function notice(el, o = {}) {
  const q = rectOf(el);
  FX.ticks({ x: q.r - 2, y: q.t - 2, angle: -0.85, n: 3, len: 13, dist: 6, life: 0.5 });
  voiced(o, 'ハッ', 'click', q.r + 22, q.t - 26, 24, 'tick');
  return q;
}
/* タレ線: the mood drops. Lines hang from the top edge over the element */
export function gloom(el, o = {}) {
  const q = rectOf(el);
  const it = FX.tare({ x: q.l + 3, y: q.t + 1, w: q.w - 6, len: clamp(q.h * 0.6, 14, 46), kind: o.kind, lean: o.lean == null ? 0.6 : o.lean, life: o.life == null ? 1.5 : o.life });
  voiced(o, 'ずーん', 'hush', q.l + 10, q.b + 4, 22, 'droop');
  return it;
}
/* 消滅線: it is gone, and short lines mark where it was */
export function vanish(el, o = {}) {
  const q = rectOf(el), r = Math.max(14, q.h / 2 + 6);
  FX.focus({ mode: 'out', x: q.cx, y: q.cy, r, sx: clamp((q.w / 2 + 6) / r, 1, 4), len: 16, n: 12, w: 3.2, rag: 0.5, life: 0.36, layer: 'front', color: FX.C.violet });
  FX.puff({ x: q.cx, y: q.cy, r: clamp(q.h * 0.3, 7, 14), vy: -24, life: 0.5 });
  voiced(o, 'パッ', 'pop', q.cx + 8, q.t - 30, 26, 'puff');
  return q;
}
/* イナズマ: a bolt strikes the element */
export function zap(el, o = {}) {
  const q = rectOf(el), k = o.scale || 1;
  FX.bolt({ x: q.cx - 54 * k, y: q.t - 150 * k, x2: q.cx, y2: q.t + 6, w: 18 * k });
  setTimeout(() => { FX.shock({ x: q.cx, y: q.t + 4, r: 46 * k, w: 12 * k, sy: 0.5, life: 0.34, layer: 'front' }); shake(el, 5 * k, 220); }, 70);
  voiced(o, 'ピシャッ', 'cut', q.cx + 44 * k, q.t - 84 * k, 40 * k, 'crack');
  return q;
}
/* 明かり線 with ニコ線: it lights up with joy */
export function bloom(el, o = {}) {
  const q = rectOf(el), r = q.h / 2 + 9;
  FX.focus({ mode: 'out', x: q.cx, y: q.cy, r, sx: clamp((q.w / 2 + 9) / r, 1, 5), len: 24, n: 18, w: 4.2, rag: 0.6, life: 0.75, behind: el, color: FX.C.pink });
  FX.ticks({ x: q.l + 2, y: q.t - 2, angle: -2.3, n: 3, len: 11, dist: 5, life: 0.6, color: FX.C.pink });
  FX.ticks({ x: q.r - 2, y: q.t - 2, angle: -0.85, n: 3, len: 11, dist: 5, life: 0.6, color: FX.C.pink });
  voiced(o, 'ぱあぁ', 'shine', q.cx, q.t - 34, 28, 'shineUp');
  return q;
}
/* 震え線: it trembles */
export function shiver(el, o = {}) {
  const q = rectOf(el);
  const it = FX.wobble({ x: q.l, y: q.t, w: q.w, h: q.h, period: o.period, life: o.life == null ? 0.8 : o.life });
  shake(el, 2.4, 520);
  voiced(o, 'ブルブル', 'rumble', q.r + 30, q.t - 8, 22, 'rumble');
  return it;
}
/* 残像 with ブレ線: it has just jumped here from `from`, a box { l, t, w, h } measured before it moved */
export function afterimage(el, from, o = {}) {
  const q = rectOf(el), ang = Math.atan2(q.t + q.h / 2 - (from.t + from.h / 2), q.l + q.w / 2 - (from.l + from.w / 2));
  FX.ghost({ from, to: boxOf(q), n: o.n, radius: o.radius, behind: el });
  FX.bure({ x: q.l, y: q.t, w: q.w, h: q.h, angle: ang, n: o.lines || 6, len: clamp(Math.hypot(q.l - from.l, q.t - from.t) * 0.3, 14, 46) });
  if (!o.silent) SND.play('swish');
  return q;
}
/* ヒビ: it cracks from a point (the middle unless x, y are given). The cracks stay inside the element */
export function crackAt(el, x, y, o = {}) {
  const q = rectOf(el);
  const it = FX.crack({ x: x == null ? q.cx : x, y: y == null ? q.cy : y, r: Math.max(q.w, q.h) * 0.62, n: o.n, clip: Object.assign(boxOf(q), { radius: o.radius == null ? 12 : o.radius }), life: o.life == null ? 1.1 : o.life });
  voiced(o, 'ピキッ', 'click', q.r + 14, q.t - 22, 26, 'crack');
  return it;
}
/* タタキダシ and 衝撃波: something lands hard on the ground at x, y */
export function stomp(x, y, o = {}) {
  const k = o.scale || 1;
  FX.shock({ x, y, r: 74 * k, r0: 16 * k, w: 13 * k, sy: 0.3, life: 0.45 });
  FX.crown({ x, y, r: 24 * k, h: 28 * k });
  dust(x, y + 2, 6 * k, 30 * k);
  voiced(o, 'ダンッ', 'impact', x + 8 * k, y - 78 * k, 40 * k, 'thud');
}
/* 集中線: every line points at the element. With { life: Infinity } it holds until the returned item's .end() */
export function focusOn(el, o = {}) {
  const q = rectOf(el), r = q.h / 2 + 12;
  if (!o.silent) SND.play('whoosh');
  return FX.focus({ x: q.cx, y: q.cy, r, sx: clamp((q.w / 2 + 12) / r, 1, 5), len: o.len || 110, n: o.n || 40, bundle: o.bundle !== false, white: o.white, behind: el, life: o.life == null ? 0.7 : o.life });
}
/* オドロ線: something ominous creeps out from around the element */
export function dread(el, o = {}) {
  const q = rectOf(el);
  const it = FX.odoro({ x: q.cx, y: q.cy, rx: q.w / 2 + 2, ry: q.h / 2 + 2, len: o.len || 30, n: o.n, behind: el, life: o.life == null ? 1.6 : o.life });
  voiced(o, 'ゴゴゴ', 'rumble', q.l - 6, q.t - 26, 26, 'rumble');
  return it;
}

/* ---------- moves for the scene shelf (fx-manga.js): picture, word and sound for the everyday moments of an app ----------
   Each takes the element the moment belongs to. o.word replaces the word, o.word = '' plays the sound alone; o.hold
   keeps a state effect (flames, frost, the spotlight) on until the returned item's .end() is called. */
const say2 = (o, text, voice, x, y, size, sound, color) => { if (o.word === '') SND.play(sound); else sfx(o.word || text, { voice: o.voice || voice, x, y, size: o.size || size, color }); };
/* 後光: it is revealed, unlocked or won, and light fans out from behind it */
export function reveal(el, o = {}) {
  const q = rectOf(el), it = FX.rays({ x: q.cx, y: q.cy, r0: Math.min(q.w, q.h) * 0.3, r: clamp(Math.max(q.w, q.h) * 1.1, 70, 190), n: 18, behind: el, life: o.hold ? Infinity : o.life || 1.6 });
  anim(el, 'pop');
  twinkle(q.r - 2, q.t + 2, 12, { delay: 0.16, silent: true }); twinkle(q.l + 4, q.b - 2, 8, { delay: 0.3, silent: true });
  say2(o, 'ジャーン!', 'shine', q.cx, q.t - 36, 30, 'shineBig');
  return it;
}
/* 紙吹雪: something worth celebrating is done. A paper pop over it and confetti thrown up */
export function celebrate(el, o = {}) {
  const q = rectOf(el);
  FX.burst({ x: q.cx, y: q.t - 2, r: clamp(q.w * 0.18, 18, 34), life: 0.14, spikes: 12, behind: el });   // behind it, so the pop never covers its words
  const it = FX.confetti({ x: q.cx, y: q.t, n: o.n, spread: 1.8 });
  say2(o, 'パンッ!', 'pop', q.cx + q.w * 0.3, q.t - 40, 28, 'pop');
  SND.play('fanfare', null, 0.1);
  return it;
}
/* メラメラ: it is hot, on a streak, fired up. Flames rise from behind it */
export function blaze(el, o = {}) {
  const q = rectOf(el), it = FX.flame({ x: q.cx, y: q.t + q.h * 0.55, w: q.w * 1.25, h: q.h * 0.55 + clamp(q.w * 0.85, 44, 110), behind: el, life: o.hold ? Infinity : o.life || 2.2 });
  say2(o, 'メラメラ', 'rumble', q.r + 34, q.t - clamp(q.w * 0.85, 44, 110) * 0.55 - 10, 20, 'fizz', 'pink');   // above the flames, not on them
  return it;
}
/* 湯気: it is fresh, just made or just updated, and steam rises off it */
export function fresh(el, o = {}) {
  const q = rectOf(el), it = FX.steam({ x: q.cx, y: q.t - 3, w: clamp(q.w * 0.4, 20, 64), h: clamp(q.h * 1.3, 40, 84) });
  say2(o, 'ホカホカ', 'soft', q.r + 26, q.t - 16, 19, 'puff');
  return it;
}
/* 氷結: it is frozen, locked or paused, and ice grows over it. Held with o.hold while the state lasts */
export function freeze(el, o = {}) {
  const q = rectOf(el), it = FX.frost({ el, life: o.hold ? Infinity : o.life || 1.8 });
  twinkle(q.r - 4, q.t + 4, 10, { delay: 0.34 });
  say2(o, 'カチーン', 'click', q.cx + q.w * 0.25, q.t - 30, 24, 'ting', 'violet');
  return it;
}
/* 流線: it is off, sent, on its way. The world rushes past behind it and it jolts forward. o.angle: where it goes */
export function dash(el, o = {}) {
  const q = rectOf(el), ang = o.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang);
  const it = FX.rush({ x: q.cx, y: q.cy, w: q.w, h: q.h, angle: ang, behind: el, life: o.life || 0.75 });
  play(el, [{ translate: '0 0' }, { translate: `${-ca * 5}px ${-sa * 5}px`, offset: 0.25 }, { translate: `${ca * 7}px ${sa * 7}px`, offset: 0.55 }, { translate: '0 0' }], { duration: 300 });
  say2(o, 'ダッ', 'swish', q.cx - ca * (q.w * 0.6 + 20), q.t - 24, 26, 'whoosh');
  return it;
}
/* 風: it is cleared, dismissed or put away, and a gust sweeps across it. o.out also blows the element away with the
   wind; the returned Animation finishes when it is gone, so the page can remove it then. o.dir: 1 to the right */
export function blowAway(el, o = {}) {
  const q = rectOf(el), dir = o.dir || 1;
  const it = FX.gust({ x: dir > 0 ? q.l - 40 : q.r + 40, y: q.cy, len: q.w + 150, dir, h: q.h + 30, behind: el });   // behind it: the wind passes round it, not over its words
  say2(o, 'ヒュオッ', 'swish', q.cx, q.t - 26, 24, 'whoosh');
  return o.out ? zipOut(el, dir * Math.max(innerWidth - q.l + 40, 400)) : it;
}
/* スポットライト: look here. The page sinks under tone and a cone of light lands on it. Held with o.hold for a guided
   step; .end() on the returned item puts it out. o.box: the area that darkens (default the viewport) */
export function spotlight(el, o = {}) {
  const q = rectOf(el), it = FX.spotlight({ x: q.cx, y: q.b + 6, r: clamp(q.w * 0.75, 50, 220), box: o.box, from: o.from, life: o.hold ? Infinity : o.life || 1.8 });
  say2(o, 'パッ', 'click', q.r + 22, q.t - 22, 22, 'click');
  return it;
}
/* 音符: it is playing. Notes rise off it; no word, music says it */
export function sing(el, o = {}) {
  const q = rectOf(el), it = FX.notes({ x: q.r - 6, y: q.t + 2, n: o.n || 3, size: clamp(q.h * 0.5, 12, 20) });
  if (o.word) sfx(o.word, { voice: o.voice || 'pop', x: q.r + 20, y: q.t - 20, size: o.size || 18 }); else SND.play('note');
  return it;
}
