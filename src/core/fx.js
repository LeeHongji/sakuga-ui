/* Sakuga FX: the cel-style effect engine shared by every component.
   - Two fixed canvases sit in the top layer, above the page and above any open dialog or popup (back and front).
     They are created lazily and hidden while idle.
   - "Behind an element" is done by punching that element's box out of the back canvas, so effects
     never depend on the host page's z-index or backgrounds.
   - Every particle is a pure function of its age, so time can be quantised to 30, 24 or 12 fps.
   - A particle budget and an adaptive quality governor keep frame time bounded. */
import { config, level } from './config.js';
import { TAU, clamp, lerp, E, newR, now } from './util.js';
import { lift, lower, crownLayer, BARE } from './layer.js';

/* ---------- theme colours, read from the --sk-* tokens ---------- */
export const C = {};
const KEYS = ['paper', 'ink', 'surface', 'violet', 'lav', 'peri', 'pink', 'off', 'fxw', 'fxs', 'fxo', 'deep'];
const tones = {};
let themeStale = true;
export function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of KEYS) tones[k] = cs.getPropertyValue('--sk-' + k).trim() || '#888';
  themeStale = false;
}
// read on first use, so a colour asked for while building the very first effect is already the real one
for (const k of KEYS) Object.defineProperty(C, k, { enumerable: true, get() { if (themeStale) readTheme(); return tones[k]; } });
export function invalidateTheme() { themeStale = true; lastQ = -1; }

/* ---------- canvases and loop ---------- */
const TOP = 2147483000;
let back, front, bctx, fctx, dpr = 1, inited = false;
const items = [];
const radii = new WeakMap();
let running = false, lastQ = -1, lastT = 0, ema = 1 / 60, quality = 1, dropped = 0;
const dirty = { back: false, front: false };

