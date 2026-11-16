/* 《第 1 话：一按，即原画》 — the Sakuga UI promo film.
   Every component on screen is the real library, imported from ../../src, and every interaction is a real
   pointer event sent by the renderer (tools/render.py). Times are film seconds and come from plan.json.
   The director runs on requestAnimationFrame, which the renderer steps 1/60 s at a time. */
import * as S from '../../src/index.js';

const plan = await (await fetch('../plan.json', { cache: 'no-store' })).json();
const SHOT = Object.fromEntries(plan.shots.map(s => [s.id, s]));
const SP = S.SPRINGS;
const stage = document.getElementById('stage'), tone = document.getElementById('tone');
const W = 960, H = 540;

/* ---------- helpers ---------- */
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const rect = (x) => (x.getBoundingClientRect ? x.getBoundingClientRect() : x);
const centre = (x) => { if (Array.isArray(x)) return x; const r = rect(x); return [r.left + r.width / 2, r.top + r.height / 2]; };
const inner = (host, sel) => host.shadowRoot.querySelector(sel);
const jp = (s) => s;   // marks katakana written into the film by hand (the components letter the rest themselves)

/* ---------- the clock and the cue list ---------- */
const FILM = window.FILM = { T0: null, t: 0, ops: [], cues: [], ready: false };
const now = () => (performance.now() - FILM.T0) / 1000;
function at(t, fn, keep = false) { FILM.cues.push({ t, fn, keep }); FILM.cues.sort((a, b) => a.t - b.t); }
FILM.drain = () => { const o = FILM.ops; FILM.ops = []; return o; };
FILM.flush = () => {};

/* ---------- the cursor: an inked arrow that moves on a damped spring ---------- */
const cur = el(`<div id="cur" popover="manual"><svg width="30" height="36" viewBox="0 0 30 36"><path d="M3 3 L3 29 L10 22.5 L14.5 33 L19.5 30.8 L15 20.6 L24.5 20.2 Z" fill="var(--sk-surface)" stroke="var(--sk-ink)" stroke-width="3" stroke-linejoin="round"/><path d="M6.5 9.5 L6.5 21" stroke="var(--sk-lav)" stroke-width="2.4" stroke-linecap="round"/></svg></div>`);
cur.style.cssText = S.BARE + 'position:fixed;left:0;top:0;inset:0 auto auto 0;width:30px;height:36px;pointer-events:none;transform-origin:3px 3px;opacity:0';
document.body.appendChild(cur);
S.crownLayer(cur, 9);
const C = { x: W + 40, y: H * 0.7, moves: [], shown: false, down: false };
const ease = (u) => { if (u >= 1) return 1; const w = 10, z = 0.72, wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + (z * w / wd) * Math.sin(wd * u)); };
const cursor = {
  // move to an element (its centre, plus an offset) or a point, starting at t, taking dur seconds
  to(target, t, dur = 0.45, dx = 0, dy = 0) { at(t, () => { const [x, y] = centre(typeof target === 'function' ? target() : target); C.moves.push({ t0: t, dur, fx: C.x, fy: C.y, tx: x + dx, ty: y + dy }); }); },
  down(t) { at(t, () => { FILM.ops.push({ k: 'down' }); C.down = true; cur.animate([{ scale: '1' }, { scale: '.8 .86' }], { duration: 60, fill: 'forwards' }); }); },
  up(t) { at(t, () => { FILM.ops.push({ k: 'up' }); C.down = false; cur.animate([{ scale: '.8 .86' }, { scale: '1' }], { duration: SP.bounce.duration, easing: SP.bounce.easing, fill: 'forwards' }); }); },
  // t is when the click event fires (on release): the press goes down 70 ms before; ops reach the page one frame after their cue
  click(t) { this.down(t - 0.087); this.up(t - 0.017); },
  show(t) { at(t, () => { C.shown = true; S.lift(cur); cur.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, fill: 'forwards' }); }); },
  hide(t) { at(t, () => { C.shown = false; cur.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }); }); },
  park(x, y, t) { at(t, () => { C.moves = []; C.x = x; C.y = y; FILM.ops.push({ k: 'move', x, y }); }); },
};
function moveCursor(t) {
  const m = C.moves[0];
  if (!m) return;
  const u = Math.min(1, (t - m.t0) / m.dur), e = ease(u * 1.0);
  C.x = m.fx + (m.tx - m.fx) * e; C.y = m.fy + (m.ty - m.fy) * e;
  if (u >= 1) { C.x = m.tx; C.y = m.ty; C.moves.shift(); }
  FILM.ops.push({ k: 'move', x: +C.x.toFixed(2), y: +C.y.toFixed(2) });
}
function drawCursor() {
  const tilt = -6 + (C.moves[0] ? Math.max(-8, Math.min(8, (C.moves[0].tx - C.moves[0].fx) / 60)) : 0);
  cur.style.translate = `${C.x - 3}px ${C.y - 3}px`;
  cur.style.rotate = `${tilt}deg`;
}

