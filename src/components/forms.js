/* Forms: switch, theme-switch, checkbox, radio-group, slider, input, textarea, select, stepper, rating, otp. */
import { SkElement, define, css, FX, SND, moves, anim, play, spring, shake, rectOf, rnd, clamp, lerp, E, TAU, level, setTheme, getTheme, lift, lower, anchor, config } from '../core/index.js';
import { CHEVRON, STAR, X_ICON, roll, ROLL_CSS } from './_parts.js';

/* ---------------- sk-switch ----------------
   Idle state is plain CSS. The splash is drawn on a canvas that exists only while the switch is animating,
   so a page with hundreds of switches costs nothing until one is flipped. */
// switch geometry at size lg: track, its height when on, line weight, canvas padding, knob diameter off and on
const SW = { W: 132, H: 68, HON: 52, LW: 5, PAD: 70, K0: 56, K1: 56 };
export class SkSwitch extends SkElement {
  static formAssociated = true;
  static props = { checked: Boolean, disabled: Boolean, size: [String, 'md'], value: [String, 'on'] };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-flex;align-items:center;vertical-align:middle;--k:.5}
:host([size=sm]){--k:.36}
:host([size=lg]){--k:1}
label{display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none}
.track{position:relative;flex:none;width:calc(132px*var(--k));height:calc(68px*var(--k));padding:0;border:calc(5px*var(--k)) solid var(--sk-ink);border-radius:999px;background:var(--sk-off);cursor:pointer;--d:56px}
:host([checked]) .track{background:var(--sk-peri);height:calc(52px*var(--k));margin:calc(8px*var(--k)) 0;--d:56px}
.knob{position:absolute;left:calc(2px*var(--k));top:50%;width:calc(var(--d)*var(--k));height:calc(var(--d)*var(--k));margin-top:calc(var(--d)*var(--k)/-2);border-radius:999px;border:calc(3.5px*var(--k)) solid var(--sk-ink);background:radial-gradient(circle calc((var(--d) - 3.5px)*.51*var(--k)) at calc(50% - (var(--d) - 3.5px)*.12*var(--k)) calc(50% - (var(--d) - 3.5px)*.13*var(--k)),var(--sk-fxw) calc(100% - .6px),var(--sk-fxs) 100%);transition:translate var(--sk-spring-t) var(--sk-spring),width var(--sk-spring-t) var(--sk-spring)}
.knob::after{content:"";position:absolute;left:20%;top:13%;width:27%;height:15%;border-radius:50%;background:var(--sk-fxs);rotate:-30deg;opacity:0}
:host([checked]) .knob{translate:calc(68px*var(--k)) 0}
:host([checked]) .knob::after{opacity:1}
.track:active .knob{width:calc(68px*var(--k))}
:host([checked]) .track:active .knob{translate:calc(56px*var(--k)) 0}
:host([checked]) .track[data-anim],.track[data-anim]{background:transparent;border-color:transparent;height:calc(68px*var(--k));margin:0}
.track[data-anim] .knob{visibility:hidden}
canvas{position:absolute;left:calc(-75px*var(--k));top:calc(-75px*var(--k));width:calc(272px*var(--k));height:calc(208px*var(--k));pointer-events:none}`;
  static template = `<label part="base"><button class="track" role="switch"><i class="knob"></i></button><slot></slot></label>`;

  setup() {
    this.btn = this.$('.track');
    this.btn.addEventListener('click', e => { e.preventDefault(); if (this.disabled) return; this._user = true; this.checked = !this.checked; this._user = false; this.emit('change', { checked: this.checked }); });
  }
  sync(name) {
    this.btn.setAttribute('aria-checked', this.checked); this.btn.disabled = this.disabled;
    this.setForm(this.checked ? this.value : null);
    if (name === 'checked' && this._user) this.playFx();
  }
  disconnected() { if (this.anim) this.anim.kill(); this.dropCanvas(); }
  dropCanvas() { if (this.cv) { this.cv.remove(); this.cv = null; } this.btn.removeAttribute('data-anim'); }
  get k() { return parseFloat(getComputedStyle(this).getPropertyValue('--k')) || 0.5; }

  playFx() {
    if (level() === 0) return;
    const k = this.k, on = this.checked, C = FX.C;
    // The browser snaps fractional border widths (2.5px can be drawn as 2px), so the canvas uses the line weights that are
    // really on screen. Otherwise the outline would change thickness for the length of the animation.
    const bw = parseFloat(getComputedStyle(this.btn).borderLeftWidth) || SW.LW * k, kbw = parseFloat(getComputedStyle(this.$('.knob')).borderLeftWidth) || 3.5 * k;
    const { W, H, HON, PAD, K0, K1 } = SW, LW = bw / k, KW = kbw / k, R = H / 2, cy = H / 2, xL = LW + 2 + K0 / 2, xR = LW + 70 + K1 / 2, r0 = (K0 - KW) / 2, r1 = (K1 - KW) / 2;
    // toggled again in mid-flight: the new move starts from the pose on screen, and the old arrival marks stop
    const ghost = this.anim && !this.anim.dead && this.pose ? this.pose : null;
    if (this.anim) this.anim.kill();
    (this.fxs || []).forEach(it => it && it.kill());   // the arrival fan of the move that was interrupted
    const fxs = this.fxs = [];
    this.at.clear(); this.dropCanvas();
    const cv = this.cv = document.createElement('canvas'), sc = Math.min((devicePixelRatio || 1) * k, 5);
    cv.style.left = cv.style.top = -(PAD * k + bw) + 'px';
    cv.width = Math.ceil((W + PAD * 2) * sc); cv.height = Math.ceil((H + PAD * 2) * sc);
    this.btn.appendChild(cv); this.btn.setAttribute('data-anim', '');
    const ctx = cv.getContext('2d');
    let Ht = H, y0 = 0;                                  // the track's current height and top: it is slimmer when on
    const track = inset => { const h = Ht - inset * 2; ctx.beginPath(); ctx.roundRect(inset, y0 + inset, W - inset * 2, h, h / 2); };
    const knobPath = (kr, tail, dir) => {
      ctx.beginPath();
      if (tail < 3) { ctx.arc(0, 0, kr, 0, TAU); return; }
      ctx.moveTo(0, -kr); ctx.arc(0, 0, kr, -Math.PI / 2, Math.PI / 2, dir < 0);
      for (const [fx, fy] of [[0.7, 0.78], [0.3, 0.52], [0.92, 0.34], [0.2, 0.08], [0.8, -0.1], [0.28, -0.36], [1.0, -0.56], [0.4, -0.84]]) ctx.lineTo(-dir * (kr * 0.75 + tail * fx), kr * fy);
      ctx.closePath();
    };
    const surf = (l, x) => {
      const base = y0 + Ht - LW - l.level * (Ht - 2 * LW), d = x - l.cx, sg = l.sig * (d < 0 ? 1.45 : 0.7), q = (d * d) / (sg * sg);
      const g = Math.exp(-q * q * 0.5), g2 = Math.exp(-q * 0.3);
      const fingers = 0.17 * Math.pow(Math.max(0, Math.sin(x * 0.13 + l.ph)), 1.3) + 0.04 * Math.sin(x * 0.4 + l.ph * 2.3);
      return base - l.amp * (g + fingers * g2) - l.rip * (Math.sin(x * 0.13 - l.t * 15) + 0.6 * Math.sin(x * 0.27 + l.t * 10));
    };
    const liquidPath = (l, off, open) => {
      ctx.beginPath();
      if (!open) ctx.moveTo(LW, y0 + Ht);
      for (let x = LW; x <= W - LW; x += 2) { const y = surf(l, x) + off(x); open && x === LW ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      if (!open) { ctx.lineTo(W - LW, y0 + Ht); ctx.closePath(); }
    };
    const drawLiquid = (l, over) => {
      ctx.save();
      if (over) { ctx.beginPath(); ctx.rect(R * 0.5, -PAD, W - R, PAD + y0 + LW); } else track(LW);
      ctx.clip();
      const bump = x => Math.exp(-((x - l.cx) * (x - l.cx)) / (2 * l.sig * l.sig * 2)) * l.amp;
      liquidPath(l, () => 0); ctx.fillStyle = l.foam; ctx.fill();
      if (l.outline) { liquidPath(l, () => 0, true); ctx.lineWidth = 1.8; ctx.strokeStyle = C.fxo; ctx.stroke(); }
      liquidPath(l, x => 3.5 + bump(x) * 0.3); ctx.fillStyle = l.c1; ctx.fill();
      liquidPath(l, x => 9 + bump(x) * 0.55 + 2 * Math.sin(x * 0.2 + l.t * 8)); ctx.fillStyle = l.c2; ctx.fill();
      ctx.restore();
    };
    // one finger of foam: a tapering band that hooks over as it grows, with a round bead at the tip
    const claw = (bx, by, len, w, a0, curl, g) => {
      if (g <= 0.03) return;
      const n = 12, L = [], Rt = []; let x = bx, y = by;
      for (let i = 0; i <= n; i++) {
        const u = i / n, th = a0 + curl * Math.pow(u, 1.25), ww = w * (1 - 0.66 * u) * (0.45 + 0.55 * g), nx = -Math.sin(th), ny = Math.cos(th);
        L.push([x + nx * ww, y + ny * ww]); Rt.push([x - nx * ww, y - ny * ww]);
        if (i < n) { x += (Math.cos(th) * len * g) / n; y += (Math.sin(th) * len * g) / n; }
      }
      const line = pts => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
      ctx.lineWidth = 1.8; ctx.strokeStyle = C.fxo; ctx.fillStyle = C.fxw;
      ctx.beginPath(); ctx.arc(x, y, w * 0.42 * (0.45 + 0.55 * g), 0, TAU); ctx.fill(); ctx.stroke();
      line(L.concat(Rt.slice().reverse())); ctx.closePath(); ctx.fill();
      line(L); ctx.stroke(); line(Rt); ctx.stroke();
    };
    const lens = (x0, x1, y, w) => { const m = lerp(x0, x1, 0.4); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(m, y - w / 2); ctx.lineTo(x1, y); ctx.lineTo(m, y + w / 2); ctx.closePath(); ctx.fill(); };
    const draw = s => {
      this.pose = s;
      ctx.setTransform(sc, 0, 0, sc, PAD * sc, PAD * sc); ctx.clearRect(-PAD, -PAD, W + 2 * PAD, H + 2 * PAD);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      Ht = s.th; y0 = (H - Ht) / 2;
      if (s.speed > 0.02) {
        ctx.fillStyle = C.violet;
        for (const [y, x0, len, w] of [[-9, 4, 96, 3.2], [-18, 40, 58, 2.2], [H + 9, 0, 84, 3.2], [H + 18, 34, 56, 2.2]]) { const a = x0 - 26 * s.ph, b = a + len * s.speed; s.dir > 0 ? lens(a, b, y, w) : lens(W - a, W - b, y, w); }
      }
      track(LW / 2); ctx.fillStyle = s.bg; ctx.fill();
      if (s.liq) drawLiquid(s.liq, false);
      if (s.liq && s.claws > 0) {                         // curls of foam inside the track
        ctx.save(); track(LW); ctx.clip();
        claw(W * 0.2, y0 + Ht * 0.8, 24, 6.5, -0.5, 2.5 + s.curl, s.claws); claw(W * 0.42, y0 + Ht * 0.7, 19, 5.5, -2.6, -2.5 - s.curl, s.claws);
        ctx.restore();
      }
      track(LW / 2); ctx.lineWidth = LW; ctx.strokeStyle = C.ink; ctx.stroke();
      // the crown above the rim: three hooked fingers, all clear of the knob, then the wave they rise from
      const crown = (l, g, cu) => {
        if (g > 0) for (const [fx, len, w, a0, curl] of [[0.13, 24, 11, -2.3, -2.1], [0.3, 29, 12.5, -1.62, 2.0], [0.46, 22, 10.5, -1.0, 2.3]]) claw(W * fx, surf(l, W * fx) + 8, len, w, a0, curl * (0.7 + 0.6 * cu), g);
        drawLiquid(l, true);
      };
      if (s.liq && s.liq.over) crown(s.liq, s.claws, s.curl);
      const kr = s.kr, ri = kr - KW / 2;
      ctx.save(); ctx.translate(s.kx, cy); ctx.scale(s.sx, s.sy);
      knobPath(kr, s.tail, s.dir); ctx.fillStyle = C.fxw; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = C.fxs;
      if (s.tail >= 3) ctx.fillRect(-140, kr * 0.5, 280, kr);
      ctx.beginPath(); ctx.arc(0, 0, kr, 0, TAU); ctx.fill();
      ctx.fillStyle = C.fxw; ctx.beginPath(); ctx.arc(-kr * 0.24, -kr * 0.26, kr * 1.02, 0, TAU); ctx.fill();
      if (s.hl > 0.01) { ctx.globalAlpha = s.hl; ctx.fillStyle = C.fxs; ctx.beginPath(); ctx.ellipse(-0.33 * ri, -0.59 * ri, 0.27 * ri, 0.15 * ri, -0.52, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
      knobPath(kr, s.tail, s.dir); ctx.lineWidth = KW; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.restore();
    };
    // the knob: wind-up, a smear that crosses in about four frames, a squashed landing, then the tail is drawn back in
    const travel = (t, from, to, dir, ra, rb) => {
      const s = { kx: from, kr: ra, tail: 0, sx: 1, sy: 1, speed: 0, ph: 0 }, far = Math.abs(to - from);
      if (t < 0.05) { const u = t / 0.05; s.kx = from - dir * 3 * u; s.sx = 1 - 0.1 * u; s.sy = 1 + 0.06 * u; }
      else if (t < 0.13) {
        const u = (t - 0.05) / 0.08;
        s.kx = lerp(from - dir * 3, to + dir * 3, Math.pow(u, 1.3));
        s.tail = (Math.abs(s.kx - from) * 1.3 + 12) * Math.min(1, u / 0.2);
        s.sx = 1 + 0.16 * Math.sin(Math.PI * u); s.sy = 1 - 0.07 * Math.sin(Math.PI * u); s.speed = Math.sin(Math.PI * Math.min(1, u * 1.1)); s.ph = u;
      } else {
        const u = clamp((t - 0.13) / 0.16, 0, 1), v = clamp((t - 0.19) / 0.17, 0, 1);
        s.tail = (far * 1.3 + 12) * Math.pow(1 - u, 1.6); s.speed = 0.6 * (1 - u); s.ph = 1;
        if (t < 0.19) { s.kx = to + dir * 3; s.sx = 0.8; s.sy = 1.12; }
        else { s.kx = to + dir * 3 * (1 - v); s.sx = lerp(0.8, 1, E.outBack(v)); s.sy = lerp(1.12, 1, E.outBack(v)); s.kr = lerp(ra, rb, E.outCubic(v)); }
      }
      return s;
    };
    const stateOn = t => {
      const s = Object.assign({ bg: C.off, dir: 1, liq: null, th: H, hl: clamp((t - 0.1) / 0.12, 0, 1), claws: 0, curl: 0 }, travel(t, ghost ? ghost.kx : xL, xR, 1, ghost ? ghost.kr : r0, r1));
      if (t >= 0.14 && t < 0.8) {
        const c = clamp((t - 0.14) / 0.46, 0, 1);          // the wave: up fast, hang, curl over and fall
        s.liq = { cx: lerp(W * 0.25, W * 0.32, E.outCubic(c)), amp: c < 1 ? Math.pow(Math.sin(Math.PI * Math.min(1, c * 1.06)), 0.75) * H * 0.9 : 0, sig: 30, level: 0.1 + 0.34 * E.outQuad(c), rip: 2.4 * Math.min(1, c * 2), t, ph: 1.3 + t * 5, foam: C.fxw, c1: C.fxs, c2: C.peri, outline: true, over: true };
        s.claws = c < 0.42 ? E.outBack(c / 0.42) : c < 0.66 ? 1 : Math.max(0, 1 - (c - 0.66) / 0.3);
        s.curl = clamp((c - 0.3) / 0.6, 0, 1);
        if (t > 0.7) { s.liq.level = lerp(0.44, 1.3, E.inQuad((t - 0.7) / 0.1)); s.liq.rip = 3.2; }
      } else if (t >= 0.8) {
        s.bg = C.peri;
        const u = clamp((t - 0.8) / 0.38, 0, 1);
        if (u < 1) s.liq = { cx: 0, amp: 0, sig: 10, level: 0.4 * (1 - E.outQuad(u)), rip: 3 * (1 - u), t, ph: 0, foam: C.fxw, c1: C.deep, c2: C.deep, outline: false, over: false };
        s.th = lerp(H, HON, E.outCubic(clamp((t - 0.86) / 0.22, 0, 1)));
      }
      return s;
    };
    const stateOff = t => {
      const s = Object.assign({ bg: C.off, dir: -1, liq: null, th: lerp(ghost ? ghost.th : HON, H, E.outCubic(clamp(t / 0.14, 0, 1))), hl: 1 - clamp((t - 0.1) / 0.12, 0, 1), claws: 0, curl: 0 }, travel(t, ghost ? ghost.kx : xR, xL, -1, ghost ? ghost.kr : r1, r0)), u = clamp(t / 0.6, 0, 1);
      // flipped back while the wave was still up: drain from the level and the crown that are on screen, not from a full track
      const g = ghost && ghost.liq && ghost.bg !== C.peri ? ghost.liq : null, f = g ? Math.max(0, 1 - t / 0.2) : 0;
      if (g) s.bg = C.off;
      if (u < 1) s.liq = { cx: g ? g.cx : W * 0.7, amp: g ? g.amp * f : 0, sig: g ? g.sig : 14, level: (g ? g.level : 1.2) * (1 - E.outCubic(u)), rip: g ? lerp(g.rip, 3.4 * Math.sin(Math.PI * u), 1 - f) : 3.4 * Math.sin(Math.PI * u), t: g ? g.t + t : t, ph: g ? g.ph : 2, foam: C.fxw, c1: C.fxs, c2: C.peri, outline: true, over: f > 0 };
      if (f > 0) { s.claws = (ghost.claws || 0) * f; s.curl = lerp(ghost.curl || 0, 1, 1 - f); }
      return s;
    };
    const fn = on ? stateOn : stateOff, q = rectOf(this.btn), life = on ? 1.18 : 0.72, two = age => (config.fps >= 30 ? Math.floor(age * 30 + 1e-4) / 30 : age);
    const pose = fn;
    FX.readTheme(); draw(pose(0));   // the canvas takes over in the same frame the CSS knob is hidden, so nothing blinks
    // drawn on twos, like the reference: 30 poses a second, each held for two display frames
    this.anim = FX.add({ layer: 'self', life, draw: (_, age) => draw(pose(two(age))) });
    this.at(life * 1000 + 20, () => this.dropCanvas());
    SND.play('whoosh', null, 0.04);
    if (on) {
      this.at(130, () => { shake(this.btn, 3, 160); SND.play('thud'); });
      this.at(290, () => { fxs.push(FX.ticks({ x: q.r + k, y: q.cy, angle: 0, len: 15 * Math.max(0.6, k), dist: 3, life: 0.9 })); SND.play('splash'); });
      this.at(330, () => { for (let i = 0, n = FX.amount(9); i < n; i++) FX.drop({ x: q.l + (W * 0.32 + rnd(-34, 34)) * k, y: q.t + rnd(-26, -6) * k, vx: rnd(-330, 330) * k, vy: rnd(-400, -150) * Math.max(0.6, k), size: rnd(1.8, 3.9) * Math.max(0.5, k), life: rnd(0.5, 0.8), delay: rnd(0, 0.12) }); });
      this.at(480, () => moves.say('カチッ!', { voice: 'click', x: q.cx, y: q.t - 6 - 58 * k, size: Math.max(13, 31 * k), enter: 'whole', hold: 280, exitMs: 60 }));
      this.at(780, () => SND.play('fill'));
      this.at(1120, () => moves.twinkle(q.r - 8 * k, q.t - 6 * k, 8 + 7 * k, { life: 1.2 }));
    } else {
      this.at(60, () => SND.play('drain'));
      this.at(120, () => { for (let i = 0, n = FX.amount(4); i < n; i++) FX.drop({ x: q.r - 30 * k + rnd(-10, 10) * k, y: q.t + 2, vx: rnd(40, 200) * k, vy: rnd(-280, -140) * Math.max(0.6, k), size: rnd(1.5, 3) * Math.max(0.5, k), life: rnd(0.45, 0.7) }); });
      this.at(130, () => { fxs.push(FX.ticks({ x: q.l - k, y: q.cy, angle: Math.PI, len: 13 * Math.max(0.6, k), dist: 3 })); shake(this.btn, 3, 160); SND.play('thud'); });
      this.at(190, () => moves.say('カチッ', { voice: 'click', color: 'violet', x: q.cx - 6 * k, y: q.t - 6 - 44 * k, size: Math.max(12, 26 * k), enter: 'whole', hold: 260, exitMs: 60 }));
    }
  }
}
define('sk-switch', SkSwitch);

/* ---------------- sk-theme-switch: sun and moon, drives the page theme ---------------- */
export class SkThemeSwitch extends SkElement {
  static props = { disabled: Boolean };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-block;vertical-align:middle;--k:.5}
:host([size=lg]){--k:1}
button{position:relative;display:block;width:calc(132px*var(--k));height:calc(68px*var(--k));border:calc(5px*var(--k)) solid var(--sk-ink);border-radius:999px;background:var(--sk-peri);cursor:pointer;padding:0;transition:background-color .12s .2s}
button[aria-checked=true]{background:var(--sk-deep)}
.sky{position:absolute;inset:0;border-radius:999px;overflow:hidden}
.sky i{position:absolute;background:var(--sk-fxw);border-radius:50%;transition:translate .25s .15s cubic-bezier(.3,1.6,.5,1),opacity .15s .15s}
.cl{width:26%;height:24%;right:10%;bottom:14%;box-shadow:calc(-12px*var(--k)) calc(5px*var(--k)) 0 -1px var(--sk-fxw),calc(9px*var(--k)) calc(6px*var(--k)) 0 calc(-3px*var(--k)) var(--sk-fxw)}
.st{width:calc(5px*var(--k) + 1px);height:calc(5px*var(--k) + 1px);opacity:0;translate:0 8px}
.st.a{left:14%;top:20%}.st.b{left:32%;top:50%}.st.c{left:20%;top:70%}
[aria-checked=true] .cl{translate:0 150%;opacity:0}
[aria-checked=true] .st{opacity:1;translate:0 0}
.orb{position:absolute;left:calc(3px*var(--k));top:calc(3px*var(--k));width:calc(52px*var(--k));height:calc(52px*var(--k));border-radius:50%;border:calc(3.5px*var(--k)) solid var(--sk-ink);background:var(--sk-sun,#ffd65c);overflow:hidden;transition:translate .2s cubic-bezier(.6,0,.3,1.25),background-color .1s .2s}
.orb::after{content:"";position:absolute;width:88%;height:88%;border-radius:50%;background:var(--sk-deep);border:calc(3.5px*var(--k)) solid var(--sk-ink);right:-120%;top:-35%;transition:right .16s .22s,top .16s .22s}
[aria-checked=true] .orb{translate:calc(64px*var(--k)) 0;background:var(--sk-moon,#fff3c4)}
[aria-checked=true] .orb::after{right:-27%;top:-27%}
button[data-snap],button[data-snap] .orb,button[data-snap] .orb::after,button[data-snap] .sky i{transition:none !important}`;
  static template = `<button role="switch" aria-label="Theme" part="base"><span class="sky"><i class="cl"></i><i class="st a"></i><i class="st b"></i><i class="st c"></i></span><span class="orb"></span></button>`;
  setup() {
    this.btn = this.$('button');
    this.onTheme = () => this.btn.setAttribute('aria-checked', getTheme() === 'dark');
    this.btn.addEventListener('click', () => {
      const dark = getTheme() !== 'dark', q = rectOf(this.btn), k = q.w / 142;
      this.btn.setAttribute('aria-checked', dark);
      // the orb stretches only in the direction it is travelling, so it never pokes out of the track behind it
      // one animation carries the orb across: stretched, its leading edge is exactly where the resting orb's edge will be,
      // so no part of it ever leaves the track; then it squashes against that side and settles
      const orb = this.$('.orb'), w = orb.offsetWidth, D = 64 * (q.w / 132), s = dark ? 1 : -1;
      const a = play(orb, [
        { transform: `translateX(${-s * D}px) scale(1,1)` },
        { transform: `translateX(${-s * 0.275 * w}px) scale(1.55,.68)`, offset: 0.42 },
        { transform: `translateX(${s * 0.03 * w}px) scale(.9,1)`, offset: 0.72 },
        { transform: 'translateX(0) scale(1,1)' },
      ], { duration: 300, easing: 'linear' });
      if (a) { orb.style.transition = 'background-color .1s .2s'; a.onfinish = () => { orb.style.transition = ''; }; }
      moves.streak(q.cx, q.t - 8, dark ? Math.PI : 0, 60 * k, 3, { spread: 10 }); moves.streak(q.cx, q.b + 8, dark ? Math.PI : 0, 60 * k, 3, { spread: 10 });
      SND.play('whoosh');
      this.at(190, () => {
        // The page wipe shows a snapshot for its whole length. The switch jumps to its final look just before that
        // snapshot is taken, or its own delayed colour changes would sit frozen inside the wipe and pop at the end.
        this.btn.toggleAttribute('data-snap', true); this.at(640, () => this.btn.removeAttribute('data-snap'));
        const ox = dark ? q.r - q.h / 2 : q.l + q.h / 2;
        FX.ticks({ x: dark ? q.r + 6 : q.l - 6, y: q.cy, angle: dark ? 0 : Math.PI, len: 9 + 6 * k });
        shake(this.btn, 3, 160); SND.play('thud'); SND.play(dark ? 'wipeDark' : 'wipeLight', null, 0.05);
        if (dark) {
          moves.say('シーン…', { voice: 'hush', x: q.cx, y: q.t - 28, size: 14 + 12 * k, hold: 600 });
          for (let i = 0, n = FX.amount(6); i < n; i++) FX.sparkle({ x: q.cx + rnd(-90, 90), y: q.cy + rnd(-70, -20) + (i % 2) * 90, r: rnd(5, 10), color: FX.C.violet, life: rnd(0.8, 1.4), delay: 0.15 + i * 0.07 });
        } else {
          moves.say('パァッ!', { voice: 'shine', x: q.cx, y: q.t - 32, size: 22 + 18 * k, hold: 600 });
          for (let i = 0; i < 8; i++) FX.ticks({ x: ox, y: q.cy, angle: (i / 8) * TAU, n: 1, len: 10 + 6 * k, dist: q.h / 2 + 4, life: 0.5 });
        }
        setTheme(dark ? 'dark' : 'light', { x: ox - scrollX, y: q.cy - scrollY });
        this.emit('change', { theme: dark ? 'dark' : 'light' });
      });
    });
  }
  connected() { document.addEventListener('sk-themechange', this.onTheme); this.onTheme(); }
  disconnected() { document.removeEventListener('sk-themechange', this.onTheme); }
}
define('sk-theme-switch', SkThemeSwitch);

