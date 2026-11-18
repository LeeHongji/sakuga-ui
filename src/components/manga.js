/* Manga: components that each take one manga drawing technique and put it to work as an interface.
   Panel layout, the page turn, speech balloons, speed lines, the black flash, screentone, cross-hatching,
   the four-panel strip, breaking the frame, and sound words. */
import { SkElement, define, css, FX, SND, sfx, compose, DOTS, loadFaces, moves, anim, play, shake, rectOf, clamp, rng, level, reduced } from '../core/index.js';
import { roll, ROLL_CSS } from './_parts.js';

/* ---------- shared ---------- */
/* A damped spring on one number, for shapes that have to be redrawn as they move (a gutter, a fold, an outline).
   It steps only while it is moving, so nothing runs at rest; with motion reduced or effects off it jumps. */
const live = new Set();
let raf = 0, last = 0;
function tick(t) {
  const dt = Math.min(0.034, (t - last) / 1000 || 0.016); last = t;
  for (const s of live) s.step(dt);
  raf = live.size ? requestAnimationFrame(tick) : 0;
}
function tween(v, on, k = 280, c = 18) {
  return {
    v, t: v, vel: 0, k, c,
    set(t) { this.t = t; if (reduced || !level()) return this.jump(t); live.add(this); if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } return this; },
    jump(t) { this.v = this.t = t; this.vel = 0; live.delete(this); on(t); return this; },
    kick(v) { if (reduced || !level()) return this; this.vel += v; return this.set(this.t); },
    stop() { live.delete(this); },
    step(dt) {
      const d = dt / 4;
      for (let i = 0; i < 4; i++) { this.vel += (-this.k * (this.v - this.t) - this.c * this.vel) * d; this.v += this.vel * d; }
      if (Math.abs(this.v - this.t) < 1e-3 && Math.abs(this.vel) < 1e-2) { this.v = this.t; this.vel = 0; live.delete(this); }
      on(this.v);
    },
  };
}
const TONE = c => `radial-gradient(color-mix(in srgb,var(--sk-${c}) 80%,transparent) 1.2px,transparent 1.6px) 0 0/6px 6px`;
const pxOf = (el, name, dflt) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || dflt;
/* the red seal an editor stamps on finished work */
const SEAL_CSS = `.seal{position:absolute;z-index:3;display:grid;place-items:center;width:var(--seal,52px);height:var(--seal,52px);margin:calc(var(--seal,52px)/-2) 0 0 calc(var(--seal,52px)/-2);border:3.5px solid var(--sk-pink);border-radius:50%;background:color-mix(in srgb,var(--sk-surface) 82%,transparent);color:var(--sk-pink);font:400 calc(var(--seal,52px)*.5)/1 "Dela Gothic One","Hiragino Sans","Yu Gothic",sans-serif;rotate:-14deg;pointer-events:none}
.seal::after{content:"";position:absolute;inset:3px;border:1.5px solid var(--sk-pink);border-radius:50%}`;
function seal(root, text, left, top) {
  loadFaces();
  const s = document.createElement('span');
  s.className = 'seal'; s.textContent = text; s.setAttribute('aria-hidden', 'true'); s.style.left = left; s.style.top = top;
  root.appendChild(s);
  play(s, [{ opacity: 0, transform: 'scale(2.2)' }, { opacity: 1, transform: 'scale(.86)', offset: 0.55 }, { opacity: 1, transform: 'scale(1.04)', offset: 0.8 }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.3,1)' });
  SND.play('stamp');
  return s;
}

/* ---------------- sk-koma + sk-koma-panel: tabs laid out as manga panels ---------------- */
export class SkKomaPanel extends SkElement {
  static props = { value: String, label: String, count: String, active: Boolean };
  static styles = css`:host{display:none;box-sizing:border-box;height:100%;padding:16px 20px;overflow:hidden;font:500 15px/1.5 var(--sk-font)}:host([active]){display:block}`;
  setup() { this.setAttribute('role', 'tabpanel'); }
  sync(name) { if ((name === 'label' || name === 'count') && this.parentElement && this.parentElement.build) this.parentElement.build(); }
}
define('sk-koma-panel', SkKomaPanel);

export class SkKoma extends SkElement {
  static props = { value: String };
  static styles = css`
:host{display:block;position:relative;height:250px;--strip:64px;--gap:9px}
.frames{position:absolute;inset:0}
.pn{position:absolute;inset:0;border:0;padding:0;background:none;cursor:pointer;color:var(--sk-ink)}
.pn[aria-selected=true]{pointer-events:none}
.bg{position:absolute;inset:0;background:${TONE('lav')}}
.pn[aria-selected=true] .bg{opacity:.55;background:repeating-conic-gradient(from 0deg at 100% 100%,transparent 0 2.4deg,color-mix(in srgb,var(--sk-lav) 70%,transparent) 2.4deg 3deg);-webkit-mask:radial-gradient(circle at 100% 100%,#000 0,transparent 70%);mask:radial-gradient(circle at 100% 100%,#000 0,transparent 70%)}
.strip{position:absolute;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;transition:translate var(--sk-bounce-t) var(--sk-bounce)}
.strip b{writing-mode:vertical-rl;font:italic 800 19px/1 var(--sk-font);letter-spacing:.1em;white-space:nowrap}
.strip i{font:italic 900 15px/1 var(--sk-font);color:var(--sk-violet)}
@media (hover:hover){.pn:hover .strip{translate:0 -3px}.pn:hover .strip b{color:var(--sk-violet)}}
.pn:focus-visible{outline:none}.pn:focus-visible .strip b{color:var(--sk-pink)}
.view{position:absolute;top:0;bottom:0;overflow:hidden}
.body{position:absolute;top:0;bottom:0;left:0}
svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
path{fill:none;stroke:var(--sk-ink);stroke-width:var(--sk-bw);stroke-linejoin:round}`;
  static template = `<div class="frames" role="tablist" part="base"></div><div class="view"><div class="body" part="panel"><slot></slot></div></div><svg aria-hidden="true"></svg>`;
  get panels() { return [...this.querySelectorAll(':scope > sk-koma-panel')]; }
  setup() {
    this.fr = this.$('.frames'); this.view = this.$('.view'); this.body = this.$('.body'); this.svg = this.$('svg');
    this.cur = -1; this.W = 0; this.H = 0; this.gut = [];
    this.fr.addEventListener('click', e => { const b = e.target.closest('.pn'); if (b) this.pick(+b.dataset.i, true); });
    this.fr.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      e.preventDefault(); const i = clamp(this.cur + d, 0, this.btns.length - 1); this.pick(i, true); this.btns[i].focus();
    });
    this.$('slot').addEventListener('slotchange', () => { this.build(); this.sync(null); });
    this.ro = new ResizeObserver(() => { this.measure(); this.place(false); });
  }
  connected() { this.build(); this.sync(null); this.ro.observe(this); }
  disconnected() { this.ro.disconnect(); this.gut.forEach(g => g.stop()); }
  build() {
    const ps = this.panels;
    this.fr.innerHTML = ps.map((p, i) => `<button class="pn" role="tab" data-i="${i}"><span class="bg"></span><span class="strip"><b></b><i></i></span></button>`).join('');
    this.btns = [...this.fr.children];
    this.btns.forEach((b, i) => { b.querySelector('b').textContent = ps[i].label || ps[i].value || i + 1; b.querySelector('i').textContent = ps[i].count || ''; });
    this.svg.innerHTML = ps.map(() => '<path/>').join(''); this.paths = [...this.svg.children];
    this.gut.forEach(g => g.stop());
    this.gut = ps.slice(1).map(() => tween(0, () => this.draw(), 300, 19));
    this.measure();
  }
  measure() { this.W = this.clientWidth; this.H = this.clientHeight; this.strip = pxOf(this, '--strip', 64); this.G = pxOf(this, '--gap', 9); }
  /* where the centre of each gutter sits when panel a is the open one */
  targets(a) {
    const n = this.btns.length, wide = this.W - (n - 1) * (this.strip + this.G), out = []; let x = 0;
    for (let i = 0; i < n - 1; i++) { x += (i === a ? wide : this.strip) + this.G; out.push(x - this.G / 2); }
    this.wide = wide; return out;
  }
  place(animate) {
    if (!this.btns || !this.btns.length || this.cur < 0 || !this.W) return;
    const tg = this.targets(this.cur);
    this.body.style.width = Math.max(0, this.wide - this.H * 0.128) + 'px';
    this.gut.forEach((g, j) => (animate ? g.set(tg[j]) : g.jump(tg[j])));
    if (!this.gut.length) this.draw();
  }
  draw() {
    const n = this.btns.length, W = this.W, H = this.H, G = this.G, sl = H * 0.064;
    const e = this.gut.map((g, j) => { const d = (j % 2 ? -1 : 1) * sl; return [g.v + d, g.v - d]; });
    for (let i = 0; i < n; i++) {
      const lt = i ? e[i - 1][0] + G / 2 : 0, lb = i ? e[i - 1][1] + G / 2 : 0, rt = i < n - 1 ? e[i][0] - G / 2 : W, rb = i < n - 1 ? e[i][1] - G / 2 : W;
      const x0 = Math.min(lt, lb), x1 = Math.max(rt, rb), b = this.btns[i], st = b.lastElementChild, k = (x1 - x0) / (this.wide + 30);
      this.paths[i].setAttribute('d', `M${lt} 0L${rt} 0L${rb} ${H}L${lb} ${H}Z`);
      b.style.clipPath = `polygon(${lt}px 0,${rt}px 0,${rb}px ${H}px,${lb}px ${H}px)`;
      st.style.left = x0 + 'px'; st.style.width = x1 - x0 + 'px';
      st.style.opacity = i === this.cur ? 0 : clamp((0.62 - k) / 0.22, 0, 1);
      if (i === this.cur) {
        this.view.style.left = x0 + 'px'; this.view.style.width = x1 - x0 + 'px';
        this.view.style.clipPath = `polygon(${lt - x0}px 0,${rt - x0}px 0,${rb - x0}px ${H}px,${lb - x0}px ${H}px)`;
        this.view.style.opacity = clamp((k - 0.55) / 0.35, 0, 1);
        this.body.style.left = Math.max(lt, lb) - x0 + 'px';
      }
    }
  }
  sync() {
    const ps = this.panels; if (!ps.length || !this.btns) return;
    let i = ps.findIndex(p => (p.value || '') === this.value); if (i < 0) i = 0;
    const first = this.cur < 0;
    ps.forEach((p, k) => { p.active = k === i; });
    this.btns.forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    this.cur = i; this.place(!first);
  }
  pick(i, user) {
    const ps = this.panels; if (i === this.cur || !ps[i]) return;
    this.value = ps[i].value || String(i);
    if (this.cur !== i) { this.cur = i; this.sync(); }
    play(this.body, [{ transform: 'translateX(-14px)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    const q = this.rect; FX.ticks({ x: q.l + (this.gut[i - 1] ? this.gut[i - 1].t : 0) + 30, y: q.t - 5, angle: -Math.PI / 2, len: 9, life: 0.3 });
    SND.play('flip');
    if (user) this.emit('change', { value: this.value });
  }
}
define('sk-koma', SkKoma);

/* ---------------- sk-pages + sk-page: a pager you turn by its corner ---------------- */
export class SkPage extends SkElement {
  static styles = css`:host{display:block;box-sizing:border-box;height:100%;overflow:hidden}`;
}
define('sk-page', SkPage);

// the part of a polygon on one side of the fold line x + y = c
function fold(poly, c, keep) {
  const s = keep ? 1 : -1, out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = (a[0] + a[1] - c) * s, db = (b[0] + b[1] - c) * s;
    if (da <= 0) out.push(a);
    if (da <= 0 !== db <= 0) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
const poly = pts => (pts.length ? 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z' : '');

export class SkPages extends SkElement {
  static props = { page: [Number, 0], label: [String, 'Next page'] };
  static styles = css`
:host{display:inline-block;vertical-align:middle;position:relative;width:300px;height:212px;margin:0 9px 9px 0;--pr:calc(var(--sk-r)*.22)}
.sheet{position:absolute;inset:0;border:var(--sk-bw) solid var(--sk-ink);border-radius:var(--pr);background:var(--sk-surface)}
.s2{translate:9px 9px;background:var(--sk-lav)}.s1{translate:4.5px 4.5px}
.pg{position:absolute;inset:0;background:var(--sk-surface);overflow:hidden;border-radius:var(--pr)}
.under{border:var(--sk-bw) solid var(--sk-ink)}.top{padding:var(--sk-bw)}
svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.shade{fill:var(--sk-ink);opacity:.16}
.edge{fill:none;stroke:var(--sk-ink);stroke-width:var(--sk-bw);stroke-linejoin:round}
.flap{stroke:var(--sk-ink);stroke-width:var(--sk-bw);stroke-linejoin:round}
.grab{position:absolute;right:-6px;bottom:-6px;width:74px;height:74px;cursor:grab;touch-action:none;border-radius:0 0 8px 0}
.grab:active{cursor:grabbing}`;
  static template = `<div class="sheet s2"></div><div class="sheet s1"></div>
<div class="pg under"><slot name="under"></slot></div><div class="pg top" part="page"><slot name="top"></slot></div>
<svg aria-hidden="true"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--sk-lav)"/><stop offset=".55" style="stop-color:var(--sk-surface)"/></linearGradient>
<pattern id="d" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1" style="fill:var(--sk-peri)"/></pattern></defs>
<path class="shade"/><path class="edge"/><path class="flap" fill="url(#g)"/><path class="dots" fill="url(#d)" opacity=".5"/></svg>
<div class="grab" role="button" tabindex="0" part="corner"></div>`;
  get pages() { return [...this.querySelectorAll(':scope > sk-page')]; }
  setup() {
    this.top = this.$('.top'); this.grab = this.$('.grab'); this.grad = this.$('#g');
    this.e = { shade: this.$('.shade'), edge: this.$('.edge'), flap: this.$('.flap'), dots: this.$('.dots') };
    this.busy = false; this.W = 300; this.H = 212;
    this.f = tween(0, c => this.draw(c), 240, 17);
    const g = this.grab; let drag = null;
    g.addEventListener('pointerenter', () => { if (!drag && !this.busy && matchMedia('(hover:hover)').matches) this.f.set(this.peek); });
    g.addEventListener('pointerleave', () => { if (!drag && !this.busy) this.f.set(this.rest); });
    g.addEventListener('pointerdown', e => { if (this.busy) return; g.setPointerCapture(e.pointerId); drag = this.getBoundingClientRect(); SND.play('tap'); });
    g.addEventListener('pointermove', e => { if (drag) this.f.set(clamp((this.W + this.H + e.clientX - drag.left + e.clientY - drag.top) / 2, -20, this.rest)); });
    const end = () => { if (!drag) return; drag = null; this.f.t < (this.W + this.H) * 0.56 ? this.next() : this.f.set(this.rest); };
    g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
    });
    this.kids = new MutationObserver(() => this.assign());
    this.ro = new ResizeObserver(() => { this.measure(); this.f.jump(this.rest); });
  }
  connected() { this.measure(); this.assign(); this.f.jump(this.rest); this.ro.observe(this); this.kids.observe(this, { childList: true }); }
  disconnected() { this.ro.disconnect(); this.kids.disconnect(); this.f.stop(); }
  measure() { this.W = this.clientWidth || 300; this.H = this.clientHeight || 212; const D = this.W + this.H; this.rest = D - 30; this.peek = D - Math.min(132, this.W * 0.44); }
  /* the current page lies on top; the next one is already underneath, which is what the lifted corner shows */
  assign() {
    const ps = this.pages, n = ps.length; if (!n) return;
    const i = ((Math.round(this.page) % n) + n) % n;
    ps.forEach((p, k) => { const want = k === i ? 'top' : k === (i + 1) % n && n > 1 ? 'under' : null; if (p.getAttribute('slot') !== want) want ? p.setAttribute('slot', want) : p.removeAttribute('slot'); });
  }
  sync(name) { if (name === 'page') this.assign(); if (name === 'label' || name == null) this.grab.setAttribute('aria-label', this.label); }
  draw(c) {
    const W = this.W, H = this.H, R = [[0, 0], [W, 0], [W, H], [0, H]], keep = fold(R, c, true), cut = fold(R, c, false);
    // the lifted part folds back over the page: a mirror image across the fold line
    const fl = cut.map(([x, y]) => [c - y, c - x]), m = c / 2, depth = Math.min(90, (W + H - c) * 0.45 + 12), e = this.e;
    this.top.style.clipPath = keep.length ? `polygon(${keep.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})` : 'polygon(0 0,0 0,0 0)';
    e.edge.setAttribute('d', poly(keep)); e.flap.setAttribute('d', poly(fl)); e.dots.setAttribute('d', poly(fl));
    e.shade.setAttribute('d', poly(fl.map(([x, y]) => [x - 5, y - 3])));
    this.grad.setAttribute('x1', m); this.grad.setAttribute('y1', m); this.grad.setAttribute('x2', m - depth); this.grad.setAttribute('y2', m - depth);
  }
  go(i) { const n = this.pages.length; if (n) { this.page = ((i % n) + n) % n; this.emit('change', { page: this.page }); } }
  next() {
    if (this.busy || this.pages.length < 2) return;
    const q = this.rect;
    sfx('ペラッ', { voice: 'swish', x: q.r - 10, y: q.b - 40, size: 30, hold: 380 });
    if (reduced || !level()) return this.go(this.page + 1);
    this.busy = true; this.f.k = 160; this.f.c = 22; this.f.set(-40);
    const wait = () => {
      if (this.f.v > 30 && this.isConnected) return requestAnimationFrame(wait);
      this.go(this.page + 1);
      this.f.k = 240; this.f.c = 17; this.f.jump(this.W + this.H); this.f.set(this.rest); this.busy = false;
    };
    wait();
  }
  prev() {
    if (this.busy || this.pages.length < 2) return;
    // the page before comes back down on top
    this.go(this.page - 1); SND.play('flip');
    if (reduced || !level()) return;
    this.busy = true; this.f.jump(-40); this.f.k = 170; this.f.c = 18; this.f.set(this.rest);
    this.at(300, () => { this.f.k = 240; this.f.c = 17; this.busy = false; });
  }
}
define('sk-pages', SkPages);

/* ---------------- sk-balloon-input: a text field whose balloon takes the tone of what is typed ---------------- */
const BN = 180, JIT = [0.2, 0.9, 0.5, 1, 0.1, 0.7, 0.35, 0.95, 0.6, 0.15, 0.8, 0.45, 1, 0.25, 0.65, 0.05, 0.85, 0.4, 0.75, 0.3, 0.55];
const tri = u => Math.abs((u % 1) - 0.5) * 4 - 1;
// A lettered balloon is not an ellipse: it is a little squarer and heavier on one shoulder.
// On top of that: spikes (S), cloud bumps (C), a slow wave (V) and a fine shiver (T).
function balloon(a, b, m) {
  const pts = [], n = 2.35;
  for (let i = 0; i < BN; i++) {
    const t = (i / BN) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t), k = 1 + 0.035 * Math.cos(t + 0.7);
    const x = a * k * Math.sign(c) * Math.abs(c) ** (2 / n), y = b * k * Math.sign(sn) * Math.abs(sn) ** (2 / n);
    let nx = x / (a * a), ny = y / (b * b); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const o = m.S * tri((i * 21) / BN) * (0.75 + 0.45 * JIT[Math.floor((i * 21) / BN)]) * 9 + m.C * (Math.sin(Math.PI * (((i * 14) / BN) % 1)) - 0.35) * 10 + m.V * Math.sin(t * 9) * 4.2 + m.T * tri((i * 44) / BN) * 2.3;
    pts.push((x + nx * o).toFixed(1) + ' ' + (y + ny * o).toFixed(1));
  }
  return 'M' + pts.join('L') + 'Z';
}
// the tail: a curved wedge towards the speaker; it zigzags for a shout and snakes for a song
function tailOf(bx, by, tx, ty, w, m) {
  const L = [], R = [], k = 9, dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len;
  for (let i = 0; i <= k; i++) {
    const f = i / k, ww = w * (1 - f) ** 1.15, mid = i > 0 && i < k ? 1 : 0;
    const off = Math.sin(f * Math.PI) * 9 + (m.S * 7 + m.T * 2.5) * (i % 2 ? 1 : -1) * (1 - f) * mid + m.V * Math.sin(f * Math.PI * 3) * 6 * mid;
    const cx = bx + dx * f + px * off, cy = by + dy * f + py * off;
    L.push((cx + (px * ww) / 2).toFixed(1) + ' ' + (cy + (py * ww) / 2).toFixed(1)); R.unshift((cx - (px * ww) / 2).toFixed(1) + ' ' + (cy - (py * ww) / 2).toFixed(1));
  }
  return 'M' + L.concat(R).join('L') + 'Z';
}
const TONES = {
  say: { snd: 'tap' }, shout: { S: 1, snd: 'click' }, ask: { R: -5, snd: 'pick' }, hush: { D: 1, snd: 'swish' },
  think: { C: 1, snd: 'puff' }, sing: { V: 1, snd: 'ting' }, tremble: { T: 1, snd: 'droop' },
};
/* which tone a line of text is written in */
export function toneOf(text) {
  const x = String(text || '').trim();
  if (!x) return 'say';
  if (/^[（(]/.test(x) || /[)）]$/.test(x)) return 'think';
  if (/呜|QAQ|>_<|T_T/.test(x)) return 'tremble';
  if (/[～~♪]/.test(x)) return 'sing';
  if (/^(…|\.\.\.|。。)/.test(x) || /(…|\.\.\.)$/.test(x)) return 'hush';
  const up = x.replace(/[^A-Za-z]/g, '');
  if (/[!！]$/.test(x) || (up.length >= 3 && up === up.toUpperCase())) return 'shout';
  if (/[?？]$/.test(x)) return 'ask';
  return 'say';
}
export class SkBalloonInput extends SkElement {
  static formAssociated = true;
  static delegatesFocus = true;
  static props = { value: [String, ''], placeholder: [String, ''], maxlength: [Number, 60], tone: [String, 'say'], tail: [String, 'left'], disabled: Boolean, name: String };
  static styles = css`
:host{display:block;position:relative;height:96px;min-width:220px;margin:0 0 26px}
svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.fo{fill:none;stroke:var(--sk-pink);stroke-linejoin:round;opacity:0;transition:opacity .12s}
:host(:focus-within) .fo{opacity:1}
.ink{stroke:var(--sk-ink);stroke-linejoin:round}.paper{fill:var(--sk-surface)}
.bub circle{fill:var(--sk-surface);stroke:var(--sk-ink);stroke-width:var(--sk-bw)}
input{position:absolute;left:12%;width:76%;top:50%;height:36px;margin-top:-18px;border:0;outline:0;background:none;padding:0;text-align:center;font:600 17px/36px var(--sk-font);color:var(--sk-ink);transition:font-size .15s}
input:focus-visible{outline:none}
input::placeholder{color:color-mix(in srgb,var(--sk-muted) 65%,transparent)}
:host([tone=shout]) input{font-style:italic;font-weight:800;font-size:20px}
:host([tone=think]) input,:host([tone=sing]) input{color:var(--sk-violet)}
:host([tone=hush]) input{color:var(--sk-muted);font-size:14.5px;letter-spacing:.05em}
:host([tone=tremble]) input{animation:sh .12s steps(2) infinite}
@keyframes sh{from{translate:-.7px .4px}to{translate:.7px -.4px}}
@media (prefers-reduced-motion:reduce){:host([tone=tremble]) input{animation:none}}`;
  static template = `<svg aria-hidden="true"><path class="fo"/><g class="ink"><path/><path/></g><g class="paper"><path/><path/></g><g class="bub"><circle/><circle/><circle/></g></svg><input id="c" part="input">`;
  setup() {
    this.inp = this.$('input'); this.ink = this.$$('.ink path'); this.paper = this.$$('.paper path'); this.inkG = this.$('.ink'); this.fo = this.$('.fo'); this.bubs = this.$$('.bub circle');
    const d = () => this.draw();
    this.m = { S: tween(0, d, 280, 15), C: tween(0, d, 280, 15), V: tween(0, d, 280, 15), T: tween(0, d, 280, 15), D: tween(0, d, 300, 28), R: tween(0, d, 280, 15), Z: tween(1, d, 380, 14) };
    this.inp.addEventListener('input', e => { e.stopPropagation(); this.value = this.inp.value; this.emit('input', { value: this.value, tone: this.tone }); });
    this.inp.addEventListener('change', e => e.stopPropagation());
    this.inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); this.send(); } });
    this.ro = new ResizeObserver(() => this.draw());
  }
  connected() { this.bw = pxOf(this, '--sk-bw', 3); this.ro.observe(this); }
  disconnected() { this.ro.disconnect(); Object.values(this.m).forEach(t => t.stop()); }
  sync(name) {
    const i = this.inp;
    if (i.value !== this.value) i.value = this.value;
    i.placeholder = this.placeholder; i.maxLength = this.maxlength; i.disabled = this.disabled;
    i.setAttribute('aria-label', this.getAttribute('aria-label') || this.placeholder || 'Message');
    this.setForm(this.value);
    if (name === 'value' || name == null) { const t = toneOf(this.value); if (t !== this.tone) { this.mute = name == null; this.tone = t; this.mute = false; return; } }
    if (name === 'tone' || name == null) this.retone(name === 'tone' && !this.mute);
    if (name === 'tail') this.draw();
  }
  retone(live) {
    const T = TONES[this.tone] || TONES.say, m = this.m;
    for (const k of ['S', 'C', 'V', 'T', 'D', 'R']) (live ? m[k].set(T[k] || 0) : m[k].jump(T[k] || 0));
    if (!live) return;
    m.Z.kick(this.tone === 'shout' ? 3.2 : this.tone === 'hush' || this.tone === 'tremble' ? -2.4 : -1.6);
    if (this.tone === 'shout') { const q = this.rect; FX.ticks({ x: q.r - 10, y: q.t - 4, angle: -0.8, len: 12 }); }
    SND.play(T.snd, this.tone === 'hush' ? { small: 1 } : undefined);
    this.emit('tone', { tone: this.tone });
  }
  draw() {
    const W = this.clientWidth, H = this.clientHeight; if (!W || !this.m) return;
    const v = this.m, m = { S: v.S.v, C: v.C.v, V: v.V.v, T: v.T.v }, D = v.D.v, z = v.Z.v, cx = W / 2, cy = H / 2, a = (W / 2 - 16) * z, b = (H / 2 - 12) * (2 - z);
    const body = balloon(a, b, m), sd = this.tail === 'right' ? -1 : 1, on = this.tail !== 'none';
    const tl = on ? tailOf(cx - sd * a * 0.5, cy + b * 0.35, cx - sd * (W / 2 - 22), H + 22, 30, m) : '', tf = `translate(${cx} ${cy}) rotate(${v.R.v.toFixed(2)})`;
    // the outline is the ink layer stroked twice as wide and then covered by the paper layer, so tail and body join without a seam
    for (const g of [this.ink, this.paper]) { g[0].setAttribute('d', tl); g[1].setAttribute('d', body); g[1].setAttribute('transform', tf); }
    const lw = (this.bw + m.S * 0.6 - D * 0.7) * 2;
    this.inkG.setAttribute('stroke-width', lw); this.inkG.setAttribute('stroke-dasharray', D > 0.02 ? `8 ${D * 7}` : 'none');
    this.inkG.setAttribute('fill', D > 0.5 ? 'none' : 'var(--sk-ink)');
    this.fo.setAttribute('d', body); this.fo.setAttribute('transform', tf); this.fo.setAttribute('stroke-width', lw + 8);
    // a thought has no tail: a trail of bubbles leads back to the thinker instead
    this.ink[0].style.opacity = this.paper[0].style.opacity = Math.max(0, 1 - m.C * 1.4);
    [[cx - sd * a * 0.62, cy + b + 12, 8], [cx - sd * (W / 2 - 40), H + 10, 5.4], [cx - sd * (W / 2 - 24), H + 22, 3.4]].forEach(([x, y, r], i) => {
      const c = this.bubs[i]; c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', Math.max(0, r * m.C * (on ? 1 : 0))); c.style.display = m.C > 0.05 && on ? '' : 'none';
    });
  }
  /* send what is written: fires `send` with { value, tone }, then empties the field unless the event is cancelled */
  send() {
    const value = this.value.trim();
    if (!value) { anim(this, 'nope'); SND.play('buzz'); return false; }
    if (this.emit('send', { value, tone: this.tone })) { this.clear(); this.m.Z.kick(-3); SND.play('pop'); }
    return true;
  }
  clear() { this.value = ''; }
}
define('sk-balloon-input', SkBalloonInput);

