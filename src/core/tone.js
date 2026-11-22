/* Screentone: the greys of a manga page. A tone is one repeating tile of flat marks, never a transparent grey.

     tone('dots', { pct: 30 }).css     CSS declarations that paint an element (a layer of its own) with the tone in --sk-ink
     tone('dots', { pct: 30 }).url     the tile as a CSS image, for use as a background in a literal colour
     tonePattern('t1', 'dots', {...})  the tile as an SVG <pattern>, for fills inside inline SVG

   Kinds, with the name each has on the drawing board:
     dots     アミ          round dots on a 45° grid. pitch stays; pct (area covered, 5 to 70) changes the dot size only
     grad     グラデトーン  the same grid with the dot size running from `from` to `to` per cent across `len` px
     lines    万線          evenly ruled lines; pct sets their weight, angle is 0, 45, 90 or 135
     hatch    カケアミ      ruled layers crossing at 45°, 135°, 0° and 90°; level 1 to 4 is how many are laid
     rope     ナワアミ      patches of short strokes, each patch turned against its neighbours: unease
     sand     砂目          irregular specks with no grid, so it never makes moiré: rough surfaces
     stipple  点描          hand-placed dots thinning out across `len` px: softness, a floating feeling
     sparkle  キラキラ      scattered four-point stars: glamour
     bubble   シャボン      hollow circles: daydream */
import { rng } from './util.js';

const f = v => +v.toFixed(2);
const dot = (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" stroke="none"/>`;
const line = (d, w) => `<path d="${d}" fill="none" stroke-width="${f(w)}"/>`;
// repeat a mark across the tile edges it touches, so the tile joins up with its neighbours
function wrap(x, y, r, W, H, draw) {
  let out = '';
  for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) if (x + dx + r > 0 && x + dx - r < W && y + dy + r > 0 && y + dy - r < H) out += draw(x + dx, y + dy);
  return out;
}
const radius = (pitch, pct) => pitch * Math.sqrt(Math.max(0, pct) / 100 / Math.PI);
const DIAG = s => `M${f(-s / 4)} ${f(s / 4)}L${f(s / 4)} ${f(-s / 4)}M0 ${f(s)}L${f(s)} 0M${f(s * 0.75)} ${f(s * 1.25)}L${f(s * 1.25)} ${f(s * 0.75)}`;      // 45°, rising
const BACK = s => `M${f(-s / 4)} ${f(s * 0.75)}L${f(s / 4)} ${f(s * 1.25)}M0 0L${f(s)} ${f(s)}M${f(s * 0.75)} ${f(-s / 4)}L${f(s * 1.25)} ${f(s / 4)}`;      // 135°, falling