/* ---------------- sk-checkbox ---------------- */
export class SkCheckbox extends SkElement {
  static formAssociated = true;
  static props = { checked: Boolean, disabled: Boolean, value: [String, 'on'] };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-flex;vertical-align:middle}
label{display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none;font-size:16px}
button{width:28px;height:28px;flex:none;padding:0;border-radius:8px;display:grid;place-items:center;cursor:pointer;--sk-sh:4px}
svg{width:18px;height:18px;overflow:visible}
path{fill:none;stroke:var(--sk-ink);stroke-width:5.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:34;stroke-dashoffset:34}
:host([checked]) path{stroke-dashoffset:0;transition:stroke-dashoffset .09s .2s linear}`;
  static template = `<label part="base"><button class="box press" role="checkbox"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.500l5.500 5.500L20 6.500"/></svg></button><slot></slot></label>`;
  setup() {
    this.box = this.$('button');
    this.box.addEventListener('pointerdown', () => { this._down = performance.now(); });
    this.box.addEventListener('click', e => { e.preventDefault(); if (this.disabled) return; this._held = this._down && performance.now() - this._down > 110; this._down = 0; this._user = true; this.checked = !this.checked; this._user = false; this.emit('change', { checked: this.checked }); });
  }
  sync(name) {
    this.box.setAttribute('aria-checked', this.checked); this.box.disabled = this.disabled;
    this.setForm(this.checked ? this.value : null);
    if (name !== 'checked' || !this._user) return;
    const q = rectOf(this.box);
    if (!this.checked) { anim(this.box, 'dip'); moves.poof(q.cx, q.cy, 9); moves.say('ポフ', { voice: 'soft', x: q.cx + 26, y: q.t - 22, size: 22, hold: 280, silent: true }); return; }
    // the squeeze is held for a few frames so the press reads; the blades cut on the release
    // a click gets its own squeeze first; a press that was already held has stored that force and releases at once
    const held = this._held;
    if (held) play(this.box, [{ scale: '.86' }, { scale: '1.09', offset: 0.45 }, { scale: '1' }], { duration: 230 });
    else play(this.box, [{ scale: '1' }, { scale: '.81', offset: 0.14 }, { scale: '.81', offset: 0.26 }, { scale: '1.08', offset: 0.6 }, { scale: '1' }], { duration: 340 });
    this.at(held ? 0 : 80, () => {
      moves.cut(q, { len: q.w * 3.4, drift: q.w * 0.9 });
      moves.say('ズバッ', { voice: 'cut', x: q.cx + q.w * 1.1, y: q.t - q.w * 1.2, size: q.w * 1.32, sp: 0.84, hold: 520 });
      moves.shards(q.cx, q.cy, 6, 260, { size: rnd(5, 8) });
      shake(this.box, 3, 140); SND.play('tinkle', null, 0.1);
    });
    moves.twinkle(q.r + 4, q.t - 5, 9, { delay: 0.46 });
  }
}
define('sk-checkbox', SkCheckbox);