/* ---------------- sk-speedbar: progress you can see the speed of ---------------- */
const STREAKS = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="18" viewBox="0 0 160 18"><path d="M6 4.5Q38 3 66 4.5Q38 6 6 4.5ZM84 9Q118 7.2 152 9Q118 10.8 84 9ZM22 13.5Q52 12.2 78 13.5Q52 14.8 22 13.5ZM110 4Q128 3 146 4Q128 5 110 4Z"/></svg>') + '")';
export class SkSpeedbar extends SkElement {
  static props = { value: [Number, 0], speed: Number, fast: [Number, 14], stall: [Number, 900], seal: [String, '完'], label: String };
  static styles = css`
:host{display:inline-block;vertical-align:middle;position:relative;width:240px;padding:20px 0 8px;--seal:40px}
.bar{position:relative;height:24px;border:var(--sk-bw) solid var(--sk-ink);border-radius:999px;overflow:hidden;background:var(--sk-surface)}
.fill{position:absolute;inset:0 auto 0 0;width:calc(var(--p,0)*100%);min-width:0;background:var(--sk-peri);border-right:var(--sk-bw) solid var(--sk-ink);overflow:hidden}
:host([data-done]) .fill{border-right-color:transparent}
.st{position:absolute;inset:0 -160px 0 auto;width:640px;background:var(--sk-fxw);-webkit-mask:${STREAKS} 0 50%/160px 100% repeat-x;mask:${STREAKS} 0 50%/160px 100% repeat-x;opacity:0;transition:opacity .2s}
:host([data-run]) .st{opacity:1}
.drop{position:absolute;top:-3px;left:calc(var(--p,0)*100%);width:17px;margin-left:-9px;overflow:visible;opacity:0;pointer-events:none}
.drop path{fill:var(--sk-lav);stroke:var(--sk-ink);stroke-width:2.2}
${SEAL_CSS}`;
  static template = `<div class="bar" part="base"><div class="fill" part="fill"><div class="st"></div></div></div><svg class="drop" viewBox="0 0 16 24" aria-hidden="true"><path d="M8 1C10 7 15 11 15 16A7 7 0 0 1 1 16C1 11 6 7 8 1Z"/></svg>`;
  setup() { this.bar = this.$('.bar'); this.st = this.$('.st'); this.drop = this.$('.drop'); this.sp = 0; this.lastV = null; this.lastT = 0; this.setAttribute('role', 'progressbar'); this.setAttribute('aria-valuemin', 0); this.setAttribute('aria-valuemax', 100); }
  disconnected() { this.halt(); if (this.run) { this.run.cancel(); this.run = null; } }
  halt() { clearInterval(this.lines); clearTimeout(this.wait); this.lines = this.wait = 0; this.toggleAttribute('data-run', false); if (this.run) this.run.pause(); }
  sync(name) {
    const v = clamp(this.value, 0, 100), now = performance.now();
    this.style.setProperty('--p', (v / 100).toFixed(4)); this.setAttribute('aria-valuenow', Math.round(v));
    if (this.label) this.setAttribute('aria-label', this.label);
    if (name === 'speed') return this.pace();
    if (name !== 'value') { this.lastV = v; this.lastT = now; if (v >= 100) this.toggleAttribute('data-done', true); return; }
    const was = this.lastV, dt = (now - this.lastT) / 1000; this.lastV = v; this.lastT = now;
    if (v < 100 && this.sealEl) { this.sealEl.remove(); this.sealEl = null; this.toggleAttribute('data-done', false); }
    if (v >= 100) return was < 100 ? this.finish() : undefined;
    if (v <= was) { if (v < was) { this.halt(); this.sp = 0; this.toggleAttribute('data-stall', false); if (this.dropA) { this.dropA.cancel(); this.dropA = null; } } return; }
    // the speed is read off the value itself: how far it moved since the last change
    if (dt > 0.004) this.sp = this.sp * 0.55 + ((v - was) / dt) * 0.45;
    if (this.hasAttribute('data-stall')) this.resume();
    this.pace();
    clearTimeout(this.wait); this.wait = setTimeout(() => this.stalled(), this.stall);
  }
  /* 0..1: how fast it is going, from the `speed` attribute if given, else from how the value has been moving */
  get pace01() { return clamp(this.speed != null && this.hasAttribute('speed') ? this.speed : this.sp / this.fast, 0, 1); }
  pace() {
    const n = this.pace01, v = clamp(this.value, 0, 100);
    if (!level() || n <= 0 || v >= 100 || v <= 0) return;
    this.toggleAttribute('data-run', true);
    if (!this.run) this.run = play(this.st, [{ transform: 'translateX(0)' }, { transform: 'translateX(-160px)' }], { duration: 520, iterations: Infinity });
    if (this.run) { this.run.playbackRate = 0.35 + 1.9 * n; this.run.play(); }
    // speed lines stream back from the leading edge, above and below the bar: more and longer the faster it goes
    if (!this.lines) this.lines = setInterval(() => {
      const k = this.pace01, q = rectOf(this.bar), x = q.l + (q.w * clamp(this.value, 0, 100)) / 100 - 6;
      if (document.hidden || k <= 0.04) return;
      for (const y of [q.t - 7, q.b + 7]) FX.lines({ x, y, angle: Math.PI, n: 1 + Math.round(k * 2), len: 16 + 36 * k, spread: 9, dist: 22 + 34 * k, life: 0.3, w: 2 });
    }, 150);
  }
  stalled() {
    if (clamp(this.value, 0, 100) >= 100) return;
    this.halt(); this.sp = 0; this.toggleAttribute('data-stall', true);
    this.dropA = play(this.drop, [{ opacity: 0, transform: 'translateY(-6px) scale(.4)' }, { opacity: 1, transform: 'translateY(0) scale(1.1)', offset: 0.4 }, { opacity: 1, transform: 'translateY(8px) scale(1)' }], { duration: 900, fill: 'forwards', easing: 'ease-in' });
    anim(this.bar, 'nope'); SND.play('droop');
    this.emit('stall');
  }
  resume() {
    this.toggleAttribute('data-stall', false); if (this.dropA) { this.dropA.cancel(); this.dropA = null; }
    const q = rectOf(this.bar);
    sfx('ダッ', { voice: 'swish', x: q.l + (q.w * this.value) / 100 - 8, y: q.t - 22, size: 24, hold: 300 });
  }
  finish() {
    this.halt(); this.toggleAttribute('data-stall', false); if (this.dropA) { this.dropA.cancel(); this.dropA = null; }
    this.toggleAttribute('data-done', true);
    play(this.$('.fill'), [{ background: 'var(--sk-surface)' }, { background: 'var(--sk-peri)' }], { duration: 260 });
    if (this.seal) this.at(200, () => { if (this.hasAttribute('data-done') && !this.sealEl) this.sealEl = seal(this.shadowRoot, this.seal, 'calc(100% - 6px)', '14px'); });
    this.emit('done');
  }
}
define('sk-speedbar', SkSpeedbar);

