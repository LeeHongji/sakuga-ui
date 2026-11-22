/* Display: card, avatar, divider, kbd, bubble, counter, calendar, word. */
import { SkElement, define, css, FX, SND, moves, anim, play, rectOf, clamp, level, compose, loadFaces, DOTS, config } from '../core/index.js';

/* ---------------- sk-card ---------------- */
export class SkCard extends SkElement {
  static props = { interactive: Boolean, flat: Boolean, tilt: Boolean };
  static styles = css`
:host{display:block}
.c{display:flex;flex-direction:column;height:100%;overflow:hidden;transition:translate .08s steps(2),box-shadow .08s steps(2)}
:host([flat]) .c{box-shadow:none}
:host([tilt]){perspective:800px}
:host([tilt]) .c{transform:rotateX(calc(var(--ry,0)*1deg)) rotateY(calc(var(--rx,0)*1deg));transition:transform var(--sk-spring-t) var(--sk-spring),translate .08s steps(2),box-shadow .08s steps(2)}
:host([interactive]) .c{cursor:pointer}
:host([interactive]) .c:hover{translate:-2px -2px;box-shadow:calc(var(--sk-sh) + 2px) calc(var(--sk-sh) + 2px) 0 var(--sk-peri)}
.h{padding:12px 16px 0;font:400 20.5px/1.25 var(--sk-font-head)}
.b{padding:10px 16px 16px;font:700 15px/1.5 var(--sk-font);flex:1}
.f{padding:0 16px 16px;display:flex;gap:10px;align-items:center}
.m ::slotted(*){display:block;width:100%;border-bottom:var(--sk-bw) solid var(--sk-ink)}
.h:not(:has(::slotted(*))),.f:not(:has(::slotted(*))){display:none}`;
  static template = `<div class="c box" part="base"><div class="m"><slot name="media"></slot></div><div class="h"><slot name="header"></slot></div><div class="b"><slot></slot></div><div class="f"><slot name="footer"></slot></div></div>`;
  setup() {
    const c = this.$('.c');
    c.addEventListener('click', e => { if (this.interactive && !e.target.closest('sk-button,button,a')) moves.tap(c); });
    // tilt: the card leans toward the pointer and springs level again when it leaves
    let queued = false, ev = null;
    this.addEventListener('pointermove', e => {
      if (!this.tilt || e.pointerType === 'touch') return;
      ev = e; if (queued) return; queued = true;
      requestAnimationFrame(() => { queued = false; const r = this.getBoundingClientRect(); c.style.setProperty('--rx', (((ev.clientX - r.left) / r.width - 0.5) * 14).toFixed(2)); c.style.setProperty('--ry', ((0.5 - (ev.clientY - r.top) / r.height) * 14).toFixed(2)); });
    });
    this.addEventListener('pointerleave', () => { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); });
  }
}
define('sk-card', SkCard);

/* ---------------- sk-avatar ---------------- */
const HUES = ['var(--sk-peri)', 'var(--sk-pink)', 'var(--sk-lav)', '#ffd65c', '#7fe0c4'];
export class SkAvatar extends SkElement {
  static props = { src: String, name: String, size: [Number, 44], status: String };
  static styles = css`
:host{display:inline-block;vertical-align:middle;position:relative}
:host(:hover) .a{rotate:-8deg;scale:1.1}
.a{transition:rotate var(--sk-bounce-t) var(--sk-bounce),scale var(--sk-bounce-t) var(--sk-bounce);display:grid;place-items:center;border:var(--sk-bw) solid var(--sk-ink);border-radius:50%;overflow:hidden;padding-bottom:.05em;font:400 1.15em/1 var(--sk-font-head);color:var(--sk-ink);box-shadow:3px 3px 0 var(--sk-lav)}
img{width:100%;height:100%;object-fit:cover}
.s{position:absolute;right:-2px;bottom:-2px;width:30%;height:30%;min-width:10px;min-height:10px;border-radius:50%;border:2.5px solid var(--sk-ink);background:#5fd38a}
:host([status=busy]) .s{background:var(--sk-pink)}:host([status=away]) .s{background:#ffb938}
:host(:not([status])) .s{display:none}`;
  static template = `<div class="a" part="base"></div><i class="s"></i>`;
  sync() {
    const a = this.$('.a'), n = (this.name || '').trim(), s = this.size;
    a.style.cssText = `width:${s}px;height:${s}px;font-size:${Math.round(s * 0.38)}px;background:${HUES[[...n].reduce((h, c) => h + c.codePointAt(0), 0) % HUES.length]}`;
    const init = n ? n.split(/\s+/).map(w => [...w][0]).slice(0, 2).join('').toUpperCase() : '?';
    if (this.src) { a.innerHTML = `<img alt="${n.replace(/"/g, '&quot;')}">`; const im = a.firstChild; im.onerror = () => { a.textContent = init; }; im.src = this.src; }
    else a.textContent = init;
    this.setAttribute('role', 'img'); if (n) this.setAttribute('aria-label', n);
  }
}
define('sk-avatar', SkAvatar);