function mk(z, rank) {
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText = `${BARE}position:fixed;inset:0 auto auto 0;width:100vw;height:100vh;pointer-events:none;display:none;z-index:${z}`;
  document.body.appendChild(c);
  return crownLayer(c, rank);
}
const showLayers = on => { for (const c of [back, front]) { c.style.display = on ? 'block' : 'none'; on ? lift(c) : lower(c); } };
function resize() {
  // large viewports get a lower backing-store ratio: effects are flat shapes, so this is invisible but cuts fill cost
  dpr = Math.min(window.devicePixelRatio || 1, innerWidth * innerHeight > 2.3e6 ? 1.25 : 2);
  for (const c of [back, front]) { c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr); }
  dirty.back = dirty.front = true; lastQ = -1;
}
function ensure() {
  if (inited) return;
  inited = true;
  back = mk(TOP, 2); front = mk(TOP + 2, 3);
  bctx = back.getContext('2d'); fctx = front.getContext('2d');
  resize();
  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', () => { lastQ = -1; }, { passive: true });
  new MutationObserver(invalidateTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-sk-theme', 'data-sk-palette', 'class', 'style'] });
}
function prep(c, ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.setTransform(dpr, 0, 0, dpr, -scrollX * dpr, -scrollY * dpr);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
}
function render(t) {
  if (themeStale) readTheme();
  let nb = 0, nf = 0;
  for (const it of items) { if (it.dead || t < it.t0) continue; if (it.layer === 'back') nb++; else if (it.layer === 'front') nf++; }
  // a layer with nothing on it is not touched at all
  if (nb || dirty.back) { prep(back, bctx); dirty.back = nb > 0; }
  if (nf || dirty.front) { prep(front, fctx); dirty.front = nf > 0; }
  let punch = null;
  for (const it of items) {
    if (it.dead) continue;
    const age = t - it.t0;
    if (age < 0) continue;
    if (age > it.life) { it.dead = true; continue; }
    const ctx = it.layer === 'back' ? bctx : it.layer === 'front' ? fctx : null;
    if (ctx) { ctx.save(); it.draw(ctx, age, age / it.life); ctx.restore(); }
    else it.draw(null, age, age / it.life);
    if (it.behind && it.layer === 'back') (punch || (punch = new Set())).add(it.behind);
  }
  if (punch) {
    bctx.save(); bctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.globalCompositeOperation = 'destination-out'; bctx.fillStyle = '#000';
    for (const el of punch) {
      const b = el.getBoundingClientRect();
      if (!b.width) continue;
      bctx.beginPath(); bctx.roundRect(b.left, b.top, b.width, b.height, Math.min(radii.get(el) || 0, b.height / 2)); bctx.fill();
    }
    bctx.restore();
  }
}
function frame() {
  const t = now(), dt = t - lastT; lastT = t;
  if (dt < 0.25) {
    ema = ema * 0.92 + dt * 0.08;
    if (config.adaptive) {
      if (ema > 0.027) quality = Math.max(0.35, quality - 0.02);
      else if (ema < 0.019) quality = Math.min(1, quality + 0.004);
    }
  }
  const f = config.fps, q = f >= 60 ? t : Math.floor(t * f) / f;
  if (q !== lastQ) { render(q); lastQ = q; }
  let w = 0;
  for (let i = 0; i < items.length; i++) if (!items[i].dead) items[w++] = items[i];
  items.length = w;
  if (w) requestAnimationFrame(frame);
  else { running = false; render(t); showLayers(false); }
}
function kick() {
  if (running) return;
  running = true; lastT = now();
  showLayers(true);
  requestAnimationFrame(frame);
}
/* add one effect item. o: { layer:'front'|'back'|'self', life, delay, draw(ctx, age, a), behind: Element, keep } */
export function add(o) {
  const it = {
    layer: o.layer || 'front', t0: now() + (o.delay || 0), life: o.life == null ? 1 : o.life, draw: o.draw, dead: false,
    behind: o.behind || null, keep: !!o.keep || o.life === Infinity || o.layer === 'self',
    end(fade = 0.12) { this.life = Math.min(this.life, now() - this.t0 + fade); },
    kill() { this.dead = true; },
  };
  if (!it.keep && (level() === 0 || document.hidden || items.length >= config.maxParticles)) { it.dead = true; dropped++; return it; }
  ensure();
  if (it.behind && !radii.has(it.behind)) radii.set(it.behind, parseFloat(getComputedStyle(it.behind).borderTopLeftRadius) || 0);
  items.push(it);
  kick();
  return it;
}
// how many particles to spawn for a nominal count, after the fx level and the adaptive governor
export const amount = n => Math.max(1, Math.round(n * quality * level()));
export const stats = () => ({ items: items.length, quality: +quality.toFixed(2), fps: Math.round(1 / ema), dropped });
export const redraw = () => { lastQ = -1; };

// position under exponential drag plus gravity, as a pure function of age
export function pos(p, t) {
  const k = p.drag || 0;
  const f = k ? (1 - Math.exp(-k * t)) / k : t;
  return [p.x + p.vx * f, p.y + p.vy * f + 0.5 * (p.g || 0) * t * t];
}

/* ---------- cloud drawing: union of circles with a shadow crescent and crease lines ---------- */
export function drawCloud(ctx, cs, lw) {
  if (!cs.length) return;
  ctx.lineWidth = lw * 2; ctx.strokeStyle = C.fxo;
  ctx.beginPath();
  for (const [x, y, r] of cs) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  ctx.stroke();
  ctx.fillStyle = C.fxs; ctx.fill();
  ctx.fillStyle = C.fxw; ctx.beginPath();
  for (const [x, y, r] of cs) {
    if (r < 3) { ctx.moveTo(x + r * 0.7, y); ctx.arc(x, y, r * 0.7, 0, TAU); continue; }
    const q = r * 0.8, ox = x + r * 0.13, oy = y - r * 0.13;
    ctx.moveTo(ox + q, oy); ctx.arc(ox, oy, q, 0, TAU);
  }
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  for (const [x, y, r] of cs) if (r > lw + 1) { ctx.moveTo(x + r - lw, y); ctx.arc(x, y, r - lw, 0, TAU); }
  ctx.clip();
  ctx.lineWidth = lw * 0.8; ctx.beginPath();
  for (let i = 1; i < cs.length; i++) {
    const [x, y, r] = cs[i];
    if (r < 5) continue;
    ctx.moveTo(x + Math.cos(-2.75) * r, y + Math.sin(-2.75) * r);
    ctx.arc(x, y, r, -2.75, -0.55);
  }
  ctx.stroke();
  ctx.restore();
}

/* ---------- primitives ---------- */
export function puff(o) {
  const R = newR(), n = o.n || 4 + ((R() * 3) | 0), lobes = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + R() * 0.9, d = i ? 0.42 + R() * 0.3 : 0;
    lobes.push({ c: Math.cos(ang), s: Math.sin(ang), d, rr: i ? 0.44 + R() * 0.26 : 0.7, die: 0.6 + R() * 0.4 });
  }
  const p = { x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag == null ? 3 : o.drag };
  const r0 = o.r || 14, lw = o.lw || 1.8;
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life || 0.9,
    draw(ctx, age, a) {
      const [x, y] = pos(p, age);
      const pop = a < 0.14 ? E.outBack(a / 0.14) : 1;
      const r = r0 * pop * (1 + 0.3 * a), sep = 1 + 0.8 * a * a;
      const cs = [];
      for (const L of lobes) {
        const k = clamp((a - (L.die - 0.45)) / 0.45, 0, 1);
        const rad = r * L.rr * (1 - E.inQuad(k));
        if (rad < 0.8) continue;
        cs.push([x + L.c * L.d * r * sep, y + L.s * L.d * r * sep * 0.85, rad]);
      }
      drawCloud(ctx, cs, lw);
    },
  });
}

