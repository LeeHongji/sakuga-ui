/* Sakuga lettering: katakana sound-effect words (kakimoji) as clean vector type.
   Each sound has a "voice": a Japanese display face, a layer stack (hard shadow, paper keyline,
   ink edge, fill) and its own per-character layout and entrance. No noise filters anywhere. */
import { config, level } from './config.js';
import { newR } from './util.js';
import { word } from './sound.js';
import { lift, lower, crownLayer, BARE } from './layer.js';

const NS = 'http://www.w3.org/2000/svg';
const FALLBACK = ',"Hiragino Sans","Hiragino Kaku Gothic StdN","Yu Gothic","Noto Sans JP",sans-serif';
const FACE = { sharp: '"Chokokutai","Reggae One"', edge: '"Reggae One"', heavy: '"Dela Gothic One"', pop: '"Mochiy Pop One"', brush: '"Potta One"', thin: '"Stick"' };
export const VOICES = {
  // heavy hit: ドン! ガッ ジャーン!
  impact: { font: FACE.sharp, fill: 'ink', edge: 0.075, edgeColor: 'ink', key: 0.05, shadow: ['lav', 0.014, 0.017], skew: -17, rot: -9, grow: 0.2, rise: 0.05, jit: 2.5, sp: 0.94, streak: 1, enter: 'slam', bang: 1.18 },
  // blade: ズバッ ザンッ!
  cut: { font: FACE.heavy, fill: 'tone', edge: 0.055, edgeColor: 'ink', key: 0.045, extrude: ['ink', 4, -0.018, 0.013], skew: -16, rot: -16, grow: 0.22, rise: 0.04, jit: 2, sp: 0.75, streak: 0.55, enter: 'slam', bang: 1.15 },
  // crisp mechanical: カチッ!
  click: { font: FACE.edge, fill: 'pink', edge: 0.045, edgeColor: 'ink', key: 0.05, skew: -12, rot: -15, grow: -0.1, rise: 0.05, jit: 3, sp: 0.94, enter: 'pop', bang: 1.0, bangFont: FACE.pop, marks: 'focus' },
  // fast and light: シュッ スッ
  swish: { font: FACE.edge, fill: 'violet', edge: 0.022, edgeColor: 'violet', key: 0.07, skew: -27, rot: -11, grow: 0.16, rise: 0.04, sp: 1.02, enter: 'zip', exit: 'fly', marks: 'speed' },
  // round and bouncy: ポン! ドキッ ピョン
  pop: { font: FACE.pop, fill: 'pink', edge: 0.065, edgeColor: 'ink', key: 0.055, shadow: ['lav', 0.06, 0.075], skew: -5, rot: -8, grow: 0.12, rise: 0.02, jit: 7, sp: 1.05, enter: 'pop', bang: 1.2, round: 1, hop: 0.1 },
  // sparkle: キラッ パァッ!
  shine: { font: FACE.pop, fill: 'pink', edge: 0.065, edgeColor: 'ink', key: 0.055, shadow: ['lav', 0.06, 0.075], skew: -5, rot: -8, grow: 0.12, rise: 0.02, jit: 6, sp: 1.08, enter: 'pop', bang: 1.2, round: 1, hop: 0.08, marks: 'stars' },
  // deflating: ポフ プスッ シュン
  soft: { font: FACE.brush, fill: 'violet', edge: 0, key: 0.09, skew: -6, rot: -8, grow: -0.2, rise: -0.03, jit: 6, sp: 1.02, enter: 'pop', round: 1 },
  // silence: シーン…
  hush: { font: FACE.thin, fill: 'violet', edge: 0.012, edgeColor: 'violet', key: 0.07, skew: -8, rot: -3, grow: 0, rise: 0, sp: 1.4, enter: 'fade', exit: 'fade' },
  // rumble: ゴゴゴ
  rumble: { font: FACE.heavy, fill: 'ink', edge: 0.02, edgeColor: 'ink', key: 0.08, shadow: ['pink', 0.07, 0.08], skew: -10, rot: -6, grow: 0, rise: 0, sp: 1, enter: 'slam', tremble: 1 },
  // going round: グルグル
  spin: { font: FACE.pop, fill: 'violet', edge: 0.06, edgeColor: 'ink', key: 0.055, skew: 0, rot: -4, grow: 0, rise: 0, sp: 1.04, enter: 'pop', round: 1, arc: 0.24 },
};
const ENTER = {
  /* words arrive small, overshoot and settle, almost together: the reference never builds a word glyph by glyph.
     A word is at full ink from its first frame: it grows into place and leaves by shrinking or thinning, never by fading */
  slam: i => [[{ transform: 'scale(.22)' }, { transform: 'scale(1.2)', offset: 0.52 }, { transform: 'scale(.95)', offset: 0.78 }, { transform: 'none' }], 170, i * 12],
  whole: () => [[{ transform: 'scale(.2)' }, { transform: 'scale(1.14)', offset: 0.6 }, { transform: 'none' }], 120, 0],
  pop: i => [[{ transform: 'translateY(8px) scale(.2)' }, { transform: 'translateY(-6px) scale(1.22)', offset: 0.55 }, { transform: 'translateY(1px) scale(.95)', offset: 0.8 }, { transform: 'none' }], 150, i * 10],
  zip: i => [[{ transform: 'translateX(-46px) scaleX(2.4) scaleY(.5)' }, { transform: 'translateX(5px) scaleX(.9)', offset: 0.7 }, { transform: 'none' }], 130, i * 8],
  // the quiet one: each glyph is set down in turn, whole, and sinks the last few pixels
  fade: i => [[{ transform: 'scale(0)' }, { transform: 'translateY(-5px)', offset: 0.01 }, { transform: 'none' }], 180, i * 40],
};
const EXIT = {
  shrink: [[{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.3 }, { transform: 'scale(.08)' }], 80],
  fly: [[{ transform: 'none' }, { transform: 'translateX(46px) scale(1.5, .04)' }], 130],
  fade: [[{ transform: 'none' }, { transform: 'scale(1.04, .04)' }], 160],
};
const SMALL = 'ッュャョァィゥェォ';
let mctx = null, sfxId = 0;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cv = n => `var(--sk-${n})`;