/* ---------- pages and transitions ---------- */
let pages = [];
function page(cls = '', no = '') {
  const p = el(`<section class="pg ${cls}">${no ? `<span class="no">${no}</span>` : ''}</section>`);
  return p;
}
// stepped reveal, drawn on twos: a box wipes open in a few hard steps instead of fading
function reveal(node, t, ms = 200, steps = 4, from = 'inset(0 100% 0 0)') {
  node.style.clipPath = from;
  at(t, () => { node.animate([{ clipPath: from }, { clipPath: 'inset(-20px -20px -20px -20px)' }], { duration: ms, easing: `steps(${steps}, end)`, fill: 'forwards' }); });
}
function slamIn(nodes, t, gap = 0.033) {
  nodes.forEach((n, i) => {
    n.style.opacity = 0;
    at(t + i * gap, () => { n.style.opacity = ''; n.animate([{ transform: 'scale(1.22) rotate(-2.5deg)', opacity: 0 }, { transform: 'scale(1.22) rotate(-2.5deg)', opacity: 1, offset: 0.01 }, { transform: 'none', opacity: 1 }], { duration: SP.bounce.duration, easing: SP.bounce.easing }); });
  });
}
function impact(t) { at(t, () => { stage.style.filter = 'invert(1)'; }); at(t + 2 / 60, () => { stage.style.filter = ''; }); }
// page turn: the old page swings away on its left edge, the new one is already underneath
function turn(old, t, dur = 0.42) {
  at(t, () => {
    old.style.zIndex = 3; old.style.transformOrigin = '0 50%';
    old.animate([{ transform: 'perspective(1500px) rotateY(0deg)', filter: 'brightness(1)' }, { transform: 'perspective(1500px) rotateY(-96deg)', filter: 'brightness(.72)' }], { duration: dur * 1000, easing: 'cubic-bezier(.55,0,.8,.35)', fill: 'forwards' });
    S.SND.play('swish');
  });
}
function screentone(t, swap) {
  at(t, () => { tone.animate([{ '--r': '0px' }, { '--r': '17px' }], { duration: 150, easing: 'steps(4, end)', fill: 'forwards' }); S.SND.play('swish', { small: 1 }); });
  at(t + 0.15, () => swap(), true);
  at(t + 0.15, () => { tone.animate([{ '--r': '17px' }, { '--r': '0px' }], { duration: 170, easing: 'steps(4, end)', fill: 'forwards' }); });
}
function mount(p, t, z = 1) { p.style.visibility = 'hidden'; p.style.zIndex = z; stage.appendChild(p); pages.push(p); at(t, () => { p.style.visibility = ''; }, true); return p; }
function drop(p, t) { at(t, () => { p.remove(); pages = pages.filter(x => x !== p); }, true); }
function title(p, x, y, en, zh, t, w) {
  const b = el(`<div class="ttl" style="left:${x}px;top:${y}px;${w ? `width:${w}px` : ''}"><b class="en">${en}</b><span class="zh">${zh}</span></div>`);
  p.appendChild(b); if (t != null) reveal(b, t, 200, 4); return b;
}
function caption(p, x, y, html, t, w) {
  const b = el(`<div class="cap" style="left:${x}px;top:${y}px;${w ? `width:${w}px` : ''}">${html}</div>`);
  p.appendChild(b); if (t != null) reveal(b, t, 160, 4); return b;
}
function koma(p, x, y, w, h, label = '', cls = '', inside = '') {
  const k = el(`<div class="koma ${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${inside}${label ? `<span class="lbl">${label.replace(/</g, '&lt;')}</span>` : ''}</div>`);
  p.appendChild(k); return k;
}
function starburst(n, r1, r2, jag = 0.18) {
  let d = '';
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 * (1 - jag * ((i * 7) % 3) / 2) : r1 * (1 - jag * ((i * 5) % 4) / 3); d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; }
  return d + 'Z';
}
const reset = () => { S.setPalette('sakuga'); S.setTheme('light'); };