export function shard(o) {
  const R = newR(), s = (o.size || 10) * 1.35;
  const pts = [[-0.55, -0.1 + R() * 0.2], [-0.1 + R() * 0.2, -0.62], [0.55, -0.25 + R() * 0.2], [0.4, 0.4 + R() * 0.2], [-0.25, 0.55]]
    .map(([a, b]) => [a * (0.8 + R() * 0.4), b * (0.8 + R() * 0.4)]);
  const c = [0.06, -0.06];
  const p = { x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, g: o.g == null ? 900 : o.g, drag: o.drag == null ? 1.6 : o.drag };
  const r0 = o.rot == null ? R() * TAU : o.rot, vr = o.vr == null ? (R() - 0.5) * 16 : o.vr;
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life || 0.8,
    draw(ctx, age, a) {
      const [x, y] = pos(p, age);
      const sc = s * (a < 0.1 ? a / 0.1 : 1) * (a > 0.7 ? 1 - (a - 0.7) / 0.3 : 1);
      if (sc < 0.6) return;
      ctx.translate(x, y); ctx.rotate(r0 + vr * age); ctx.scale(sc, sc);
      ctx.lineWidth = (o.lw || 1.5) / sc; ctx.strokeStyle = C.fxo;
      ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
      ctx.fillStyle = C.fxw; ctx.fill();
      ctx.fillStyle = C.fxs;
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.lineTo(pts[4][0], pts[4][1]); ctx.closePath(); ctx.fill();
      ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
      for (const i of [0, 2, 3]) { ctx.moveTo(c[0], c[1]); ctx.lineTo(pts[i][0], pts[i][1]); }
      ctx.stroke();
    },
  });
}