/* ---------------- sk-radio-group + sk-radio: the dot hops between options ---------------- */
export class SkRadio extends SkElement {
  static props = { value: String, checked: Boolean, disabled: Boolean };
  static styles = css`
:host{display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;font-size:16px;outline:none}
.ring{width:26px;height:26px;flex:none;border:var(--sk-bw) solid var(--sk-ink);border-radius:50%;background:var(--sk-surface);box-shadow:3px 3px 0 var(--sk-lav);display:grid;place-items:center}
.ring{transition:scale var(--sk-bounce-t) var(--sk-bounce)}
:host(:active) .ring{scale:.84;transition:scale 70ms}
.ring::after{content:"";width:12px;height:12px;border-radius:50%;background:var(--sk-ink);scale:0}
:host([data-on]) .ring::after{scale:1}
:host(:focus-visible) .ring{outline:3px solid var(--sk-pink);outline-offset:3px}`;
  static template = `<span class="ring" part="ring"></span><slot></slot>`;
  setup() { this.setAttribute('role', 'radio'); this.ring = this.$('.ring'); }
  sync() { this.setAttribute('aria-checked', this.checked); this.tabIndex = this.checked ? 0 : -1; }
}
define('sk-radio', SkRadio);

export class SkRadioGroup extends SkElement {
  static formAssociated = true;
  static props = { value: String, disabled: Boolean };
  static styles = css`:host{display:inline-grid;gap:10px}`;
  get radios() { return [...this.querySelectorAll('sk-radio')]; }
  setup() {
    this.setAttribute('role', 'radiogroup');
    this.addEventListener('click', e => { const r = e.target.closest('sk-radio'); if (r && !r.disabled && !this.disabled) this.pick(r); });
    this.addEventListener('keydown', e => {
      const d = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : e.key === ' ' ? 0 : null;
      if (d == null) return;
      e.preventDefault();
      const rs = this.radios, i = rs.indexOf(e.target.closest('sk-radio')), n = rs[(i + d + rs.length) % rs.length];
      if (n) { this.pick(n); n.focus(); }
    });
    this.$('slot').addEventListener('slotchange', () => this.sync(null));
  }
  sync(name) {
    const rs = this.radios; if (!rs.length) return;
    let cur = rs.find(r => r.value === this.value);
    if (!cur && name === null) { cur = rs.find(r => r.checked); if (cur) { this._skip = true; this.value = cur.value; this._skip = false; } }
    this.setForm(this.value);
    if (this._hopping) return;
    rs.forEach(r => { r.checked = r === cur; r.toggleAttribute('data-on', r === cur); });
    if (!cur) rs[0].tabIndex = 0;
  }
  pick(r) {
    const prev = this.radios.find(x => x.checked);
    if (prev === r) return;
    this._hopping = true; this.value = r.value; this._hopping = false;
    this.radios.forEach(x => { x.checked = x === r; x.removeAttribute('data-on'); });
    const land = () => { if (this.value !== r.value) return; r.toggleAttribute('data-on', true); anim(r.ring, 'land'); const b = rectOf(r.ring); moves.dust(b.cx, b.b, 5, b.w / 2 + 2); FX.ticks({ x: b.cx, y: b.t - 2, angle: -Math.PI / 2, len: 4, dist: 1, life: 0.3 }); SND.play('land'); };
    if (prev && level()) {
      const a = rectOf(prev.ring), b = rectOf(r.ring), vertical = Math.abs(b.cy - a.cy) > Math.abs(b.cx - a.cx);
      FX.puff({ x: a.cx, y: a.cy + 4, r: 6, n: 3, vy: 16, life: 0.4 });
      moves.say('ピョン', { voice: 'pop', color: 'violet', x: vertical ? a.l - 40 : (a.cx + b.cx) / 2, y: vertical ? (a.cy + b.cy) / 2 - 22 : a.t - 44, size: 20, hold: 220 });
      moves.hop({ x: a.cx, y: a.cy }, { x: b.cx, y: b.cy }, { height: 34 + Math.hypot(b.cx - a.cx, b.cy - a.cy) * 0.18, r: 6, side: vertical ? 'x' : 'y', done: land });
    } else land();
    this.emit('change', { value: this.value });
  }
}
define('sk-radio-group', SkRadioGroup);