/* ================= 1 · cover ================= */
function cover() {
  const s = SHOT.cover, p = mount(page('cover', ''), s.start, 1);
  p.innerHTML += `<div class="rays"></div>
  <div class="bar"><span class="c">COMICS</span><span class="zh">创刊号</span><span>NO.01</span><span>2026.11</span><span class="sp"></span><span>¥0 · MIT</span></div>
  <div class="kick">WEB COMPONENTS · <span>零依赖</span> · MIT</div>
  <div class="logo">SAKUGA <b>UI</b></div>
  <div class="ep">一按，即原画。</div>
  <div class="say"><b>每按一下，都是一格原画。</b><span>EVERY PRESS IS A KEY FRAME</span></div>
  <svg class="burst" style="left:700px;top:342px" width="1" height="1"><path d="${starburst(18, 124, 74)}" fill="var(--sk-surface)" stroke="var(--sk-ink)" stroke-width="4" stroke-linejoin="miter"/></svg>
  <div class="chips"><span class="chip"><i><b>44</b>个组件</i></span><span class="chip"><i><b>5</b>套配色</i></span><span class="chip"><i><b>45</b>种合成音效</i></span><span class="chip"><i><b>0</b>依赖</i></span></div>`;
  const btn = el(`<sk-button variant="pink" size="lg" style="position:absolute;left:700px;top:342px;translate:-50% -50%">按我! PRESS</sk-button>`);
  p.appendChild(btn);
  btn.addEventListener('click', () => {
    const r = btn.getBoundingClientRect();
    S.moves.boom(r.left + r.width / 2, r.top + r.height / 2, 1.3, btn);
    S.sfx(jp('ドン!'), { voice: 'impact', x: r.left + r.width / 2 - 20, y: r.top - 64, size: 96, hold: 900 });
    S.shake(p.querySelector('.logo'), 9, 300);
  });
  cursor.park(W + 30, 470, s.start);
  cursor.show(0.5);
  cursor.to(btn, 0.55, 0.85, 8, 4);
  cursor.click(1.6);   // the press lands on the downbeat of bar 2; the button fires on release
  return p;
}

/* ================= 2 · press ================= */
function press(prev) {
  const s = SHOT.press, p = mount(page('', 'P.02'), s.start - 0.45, 1);
  turn(prev, s.start - 0.45); drop(prev, s.start);
  title(p, 36, 28, 'EVERY PRESS IS A <em>KEY FRAME</em>', '每一下按压，都是一张原画', s.start + 0.1);
  const k1 = koma(p, 36, 156, 280, 262, '<sk-button>', 'tone');
  const k2 = koma(p, 340, 156, 280, 262, '<sk-like>', 'lines');
  const k3 = koma(p, 644, 156, 280, 262, '<sk-hold-button>', 'tone');
  const b = el(`<sk-button variant="primary" size="lg" style="zoom:1.4">Save</sk-button>`); k1.appendChild(b);
  const l = el(`<sk-like count="128" style="font-size:22px;zoom:1.5"></sk-like>`); k2.appendChild(l);
  const h = el(`<sk-hold-button style="zoom:1.2">Hold to delete</sk-hold-button>`); k3.appendChild(h);
  caption(p, 36, 436, '按钮会被压扁再弹回；点赞会炸开；长按要把力蓄满，才「ザンッ!」地斩开。', s.start + 0.5);
  cursor.to(b, s.start + 0.2, 0.5);
  cursor.click(4.8);
  cursor.to(l, 5.3, 0.5);
  cursor.click(6.0);
  cursor.to(h, 6.5, 0.55);
  cursor.down(7.183); cursor.up(8.45);
  at(8.5, () => S.shake(p, 7, 260));
  return p;
}

/* ================= 3 · forms ================= */
function forms(prev) {
  const s = SHOT.forms, p = mount(page('', 'P.03'), s.start, 2);
  drop(prev, s.start + 0.02);
  const t = title(p, 36, 40, 'FORMS<br>WITH <em>WEIGHT</em>', '表单也有手感', null, 290);
  const c = caption(p, 36, 250, '开关会弹，勾选会「カチッ」，<br>滑块拖动时有摩擦声，<br>评分的星星依次点亮，音阶上升。', null, 290);
  const k1 = koma(p, 354, 32, 278, 200, '<sk-switch>', 'tone');
  const k2 = koma(p, 648, 32, 278, 200, '<sk-checkbox>', 'lines');
  const k3 = koma(p, 354, 248, 278, 200, '<sk-slider>', 'lines');
  const k4 = koma(p, 648, 248, 278, 200, '<sk-rating>', 'tone');
  const sw = el(`<sk-switch size="lg" style="zoom:1.25">Wi-Fi</sk-switch>`); k1.appendChild(sw);
  const cb = el(`<sk-checkbox style="font-size:20px;zoom:1.35">Remember me</sk-checkbox>`); k2.appendChild(cb);
  const sl = el(`<sk-slider value="30" style="width:160px;zoom:1.4"></sk-slider>`); k3.appendChild(sl);
  const rt = el(`<sk-rating value="2" style="zoom:1.3"></sk-rating>`); k4.appendChild(rt);
  slamIn([t, c, k1, k2, k3, k4], s.start, 0.05);
  cursor.to(sw, s.start + 0.15, 0.5);
  cursor.click(10.4);
  cursor.to(cb, 10.7, 0.45, -50, 0);
  cursor.click(11.2);
  const thumb = () => inner(sl, '[part=thumb], .thumb, .th') || sl;
  cursor.to(() => { const r = sl.getBoundingClientRect(); return [r.left + r.width * 0.3, r.top + r.height / 2]; }, 11.45, 0.45);
  cursor.down(12.0);
  cursor.to(() => { const r = sl.getBoundingClientRect(); return [r.left + r.width * 0.92, r.top + r.height / 2]; }, 12.05, 0.7);
  cursor.up(12.85);
  cursor.to(() => { const st = rt.shadowRoot.querySelectorAll('button, .s, [part~=star]'); return st.length ? st[st.length - 1] : rt; }, 12.9, 0.3);
  cursor.click(13.2);
  return p;
}