// starburst that pops, then hollows into a jagged ring
export function burst(o) {
  const R = newR(), n = o.spikes || 20, out = [], hole = [], needles = [];
  for (let i = 0; i < n; i++) {
    out.push([(i / n) * TAU + (R() - 0.5) * 0.1, 0.72 + R() * 0.62, true]);
    out.push([((i + 0.5) / n) * TAU, 0.36 + R() * 0.14, false]);
  }
  for (let i = 0; i < 14; i++) hole.push([(i / 14) * TAU + R() * 0.2, 0.82 + R() * 0.18]);
  const nn = o.needles == null ? 9 : o.needles;
  for (let i = 0; i < nn; i++) needles.push([(i / nn) * TAU + R() * 0.5, 1.3 + R() * 0.8, 0.035 + R() * 0.03]);
  const sx = o.sx || 1.15, sy = o.sy || 0.92, lw = o.lw || 1.8;
  return add({
    behind: o.behind,
    layer: o.layer || 'back', delay: o.delay, life: o.life || 0.5,
    draw(ctx, age, a) {
      const grow = a < 0.16 ? lerp(0.25, 1, E.outBack(a / 0.16)) : 1 + 0.25 * (a - 0.16);
      const r = o.r * grow;
      const f = a < 0.42 ? 0 : E.outQuad((a - 0.42) / 0.58);
      ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0);
      const nk = a < 0.55 ? 1 : 1 - (a - 0.55) / 0.3;
      if (nk > 0) {
        ctx.fillStyle = C.pink;
        for (const [ang, len, w] of needles) {
          const c = Math.cos(ang), s = Math.sin(ang), L = r * len * (0.6 + 0.4 * nk), b = r * 0.35 * (1 + f);
          ctx.beginPath();
          ctx.moveTo(c * L * sx, s * L * sy);
          ctx.lineTo((c * b - s * r * w * nk) * sx, (s * b + c * r * w * nk) * sy);
          ctx.lineTo((c * b + s * r * w * nk) * sx, (s * b - c * r * w * nk) * sy);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.beginPath();
      out.forEach(([ang, rad, tip], i) => {
        const rr = (tip ? lerp(rad, 1, f * 0.7) : lerp(rad, 0.86, f)) * r;
        const px = Math.cos(ang) * rr * sx, py = Math.sin(ang) * rr * sy;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.closePath();
      if (f > 0) {
        hole.forEach(([ang, rad], i) => {
          const rr = 0.8 * f * rad * r;
          const px = Math.cos(ang) * rr * sx, py = Math.sin(ang) * rr * sy;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.closePath();
      }
      ctx.fillStyle = C.fxs; ctx.fill('evenodd');
      ctx.lineWidth = lw; ctx.strokeStyle = C.fxo; ctx.lineJoin = 'miter'; ctx.stroke();
    },
  });
}

// scalloped smoke ring
export function ring(o) {
  const R = newR(), bumps = 8 + ((R() * 3) | 0), ph = R() * TAU;
  const p = { x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, drag: o.drag == null ? 1.2 : o.drag };
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life || 1.2,
    draw(ctx, age, a) {
      const [x, y] = pos(p, age);
      const sc = o.r * (a < 0.1 ? E.outBack(a / 0.1) : 1) * (1 - 0.85 * E.inQuad(a));
      if (sc < 1) return;
      ctx.translate(x, y); ctx.rotate(o.tilt == null ? -0.22 : o.tilt); ctx.scale(1, 0.62);
      const shape = () => {
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) {
          const ang = (i / 48) * TAU, rad = sc * (1 + 0.1 * Math.cos(bumps * ang + ph));
          i ? ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad) : ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        ctx.closePath();
        ctx.moveTo(sc * 0.46, 0); ctx.arc(0, 0, sc * 0.46, 0, TAU);
      };
      shape(); ctx.fillStyle = C.fxw; ctx.fill('evenodd');
      ctx.save(); shape(); ctx.clip('evenodd');
      ctx.fillStyle = C.fxs; ctx.fillRect(-sc * 1.3, sc * 0.12, sc * 2.6, sc * 1.3);
      ctx.restore();
      shape(); ctx.lineWidth = o.lw || 1.8; ctx.strokeStyle = C.fxo; ctx.stroke();
    },
  });
}

// fan of small wedges: the "surprise" marks
export function ticks(o) {
  const n = o.n || 3, spread = o.spread || 0.42, len = o.len || 14;
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life || 0.45,
    draw(ctx, age, a) {
      const k = a < 0.25 ? E.outBack(a / 0.25) : 1, sh = a > 0.6 ? 1 - (a - 0.6) / 0.4 : 1;
      ctx.fillStyle = o.color || C.pink;
      for (let i = 0; i < n; i++) {
        const ang = o.angle + (i - (n - 1) / 2) * spread;
        const c = Math.cos(ang), s = Math.sin(ang);
        const d0 = (o.dist || 10) * (0.5 + 0.5 * k) + 8 * a;
        const L = len * k * sh * (i === (n - 1) / 2 ? 1 : 0.82), w = L * 0.24;
        const x0 = o.x + c * d0, y0 = o.y + s * d0, x1 = o.x + c * (d0 + L), y1 = o.y + s * (d0 + L);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - s * w, y1 + c * w); ctx.lineTo(x1 + s * w, y1 - c * w); ctx.closePath(); ctx.fill();
      }
    },
  });
}

