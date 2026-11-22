// Small pieces of markup and CSS reused by several components.
/* ---------- elastic bodies ----------
   One model for everything that travels and deforms (the slider knob, the segmented and tabs markers, the theme orb).
   Where the body is and what shape it has are two springs. The position spring carries it; a softer, springier "jelly"
   spring holds its shape. Speed pulls the shape long (volume kept, so it also gets thinner); when the speed goes the
   jelly overshoots into a squash and wobbles out; only a real hit on a wall adds a kick. The shape is drawn by changing
   the size, never with scale(), so the ink outline keeps one width (rule 1). Everything is stepped at 240 Hz. */
export const DT = 1 / 240;
const JW = 38, JZ = 0.3;                                       // jelly: about six wobbles a second, two of them visible
export const jelly = () => ({ e: 0, v: 0 });
export function jellyStep(j, target, dt = DT) { j.v += (JW * JW * (target - j.e) - 2 * JZ * JW * j.v) * dt; j.e += j.v * dt; }
// stretch from speed: nothing while slow, then up to +0.6 once the body covers `ref` of its own widths a second
export const stretchOf = (speed, ref) => 0.6 * Math.tanh((speed / ref) ** 2);
// the drawn shape: long side and short side as factors of the rest size. Soft limits, so big numbers never look broken
export function shapeOf(e) { const s = 1 + (e > 0 ? 0.75 * Math.tanh(e / 0.75) : -0.3 * Math.tanh(-e / 0.3)); return [s, 1 / Math.sqrt(s)]; }

/* A body of size D thrown `dist` px into a wall: it accelerates on a spring aimed past the wall, stretches with its
   speed, stops dead on the wall (the speed goes into the jelly as a squash) and wobbles out. Returns 60 fps samples
   { x, sx, sy }, x counted back from the wall (it starts at -dist), and the moment of the hit in ms. */
export function slam(dist, D, ref = 12) {
  const W = 22, Z = 0.9, j = jelly(), out = [];
  let x = -dist, v = 0, t = 0, n = 0, hit = 0, stuck = false;
  for (;;) {
    if (!stuck) {
      v += (W * W * (dist * 0.4 - x) - 2 * Z * W * v) * DT; x += v * DT;
      if (x >= 0) { x = 0; stuck = true; hit = t; j.v -= Math.min(22, (v / D) * 0.45); v = 0; }
    }
    jellyStep(j, stretchOf(Math.abs(v) / D, ref)); t += DT;
    if (t < n / 60) continue;
    const [sx, sy] = shapeOf(j.e); out.push({ x, sx, sy }); n++;
    if ((stuck && Math.abs(j.e) < 0.004 && Math.abs(j.v) < 0.05) || t > 1) break;
  }
  out.push({ x: 0, sx: 1, sy: 1 });
  return { frames: out, hit: Math.round(hit * 1000) };
}

/* Move a selection marker from [a, wa] to [b, wb] (px). Its front edge rides a quick spring to the new place; its
   length is the jelly: pulled long and thin by the speed, then, as the front stops, the back runs on into a short fat
   squash, one small rebound, rest. Baked to keyframes at 60 fps. Returns the moment of the squash in ms. */
export function slide(play, ind, a, wa, b, wb) {
  const d = b > a ? 1 : -1, F0 = d > 0 ? a + wa : a, F1 = d > 0 ? b + wb : b, span = Math.abs(F1 - F0) || 1;
  const top0 = ind.offsetTop, H0 = ind.offsetHeight, bw = 2 * (parseFloat(getComputedStyle(ind).borderTopWidth) || 0), W = 26, Z = 0.85, j = jelly(), frames = [];
  let F = F0, v = 0, t = 0, n = 0, hit = 0, low = 1;
  for (;;) {
    const L0 = wa + (wb - wa) * Math.min(1, Math.max(0, (F - F0) * d / span));     // its own length grows over the trip
    v += (W * W * (F1 - F) - 2 * Z * W * v) * DT; F += v * DT;
    jellyStep(j, stretchOf(Math.abs(v) / L0, 13)); t += DT;
    if (t < n / 60) continue;
    const [sx, sy] = shapeOf(j.e), L = L0 * sx, h = bw + (H0 - bw) * sy;     // the fill thins and fattens, the outline stays
    if (sx < low) { low = sx; hit = t; }
    frames.push({ left: (d > 0 ? F - L : F) + 'px', width: L + 'px', top: top0 + (H0 - h) / 2 + 'px', height: h + 'px' });
    n++;
    if ((t > 0.15 && Math.abs(F - F1) < 0.3 && Math.abs(v) < 4 && Math.abs(j.e) < 0.004 && Math.abs(j.v) < 0.05) || t > 1) break;
  }
  frames.push({ left: b + 'px', width: wb + 'px', top: top0 + 'px', height: H0 + 'px' });
  play(ind, frames, { duration: (frames.length - 1) * 1000 / 60, easing: 'linear' });
  return Math.round(hit * 1000);
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