/* ---------------- sk-divider ---------------- */
export class SkDivider extends SkElement {
  static props = { variant: [String, 'line'] };
  static styles = css`
:host{display:flex;align-items:center;gap:12px;margin:14px 0;font:400 15px/1 var(--sk-font-head);color:var(--sk-muted)}
i{flex:1;height:3px;background:var(--sk-ink);border-radius:2px}
:host([variant=dots]) i{height:8px;background:radial-gradient(var(--sk-ink) 1.6px,transparent 2px) 0 0/8px 8px}
:host([variant=zig]) i{height:9px;background:linear-gradient(135deg,transparent 33%,var(--sk-ink) 33% 50%,transparent 50%) 0 0/12px 9px,linear-gradient(225deg,transparent 33%,var(--sk-ink) 33% 50%,transparent 50%) 0 0/12px 9px}
:host([variant=speed]) i{height:9px;background:linear-gradient(var(--sk-ink),var(--sk-ink)) 0 0/100% 3px no-repeat,linear-gradient(var(--sk-violet),var(--sk-violet)) 18% 100%/46% 2px no-repeat;transform:skewX(-30deg)}
span:empty{display:none}span:not(:has(*)):not(:empty){flex:none}
.l:not(:has(::slotted(*))){display:none}`;
  static template = `<i></i><span class="l"><slot></slot></span><i></i>`;
  setup() { this.setAttribute('role', 'separator'); }
}
define('sk-divider', SkDivider);

/* ---------------- sk-kbd: a key cap; with `listen` it reacts to the real key ---------------- */
const kbds = new Set();
let kbdBound = false;
export class SkKbd extends SkElement {
  static props = { listen: String };
  static styles = css`
:host{display:inline-block;vertical-align:baseline}
kbd{display:inline-block;min-width:1.7em;padding:3px 7px 2px;border:2.5px solid var(--sk-ink);border-radius:8px;background:var(--sk-surface);box-shadow:0 3px 0 var(--sk-ink);font:700 .85em/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center}
kbd[data-down]{translate:0 3px;box-shadow:0 0 0 var(--sk-ink);background:var(--sk-lav)}`;
  static template = `<kbd part="base"><slot></slot></kbd>`;
  connected() {
    kbds.add(this);
    if (!kbdBound) {
      kbdBound = true;
      const on = (e, down) => { for (const k of kbds) { const want = (k.listen || '').toLowerCase(); if (want && want === e.key.toLowerCase()) k.press(down); } };
      addEventListener('keydown', e => { if (!e.repeat) on(e, true); }); addEventListener('keyup', e => on(e, false));
    }
  }
  disconnected() { kbds.delete(this); }
  press(down) {
    const k = this.$('kbd'); k.toggleAttribute('data-down', down);
    if (down) SND.play('key');
  }
}
define('sk-kbd', SkKbd);