/* ================= 4 · lettering ================= */
function lettering(prev) {
  const s = SHOT.lettering, p = mount(page('', 'P.04'), s.start, 2);
  drop(prev, s.start + 0.02);
  impact(s.start);
  const k = koma(p, 20, 20, 920, 500, '', 'lines'); k.style.setProperty('--fx', '50%'); k.style.setProperty('--fy', '52%');
  const tg = el(`<div class="tag" style="left:44px;top:40px"><i>LETTERING BUILT IN · <span style="font-family:var(--zh)">拟声词就是字幕</span></i></div>`); p.appendChild(tg);
  const cp = caption(p, 516, 426, '<code>sfx(\'ドン!\', { voice: \'impact\' })</code><br>10 种声线，每个词有自己的字体、描边、入场和声音。', s.start + 0.25, 400);
  reveal(tg, s.start + 0.05, 160, 3);
  cursor.hide(s.start);
  const words = [
    [14.8, 'ドン!', 'impact', 250, 190, 104],
    [15.2, 'ズバッ', 'cut', 770, 150, 78],
    [15.6, 'カチッ', 'click', 520, 300, 60],
    [16.0, 'キラッ', 'shine', 790, 320, 66],
    [16.4, 'ゴゴゴ', 'rumble', 210, 370, 70],
    [16.8, 'ポン!', 'pop', 500, 150, 58],
    [17.2, 'シュッ', 'swish', 400, 450, 52],
  ];
  for (const [t, w, voice, x, y, size] of words) at(t, () => S.sfx(w, { voice, x, y, size, hold: 19.2 - t > 1.2 ? (18.0 - t) * 1000 : 500 }));
  at(18.4, () => S.sfx('シーン…', { voice: 'hush', x: 480, y: 270, size: 64, hold: 700 }));
  return p;
}