/* ---------------- sk-slider ---------------- */
export class SkSlider extends SkElement {
  static formAssociated = true;
  static props = { value: [Number, 50], min: [Number, 0], max: [Number, 100], step: [Number, 1], disabled: Boolean, suffix: [String, '%'] };
  static styles = css`
:host{display:inline-block;vertical-align:middle;width:220px;padding:34px 12px 6px}
.s{position:relative;height:30px;cursor:grab;touch-action:none;--x:0px;outline:none}
.s:active{cursor:grabbing}
.track{position:absolute;left:-8px;right:-8px;top:50%;height:14px;translate:0 -50%;border:var(--sk-bw) solid var(--sk-ink);border-radius:9px;background:var(--sk-surface);overflow:hidden}
.fill{position:absolute;left:0;top:0;bottom:0;width:100%;background:var(--sk-peri);transform-origin:0 50%;transform:scaleX(var(--p,0))}
.knob{position:absolute;left:0;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border:var(--sk-bw) solid var(--sk-ink);border-radius:50%;background:var(--sk-surface);translate:var(--x) 0}
.tip{position:absolute;left:0;bottom:100%;translate:calc(var(--x) - 50%) -3px;transform-origin:50% 150%;border:var(--sk-bw) solid var(--sk-ink);border-radius:9px;background:var(--sk-surface);padding:3px 7px;font:700 12px/1 var(--sk-font);white-space:nowrap}
.tip::after{content:"";position:absolute;left:50%;top:100%;translate:-50% 1px;border:4px solid transparent;border-top:5px solid var(--sk-ink)}
.knob,.tip{transition:scale var(--sk-bounce-t) var(--sk-bounce)}
.s[data-grab] .knob{scale:1}
.s[data-grab] .tip{scale:1.04}
.s:focus-visible .knob{outline:3px solid var(--sk-pink);outline-offset:3px}`;
  static template = `<div class="s" role="slider" tabindex="0" part="base"><div class="track"><div class="fill"></div></div><div class="knob"></div><div class="tip"></div></div>`;