/* ---------------- sk-bubble: manga speech balloons ---------------- */
const SPIKES = (() => { let d = ''; const n = 22; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 0.8 + ((i * 7) % 5) * 0.012 : 1 - ((i * 3) % 4) * 0.03; d += `${i ? 'L' : 'M'}${(50 + Math.cos(a) * 50 * r).toFixed(1)} ${(50 + Math.sin(a) * 50 * r).toFixed(1)}`; } return d + 'Z'; })();
export class SkBubble extends SkElement {
  static props = { variant: [String, 'say'], tail: [String, 'left'] };
  static styles = css`
:host{display:inline-block;position:relative;max-width:320px;margin:0 0 16px;transition:rotate var(--sk-bounce-t) var(--sk-bounce),scale var(--sk-bounce-t) var(--sk-bounce)}
:host(:hover){rotate:-2deg;scale:1.04}
.b{position:relative;padding:12px 18px;border:var(--sk-bw) solid var(--sk-ink);border-radius:26px;background:var(--sk-surface);font:700 15px/1.45 var(--sk-font)}
.b::after{content:"";position:absolute;left:26px;bottom:-11px;width:16px;height:16px;background:var(--sk-surface);border:solid var(--sk-ink);border-width:0 var(--sk-bw) var(--sk-bw) 0;transform:skewX(28deg) rotate(45deg)}
:host([tail=right]) .b::after{left:auto;right:26px;transform:skewX(-28deg) rotate(45deg)}
:host([tail=none]) .b::after{display:none}
svg{display:none;position:absolute;inset:-14px -18px;width:calc(100% + 36px);height:calc(100% + 28px);overflow:visible}
path{fill:var(--sk-surface);stroke:var(--sk-ink);stroke-width:var(--sk-bw);stroke-linejoin:miter;vector-effect:non-scaling-stroke}
:host([variant=shout]){margin:14px 18px 22px}
:host([variant=shout]) svg{display:block}
:host([variant=shout]) .b{border-color:transparent;background:none;font-family:var(--sk-font-head);font-weight:400}
:host([variant=shout]) .b::after{display:none}
:host([variant=think]) .b{border-radius:999px;border-style:solid}
:host([variant=think]) .b::after{left:22px;bottom:-16px;width:11px;height:11px;border:var(--sk-bw) solid var(--sk-ink);border-radius:50%;transform:none;box-shadow:-12px 12px 0 -3px var(--sk-surface),-12px 12px 0 0 var(--sk-ink)}
.in{position:relative}`;
  static template = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${SPIKES}"/></svg><div class="b" part="base"><div class="in"><slot></slot></div></div>`;
  /* pop the balloon in, with a small hit for the shouting variant */
  pop() {
    play(this, [{ scale: '1' }, { scale: '.9', offset: 0.19 }, { scale: '1.15', offset: 0.46 }, { scale: '1' }], { duration: 260 }); SND.play(this.variant === 'shout' ? 'stamp' : 'pop');
    if (this.variant === 'shout') { const q = this.rect; FX.ticks({ x: q.l, y: q.t, angle: -2.36, len: 12 }); FX.ticks({ x: q.r, y: q.t, angle: -0.78, len: 12 }); }
  }
}
define('sk-bubble', SkBubble);

/* ---------------- sk-counter: a number that counts to its value on stepped frames ---------------- */
export class SkCounter extends SkElement {
  static props = { value: [Number, 0], duration: [Number, 900], prefix: [String, ''], suffix: [String, ''], decimals: [Number, 0] };
  static styles = css`:host{display:inline-block;font:400 1.15em/1 var(--sk-font-head);font-variant-numeric:tabular-nums}`;
  static template = `<span part="base"></span>`;
  fmt(v) { return this.prefix + v.toLocaleString(undefined, { minimumFractionDigits: this.decimals, maximumFractionDigits: this.decimals }) + this.suffix; }
  disconnected() { cancelAnimationFrame(this.raf); }
  sync(name) {
    const el = this.$('span'), to = this.value, from = this.shown == null ? to : this.shown;
    if (name !== 'value' || !level() || from === to) { this.shown = to; el.textContent = this.fmt(to); return; }
    cancelAnimationFrame(this.raf);
    const t0 = performance.now(), dur = this.duration, fps = config.fps >= 60 ? 30 : config.fps; let last = -1;
    const tick = t => {
      const u = clamp((t - t0) / dur, 0, 1), f = Math.floor(u * dur / 1000 * fps);
      if (f !== last || u === 1) { last = f; this.shown = from + (to - from) * (1 - Math.pow(1 - u, 3)); el.textContent = this.fmt(u === 1 ? to : this.shown); if (u < 1) SND.play('tick', { f: 900 + 700 * u }); }
      if (u < 1) this.raf = requestAnimationFrame(tick);
      else { this.shown = to; play(this, [{ scale: '1 1' }, { scale: '1.07 .9', offset: 0.35 }, { scale: '.97 1.04', offset: 0.7 }, { scale: '1 1' }], { duration: 200 }); SND.play('pop'); }
    };
    this.raf = requestAnimationFrame(tick);
  }
}
define('sk-counter', SkCounter);