// build the layered SVG markup for one word. Returns { html, V, w, h } with the word centred on 0,0.
export function compose(text, o = {}) {
  const V = VOICES[o.voice] || VOICES.impact;
  const size = o.size || 60, fam = V.font + FALLBACK, chars = [...text], n = chars.length;
  const fillName = o.color || V.fill, tone = fillName === 'tone', tid = tone ? 'skd' + (++sfxId) : '';
  const fill = tone ? `url(#${tid})` : cv(fillName);
  const edgeC = cv(o.color && V.edgeColor === V.fill ? o.color : V.edgeColor || 'ink');
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  const R = newR();

  // layout
  const lay = []; let x = 0;
  chars.forEach((ch, i) => {
    let f = 1 + (V.grow || 0) * (n > 1 ? i / (n - 1) - 0.5 : 0);
    if (ch === '!') f *= V.bang || 1.15;
    if (ch === '…') f *= 0.72;
    const s = size * f;
    const cf = ch === '!' && V.bangFont ? V.bangFont + FALLBACK : fam;
    mctx.font = `900 ${s}px ${cf}`;
    const adv = mctx.measureText(ch).width * (V.sp || 1) * (o.sp || 1) * (ch === '!' ? 0.82 : 1);
    const small = SMALL.includes(ch);
    lay.push({ ch, s, x, adv, cf, y: -(V.rise || 0) * size * i + (V.hop ? Math.sin(i * 2.3 + 0.6) * V.hop * size : 0) - (small && V.hop ? 0.04 * size : 0), r: (V.jit || 0) * (i % 2 ? 1 : -1) * (0.6 + R() * 0.6) + (ch === '!' ? 9 : 0) });
    x += adv;
  });
  const W = x;

  let h = '';
  lay.forEach((L, i) => {
    const s = L.s, st = `font-family:${L.cf};font-size:${s.toFixed(1)}px`;
    const ew = 2 * (V.edge || 0) * s, kw = 2 * ((V.edge || 0) + (V.key || 0)) * s, c = esc(L.ch);
    let cx = L.x - W / 2, cy = L.y + size * 0.36, rr = L.r;
    if (V.arc) { const a = (i - (n - 1) / 2) * V.arc; rr += (a * 180) / Math.PI; cy += (1 - Math.cos(a)) * size * 2.2; }
    h += `<g class="ch" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${rr.toFixed(1)})"><g class="an">`;
    if (V.shadow) { const sc = cv(o.shadowColor || V.shadow[0]); h += `<text style='${st};fill:${sc};stroke:${sc};stroke-width:${kw.toFixed(1)}px' transform="translate(${(V.shadow[1] * s).toFixed(1)},${(V.shadow[2] * s).toFixed(1)})">${c}</text>`; }
    if (V.extrude) {
      const [ec, en, dx, dy] = V.extrude;
      h += `<text style='${st};fill:${cv('paper')};stroke:${cv('paper')};stroke-width:${kw.toFixed(1)}px' transform="translate(${(en * dx * s).toFixed(1)},${(en * dy * s).toFixed(1)})">${c}</text>`;
    }
    if (V.key) h += `<text style='${st};fill:${cv('paper')};stroke:${cv('paper')};stroke-width:${kw.toFixed(1)}px'>${c}</text>`;
    if (V.extrude) {
      const [ec, en, dx, dy] = V.extrude;
      for (let k = en; k >= 1; k--) h += `<text style='${st};fill:${cv(ec)};stroke:${cv(ec)};stroke-width:${ew.toFixed(1)}px' transform="translate(${(k * dx * s).toFixed(1)},${(k * dy * s).toFixed(1)})">${c}</text>`;
    }
    if (V.edge) h += `<text style='${st};fill:${edgeC};stroke:${edgeC};stroke-width:${ew.toFixed(1)}px'>${c}</text>`;
    h += `<text style='${st};fill:${fill}'>${c}</text>`;
    if (V.streak && L.ch !== '!') {
      // kasure: clean dry-brush hatching at the stroke ends, cut out in paper colour
      const id = 'sk' + (++sfxId), a = L.adv;
      // tapered slivers torn into the stroke ends: wide where the brush lifts off, closing to a point inside the stroke
      let ln = '';
      const wedge = (x0, y0, y1, w) => { ln += `M${(x0 - w).toFixed(1)} ${y0.toFixed(1)}L${(x0 + w).toFixed(1)} ${y0.toFixed(1)}L${(x0 + w * 0.2).toFixed(1)} ${y1.toFixed(1)}Z`; };
      const nb = Math.max(4, Math.round((a / s) * 11 * V.streak));
      for (let k = 0; k < nb; k++) wedge(((k + 0.15 + R() * 0.7) / nb) * a, 0.2 * s, -(0.03 + R() * R() * 0.4) * s, (0.012 + R() * 0.02) * s);
      for (let k = 0, nt = Math.max(2, Math.round(nb * 0.45)); k < nt; k++) wedge(((k + 0.2 + R() * 0.6) / nt) * a, -1.05 * s, -(0.9 - R() * R() * 0.26) * s, (0.01 + R() * 0.016) * s);
      h += `<mask id="${id}" maskUnits="userSpaceOnUse" x="${(-s).toFixed(0)}" y="${(-1.4 * s).toFixed(0)}" width="${(a + 2 * s).toFixed(0)}" height="${(2 * s).toFixed(0)}"><text style='${st};fill:#fff;stroke:#fff;stroke-width:${ew.toFixed(1)}px'>${c}</text></mask>`;
      h += `<path mask="url(#${id})" d="${ln}" style="fill:${cv('paper')}"/>`;
    }
    h += '</g></g>';
  });

  // marks that belong to the voice
  let marks = '';
  const tri = (x0, y0, x1, y1, w, col) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * w, ny = (dx / l) * w; return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)}L${(x1 + nx).toFixed(1)} ${(y1 + ny).toFixed(1)}L${(x1 - nx).toFixed(1)} ${(y1 - ny).toFixed(1)}Z" style="fill:${col}"/>`; };
  if (V.marks === 'focus') {
    for (const side of [-1, 1]) for (const [ang, len] of [[-0.5, 0.46], [-0.05, 0.36]]) {
      const a = side > 0 ? ang : Math.PI - ang, r0 = W / 2 + size * 0.22, r1 = r0 + size * len;
      marks += tri(Math.cos(a) * r1, Math.sin(a) * r1 * 0.9, Math.cos(a) * r0, Math.sin(a) * r0 * 0.9, size * 0.04, cv('violet'));
    }
  } else if (V.marks === 'speed') {
    for (const [yy, len, off] of [[-0.36, 1.0, 0.1], [0.02, 1.5, 0.3], [0.34, 0.8, 0]]) {
      const x1 = -W / 2 - size * (0.1 + off);
      marks += tri(x1 - size * len, yy * size, x1, yy * size, size * 0.035, cv(fillName));
    }
  } else if (V.marks === 'stars') {
    for (const [sx, sy, sr] of [[-W / 2 - size * 0.22, -size * 0.42, size * 0.2], [W / 2 + size * 0.24, size * 0.3, size * 0.15]]) {
      const c = sr * 0.14, w = sr * 0.72;
      marks += `<path transform="translate(${sx.toFixed(1)},${sy.toFixed(1)})" d="M0 ${-sr}Q${c} ${-c} ${w} 0Q${c} ${c} 0 ${sr}Q${-c} ${c} ${-w} 0Q${-c} ${-c} 0 ${-sr}Z" style="fill:${cv('paper')};stroke:${cv(fillName)};stroke-width:${(size * 0.045).toFixed(1)}px;stroke-linejoin:round"/>`;
    }
  }

  // halftone sized to the glyph: a pitch of about 0.085 em, never finer than 3.4 px so it stays dots on a small word
  const pit = Math.max(3.4, size * 0.085), dots = tone ? `<defs><pattern id="${tid}" width="${pit.toFixed(2)}" height="${pit.toFixed(2)}" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><rect width="${pit.toFixed(2)}" height="${pit.toFixed(2)}" style="fill:var(--sk-surface)"/><circle cx="${(pit / 2).toFixed(2)}" cy="${(pit / 2).toFixed(2)}" r="${(pit * 0.2).toFixed(2)}" style="fill:var(--sk-ink)"/></pattern></defs>` : '';
  h = dots + h;
  return { V, w: W + size * 1.2, h: size * 1.9, html: `<g transform="rotate(${o.rot == null ? V.rot : o.rot}) skewX(${o.skew == null ? V.skew : o.skew})">${marks ? `<g class="mk">${marks}</g>` : ''}${h}</g>` };
}