/* ================= 5 · icons ================= */
function icons(prev) {
  const s = SHOT.icons, p = mount(page('', 'P.05'), s.start - 0.42, 1);
  turn(prev, s.start - 0.42); drop(prev, s.start);
  at(s.start - 0.42, reset, true);
  title(p, 36, 26, 'ICONS <em>WIND UP</em> FIRST', '图标先蓄力，再弹回', s.start + 0.05);
  const names = Object.keys(S.ICONS).slice(0, 24);
  const k1 = koma(p, 36, 150, 400, 300, '<sk-icon> × 24', 'tone');
  const grid = el(`<div style="display:grid;grid-template-columns:repeat(6,48px);gap:12px 14px"></div>`); k1.appendChild(grid);
  const ic = names.map(n => { const i = el(`<sk-icon name="${n}" size="40"></sk-icon>`); grid.appendChild(i); return i; });
  const k2 = koma(p, 456, 150, 468, 300, 'SPRINGS.spring', '');
  const bell = el(`<sk-icon name="bell" size="112" style="position:absolute;left:26px;top:86px"></sk-icon>`); k2.appendChild(bell);
  // the timing chart: displacement of the bell's pose over the 803 ms play, from the library's own spring easing
  const pts = SP.spring.easing.replace(/^linear\(|\)$/g, '').split(',').map(x => x.trim().split(/\s+/)).map(([v, pc], i, a) => [pc == null ? (i ? 1 : 0) : parseFloat(pc) / 100, parseFloat(v)]);
  const DIP = 70, total = DIP + SP.spring.duration, cw = 270, ch = 150, ox = 170, oy = 70;
  const X = (ms) => ox + (ms / total) * cw, Y = (v) => oy + ch - v * ch * 0.8;
  let d = `M${X(0)} ${Y(0)}`;
  for (let i = 1; i <= 8; i++) { const u = i / 8; d += ` L${X(DIP * u).toFixed(1)} ${Y(1 - (1 - u) * (1 - u)).toFixed(1)}`; }
  for (const [u, v] of pts) d += ` L${X(DIP + u * SP.spring.duration).toFixed(1)} ${Y(1 - v).toFixed(1)}`;
  let grid2 = ''; for (let ms = 0; ms <= total; ms += 50) grid2 += `<line x1="${X(ms)}" y1="${oy}" x2="${X(ms)}" y2="${oy + ch}"/>`;
  const svg = el(`<svg class="sheet" width="468" height="300" style="position:absolute;left:0;top:0">
    <g class="grid">${grid2}</g>
    <line class="axis" x1="${ox}" y1="${Y(0)}" x2="${ox + cw}" y2="${Y(0)}"/>
    <line class="head" x1="${ox}" y1="${oy - 6}" x2="${ox}" y2="${oy + ch + 4}"/>
    <text x="${X(DIP) - 4}" y="${oy - 12}" text-anchor="middle">70ms 预备</text>
    <text x="${X(DIP + 360)}" y="${oy + ch + 24}" text-anchor="middle">733ms 弹簧回位</text>
  </svg>`);
  k2.appendChild(svg);
  const curve = el(`<svg class="sheet" width="468" height="300" style="position:absolute;left:0;top:0"><path class="curve" d="${d}"/></svg>`);
  k2.appendChild(curve);
  const head = svg.querySelector('.head');
  curve.style.clipPath = `inset(0 ${468 - ox + 4}px 0 0)`;
  caption(p, 36, 466 - 8, '24 个手绘图标：先用 70 毫秒压进预备姿势，再沿库里的同一条弹簧曲线弹回。', s.start + 0.4);
  // wave across the grid on the diagonal, then the cursor sweeps a row by hover (pointerenter plays an icon)
  ic.forEach((x, i) => { const r = Math.floor(i / 6), c = i % 6; at(19.6 + (r + c) * 0.045, () => x.play()); });
  cursor.park(470, 600, s.start); cursor.show(20.5);
  cursor.to(() => ic[12], 20.5, 0.4, -20, 0);
  cursor.to(() => ic[17], 20.95, 0.6, 20, 0);
  cursor.to(bell, 21.65, 0.35, 0, 10);
  const go = 22.0;
  at(go, () => {
    bell.play();
    curve.animate([{ clipPath: `inset(0 ${468 - ox + 4}px 0 0)` }, { clipPath: `inset(0 ${468 - ox - cw - 6}px 0 0)` }], { duration: total, easing: 'linear', fill: 'forwards' });
    head.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${cw}px)` }], { duration: total, easing: 'linear', fill: 'forwards' });
  });
  at(22.9, () => { bell.play(); });
  return p;
}

/* ================= 6 · loaders ================= */
function loaders(prev) {
  const s = SHOT.loaders, p = mount(page('', 'P.06'), s.start, 2);
  drop(prev, s.start + 0.02);
  const k1 = koma(p, 36, 30, 470, 420, '<sk-loader>', 'lines');
  k1.style.setProperty('--fx', '50%'); k1.style.setProperty('--fy', '62%');
  const ball = el(`<sk-loader style="font-size:46px;margin-top:70px"></sk-loader>`); k1.appendChild(ball);
  const k2 = koma(p, 526, 30, 398, 128, 'variant="flip"', 'tone');
  const k3 = koma(p, 526, 176, 398, 128, 'variant="wave"', '');
  const k4 = koma(p, 526, 322, 398, 128, 'variant="pencil"', 'tone');
  const flip = el(`<sk-loader variant="flip" style="font-size:24px">Inking…</sk-loader>`); k2.appendChild(flip);
  const wave = el(`<sk-loader variant="wave" text="LOADING" style="font-size:24px"></sk-loader>`); k3.appendChild(wave);
  const pen = el(`<sk-loader variant="pencil" tips="Roughing in|Cleaning up|Colouring" style="font-size:22px"></sk-loader>`); k4.appendChild(pen);
  const t = title(p, 52, 46, 'WAITING CAN<br>BE <em>FUN</em>', '等待也可以好玩', null);
  const c = caption(p, 36, 466 - 8, '四种加载动画，戳一下会回应，连戳还会计连击。', s.start + 0.6);
  slamIn([k1, k2, k3, k4, t], s.start, 0.04);
  cursor.park(700, 600, s.start); cursor.show(s.start + 0.6);
  cursor.to(ball, 25.0, 0.6, 0, 10);
  for (const tt of [26.0, 26.4, 26.8, 27.2]) cursor.click(tt);
  cursor.to(flip, 27.8, 0.5);
  cursor.click(28.4);
  cursor.to(wave, 28.8, 0.4);
  cursor.click(29.2);
  return p;
}

/* ================= 7 · palettes ================= */
function palettes(prev) {
  const s = SHOT.palettes, p = mount(page('', 'P.07'), s.start, 2);
  drop(prev, s.start + 0.02);
  screentone(s.start - 0.15, () => {});
  title(p, 36, 24, 'FIVE PALETTES, <em>LIGHT AND DARK</em>', '五套配色，一行切换', s.start + 0.1);
  const k = koma(p, 36, 140, 640, 280, '', 'tone');
  k.style.placeItems = 'stretch';
  k.innerHTML += `<div style="padding:22px 30px 14px;display:grid;grid-template-columns:1fr 1fr;gap:16px 26px;align-content:start">
    <div style="display:flex;gap:12px;align-items:center"><sk-button variant="primary">Publish</sk-button><sk-button variant="pink">Delete</sk-button><sk-badge value="3"><sk-button>Inbox</sk-button></sk-badge></div>
    <div style="display:flex;gap:16px;align-items:center"><sk-switch checked>Sound</sk-switch><sk-theme-switch></sk-theme-switch></div>
    <sk-alert variant="success" title="Saved">Every palette passes 4.5:1.</sk-alert>
    <div style="display:grid;gap:14px;align-content:start"><sk-progress value="68"></sk-progress><div style="display:flex;gap:8px"><sk-tag>design</sk-tag><sk-tag variant="pink">anime</sk-tag><sk-tag variant="peri">sound</sk-tag></div></div>
    <sk-steps current="1" style="grid-column:1/3"><sk-step label="Rough"></sk-step><sk-step label="Ink"></sk-step><sk-step label="Colour"></sk-step></sk-steps>
  </div>`;
  const ts = k.querySelector('sk-theme-switch');
  const list = ['sakuga', 'shonen', 'soda', 'sunset', 'mono'];
  const sw = el(`<div class="sw" style="left:712px;top:140px">${list.map(n => `<div data-p="${n}"><i></i>${n.toUpperCase()}</div>`).join('')}</div>`);
  p.appendChild(sw);
  const paint = () => sw.querySelectorAll('div').forEach(d => { const P = S.PALETTES[d.dataset.p]; const th = S.getTheme() === 'dark' ? 'dark' : 'light'; const v = P[th] || P.light; d.querySelector('i').style.background = `linear-gradient(135deg, ${v[5] || v[3]} 0 50%, ${v[7]} 50%)`; d.toggleAttribute('data-on', d.dataset.p === S.getPalette()); });
  const con = el(`<div class="console" style="left:36px;top:438px;width:888px"><span class="p">&gt;</span><span class="code"></span><span class="caret"></span></div>`);
  p.appendChild(con);
  const code = con.querySelector('.code');
  const show = (name, theme) => { code.innerHTML = theme ? `Sakuga.setTheme(<span class="s">'${theme}'</span>)` : `Sakuga.setPalette(<span class="s">'${name}'</span>)`; };
  at(s.start, () => { reset(); show('sakuga'); paint(); });
  const seq = [[31.2, 'shonen'], [32.0, 'soda'], [32.8, 'sunset'], [33.6, 'mono']];
  for (const [t, n] of seq) screentone(t - 0.15, () => { S.setPalette(n); show(n); paint(); });
  cursor.park(800, 600, s.start); cursor.show(33.7);
  cursor.to(ts, 33.75, 0.5);
  cursor.click(34.4);
  at(34.42, () => { show(null, 'dark'); paint(); });
  at(35.0, () => paint());
  screentone(35.2 - 0.15, () => { S.setPalette('sakuga'); show('sakuga'); paint(); });
  screentone(36.0 - 0.15, () => { S.setPalette('soda'); show('soda'); paint(); });
  return p;
}

/* ================= 8 · overlays ================= */
function overlays(prev) {
  const s = SHOT.overlays, p = mount(page('', 'P.08'), s.start, 2);
  drop(prev, s.start + 0.02);
  at(s.start, reset, true);
  title(p, 36, 26, 'POP-UPS THAT <em>LAND</em>', '弹层会「落地」', s.start + 0.05);
  const k = koma(p, 36, 146, 520, 280, '<sk-dialog> · toast()', 'tone');
  k.innerHTML += `<div style="display:grid;gap:16px;justify-items:start;width:380px">
      <div style="font:700 22px/1.2 var(--tx)">Project: “Episode 01”</div>
      <div style="font:400 15px/1.4 var(--tx);color:var(--sk-muted)">48 cuts · last inked 2 min ago</div>
      <div style="display:flex;gap:12px"><sk-button>Rename</sk-button><sk-button variant="pink" class="del">Delete project</sk-button></div></div>`;
  const dlg = el(`<sk-dialog title="Delete this project?" word="バーン!"><p style="margin:0">All 48 cuts go with it. This cannot be undone.</p><sk-button slot="footer" variant="ghost">Cancel</sk-button><sk-button slot="footer" variant="solid" class="ok">Delete</sk-button></sk-dialog>`);
  p.appendChild(dlg);
  const del = k.querySelector('.del');
  del.addEventListener('click', () => dlg.show());
  dlg.querySelector('.ok').addEventListener('click', () => { dlg.hide(); S.toast('Project deleted.', { variant: 'success', duration: 1700 }); });
  caption(p, 576, 146, '对话框带着冲击落下，拟声词由组件自己打出；<br>通知从屏幕边缘弹进来。', s.start + 0.4, 348);
  cursor.park(700, 600, s.start); cursor.show(s.start + 0.1);
  cursor.to(del, s.start + 0.1, 0.45);
  cursor.click(37.6);
  at(37.75, () => S.lift(cur));
  cursor.to(() => dlg.querySelector('.ok'), 38.4, 0.5);
  cursor.click(39.2);
  at(40.0, () => S.toast('Undo is ready for 5 s.', { variant: 'info', duration: 1000 }));
  cursor.to([620, 300], 39.6, 0.6);
  return p;
}

/* ================= 9 · montage ================= */
function montage(prev) {
  const s = SHOT.montage;
  const items = [
    ['<sk-tabs>', `<sk-tabs value="a" style="width:360px"><sk-tab value="a" label="Overview">Every interaction is a key frame.</sk-tab><sk-tab value="b" label="Specs">No dependencies. Plain custom elements.</sk-tab><sk-tab value="c" label="Reviews">“Feels alive.”</sk-tab></sk-tabs>`, (n) => inner(n.querySelector('sk-tabs'), 'button[data-i="1"]')],
    ['<sk-segmented>', `<sk-segmented value="day"><button value="day">Day</button><button value="week">Week</button><button value="month">Month</button></sk-segmented>`, (n) => n.querySelector('button[value=month]')],
    ['<sk-calendar>', `<sk-calendar value="2026-11-03" month="2026-11"></sk-calendar>`, (n) => inner(n.querySelector('sk-calendar'), '[data-d="2026-11-20"]')],
    ['<sk-steps>', `<div style="display:grid;gap:18px;justify-items:center;width:420px"><sk-steps current="1" style="width:100%"><sk-step label="Cart"></sk-step><sk-step label="Pay"></sk-step><sk-step label="Done"></sk-step></sk-steps><sk-button size="sm" class="nx">Next</sk-button></div>`, (n) => n.querySelector('.nx')],
    ['<sk-counter>', `<div style="display:grid;gap:14px;justify-items:center"><sk-counter value="0" duration="380" style="font-size:66px"></sk-counter><sk-button size="sm" class="nx">+ 9,999</sk-button></div>`, (n) => n.querySelector('.nx')],
    ['<sk-accordion>', `<sk-accordion single style="width:370px"><sk-accordion-item label="What is sakuga?" open>Shots a key animator draws by hand, with extra force.</sk-accordion-item><sk-accordion-item label="Is it too loud?">Every effect, word and sound can be turned off.</sk-accordion-item></sk-accordion>`, (n) => inner(n.querySelector('sk-accordion-item:nth-child(2)'), '.head')],
  ];
  const strip = el(`<div class="strip"><span class="en"><em>49</em> TAGS · ZERO DEPENDENCIES</span><span class="zh">49 个标签，零依赖</span><span class="n">01/06</span></div>`);
  let last = prev;
  items.forEach(([label, html, target], i) => {
    const t = s.start + i * 0.8, p = mount(page('', ''), t, 2 + i);
    drop(last, t + 0.02); last = p;
    if (i === 0) { impact(t); p.appendChild(strip); }
    else at(t, () => { p.appendChild(strip); strip.querySelector('.n').textContent = `0${i + 1}/06`; });
    const k = koma(p, 200, 108, 560, 330, label, i % 2 ? 'tone' : 'lines');
    const holder = el(`<div style="zoom:${i === 2 ? 0.92 : 1.35};display:grid;place-items:center">${html}</div>`); k.appendChild(holder);
    if (i === 4) holder.querySelector('.nx').addEventListener('click', () => { holder.querySelector('sk-counter').value = 9999; });
    if (i === 3) holder.querySelector('.nx').addEventListener('click', () => holder.querySelector('sk-steps').next());
    slamIn([k], t, 0);
    cursor.to(() => target(holder), t + 0.05, 0.3);
    cursor.click(t + 0.4);
  });
  at(s.start, () => { cur.style.opacity = 1; });
  return last;
}

/* ================= 10 · end ================= */
function end(prev) {
  const s = SHOT.end, p = mount(page('cover end', ''), s.start - 0.42, 1);
  turn(prev, s.start - 0.42); drop(prev, s.start);
  p.innerHTML += `<div class="rays" style="inset:0"></div>
  <svg class="burst" style="left:480px;top:176px" width="1" height="1"><path d="${starburst(22, 214, 150)}" fill="var(--sk-surface)" stroke="var(--sk-ink)" stroke-width="4"/></svg>
  <div class="kick" style="left:0;right:0;top:64px;text-align:center">第 1 话 · <span>一按，即原画</span></div>
  <div class="logo" style="left:0;right:0;top:110px;text-align:center;font-size:128px">SAKUGA <b>UI</b></div>
  <div class="cmd" style="position:absolute;left:0;right:0;top:318px;display:flex;justify-content:center;align-items:center;gap:12px"><span style="padding:9px 16px;border:2.5px dashed var(--sk-ink);background:var(--sk-surface);font:700 20px/1 var(--mono)">npm i github:LeeHongji/sakuga-ui</span></div>
  <div class="url" style="left:0;right:0;top:386px;text-align:center">GITHUB.COM/<b>LEEHONGJI</b>/SAKUGA-UI</div>
  <div class="tag" style="right:36px;top:30px"><i>TO BE CONTINUED · <span style="font-family:var(--zh)">未完待续</span></i></div>`;
  const logo = p.querySelector('.logo'), more = p.querySelector('.tag');
  const cp = el(`<sk-copy value="npm i github:LeeHongji/sakuga-ui" style="zoom:1.45"></sk-copy>`); p.querySelector('.cmd').appendChild(cp);
  const chips = el(`<div class="chips" style="position:absolute;left:0;right:0;top:452px;display:flex;justify-content:center;gap:10px"><span class="chip"><i><b>44</b>个组件</i></span><span class="chip"><i><b>49</b>个标签</i></span><span class="chip"><i><b>0</b>依赖</i></span><span class="chip"><i><b>57</b>kB gzip</i></span><span class="chip"><i><b>3</b>种语言</i></span><span class="chip"><i><b>5</b>套配色</i></span></div>`);
  p.appendChild(chips);
  [...chips.children].forEach((c, i) => { c.style.visibility = 'hidden'; at(48.4 + i * 0.1, () => { c.style.visibility = ''; c.animate([{ transform: 'skewX(-10deg) translateY(10px)' }, { transform: 'skewX(-10deg)' }], { duration: SP.bounce.duration, easing: SP.bounce.easing }); }); });
  reveal(p.querySelector('.url'), 49.2, 220, 5);
  reveal(more, 51.2, 200, 4);
  cursor.park(720, 600, s.start - 0.42); cursor.show(s.start);
  cursor.to(cp, s.start + 0.05, 0.6);
  cursor.click(47.2);
  cursor.to([880, 610], 47.8, 0.7);
  at(50.0, () => {
    logo.animate([{ transform: 'scale(1.35)' }, { transform: 'none' }], { duration: SP.bounce.duration, easing: SP.bounce.easing });
    S.moves.boom(480, 176, 1.6);
    S.sfx('ドン!', { voice: 'impact', x: 846, y: 168, size: 80, hold: 2400 });
  });
  impact(50.0);
  return p;
}

/* ---------- build everything up front: cues sit on the clock, pages appear when their time comes ---------- */
function build() {
  let p = cover();
  p = press(p); p = forms(p); p = lettering(p); p = icons(p); p = loaders(p); p = palettes(p); p = overlays(p); p = montage(p); end(p);
}

/* ---------- the loop ---------- */
function tick() {
  const t = now(); FILM.t = t;
  while (FILM.cues.length && FILM.cues[0].t <= t + 1e-6) { const c = FILM.cues.shift(); try { c.fn(); } catch (e) { console.error(e); } }
  moveCursor(t); drawCursor();
  requestAnimationFrame(tick);
}
FILM.start = (t0 = 0) => {
  FILM.T0 = performance.now() - t0 * 1000;
  reset();
  build();
  // jumping in: everything before t0 that sets lasting state still runs, so pages and palettes are right
  const past = FILM.cues.filter(c => c.t < t0);
  FILM.cues = FILM.cues.filter(c => c.t >= t0);
  for (const c of past) if (c.keep) c.fn();
  FILM.ops = [];
  tick();
};
S.configure({ sound: true, fx: 'full', lettering: true });
await S.loadFaces();
await document.fonts.ready;
await Promise.all(['40px Bangers', '25px "ZCOOL QingKe HuangYou"', '15px "ZCOOL KuaiLe"', '700 15px "Comic Neue"'].map(f => document.fonts.load(f, '每一按原画ABC')));
FILM.ready = true;
