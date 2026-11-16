/* Feedback: toast, alert, progress, ring, spinner, skeleton, badge, tag. */
import { SkElement, define, css, FX, SND, moves, anim, play, spring, shake, zipIn, zipOut, rectOf, rnd, clamp, level, now, lift, crownLayer, BARE } from '../core/index.js';
import { SPIN, SPIN_CSS, X_ICON, roll, ROLL_CSS } from './_parts.js';

const ICON = {
  success: '<path d="M5 12.500l5 5L19 7"/>', info: '<path d="M12 11v7M12 6.500v.500"/>', warn: '<path d="M12 5v9M12 18v.500"/>', danger: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const ICON_CSS = `.ic{width:26px;height:26px;border-radius:50%;border:var(--sk-bw) solid var(--sk-ink);background:var(--sk-peri);display:grid;place-items:center;flex:none}
.ic svg{width:14px;height:14px}.ic path{fill:none;stroke:var(--sk-ink);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
:host([variant=danger]) .ic{background:var(--sk-pink)}:host([variant=warn]) .ic{background:#ffb938}:host([variant=info]) .ic{background:var(--sk-violet)}:host([variant=info]) .ic path{stroke:var(--sk-surface)}:host([variant=danger]) .ic path{stroke:var(--sk-on-hot)}:host([variant=warn]) .ic path{stroke:#1b1642}`;
const icon = v => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[v] || ICON.success}</svg>`;

/* ---------------- sk-toast ---------------- */
export class SkToast extends SkElement {
  static props = { variant: [String, 'success'], duration: [Number, 3800], from: [String, 'right'] };
  static styles = css`
