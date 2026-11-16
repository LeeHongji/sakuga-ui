/* sk-icon: the library's own icon set. Drawn like the components: a thick ink outline, a flat fill, a cel shade and one
   hot accent. Every icon has moving parts. Each part declares the pose it springs back from (--f) and the animation is the
   same for all of them: a short anticipation into that pose, then back to rest on a baked spring curve, so the overshoot
   and the settle come for free. */
import { SkElement, define, css, level, SPRINGS } from '../core/index.js';

// a keyframe cannot take its easing from a custom property, so the spring curve is written into the keyframes
const DIP = 70, SP = SPRINGS.spring;

// part classes: k outline + surface fill, f fill only, p primary fill, h hot fill, s shade (no outline), l line only,
// d ink dot, w paper highlight; m marks a part that moves; style sets its pose (--f), its pivot and an optional delay (--dl)
const m = (pose, body, o = '50% 50%', dl = 0) => `<g class="m" style="--f:${pose};transform-origin:${o}${dl ? `;--dl:${dl}s` : ''}">${body}</g>`;
// a silhouette with a shade that runs to its edge: the fill first, the shade on it, the outline last, so the shade never eats the line
const sil = (shape, inner) => `<${shape} class="f"/>${inner}<${shape} class="l"/>`;
const gear = (() => {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, pt = (r, da) => `${(12 + Math.cos(a + da) * r).toFixed(2)} ${(12 + Math.sin(a + da) * r).toFixed(2)}`;
    d += `${i ? 'L' : 'M'}${pt(7.1, -0.24)}L${pt(9.7, -0.15)}L${pt(9.7, 0.15)}L${pt(7.1, 0.24)}`;
  }
  return d + 'Z';
})();
export const ICONS = {
  // the clapper hangs inside the bell's group: it swings with the bell and lags behind it
  bell: m('rotate(-26deg)', '<path class="k" d="M12 3.4c-3.5 0-5.9 2.6-5.9 6.1v3.5l-1.7 3.1a.9.9 0 0 0 .8 1.4h13.6a.9.9 0 0 0 .8-1.4l-1.7-3.1V9.5c0-3.5-2.4-6.1-5.9-6.1z"/><path class="s" d="M14.6 5.8c1.2 1 1.9 2.4 1.9 4.1v3.7l1.3 2.5h-3.2z"/><circle class="d" cx="12" cy="2.7" r="1.1"/>'
    + m('translateX(-2px)', '<circle class="k h" cx="12" cy="19.9" r="1.9"/>', '50% 50%', 0.06), '50% 6%'),
  heart: m('scale(.55)', '<path class="k h" d="M12 20.6C5.4 15 3 11.7 3 8.4A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 9 2.2c0 3.3-2.4 6.6-9 12.2z"/><path class="w" d="M6.3 8.2c.2-1.2 1-2 2.2-2.2"/>', '50% 60%'),
  star: m('rotate(-72deg) scale(.5)', '<path class="k p" d="M12 2.6l2.8 6 6.6.8-4.9 4.5 1.3 6.5-5.8-3.3-5.8 3.3 1.3-6.5-4.9-4.5 6.6-.8z"/><path class="w" d="M9.4 9.6l1.3-2.8"/>', '50% 55%'),
  // a mark inside a disc moves with the disc, so it can never run into the ring
  check: m('scale(.6)', '<circle class="k p" cx="12" cy="12" r="9.1"/>' + m('rotate(-10deg) scale(.8)', '<path class="l t" d="M7.4 12.5l3.2 3.2 6-6.9"/>', '50% 50%', 0.05)),
  x: m('rotate(-18deg) scale(.8)', '<circle class="k" cx="12" cy="12" r="9.1"/><path class="l t" d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6"/>'),
  plus: sil('rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5"', '<path class="s" d="M15.8 3.6h.2a4.8 4.8 0 0 1 4.6 4.8v7.2a4.8 4.8 0 0 1-4.8 4.8z"/>')
    + m('rotate(-18deg) scale(.8)', '<path class="l t" d="M12 7.4v9.2M7.4 12h9.2"/>'),
  search: m('translate(-3px,-3px) rotate(-22deg)', '<path class="l t" d="M15.4 15.4l5 5"/><circle class="k" cx="10.3" cy="10.3" r="6.5"/><path class="s" d="M12.6 6.3a4.6 4.6 0 0 1 1.9 6.4a4.6 4.6 0 0 1-2.7 2.1a6 6 0 0 0 .8-8.5z"/><path class="w" d="M7.3 9.2c.3-1 1-1.7 2-2"/>', '45% 45%'),
  gear: m('rotate(-90deg)', `<path class="k" d="${gear}"/><circle class="k p" cx="12" cy="12" r="3.1"/>`),
  // the lid is hinged on its left corner
  trash: sil('path d="M6.1 9h11.8l-.9 10.3a1.7 1.7 0 0 1-1.7 1.5H8.7a1.7 1.7 0 0 1-1.7-1.5z"', '<path class="s" d="M14.6 9.2h3.1l-.9 10a1.5 1.5 0 0 1-1.5 1.4h-1.4z"/><path class="l n" d="M10 12.2v5.4M13.6 12.2v5.4"/>')
    + m('translateY(-1.2px) rotate(-12deg)', '<path class="l" d="M9.7 5.4V4.3a.9.9 0 0 1 .9-.9h2.8a.9.9 0 0 1 .9.9v1.1"/><rect class="k h" x="4.3" y="5.4" width="15.4" height="3.2" rx="1.3"/>', '17.9167% 35.8333%'),
  download: '<path class="l t" d="M4.6 15.2v3.3a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-3.3"/>'
    + m('translateY(-7px) scaleY(1.2)', '<path class="k h" d="M10.2 3.4h3.6v6.4h3.3L12 15.6 6.9 9.8h3.3z"/>', '50% 100%'),
  send: m('translate(-7px,7px) scale(.7)', sil('path d="M3.3 11.2L20.7 3.5l-4.5 16.8-4.5-6.3z"', '<path class="s" d="M11.7 14l8.6-9.9-4.3 15.7z"/><path class="l n" d="M11.7 14l9-10.5"/>'), '30% 70%'),
  // the notification rides on the envelope and pops on its own centre
  mail: m('translateY(4px) rotate(-9deg)', sil('rect x="3" y="5.4" width="18" height="13.6" rx="2.5"', '<path class="s" d="M4.2 18.2l5.6-5.2 2.2 1.7 2.2-1.7 5.6 5.2z"/><path class="l" d="M3.8 7.3l8.2 6.3 8.2-6.3"/>')
    + m('scale(.5)', '<circle class="k h" cx="19.3" cy="6" r="2.7"/>', '80.4167% 25%', 0.12), '50% 100%'),
  home: m('translateY(4px) scale(1.12,.8)', sil('path d="M3.6 11.3L12 3.5l8.4 7.8v8.2a1.5 1.5 0 0 1-1.5 1.5H5.1a1.5 1.5 0 0 1-1.5-1.5z"', '<path class="s" d="M15.6 6.9l4.6 4.3v8.2a1.3 1.3 0 0 1-1.3 1.3h-3.3z"/>') + '<path class="k h" d="M10 21v-5.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21z"/>', '50% 100%'),
  user: sil('path d="M4.2 20.8c.5-4.3 3.6-6.5 7.8-6.5s7.3 2.2 7.8 6.5z"', '<path class="s" d="M14.8 14.8c2.7.9 4.4 2.9 4.8 5.8h-4.8z"/>')
    + m('translateY(-3px) rotate(-16deg)', '<circle class="k p" cx="12" cy="8.2" r="4.4"/><path class="w" d="M9.8 7.4c.3-.9.9-1.5 1.8-1.8"/>', '50% 100%'),
  // the shackle lifts only as far as its legs stay in the body
  lock: m('translateY(-1.6px)', '<path class="l t" d="M8 10.6V7.7a4 4 0 0 1 8 0v2.9"/>', '50% 100%')
    + '<rect class="k p" x="4.8" y="10.2" width="14.4" height="10.8" rx="2.8"/><path class="l n" d="M12 14.6v2.6"/><circle class="d" cx="12" cy="14.4" r="1.4"/>',
  eye: m('scaleY(.12)', '<path class="k" d="M2.6 12c2.4-4.3 5.6-6.4 9.4-6.4s7 2.1 9.4 6.4c-2.4 4.3-5.6 6.4-9.4 6.4S5 16.3 2.6 12z"/><circle class="k p" cx="12" cy="12" r="3.5"/><circle class="d" cx="12" cy="12" r="1.4"/><circle class="w2" cx="13.3" cy="10.7" r=".8"/>'),
  bolt: m('translateY(-5px) rotate(14deg) scale(.6)', '<path class="k h" d="M13.7 2.6L5.3 13.3h5.1l-1.7 8.1 9-11.3h-5.3z"/>'),
  bookmark: m('translateY(-6px) scaleY(1.25)', '<path class="k h" d="M6.7 3.5h10.6a1.3 1.3 0 0 1 1.3 1.3v15.7L12 16.3l-6.6 4.2V4.8a1.3 1.3 0 0 1 1.3-1.3z"/><path class="w" d="M8.6 6.6h3"/>', '50% 0%'),
  chat: sil('path d="M4.7 4.4h14.6a2.1 2.1 0 0 1 2.1 2.1v8.5a2.1 2.1 0 0 1-2.1 2.1H11l-4.5 3.7v-3.7H4.7a2.1 2.1 0 0 1-2.1-2.1V6.5a2.1 2.1 0 0 1 2.1-2.1z"', '<path class="s" d="M17.2 4.6h2.1a1.9 1.9 0 0 1 1.9 1.9v8.5a1.9 1.9 0 0 1-1.9 1.9h-2.1z"/>')
    + [8, 12, 16].map((x, i) => m('translateY(-3.5px)', `<circle class="d" cx="${x}" cy="10.8" r="1.3"/>`, '50% 50%', i * 0.07)).join(''),
  // the pencil pivots where it touches the page
  pencil: m('rotate(10deg)', '<path class="k p" d="M5.3 15.5L16.1 4.7a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.5 18.7z"/><path class="k" d="M5.3 15.5l3.2 3.2-4.7 1.5z"/><path class="l n" d="M14.2 6.6l3.2 3.2"/>', '16% 84%'),
  play: m('scale(.7)', '<circle class="k p" cx="12" cy="12" r="9.1"/>' + m('translateX(-.8px) scale(.85)', '<path class="k" d="M10.1 8.1l6 3.9-6 3.9z"/>', '50% 50%', 0.05)),
  arrow: m('translateX(-7px)', '<path class="l t" d="M4.4 12h14M13.2 6.2l6 5.8-6 5.8"/>'),
  copy: sil('rect x="8.4" y="3.2" width="12.2" height="14.2" rx="2.3"', '<path class="s" d="M17 3.4h1.3a2.1 2.1 0 0 1 2.1 2.1v9.6a2.1 2.1 0 0 1-2.1 2.1H17z"/>')
    + m('translate(3.5px,-3.5px)', '<rect class="k p" x="3.4" y="6.6" width="12.2" height="14.2" rx="2.3"/><path class="l n" d="M6.6 11h5.8M6.6 14.4h4"/>'),
  flame: m('scale(.78,1.3)', '<path class="k h" d="M12.2 2.6c.4 3.3 5.3 5.5 5.3 11a5.5 5.5 0 0 1-11 0c0-2.2.9-3.7 2.2-4.9.1 1.5.7 2.4 1.5 2.8-.3-3.7.6-6.8 2-8.9z"/><path class="w2" d="M12 12.6c1.5 1.4 2.3 2.5 2.3 3.8a2.3 2.3 0 0 1-4.6 0c0-1.3.8-2.4 2.3-3.8z"/>', '50% 100%'),
};
export const iconNames = Object.keys(ICONS);

