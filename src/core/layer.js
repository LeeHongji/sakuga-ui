/* The top layer. Dialogs, popups, toasts, the effect canvases and the lettering are shown through the Popover API,
   so they sit above the page whatever z-index, overflow, transform or isolation their ancestors have.
   Browsers without the Popover API fall back to fixed positioning with a very high z-index. */
import { clamp } from './util.js';

const CAN = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
// undoes the browser's default popover box; prepend to the inline style of anything that gets lifted
export const BARE = 'margin:0;border:0;padding:0;background:none;overflow:visible;color:inherit;';
const crown = [];   // [rank, element]: layers that stay above whatever opens later (toasts, effect canvases, lettering)
const shown = el => { try { return el.matches(':popover-open'); } catch (e) { return false; } };

// put an element in the top layer, or back on top of it. Crowned layers above it are re-stacked afterwards.
export function lift(el) {
  if (!CAN || !el.isConnected) return false;
  if (el.getAttribute('popover') !== 'manual') el.setAttribute('popover', 'manual');
  if (shown(el)) el.hidePopover();
  el.showPopover();
  const mine = crown.find(c => c[1] === el), rank = mine ? mine[0] : -1;
  for (const [r, c] of crown) if (r > rank && c.isConnected && shown(c)) { c.hidePopover(); c.showPopover(); }
  return true;
}
export function lower(el) { if (CAN && el.isConnected && shown(el)) el.hidePopover(); }
export function crownLayer(el, rank) { crown.push([rank, el]); crown.sort((a, b) => a[0] - b[0]); return el; }

/* Keep a popup beside its anchor, in viewport coordinates. It flips when there is no room on the wanted side, shifts
   to stay on screen, and follows scrolling and resizing until the returned function is called.
   o: { side: 'bottom' | 'top', align: 'start' | 'end' | 'center' | 'stretch', gap, max (px: tallest it may get) } */
export function anchor(pop, ref, o = {}) {
  const pad = 8, gap = o.gap == null ? 8 : o.gap, want = o.side || 'bottom';
  const fit = () => {
    const a = ref.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = innerHeight;
    if (o.align === 'stretch') pop.style.width = a.width + 'px';
    if (o.max) pop.style.maxHeight = o.max + 'px';
    const w = pop.offsetWidth; let h = pop.offsetHeight;
    const below = vh - a.bottom - gap - pad, above = a.top - gap - pad;
    const side = want === 'bottom' ? (h > below && above > below ? 'top' : 'bottom') : (h > above && below > above ? 'bottom' : 'top');
    const room = side === 'bottom' ? below : above;
    if (o.max && h > room) { pop.style.maxHeight = Math.max(96, room) + 'px'; h = pop.offsetHeight; }
    let x = o.align === 'end' ? a.right - w : o.align === 'center' ? a.left + a.width / 2 - w / 2 : a.left;
    x = clamp(x, pad, Math.max(pad, vw - w - pad));
    pop.style.left = x + 'px'; pop.style.top = (side === 'bottom' ? a.bottom + gap : a.top - gap - h) + 'px';
    pop.dataset.side = side;
    pop.style.setProperty('--ax', a.left + a.width / 2 - x + 'px');   // the anchor's centre, for arrows and transform origins
  };
  fit();
  addEventListener('scroll', fit, { capture: true, passive: true });
  addEventListener('resize', fit, { passive: true });
  return () => { removeEventListener('scroll', fit, { capture: true }); removeEventListener('resize', fit); };
}