:host{display:block;width:max-content;max-width:min(420px,calc(100vw - 40px))}
.t{display:flex;align-items:center;gap:11px;padding:13px 10px 13px 14px;font:700 15px/1.25 var(--sk-font);touch-action:pan-y;cursor:grab;user-select:none}
.x{border:0;background:none;padding:3px;margin-left:2px;cursor:pointer;line-height:0;font-size:12px;border-radius:6px}
${ICON_CSS}`;
  static template = `<div class="t box" role="status" part="base"><span class="ic"></span><span><slot></slot></span><button class="x" aria-label="close">${X_ICON}</button></div>`;
  setup() {
    const t = this.t = this.$('.t');
    this.$('.x').addEventListener('click', () => this.dismiss());
    // drag sideways to throw it away; let go early and it springs back
    let x0 = null, dx = 0;
    t.addEventListener('pointerdown', e => { if (e.target.closest('.x')) return; x0 = e.clientX; dx = 0; t.setPointerCapture(e.pointerId); this.at.clear(); });
    t.addEventListener('pointermove', e => { if (x0 == null) return; dx = e.clientX - x0; t.style.transform = `translateX(${dx}px) rotate(${(dx * 0.03).toFixed(2)}deg)`; t.style.opacity = 1 - Math.min(0.6, Math.abs(dx) / 260); });
    const end = () => {
      if (x0 == null) return; x0 = null;
      const from = t.style.transform || 'none'; t.style.transform = ''; t.style.opacity = '';
      if (Math.abs(dx) > 90) return this.dismiss(Math.sign(dx));
      if (Math.abs(dx) > 2) spring(t, [{ transform: from }, { transform: 'none' }], 'bounce');
      if (this.duration > 0) this.at(this.duration, () => this.dismiss());
    };
    t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
  }
  sync() { this.$('.ic').innerHTML = icon(this.variant); }
  connected() {
    const dir = this.from === 'left' ? -1 : 1, q0 = rectOf(this.t);
    // a fast smear across, an oversize landing, then a long damped settle: the weight is in the follow-through
    const dx = dir * 460;
    play(this.t, [
      { transform: `translateX(${dx}px) scale(3.2,.42)` },
      { transform: `translateX(${dx * 0.28}px) scale(2.9,.5)`, offset: 0.2 },
      { transform: `translateX(${-dx * 0.02}px) scale(1.5,.8)`, offset: 0.29 },
      { transform: 'translateX(0) scale(.95,1.05)', offset: 0.45 },
      { transform: 'scale(1.045,.97)', offset: 0.63 },
      { transform: 'scale(.99,1.01)', offset: 0.82 },
      { transform: 'none' },
    ], { duration: 900, easing: 'linear' });
    SND.play('whoosh');
    this.at(250, () => {
      const q = q0, edge = dir > 0 ? q.r : q.l, sz = clamp(q.w * 0.24, 30, 60), vw = document.documentElement.clientWidth;
      moves.say('ズバッ', { voice: 'cut', x: q.l + sz * 1.05, y: q.t - sz * 0.5, size: sz, enter: 'whole', enterMs: 130, hold: 500, exitMs: 90 });
      FX.puff({ x: clamp(edge + dir * 14, scrollX + 28, scrollX + vw - 28), y: q.b - 4, r: 13, vx: dir * 24, vy: -16, life: 0.95 });
      FX.ticks({ x: (dir > 0 ? q.l : q.r) - dir * 10, y: q.cy, angle: dir > 0 ? Math.PI : 0, len: 10, life: 0.35 });
      moves.streak(edge + dir * 14, q.cy, dir > 0 ? 0 : Math.PI, 56, 4, { spread: 36, dist: 46, life: 0.26 });
    });
    if (this.duration > 0) this.at(this.duration, () => this.dismiss());
  }
  dismiss(toward) {
    if (this._gone) return; this._gone = true; this.at.clear();
    const dir = toward || (this.from === 'left' ? -1 : 1), q = rectOf(this.t);
    moves.say('シュッ', { voice: 'swish', x: q.cx, y: q.t - 20, size: 26, hold: 240 });
    const a = zipOut(this.t, dir * 480), done = () => {
      this.emit('sk-close');
      // the rest of the stack closes the gap on a spring
      const sibs = this.parentElement ? [...this.parentElement.children].filter(x => x !== this) : [], before = sibs.map(s => s.getBoundingClientRect().top);
      this.remove();
      sibs.forEach((s, i) => { const d = before[i] - s.getBoundingClientRect().top; if (d) spring(s, [{ translate: `0 ${d}px` }, { translate: '0 0' }], 'spring'); });
    };
    a ? (a.onfinish = done) : done();
  }
}
define('sk-toast', SkToast);

/* toast('Saved!', { variant, duration, placement }) : imperative API with a stacking container */
export function toast(message, o = {}) {
  const place = o.placement || 'bottom-right', id = 'sk-toaster-' + place;
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement('div'); host.id = id;
    const [v, h] = place.split('-');
    host.style.cssText = `${BARE}position:fixed;inset:auto;width:auto;height:auto;${v}:20px;${h === 'center' ? 'left:50%;translate:-50% 0' : h + ':20px'};display:flex;flex-direction:${v === 'bottom' ? 'column-reverse' : 'column'};align-items:${h === 'left' ? 'flex-start' : h === 'center' ? 'center' : 'flex-end'};gap:12px;z-index:2147482000;pointer-events:none`;
    document.body.appendChild(host);
    crownLayer(host, 1);
  }
  lift(host);   // above any dialog that opened since the last toast
  const t = document.createElement('sk-toast');
  t.style.pointerEvents = 'auto';
  if (o.variant) t.setAttribute('variant', o.variant);
  if (o.duration != null) t.setAttribute('duration', o.duration);
  t.setAttribute('from', place.endsWith('left') ? 'left' : 'right');
  t.textContent = message;
  host.appendChild(t);
  return t;
}

/* ---------------- sk-alert ---------------- */
export class SkAlert extends SkElement {
  static props = { variant: [String, 'info'], closable: Boolean, title: String };
  static styles = css`
