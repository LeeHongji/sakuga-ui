// Small pieces of markup and CSS reused by several components.
/* Move a selection indicator from [a, wa] to [b, wb] (px): the leading edge goes first and stops at the destination,
   the tail catches up, with a small squash against the far side. It never leaves the span between the two ends. */
export function slide(play, ind, a, wa, b, wb) {
  const right = b > a, w = Math.min(right ? b + wb - a : a + wa - b, wb * 1.35);
  return play(ind, [
    { left: a + 'px', width: wa + 'px' },
    { left: (right ? b + wb - w : b) + 'px', width: w + 'px', offset: 0.45 },
    { left: (right ? b + wb * 0.08 : b) + 'px', width: wb * 0.92 + 'px', offset: 0.75 },
    { left: b + 'px', width: wb + 'px' },
  ], { duration: 260, easing: 'cubic-bezier(.3,.7,.3,1)' });
}
export const CHECK = '<svg class="chk" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13l6 6L21 5"/></svg>';
export const CHECK_CSS = `.chk{width:0;height:1em;flex:none;margin-left:calc(var(--gp,8px)*-1);overflow:visible;transition:width .22s cubic-bezier(.3,1.9,.5,1),margin .22s cubic-bezier(.3,1.9,.5,1)}
.chk path{fill:none;stroke:var(--sk-pink);stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:30;stroke-dashoffset:30;transition:stroke-dashoffset .16s .06s}`;
export const X_ICON = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
export const CHEVRON = '<svg class="chev" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const HEART = 'M12 21C5 15 2.5 11.5 2.5 8A5 5 0 0 1 12 5.6 5 5 0 0 1 21.5 8c0 3.5-2.5 7-9.5 13z';
export const STAR = 'M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4 5.9 20.8l1.4-6.8L2.2 9.3l6.9-.8z';
// comet spinner: pure CSS, stepped rotation, so any number of them cost nothing on the main thread
export const SPIN = '<span class="spin" aria-hidden="true"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i><i style="--i:5"></i></span>';
export const SPIN_CSS = `.spin{position:relative;display:inline-block;width:1.05em;height:1.05em;flex:none;animation:sk-spin .72s steps(12) infinite}
.spin i{position:absolute;left:50%;top:50%;width:34%;height:34%;margin:-17% 0 0 -17%;border-radius:50%;background:var(--sk-peri);transform:rotate(calc(var(--i)*-34deg)) translateY(-118%) scale(calc(1 - var(--i)*.14))}
.spin i:first-child{background:currentColor}
@keyframes sk-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spin{animation-duration:2.4s}}`;
// number roll shared by like, stepper, badge, pagination
export function roll(box, val, dir = 1) {
  const old = box.lastElementChild, nu = document.createElement('b');
  nu.textContent = val; box.appendChild(nu);
  if (!old || !old.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { old && old.remove(); return; }
  old.animate([{ translate: '0 0' }, { translate: `0 ${-115 * dir}%` }], { duration: 150, easing: 'ease-in', fill: 'forwards' }).onfinish = () => old.remove();
  nu.animate([{ translate: `0 ${115 * dir}%`, scale: '1 1.5' }, { translate: `0 ${-8 * dir}%`, scale: '1.1 .85', offset: 0.6 }, { translate: '0 0', scale: '1 1' }], { duration: 250 });
}
export const ROLL_CSS = `.roll{display:inline-grid;overflow:hidden;font-variant-numeric:tabular-nums}.roll b{grid-area:1/1;font-weight:inherit}`;