// speed lines: tapered streaks that travel along a direction and shorten
export function lines(o) {
  const R = newR(), n = o.n || 4, arr = [];
  for (let i = 0; i < n; i++) arr.push({ off: (R() - 0.5) * (o.spread || 20), len: (o.len || 40) * (0.5 + R()), d0: R() * (o.len || 40) * 0.4, w: (o.w || 2) * (0.6 + R() * 0.8), delay: R() * 0.3 });
  const c = Math.cos(o.angle), s = Math.sin(o.angle);
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life || 0.35,
    draw(ctx, age, a) {
      ctx.fillStyle = o.color || C.violet;
      for (const L of arr) {
        const la = clamp((a - L.delay) / (1 - L.delay), 0, 1);
        if (la <= 0) continue;
        const head = L.d0 + (o.dist || 30) * E.outCubic(la), len = L.len * (1 - la);
        if (len < 1) continue;
        const bx = o.x - s * L.off, by = o.y + c * L.off;
        const x1 = bx + c * head, y1 = by + s * head, x0 = bx + c * (head - len), y0 = by + s * (head - len);
        const mx = (x0 + x1) / 2 + c * len * 0.2, my = (y0 + y1) / 2 + s * len * 0.2, w = L.w / 2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(mx - s * w, my + c * w); ctx.lineTo(x1, y1); ctx.lineTo(mx + s * w, my - c * w); ctx.closePath(); ctx.fill();
      }
    },
  });
}

export function starPath(ctx, s, w) {
  const c = s * 0.13;
  ctx.beginPath(); ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(c, -c, w, 0); ctx.quadraticCurveTo(c, c, 0, s);
  ctx.quadraticCurveTo(-c, c, -w, 0); ctx.quadraticCurveTo(-c, -c, 0, -s); ctx.closePath();
}
export function sparkle(o) {
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life == null ? 1.1 : o.life,
    draw(ctx, age) {
      const left = this.life - age;
      const k = age < 0.16 ? E.outBack(age / 0.16) : 1, e = left < 0.12 ? left / 0.12 : 1;
      const s = (o.r || 12) * k * e;
      if (s < 0.5) return;
      ctx.translate(o.x, o.y); ctx.rotate((1 - Math.min(1, age / 0.22)) * 0.9);
      starPath(ctx, s, s * 0.7);
      ctx.fillStyle = C.fxw; ctx.fill();
      ctx.lineWidth = o.lw || 2.2; ctx.strokeStyle = o.color || C.pink; ctx.stroke();
    },
  });
}

// crescent blade
export function slash(o) {
  const c = Math.cos(o.angle), s = Math.sin(o.angle), nx = -s, ny = c;
  const cres = (ctx, x0, y0, x1, y1, b1, b2) => {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx + nx * b1, my + ny * b1, x1, y1);
    ctx.quadraticCurveTo(mx + nx * b2, my + ny * b2, x0, y0); ctx.closePath();
  };
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life || 0.5,
    draw(ctx, age, a) {
      const grow = clamp(a / 0.14, 0, 1), sh = a < 0.45 ? 0 : E.inOut((a - 0.45) / 0.55);
      const dr = (o.drift || 0) * a;
      const t0 = -0.5 + sh * 0.97, t1 = -0.5 + grow;
      const x0 = o.x + c * (o.len * t0 + dr), y0 = o.y + s * (o.len * t0 + dr);
      const x1 = o.x + c * (o.len * t1 + dr), y1 = o.y + s * (o.len * t1 + dr);
      const k = (t1 - t0), b = o.bulge * k;
      if (k < 0.02) return;
      cres(ctx, x0, y0, x1, y1, b * 2, b * 0.5);
      ctx.fillStyle = C.fxw; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = C.fxo; ctx.stroke();
      const ix0 = lerp(x0, x1, 0.1), iy0 = lerp(y0, y1, 0.1), ix1 = lerp(x0, x1, 0.94), iy1 = lerp(y0, y1, 0.94);
      cres(ctx, ix0, iy0, ix1, iy1, b * 1.6, b * 0.85);
      ctx.fillStyle = C.pink; ctx.fill();
    },
  });
}