function place(text, o) {
  const layer = ensureLayer();
  while (layer.childElementCount > config.maxWords) layer.children[1].remove();   // child 0 holds the shared <defs>
  const { V, html } = compose(text, o);
  const lb = layer.getBoundingClientRect();
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'sk-w' + (V.round ? ' round' : ''));
  svg.style.left = o.x - lb.left - scrollX + 'px'; svg.style.top = o.y - lb.top - scrollY + 'px';
  svg.innerHTML = html;
  if (layer.childElementCount === 1) lift(layer);
  layer.appendChild(svg);
  // a word whose anchor is on screen is nudged in from any viewport edge it would cross, so it is never cut off
  const vw = document.documentElement.clientWidth, vh = innerHeight, ax = o.x - scrollX, ay = o.y - scrollY;
  if (ax > -24 && ay > -24 && ax < vw + 24 && ay < vh + 24) {
    const b = svg.getBBox(), m = 14;   // room for the outline and the drop shadow, which the box leaves out
    const dx = Math.max(0, m - ax - b.x) - Math.max(0, ax + b.x + b.width + m - vw);
    const dy = Math.max(0, m - ay - b.y) - Math.max(0, ay + b.y + b.height + m - vh);
    if (dx) svg.style.left = parseFloat(svg.style.left) + dx + 'px';
    if (dy) svg.style.top = parseFloat(svg.style.top) + dy + 'px';
  }

  let total = 0;
  svg.querySelectorAll('.an').forEach((el, i) => {
    let [kf, dur, delay] = ENTER[o.enter || V.enter || 'slam'](i);
    if (o.enterMs) dur = o.enterMs;
    if (o.stagger != null) delay = i * o.stagger;
    el.animate(kf, { duration: dur, delay, fill: 'backwards', easing: 'linear' });
    total = Math.max(total, dur + delay);
    if (V.tremble) el.animate([{ translate: '0 0' }, { translate: '-1px .8px' }, { translate: '1px -1px' }, { translate: '-.8px 1px' }, { translate: '0 0' }], { duration: 170, iterations: Infinity, easing: 'steps(4, end)' });
  });
  const mk = svg.querySelector('.mk');
  if (mk) mk.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.1)', offset: 0.6 }, { transform: 'none' }], { duration: 200, delay: V.marks === 'speed' ? 0 : total * 0.5, fill: 'backwards' });
  const hold = o.hold == null ? 700 : o.hold;
  if (hold !== Infinity) {
    setTimeout(() => {
      const [kf, dur] = EXIT[V.exit || 'shrink'];
      if (V.tremble) svg.querySelectorAll('.an').forEach(el => el.getAnimations().forEach(x => x.effect.getComputedTiming().iterations === Infinity && x.cancel()));
      svg.animate(kf, { duration: o.exitMs || dur, easing: 'ease-in', fill: 'forwards' }).onfinish = () => { svg.remove(); if (layer.childElementCount === 1) lower(layer); };
    }, total + hold);
  }
  return svg;
}
/* say a sound-effect word at page position (x, y): lettering plus its sound.
   o: { voice, x, y, size, color, rot, hold (ms), delay (s), silent, sp (spacing), enter, enterMs, stagger (ms per glyph), exitMs } */