  setup() {
    const s = this.s = this.$('.s'); this.knob = this.$('.knob'); this.tip = this.$('.tip');
    this.pos = null; this.target = null; this.raf = 0;
    const fromEvent = e => { const b = this.box, raw = (e.clientX - b.left) / b.width; this.target = clamp(raw, 0, 1); this.band = raw < 0 ? raw : raw > 1 ? raw - 1 : 0; };
    s.addEventListener('pointerdown', e => { if (this.disabled) return; this.drag = true; s.toggleAttribute('data-grab', true); s.setPointerCapture(e.pointerId); this.box = s.getBoundingClientRect(); this.q = rectOf(s); fromEvent(e); this.wake(); });
    s.addEventListener('pointermove', e => { if (this.drag) fromEvent(e); });
    const up = () => { if (this.drag) { this.drag = false; this.band = 0; s.removeAttribute('data-grab'); this.emit('change', { value: this.value }); } };
    s.addEventListener('pointerup', up); s.addEventListener('pointercancel', up);
    s.addEventListener('keydown', e => {
      const span = this.max - this.min, st = this.step / span;
      const d = { ArrowRight: st, ArrowUp: st, ArrowLeft: -st, ArrowDown: -st, PageUp: 0.1, PageDown: -0.1 }[e.key];
      if (d) this.target = clamp(this.target + d, 0, 1); else if (e.key === 'Home') this.target = 0; else if (e.key === 'End') this.target = 1; else return;
      e.preventDefault(); this.q = rectOf(s); this.wake(); this.emit('change', { value: this.value });
    });
  }
  frac(v) { return clamp((v - this.min) / (this.max - this.min || 1), 0, 1); }
  layout() {
    const w = this.s.clientWidth, p = this.pos;
    this.s.style.setProperty('--x', p * w + (this.ov || 0) + 'px'); this.s.style.setProperty('--p', p);
    const v = this.snap(p); this.tip.textContent = v + this.suffix;
    this.s.setAttribute('aria-valuenow', v);
  }
  snap(p) { const st = this.step || 1, v = this.min + p * (this.max - this.min); return +(Math.round(v / st) * st).toFixed(4); }
  sync(name) {
    this.s.setAttribute('aria-valuemin', this.min); this.s.setAttribute('aria-valuemax', this.max);
    if (name === 'value' && this._own) return;
    const f = this.frac(this.value);
    if (this.pos == null || !this.raf) { this.pos = this.target = f; this.layout(); } else this.target = f;
    this.setForm(String(this.value));
  }
  wake() { if (!this.raf) { this.last = 0; this.px = null; this.vx = 0; this.tilt = this.tiltV = 0; this.st = 1; this.sub = 0; this.acc = 0; this.cool = 0; this.ov = this.ovV = 0; this.banded = false; this.hum = SND.loop('drag'); this.raf = requestAnimationFrame(t => this.loop(t)); } }
  disconnected() { cancelAnimationFrame(this.raf); this.raf = 0; this.hum && this.hum.stop(); }
  loop(tms) {
    // everything below is integrated against real time, so it behaves the same at 60, 120 or 30 Hz
    const dt = clamp(this.last ? (tms - this.last) / 1000 : 1 / 60, 0.001, 0.05), f = dt * 60, mix = r => 1 - Math.pow(1 - r, f); this.last = tms;
    this.sub = (this.sub || 0) + f; const steps = Math.floor(this.sub); this.sub -= steps;   // whole 60 Hz steps for the two little springs
    this.pos += (this.target - this.pos) * mix(this.drag ? 0.5 : 0.28);
    if (Math.abs(this.target - this.pos) < 0.0005) this.pos = this.target;
    // pulling past either end stretches like a rubber band and springs back on release
    const bt = this.drag && this.band ? Math.sign(this.band) * 16 * (1 - Math.exp(-Math.abs(this.band) * 5)) : 0;
    for (let i = 0; i < steps; i++) { this.ovV += (bt - this.ov) * 0.3; this.ovV *= 0.6; this.ov += this.ovV; }
    if (this.band && !this.banded) { this.banded = true; const e = this.band > 0 ? this.q.r : this.q.l; FX.ticks({ x: e + Math.sign(this.band) * 14, y: this.q.cy, angle: this.band > 0 ? 0 : Math.PI, len: 9, life: 0.3 }); SND.play('land'); }
    else if (!this.band) this.banded = false;
    this.layout();
    const v = this.snap(this.pos);
    if (v !== this.value) { this._own = true; this.value = v; this._own = false; this.setForm(String(v)); this.emit('input', { value: v }); }
    const w = this.q.w, x = this.pos * w, inst = this.px == null ? 0 : (x - this.px) / dt; this.px = x;
    this.vx = lerp(this.vx, inst, mix(0.45));
    const sp = Math.abs(this.vx), dir = Math.sign(this.vx) || 1, fx = level() > 0;
    if (fx) {
      this.st += (1 + Math.min(sp / 6000, 0.04) - this.st) * mix(0.45);
      this.knob.style.transform = `scale(${this.st.toFixed(3)},${(1 / Math.sqrt(this.st)).toFixed(3)})`;
      for (let i = 0; i < steps; i++) { this.tiltV += (clamp(-this.vx * 0.014, -16, 16) - this.tilt) * 0.22; this.tiltV *= 0.72; this.tilt += this.tiltV; }
      this.tip.style.transform = `rotate(${this.tilt.toFixed(2)}deg)`;
    }
    const kx = this.q.l + x, ky = this.q.cy;
    this.hum.set(clamp(sp / 900, 0, 1));
    if (sp > 160 && fx) {
      this.acc += Math.abs(inst * dt);
      while (this.acc > 7) {
        this.acc -= 7;
        // the plume is sized from the track: it should stand about a third of the track's width tall behind the knob
        const r = clamp(sp / 22, 11, 23) * clamp(w / 210, 0.8, 1.5);
        FX.puff({ x: kx - dir * (14 + rnd(0, w * 0.28)), y: ky - 5 - rnd(0, r * 2.2), r, vx: -dir * rnd(60, 150), vy: -rnd(120, 300), life: rnd(1.05, 1.45) });
        if (Math.random() < 0.5) FX.lines({ x: kx - dir * 26, y: ky + rnd(-5, 10), angle: dir > 0 ? Math.PI : 0, n: 2, len: clamp(sp / 9, 20, 80), spread: 10, dist: 40, life: 0.28, w: 1.8 });
        if (Math.random() < 0.3) FX.shard({ x: kx - dir * rnd(10, 60), y: ky + 10, vx: -dir * rnd(10, 60), vy: rnd(-40, 30), size: rnd(3, 5), life: rnd(0.5, 0.8), g: 500 });
      }
      this.cool -= dt;
      if (sp > Math.min(340, Math.max(220, w * 1.25)) && this.cool <= 0) { this.cool = 1.2; moves.say('シュッ', { voice: 'swish', x: kx - dir * w * 0.2, y: ky - w * 0.42, size: clamp(w * 0.2, 26, 48), hold: 440 }); }
    } else this.cool = Math.max(0, this.cool - dt);
    const settled = !this.drag && this.pos === this.target && sp < 4 && Math.abs(this.st - 1) < 0.004 && Math.abs(this.tilt) < 0.1 && Math.abs(this.tiltV) < 0.1 && Math.abs(this.ov) < 0.2 && Math.abs(this.ovV) < 0.2;
    if (settled) { this.ov = 0; this.layout(); this.knob.style.transform = ''; this.tip.style.transform = ''; this.raf = 0; this.hum.stop(); SND.play('land'); return; }
    this.raf = requestAnimationFrame(t => this.loop(t));
  }
}
define('sk-slider', SkSlider);