// vibration marks: (( or ))
export function arcs(o) {
  const n = o.n || 2, r = o.r || 16, dir = o.dir || 1;
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life || 0.3,
    draw(ctx, age, a) {
      const span = 0.5 * (a > 0.5 ? 1 - (a - 0.5) / 0.5 : 1);
      ctx.lineWidth = o.lw || 1.6; ctx.strokeStyle = o.color || C.violet;
      for (let i = 0; i < n; i++) {
        const cx = o.x + dir * (i * 5 + a * 8) - dir * r, mid = dir > 0 ? 0 : Math.PI;
        ctx.beginPath(); ctx.arc(cx, o.y, r, mid - span, mid + span); ctx.stroke();
      }
    },
  });
}

// teardrop that points along its velocity
export function drop(o) {
  const p = { x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, g: o.g == null ? 900 : o.g, drag: o.drag == null ? 1.2 : o.drag };
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life || 0.6,
    draw(ctx, age, a) {
      const [x, y] = pos(p, age), [x2, y2] = pos(p, age + 0.016);
      const s = (o.size || 5) * (a < 0.12 ? a / 0.12 : 1) * (a > 0.75 ? 1 - (a - 0.75) / 0.25 : 1);
      if (s < 0.6) return;
      ctx.translate(x, y); ctx.rotate(Math.atan2(y2 - y, x2 - x));
      const tear = () => {
        ctx.beginPath(); ctx.moveTo(-2.6 * s, 0); ctx.quadraticCurveTo(-0.9 * s, -s, 0, -s);
        ctx.arc(0, 0, s, -Math.PI / 2, Math.PI / 2); ctx.quadraticCurveTo(-0.9 * s, s, -2.6 * s, 0); ctx.closePath();
      };
      tear(); ctx.fillStyle = C.fxw; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = C.fxs; ctx.beginPath(); ctx.arc(-0.2 * s, 0.8 * s, s * 0.95, 0, TAU); ctx.fill(); ctx.restore();
      tear(); ctx.lineWidth = 1.6; ctx.strokeStyle = C.fxo; ctx.stroke();
    },
  });
}

const SHAPES = {
  heart(ctx) { ctx.beginPath(); ctx.moveTo(0, 0.9); ctx.bezierCurveTo(-1.5, -0.1, -0.7, -1.2, 0, -0.35); ctx.bezierCurveTo(0.7, -1.2, 1.5, -0.1, 0, 0.9); ctx.closePath(); },
  star(ctx) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.45 : 1, a = -Math.PI / 2 + (i / 10) * TAU; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); },
  dot(ctx) { ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); },
};
export function sticker(o) {
  const R = newR();
  const p = { x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, g: o.g == null ? 500 : o.g, drag: o.drag == null ? 2 : o.drag };
  const r0 = o.rot == null ? (R() - 0.5) * 0.8 : o.rot, vr = o.vr == null ? (R() - 0.5) * 6 : o.vr;
  return add({
    behind: o.behind,
    layer: o.layer, delay: o.delay, life: o.life || 0.8,
    draw(ctx, age, a) {
      const [x, y] = pos(p, age);
      const s = (o.size || 8) * (a < 0.18 ? E.outBack(a / 0.18) : 1) * (a > 0.7 ? 1 - (a - 0.7) / 0.3 : 1);
      if (s < 0.5) return;
      ctx.translate(x, y); ctx.rotate(r0 + vr * age); ctx.scale(s, s);
      SHAPES[o.shape || 'heart'](ctx);
      ctx.fillStyle = o.fill || C.pink; ctx.fill();
      ctx.lineWidth = (o.lw || 1.8) / s; ctx.strokeStyle = o.stroke || C.ink; ctx.stroke();
    },
  });
}