/* ---------------- sk-flash: a confirmation drawn as a black flash (ベタフラッシュ) ---------------- */
function burst(cx, cy, rx, ry, reach) {
  const R = rng(7); let d = '';
  for (let i = 0, n = 120; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.03, w = 0.022 + R() * 0.03, len = 20 + R() ** 2 * reach, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry, el = Math.hypot(ex, ey);
    const p = t => (cx + Math.cos(t) * rx * 0.92).toFixed(1) + ' ' + (cy + Math.sin(t) * ry * 0.92).toFixed(1);
    d += `M${p(a - w)}L${(cx + ex + (ex / el) * len).toFixed(1)} ${(cy + ey + (ey / el) * len).toFixed(1)}L${p(a + w)}Z`;
  }
  return d;
}
export class SkFlash extends SkElement {
  static props = { heading: String, note: String, confirm: [String, 'Delete'], cancel: [String, 'Keep'], word: [String, 'ザンッ!'], open: Boolean };
  static styles = css`
:host{display:block;position:relative}
.fl{position:absolute;inset:0;z-index:2;border-radius:var(--sk-r);overflow:hidden;visibility:hidden;color:var(--sk-ink)}
:host([open]) .fl{visibility:visible}
svg{position:absolute;inset:0;width:100%;height:100%}
.bk{fill:var(--sk-ink)}.bu{fill:var(--sk-surface)}
.q{position:absolute;left:0;right:0;top:40%;translate:0 -50%;padding:0 22%;text-align:center}
.q b{display:block;font:italic 800 19px/1.25 var(--sk-font)}
.q span{display:block;margin-top:3px;font:500 13px/1.4 var(--sk-font);color:var(--sk-muted)}
.acts{position:absolute;left:0;right:0;bottom:16px;display:flex;justify-content:center;gap:14px}
.acts button{min-width:88px;padding:8px 16px;border:var(--sk-bw) solid var(--sk-surface);border-radius:var(--sk-r);font:italic 700 15px/1 var(--sk-font);cursor:pointer}
.no{background:var(--sk-ink);color:var(--sk-surface)}.yes{background:var(--sk-pink);color:var(--sk-on-hot)}`;
  static template = `<slot></slot><div class="fl" role="alertdialog" aria-modal="true" part="flash"><svg aria-hidden="true"><rect class="bk" width="100%" height="100%"/><g class="bu"><path/><ellipse/></g></svg>
<div class="q"><b part="heading"></b><span part="note"></span></div><div class="acts"><button class="no press" part="cancel"></button><button class="yes press" part="confirm"></button></div></div>`;
  setup() {
    this.fl = this.$('.fl'); this.bu = this.$('.bu'); this.q = this.$('.q'); this.no = this.$('.no'); this.yes = this.$('.yes');
    this.no.addEventListener('click', () => this.answer(false)); this.yes.addEventListener('click', () => this.answer(true));
    this.fl.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); this.answer(false); }
      if (e.key === 'Tab') { e.preventDefault(); (this.shadowRoot.activeElement === this.no ? this.yes : this.no).focus(); }
    });
  }
  sync() {
    this.$('.q b').textContent = this.heading || ''; this.$('.q span').textContent = this.note || '';
    this.no.textContent = this.cancel; this.yes.textContent = this.confirm; this.fl.setAttribute('aria-label', this.heading || this.confirm);
  }
  /* ask the question. `from` is the element the black floods out of (the button that was pressed). Resolves true or false. */
  ask(from) {
    if (this.open) return this.pending;
    const b = this.getBoundingClientRect(), W = b.width, H = b.height, cx = W / 2, cy = H * 0.4, rx = Math.min(W * 0.4, 176), ry = Math.min(H * 0.23, 58);
    const f = from && from.getBoundingClientRect ? from.getBoundingClientRect() : null;
    this.o = f ? `${f.left - b.left + f.width / 2}px ${f.top - b.top + f.height / 2}px` : '50% 50%'; this.far = Math.hypot(W, H); this.from = from;
    this.bu.firstElementChild.setAttribute('d', burst(cx, cy, rx, ry, Math.max(W, H) * 0.42));
    const e = this.bu.lastElementChild; e.setAttribute('cx', cx); e.setAttribute('cy', cy); e.setAttribute('rx', rx * 0.95); e.setAttribute('ry', ry * 0.95);
    this.bu.style.transformOrigin = `${cx}px ${cy}px`;
    this.open = true;
    // the black floods out from where you pressed; the white burst and the question land a beat later
    play(this.fl, [{ clipPath: `circle(0px at ${this.o})` }, { clipPath: `circle(${this.far}px at ${this.o})` }], { duration: 300, easing: 'cubic-bezier(.5,0,.2,1)' });
    play(this.bu, [{ transform: 'scale(.35)' }, { transform: 'scale(.35)', offset: 0.35 }, { transform: 'scale(1.12)', offset: 0.7 }, { transform: 'scale(.97)', offset: 0.85 }, { transform: 'none' }], { duration: 520, easing: 'ease-out' });
    play(this.q, [{ scale: '.6', opacity: 0 }, { scale: '.6', opacity: 0, offset: 0.4 }, { scale: '1.08', opacity: 1, offset: 0.75 }, { scale: '1', opacity: 1 }], { duration: 480 });
    SND.play('doki');
    this.at(120, () => this.no.focus());
    return (this.pending = new Promise(r => { this.done = r; }));
  }
  answer(yes) {
    if (!this.open || !this.done) return;
    const done = this.done; this.done = null;
    const shut = () => { this.open = false; if (this.from && this.from.focus && this.from.isConnected) this.from.focus(); };
    if (yes) {
      const q = this.rect;
      if (this.word) sfx(this.word, { voice: 'cut', x: q.cx, y: q.t + 34, size: 52, hold: 520 });
      shake(this, 7, 260);
      const a = play(this.fl, [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 460 });
      a ? (a.onfinish = shut) : shut();
    } else {
      SND.play('puff');
      const a = play(this.fl, [{ clipPath: `circle(${this.far}px at ${this.o})` }, { clipPath: `circle(0px at ${this.o})` }], { duration: 240, easing: 'cubic-bezier(.6,0,.6,1)' });
      a ? (a.onfinish = shut) : shut();
    }
    this.emit(yes ? 'confirm' : 'cancel'); done(yes);
  }
}
define('sk-flash', SkFlash);

