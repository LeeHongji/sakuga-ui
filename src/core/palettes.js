/* Colour palettes. Each one is a full set of the --sk-* colour tokens, for the light and the dark theme.
   Roles: ink (outline and text), paper / surface (backgrounds), peri (primary fill; ink text sits on it), deep (its
   darker step), lav (hard shadows and tints), violet (accent text and lines), pink (the hot accent), off (unlit
   controls), muted (quiet text, 4.5:1 on paper and surface), fxw / fxs / fxo (effect white, shade and outline),
   on-hot (text and marks on a pink fill, 4.5:1). */
const KEYS = ['paper', 'ink', 'surface', 'violet', 'lav', 'peri', 'deep', 'pink', 'off', 'muted', 'fxw', 'fxs', 'fxo', 'on-hot'];
export const PALETTES = {
  // the reference look: ink violet, periwinkle and hot pink
  sakuga: {
    light: ['#fdfcff', '#1b1642', '#ffffff', '#5a46d8', '#b7abf7', '#8c86ee', '#6a60e2', '#f0449e', '#b9bdd4', '#685b90', '#ffffff', '#b7abf7', '#5a46d8', '#1b1642'],
    dark: ['#14112a', '#eee9ff', '#241f49', '#a698ff', '#4b3fa8', '#6058d0', '#5a50d6', '#ff5fb0', '#3b3668', '#9b90cc', '#f6f3ff', '#9e92f0', '#3a2f9c', '#14112a'],
  },
  // weekly-magazine red and yellow on warm paper
  shonen: {
    light: ['#fffaf0', '#1c1714', '#ffffff', '#c2410c', '#ffc9a3', '#ffc533', '#f2a100', '#e11d2e', '#d3cbbb', '#6d6053', '#ffffff', '#ffd9a8', '#c2410c', '#ffffff'],
    dark: ['#17120e', '#fff3e0', '#2a211a', '#ffb066', '#7a4420', '#b45309', '#92400e', '#ef3b4a', '#473b30', '#a39280', '#fff7ea', '#e8a56e', '#7c2d12', '#17120e'],
  },
  // mint soda and coral
  soda: {
    light: ['#f5fffd', '#0f2f38', '#ffffff', '#0d7f80', '#a5ebe0', '#55d6c8', '#2bb5a8', '#f0506e', '#c2d6d6', '#486f6f', '#ffffff', '#a5ebe0', '#0d7f80', '#062026'],
    dark: ['#0b1f24', '#e4fffb', '#14333b', '#6fe3d6', '#1d6660', '#087e74', '#0b6f67', '#f25673', '#2a4a50', '#74a3a3', '#f0fffd', '#7fd6cb', '#145f5b', '#0b1f24'],
  },
  // evening orange over indigo ink
  sunset: {
    light: ['#fff8f0', '#2b1b4a', '#ffffff', '#c2500a', '#ffd0a6', '#ffab52', '#f58a1f', '#d6336c', '#dacfc3', '#735f50', '#ffffff', '#ffd0a6', '#c2500a', '#ffffff'],
    dark: ['#1b1130', '#fff0de', '#2b1d47', '#ffad5c', '#7a3d1c', '#b34b08', '#9c4508', '#e64980', '#44345e', '#a68fb0', '#fff6ea', '#f0b07a', '#8a3d0c', '#1b1130'],
  },
  // black and white manga page with one spot of red
  mono: {
    light: ['#fafafa', '#141414', '#ffffff', '#3d3d3d', '#c8c8c8', '#d9d9d9', '#b0b0b0', '#e11d48', '#d4d4d4', '#626262', '#ffffff', '#cfcfcf', '#3d3d3d', '#ffffff'],
    dark: ['#0f0f0f', '#f2f2f2', '#1d1d1d', '#cfcfcf', '#4d4d4d', '#5c5c5c', '#474747', '#ff3d63', '#343434', '#8c8c8c', '#f5f5f5', '#9c9c9c', '#2a2a2a', '#0f0f0f'],
  },
};
// tokens only some palettes set; the components fall back to their own colour (the theme switch's sun and moon)
const EXTRA = { mono: '--sk-sun:#d9d9d9;--sk-moon:#f5f5f5' };
const vars = a => KEYS.map((k, i) => `--sk-${k}:${a[i]}`).join(';');
// CSS for every palette except the default one, which tokens.js writes on :root itself
export const PALETTE_CSS = Object.entries(PALETTES).filter(([n]) => n !== 'sakuga').map(([n, p]) =>
  `:root[data-sk-palette="${n}"]{${vars(p.light)}${EXTRA[n] ? ';' + EXTRA[n] : ''}}\n:root[data-sk-palette="${n}"][data-sk-theme="dark"]{${vars(p.dark)}}`).join('\n');
export const paletteNames = Object.keys(PALETTES);
