/* Overlays: dialog, drawer, tooltip, popover, menu. */
import { SkElement, define, css, FX, SND, moves, anim, play, spring, shake, zipIn, zipOut, rectOf, level, lift, lower, anchor } from '../core/index.js';
import { X_ICON } from './_parts.js';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"]),sk-button,sk-input,sk-select,sk-switch,sk-checkbox';
let locks = 0;

/* shared behaviour for modal layers: open/close lifecycle, Escape, focus return, scroll lock */
class Layer extends SkElement {
  static props = { open: Boolean, title: String, nodismiss: Boolean };
  setup() {
    this.panel = this.$('.panel'); this.back = this.$('.back');
    this.back.addEventListener('click', () => { if (!this.nodismiss) this.hide(); else { anim(this.panel, 'nope'); FX.arcs({ el: this.panel }); SND.play('buzz'); } });
    this.$('.x').addEventListener('click', () => this.hide());
    this.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !this.nodismiss) { e.stopPropagation(); this.hide(); }
      if (e.key === 'Tab') {
        const f = [this.$('.x'), ...this.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent !== null || x === this.$('.x'));
        const first = f[0], last = f[f.length - 1], act = this.shadowRoot.activeElement || document.activeElement;
        if (e.shiftKey && (act === first || act === this.panel)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  show() { this.open = true; }
  hide() { this.open = false; }
  sync(name) {
    this.$('.ttl').textContent = this.title || '';
    if (name !== 'open') { if (name === null && this.open) this.enter(true); return; }
    this.open ? this.enter() : this.leave();
  }
  enter(quiet) {
    this.removeAttribute('data-closing');
    lift(this);
    this.returnTo = document.activeElement;
    if (++locks === 1) document.documentElement.style.overflow = 'hidden';
    this._locked = true;
    play(this.back, [{ opacity: 0 }, { opacity: 1 }], { duration: 140 });
    if (!quiet) this.enterFx();
    requestAnimationFrame(() => (this.querySelector('[autofocus]') || this.panel).focus());
    this.emit('sk-open');
  }
  leave() {
    if (this._locked) { this._locked = false; if (--locks === 0) document.documentElement.style.overflow = ''; }
    this.toggleAttribute('data-closing', true);
    const done = () => { this.removeAttribute('data-closing'); if (!this.open) lower(this); if (this.returnTo && this.returnTo.focus) this.returnTo.focus(); this.emit('sk-close'); };
    play(this.back, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    const a = this.leaveFx(); a ? (a.onfinish = done) : done();
  }
  disconnected() { if (this._locked) { this._locked = false; if (--locks === 0) document.documentElement.style.overflow = ''; } }
}
const LAYER_CSS = `
:host{position:fixed;inset:0;z-index:2147480000;display:none;width:auto;height:auto;margin:0;border:0;padding:0;background:none;overflow:visible}
:host([open]),:host([data-closing]){display:grid}
.back{position:absolute;inset:0;background-color:color-mix(in srgb,var(--sk-ink) 46%,transparent);background-image:radial-gradient(color-mix(in srgb,var(--sk-paper) 26%,transparent) 1.2px,transparent 1.6px);background-size:8px 8px}
.panel{position:relative;outline:none;display:flex;flex-direction:column;max-height:calc(100vh - 48px)}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 12px 6px 18px}
.ttl{font:400 23px/1.2 var(--sk-font-head)}
.x{border:0;background:none;padding:6px;cursor:pointer;line-height:0;font-size:13px;border-radius:8px;color:inherit}
.body{padding:8px 18px 16px;overflow:auto;font:700 15px/1.5 var(--sk-font)}
.foot{display:flex;justify-content:flex-end;gap:10px;padding:0 18px 18px}
.foot:not(:has(::slotted(*))){display:none}`;
const LAYER_HTML = `<div class="back" part="backdrop"></div><div class="panel box" role="dialog" aria-modal="true" tabindex="-1" part="panel"><div class="head"><span class="ttl"></span><button class="x" aria-label="close">${X_ICON}</button></div><div class="body"><slot></slot></div><div class="foot"><slot name="footer"></slot></div></div>`;

/* ---------------- sk-dialog ---------------- */
export class SkDialog extends Layer {
  static props = { ...Layer.props, word: String };
  static styles = LAYER_CSS + css`:host{place-items:center;padding:24px}.panel{width:min(460px,100%)}`;
  static template = LAYER_HTML;
  enterFx() {
    const q = rectOf(this.panel);   // measured before the slam so the marks land on the resting box
    spring(this.panel, [{ transform: 'scale(1.08) rotate(-1deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'spring', { duration: 320 }); SND.play('open');
    this.at(120, () => {
      FX.ticks({ x: q.l - 4, y: q.t - 4, angle: -2.36, len: 14 }); FX.ticks({ x: q.r + 4, y: q.t - 4, angle: -0.78, len: 14 });
      moves.dust(q.cx, q.b + 4, 9, q.w / 2 - 10);
      if (this.word) { shake(this.panel, 6, 220); moves.say(this.word, { voice: 'impact', x: q.cx, y: q.t - 34, size: 54, hold: 400 }); }
    });
  }
  leaveFx() { SND.play('close'); return anim(this.panel, 'leave'); }
}
define('sk-dialog', SkDialog);

/* ---------------- sk-drawer ---------------- */
export class SkDrawer extends Layer {
  static props = { ...Layer.props, side: [String, 'right'] };
  static styles = LAYER_CSS + css`
:host{justify-items:end;align-items:stretch}
:host([side=left]){justify-items:start}
:host([side=bottom]){justify-items:stretch;align-items:end}
.panel{width:min(360px,88vw);max-height:none;border-radius:var(--sk-r) 0 0 var(--sk-r);box-shadow:calc(var(--sk-sh)*-1) var(--sk-sh) 0 var(--sk-lav);margin:10px 0 10px 0;border-right:0}
:host([side=left]) .panel{border-radius:0 var(--sk-r) var(--sk-r) 0;border-right:var(--sk-bw) solid var(--sk-ink);border-left:0;box-shadow:var(--sk-sh) var(--sk-sh) 0 var(--sk-lav)}
:host([side=bottom]) .panel{width:auto;max-height:70vh;margin:0 10px;border-radius:var(--sk-r) var(--sk-r) 0 0;border-right:var(--sk-bw) solid var(--sk-ink);border-bottom:0}`;
  static template = LAYER_HTML;
  vec() { return this.side === 'left' ? [-1, 0] : this.side === 'bottom' ? [0, 1] : [1, 0]; }
  enterFx() {
    const [dx, dy] = this.vec(), q = rectOf(this.panel);   // where the panel will rest, read before it starts to move
    if (dy) play(this.panel, [{ transform: 'translateY(100%) scaleY(1.1)' }, { transform: 'translateY(-1.5%) scaleY(.98)', offset: 0.7 }, { transform: 'none' }], { duration: 260, easing: 'linear' });
    else play(this.panel, [{ transform: `translateX(${dx * 420}px) scale(1.15,.95)` }, { transform: `translateX(${-dx * 6}px) scale(1.02,.99)`, offset: 0.72 }, { transform: 'none' }], { duration: 260, easing: 'linear' });
    requestAnimationFrame(() => {
      if (!dy) { moves.streak(dx > 0 ? q.l - 10 : q.r + 10, q.cy, dx > 0 ? 0 : Math.PI, 90, 7, { spread: q.h * 0.7, dist: 80 }); moves.say('シュッ', { voice: 'swish', x: (dx > 0 ? q.l : q.r) - dx * 46, y: q.t + 60, size: 36, hold: 320 }); }
      else { SND.play('whoosh'); moves.dust(q.cx, q.t, 10, q.w / 3); }
    });
  }
  leaveFx() {
    const [dx, dy] = this.vec(); SND.play('close');
    return dy ? play(this.panel, [{ transform: 'none' }, { transform: 'translateY(105%)' }], { duration: 180, easing: 'ease-in', fill: 'none' }) : zipOut(this.panel, dx * 420);
  }
}
define('sk-drawer', SkDrawer);

/* ---------------- sk-tooltip ---------------- */
/* A speech balloon that pops out of what it points at: white, inked, its tail on the thing. It grows out of the tail's
   tip at full ink, overshoots with a little tilt and settles, and goes by shrinking back into the tail. Silent, and no
   sound word: a hover happens too often to shout about. */
export class SkTooltip extends SkElement {
  static props = { content: String, placement: [String, 'top'] };
  static styles = css`
:host{display:inline-block}
.tip{width:max-content;max-width:min(240px,calc(100vw - 16px));padding:6px 12px 7px;border:2.5px solid var(--sk-ink);border-radius:14px;background:var(--sk-surface);color:var(--sk-ink);box-shadow:3px 3px 0 var(--sk-lav);font:700 13.5px/1.35 var(--sk-font);pointer-events:none;transform-origin:var(--ax,50%) -14px}
.tip[data-side=top]{transform-origin:var(--ax,50%) calc(100% + 14px)}
.tip::before,.tip::after{content:"";position:absolute;left:var(--ax,50%);translate:-50% 0;border:0 solid transparent}
.tip::before{bottom:100%;border-width:0 8px 11px;border-bottom-color:var(--sk-ink)}
.tip::after{bottom:calc(100% - 4.25px);border-width:0 8px 11px;border-bottom-color:var(--sk-surface)}
.tip[data-side=top]::before{bottom:auto;top:100%;border-width:11px 8px 0;border-color:var(--sk-ink) transparent transparent}
.tip[data-side=top]::after{bottom:auto;top:calc(100% - 4.25px);border-width:11px 8px 0;border-color:var(--sk-surface) transparent transparent}`;
  static template = `<slot></slot><span class="tip float" role="tooltip" hidden part="base"></span>`;
  setup() {
    this.tip = this.$('.tip');
    const show = () => { clearTimeout(this.t); this.t = setTimeout(() => {
      if (!this.content) return;
      if (this.out) { this.out.cancel(); this.out = null; }               // coming back while it shrinks away: just stay
      if (!this.tip.hidden) return;
      this.tip.hidden = false; lift(this.tip);
      this.off = anchor(this.tip, this, { side: this.placement === 'bottom' ? 'bottom' : 'top', align: 'center', gap: 14 });
      const s = this.tip.dataset.side === 'top' ? -1 : 1;
      play(this.tip, [{ transform: `scale(.18) rotate(${-9 * s}deg)` }, { transform: `scale(1.13) rotate(${3 * s}deg)`, offset: 0.5 }, { transform: `scale(.96) rotate(${-1 * s}deg)`, offset: 0.78 }, { transform: 'none' }], { duration: 240 });
    }, 110); };
    const hide = () => {
      clearTimeout(this.t);
      if (this.tip.hidden || this.out) return;
      this.out = play(this.tip, [{ transform: 'none' }, { transform: 'scale(1.05)', offset: 0.3 }, { transform: 'scale(.1)' }], { duration: 110, easing: 'ease-in', fill: 'forwards' });
      if (this.out) this.out.onfinish = () => this.stop(); else this.stop();   // stop() cancels the held last frame too
    };
    this.addEventListener('pointerenter', show); this.addEventListener('pointerleave', hide);
    this.addEventListener('focusin', show); this.addEventListener('focusout', hide);
  }
  stop() { if (this.out) { this.out.cancel(); this.out = null; } if (this.off) { this.off(); this.off = null; } lower(this.tip); this.tip.hidden = true; }
  sync() { this.tip.textContent = this.content || ''; }
  disconnected() { clearTimeout(this.t); this.stop(); }
}
define('sk-tooltip', SkTooltip);

/* ---------------- sk-popover ---------------- */
export class SkPopover extends SkElement {
  static props = { open: Boolean, placement: [String, 'bottom-start'] };
  static styles = css`
:host{display:inline-block}
.pop{min-width:180px;width:max-content;max-width:min(340px,calc(100vw - 16px));padding:10px 15px;--sk-sh:4px;font:700 14px/1.45 var(--sk-font)}`;
  static template = `<slot name="trigger"></slot><div class="pop float box" hidden part="popup"><slot></slot></div>`;
  setup() {
    this.pop = this.$('.pop');
    this.$('slot[name=trigger]').addEventListener('click', () => { this.open = !this.open; });
    this.away = e => { if (!e.composedPath().includes(this)) this.open = false; };
    this.addEventListener('keydown', e => { if (e.key === 'Escape' && this.open) { e.stopPropagation(); this.open = false; const t = this.querySelector('[slot=trigger]'); t && t.focus(); } });
  }
  unpin() { if (this.off) { this.off(); this.off = null; } }
  disconnected() { document.removeEventListener('pointerdown', this.away, true); this.unpin(); }
  sync(name) {
    if (name !== 'open' && !(name === null && this.open)) return;
    if (this.open) {
      this.pop.hidden = false; lift(this.pop);
      this.unpin(); this.off = anchor(this.pop, this.querySelector('[slot=trigger]') || this, { side: this.placement.startsWith('top') ? 'top' : 'bottom', align: this.placement.endsWith('end') ? 'end' : 'start', gap: 9 });
      spring(this.pop, [{ transform: 'scale(.96,.88)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'snap', { duration: 220 }); SND.play('pop');
      document.addEventListener('pointerdown', this.away, true);
      this.opened && this.opened();
      this.emit('sk-open');
    } else {
      document.removeEventListener('pointerdown', this.away, true);
      const a = anim(this.pop, 'leave'), done = () => { if (!this.open) { this.unpin(); lower(this.pop); this.pop.hidden = true; } };
      a ? (a.onfinish = done) : done();
      this.emit('sk-close');
    }
  }
}
define('sk-popover', SkPopover);

/* ---------------- sk-menu + sk-menu-item ---------------- */
export class SkMenuItem extends SkElement {
  static props = { value: String, disabled: Boolean, danger: Boolean };
  static styles = css`
:host{display:flex;align-items:center;gap:8px;padding:7px 10px 9px;border-radius:8px;font:700 15px/1.2 var(--sk-font);cursor:pointer;outline:none;user-select:none;transition:padding var(--sk-snap-t) var(--sk-snap)}
:host(:hover),:host(:focus){background:color-mix(in srgb,var(--sk-lav) 55%,transparent);padding-left:14px;padding-right:6px}
:host([danger]){color:var(--sk-pink)}
:host([data-hit]){background:var(--sk-ink);color:var(--sk-surface)}`;
  setup() { this.setAttribute('role', 'menuitem'); this.tabIndex = -1; }
}
define('sk-menu-item', SkMenuItem);

export class SkMenu extends SkPopover {
  static styles = SkPopover.styles + css`.pop{padding:5px;min-width:160px}`;
  get items() { return [...this.querySelectorAll('sk-menu-item:not([disabled])')]; }
  setup() {
    super.setup();
    this.pop.setAttribute('role', 'menu');
    this.addEventListener('click', e => { const it = e.target.closest('sk-menu-item'); if (it && !it.disabled) this.choose(it); });
    this.addEventListener('keydown', e => {
      if (!this.open) return;
      const its = this.items, i = its.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
      else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) { e.preventDefault(); this.choose(its[i]); }
    });
  }
  opened() {
    this.items.forEach((it, i) => play(it, [{ transform: 'translateX(-10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 170, delay: 20 + i * 28, fill: 'backwards', easing: 'ease-out' }));
    requestAnimationFrame(() => { const f = this.items[0]; f && f.focus(); });
  }
  choose(it) {
    const q = rectOf(it);
    it.toggleAttribute('data-hit', true);
    moves.say('ピッ', { voice: 'click', x: rectOf(this.pop).r + 18, y: q.cy - 8, size: 18, enter: 'whole', hold: 180, exitMs: 50 });
    this.at(90, () => { it.removeAttribute('data-hit'); this.open = false; const t = this.querySelector('[slot=trigger]'); t && t.focus(); });
    this.emit('sk-select', { value: it.value, item: it });
  }
}
define('sk-menu', SkMenu);