export class SkIcon extends SkElement {
  static props = { name: [String, 'star'], size: Number, plain: Boolean, still: Boolean, label: String };
  static styles = css`
:host{display:inline-block;width:1.4em;height:1.4em;vertical-align:-.32em;line-height:0;color:inherit;flex:none}
svg{display:block;width:100%;height:100%;overflow:visible;transition:scale var(--sk-bounce-t) var(--sk-bounce)}
:host(:active) svg{scale:.84;transition:scale 70ms ease-out}
.k{fill:var(--sk-surface);stroke:currentColor;stroke-width:2.3;stroke-linejoin:round;stroke-linecap:round}
.f{fill:var(--sk-surface)}
.p{fill:var(--sk-peri)}.h{fill:var(--sk-pink)}
.s{fill:var(--sk-lav);opacity:.9}
.p+.s,.h+.s{fill:currentColor;opacity:.16}
.l{fill:none;stroke:currentColor;stroke-width:2.3;stroke-linejoin:round;stroke-linecap:round}
.l.t{stroke-width:2.9}.l.n{stroke-width:1.9}
.d{fill:currentColor}
.w{fill:none;stroke:var(--sk-fxw);stroke-width:1.7;stroke-linecap:round;opacity:.95}
.w2{fill:var(--sk-fxw)}
:host([plain]) .k,:host([plain]) .f{fill:none}:host([plain]) .s,:host([plain]) .w,:host([plain]) .w2{display:none}
.m{transform-box:view-box}
:host([data-play]) .m{animation:sk-ic ${DIP + SP.duration}ms linear var(--dl,0s) both}
@keyframes sk-ic{0%{transform:none;animation-timing-function:ease-out}${(DIP / (DIP + SP.duration) * 100).toFixed(2)}%{transform:var(--f);animation-timing-function:${SP.easing}}100%{transform:none}}
@media (prefers-reduced-motion:reduce){:host([data-play]) .m{animation:none}}`;
  static template = `<svg viewBox="0 0 24 24" part="base"></svg>`;
  setup() {
    this.svg = this.$('svg');
    this.addEventListener('pointerenter', () => { if (!this.still) this.play(); });
  }
  connected() {
    // inside a button or a link, the whole control plays the icon, not just the few pixels of the drawing
    const host = this.parentElement && this.parentElement.closest('sk-button, button, a, [role=button], sk-badge');
    if (host && host !== this._host) {
      this._host = host; this._hit = () => { if (!this.still) this.play(); };
      host.addEventListener('pointerenter', this._hit); host.addEventListener('click', this._hit);
    }
  }
  disconnected() { if (this._host) { this._host.removeEventListener('pointerenter', this._hit); this._host.removeEventListener('click', this._hit); this._host = null; } clearTimeout(this._t); }
  sync() {
    this.svg.innerHTML = ICONS[this.name] || ICONS.star;
    if (this.size) this.style.width = this.style.height = this.size + 'px';
    if (this.label) { this.setAttribute('role', 'img'); this.setAttribute('aria-label', this.label); } else this.setAttribute('aria-hidden', 'true');
  }
  /* every moving part dips into its pose (70 ms), then springs back */
  play() {
    if (level() === 0) return;
    this.removeAttribute('data-play'); void this.svg.getBoundingClientRect();   // restart if it is already playing
    this.toggleAttribute('data-play', true);
    clearTimeout(this._t); this._t = setTimeout(() => this.removeAttribute('data-play'), 1100);
  }
}
define('sk-icon', SkIcon);
