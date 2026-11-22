/* SkElement: the base class every component extends.
   - Shadow DOM with shared constructable stylesheets: one base sheet for the whole library plus one per class.
   - Declarative props: `static props = { checked: Boolean, value: String, max: [Number, 100] }` become
     observed attributes with matching JS properties.
   - Per-instance timeline that is cancelled on disconnect, so nothing fires on a removed element. */
import { timeline, rectOf } from './util.js';
import { enter, leave } from './config.js';
import { linkFonts } from './tokens.js';

/* Effect regions (data-sk-fx): whatever the user acts on sets the ceiling for the effects that follow.
   A press that is still held keeps its own region while the pointer passes over others. */
if (typeof addEventListener === 'function') {
  const mark = e => { if (e.type !== 'pointerover' || !e.buttons) enter(e.composedPath()[0]); };
  for (const type of ['pointerdown', 'pointerup', 'pointerover', 'click', 'keydown', 'keyup', 'input', 'change', 'focusin']) addEventListener(type, mark, { capture: true, passive: true });
}

const BASE = `
:host{box-sizing:border-box;font-family:var(--sk-font);font-weight:700;font-synthesis:none;color:var(--sk-ink);-webkit-tap-highlight-color:transparent}
:host([hidden]){display:none !important}
*,*::before,*::after{box-sizing:border-box}
button{font:inherit;color:inherit;margin:0}
:focus-visible{outline:3px solid var(--sk-pink);outline-offset:4px}
:where(.box){border:var(--sk-bw) solid var(--sk-ink);border-radius:var(--sk-r);background:var(--sk-surface);color:var(--sk-ink);box-shadow:var(--sk-sh) var(--sk-sh) 0 var(--sk-lav)}
.ital{font-family:var(--sk-font-head);font-weight:400}
:host([disabled]){opacity:.5;pointer-events:none}
.press{transition:scale var(--sk-bounce-t) var(--sk-bounce)}
.press:active{scale:.93 .87;transition:scale 70ms ease-out}
.lift{transition:translate var(--sk-spring-t) var(--sk-spring),scale var(--sk-bounce-t) var(--sk-bounce)}
.lift:active{scale:.93 .87;transition:scale 70ms ease-out,translate 70ms}
@media (hover:hover){.lift:hover:not(:active){translate:-1px -3px}}
@media (prefers-reduced-motion:reduce){.press,.lift{transition:none}}
.float{position:fixed;inset:auto;margin:0;z-index:2147482500;overflow:visible;transform-origin:var(--ax,50%) 0}
.float[data-side=top]{transform-origin:var(--ax,50%) 100%}
.float[hidden]{display:none}
`;
const sheets = new Map();
let baseSheet = null;
function sheetFor(cls) {
  if (!baseSheet) { baseSheet = new CSSStyleSheet(); baseSheet.replaceSync(BASE); }
  let s = sheets.get(cls);
  if (!s) { s = new CSSStyleSheet(); s.replaceSync(cls.styles || ''); sheets.set(cls, s); }
  return [baseSheet, s];
}
const templates = new Map();
function templateFor(cls) {
  let t = templates.get(cls);
  if (!t) { t = document.createElement('template'); t.innerHTML = cls.template || '<slot></slot>'; templates.set(cls, t); }
  return t;
}

export class SkElement extends HTMLElement {
  static props = {};
  static get observedAttributes() { return Object.keys(this.props); }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: !!this.constructor.delegatesFocus });
    root.adoptedStyleSheets = sheetFor(this.constructor);
    root.appendChild(templateFor(this.constructor).content.cloneNode(true));
    this.at = timeline(this);
    this._live = false;
  }
  connectedCallback() {
    linkFonts();
    const was = enter(this);
    try {
      if (!this._live) { this._live = true; this.setup && this.setup(); }
      this.sync && this.sync(null);
      this.connected && this.connected();
    } finally { leave(was); }
  }
  disconnectedCallback() { this.at.clear(); this.disconnected && this.disconnected(); }
  attributeChangedCallback(name, old, val) {
    if (!this._live || old === val || !this.sync) return;
    const was = enter(this);
    try { this.sync(name, old, val); } finally { leave(was); }
  }

  /* form participation for classes that declare `static formAssociated = true` */
  setForm(v) {
    if (!this._int && this.constructor.formAssociated && this.attachInternals) this._int = this.attachInternals();
    if (this._int) this._int.setFormValue(v);
  }
  $(sel) { return this.shadowRoot.querySelector(sel); }
  $$(sel) { return [...this.shadowRoot.querySelectorAll(sel)]; }
  get rect() { return rectOf(this); }
  /* bubbling, composed event */
  emit(type, detail) { return this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable: true })); }
}

/* register a class: wires up its props as attribute-backed properties, then defines the tag */
export function define(tag, cls) {
  for (const [name, spec] of Object.entries(cls.props || {})) {
    const [type, dflt] = Array.isArray(spec) ? spec : [spec, spec === Number ? 0 : spec === Boolean ? false : null];
    // skip names our own classes define by hand; names that only exist on the DOM (Element.prefix, title…) are ours to take
    let own = false;
    for (let p = cls.prototype; p && p !== HTMLElement.prototype; p = Object.getPrototypeOf(p)) if (Object.prototype.hasOwnProperty.call(p, name)) { own = true; break; }
    if (own) continue;
    Object.defineProperty(cls.prototype, name, {
      configurable: true,
      get() {
        if (type === Boolean) return this.hasAttribute(name);
        const v = this.getAttribute(name);
        if (v == null) return dflt;
        return type === Number ? (Number.isFinite(+v) ? +v : dflt) : v;
      },
      set(v) {
        if (type === Boolean) this.toggleAttribute(name, !!v);
        else if (v == null) this.removeAttribute(name);
        else this.setAttribute(name, v);
      },
    });
  }
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) customElements.define(tag, cls);
  return cls;
}
/* css tagged template: only here so editors highlight it */
export const css = (s, ...v) => String.raw({ raw: s }, ...v);
export const html = css;