/* ---------------- sk-tone: a slider whose track is a sheet of screentone ---------------- */
// dots on a 45-degree grid; f(x, y) is each dot's radius as a fraction of the cell
function dots(ctx, w, h, cell, f) {
  const c = Math.SQRT1_2, n = Math.ceil((w + h) / cell) + 2;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const x = (i - j) * c * cell + w / 2, y = (i + j) * c * cell + h / 2;
    if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
    const r = f(x, y);
    if (r > 0.04) { ctx.beginPath(); ctx.arc(x, y, r * cell * 0.5, 0, Math.PI * 2); ctx.fill(); }
  }
}
const dotR = d => Math.sqrt(clamp(d, 0, 1)) * 1.13;   // the radius that covers a fraction d of its cell
export class SkTone extends SkElement {
  static formAssociated = true;
  static props = { value: [Number, 30], min: [Number, 0], max: [Number, 80], step: [Number, 1], preview: Boolean, disabled: Boolean, name: String, label: String };
  static styles = css`
:host{display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 22px;max-width:100%;vertical-align:middle}
.ball{display:none;width:176px;height:176px}:host([preview]) .ball{display:block}
.track{position:relative;flex:none;width:220px;max-width:100%;box-sizing:border-box;height:30px;border:var(--sk-bw) solid var(--sk-ink);border-radius:15px;background:var(--sk-surface);cursor:pointer;touch-action:none}
.track canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:12px}
.knob{position:absolute;top:50%;left:0;width:32px;height:32px;margin:-16px 0 0 -16px;border:var(--sk-bw) solid var(--sk-ink);border-radius:50%;background:var(--sk-surface);box-shadow:3px 3px 0 var(--sk-lav);display:grid;place-items:center;translate:var(--x,0) 0;transition:scale var(--sk-bounce-t) var(--sk-bounce)}
.knob::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--sk-pink)}
.track:active .knob{scale:1.12 .9}`;
  static template = `<canvas class="ball" width="176" height="176" aria-hidden="true"></canvas><div class="track" role="slider" tabindex="0" part="track"><canvas aria-hidden="true"></canvas><span class="knob" part="knob"></span></div>`;
  setup() {
    this.track = this.$('.track'); this.tcv = this.track.querySelector('canvas'); this.ball = this.$('.ball'); this.knob = this.$('.knob'); this.tickAt = null;
    this.shown = tween(this.value, v => this.render(v), 300, 22);
    const tr = this.track; let drag = false;
    const at = e => { const q = tr.getBoundingClientRect(), bw = this.bw; return this.min + ((e.clientX - q.left - bw) / (q.width - bw * 2)) * (this.max - this.min); };
    tr.addEventListener('pointerdown', e => { if (this.disabled) return; drag = true; tr.setPointerCapture(e.pointerId); this.put(at(e), 'input', true); });
    tr.addEventListener('pointermove', e => { if (drag) this.put(at(e), 'input'); });
    const up = () => { if (!drag) return; drag = false; anim(this.knob, 'squish'); this.emit('change', { value: this.value }); };
    tr.addEventListener('pointerup', up); tr.addEventListener('pointercancel', up);
    tr.addEventListener('keydown', e => {
      const big = (this.max - this.min) / 10, d = { ArrowRight: this.step, ArrowUp: this.step, ArrowLeft: -this.step, ArrowDown: -this.step, PageUp: big, PageDown: -big }[e.key];
      const to = e.key === 'Home' ? this.min : e.key === 'End' ? this.max : d ? this.value + d : null;
      if (to != null && !this.disabled) { e.preventDefault(); this.put(to, 'change', true); }
    });
    // the dots are drawn in the theme's ink, so redraw when the theme or palette changes
    this.mo = new MutationObserver(() => this.render(this.shown.v));
  }
  connected() { this.bw = pxOf(this, '--sk-bw', 3); this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sk-theme', 'data-sk-palette', 'style', 'class'] }); }
  disconnected() { this.mo.disconnect(); this.shown.stop(); }
  put(v, ev, glide) {
    const s = this.step || 1; v = clamp(Math.round(v / s) * s, this.min, this.max);
    if (v === this.value) return;
    this.glide = !!glide; this.value = v;
    if (this.tickAt == null || Math.abs(v - this.tickAt) >= (this.max - this.min) / 16) { this.tickAt = v; SND.play('pick'); }
    this.emit('input', { value: v }); if (ev === 'change') this.emit('change', { value: v });
  }
  sync(name) {
    const tr = this.track, v = clamp(this.value, this.min, this.max);
    tr.setAttribute('aria-valuemin', this.min); tr.setAttribute('aria-valuemax', this.max); tr.setAttribute('aria-valuenow', v); tr.setAttribute('aria-valuetext', v + '%');
    tr.setAttribute('aria-label', this.label || 'Tone'); tr.tabIndex = this.disabled ? -1 : 0;
    this.setForm(String(v));
    if (name === 'value' && this.glide !== false) this.shown.set(v); else this.shown.jump(v);
    this.glide = null;
  }
  render(v) {
    const cs = getComputedStyle(this), ink = cs.getPropertyValue('--sk-ink').trim() || '#1b1642', paper = cs.getPropertyValue('--sk-surface').trim() || '#fff';
    const dpr = Math.min(2, devicePixelRatio || 1), tr = this.track, w = tr.clientWidth || 214, h = tr.clientHeight || 24, d = v / 100, x = ((v - this.min) / (this.max - this.min || 1)) * w;
    if (this.tcv.width !== Math.round(w * dpr)) { this.tcv.width = Math.round(w * dpr); this.tcv.height = Math.round(h * dpr); }
    const t = this.tcv.getContext('2d');
    t.setTransform(dpr, 0, 0, dpr, 0, 0); t.clearRect(0, 0, w, h); t.fillStyle = ink;
    // the filled part carries the chosen tone; the rest shows the faint grid of the sheet
    t.save(); t.beginPath(); t.rect(0, 0, x, h); t.clip(); dots(t, w, h, 5, () => dotR(d)); t.restore();
    t.save(); t.beginPath(); t.rect(x, 0, w - x, h); t.clip(); t.globalAlpha = 0.22; dots(t, w, h, 5, () => 0.28); t.restore();
    this.knob.style.setProperty('--x', x + (this.bw || 3) + 'px');
    if (!this.preview) return;
    // a ball shaded with the same tone: light from the upper left, the dots swell towards the dark side
    const S = 176, C = S / 2, R = 62, cy = C - 10, b = this.ball.getContext('2d');
    if (this.ball.width !== S * dpr) this.ball.width = this.ball.height = S * dpr;
    b.setTransform(dpr, 0, 0, dpr, 0, 0); b.clearRect(0, 0, S, S); b.fillStyle = ink;
    b.save(); b.beginPath(); b.ellipse(C + 16, cy + R + 8, R * 0.95, 13, 0, 0, Math.PI * 2); b.clip();
    dots(b, S, S, 5, (px, py) => dotR(Math.min(0.95, d * 1.9) * (1 - Math.hypot((px - C - 16) / (R * 0.95), (py - cy - R - 8) / 13) * 0.55))); b.restore();
    b.save(); b.beginPath(); b.arc(C, cy, R, 0, Math.PI * 2); b.fillStyle = paper; b.fill(); b.clip(); b.fillStyle = ink;
    dots(b, S, S, 5, (px, py) => {
      const nx = (px - C) / R, ny = (py - cy) / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), sh = Math.max(0, 1 - ((nx * -0.55 + ny * -0.62 + nz * 0.56) * 0.5 + 0.5) * 1.35);
      return dotR(Math.min(0.92, d * (0.3 + sh * 1.8)) * Math.min(1, sh / 0.18));
    });
    b.restore();
    b.lineWidth = this.bw || 3; b.strokeStyle = ink; b.beginPath(); b.arc(C, cy, R, 0, Math.PI * 2); b.stroke();
    // the highlight is scraped out of the tone with a knife (トーン削り)
    b.fillStyle = paper; b.beginPath(); b.ellipse(C - 24, cy - 26, 11, 7, -0.7, 0, Math.PI * 2); b.fill();
  }
}
define('sk-tone', SkTone);

