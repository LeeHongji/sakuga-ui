/* Navigation: tabs, accordion, breadcrumb, pagination, steps. */
import { SkElement, define, css, FX, SND, moves, anim, play, spring, shake, rectOf, clamp, level } from '../core/index.js';
import { CHEVRON, roll, ROLL_CSS, slide } from './_parts.js';

/* ---------------- sk-tabs + sk-tab ---------------- */
export class SkTab extends SkElement {
  static props = { value: String, label: String, active: Boolean, disabled: Boolean };
  static styles = css`:host{display:none}:host([active]){display:block}`;
  setup() { this.setAttribute('role', 'tabpanel'); }
  sync(name) { if (name === 'label' && this.parentElement && this.parentElement.build) this.parentElement.build(); }
}
define('sk-tab', SkTab);

export class SkTabs extends SkElement {
  static props = { value: String };
  static styles = css`
:host{display:block}
.nav{position:relative;display:flex;gap:4px;border-bottom:var(--sk-bw) solid var(--sk-ink);contain:layout style}
.nav button{position:relative;border:0;background:none;padding:9px 14px 10px;font:italic 700 15px/1 var(--sk-font);cursor:pointer;color:var(--sk-muted);border-radius:8px 8px 0 0}
.nav button{transition:scale var(--sk-bounce-t) var(--sk-bounce)}
.nav button:active{scale:.92;transition:scale 70ms}
.nav button[aria-selected=true]{color:var(--sk-ink)}
.ind{position:absolute;left:0;bottom:-2px;height:7px;width:10px;background:var(--sk-pink);border:2px solid var(--sk-ink);border-radius:4px}
.panels{padding:14px 2px 0}`;
  static template = `<div class="nav" role="tablist" part="nav"><span class="ind"></span></div><div class="panels" part="panels"><slot></slot></div>`;
  get tabs() { return [...this.querySelectorAll(':scope > sk-tab')]; }
  setup() {
    this.nav = this.$('.nav'); this.ind = this.$('.ind'); this.cur = -1;
    this.nav.addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.pick(+b.dataset.i, true); });
    this.nav.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      const i = clamp(this.cur + d, 0, this.btns.length - 1); this.pick(i, true); this.btns[i].focus();
    });
    this.$('slot').addEventListener('slotchange', () => { this.build(); this.sync(null); });
    this.ro = new ResizeObserver(() => this.place());
  }
  connected() { this.build(); this.ro.observe(this.nav); }
  disconnected() { this.ro.disconnect(); }
  build() {
    this.nav.querySelectorAll('button').forEach(b => b.remove());
    this.btns = this.tabs.map((t, i) => { const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.dataset.i = i; b.textContent = t.label || t.value || i + 1; b.disabled = t.disabled; this.nav.appendChild(b); return b; });
  }
  place() { const b = this.btns && this.btns[this.cur]; if (b) { this.ind.style.left = b.offsetLeft + 6 + 'px'; this.ind.style.width = b.offsetWidth - 12 + 'px'; } }
  sync() {
    const ts = this.tabs; if (!ts.length || !this.btns) return;
    let i = ts.findIndex(t => (t.value || '') === this.value); if (i < 0) i = 0;
    ts.forEach((t, k) => { t.active = k === i; });
    this.btns.forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    this.cur = i; this.place();
  }
  pick(i, user) {
    const ts = this.tabs; if (i === this.cur || !ts[i]) return;
    const from = this.btns[this.cur], to = this.btns[i], dir = i > this.cur ? 1 : -1;
    const a = from.offsetLeft + 6, wa = from.offsetWidth - 12, b = to.offsetLeft + 6, wb = to.offsetWidth - 12;
    this.value = ts[i].value || String(i);
    if (this.cur !== i) { this.cur = i; this.sync(); }
    slide(play, this.ind, a, wa, b, wb);
    play(ts[i], [{ transform: `translateX(${18 * dir}px) skewX(${-6 * dir}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 170, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    const q = rectOf(this.nav);
    moves.streak(q.l + a + wa / 2, q.b - 2, dir > 0 ? Math.PI : 0, 36, 3, { spread: 10 });
    SND.play('swish', { small: 1 });
    this.at(190, () => { FX.ticks({ x: q.l + b + (dir > 0 ? wb : 0), y: q.b + 4, angle: dir > 0 ? 0.5 : 2.64, len: 8, n: 2, life: 0.3 }); SND.play('land'); });
    if (user) this.emit('change', { value: this.value });
  }
}
define('sk-tabs', SkTabs);

/* ---------------- sk-accordion + sk-accordion-item ---------------- */
export class SkAccordionItem extends SkElement {
  static props = { open: Boolean, label: String, disabled: Boolean };
  static delegatesFocus = true;
  static styles = css`
:host{display:block;border-bottom:2px dashed color-mix(in srgb,var(--sk-muted) 50%,transparent)}
:host(:last-child){border-bottom:0}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;border:0;background:none;padding:13px 14px;font:italic 700 16px/1.3 var(--sk-font);cursor:pointer;text-align:left}
.chev{flex:none;transition:rotate .22s var(--sk-snap)}
.head:active .chev{scale:.8}
:host([open]) .chev{rotate:180deg}
.body{display:grid;grid-template-rows:0fr;transition:grid-template-rows .2s cubic-bezier(.3,1,.4,1)}
:host([open]) .body{grid-template-rows:1fr}
.in{overflow:hidden;min-height:0}
.pad{padding:0 14px 14px;font:500 15px/1.5 var(--sk-font)}`;
  static template = `<button class="head" part="header"><span><slot name="label"></slot><span class="lbl"></span></span>${CHEVRON}</button><div class="body"><div class="in"><div class="pad" part="content"><slot></slot></div></div></div>`;
  setup() {
    this.head = this.$('.head');
    this.head.addEventListener('click', () => { if (this.disabled) return; this._user = true; this.open = !this.open; this._user = false; });
  }
  sync(name) {
    this.$('.lbl').textContent = this.label || ''; this.head.setAttribute('aria-expanded', this.open);
    if (name !== 'open' || !this._user) return;
    const q = rectOf(this.$('.chev'));
    if (this.open) {
      SND.word('パカッ');   // heard, not lettered: there is no room beside a row of text that is about to open
      FX.ticks({ x: q.cx, y: q.cy + 12, angle: Math.PI / 2, len: 8, life: 0.3 });
      play(this.$('.pad'), [{ transform: 'translateY(-8px) scaleY(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, delay: 60, fill: 'backwards' });
    } else { SND.play('close'); FX.puff({ x: q.cx, y: q.cy + 10, r: 6, n: 3, vy: 10, life: 0.35 }); }
    this.emit('sk-toggle', { open: this.open });
  }
}
define('sk-accordion-item', SkAccordionItem);

export class SkAccordion extends SkElement {
  static props = { single: Boolean };
  static styles = css`:host{display:block}.a{overflow:hidden}`;
  static template = `<div class="a box" part="base"><slot></slot></div>`;
  setup() { this.addEventListener('sk-toggle', e => { if (this.single && e.detail.open) this.querySelectorAll(':scope > sk-accordion-item[open]').forEach(i => { if (i !== e.target) i.open = false; }); }); }
}
define('sk-accordion', SkAccordion);

/* ---------------- sk-breadcrumb ---------------- */
export class SkBreadcrumb extends SkElement {
  static styles = css`
:host{display:block}
nav{display:flex;flex-wrap:wrap;align-items:center;gap:4px;font:italic 700 14px/1.3 var(--sk-font)}
.sep{color:var(--sk-pink);font-weight:900;letter-spacing:-3px;padding:0 6px 0 3px;transform:skewX(-14deg)}
::slotted(a){color:var(--sk-muted);text-decoration:none;padding:3px 6px;border-radius:7px}
::slotted(a:hover){color:var(--sk-ink);background:color-mix(in srgb,var(--sk-lav) 45%,transparent)}
::slotted(:not(a)){padding:3px 6px;color:var(--sk-ink)}`;
  static template = `<nav aria-label="Breadcrumb" part="base"></nav>`;
  setup() { this.mo = new MutationObserver(() => this.build()); }
  connected() { this.build(); this.mo.observe(this, { childList: true }); }
  disconnected() { this.mo.disconnect(); }
  build() {
    const kids = [...this.children];
    kids.forEach((k, i) => { k.slot = 'i' + i; });
    this.$('nav').innerHTML = kids.map((_, i) => `${i ? '<span class="sep" aria-hidden="true">››</span>' : ''}<slot name="i${i}"></slot>`).join('');
  }
}
define('sk-breadcrumb', SkBreadcrumb);

/* ---------------- sk-pagination: the marker hops to the new page ---------------- */
export class SkPagination extends SkElement {
  static props = { page: [Number, 1], total: [Number, 1], siblings: [Number, 1] };
  static styles = css`
:host{display:inline-block;vertical-align:middle}
nav{display:inline-flex;align-items:center;gap:5px}
button{min-width:34px;height:34px;padding:0 8px 1px;border:var(--sk-bw) solid transparent;border-radius:11px;background:none;font:italic 700 15px/1 var(--sk-font);cursor:pointer}
button:hover{background:color-mix(in srgb,var(--sk-lav) 45%,transparent)}
button[aria-current]{border-color:var(--sk-ink);background:var(--sk-peri);box-shadow:3px 3px 0 var(--sk-lav)}
button:disabled{opacity:.35;cursor:default;background:none}
button[data-hop]{background:transparent;border-color:transparent;box-shadow:none}
.gap{padding:0 2px;color:var(--sk-muted);font-weight:900}`;
  static template = `<nav aria-label="Pagination" part="base"></nav>`;
  setup() { this.nav = this.$('nav'); this.nav.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) this.go(+b.dataset.p); }); }
  pages() {
    const t = this.total, p = this.page, s = this.siblings, out = [];
    for (let i = 1; i <= t; i++) if (i === 1 || i === t || Math.abs(i - p) <= s) out.push(i); else if (out[out.length - 1] !== 0) out.push(0);
    return out;
  }
  sync() {
    const p = clamp(this.page, 1, this.total);
    this.nav.innerHTML = `<button class="press" data-p="${p - 1}" ${p <= 1 ? 'disabled' : ''} aria-label="previous">‹</button>` + this.pages().map(i => i ? `<button class="press" data-p="${i}" ${i === p ? 'aria-current="page"' : ''}>${i}</button>` : '<span class="gap">…</span>').join('') + `<button class="press" data-p="${p + 1}" ${p >= this.total ? 'disabled' : ''} aria-label="next">›</button>`;
  }
  go(p) {
    p = clamp(p, 1, this.total); if (p === this.page) return;
    const old = this.nav.querySelector('[aria-current]'), a = old && rectOf(old), dir = p > this.page ? 1 : -1;
    this.page = p;
    const cur = this.nav.querySelector('[aria-current]');
    if (a && cur && level()) {
      const b = rectOf(cur);
      cur.toggleAttribute('data-hop', true);   // the number stays readable; only its box waits for the ball to land
      moves.hop({ x: a.cx, y: a.cy }, { x: b.cx, y: b.cy }, { height: 16, r: 7, side: 'y', dur: 0.22, color: FX.C.peri, hollow: true, done: () => { cur.removeAttribute('data-hop'); play(cur, [{ scale: '1.12 .85' }, { scale: '.97 1.05', offset: 0.5 }, { scale: '1 1' }], { duration: 200 }); moves.dust(b.cx, b.b + 2, 4, 12); SND.play('land'); } });
      SND.play('boing');
    } else if (cur) anim(cur, 'pulse');
    this.emit('change', { page: p });
  }
}
define('sk-pagination', SkPagination);

/* ---------------- sk-steps + sk-step ---------------- */
export class SkStep extends SkElement {
  static props = { label: String };
  static styles = css`:host{display:none}`;
}
define('sk-step', SkStep);

export class SkSteps extends SkElement {
  static props = { current: [Number, 0] };
  static styles = css`
:host{display:block}
ol{display:flex;list-style:none;margin:0;padding:0}
li{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;font:italic 700 13px/1.25 var(--sk-font);text-align:center;color:var(--sk-muted)}
li[data-s=done],li[data-s=now]{color:var(--sk-ink)}
.dot{position:relative;z-index:1;width:34px;height:34px;border-radius:50%;border:var(--sk-bw) solid var(--sk-ink);background:var(--sk-surface);display:grid;place-items:center;padding-bottom:1px;font:italic 900 15px/1 var(--sk-font);color:var(--sk-ink)}
li[data-s=now] .dot{background:var(--sk-peri);box-shadow:3px 3px 0 var(--sk-lav)}
li[data-s=done] .dot{background:var(--sk-pink);color:var(--sk-on-hot)}
.line{position:absolute;top:15px;left:calc(-50% + 17px);right:calc(50% + 17px);height:5px;border:1.5px solid var(--sk-ink);border-radius:3px;background:var(--sk-surface);overflow:hidden}
.line i{position:absolute;inset:0;background:var(--sk-pink);transform-origin:0 50%;transform:scaleX(0);transition:transform .22s steps(6)}
li[data-s=done] .line i,li[data-s=now] .line i{transform:scaleX(1)}
li:first-child .line{display:none}`;
  static template = `<ol part="base"></ol><slot></slot>`;
  setup() { this.ol = this.$('ol'); this.prev = null; this.$('slot').addEventListener('slotchange', () => this.sync(null)); }
  get count() { return this.querySelectorAll(':scope > sk-step').length; }
  sync(name) {
    const steps = [...this.querySelectorAll(':scope > sk-step')], cur = clamp(this.current, 0, steps.length), was = this.prev; this.prev = cur;
    if (this.ol.children.length !== steps.length) this.ol.innerHTML = steps.map((s, i) => `<li><span class="line"><i></i></span><span class="dot"></span><span class="lbl"></span></li>`).join('');
    [...this.ol.children].forEach((li, i) => {
      const st = i < cur ? 'done' : i === cur ? 'now' : 'todo';
      li.dataset.s = st; li.querySelector('.dot').textContent = st === 'done' ? '✓' : i + 1; li.querySelector('.lbl').textContent = steps[i].label || '';
      if (st === 'now') li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (name !== 'current' || was == null || cur === was) return;
    if (cur > was) {
      const dot = this.ol.children[cur - 1] && this.ol.children[cur - 1].querySelector('.dot');
      if (dot) { const q = rectOf(dot); anim(dot, 'land'); moves.say('ペタッ', { voice: 'pop', x: q.cx + 26, y: q.t - 16, size: 18, hold: 220 }); FX.ticks({ x: q.cx, y: q.t - 4, angle: -Math.PI / 2, len: 9 }); moves.dust(q.cx, q.b + 2, 5, 16); }
      if (cur >= steps.length) { const q = this.rect; moves.say('ジャーン!', { voice: 'impact', x: q.cx, y: q.t - 26, size: 36, hold: 600 }); moves.shower(q.cx, q.cy, 'star', 10, { stroke: FX.C.ink, g: 520 }); }
    } else SND.play('swish', { small: 1 });
    const now = this.ol.children[cur] && this.ol.children[cur].querySelector('.dot'); if (now) anim(now, 'pulse');
  }
  next() { this.current = Math.min(this.count, this.current + 1); this.emit('change', { current: this.current }); }
  back() { this.current = Math.max(0, this.current - 1); this.emit('change', { current: this.current }); }
}
define('sk-steps', SkSteps);