/* ---------------- sk-calendar ---------------- */
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export class SkCalendar extends SkElement {
  static formAssociated = true;
  static props = { value: String, month: String, locale: String };
  static styles = css`
:host{display:inline-block;vertical-align:middle}
.c{padding:12px;width:286px}
.h{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.h b{font:400 18.5px/1 var(--sk-font-head)}
.h button{width:30px;height:30px;border:var(--sk-bw) solid var(--sk-ink);border-radius:8px;background:var(--sk-surface);font:400 18.5px/1 var(--sk-font-head);cursor:pointer;padding:0 0 2px}
.g{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;overflow:hidden}
.w{font:400 12.5px/2 var(--sk-font-head);text-align:center;color:var(--sk-muted)}
.d{aspect-ratio:1;border:0;background:none;border-radius:50%;font:400 15px/1 var(--sk-font-head);cursor:pointer;padding:0;color:inherit}
.d{transition:scale var(--sk-bounce-t) var(--sk-bounce)}
.d:active{scale:.78;transition:scale 70ms}
.d:hover{background:color-mix(in srgb,var(--sk-lav) 50%,transparent)}
.d[data-out]{color:var(--sk-muted);opacity:.55}
.d[data-today]{outline:2px dashed var(--sk-violet);outline-offset:-3px}
.d[aria-selected=true]{background:var(--sk-pink);color:var(--sk-on-hot);font-family:var(--sk-font-head);font-weight:400;box-shadow:inset 0 0 0 2.5px var(--sk-ink)}`;
  static template = `<div class="c box" part="base"><div class="h"><button class="press" data-m="-1" aria-label="previous month">‹</button><b></b><button class="press" data-m="1" aria-label="next month">›</button></div><div class="g wk"></div><div class="g days" role="grid"></div></div>`;
  setup() {
    this.days = this.$('.days');
    this.$('.h').addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.turn(+b.dataset.m); });
    this.days.addEventListener('click', e => { const b = e.target.closest('.d'); if (b) this.pick(b.dataset.d); });
  }
  get view() { const m = this.month || (this.value || iso(new Date())).slice(0, 7), [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1); }
  sync(name) {
    const v = this.view, loc = this.locale || undefined, first = new Date(v.getFullYear(), v.getMonth(), 1 - v.getDay()), today = iso(new Date());
    this.$('.h b').textContent = new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'long' }).format(v);
    if (!this.$('.wk').children.length || name === 'locale') this.$('.wk').innerHTML = Array.from({ length: 7 }, (_, i) => `<span class="w">${new Intl.DateTimeFormat(loc, { weekday: 'narrow' }).format(new Date(2024, 8, 1 + i))}</span>`).join('');
    let h = '';
    for (let i = 0; i < 42; i++) { const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i), s = iso(d); h += `<button class="d" role="gridcell" data-d="${s}" ${d.getMonth() !== v.getMonth() ? 'data-out' : ''} ${s === today ? 'data-today' : ''} aria-selected="${s === this.value}">${d.getDate()}</button>`; }
    this.days.innerHTML = h; this.setForm(this.value);
  }
  turn(dir) {
    const v = this.view, n = new Date(v.getFullYear(), v.getMonth() + dir, 1);
    this.month = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
    play(this.days, [{ transform: `translateX(${26 * dir}px) skewX(${-8 * dir}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    const q = rectOf(this.$('.h'));
    moves.say('ペラッ', { voice: 'swish', x: q.cx + dir * 30, y: q.t - 16, size: 22, hold: 240 });
  }
  pick(s) {
    this.value = s;
    if (s.slice(0, 7) !== `${this.view.getFullYear()}-${String(this.view.getMonth() + 1).padStart(2, '0')}`) this.month = s.slice(0, 7);
    const b = this.days.querySelector(`[data-d="${s}"]`);
    if (b) { const q = rectOf(b); anim(b, 'land'); SND.play('stamp'); moves.dust(q.cx, q.b, 4, 10); }
    this.emit('change', { value: s });
  }
}
define('sk-calendar', SkCalendar);

/* ---------------- sk-word: static lettering, for headings and empty states ---------------- */
export class SkWord extends SkElement {
  static props = { text: String, voice: [String, 'impact'], size: [Number, 48], color: String };
  static styles = css`:host{display:inline-block;vertical-align:middle;line-height:0}svg{overflow:visible}
text{font-weight:900;font-synthesis:none;stroke-linejoin:miter;stroke-miterlimit:2.6}:host([round]) text{stroke-linejoin:round}`;
  static template = `<svg part="base" aria-hidden="true"></svg>`;
  connected() { loadFaces().then(() => this.isConnected && this.sync(null)); }
  sync() {
    const t = this.text || this.textContent.trim(), { html, w, h, V } = compose(t, { voice: this.voice, size: this.size, color: this.color || undefined }), svg = this.$('svg');
    this.toggleAttribute('round', !!V.round);
    svg.setAttribute('width', Math.round(w)); svg.setAttribute('height', Math.round(h)); svg.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
    svg.innerHTML = `<defs>${DOTS}</defs>${html}`;
    this.setAttribute('role', 'img'); this.setAttribute('aria-label', t);
  }
  /* play the word as a live sound effect at this element's position */
  shout() { const q = this.rect; moves.say(this.text || this.textContent.trim(), { voice: this.voice, size: this.size, color: this.color || undefined, x: q.cx, y: q.cy }); }
}
define('sk-word', SkWord);