export function sfx(text, o = {}) {
  // the returned handle takes the word away early: cancel(ms) shrinks it away in ms (default 60)
  const h = { el: null, gone: false, cancel(ms = 60) {
    this.gone = true; const el = this.el;
    if (el && el.isConnected) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.06)' }], { duration: ms, easing: 'ease-in', fill: 'forwards' }).onfinish = () => { el.remove(); if (layerEl && layerEl.childElementCount === 1) lower(layerEl); };
  } };
  const go = () => {
    if (h.gone) return;
    if (!o.silent) word(text, o);
    if (level() > 0 && config.lettering && !document.hidden) h.el = place(text, o);
  };
  o.delay ? setTimeout(go, o.delay * 1000) : go();
  return h;
}

const STYLE = `.sk-w{position:absolute;width:1px;height:1px;overflow:visible;transform-origin:0 0}
.sk-w text{font-weight:900;font-synthesis:none;stroke-linejoin:miter;stroke-miterlimit:2.6}
.sk-w.round text{stroke-linejoin:round}
.sk-w .an,.sk-w .mk{transform-box:fill-box;transform-origin:50% 60%}`;
export const DOTS = `<pattern id="sk-dots" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><rect width="6" height="6" style="fill:var(--sk-surface)"/><circle cx="3" cy="3" r="1.35" style="fill:var(--sk-ink)"/></pattern>`;
let layerEl = null;
function ensureLayer() {
  if (layerEl && layerEl.isConnected) return layerEl;
  layerEl = document.createElement('div');
  layerEl.setAttribute('aria-hidden', 'true');
  layerEl.style.cssText = BARE + 'position:absolute;inset:0 auto auto 0;display:block;width:0;height:0;pointer-events:none;z-index:2147483001';
  layerEl.innerHTML = `<svg width="0" height="0" style="position:absolute"><style>${STYLE}</style><defs>${DOTS}</defs></svg>`;
  document.body.appendChild(layerEl);
  crownLayer(layerEl, 4);
  loadFaces();
  return layerEl;
}

// the display faces. With fonts:'google' the stylesheet is injected once, on first use or on preload()
const GOOGLE = 'https://fonts.googleapis.com/css2?family=Chokokutai&family=Reggae+One&family=Dela+Gothic+One&family=Mochiy+Pop+One&family=Potta+One&family=Stick&display=swap';
let faces = null;
export function loadFaces() {
  if (faces) return faces;
  if (config.fonts === 'google' && !document.querySelector('link[data-sk-fonts]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = GOOGLE; l.dataset.skFonts = '';
    document.head.appendChild(l);
  }
  const all = 'ドンズバッカチシュゴポキラパァジャザガフプスピョタグルーブペメホヒオダ!…';
  faces = document.fonts && document.fonts.load
    ? new Promise(res => setTimeout(res, 60)).then(() => Promise.all(Object.values(FACE).flatMap(f => f.split(',').map(one => document.fonts.load(`40px ${one}`, all).catch(() => {})))))
    : Promise.resolve();
  return faces;
}