const KINDS = {
  dots(o) {
    const p = o.pitch || 6, s = p * Math.SQRT2, r = radius(p, o.pct == null ? 30 : o.pct);
    return { w: s, h: s, body: [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s / 2]].map(([x, y]) => dot(x, y, r)).join('') };
  },
  grad(o) {
    const p = o.pitch || 6, s = p * Math.SQRT2, len = o.len || 160, from = o.from == null ? 50 : o.from, to = o.to == null ? 0 : o.to; let body = '';
    for (let i = 0; i * s / 2 <= len + s; i++) {
      const x = (i * s) / 2, r = radius(p, from + (to - from) * Math.min(1, x / len)); if (r < 0.25) continue;
      body += i % 2 ? dot(x, s / 2, r) : dot(x, 0, r) + dot(x, s, r);
    }
    return { w: len, h: s, repeat: 'repeat-y', body };
  },
  lines(o) {
    const p = o.pitch || 5, w = (p * (o.pct == null ? 30 : o.pct)) / 100, ang = o.angle == null ? 45 : o.angle;
    if (ang === 0) return { w: p, h: p, body: line(`M0 ${f(p / 2)}H${p}`, w) };
    if (ang === 90) return { w: p, h: p, body: line(`M${f(p / 2)} 0V${p}`, w) };
    const s = p * Math.SQRT2;
    return { w: s, h: s, body: line(ang === 135 ? BACK(s) : DIAG(s), w) };
  },
  hatch(o) {
    const p = o.pitch || 5, s = p * Math.SQRT2, w = o.weight || 1.1, n = Math.max(1, Math.min(4, o.level || 2));
    return { w: s, h: s, body: [DIAG(s), BACK(s), `M0 ${f(s / 2)}H${f(s)}`, `M${f(s / 2)} 0V${f(s)}`].slice(0, n).map(d => line(d, w)).join('') };
  },
  rope(o) {
    const T = 72, cell = T / 4, R = rng(o.seed || 7), w = o.weight || 1.1; let body = '';
    for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
      // neighbours turn against each other: every other patch starts a quarter turn round
      const cx = (gx + 0.5) * cell + (R() - 0.5) * 5, cy = (gy + 0.5) * cell + (R() - 0.5) * 5, a = ((gx + gy) % 2 ? Math.PI / 2 : 0) + (R() - 0.5) * 1.1, c = Math.cos(a), s = Math.sin(a), half = cell * 0.52;
      for (let k = -2; k <= 2; k++) {
        const ox = -s * k * 3.3, oy = c * k * 3.3, l = half * (0.75 + R() * 0.3);
        body += wrap(cx + ox, cy + oy, l, T, T, (x, y) => line(`M${f(x - c * l)} ${f(y - s * l)}L${f(x + c * l)} ${f(y + s * l)}`, w));
      }
    }
    return { w: T, h: T, body };
  },
  sand(o) {
    const T = 48, R = rng(o.seed || 11), pct = o.pct == null ? 20 : o.pct, n = Math.round(((pct / 100) * T * T) / (Math.PI * 0.72)); let body = '';
    for (let i = 0; i < n; i++) { const r = 0.45 + R() * 0.8; body += wrap(R() * T, R() * T, r, T, T, (x, y) => dot(x, y, r)); }
    return { w: T, h: T, body };
  },
  stipple(o) {
    const len = o.len || 160, H = 48, R = rng(o.seed || 5), n = o.n || Math.round(len * 1.7), fall = o.falloff || 2.2; let body = '';
    for (let i = 0; i < n; i++) { const x = len * Math.pow(R(), fall), y = R() * H, r = 0.6 + R() * 0.5; body += wrap(x, y, r, len * 3, H, (px, py) => dot(px, py, r)); }
    return { w: len, h: H, repeat: 'repeat-y', body };
  },
  sparkle(o) {
    const T = 60, R = rng(o.seed || 3), star = (x, y, s) => { const c = s * 0.16; return `<path stroke="none" d="M${f(x)} ${f(y - s)}Q${f(x + c)} ${f(y - c)} ${f(x + s * 0.72)} ${f(y)}Q${f(x + c)} ${f(y + c)} ${f(x)} ${f(y + s)}Q${f(x - c)} ${f(y + c)} ${f(x - s * 0.72)} ${f(y)}Q${f(x - c)} ${f(y - c)} ${f(x)} ${f(y - s)}Z"/>`; };
    let body = '';
    for (const [gx, gy, s] of [[0.2, 0.22, 8], [0.7, 0.14, 4.5], [0.5, 0.56, 6], [0.14, 0.76, 4], [0.84, 0.72, 7]]) { const x = (gx + (R() - 0.5) * 0.08) * T, y = (gy + (R() - 0.5) * 0.08) * T; body += wrap(x, y, s, T, T, (px, py) => star(px, py, s)); }
    for (let i = 0; i < 7; i++) { const r = 0.7 + R() * 0.6; body += wrap(R() * T, R() * T, r, T, T, (x, y) => dot(x, y, r)); }
    return { w: T, h: T, body };
  },
  bubble(o) {
    const T = 68, R = rng(o.seed || 9), w = o.weight || 1.2; let body = '';
    for (const [gx, gy, r] of [[0.24, 0.26, 11], [0.72, 0.2, 6], [0.56, 0.64, 9], [0.16, 0.78, 5], [0.88, 0.8, 7]]) {
      const x = (gx + (R() - 0.5) * 0.06) * T, y = (gy + (R() - 0.5) * 0.06) * T;
      body += wrap(x, y, r + 1, T, T, (px, py) => `<circle cx="${f(px)}" cy="${f(py)}" r="${r}" fill="none" stroke-width="${w}"/>` + line(`M${f(px - r * 0.55)} ${f(py - r * 0.2)}A${f(r * 0.6)} ${f(r * 0.6)} 0 0 1 ${f(px - r * 0.15)} ${f(py - r * 0.58)}`, w));
    }
    for (let i = 0; i < 6; i++) { const r = 0.8 + R() * 0.7; body += wrap(R() * T, R() * T, r, T, T, (x, y) => dot(x, y, r)); }
    return { w: T, h: T, body };
  },
};
export const TONES = Object.keys(KINDS);

const memo = new Map();
export function tone(kind, o = {}) {
  const key = kind + JSON.stringify(o);
  if (memo.has(key)) return memo.get(key);
  const t = (KINDS[kind] || KINDS.dots)(o), w = f(t.w), h = f(t.h), repeat = t.repeat || 'repeat';
  // as a mask the tile is black and the colour comes from background-color, so the tone follows the theme
  const image = color => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g fill="${color}" stroke="${color}" stroke-linecap="round">${t.body}</g></svg>`)}")`;
  const mask = `${image('#000')} 0 0/${w}px ${h}px ${repeat}`;
  const out = { kind, w, h, repeat, body: t.body, url: image(o.color || '#000'), size: `${w}px ${h}px`, css: `background-color:${o.color || 'var(--sk-ink)'};-webkit-mask:${mask};mask:${mask}` };
  memo.set(key, out);
  return out;
}
/* the tile as an SVG pattern, painted in currentColor unless a colour is given */
export function tonePattern(id, kind, o = {}) {
  const t = tone(kind, o), c = o.color || 'currentColor';
  return `<pattern id="${id}" width="${t.w}" height="${t.h}" patternUnits="userSpaceOnUse"><g fill="${c}" stroke="${c}" stroke-linecap="round">${t.body}</g></pattern>`;
}