/* ---------------- sk-input / sk-textarea ---------------- */
let measure = null;
export class SkInput extends SkElement {
  static formAssociated = true;
  static props = { value: String, label: String, placeholder: String, type: [String, 'text'], invalid: Boolean, disabled: Boolean, readonly: Boolean, required: Boolean, rows: [Number, 3], maxlength: String, hint: String, clearable: Boolean };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-block;vertical-align:middle;width:240px}
.lbl{display:block;margin:0 0 6px 2px;font:italic 700 13px/1.2 var(--sk-font)}
.lbl:empty{display:none}
.lbl{transition:translate var(--sk-spring-t) var(--sk-spring),color .1s;width:max-content}
:host(:focus-within) .lbl{translate:5px -2px;color:var(--sk-violet)}
.field{display:flex;align-items:center;gap:6px;padding:0 14px;--sk-sh:4px;transition:translate var(--sk-spring-t) var(--sk-spring),box-shadow .1s}
.field:focus-within{translate:-2px -3px;box-shadow:calc(var(--sk-sh) + 2px) calc(var(--sk-sh) + 3px) 0 var(--sk-peri)}
input:focus-visible,textarea:focus-visible{outline:none}
.clr{display:none;flex:none;border:0;background:var(--sk-ink);color:var(--sk-surface);width:20px;height:20px;border-radius:50%;padding:0;font-size:8px;line-height:0;cursor:pointer;place-items:center}
:host([clearable][data-has]) .clr{display:grid}
:host([invalid]) .field{border-color:var(--sk-pink);box-shadow:var(--sk-sh) var(--sk-sh) 0 var(--sk-pink)}
input,textarea{flex:1;min-width:0;border:0;outline:0;background:none;color:inherit;font:500 16px/1.4 var(--sk-font);padding:9px 0;resize:vertical}
::placeholder{color:var(--sk-muted);opacity:1}
.hint{margin:6px 0 0 2px;font:500 12px/1.3 var(--sk-font);color:var(--sk-muted)}
.hint:empty{display:none}
:host([invalid]) .hint{color:var(--sk-pink);font-weight:700}`;
  static template = `<label class="lbl" for="c" part="label"></label><div class="field box" part="base"><slot name="prefix"></slot><input id="c" part="input"><button class="clr press" tabindex="-1" aria-label="clear">${X_ICON}</button><slot name="suffix"></slot></div><div class="hint" part="hint"></div>`;

  setup() {
    const c = this.ctl = this.$('#c'), f = this.field = this.$('.field');
    if (this.hasAttribute('value')) c.value = this.getAttribute('value');
    this.$('.clr').addEventListener('click', () => {
      const q = rectOf(this.$('.clr'));
      c.value = ''; this.setForm(''); this.toggleAttribute('data-has', false);
      moves.poof(q.cx, q.cy, 8); c.focus();
      this.emit('input', { value: '' }); this.emit('change', { value: '' });
    });
    c.addEventListener('focus', () => {
      if (!level()) return;
      const q = rectOf(f);
      FX.ticks({ x: q.l + 2, y: q.t - 2, angle: -2.36, len: 8, n: 2, life: 0.3 }); FX.ticks({ x: q.r - 2, y: q.t - 2, angle: -0.78, len: 8, n: 2, life: 0.3 });
      SND.play('tap');
    });
    c.addEventListener('input', () => {
      this.setForm(c.value); this.toggleAttribute('data-has', !!c.value);
      if (this.invalid) this.invalid = false;
      SND.play('key');
      if (level()) {
        const q = rectOf(c), cs = getComputedStyle(c);
        if (!measure) measure = document.createElement('canvas').getContext('2d');
        measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const line = c.value.slice(c.value.lastIndexOf('\n') + 1), x = q.l + Math.min(q.w - 4, measure.measureText(c.type === 'password' ? '•'.repeat(line.length) : line).width);
        FX.ticks({ x: x + 2, y: c.tagName === 'TEXTAREA' ? q.b - 12 : q.cy - 9, angle: -1.2, len: 6, n: 2, dist: 1, life: 0.2, color: FX.C.violet });
      }
      this.emit('input', { value: c.value });
    });
    c.addEventListener('change', () => this.emit('change', { value: c.value }));
    c.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || c.tagName === 'TEXTAREA' || e.isComposing) return;
      const q = rectOf(f);
      anim(f, 'squish');
      moves.say('ターン!', { voice: 'click', x: q.r - 20, y: q.t - 26, size: 26, hold: 320 });
      this.emit('sk-enter', { value: c.value });
    });
  }
  get value() { return this.ctl ? this.ctl.value : this.getAttribute('value') || ''; }
  set value(v) { if (this.ctl) { this.ctl.value = v == null ? '' : v; this.setForm(this.ctl.value); this.toggleAttribute('data-has', !!this.ctl.value); } else this.setAttribute('value', v); }
  sync(name) {
    const c = this.ctl;
    for (const a of ['placeholder', 'type', 'maxlength', 'rows']) { const v = this.getAttribute(a); if (a === 'type' && c.tagName === 'TEXTAREA') continue; v == null ? c.removeAttribute(a) : c.setAttribute(a, v); }
    c.disabled = this.disabled; c.readOnly = this.readonly; c.required = this.required;
    c.setAttribute('aria-invalid', this.invalid);
    this.$('.lbl').textContent = this.label || ''; this.$('.hint').textContent = this.hint || '';
    if (name === 'value') c.value = this.getAttribute('value') || '';
    if (name === null) this.setForm(c.value);
    this.toggleAttribute('data-has', !!c.value);
    if (name === 'invalid' && this.invalid) this.reject();
  }
  /* shake, buzz and a word: call it when validation fails */
  reject(message) {
    if (message != null) this.hint = message;
    if (!this.invalid) { this.invalid = true; return; }
    const q = rectOf(this.field);
    anim(this.field, 'nope');
    moves.say('ブブッ', { voice: 'rumble', x: q.r - 30, y: q.t - 22, size: 20, hold: 240 });
    FX.arcs({ x: q.l - 8, y: q.cy, dir: -1, n: 3 }); FX.arcs({ x: q.r + 8, y: q.cy, dir: 1, n: 3 });
  }
  focus() { this.ctl.focus(); }
}
define('sk-input', SkInput);

export class SkTextarea extends SkInput {
  static template = SkInput.template.replace('<input id="c" part="input">', '<textarea id="c" part="input"></textarea>');
  static styles = SkInput.styles + `.field{align-items:stretch}`;
}
define('sk-textarea', SkTextarea);

/* ---------------- sk-select ---------------- */
export class SkSelect extends SkElement {
  static formAssociated = true;
  static props = { value: String, placeholder: [String, 'Select…'], disabled: Boolean };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-block;vertical-align:middle;min-width:170px}
.trig{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:8px 13px 10px 14px;font:700 16px/1.2 var(--sk-font);cursor:pointer;border-radius:11px;--sk-sh:4px;text-align:left}
.chev{transition:rotate .16s cubic-bezier(.3,1.8,.5,1)}
:host([data-open]) .chev{rotate:180deg}
.pop{padding:5px;--sk-sh:4px;max-height:240px;overflow:auto}
.opt{position:relative;padding:8px 10px;border-radius:8px;font:600 15px/1.2 var(--sk-font);cursor:pointer;display:flex;justify-content:space-between;gap:8px}
.hl{position:absolute;left:5px;right:5px;top:0;height:0;border-radius:8px;background:color-mix(in srgb,var(--sk-lav) 55%,transparent);transition:translate var(--sk-snap-t) var(--sk-snap),height var(--sk-snap-t) var(--sk-snap)}
.opt[aria-selected=true]{font-style:italic;font-weight:800}
.opt[aria-selected=true]::after{content:"✓";color:var(--sk-pink)}
.ph{color:var(--sk-muted)}${ROLL_CSS}`;
  static template = `<button class="trig box press" aria-haspopup="listbox" part="base"><span class="roll"><b></b></span>${CHEVRON}</button><div class="pop float box" role="listbox" hidden part="popup"></div>`;
  get options() { return [...this.querySelectorAll('option')].map(o => ({ value: o.value, label: o.textContent.trim(), disabled: o.disabled })); }
  setup() {
    this.trig = this.$('.trig'); this.pop = this.$('.pop'); this.txt = this.$('.roll');
    this.trig.addEventListener('click', () => (this.open ? this.close() : this.show()));
    this.pop.addEventListener('click', e => { const o = e.target.closest('.opt'); if (o) this.choose(o.dataset.v); });
    this.pop.addEventListener('pointermove', e => { const o = e.target.closest('.opt'); if (o) this.mark(+o.dataset.i); });
    this.addEventListener('keydown', e => {
      const n = this.options.length;
      if (!this.open) { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); this.show(); } return; }
      if (e.key === 'Escape') { this.close(); this.trig.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this.mark((this.act + 1) % n); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.mark((this.act - 1 + n) % n); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const o = this.options[this.act]; if (o) this.choose(o.value); }
    });
    this.away = e => { if (!e.composedPath().includes(this)) this.close(); };
  }
  unpin() { if (this.off) { this.off(); this.off = null; } }
  disconnected() { document.removeEventListener('pointerdown', this.away, true); this.unpin(); }
  sync() {
    const o = this.options.find(x => x.value === this.value), b = this.txt.lastElementChild;
    if (!this._own) { b.textContent = o ? o.label : this.placeholder; b.classList.toggle('ph', !o); }   // a choice just made is rolled in by choose()
    this.trig.disabled = this.disabled; this.setForm(this.value);
  }
  mark(i) {
    this.act = i;
    this.pop.querySelectorAll('.opt').forEach((el, k) => {
      el.toggleAttribute('data-act', k === i);
      if (k === i) { el.scrollIntoView({ block: 'nearest' }); const h = this.pop.querySelector('.hl'); h.style.translate = `0 ${el.offsetTop}px`; h.style.height = el.offsetHeight + 'px'; }
    });
  }
  show() {
    const opts = this.options;
    this.pop.innerHTML = '<i class="hl"></i>' + opts.map((o, i) => `<div class="opt" role="option" data-i="${i}" data-v="${o.value.replace(/"/g, '&quot;')}" aria-selected="${o.value === this.value}">${o.label.replace(/</g, '&lt;')}</div>`).join('');
    this.pop.hidden = false; this.open = true; this.toggleAttribute('data-open', true);
    lift(this.pop); this.unpin(); this.off = anchor(this.pop, this.trig, { align: 'stretch', max: 240 });
    this.mark(Math.max(0, opts.findIndex(o => o.value === this.value)));
    spring(this.pop, [{ transform: 'scale(.96,.88)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'snap', { duration: 220 });
    this.pop.querySelectorAll('.opt').forEach((o, i) => play(o, [{ translate: '0 -8px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 160, delay: 30 + i * 20, fill: 'backwards', easing: 'ease-out' }));
    SND.play('pop');
    this.trig.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', this.away, true);
  }
  close() {
    if (!this.open) return;
    this.open = false; this.removeAttribute('data-open'); this.trig.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', this.away, true);
    const a = anim(this.pop, 'leave'), done = () => { if (!this.open) { this.unpin(); lower(this.pop); this.pop.hidden = true; } };
    a ? (a.onfinish = done) : done();
  }
  choose(v) {
    const changed = v !== this.value, dir = this.options.findIndex(o => o.value === v) >= this.options.findIndex(o => o.value === this.value) ? 1 : -1;
    this.close(); this.trig.focus();
    if (!changed) return;
    this._own = true; this.value = v; this._own = false;
    const o = this.options.find(x => x.value === v), q = rectOf(this.trig);
    this.txt.lastElementChild.classList.remove('ph'); roll(this.txt, o.label, dir);
    this.txt.lastElementChild.classList.remove('ph');
    moves.say('ピッ', { voice: 'click', x: q.r - 16, y: q.t - 20, size: 18, enter: 'whole', hold: 200, exitMs: 50 });
    FX.ticks({ x: q.r - 16, y: q.t - 4, angle: -0.9, len: 8, n: 2, life: 0.3 });
    this.emit('change', { value: v });
  }
}
define('sk-select', SkSelect);

/* ---------------- sk-stepper ---------------- */
export class SkStepper extends SkElement {
  static formAssociated = true;
  static props = { value: [Number, 0], min: [Number, 0], max: [Number, 9], step: [Number, 1], disabled: Boolean };
  static styles = css`
:host{display:inline-flex;vertical-align:middle}
.w{display:inline-flex;align-items:center;gap:8px}
button{width:36px;height:36px;padding:0;border-radius:11px;cursor:pointer;display:grid;place-items:center;--sk-sh:3px;touch-action:manipulation}
button svg{width:16px;height:16px;display:block}
button path{fill:none;stroke:currentColor;stroke-width:4;stroke-linecap:round}
button:active{translate:2px 2px;box-shadow:1px 1px 0 var(--sk-lav)}
.val{min-width:52px;height:44px;padding:0 8px 2px;border-radius:11px;display:grid;place-items:center;font:italic 900 24px/1 var(--sk-font);--sk-sh:0px;box-shadow:none}${ROLL_CSS}`;
  static template = `<div class="w" role="group" part="base"><button class="box press" data-d="-1" aria-label="decrease"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12h15"/></svg></button><div class="val box roll" aria-live="polite"><b></b></div><button class="box press" data-d="1" aria-label="increase"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12h15M12 4.5v15"/></svg></button></div>`;
  setup() {
    this.val = this.$('.val');
    const stop = () => { clearTimeout(this.rep); this.rep = 0; };
    this.stop = stop;
    this.shadowRoot.addEventListener('pointerdown', e => {
      const b = e.target.closest('button'); if (!b || this.disabled) return;
      const d = +b.dataset.d; let gap = 380;
      stop(); this.bump(d);
      // keep holding: it repeats, a little faster each time
      const again = () => { if (!this.bump(d)) return stop(); gap = Math.max(55, gap * 0.78); this.rep = setTimeout(again, gap); };
      this.rep = setTimeout(again, gap);
    });
    for (const ev of ['pointerup', 'pointerout', 'pointercancel']) this.shadowRoot.addEventListener(ev, stop);
    this.shadowRoot.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !this.disabled && e.detail === 0) this.bump(+b.dataset.d); });
  }
  disconnected() { this.stop && this.stop(); }
  sync(name) { if (!this._own) this.val.lastElementChild.textContent = this.value; this.setForm(String(this.value)); }
  bump(d) {
    const q = rectOf(this.val), nn = +(this.value + d * this.step).toFixed(6);
    if (nn < this.min || nn > this.max) {
      shake(this, 6, 260);
      moves.say('ガッ', { voice: 'impact', x: q.cx + d * 44, y: q.t - 30, size: 34, rot: d > 0 ? 4 : -12, hold: 360 });
      FX.arcs({ x: q.l - 52, y: q.cy, dir: -1, n: 3 }); FX.arcs({ x: q.r + 52, y: q.cy, dir: 1, n: 3 });
      return false;
    }
    this._own = true; this.value = nn; this._own = false;
    roll(this.val, nn, d); SND.play('tick', { f: d > 0 ? 1500 : 1000 }); anim(this.val, 'squish');
    if (d > 0) {
      moves.say('ポン!', { voice: 'pop', x: q.cx + 30, y: q.t - 20, size: 18, hold: 180 });
      FX.ticks({ x: q.cx, y: q.t - 4, angle: -Math.PI / 2, len: 6, n: 2, life: 0.3 });
    } else {
      moves.say('スッ', { voice: 'swish', x: q.cx - 22, y: q.t - 20, size: 18, hold: 180 });
      FX.lines({ x: q.cx, y: q.b + 6, angle: Math.PI / 2, n: 3, len: 20, spread: 34, dist: 16, life: 0.28 });
    }
    this.emit('change', { value: nn });
    return true;
  }
}
define('sk-stepper', SkStepper);

/* ---------------- sk-rating ---------------- */
export class SkRating extends SkElement {
  static formAssociated = true;
  static props = { value: [Number, 0], max: [Number, 5], readonly: Boolean, disabled: Boolean };
  static styles = css`
:host{display:inline-flex;vertical-align:middle}
.w{display:inline-flex;gap:3px}
button{border:0;background:none;padding:2px;cursor:pointer;line-height:0;transition:scale var(--sk-bounce-t) var(--sk-bounce),translate var(--sk-spring-t) var(--sk-spring)}
button[data-hov]{scale:1.2;translate:0 -3px}
button[data-hov]:not(.on) path{fill:var(--sk-lav)}
button:active{scale:.85;transition:scale 70ms}
:host([readonly]) button{cursor:default}
svg{width:30px;height:30px;overflow:visible}
path{fill:var(--sk-surface);stroke:var(--sk-ink);stroke-width:2.4;stroke-linejoin:round}
button.on path{fill:var(--sk-pink)}`;
  static template = `<div class="w" role="radiogroup" part="base"></div>`;
  setup() {
    this.w = this.$('.w');
    this.w.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !this.readonly && !this.disabled) this.rate(+b.dataset.i + 1); });
    // hovering previews the score: stars up to the pointer rise on a spring
    this.w.addEventListener('pointerover', e => { const b = e.target.closest('button'); if (!b || this.readonly || this.disabled || e.pointerType === 'touch') return; this.stars.forEach((s, k) => s.toggleAttribute('data-hov', k <= +b.dataset.i)); });
    this.w.addEventListener('pointerleave', () => this.stars && this.stars.forEach(s => s.removeAttribute('data-hov')));
  }
  build() {
    if (this.stars && this.stars.length === this.max) return;
    this.w.innerHTML = Array.from({ length: this.max }, (_, i) => `<button role="radio" data-i="${i}" aria-label="${i + 1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}"/></svg></button>`).join('');
    this.stars = [...this.w.children];
  }
  sync(name) {
    this.build(); this.setForm(String(this.value));
    if (this._own) return;
    this.stars.forEach((s, k) => { s.classList.toggle('on', k < this.value); s.setAttribute('aria-checked', k === this.value - 1); });
  }
  rate(n) {
    const from = this.value, target = from === n ? 0 : n, stars = this.stars;
    this.at.clear(); this._own = true; this.value = target; this._own = false;
    stars.forEach((x, k) => { x.setAttribute('aria-checked', k === target - 1); if (k < Math.min(from, target)) x.classList.add('on'); });
    if (target > from) {
      for (let k = from; k < target; k++) this.at((k - from) * 70, () => {
        const x = stars[k], q = rectOf(x);
        x.classList.add('on'); SND.play('note', { k: Math.min(k, 4) }); anim(x, 'pulse');
        FX.ticks({ x: q.cx, y: q.t, angle: -Math.PI / 2, len: 8, life: 0.3 });
        FX.sticker({ shape: 'star', x: q.cx, y: q.cy, vx: rnd(-70, 70), vy: -rnd(160, 240), size: 4.5, fill: FX.C.fxw, stroke: FX.C.fxo, life: 0.6 });
      });
      this.at((target - from) * 70 + 50, () => {
        const q = rectOf(stars[target - 1]), r = rectOf(this.w), full = target === this.max;
        FX.sparkle({ x: q.r + 2, y: q.t - 5, r: 9, life: 1 });
        moves.say(full ? 'パァァ!' : 'キラッ', { voice: 'shine', x: r.cx, y: r.t - 34, size: full ? 32 : 24, hold: full ? 420 : 260 });
        if (full) { FX.burst({ x: r.cx, y: r.cy, r: 62, sx: 1.7, sy: 0.72, life: 0.45, needles: 12, layer: 'front' }); shake(this, 4, 220); moves.shower(r.cx, r.cy, 'star', 10, { stroke: FX.C.ink, g: 520 }); }
      });
    } else {
      for (let k = from - 1; k >= target; k--) this.at((from - 1 - k) * 50, () => { const x = stars[k], q = rectOf(x); x.classList.remove('on'); SND.play('unstar'); anim(x, 'dip'); FX.puff({ x: q.cx, y: q.cy, r: 6, n: 3, vy: -30, life: 0.4 }); });
    }
    this.emit('change', { value: target });
  }
}
define('sk-rating', SkRating);

