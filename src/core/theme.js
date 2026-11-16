/* Theme switching with a circular wipe from the point of interaction (View Transitions when available). */
import { invalidateTheme } from './fx.js';
import { PALETTES } from './palettes.js';

/* Palettes: a named set of colours for both themes. setPalette('shonen'); the default is 'sakuga'. */
export function getPalette() { return document.documentElement.dataset.skPalette || 'sakuga'; }
export function setPalette(name) {
  if (!PALETTES[name]) name = 'sakuga';
  if (name === 'sakuga') delete document.documentElement.dataset.skPalette; else document.documentElement.dataset.skPalette = name;
  invalidateTheme();
  document.dispatchEvent(new CustomEvent('sk-palettechange', { detail: { palette: name } }));
  return name;
}
export function getTheme() { return document.documentElement.dataset.skTheme === 'dark' ? 'dark' : 'light'; }
export function setTheme(theme, origin) {
  const apply = () => {
    if (theme === 'dark') document.documentElement.dataset.skTheme = 'dark'; else delete document.documentElement.dataset.skTheme;
    invalidateTheme();
    document.dispatchEvent(new CustomEvent('sk-themechange', { detail: { theme } }));
  };
  if (!origin || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
  const { x, y } = origin;
  document.startViewTransition(apply).ready.then(() => {
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 560, easing: 'cubic-bezier(.3,.7,.2,1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
}
