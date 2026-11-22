/* Actions: button, hold-button, like, segmented, copy. */
import { SkElement, define, css, FX, SND, moves, anim, play, spring, shake, rectOf, rnd, clamp, now, level } from '../core/index.js';
import { CHECK, CHECK_CSS, SPIN, SPIN_CSS, HEART, roll, ROLL_CSS, slide, DT, jelly, jellyStep } from './_parts.js';

/* ---------------- sk-button ---------------- */
export class SkButton extends SkElement {
  static props = { variant: [String, 'default'], size: [String, 'md'], fx: [String, 'tap'], word: [String, 'ドン!'], type: String, disabled: Boolean, loading: Boolean, icon: Boolean };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-block;vertical-align:middle}
button{display:inline-flex;align-items:center;justify-content:center;gap:var(--gp,8px);width:100%;padding:10px 22px;font:400 19.5px/1 var(--sk-font-head);cursor:pointer;user-select:none;touch-action:manipulation;white-space:nowrap}
:host([size=sm]) button{padding:6px 14px;font-size:14px;border-radius:11px;--sk-sh:4px}
:host([size=lg]) button{padding:14.5px 30px 13.5px;font-size:21px;border-radius:17px;--sk-sh:6px}
:host([variant=primary]) button{background:var(--sk-peri)}
:host([variant=pink]) button{background:var(--sk-pink);color:var(--sk-on-hot)}
:host([variant=solid]) button{background:var(--sk-ink);color:var(--sk-surface)}
:host([variant=ghost]) button{border-color:transparent;background:none;box-shadow:none;text-decoration:underline dashed 2px;text-underline-offset:5px}
:host([icon]) button{padding:9px;aspect-ratio:1;line-height:0}
button[data-inv]{background:var(--sk-ink);color:var(--sk-surface);box-shadow:none}
:host([data-done]) .chk{width:1.3em;margin-left:2px;scale:1.4}
:host([data-done]) .chk path{stroke-dashoffset:0}
:host([loading]) button{cursor:progress}
${CHECK_CSS}${SPIN_CSS}
:host(:not([loading])) .spin{display:none}
:host([data-held]){width:var(--sk-held-w)!important;height:var(--sk-held-h)!important}
:host([data-held]) button.lift{scale:none;translate:none;position:relative}
:host([data-held]) button::after{content:"";position:absolute;left:calc(var(--hx) - var(--sk-bw,3px));top:calc(var(--hy) - var(--sk-bw,3px));width:var(--hw);height:var(--hh)}`;
  static template = `<button class="box lift" part="base">${SPIN}<slot name="prefix"></slot><slot></slot><slot name="suffix"></slot>${CHECK}</button>`;

  setup() {
    this.btn = this.$('button');
    const up = () => { removeEventListener('pointerup', up); removeEventListener('pointercancel', up); this.letGo(); };
    this.btn.addEventListener('pointerdown', () => { this._down = performance.now(); this.press(); addEventListener('pointerup', up); addEventListener('pointercancel', up); });
    this.btn.addEventListener('keydown', e => { if (e.key === ' ' && !e.repeat) { this._down = performance.now(); this.press(); } });
    this.btn.addEventListener('keyup', e => { if (e.key === ' ') this.letGo(); });
    this.btn.addEventListener('blur', () => this.letGo());
    this.btn.addEventListener('click', e => {
      if (this.disabled || this.loading) { e.stopImmediatePropagation(); e.preventDefault(); return; }
      const held = this._down && performance.now() - this._down > 110; this._down = 0;
      if (this.fx === 'boom') this.sqEnd();   // the impact frame takes the squash over from here
      if (this.fx === 'boom') moves.impact(this.btn, { word: this.word, stage: this, skip: held ? 135 : 0 });   // a held press has done its wind-up: go straight to the hit
      else if (this.fx !== 'none') moves.tap(this.btn);
      if (this.type === 'submit' || this.type === 'reset') { const f = this.closest('form'); if (f) this.type === 'submit' ? f.requestSubmit() : f.reset(); }
    });
  }
  sync() { this.btn.disabled = this.disabled; this.btn.setAttribute('aria-busy', this.loading); }
  /* The held press, the anticipation before the hit. While a finger or Space holds it the box squashes flat and wide
     (about 0.62 of its height, its width growing so it keeps its volume), sitting on its bottom edge; the body alone
     carries it, no marks around it. Let go and it springs past its height, tall and narrow, and wobbles out. The squash
     changes the size of the box, not its scale, so the outline keeps one width; the host keeps its own size meanwhile,
     so nothing around it moves. */
  press() {
    if (this.disabled || this.loading || !level() || this.fx === 'none') return;
    const b = this.btn;
    if (!this.sq) {
      this.sq = Object.assign(jelly(), { W: b.offsetWidth, H: b.offsetHeight });
      this.style.setProperty('--sk-held-w', this.sq.W + 'px'); this.style.setProperty('--sk-held-h', this.sq.H + 'px'); this.toggleAttribute('data-held', true);
    }
    this.sq.held = true;
    if (!this.sqRaf) { this.sqLast = 0; this.sqRaf = requestAnimationFrame(t => this.sqLoop(t)); }
  }
  letGo() { if (this.sq) this.sq.held = false; }
  sqLoop(tms) {
    const s = this.sq; if (!s) return;
    const dt = clamp(this.sqLast ? (tms - this.sqLast) / 1000 : 1 / 60, 0.001, 0.05); this.sqLast = tms;
    for (let n = Math.ceil(dt / DT), i = 0; i < n; i++) {
      // held: a quick, nearly dead spring down into the squash. Let go: the jelly, which overshoots into a stretch
      if (s.held) { s.v += (2500 * (-0.38 - s.e) - 2 * 0.72 * 50 * s.v) * DT; s.e += s.v * DT; } else jellyStep(s, 0);
    }
    if (!s.held && Math.abs(s.e) < 0.004 && Math.abs(s.v) < 0.05) { this.sqEnd(); return; }
    // the box drawn smaller still answers to the whole of its old place, so a press near its top edge still clicks
    const h = s.H * (1 + s.e), w = s.W / Math.sqrt(1 + s.e), f = v => v.toFixed(2) + 'px';
    this.btn.style.cssText = `height:${f(h)};width:${f(w)};margin:${f(s.H - h)} 0 0 ${f((s.W - w) / 2)};--hx:${f((w - s.W) / 2)};--hy:${f(h - s.H)};--hw:${f(s.W)};--hh:${f(s.H)}`;
    this.sqRaf = requestAnimationFrame(t => this.sqLoop(t));
  }
  sqEnd() {
    cancelAnimationFrame(this.sqRaf); this.sqRaf = 0; this.sq = null;
    this.btn.style.cssText = ''; this.style.removeProperty('--sk-held-w'); this.style.removeProperty('--sk-held-h'); this.toggleAttribute('data-held', false);
  }
  disconnected() { if (this.sq) this.sqEnd(); }
  /* end a loading state with a hit and a check mark */
  success(word = 'ジャーン!') {
    this.loading = false;
    moves.impact(this.btn, { word, scale: 0.7, stage: this });
    this.at(320, () => this.done());
  }
  /* show the check mark and a sparkle without another hit: for a click that has already had its ドン! */
  done(ms = 2600) {
    this.toggleAttribute('data-done', true);
    const q = rectOf(this.btn); moves.twinkle(q.r + 8, q.t, 12, { delay: 0.2 });
    clearTimeout(this._doneT); if (ms > 0) this._doneT = setTimeout(() => this.toggleAttribute('data-done', false), ms);
  }
  /* reject: shake and buzz */
  fail() { this.loading = false; anim(this.btn, 'nope'); FX.arcs({ el: this.btn }); SND.play('buzz'); }
}
define('sk-button', SkButton);

/* ---------------- sk-hold-button: press and hold to confirm ---------------- */
export class SkHoldButton extends SkElement {
  static props = { duration: [Number, 1100], word: [String, 'ザンッ!'], disabled: Boolean };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-block;vertical-align:middle;position:relative}
button{position:relative;overflow:hidden;padding:10px 22px;font:400 19.5px/1 var(--sk-font-head);cursor:pointer;user-select:none;touch-action:none;white-space:nowrap;--c:0}
button{transition:scale var(--sk-bounce-t) var(--sk-bounce)}
button[data-hold]{transition:none}
button::before{content:"";position:absolute;inset:0;background:var(--sk-pink);transform-origin:0 50%;transform:scaleX(var(--c));opacity:.9}
button[data-inv]{background:var(--sk-ink);color:var(--sk-surface);box-shadow:none}
button[data-inv]::before{opacity:0}
span{position:relative}
.half{position:absolute;left:0;top:0;margin:0;pointer-events:none}`;
  static template = `<button class="box" part="base"><span><slot></slot></span></button>`;

  setup() {
    const b = this.btn = this.$('button');
    this.hold = false; this.busy = false;
    const start = () => {
      if (this.busy || this.hold || this.disabled) return;
      this.hold = true; this.t0 = now(); this.gos = 0; this.lastFx = 0; this.hum = SND.loop('charge'); b.toggleAttribute('data-hold', true);
      this.q = rectOf(b);
      const loop = () => {
        if (!this.hold) return;
        const t = now() - this.t0, c = this.charge = Math.min(1, t / (this.duration / 1000)), q = this.q;
        b.style.setProperty('--c', c); this.hum.set(c);
        if (level()) b.style.scale = `${(1 + 0.08 * c).toFixed(3)} ${(1 - 0.22 * c).toFixed(3)}`;   // compressed like a wound spring
        if (level()) { const amp = 0.6 + c * 4; b.style.translate = `${rnd(-amp, amp).toFixed(1)}px ${rnd(-amp, amp).toFixed(1)}px`; }
        if (t - this.lastFx > 0.06) {
          this.lastFx = t;
          const a = rnd(0, 6.283), d = rnd(74, 112);
          FX.lines({ x: q.cx + Math.cos(a) * d * 1.35, y: q.cy + Math.sin(a) * d * 0.8, angle: a + Math.PI, n: 1, len: 26 + c * 34, dist: 36, life: 0.22, w: 2 + c * 2.5, color: c > 0.6 ? FX.C.pink : FX.C.violet });
        }
        if (this.gos < 3 && c >= (this.gos + 1) * 0.25) {
          (this.words || (this.words = [])).push(moves.say('ゴ', { voice: 'rumble', x: q.cx - 50 + this.gos * 46 + rnd(-4, 4), y: q.t - 30 - this.gos * 8, size: 26 + this.gos * 8, rot: rnd(-14, 2), hold: Math.max(80, this.duration * (1 - c)) }));
          this.gos++;
        }
        if (c >= 1) { this.hold = false; this.fire(); return; }
        this.raf = requestAnimationFrame(loop);
      };
      loop();
    };
    const release = () => {
      if (!this.hold) return;
      this.hold = false; cancelAnimationFrame(this.raf); this.hum.stop();
      b.removeAttribute('data-hold'); b.style.scale = '';   // lets go: the CSS spring bounces it back
      b.style.translate = ''; b.style.setProperty('--c', 0);
      (this.words || []).forEach(h => h.cancel(60)); this.words = [];
      if (this.charge > 0.12) { moves.poof(this.q.r - 6, this.q.t - 4, 9, { silent: true, life: 0.4 }); moves.say('プスッ', { voice: 'soft', x: this.q.cx + 40, y: this.q.t - 26, size: 22, hold: 200 }); }
    };
    b.addEventListener('pointerdown', e => { b.setPointerCapture(e.pointerId); start(); });
    b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release); b.addEventListener('blur', release);
    b.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
    b.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); });
  }
  disconnected() { this.hold = false; this.hum && this.hum.stop(); }
  fire() {
    const b = this.btn, q = this.q, TH = 0.36;
    this.busy = true; this.hum.stop(); b.style.translate = ''; b.removeAttribute('data-hold'); b.style.scale = '';
    b.toggleAttribute('data-inv', true);
    FX.slash({ x: q.cx, y: q.cy, angle: -TH, len: q.w + 170, bulge: -20, life: 0.42, drift: 70 });
    (this.words || []).forEach(h => h.cancel(60)); this.words = [];        // the rumble clears before the cut speaks
    this.at(60, () => moves.say(this.word, { voice: 'cut', x: q.cx + 24, y: q.t - 50, size: 44, hold: 360 }));
    shake(this, 7, 260);
    this.at(90, () => {
      b.toggleAttribute('data-inv', false); SND.play('crack');
      if (level()) {
        const m = 12, tan = Math.tan(TH), yAt = x => q.h / 2 - (x - q.w / 2) * tan, yl = yAt(-m), yr = yAt(q.w + m);
        const clips = [`polygon(${-m}px ${-m}px,${q.w + m}px ${-m}px,${q.w + m}px ${yr}px,${-m}px ${yl}px)`, `polygon(${-m}px ${yl}px,${q.w + m}px ${yr}px,${q.w + m}px ${q.h + m}px,${-m}px ${q.h + m}px)`];
        const text = this.textContent;
        this.halves = clips.map((cp, i) => {
          const c = document.createElement('button');
          c.className = 'box half'; c.tabIndex = -1; c.setAttribute('aria-hidden', 'true');
          c.style.cssText = `width:${q.w}px;height:${q.h}px;--c:1;clip-path:${cp};padding:10px 22px;font:400 19.5px/1 var(--sk-font-head)`;
          c.innerHTML = `<span>${text.replace(/</g, '&lt;')}</span>`;
          this.shadowRoot.appendChild(c);
          const s = i ? -1 : 1;
          c.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${22 * s}px,${-10 * s}px) rotate(${-3 * s}deg)`, opacity: 1, offset: 0.22, easing: 'cubic-bezier(.5,0,.9,.5)' }, { transform: `translate(${58 * s}px,${150 + 20 * i}px) rotate(${-22 * s}deg)`, opacity: 1, offset: 0.92 }, { transform: `translate(${60 * s}px,${170 + 20 * i}px) rotate(${-24 * s}deg)`, opacity: 0 }], { duration: 640, fill: 'forwards' });
          return c;
        });
        b.style.visibility = 'hidden';
        moves.shards(q.cx, q.cy, 9, 260);
        FX.puff({ x: q.l, y: q.cy, r: 12, vx: -70, vy: -10, life: 0.8 }); FX.puff({ x: q.r, y: q.cy, r: 12, vx: 70, vy: -10, life: 0.8 });
      }
      b.style.setProperty('--c', 0);
      this.emit('sk-confirm');
      this.at(760, () => {
        (this.halves || []).forEach(h => h.remove()); this.halves = null;
        b.style.visibility = ''; play(b, [{ scale: '.9' }, { scale: '1.08', offset: 0.55 }, { scale: '1' }], { duration: 220 });
        moves.poof(q.cx, q.b + 4, 10, { vy: 20, silent: true });
        moves.say('ポン', { voice: 'pop', x: q.cx + 40, y: q.t - 26, size: 20, hold: 180 });
        this.busy = false;
      });
    });
  }
}
define('sk-hold-button', SkHoldButton);

/* ---------------- sk-like ---------------- */
export class SkLike extends SkElement {
  static props = { pressed: Boolean, count: [Number, 0], disabled: Boolean };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-block;vertical-align:middle}
button{display:inline-flex;align-items:center;gap:8px;padding:8px 16px 8px 12px;font:400 19.5px/1 var(--sk-font-head);cursor:pointer;touch-action:manipulation}
svg{width:24px;height:24px;overflow:visible}
path{fill:var(--sk-surface);stroke:var(--sk-ink);stroke-width:2.6;stroke-linejoin:round}
:host([pressed]) path{fill:var(--sk-pink)}
.roll{min-width:1.6em;text-align:left;padding:2px 0}${ROLL_CSS}`;
  static template = `<button class="box lift" part="base"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART}"/></svg><span class="roll"><b></b></span></button>`;
  setup() {
    this.btn = this.$('button'); this.svg = this.$('svg'); this.num = this.$('.roll');
    this.btn.addEventListener('click', () => {
      const on = !this.pressed;
      this._quiet = true; this.pressed = on; this.count = this.count + (on ? 1 : -1); this._quiet = false;
      roll(this.num, this.count, on ? 1 : -1); SND.play('tick', { f: on ? 1500 : 1000 });
      const q = rectOf(this.svg);
      if (on) {
        play(this.svg, [{ scale: '1' }, { scale: '.82', offset: 0.25 }, { scale: '1.22', offset: 0.6 }, { scale: '1' }], { duration: 240 });
        moves.shower(q.cx, q.cy, 'heart', 4, { delay: 0.1, size: rnd(4, 7) });
        FX.ticks({ x: q.cx - 16, y: q.cy - 20, angle: -2.3, len: 9, delay: 0.1 }); FX.ticks({ x: q.cx + 16, y: q.cy - 20, angle: -0.85, len: 9, delay: 0.1 });
        moves.say('ドキッ', { voice: 'pop', x: q.cx + 36, y: q.t - 34, size: 24, hold: 260, delay: 0.1 });
      } else {
        anim(this.svg, 'dip'); moves.poof(q.cx, q.cy - 6, 8, { silent: true });
        moves.say('シュン', { voice: 'soft', x: q.cx + 34, y: q.t - 26, size: 20, hold: 220 });
      }
      this.emit('change', { pressed: on, count: this.count });
    });
  }
  sync(name) {
    this.btn.setAttribute('aria-pressed', this.pressed); this.btn.disabled = this.disabled;
    if (!this._quiet && (name === null || name === 'count')) this.num.lastElementChild.textContent = this.count;
  }
}
define('sk-like', SkLike);

/* ---------------- sk-segmented: one-of-many buttons with a dashing indicator ---------------- */
export class SkSegmented extends SkElement {
  static props = { value: String, disabled: Boolean };
  static styles = css`
:host{display:inline-block;vertical-align:middle}
.track{position:relative;display:inline-flex;padding:4px;contain:layout style}
.ind{position:absolute;left:0;top:4px;bottom:4px;width:10px;border-radius:8px;background:var(--sk-peri);border:var(--sk-bw) solid var(--sk-ink)}
::slotted(button){transition:scale var(--sk-bounce-t) var(--sk-bounce);position:relative;border:0;background:none;margin:0;padding:9px 15px;font:400 17px/1 var(--sk-font-head);color:var(--sk-ink);cursor:pointer;border-radius:10px;-webkit-tap-highlight-color:transparent}
::slotted(button:active){scale:.9;transition:scale 70ms}`;
  static template = `<div class="track box" part="base" role="tablist"><span class="ind"></span><slot></slot></div>`;
  get items() { return [...this.querySelectorAll(':scope > button')]; }
  setup() {
    this.ind = this.$('.ind'); this.track = this.$('.track'); this.cur = -1;
    this.addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.parentElement === this) this.pick(this.items.indexOf(b), true); });
    this.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const i = clamp(this.cur + d, 0, this.items.length - 1); this.pick(i, true); this.items[i].focus();
    });
    this.ro = new ResizeObserver(() => this.place());
    this.$('slot').addEventListener('slotchange', () => this.sync(null));
  }
  connected() { this.ro.observe(this); }
  disconnected() { this.ro.disconnect(); }
  valueOf(b, i) { return b.value || b.getAttribute('value') || String(i); }
  // slotted children report offsets against the page, so measure against the track instead
  // Screen rects include any CSS zoom or scale on the ancestors, and a pressed button is scaled down, so the width comes
  // from layout (offsetWidth) and only the centre from the screen. Returns [left, width] in the track's own pixels,
  // plus k (screen px per track px) and the track's screen left edge, for placing effects.
  geo(b) {
    const t = this.track.getBoundingClientRect(), r = b.getBoundingClientRect(), k = t.width / this.track.offsetWidth || 1, w = b.offsetWidth;
    return [(r.left + r.width / 2 - t.left) / k - this.track.clientLeft - w / 2, w, k, t.left + this.track.clientLeft * k];
  }
  place() {
    const b = this.items[this.cur]; if (!b) return;
    const [l, w] = this.geo(b);
    this.ind.style.left = l + 'px'; this.ind.style.width = w + 'px';
  }
  sync() {
    const its = this.items; if (!its.length) return;
    let i = its.findIndex((b, k) => this.valueOf(b, k) === this.value); if (i < 0) i = 0;
    its.forEach((b, k) => { b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    this.cur = i; this.place();
  }
  pick(i, user) {
    const its = this.items; if (i === this.cur || !its[i]) return;
    const from = its[this.cur], to = its[i], dir = i > this.cur ? 1 : -1;
    const [a, wa, k, x0] = this.geo(from), [b, wb] = this.geo(to);
    this.cur = i; this.value = this.valueOf(to, i);
    const hit = slide(play, this.ind, a, wa, b, wb);   // stretches on the way, squashes on arrival
    const q = this.rect, fx = x0 + (a + wa / 2) * k, far = x0 + (dir > 0 ? b + wb : b) * k;
    moves.streak(fx, q.cy, dir > 0 ? Math.PI : 0, 44, 4, { delay: 0.04 });
    moves.say('シュッ', { voice: 'swish', x: (fx + far) / 2 + 12, y: q.t - 22, size: 22, hold: 220 });
    this.at(hit, () => { FX.puff({ x: far + dir * 6, y: q.b + 2, r: 8, vx: dir * 40, vy: -10, life: 0.55 }); shake(this, 1, 120); SND.play('land'); });
    if (user) this.emit('change', { value: this.value });
  }
}
define('sk-segmented', SkSegmented);

/* ---------------- sk-copy: copy text to the clipboard ---------------- */
export class SkCopy extends SkElement {
  static props = { value: String, from: String, label: [String, 'Copy'] };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-block;vertical-align:middle}
button{--gp:6px;display:inline-flex;align-items:center;gap:var(--gp);padding:5px 11px;font:400 15px/1.1 var(--sk-font-head);cursor:pointer;border-radius:11px;--sk-sh:3px}
:host([data-done]) .chk{width:1em;margin-left:0}
:host([data-done]) .chk path{stroke-dashoffset:0}${CHECK_CSS}`;
  static template = `<button class="box press" part="base"><slot><span class="lbl"></span></slot>${CHECK}</button>`;
  setup() {
    this.btn = this.$('button');
    this.btn.addEventListener('click', async () => {
      const src = this.from ? document.querySelector(this.from) : null;
      const text = this.value != null ? this.value : src ? src.textContent : '';
      try { await navigator.clipboard.writeText(text); } catch (e) { /* clipboard may be blocked; still give feedback */ }
      const q = moves.tap(this.btn, 'click');
      moves.say('カチッ', { voice: 'click', x: q.cx + 12, y: q.t - 18, size: 16, enter: 'whole', hold: 220, exitMs: 60, silent: true });
      this.toggleAttribute('data-done', true); this.at.clear(); this.at(1400, () => this.toggleAttribute('data-done', false));
      this.emit('sk-copy', { text });
    });
  }
  sync() { const l = this.$('.lbl'); if (l) l.textContent = this.label; }
}
define('sk-copy', SkCopy);