/* ---------------- sk-otp: one box per character ---------------- */
export class SkOtp extends SkElement {
  static formAssociated = true;
  static props = { length: [Number, 4], value: String, disabled: Boolean };
  static delegatesFocus = true;
  static styles = css`
:host{display:inline-flex;vertical-align:middle}
.w{display:inline-flex;gap:8px}
input{width:40px;height:48px;padding:0;text-align:center;border-radius:11px;font:italic 900 22px/1 var(--sk-font);color:inherit;--sk-sh:4px;caret-color:var(--sk-pink)}
input:focus{outline:0;translate:-2px -2px;box-shadow:6px 6px 0 var(--sk-peri)}`;
  static template = `<div class="w" part="base"></div>`;
  setup() {
    this.w = this.$('.w');
    this.w.addEventListener('input', e => {
      const i = this.cells.indexOf(e.target), c = e.target;
      c.value = c.value.slice(-1);
      if (c.value) { anim(c, 'pulse'); SND.play('key'); const q = rectOf(c); FX.ticks({ x: q.cx, y: q.t - 3, angle: -Math.PI / 2, len: 7, n: 2, life: 0.25 }); if (this.cells[i + 1]) this.cells[i + 1].focus(); }
      this.commit();
    });
    this.w.addEventListener('keydown', e => {
      const i = this.cells.indexOf(e.target);
      if (e.key === 'Backspace' && !e.target.value && i > 0) { this.cells[i - 1].focus(); this.cells[i - 1].value = ''; this.commit(); }
      else if (e.key === 'ArrowLeft' && i > 0) this.cells[i - 1].focus();
      else if (e.key === 'ArrowRight' && this.cells[i + 1]) this.cells[i + 1].focus();
    });
    this.w.addEventListener('paste', e => { e.preventDefault(); const t = (e.clipboardData.getData('text') || '').trim().slice(0, this.length); [...t].forEach((ch, k) => { if (this.cells[k]) this.cells[k].value = ch; }); this.commit(); (this.cells[Math.min(t.length, this.length - 1)] || this.cells[0]).focus(); });
  }
  sync(name) {
    if (!this.cells || this.cells.length !== this.length) {
      this.w.innerHTML = Array.from({ length: this.length }, (_, i) => `<input class="box" inputmode="numeric" autocomplete="one-time-code" maxlength="2" aria-label="${i + 1}">`).join('');
      this.cells = [...this.w.children];
    }
    if (!this._own) { const v = this.getAttribute('value') || ''; this.cells.forEach((c, i) => { c.value = v[i] || ''; }); }
    this.cells.forEach(c => { c.disabled = this.disabled; });
    this.setForm(this.cells.map(c => c.value).join(''));
  }
  /* wrong code: shake, buzz, clear and refocus */
  reject() {
    const q = rectOf(this.w);
    anim(this.w, 'nope'); moves.say('ブブッ', { voice: 'rumble', x: q.r - 10, y: q.t - 22, size: 20, hold: 220 });
    this.cells.forEach(c => { c.value = ''; }); this._done = null; this.commit(); this.cells[0].focus();
  }
  commit() {
    const v = this.cells.map(c => c.value).join('');
    this._own = true; this.value = v; this._own = false;
    this.emit('input', { value: v });
    if (v.length === this.length && v !== this._done) {
      this._done = v;
      const q = rectOf(this.w);
      this.cells.forEach((c, i) => play(c, [{ translate: '0 0' }, { translate: '0 -9px', offset: 0.4 }, { translate: '0 2px', offset: 0.75 }, { translate: '0 0' }], { duration: 260, delay: i * 45 }));
      moves.say('カチッ!', { voice: 'click', x: q.cx + 10, y: q.t - 34, size: 32, hold: 520, delay: 0.12 });
      moves.twinkle(q.r + 8, q.t - 4, 10, { delay: 0.3 });
      this.emit('sk-complete', { value: v });
    } else if (v.length < this.length) this._done = null;
  }
}
define('sk-otp', SkOtp);