:host{display:block}
.a{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;font:500 15px/1.45 var(--sk-font);position:relative;overflow:hidden}
.a::before{content:"";position:absolute;left:0;top:0;bottom:0;width:9px;background:var(--sk-violet)}
:host([variant=success]) .a::before{background:var(--sk-peri)}:host([variant=warn]) .a::before{background:#ffb938}:host([variant=danger]) .a::before{background:var(--sk-pink)}
.ic{margin-left:8px;align-self:center}.body{flex:1;min-width:0}
.ttl{display:block;font:italic 800 16px/1.3 var(--sk-font)}.ttl:empty{display:none}
.x{border:0;background:none;padding:4px;cursor:pointer;line-height:0;font-size:12px;border-radius:6px}
:host(:not([closable])) .x{display:none}
${ICON_CSS}`;
  static template = `<div class="a box" role="alert" part="base"><span class="ic"></span><div class="body"><b class="ttl"></b><slot></slot></div><button class="x" aria-label="close">${X_ICON}</button></div>`;
  setup() { this.a = this.$('.a'); this.$('.x').addEventListener('click', () => this.hide()); }
  sync() { this.$('.ic').innerHTML = icon(this.variant); this.$('.ttl').textContent = this.title || ''; }
  show() {
    this.hidden = false;
    const q = rectOf(this.a);
    anim(this.a, 'slam'); SND.play('stamp'); spring(this.$('.ic'), [{ scale: 0.2, rotate: '-40deg' }, { scale: 1, rotate: '0deg' }], 'bounce', { delay: 120, fill: 'backwards' });
    FX.ticks({ x: q.l - 2, y: q.t - 2, angle: -2.36, len: 11 }); FX.ticks({ x: q.r + 2, y: q.t - 2, angle: -0.78, len: 11 });
    if (this.variant === 'danger') { shake(this, 5, 220); moves.say('ガッ', { voice: 'impact', x: q.r - 40, y: q.t - 22, size: 30, hold: 360 }); }
    this.emit('sk-show');
  }
  hide() {
    const q = rectOf(this.a), done = () => { this.hidden = true; this.emit('sk-hide'); };
    moves.poof(q.r - 14, q.t + 12, 10);
    const a = anim(this.a, 'leave'); a ? (a.onfinish = done) : done();
  }
}
define('sk-alert', SkAlert);

/* ---------------- sk-progress: a dust cloud runs at the head while the value moves ---------------- */
const LOBES = [[0.25, -0.95, 0.95], [1.05, -1.55, 0.85], [1.75, -0.75, 0.8], [0.95, -0.3, 0.75], [-0.45, -0.3, 0.6], [1.95, 0.2, 0.5], [1.25, 0.5, 0.42], [-0.25, 0.72, 0.34], [0.5, 0.9, 0.4]];
export class SkProgress extends SkElement {
  static props = { value: [Number, 0], label: String, done: [String, 'Complete ✓'], ground: Boolean, plain: Boolean, indeterminate: Boolean };
  static styles = css`
:host{display:inline-block;vertical-align:middle;width:240px}
:host{position:relative;container-type:inline-size}
.bar{position:relative;height:clamp(26px,13.5cqw,46px);border-radius:999px;overflow:hidden;--sk-sh:0px;box-shadow:none}
.fill{position:absolute;inset:0;background:var(--sk-pink);transform-origin:0 50%;transform:scaleX(var(--p,0))}
.hl{position:absolute;left:19px;top:22%;width:26px;height:24%;background:linear-gradient(90deg,#fff 0 7px,transparent 7px 12px,#fff 12px 19px);transform:skewX(-24deg);opacity:.9}
.gnd{display:none;position:relative;height:20px;margin-top:clamp(4px,6cqw - 2px,20px)}
:host([ground]) .gnd{display:block}
.ground{position:absolute;inset:0;width:100%;height:20px;overflow:visible}
.dec{position:absolute;bottom:4px;overflow:visible;opacity:0;scale:.2;transform-origin:50% 100%;transition:scale var(--sk-bounce-t) var(--sk-bounce),opacity .1s}
.dec path{fill:var(--sk-fxw);stroke:var(--sk-violet);stroke-width:1.6;stroke-linejoin:round}
.dec.chip path{fill:var(--sk-fxs)}
.dec.pl{left:2%;width:36px}.dec.pr{right:2%;width:36px}.dec.chip{width:13px}.dec.c1{left:27%}.dec.c2{left:49%}.dec.c3{left:69%}
:host([data-done]) .dec{opacity:1;scale:1}
:host([data-done]) .dec.pr{transition-delay:.06s}:host([data-done]) .dec.c2{transition-delay:.04s}:host([data-done]) .dec.c3{transition-delay:.09s}
/* the finish: a large check with emphasis strokes and a sparkle, held for as long as the bar is full */
.fin{position:absolute;left:50%;bottom:calc(100% + 8px);width:min(51%,172px);translate:-50% 0;overflow:visible;pointer-events:none;opacity:0}
.fin .ck{fill:none;stroke:var(--sk-pink);stroke-width:10;stroke-linejoin:miter;stroke-dasharray:80;stroke-dashoffset:80}
.fin .em{fill:none;stroke:var(--sk-pink);stroke-width:4.5;stroke-linecap:round;scale:0;transform-origin:60px 30px;transform-box:view-box}
.fin .sp{fill:var(--sk-fxw);stroke:var(--sk-ink);stroke-width:2.6;stroke-linejoin:round;scale:0;transform-origin:107px 47px;transform-box:view-box}
:host([data-done]) .fin{opacity:1}
:host([data-done]) .fin .ck{stroke-dashoffset:0;transition:stroke-dashoffset .2s cubic-bezier(.3,.8,.4,1)}
:host([data-done]) .fin .em{scale:1;transition:scale var(--sk-bounce-t) var(--sk-bounce) .14s}
:host([data-done]) .fin .sp{scale:.8;transition:scale var(--sk-bounce-t) var(--sk-bounce) .26s}
.ground *{fill:none;stroke:var(--sk-violet);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
:host([ground]) .badge{margin-top:clamp(10px,10cqw,34px)}
.badge{width:max-content;margin:10px auto 0;border:var(--sk-bw) solid var(--sk-ink);background:var(--sk-surface);padding:.26em .85em;font:italic 700 clamp(15px,6.3cqw,21px)/1.1 var(--sk-font);transform:skewX(-9deg);box-shadow:4px 4px 0 var(--sk-pink)}
.badge b{display:inline-block;transform:skewX(9deg)}
:host([plain]) .badge{display:none}
:host([indeterminate]) .fill{transform:skewX(-24deg) scaleX(1.3);background:repeating-linear-gradient(90deg,var(--sk-pink) 0 14px,color-mix(in srgb,var(--sk-pink) 62%,var(--sk-surface)) 14px 28px);animation:sk-run .5s steps(7) infinite}
:host([indeterminate]) .hl{display:none}
@keyframes sk-run{to{background-position:28px 0}}
@media (prefers-reduced-motion:reduce){:host([indeterminate]) .fill{animation:none}}`;
  static template = `<div class="bar box" part="base"><div class="fill"></div><i class="hl"></i></div><svg class="fin" viewBox="0 0 120 60" aria-hidden="true"><path class="ck" d="M40 30L56 46L88 6"/><path class="em" d="M10 14l13 4M6 27l13 1.5M100 20l13-3.5M104 31l13 1.5"/><path class="sp" d="M107 34q1.6 10 8 13q-6.400 3-8 13q-1.600-10-8-13q6.400-3 8-13z"/></svg><div class="gnd" aria-hidden="true"><svg class="ground" viewBox="0 0 240 20" preserveAspectRatio="none"><path d="M4 15H236M22 15l3-4M70 15l3-4M118 15l3-4M154 15l3-4M200 15l3-4"/></svg><svg class="dec pl" viewBox="0 0 30 18"><path d="M5 17a5 5 0 0 1 0-10a6.500 6.500 0 0 1 11.500-3a5.500 5.500 0 0 1 8.500 5a4.200 4.200 0 0 1 0 8z"/></svg><svg class="dec pr" viewBox="0 0 30 18"><path d="M5 17a5 5 0 0 1 0-10a6.500 6.500 0 0 1 11.500-3a5.500 5.500 0 0 1 8.500 5a4.200 4.200 0 0 1 0 8z"/></svg><svg class="dec chip c1" viewBox="0 0 12 12"><path d="M2 6l3.500-4l4.500 1.500l1 5.500l-6 2z"/></svg><svg class="dec chip c2" viewBox="0 0 12 12"><path d="M1.500 7l3-5l5 1l1.500 5l-5 3z"/></svg><svg class="dec chip c3" viewBox="0 0 12 12"><path d="M2 5l4-3l4.500 2.500l-1 5.500l-6 1z"/></svg></div><div class="badge" part="badge"><b></b></div>`;
  setup() { this.bar = this.$('.bar'); this.badge = this.$('.badge b'); this.setAttribute('role', 'progressbar'); this.lastEmit = 0; this.prev = null; }
  disconnected() { if (this.cloud) { this.cloud.kill(); this.cloud = null; } }
  sync(name) {
    const v = clamp(this.value, 0, 100), was = this.prev; this.prev = v;
    this.bar.style.setProperty('--p', v / 100); this.setAttribute('aria-valuenow', Math.round(v));
    if (!this._complete) this.badge.textContent = this.label != null ? this.label : this.indeterminate ? '···' : Math.round(v) + '%';
    if (v < 100 && this._complete) { this.at.clear(); this.removeAttribute('data-done'); }
    if (name !== 'value' || was == null) { if (v < 100) this._complete = false; else if (was == null) { this._complete = true; this.badge.textContent = this.done; this.toggleAttribute('data-done', true); } return; }
    if (v < 100 && this._complete) { this._complete = false; this.badge.textContent = Math.round(v) + '%'; }
    if (v > was && !this._complete && level()) this.run(v, v - was);
    if (v >= 100 && was < 100) this.finish();
  }
  run(v, moved) {
    const q = rectOf(this.bar), U = q.h * 0.78;
    this.hx = q.l + 4 + ((q.w - 8) * v) / 100; this.hy = q.cy;
    if (!this.cloud || this.cloud.dead) {
      this.cloud = FX.add({ layer: 'front', life: Infinity, draw: (ctx, age) => {
        const k = Math.min(1, age / 0.18);
        FX.drawCloud(ctx, LOBES.map(([lx, ly, lr], i) => [this.hx + (lx - 0.7) * U * k + Math.sin(age * 7 + i * 1.7) * 1.4, this.hy + ly * U * k + Math.cos(age * 6 + i * 2.1) * 1.4, lr * U * k * (1 + 0.07 * Math.sin(age * 9 + i * 2))]), 2);
      } });
    }
    clearTimeout(this.idle); this.idle = setTimeout(() => { if (this.cloud) { this.cloud.end(0.2); this.cloud = null; } }, 420);
    const t = now();
    if (t - this.lastEmit > 0.085) {
      this.lastEmit = t; SND.play('step', { p: v });
      FX.puff({ x: this.hx - U * 1.3, y: this.hy - U * 1.3, r: rnd(4, 7), n: 3, vx: -rnd(70, 130), vy: -rnd(0, 18), life: 0.45, lw: 1.5 });
      FX.puff({ x: this.hx - 4, y: q.b + 8, r: rnd(4, 6), n: 3, vx: -rnd(30, 80), vy: -6, life: 0.42, lw: 1.5 });
      if (Math.random() < 0.6) moves.streak(this.hx - U * 1.8, this.hy - U * 1.6, Math.PI, 30, 2, { spread: 14, dist: 26, w: 1.6 });
      // chips kicked up along the ground: low hops that land again, clear of the badge underneath
      if (Math.random() < 0.85) FX.shard({ x: this.hx - U * rnd(0.3, 1.5), y: q.b + clamp(q.w * 0.06, 6, 20) + rnd(6, 12), vx: -rnd(40, 160), vy: -rnd(50, 120), g: 420, size: rnd(4, 6.5), life: rnd(0.35, 0.5) });
    }
  }
  finish() {
    this._complete = true; clearTimeout(this.idle);
    if (this.cloud) { this.cloud.kill(); this.cloud = null; }
    const q = rectOf(this.bar), k = clamp(q.h / 30, 0.55, 1);
    moves.boom(q.r - q.w * 0.2, q.cy, 0.9 * k, this.bar, clamp(q.w * 0.2, 44, 84)); shake(this, 6 * k, 240);
    const sz = clamp(q.w * 0.295, 40, 104);
    moves.say('ドン!', { voice: 'impact', x: q.l + q.w * 0.36, y: q.t - sz * 0.7, size: sz, hold: 700 });
    this.badge.textContent = this.done; anim(this.$('.badge'), 'pop');
    this.at(700, () => SND.play('fanfare'));
    this.at(940, () => this.toggleAttribute('data-done', true));   // the check is drawn in as the word leaves, and stays
    this.emit('sk-complete');
  }
}
define('sk-progress', SkProgress);

/* ---------------- sk-ring: circular progress ---------------- */
export class SkRing extends SkElement {
  static props = { value: [Number, 0], size: [Number, 72] };
  static styles = css`
:host{display:inline-grid;place-items:center;vertical-align:middle;position:relative}
svg{grid-area:1/1;transform:rotate(-90deg);overflow:visible}
circle{fill:none;stroke-width:9}
.bg{stroke:var(--sk-ink)}.tr{stroke:var(--sk-surface);stroke-width:4}
.fg{stroke:var(--sk-pink);stroke-width:4;stroke-linecap:butt;transition:stroke-dashoffset .25s steps(6)}
.n{grid-area:1/1;font:italic 800 15px/1 var(--sk-font)}${ROLL_CSS}`;
  static template = `<svg viewBox="0 0 80 80" aria-hidden="true"><circle class="bg" cx="40" cy="40" r="32"/><circle class="tr" cx="40" cy="40" r="32"/><circle class="fg" cx="40" cy="40" r="32" pathLength="100" stroke-dasharray="100"/></svg><span class="n roll"><b></b></span>`;
  setup() { this.setAttribute('role', 'progressbar'); this.fg = this.$('.fg'); this.n = this.$('.n'); this.prev = null; }
  sync(name) {
    const v = clamp(this.value, 0, 100), was = this.prev; this.prev = v;
    this.$('svg').style.width = this.$('svg').style.height = this.size + 'px';
    this.fg.style.strokeDashoffset = 100 - v; this.setAttribute('aria-valuenow', Math.round(v));
    if (was == null || name !== 'value') { this.n.lastElementChild.textContent = Math.round(v) + '%'; return; }
    if (Math.round(v) !== Math.round(was)) roll(this.n, Math.round(v) + '%', v > was ? 1 : -1);
    if (v >= 100 && was < 100) {
      const q = this.rect;
      // the celebration waits for the arc to close
      this.at(250, () => { anim(this, 'pulse'); moves.twinkle(q.r - 4, q.t + 2, 9, { life: 0.65 }); moves.say('キラッ', { voice: 'shine', x: q.cx, y: q.t - 22, size: 20, hold: 260, silent: true }); });
      this.emit('sk-complete');
    }
  }
}
define('sk-ring', SkRing);

/* ---------------- sk-spinner: stepped comet, pure CSS ---------------- */
export class SkSpinner extends SkElement {
  static styles = css`:host{display:inline-flex;vertical-align:middle;font-size:24px;color:var(--sk-ink)}${SPIN_CSS}`;
  static template = SPIN;
  setup() { this.setAttribute('role', 'status'); if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Loading'); }
}
define('sk-spinner', SkSpinner);

/* ---------------- sk-skeleton: halftone shimmer, pure CSS ---------------- */
export class SkSkeleton extends SkElement {
  static styles = css`
:host{display:block;height:1em;border-radius:8px;background-color:color-mix(in srgb,var(--sk-lav) 34%,var(--sk-surface));
  background-image:radial-gradient(var(--sk-lav) 1.3px,transparent 1.6px),linear-gradient(100deg,transparent 30%,color-mix(in srgb,var(--sk-fxw) 80%,transparent) 50%,transparent 70%);
  background-size:7px 7px,220% 100%;background-position:0 0,160% 0;animation:sk-shim 1.1s steps(9) infinite}
:host([circle]){border-radius:50%;aspect-ratio:1;height:auto}
@keyframes sk-shim{to{background-position:0 0,-60% 0}}
@media (prefers-reduced-motion:reduce){:host{animation:none}}`;
  static template = '';
  setup() { this.setAttribute('aria-hidden', 'true'); }
}
define('sk-skeleton', SkSkeleton);

/* ---------------- sk-badge: a count that pops when it changes ---------------- */
export class SkBadge extends SkElement {
  static props = { value: String, variant: [String, 'pink'], dot: Boolean };
  static styles = css`
:host{display:inline-flex;position:relative;vertical-align:middle}
.b{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border:2.5px solid var(--sk-ink);border-radius:11px;background:var(--sk-pink);color:var(--sk-on-hot);font:italic 800 12px/1 var(--sk-font)}
:host([variant=ink]) .b{background:var(--sk-ink);color:var(--sk-surface)}
:host([variant=peri]) .b{background:var(--sk-peri);color:var(--sk-ink)}
:host([dot]) .b{min-width:13px;width:13px;height:13px;padding:0}
:host([dot]) .roll{display:none}
:host([data-anchored]) .b{position:absolute;right:-9px;top:-9px;z-index:1}
:host([data-empty]) .b{display:none}${ROLL_CSS}`;
  static template = `<slot></slot><span class="b" part="base"><span class="roll"><b></b></span></span>`;
  setup() { this.b = this.$('.b'); this.n = this.$('.roll'); this.prev = undefined; this.$('slot').addEventListener('slotchange', () => this.sync(null)); }
  sync(name) {
    this.toggleAttribute('data-anchored', this.childNodes.length > 0);
    const v = this.value, was = this.prev; this.prev = v;
    this.toggleAttribute('data-empty', !this.dot && (v == null || v === ''));
    if (name !== 'value' || was === undefined || was == null) { this.n.lastElementChild.textContent = v == null ? '' : v; return; }
    if (v === was) return;
    roll(this.n, v == null ? '' : v, +v >= +was ? 1 : -1);
    const q = rectOf(this.b);
    anim(this.b, 'pulse'); SND.play('pop');
    FX.ticks({ x: q.cx, y: q.t - 3, angle: -Math.PI / 2, len: 7, n: 3, life: 0.3 });
  }
}
define('sk-badge', SkBadge);

/* ---------------- sk-tag ---------------- */
export class SkTag extends SkElement {
  static props = { variant: [String, 'default'], removable: Boolean };
  static styles = css`
:host{display:inline-flex;vertical-align:middle}
.t{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border:2.5px solid var(--sk-ink);border-radius:999px;background:var(--sk-surface);font:italic 700 13px/1.3 var(--sk-font);box-shadow:3px 3px 0 var(--sk-lav)}
:host([variant=pink]) .t{background:var(--sk-pink);color:var(--sk-on-hot)}
:host([variant=peri]) .t{background:var(--sk-peri)}
:host([variant=ink]) .t{background:var(--sk-ink);color:var(--sk-surface)}
button{border:0;background:none;padding:2px;margin-right:-4px;cursor:pointer;line-height:0;font-size:9px;color:inherit;border-radius:50%}
:host(:not([removable])) button{display:none}`;
  static template = `<span class="t press" part="base"><slot></slot><button aria-label="remove">${X_ICON}</button></span>`;
  setup() {
    this.$('button').addEventListener('click', e => {
      e.stopPropagation();
      if (!this.emit('sk-remove')) return;
      const q = this.rect, done = () => this.remove();
      moves.poof(q.cx, q.cy, 11, { life: 0.4 }); moves.say('ポフ', { voice: 'soft', x: q.cx + 20, y: q.t - 18, size: 20, hold: 160, silent: true });
      const a = anim(this.$('.t'), 'leave'); a ? (a.onfinish = done) : done();
    });
  }
}
define('sk-tag', SkTag);