/* ---------------- sk-hatch: a meter that fills by cross-hatching (カケアミ) ---------------- */
const ANGLES = [-45, 45, 0, 90, -22, 68];
// one layer of ruled lines at an angle: each wobbles a little and stops short of the edge at random
function ruled(deg, w, h, gap, seed) {
  const R = rng(seed), t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), half = Math.hypot(w, h) / 2, cx = w / 2, cy = h / 2; let out = '';
  for (let o = -half; o <= half; o += gap) {
    const oo = o + (R() - 0.5) * gap * 0.35, a0 = -half * (0.9 + R() * 0.1), a1 = half * (0.9 + R() * 0.1), bend = (R() - 0.5) * 2.2;
    const x0 = cx - s * oo + c * a0, y0 = cy + c * oo + s * a0, x1 = cx - s * oo + c * a1, y1 = cy + c * oo + s * a1;
    out += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)}Q${((x0 + x1) / 2 - s * bend).toFixed(1)} ${((y0 + y1) / 2 + c * bend).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}" pathLength="1"/>`;
  }
  return out;
}
export class SkHatch extends SkElement {
  static props = { value: [Number, 0], max: [Number, 4], labels: String, seal: [String, '強'], label: String };
  static styles = css`
:host{display:block;position:relative;height:54px}
svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.bg{fill:var(--sk-surface)}.fr{fill:none;stroke:var(--sk-ink);stroke-width:var(--sk-bw)}
.ly{fill:none;stroke:var(--sk-ink);stroke-width:1.5;stroke-linecap:round}
.ly path{stroke-dasharray:1;stroke-dashoffset:1}
.lb{position:absolute;right:2px;bottom:calc(100% + 5px);font:italic 700 13px/1 var(--sk-font);color:var(--sk-muted)}
${SEAL_CSS}`;
  static template = `<svg aria-hidden="true"></svg><span class="lb" part="label"></span>`;
  setup() { this.svg = this.$('svg'); this.lb = this.$('.lb'); this.ly = []; this.W = 0; this.setAttribute('role', 'meter'); this.ro = new ResizeObserver(() => { if (this.clientWidth !== this.W) { this.build(); this.sync(null); } }); }
  connected() { this.ro.observe(this); }
  disconnected() { this.ro.disconnect(); this.ly.forEach(l => l.ext.stop()); }
  get n() { return clamp(Math.round(this.max), 1, ANGLES.length); }
  build() {
    const W = (this.W = this.clientWidth), H = this.clientHeight, bw = pxOf(this, '--sk-bw', 3), r = Math.max(2, pxOf(this, '--sk-r', 14) - 3), n = this.n; if (!W) return;
    this.ly.forEach(l => l.ext.stop());
    const fr = `x="${bw / 2}" y="${bw / 2}" width="${W - bw}" height="${H - bw}" rx="${r}"`;
    this.svg.innerHTML = `<defs><clipPath id="c"><rect x="${bw}" y="${bw}" width="${W - bw * 2}" height="${H - bw * 2}" rx="${Math.max(1, r - bw / 2)}"/></clipPath>${ANGLES.slice(0, n).map((a, i) => `<linearGradient id="g${i}" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop class="a" offset="0" stop-color="#fff"/><stop class="b" offset="0" stop-color="#000"/></linearGradient><mask id="m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#g${i})"/></mask>`).join('')}</defs>
<rect class="bg" ${fr}/><g clip-path="url(#c)">${ANGLES.slice(0, n).map((a, i) => `<g mask="url(#m${i})"><g class="ly" transform="translate(${bw} ${bw})">${ruled(a, W - bw * 2, H - bw * 2, 5.2 - i * 0.4, 11 + i)}</g></g>`).join('')}</g><rect class="fr" ${fr}/>`;
    this.ly = [...this.svg.querySelectorAll('.ly')].map((g, i) => {
      const a = this.svg.querySelector(`#g${i} .a`), b = this.svg.querySelector(`#g${i} .b`);
      return { paths: [...g.children], on: false, ext: tween(0, e => { a.setAttribute('offset', Math.max(0, e - 0.16)); b.setAttribute('offset', clamp(e, 0, 1)); }, 200, 20) };
    });
  }
  sync(name) {
    const n = this.n, v = clamp(Math.round(this.value), 0, n), was = this.was; this.was = v;
    const names = (this.labels || '').split(',').map(s => s.trim()).filter(Boolean), text = names[v] || '';
    this.lb.textContent = text;
    this.setAttribute('aria-valuemin', 0); this.setAttribute('aria-valuemax', n); this.setAttribute('aria-valuenow', v);
    if (text) this.setAttribute('aria-valuetext', text); if (this.label) this.setAttribute('aria-label', this.label);
    if (!this.ly.length) this.build();
    const live = name === 'value' && was != null; let order = 0;
    // each layer that is on reaches a quarter less far than the one before it, so the meter is darkest where it starts
    this.ly.forEach((L, i) => {
      const on = i < v, ext = on ? (v - i) / n + 0.08 : 0;
      live ? L.ext.set(ext) : L.ext.jump(ext);
      if (L.on === on) return;
      L.on = on; const k = on ? order++ : 0;
      L.paths.forEach((p, j) => {
        p.getAnimations().forEach(a => a.cancel()); p.style.strokeDashoffset = on ? 0 : 1;
        if (live) play(p, [{ strokeDashoffset: on ? 1 : 0 }, { strokeDashoffset: on ? 0 : 1 }], { duration: on ? 110 : 160, delay: on ? k * 160 + j * 7 : 0, easing: 'ease-out', fill: 'backwards' });
      });
    });
    if (live && v > was) { SND.play('pick'); play(this.lb, [{ translate: '0 4px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 200 }); }
    if (v < n && this.sealEl) { this.sealEl.remove(); this.sealEl = null; }
    if (v >= n && !this.sealEl && this.seal) {
      if (live) this.at(480, () => { if (this.was >= this.n && !this.sealEl) { this.sealEl = seal(this.shadowRoot, this.seal, 'calc(100% - 26px)', 'calc(100% + 6px)'); this.emit('full'); } });
      else { this.sealEl = document.createElement('span'); this.sealEl.className = 'seal'; this.sealEl.textContent = this.seal; this.sealEl.style.cssText = 'left:calc(100% - 26px);top:calc(100% + 6px)'; this.shadowRoot.appendChild(this.sealEl); loadFaces(); }
    }
  }
}
define('sk-hatch', SkHatch);

/* ---------------- sk-yonkoma + sk-koma-step: steps as a four-panel strip, from rough to finished page ---------------- */
export class SkKomaStep extends SkElement {
  static props = { mark: String, label: String, summary: String, state: [String, 'rough'] };
  static styles = css`
:host{display:flex;position:relative;align-items:center;gap:12px;min-height:0;padding:0 14px 0 10px;overflow:hidden;font:500 14px/1.3 var(--sk-font);--pc:color-mix(in srgb,var(--sk-peri) 78%,var(--sk-surface))}
svg{position:absolute;left:1.5px;top:1.5px;width:calc(100% - 3px);height:calc(100% - 3px);overflow:visible;pointer-events:none}
rect{fill:none;stroke:var(--sk-ink);stroke-width:var(--sk-bw)}
.d{display:none;stroke:var(--pc);stroke-width:1.4;transform:rotate(.35deg)}
.n{flex:none;display:grid;place-items:center;min-width:30px;height:30px;padding:0 4px;border-radius:5px;background:var(--sk-ink);color:var(--sk-surface);font:italic 900 16px/1 var(--sk-font)}
.t{flex:none;font:italic 800 17px/1.1 var(--sk-font)}
.b{display:flex;align-items:center;gap:10px;margin-left:auto}
.s{display:none;margin-left:auto;padding:3px 10px;border:2px solid var(--sk-ink);border-radius:999px;background:var(--sk-surface);font:700 12.5px/1.2 var(--sk-font)}
.s::before{content:"✓ ";color:var(--sk-pink)}
/* rough: blue pencil, with a second, slightly off line */
:host([state=rough]){color:var(--pc)}
:host([state=rough]) .f{stroke:var(--pc);stroke-width:1.6}:host([state=rough]) .d{display:block}
:host([state=rough]) .n{background:none;color:var(--pc);box-shadow:inset 0 0 0 1.6px var(--pc)}
:host([state=rough]) .b{display:none}
:host([state=now]){background:var(--sk-surface)}
:host([state=done]){background:${TONE('peri')},var(--sk-surface)}
:host([state=done]) .b{display:none}:host([state=done][summary]) .s{display:block}`;
  static template = `<svg aria-hidden="true"><rect class="d" x="2" y="-1.5" width="100%" height="100%" rx="1"/><rect class="f" width="100%" height="100%" pathLength="1"/></svg><span class="n" part="mark"></span><span class="t" part="label"></span><span class="b"><slot></slot></span><span class="s" part="summary"></span>`;
  setup() { this.setAttribute('role', 'listitem'); if (!this.hasAttribute('state')) this.setAttribute('state', 'rough'); }
  sync(name, old) {
    this.$('.n').textContent = this.mark || ''; this.$('.t').textContent = this.label || ''; this.$('.s').textContent = this.summary || '';
    this.state === 'now' ? this.setAttribute('aria-current', 'step') : this.removeAttribute('aria-current');
    if (name !== 'state' || old == null) return;
    if (this.state === 'now') {
      // the frame is inked in one stroke around the panel
      play(this.$('.f'), [{ strokeDasharray: '1', strokeDashoffset: 1 }, { strokeDasharray: '1', strokeDashoffset: 0 }], { duration: 420, easing: 'cubic-bezier(.5,0,.3,1)' });
      play(this.$('.n'), [{ transform: 'scale(.3) rotate(-30deg)' }, { transform: 'scale(1.2)', offset: 0.6 }, { transform: 'none' }], { duration: 360, delay: 120, fill: 'backwards' });
      play(this.$('.b'), [{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 220, fill: 'backwards' });
    } else if (this.state === 'done') play(this, [{ backgroundSize: '0 0,auto' }, { backgroundSize: '6px 6px,auto' }], { duration: 300 });
  }
}
define('sk-koma-step', SkKomaStep);

export class SkYonkoma extends SkElement {
  static props = { current: [Number, 0], seal: [String, '完'], word: [String, 'パァッ!'] };
  static styles = css`
:host{display:grid;position:relative;gap:8px;height:250px;transition:grid-template-rows var(--sk-bounce-t) var(--sk-bounce)}
@media (prefers-reduced-motion:reduce){:host{transition:none}}
${SEAL_CSS}`;
  static template = `<slot></slot>`;
  get steps() { return [...this.querySelectorAll(':scope > sk-koma-step')]; }
  setup() { this.setAttribute('role', 'list'); this.prev = null; this.$('slot').addEventListener('slotchange', () => this.sync(null)); }
  sync(name) {
    const st = this.steps, cur = clamp(this.current, 0, st.length), was = this.prev; this.prev = cur;
    st.forEach((s, i) => { const want = i < cur ? 'done' : i === cur ? 'now' : 'rough'; if (s.getAttribute('state') !== want) s.setAttribute('state', want); });
    this.style.gridTemplateRows = st.map((_, i) => (i === cur ? '1.9fr' : '1fr')).join(' ');
    if (cur < st.length && this.sealEl) { this.sealEl.remove(); this.sealEl = null; }
    if (name !== 'current' || was == null || cur === was) return;
    if (cur >= st.length && st.length) {
      const q = this.rect;
      if (this.word) sfx(this.word, { voice: 'shine', x: q.cx, y: q.t - 6, size: 44, hold: 600 });
      if (this.seal) this.at(300, () => { if (!this.sealEl && this.prev >= this.steps.length) this.sealEl = seal(this.shadowRoot, this.seal, 'calc(100% - 2px)', 'calc(100% - 6px)'); });
      this.emit('done');
    } else SND.play('swish', { small: 1 });
  }
  go(i) { const c = clamp(i, 0, this.steps.length); if (c !== this.current) { this.current = c; this.emit('change', { current: c }); } }
  next() { this.go(this.current + 1); }
  back() { this.go(this.current - 1); }
}
define('sk-yonkoma', SkYonkoma);

/* ---------------- sk-breakout: a card whose picture breaks out of its panel (枠破り) ---------------- */
export class SkBreakout extends SkElement {
  static props = { label: String, word: String, href: String };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-block;vertical-align:middle;width:300px;--panel:150px;--lift:-22%}
.c{display:block;position:relative;padding:14px 14px 16px;cursor:pointer;text-decoration:none;color:inherit;transition:translate var(--sk-bounce-t) var(--sk-bounce),rotate var(--sk-bounce-t) var(--sk-bounce),box-shadow var(--sk-bounce-t) var(--sk-bounce)}
.pn{position:relative;height:var(--panel)}
.bg{position:absolute;inset:0;overflow:hidden;background:${TONE('peri')}}
.bg::before{content:"";position:absolute;inset:-40%;opacity:0;scale:.8;transition:opacity .25s,scale var(--sk-bounce-t) var(--sk-bounce);background:repeating-conic-gradient(from 0deg at 50% 62%,transparent 0 3.4deg,var(--sk-ink) 3.4deg 4.2deg);-webkit-mask:radial-gradient(circle at 50% 62%,transparent 22%,#000 44%);mask:radial-gradient(circle at 50% 62%,transparent 22%,#000 44%)}
.frame{position:absolute;inset:0;border:var(--sk-bw) solid var(--sk-ink);pointer-events:none}
.sub{position:absolute;inset:0;clip-path:inset(var(--sk-bw));transition:clip-path .1s}
.fig{position:absolute;left:50%;top:0;bottom:0;display:flex;align-items:flex-start;translate:-50% 0;transform-origin:50% 60%;transition:transform var(--sk-bounce-t) var(--sk-bounce)}
.tag{position:absolute;left:10px;top:10px;z-index:2;padding:2px 9px 3px;background:var(--sk-pink);color:var(--sk-on-hot);font:italic 900 12px/1.2 var(--sk-font);letter-spacing:.06em;transform:skewX(-10deg)}
.tag:empty{display:none}
.body{padding-top:12px;font:500 14px/1.45 var(--sk-font)}
.c:focus-visible,.c.hot{translate:-2px -4px;rotate:-1deg;box-shadow:calc(var(--sk-sh) + 3px) calc(var(--sk-sh) + 4px) 0 var(--sk-lav)}
.c:focus-visible .bg::before,.c.hot .bg::before{opacity:1;scale:1}
.c:focus-visible .sub,.c.hot .sub{clip-path:inset(-160px -80px var(--sk-bw) -80px)}
.c:focus-visible .fig,.c.hot .fig{transform:translateY(var(--lift)) scale(1.22) rotate(-4deg)}
.c:active .fig{transform:translateY(calc(var(--lift)*.86)) scale(1.28,1.12) rotate(-4deg)}
@media (prefers-reduced-motion:reduce){.c,.fig,.bg::before{transition:none}}`;
  static template = `<a class="c box" part="base"><div class="pn"><div class="bg"></div><span class="frame"></span><div class="sub"><div class="fig"><slot name="figure"></slot></div></div><span class="tag" part="label"></span></div><div class="body"><slot></slot></div></a>`;
  setup() {
    const c = (this.c = this.$('.c')); let last = 0;
    const hot = on => {
      c.classList.toggle('hot', on); if (!on) return;
      const t = performance.now(); if (t - last < 900) return; last = t;
      const q = this.rect;
      if (this.word) sfx(this.word, { voice: 'pop', x: q.r - 20, y: q.t - 6, size: 34, hold: 420, silent: true });
      SND.play('boing');
    };
    c.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') hot(true); });
    c.addEventListener('pointerleave', () => hot(false));
    c.addEventListener('focus', () => hot(true)); c.addEventListener('blur', () => hot(false));
    c.addEventListener('keydown', e => { if (!this.href && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); } });
    c.addEventListener('click', () => SND.play('pop'));
  }
  sync() {
    const c = this.c; this.$('.tag').textContent = this.label || '';
    if (this.href) { c.setAttribute('href', this.href); c.removeAttribute('role'); c.removeAttribute('tabindex'); } else { c.removeAttribute('href'); c.setAttribute('role', 'button'); c.tabIndex = 0; }
  }
}
define('sk-breakout', SkBreakout);

/* ---------------- sk-reactions + sk-reaction: reactions given as sound words (擬音) ---------------- */
export class SkReaction extends SkElement {
  static props = { word: String, voice: [String, 'pop'], label: String, count: [Number, 0], pressed: Boolean };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-block}
button{display:flex;align-items:center;gap:8px;width:100%;height:38px;padding:0 12px 0 11px;border:var(--sk-bw) solid var(--sk-ink);border-radius:999px;background:var(--sk-surface);cursor:pointer;font:700 12px/1 var(--sk-font)}
:host([pressed]) button{background:var(--sk-ink);color:var(--sk-surface)}
svg{flex:none;overflow:visible}
text{font-weight:900;font-synthesis:none;stroke-linejoin:miter;stroke-miterlimit:2.6}:host([round]) text{stroke-linejoin:round}
small{font-size:11.5px;color:var(--sk-muted);white-space:nowrap}:host([pressed]) small{color:var(--sk-lav)}
.roll{margin-left:auto;padding-left:4px;font:italic 900 15px/1.2 var(--sk-font)}
${ROLL_CSS}`;
  static template = `<button class="press" part="base"><svg aria-hidden="true"></svg><small part="label"></small><span class="roll"><b></b></span></button>`;
  setup() { this.btn = this.$('button'); this.btn.addEventListener('click', () => this.toggle()); }
  connected() { loadFaces().then(() => this.isConnected && this.letter()); }
  letter() {
    const { html, w, h, V } = compose(this.word || '', { voice: this.voice, size: 17 }), svg = this.$('svg');
    this.toggleAttribute('round', !!V.round);
    svg.setAttribute('width', Math.round(w)); svg.setAttribute('height', Math.round(h)); svg.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
    svg.innerHTML = `<defs>${DOTS}</defs>${html}`;
  }
  sync(name) {
    this.btn.setAttribute('aria-pressed', this.pressed); this.btn.setAttribute('aria-label', `${this.label || this.word || ''} ${this.count}`.trim());
    this.$('small').textContent = this.label || '';
    if (name === 'word' || name === 'voice' || name == null) this.letter();
    if (!this.rolling) this.$('.roll').innerHTML = `<b>${this.count}</b>`;
  }
  toggle() {
    const on = !this.pressed; this.rolling = true; this.pressed = on; this.count = Math.max(0, this.count + (on ? 1 : -1)); this.rolling = false;
    roll(this.$('.roll'), this.count, on ? 1 : -1);
    const host = this.parentElement && this.parentElement.target ? this.parentElement.target : this;
    if (on) {
      // the word lands on what is being reacted to, in its own voice, with the effect that belongs to that voice
      const q = rectOf(host), v = this.voice;
      if (this.word) sfx(this.word, { voice: v, x: q.cx + Math.min(40, q.w * 0.12), y: q.cy - 6, size: clamp(q.w * 0.15, 30, 56), hold: 700 });
      if (v === 'pop') { anim(host, 'beat'); moves.shower(q.cx, q.cy, 'heart', 7); }
      else if (v === 'shine') { moves.twinkle(q.l + 40, q.t + 24, 12, { silent: true }); moves.twinkle(q.r - 46, q.b - 30, 9, { silent: true, delay: 0.08 }); }
      else if (v === 'rumble' || v === 'impact') shake(host, 4, 520);
      else if (v !== 'hush') FX.ticks({ x: q.cx, y: q.t - 4, angle: -Math.PI / 2, len: 10 });
    } else SND.play('droop');
    this.emit('react', { word: this.word, pressed: on, count: this.count });
  }
}
define('sk-reaction', SkReaction);

export class SkReactions extends SkElement {
  static props = { for: String };
  static styles = css`:host{display:flex;flex-wrap:wrap;gap:8px 10px}`;
  setup() { this.setAttribute('role', 'group'); }
  /* what the words land on: the element named by `for`, or the bar itself */
  get target() { const r = this.getRootNode(); return (this.for && r.getElementById && r.getElementById(this.for)) || this; }
}
define('sk-reactions', SkReactions);
