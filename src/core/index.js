/* The shared core. Components import from here; applications can too. */
export { config, configure, onConfig, level, reduced } from './config.js';
export * as FX from './fx.js';
export * as SND from './sound.js';
export { sfx, compose, VOICES, loadFaces, DOTS } from './lettering.js';
export { anim, play, spring, shake, zipIn, zipOut } from './motion.js';
export { SPRINGS } from './spring.js';
export * as moves from './moves.js';
export { SkElement, define, css, html } from './element.js';
export { setTheme, getTheme, setPalette, getPalette } from './theme.js';
export { PALETTES } from './palettes.js';
export { TOKENS } from './tokens.js';
export { tone, tonePattern, TONES } from './tone.js';
export { lift, lower, anchor, crownLayer, BARE } from './layer.js';
export * from './util.js';
