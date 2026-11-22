/* Sakuga FX, the manga shelf: effect lines, impact marks and drifting things. Each one is a drawing technique
   with a name, given in the comment above it together with what it says on a page.
   Same contract as fx.js: one add() per effect, seeded when it is spawned, drawn as a pure function of its age,
   in flat shapes. Lines that stay on screen "boil": their ragged ends are re-rolled eight times a second, the way
   a held drawing is traced again on every other frame. */
import { add, C, amount } from './fx.js';
import { TAU, clamp, lerp, E, newR } from './util.js';

const BOIL = 8;
const hash = (i, k) => { let h = Math.imul(i + 1, 374761393) ^ Math.imul(k + 1, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// 1 while the effect is on, falling to 0 over its last `tout` seconds. An effect held with life: Infinity leaves when .end(tout) is called
const leaving = (it, age, tout) => (it.life === Infinity ? 1 : clamp((it.life - age) / tout, 0, 1));
// a line that is `w` wide at (x0, y0) and comes to a point at (x1, y1)
function wedge(ctx, x0, y0, x1, y1, w) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = (-dy / d) * w / 2, ny = (dx / d) * w / 2;
  ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1, y1); ctx.lineTo(x0 - nx, y0 - ny); ctx.closePath();
}
// a band along a polyline whose width at each point is wf(t), t running 0..1 along it
function ribbon(ctx, pts, wf) {
  const n = pts.length, L = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, h = wf(i / (n - 1)) / 2;
    L.push([pts[i][0] - (dy / d) * h, pts[i][1] + (dx / d) * h]); Rt.push([pts[i][0] + (dy / d) * h, pts[i][1] - (dx / d) * h]);
  }
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rt[i][0], Rt[i][1]);
  ctx.closePath();
}

/* 集中線 (shūchūsen), focus lines. Lines that run toward one point and stop at ragged distances from it: the eye and
   the shock are pulled there. mode 'out' is 明かり線: every line starts at the same radius and thins outward, which
   reads as light or joy. bundle groups the lines with gaps (まとまり); white draws them hollow (白抜き);
   swirl leans them so the field turns. white may also be a colour, for a ground that is not black.
   o: { x, y, r, len, n, mode, bundle, white, swirl, rag, w, sx, sy, color } */
export function focus(o) {
  const R = newR(), n = o.n || 44, out = o.mode === 'out', r0 = o.r || 60, r1 = r0 + (o.len || r0 * 1.6), rag = o.rag == null ? 0.45 : o.rag, w = o.w || 5, arr = [];
  let a = 0;
  for (let i = 0; i < n;) {
    const m = o.bundle ? 2 + ((R() * 4) | 0) : 1;
    for (let j = 0; j < m && i < n; j++, i++) { a += o.bundle ? 0.3 + R() * 0.3 : 0.5 + R(); arr.push({ a, rag: R(), w: w * (0.35 + R() * 0.85), d: R() * 0.08, i }); }
    if (o.bundle) a += 1.4 + R() * 1.8;
  }
  const turn = R() * TAU, k = TAU / a, sw = o.swirl || 0;
  return add({
    behind: o.behind, layer: o.layer || 'back', delay: o.delay, life: o.life == null ? 0.6 : o.life,
    draw(ctx, age) {
      const gone = leaving(this, age, 0.16), step = Math.floor(age * BOIL);
      ctx.translate(o.x, o.y); ctx.scale(o.sx || 1, o.sy || 1);
      const paint = (scale, color) => {
        ctx.beginPath();
        for (const L of arr) {
          const e = E.outCubic(clamp((age - L.d) / 0.16, 0, 1)) * gone; if (e <= 0) continue;
          const jr = 0.6 * L.rag + 0.4 * hash(L.i, step), ang = turn + L.a * k;
          const base = out ? r0 : r1, tip = lerp(base, out ? r0 + (r1 - r0) * (1 - rag * jr) : r0 * (1 + rag * jr), e);
          wedge(ctx, Math.cos(ang) * base, Math.sin(ang) * base, Math.cos(ang + sw) * tip, Math.sin(ang + sw) * tip, L.w * scale * (0.4 + 0.6 * gone));
        }
        ctx.fillStyle = color; ctx.fill();
      };
      paint(1, o.color || C.ink);
      if (o.white) paint(0.5, o.white === true ? C.fxw : o.white);
    },
  });
}

/* ウニフラッシュ (uni flash), the sea-urchin flash. A white ellipse ringed by spikes whose bases touch: the densest
   member of the focus-line family, used behind a thought spoken to nobody or as a hit mark. hair is the spike
   length (毛足) as a share of the radius; both adds short spikes pointing in (両ウニ).
   o: { x, y, rx, ry, n, hair, both, rot, color, fill } */
export function uni(o) {
  const R = newR(), n = o.n || 30, rx = o.rx || o.r || 56, ry = o.ry || (o.rx ? rx * 0.7 : rx), hair = o.hair == null ? 0.42 : o.hair, sp = [];
  for (let i = 0; i < n; i++) sp.push({ a: ((i + (R() - 0.5) * 0.4) / n) * TAU, len: 0.4 + R() * 0.8, i });
  return add({
    behind: o.behind, layer: o.layer || 'back', delay: o.delay, life: o.life == null ? 0.7 : o.life,
    draw(ctx, age) {
      const gone = leaving(this, age, 0.14), step = Math.floor(age * BOIL);
      const s = (age < 0.14 ? lerp(0.5, 1, E.outBack(age / 0.14)) : 1) * (0.9 + 0.1 * gone), grow = clamp(age / 0.1, 0, 1) * gone;
      const pt = (ang, q) => [Math.cos(ang) * rx * s * q, Math.sin(ang) * ry * s * q];
      const valley = j => { const p = sp[(j + n - 1) % n], c = sp[j]; return (j ? p.a + c.a : p.a - TAU + c.a) / 2; };
      ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0);
      ctx.beginPath();
      sp.forEach((S, j) => {
        const [vx, vy] = pt(valley(j), 1), [tx, ty] = pt(S.a, 1 + hair * S.len * (0.75 + 0.25 * hash(S.i, step)) * grow);
        j ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy); ctx.lineTo(tx, ty);
      });
      ctx.closePath(); ctx.fillStyle = o.color || C.ink; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, rx * s, ry * s, 0, 0, TAU); ctx.fillStyle = o.fill || C.fxw; ctx.fill();
      if (o.both) {
        ctx.beginPath();
        sp.forEach((S, j) => {
          const va = valley(j), half = (S.a - va) * 0.5, [ax, ay] = pt(va - half, 1.01), [bx, by] = pt(va + half, 1.01), [tx, ty] = pt(va, 1 - hair * 0.55 * S.len * grow);
          ctx.moveTo(ax, ay); ctx.lineTo(tx, ty); ctx.lineTo(bx, by); ctx.closePath();
        });
        ctx.fillStyle = o.color || C.ink; ctx.fill();
      }
    },
  });
}

/* イナズマ (inazuma), lightning. A white zigzag kept clear by a black edge, with a small fork or two: a shock, or a
   revelation. With zig: 0 it is one straight white streak, pointed at both ends: an idea arriving (ひらめき).
   Give either an end point or an angle and a length. o: { x, y, x2, y2, angle, len, w, segs, zig, branches, edge } */
// A drawn bolt is a run of slanted bands. Each drifts off to one side, then the next begins a step back across, and
// the two notches of a joint sit at slightly different heights. Returned as one outline, tip at (len, 0).
function zigzag(R, len, W, K, zig) {
  const dir = R() < 0.5 ? -1 : 1, js = [0], bands = [];
  for (let k = 1; k < K; k++) js.push((len * (k + (R() - 0.5) * 0.3)) / K);
  js.push(len);
  for (let k = 0; k < K; k++) { const m = dir * zig * K * (0.8 + R() * 0.4); bands.push({ a0: js[k], m, s: (-m * (js[k + 1] - js[k])) / 2 }); }
  const last = bands[K - 1], off = last.s + last.m * (len - last.a0);
  const c = (k, a) => bands[k].s + bands[k].m * (a - bands[k].a0) - off, w = a => W * Math.pow(Math.max(0, 1 - a / len), 0.6), ov = (len / K) * 0.13;
  const lo = [[0, c(0, 0) - W / 2]], hi = [[0, c(0, 0) + W / 2]];
  for (let k = 1; k < K; k++) {
    const al = js[k] - dir * ov, ah = js[k] + dir * ov;
    lo.push([al, c(k - 1, al) - w(al) / 2], [al, c(k, al) - w(al) / 2]);
    hi.push([ah, c(k - 1, ah) + w(ah) / 2], [ah, c(k, ah) + w(ah) / 2]);
  }
  return { joints: js.slice(1, K).map((a, i) => [a, c(i + 1, a), dir]), pts: [...lo, [len, 0], ...hi.reverse()] };
}
export function bolt(o) {
  const R = newR(), ang = o.x2 == null ? (o.angle == null ? Math.PI / 2 : o.angle) : Math.atan2(o.y2 - o.y, o.x2 - o.x);
  const len = o.x2 == null ? o.len || 140 : Math.hypot(o.x2 - o.x, o.y2 - o.y), w = o.w || 16, zig = o.zig == null ? 0.16 : o.zig;
  const shapes = [];
  if (!zig) shapes.push([[0, 0], [len * 0.3, -w / 2], [len, 0], [len * 0.3, w / 2]]);
  else {
    const main = zigzag(R, len, w, o.segs || 3, zig); shapes.push(main.pts);
    for (let i = 0, nb = Math.min(main.joints.length, o.branches == null ? 1 : o.branches); i < nb; i++) {
      // a fork leaves a joint on the side the bolt has just stepped away from
      const [jx, jy, dir] = main.joints[main.joints.length - 1 - i], turn = -dir * (0.55 + R() * 0.35), cs = Math.cos(turn), sn = Math.sin(turn);
      shapes.push(zigzag(R, len * (0.26 + R() * 0.1), w * 0.42, 2, zig * 1.5).pts.map(([px, py]) => [jx + px * cs - py * sn, jy + px * sn + py * cs]));
    }
  }
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life || 0.5,
    draw(ctx, age) {
      if (this.life > 0.3 && age > 0.15 && age < 0.2) return;            // one dropped frame: the flicker
      const gone = leaving(this, age, 0.14), reach = clamp(age / 0.07, 0, 1), pad = w * 2;
      ctx.translate(o.x, o.y); ctx.rotate(ang);
      // it strikes from the start to the tip, and leaves the same way
      ctx.beginPath(); ctx.rect(-pad + (len + pad * 2) * (1 - gone), -len, (len + pad * 2) * reach * gone, len * 2); ctx.clip();
      ctx.beginPath();
      for (const pts of shapes) { pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); }
      ctx.lineJoin = 'miter'; ctx.miterLimit = 4;
      const edge = o.edge == null ? w * 0.5 : o.edge;
      if (edge > 0.2) { ctx.lineWidth = edge; ctx.strokeStyle = C.ink; ctx.stroke(); }
      ctx.fillStyle = C.fxw; ctx.fill();
    },
  });
}

/* タレ線 (taresen), gloom lines. Vertical lines hanging from one level, tops aligned and bottoms ragged: a mood has
   dropped. kind 'wavy' is the comic version (うねうね), 'drip' ends each line in a droplet: cold sweat.
   o: { x, y, w, len, n, kind, lean, lw, color }  x, y is the top-left corner; lean -1..1 makes one side longer */
export function tare(o) {
  const R = newR(), n = o.n || Math.max(5, Math.round(o.w / 9)), kind = o.kind || 'line', lean = o.lean || 0, arr = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.2 + R() * 0.6) / n;
    arr.push({ u, len: (0.35 + R() * 0.65) * (1 - Math.abs(lean) * (lean > 0 ? 1 - u : u) * 0.8), w: (o.lw || 2.2) * (0.6 + R() * 0.8), d: R() * 0.22, ph: R() * TAU });
  }
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life == null ? 1.4 : o.life,
    draw(ctx, age) {
      const gone = leaving(this, age, 0.25);
      ctx.fillStyle = ctx.strokeStyle = o.color || C.ink;
      for (const L of arr) {
        const len = (o.len || 40) * L.len * E.outCubic(clamp((age - L.d) / 0.3, 0, 1)) * gone, x = o.x + o.w * L.u;
        if (len < 1.5) continue;
        if (kind === 'wavy') {
          ctx.beginPath(); ctx.lineWidth = L.w * 0.9; ctx.lineCap = 'round';
          for (let y = 0; y <= len; y += 2) { const px = x + Math.sin(y / 2.7 + L.ph) * 2.8 * Math.min(1, y / 8, (len - y) / 6 + 0.3); y ? ctx.lineTo(px, o.y + y) : ctx.moveTo(px, o.y); }
          ctx.stroke();
        } else if (kind === 'drip') {
          const r = L.w * 1.15;
          ctx.beginPath(); wedge(ctx, x, o.y + len - r, x, o.y, L.w * 0.9); ctx.arc(x, o.y + len - r, r, 0, TAU); ctx.fill();
        } else { ctx.beginPath(); wedge(ctx, x, o.y, x, o.y + len, L.w); ctx.fill(); }
      }
    },
  });
}

/* オドロ線 (odoro), dread lines. Wavy strands, like hair, that creep out from around something: a grudge, an
   ominous presence. A large w gives the thick form (帯オドロ). The strands start on an ellipse of rx by ry.
   o: { x, y, rx, ry, len, n, w, inward, color } */
export function odoro(o) {
  const R = newR(), rx = o.rx || o.r || 50, ry = o.ry || rx, n = o.n || Math.round(clamp((rx + ry) / 4.5, 12, 44)), arr = [];
  for (let i = 0; i < n; i++) arr.push({ a: ((i + R() * 0.7) / n) * TAU, len: (o.len || 46) * (0.55 + R() * 0.6), w: (o.w || 7.5) * (0.6 + R() * 0.7), ph: R() * TAU, f: 1.1 + R() * 0.9, sp: 2.2 + R() * 1.6, d: R() * 0.3 });
  return add({
    behind: o.behind, layer: o.layer || 'back', delay: o.delay, life: o.life == null ? 1.6 : o.life,
    draw(ctx, age) {
      const gone = leaving(this, age, 0.3), dir = o.inward ? -1 : 1;
      ctx.translate(o.x, o.y); ctx.beginPath();
      for (const S of arr) {
        const grow = E.outCubic(clamp((age - S.d) / 0.55, 0, 1)) * gone; if (grow < 0.03) continue;
        const c = Math.cos(S.a), s = Math.sin(S.a), bx = c * rx, by = s * ry, pts = [];
        for (let j = 0; j <= 9; j++) {
          const t = j / 9, d = t * S.len * grow * dir, side = Math.sin(t * S.f * TAU + S.ph + age * S.sp) * (3 + S.w * 0.8) * t;
          pts.push([bx + c * d - s * side, by + s * d + c * side]);
        }
        ribbon(ctx, pts, t => S.w * Math.pow(1 - t, 0.85) * (0.5 + 0.5 * grow));
      }
      ctx.fillStyle = o.color || C.ink; ctx.fill();
    },
  });
}

/* 震え線 (furuesen) and しびれ線 (shibiresen), tremble marks. Given a box (w, h), short wavy dashes sit around
   its outline and shift on stepped frames: it is shaking. Given only a point, three to six wavy rays spread from
   it: pins and needles. A shorter period is a finer tremble. o: { x, y, w, h, pad, n, period, amp, len, color } */
export function wobble(o) {
  const R = newR(), box = o.w != null, n = o.n || (box ? 8 : 5), period = o.period || 8, amp = o.amp || 2.2, arr = [];
  for (let i = 0; i < n; i++) arr.push({ u: (i + 0.15 + R() * 0.7) / n, len: (o.len || (box ? 26 : 34)) * (0.7 + R() * 0.6), ph: R() * TAU, i });
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life == null ? 0.7 : o.life,
    draw(ctx, age) {
      const gone = leaving(this, age, 0.14), on = clamp(age / 0.08, 0, 1) * gone, step = Math.floor(age * 12);
      ctx.lineWidth = (o.lw || 1.9) * (0.4 + 0.6 * on); ctx.strokeStyle = o.color || C.violet;
      for (const D of arr) {
        let x, y, tx, ty;                                                 // start of the dash and the unit vector along it
        if (box) {
          const pad = (o.pad == null ? 7 : o.pad) + 2.5 * hash(D.i, step), W = o.w + pad * 2, H = o.h + pad * 2, s = D.u * 2 * (W + H);
          if (s < W) [x, y, tx, ty] = [o.x - pad + s, o.y - pad, 1, 0];
          else if (s < W + H) [x, y, tx, ty] = [o.x + o.w + pad, o.y - pad + s - W, 0, 1];
          else if (s < 2 * W + H) [x, y, tx, ty] = [o.x + o.w + pad - (s - W - H), o.y + o.h + pad, -1, 0];
          else [x, y, tx, ty] = [o.x - pad, o.y + o.h + pad - (s - 2 * W - H), 0, -1];
          x -= tx * D.len / 2; y -= ty * D.len / 2;
        } else {
          const a = D.u * TAU, r0 = (o.r || 10) + 3 * hash(D.i, step);
          [tx, ty] = [Math.cos(a), Math.sin(a)]; [x, y] = [o.x + tx * r0, o.y + ty * r0];
        }
        const len = D.len * on, shift = hash(D.i, step + 7) * TAU;
        ctx.beginPath();
        for (let d = 0; d <= len; d += 2) {
          const side = Math.sin((d / period) * TAU + D.ph + shift) * amp * Math.min(1, d / 5, (len - d) / 5 + 0.25);
          d ? ctx.lineTo(x + tx * d - ty * side, y + ty * d + tx * side) : ctx.moveTo(x - ty * side, y + tx * side);
        }
        ctx.stroke();
      }
    },
  });
}

/* 残像 (zanzō), afterimages. Copies of a box left along the way it came, in broken line, the oldest going first:
   it moved faster than the eye. from and to are boxes { l, t, w, h } in page space; hollow leaves the copies unfilled,
   for when they lie over something that has to stay readable. o: { from, to, n, radius, lw, hollow } */
export function ghost(o) {
  const a = o.from, b = o.to, n = o.n || 3, rad = o.radius == null ? 12 : o.radius;
  return add({
    behind: o.behind, layer: o.layer || 'back', delay: o.delay, life: o.life || 0.36,
    draw(ctx, age, u) {
      ctx.lineWidth = o.lw || 2; ctx.strokeStyle = C.fxo; ctx.fillStyle = C.fxw;
      for (let i = 0; i < n; i++) {
        const f = (i + 1) / (n + 1), live = clamp((f + 0.45 - u * 1.45) / 0.3, 0, 1); if (live <= 0) continue;
        const w = lerp(a.w, b.w, f), h = lerp(a.h, b.h, f), cut = (1 - live) * Math.min(w, h) * 0.3;
        ctx.beginPath(); ctx.roundRect(lerp(a.l, b.l, f) + cut, lerp(a.t, b.t, f) + cut, w - cut * 2, h - cut * 2, Math.max(0, Math.min(rad, (h - cut * 2) / 2)));
        if (!o.hollow) ctx.fill();
        ctx.setLineDash([4 + 8 * f, 7 - 4 * f]); ctx.stroke();
      }
    },
  });
}

/* 残像線 (zanzōsen), the afterimage band. A white band along the path something just took, widest at the head, with
   the tail catching up: a blade, a fist, a dragged card. pts is the path in page space, oldest point first; two
   points and a bulge make an arc. o: { pts, w, bulge } */
export function trail(o) {
  let pts = o.pts;
  if (pts.length === 2 && o.bulge) {
    const [p, q] = pts, d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, cx = (p[0] + q[0]) / 2 - ((q[1] - p[1]) / d) * o.bulge, cy = (p[1] + q[1]) / 2 + ((q[0] - p[0]) / d) * o.bulge;
    pts = Array.from({ length: 13 }, (_, i) => { const t = i / 12, k = 1 - t; return [k * k * p[0] + 2 * k * t * cx + t * t * q[0], k * k * p[1] + 2 * k * t * cy + t * t * q[1]]; });
  }
  const n = pts.length, w = o.w || 14;
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life || 0.34,
    draw(ctx, age, u) {
      const from = E.inOut(u) * (n - 1), i0 = Math.floor(from), part = [];
      if (i0 >= n - 1) return;
      part.push([lerp(pts[i0][0], pts[i0 + 1][0], from - i0), lerp(pts[i0][1], pts[i0 + 1][1], from - i0)]);
      for (let i = i0 + 1; i < n; i++) part.push(pts[i]);
      if (part.length < 2) return;
      ctx.beginPath(); ribbon(ctx, part, t => w * Math.pow(t, 0.8) * (t > 0.9 ? (1 - t) / 0.1 : 1));
      ctx.fillStyle = C.fxw; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = C.fxo; ctx.lineJoin = 'round'; ctx.stroke();
    },
  });
}

/* ブレ線 (buresen), blur lines. Short strokes on the trailing edge of a moving thing, along the way it travels; the
   faster it goes, the more and the longer. Unlike speed lines they stay attached to the outline.
   o: { x, y, w, h, angle, n, len, lw, color }  the box in page space and the direction of travel */
export function bure(o) {
  const R = newR(), c = Math.cos(o.angle), s = Math.sin(o.angle), n = o.n || 7, arr = [];
  const along = (Math.abs(c) * o.w + Math.abs(s) * o.h) / 2, across = (Math.abs(s) * o.w + Math.abs(c) * o.h) / 2, cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  for (let i = 0; i < n; i++) arr.push({ off: ((i + 0.2 + R() * 0.6) / n - 0.5) * 2 * across * 0.86, len: (o.len || 30) * (0.4 + R() * 0.6), w: (o.lw || 3.4) * (0.6 + R() * 0.7), in: R() * 4 });
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life || 0.32,
    draw(ctx, age, u) {
      const k = 1 - E.outCubic(u);
      ctx.beginPath();
      for (const L of arr) {
        const bx = cx - c * (along - L.in) - s * L.off, by = cy - s * (along - L.in) + c * L.off, len = L.len * k;
        if (len > 1) wedge(ctx, bx, by, bx - c * len, by - s * len, L.w * (0.5 + 0.5 * k));
      }
      ctx.fillStyle = o.color || C.ink; ctx.fill();
    },
  });
}

/* ヒビ (hibi), cracks. Jagged lines of uneven length break out from the point of impact, then short cracks ring
   round and join them: something gave way. clip keeps them inside a box { l, t, w, h, radius }.
   o: { x, y, r, n, w, clip, color } */
export function crack(o) {
  const R = newR(), n = o.n || 6, r = o.r || 70, rays = [], links = [];
  let a = R() * TAU;
  for (let i = 0; i < n; i++) {
    a += (TAU / n) * (0.6 + R() * 0.8);
    const len = r * (0.45 + R() * 0.55), k = 4 + ((R() * 3) | 0), pts = [[0, 0]];
    for (let j = 1; j <= k; j++) { const d = a + (R() - 0.5) * 0.95; pts.push([pts[j - 1][0] + (Math.cos(d) * len) / k, pts[j - 1][1] + (Math.sin(d) * len) / k]); }
    rays.push({ pts, w: (o.w || 3.4) * (0.6 + R() * 0.6) });
  }
  const at = (ray, f) => { const q = clamp(f, 0, 1) * (ray.pts.length - 1), i = Math.min(ray.pts.length - 2, Math.floor(q)); return [lerp(ray.pts[i][0], ray.pts[i + 1][0], q - i), lerp(ray.pts[i][1], ray.pts[i + 1][1], q - i)]; };
  for (let i = 0; i < n; i++) for (const f of [0.36, 0.7]) {
    if (R() < 0.3) continue;
    const p = at(rays[i], f * (0.85 + R() * 0.3)), q = at(rays[(i + 1) % n], f * (0.85 + R() * 0.3)), push = 0.8 + R() * 0.45;
    links.push({ f, pts: [p, [((p[0] + q[0]) / 2) * push, ((p[1] + q[1]) / 2) * push], q] });
  }
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life == null ? 1.2 : o.life,
    draw(ctx, age) {
      const gone = leaving(this, age, 0.3), reach = Math.min(1, (1 + Math.floor(age / 0.045)) / 4);   // four hard steps outward
      if (o.clip) { const q = o.clip; ctx.beginPath(); ctx.roundRect(q.l, q.t, q.w, q.h, Math.min(q.radius || 0, q.h / 2)); ctx.clip(); }
      ctx.translate(o.x, o.y); ctx.fillStyle = ctx.strokeStyle = o.color || C.ink;
      ctx.beginPath();
      for (const ray of rays) {
        const k = ray.pts.length - 1, m = Math.max(1, Math.round(k * reach));
        ribbon(ctx, ray.pts.slice(0, m + 1), t => Math.max(0.5, ray.w * Math.pow(1 - t, 0.6)) * gone);
      }
      ctx.fill();
      if (gone < 0.15) return;
      ctx.lineWidth = 1.5 * gone; ctx.lineJoin = 'miter'; ctx.beginPath();
      for (const L of links) if (reach >= L.f + 0.1) { ctx.moveTo(L.pts[0][0], L.pts[0][1]); ctx.lineTo(L.pts[1][0], L.pts[1][1]); ctx.lineTo(L.pts[2][0], L.pts[2][1]); }
      ctx.stroke();
    },
  });
}

/* 衝撃波 (shōgekiha), the shockwave. A ring of jagged strokes that runs outward from a blow and thins as it goes.
   sy below 1 lays it on the ground. o: { x, y, r, r0, w, n, sy } */
export function shock(o) {
  const R = newR(), n = o.n || 26, jit = Array.from({ length: n * 2 }, () => 0.6 + R() * 0.8), ph = R() * TAU;
  return add({
    behind: o.behind, layer: o.layer || 'back', delay: o.delay, life: o.life || 0.5,
    draw(ctx, age, u) {
      const rad = lerp(o.r0 || 12, o.r || 90, E.outCubic(u)), th = (o.w || 18) * Math.pow(1 - u, 1.3); if (th < 0.8) return;
      ctx.translate(o.x, o.y); ctx.scale(1, o.sy || 1);
      const edge = (base, sign) => {
        for (let j = 0; j < n * 2; j++) {
          const ang = ph + (j / (n * 2)) * TAU, rr = base + sign * (j % 2 ? th * 0.55 * jit[j] : -th * 0.1);
          j ? ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) : ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        ctx.closePath();
      };
      ctx.beginPath(); edge(rad + th / 2, 1); edge(Math.max(1, rad - th / 2), -1);
      ctx.fillStyle = C.fxw; ctx.fill('evenodd');
      ctx.lineWidth = o.lw || 1.8; ctx.strokeStyle = C.fxo; ctx.lineJoin = 'miter'; ctx.stroke();
    },
  });
}

/* タタキダシ (tatakidashi), the stomp crown. Where something lands hard, the ground throws up a crown, like a drop
   hitting milk, with beads flying off its points. x, y is the point on the ground. o: { x, y, r, h, n } */
export function crown(o) {
  const R = newR(), n = o.n || 7, r = o.r || 24, h = o.h || 28, sp = [];
  for (let i = 0; i < n; i++) sp.push({ u: (i + 0.5 + (R() - 0.5) * 0.3) / n, len: 0.55 + R() * 0.45 });
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life || 0.55,
    draw(ctx, age, u) {
      const up = (age < 0.12 ? E.outBack(age / 0.12) : 1) * (u > 0.5 ? 1 - E.inQuad((u - 0.5) / 0.5) : 1), rr = r * (0.75 + 0.5 * u);
      if (up < 0.04) return;
      ctx.translate(o.x, o.y);
      const tips = sp.map(S => { const px = lerp(-rr, rr, S.u), lean = px / rr; return [px + lean * h * 0.42 * up, -h * up * S.len * (1 - 0.3 * lean * lean)]; });
      const shape = () => {
        ctx.beginPath(); ctx.moveTo(-rr, 0);
        tips.forEach(([tx, ty], i) => {
          const x0 = lerp(-rr, rr, i / n), x1 = lerp(-rr, rr, (i + 1) / n), dip = -h * up * 0.22;
          ctx.lineTo(x0, i ? dip : 0); ctx.quadraticCurveTo(lerp(x0, tx, 0.7), lerp(dip, ty, 0.55), tx, ty); ctx.quadraticCurveTo(lerp(x1, tx, 0.7), lerp(dip, ty, 0.55), x1, i === n - 1 ? 0 : dip);
        });
        ctx.quadraticCurveTo(0, r * 0.5 * Math.min(1, up + 0.3), -rr, 0); ctx.closePath();
      };
      shape(); ctx.fillStyle = C.fxw; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = C.fxs; ctx.beginPath(); ctx.ellipse(rr * 0.5, 0, rr * 0.8, h * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore();
      shape(); ctx.lineWidth = o.lw || 1.8; ctx.strokeStyle = C.fxo; ctx.lineJoin = 'round'; ctx.stroke();
      if (up > 0.85) for (const [tx, ty] of tips) { ctx.beginPath(); ctx.arc(tx * (1 + 0.25 * u), ty - 4 - 10 * u, 2.2, 0, TAU); ctx.fillStyle = C.fxw; ctx.fill(); ctx.stroke(); }
    },
  });
}

/* ホワイト飛ばし (white tobashi), spatter. Paint flicked off a brush: many tiny dots, a few large ones, stretched the
   way they flew. White on dark for stars and sparks; with ink: true it is ink spatter, for tension.
   o: { x, y, r, n, size, angle, spread, ink, color } */
export function spatter(o) {
  const R = newR(), n = amount(o.n || 36), r = o.r || 60, dots = [];
  for (let i = 0; i < n; i++) {
    const a = o.angle == null ? R() * TAU : o.angle + (R() - 0.5) * (o.spread || 1.2), d = r * (0.12 + 0.88 * Math.pow(R(), 1.6));
    dots.push({ a, d, s: (o.size || 3) * (0.3 + Math.pow(R(), 2.4) * 1.5), long: 1 + (d / r) * R() * 0.9 });
  }
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life || 0.75,
    draw(ctx, age) {
      const gone = leaving(this, age, 0.2);
      ctx.fillStyle = o.color || (o.ink ? C.ink : C.fxw); ctx.strokeStyle = C.fxo; ctx.lineWidth = 1.1;
      for (const D of dots) {
        const e = clamp((age - (D.d / r) * 0.12) / 0.08, 0, 1), s = D.s * (e < 1 ? E.outBack(e) : 1) * gone; if (s < 0.35) continue;
        ctx.beginPath(); ctx.ellipse(o.x + Math.cos(D.a) * D.d, o.y + Math.sin(D.a) * D.d, s * D.long, s, D.a, 0, TAU); ctx.fill();
        if (!o.ink && !o.color) ctx.stroke();
      }
    },
  });
}

/* トビモノ (tobimono), drifting things. Small objects crossing a panel carry its mood: petals (ハナビラ) for
   glamour, black specks (ダスト) for tension, and one dead leaf doing a loop (カレハ) for a silence nobody
   knows how to break. The box is where they drift. o: { x, y, w, h, kind: 'petal' | 'leaf' | 'dust', n, wind } */
const DRIFT = {
  petal(ctx) { ctx.beginPath(); ctx.moveTo(0, 1); ctx.bezierCurveTo(0.95, 0.5, 0.85, -0.7, 0.2, -1); ctx.lineTo(0, -0.7); ctx.lineTo(-0.2, -1); ctx.bezierCurveTo(-0.85, -0.7, -0.95, 0.5, 0, 1); ctx.closePath(); },
  leaf(ctx) { ctx.beginPath(); ctx.moveTo(0, -1.15); ctx.quadraticCurveTo(0.85, -0.1, 0, 1); ctx.quadraticCurveTo(-0.85, -0.1, 0, -1.15); ctx.closePath(); },
  dust(ctx) { ctx.beginPath(); ctx.moveTo(-1, -0.2); ctx.lineTo(0.2, -0.9); ctx.lineTo(1, 0.1); ctx.lineTo(-0.1, 0.8); ctx.closePath(); },
};
export function drift(o) {
  const kind = DRIFT[o.kind] ? o.kind : 'petal', wind = o.wind == null ? 24 : o.wind, out = [];
  if (kind === 'leaf') {
    // one leaf: in from the left, a single loop in the middle, out to the right
    const life = o.life || 2.6, loop = Math.min(o.h * 0.3, 26), y0 = o.y + o.h * 0.62;
    return add({
      behind: o.behind, layer: o.layer, delay: o.delay, life,
      draw(ctx, age, u) {
        const turn = TAU * E.inOut(clamp((u - 0.3) / 0.4, 0, 1)), at = v => { const th = TAU * E.inOut(clamp((v - 0.3) / 0.4, 0, 1)); return [o.x + o.w * v + loop * Math.sin(th), y0 - loop * (1 - Math.cos(th)) + Math.sin(v * 9) * 4]; };
        const [x, y] = at(u), [x2, y2] = at(u + 0.01), s = (o.size || 11) * Math.min(1, u / 0.08, (1 - u) / 0.08);
        if (s < 0.6) return;
        ctx.translate(x, y); ctx.rotate(Math.atan2(y2 - y, x2 - x) + Math.PI / 2 + Math.sin(turn + u * 6) * 0.3); ctx.scale(s, s);
        DRIFT.leaf(ctx); ctx.fillStyle = C.fxs; ctx.fill(); ctx.lineWidth = 1.6 / s; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -0.8); ctx.lineTo(0, 1.5); ctx.stroke();
      },
    });
  }
  for (let i = 0, n = amount(o.n || (kind === 'dust' ? 12 : 7)); i < n; i++) {
    const R = newR(), dust = kind === 'dust', sx = o.x + R() * o.w, sy = dust ? o.y + R() * o.h : o.y - 8, vy = dust ? (R() - 0.5) * 10 : 70 + R() * 40, vx = dust ? 6 + R() * 10 : wind * (0.6 + R() * 0.8);
    const amp = dust ? 3 : 12 + R() * 14, f = 1.3 + R() * 1.3, ph = R() * TAU, size = dust ? (o.size || 1) * (1.4 + R() * 2.2) : (o.size || 7) * (0.7 + R() * 0.6), life = dust ? 1.6 + R() * 1.2 : (o.h + 16) / vy, spin = (R() - 0.5) * 3;
    out.push(add({
      behind: o.behind, layer: o.layer, delay: (o.delay || 0) + R() * (dust ? 0.3 : 0.8), life,
      draw(ctx, age, u) {
        const s = size * Math.min(1, u / 0.12, (1 - u) / 0.15); if (s < 0.5) return;
        ctx.translate(sx + vx * age + Math.sin(age * f + ph) * amp, sy + vy * age);
        ctx.rotate(dust ? ph + spin * age : Math.sin(age * f + ph) * 0.9 + spin * age);
        const flip = dust ? 1 : Math.cos(age * f * 1.7 + ph); ctx.scale(s * (Math.abs(flip) < 0.25 ? 0.25 * (flip < 0 ? -1 : 1) : flip), s);   // a petal shows its edge as it turns over
        DRIFT[kind](ctx);
        ctx.fillStyle = dust ? C.ink : o.fill || C.pink; ctx.fill();
        if (!dust) { ctx.lineWidth = 1.5 / s; ctx.strokeStyle = o.stroke || C.ink; ctx.stroke(); }
      },
    }));
  }
  return out;
}

/* ---------- the scene shelf: techniques for the everyday moments of an app ----------
   Same contract as above. Grouped by what they say: celebrating (後光, 紙吹雪), temperature and state (メラメラ, 湯気,
   氷結), movement (流線, 風), attention and sound (スポットライト, 音符). None of them fades: they grow in and leave by
   shrinking, thinning or sinking back where they came from. Held ones (life: Infinity) leave on .end(). */
const sideOf = (o, el) => { const r = el.getBoundingClientRect(); return { l: r.left + scrollX, t: r.top + scrollY, w: r.width, h: r.height, radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 }; };

/* 後光 (gokō), the glory burst: wedges of light fanned all round something, turning a notch at a time (on twos),
   the way a prize or a reveal is lit. They shoot out from behind it, hold, then each wedge narrows to a line and is
   gone. o: { x, y, r0, r, n, spin, color, behind, life } */
export function rays(o) {
  const R = newR(), n = o.n || 16, r0 = o.r0 || 16, r = o.r || 110, spin = o.spin == null ? 0.5 : o.spin, arr = [];
  for (let i = 0; i < n; i++) arr.push(0.7 + R() * 0.3);
  return add({
    behind: o.behind, layer: o.behind ? 'back' : o.layer, delay: o.delay, life: o.life || 1.5,
    draw(ctx, age, a) {
      const grow = age < 0.18 ? E.outBack(age / 0.18) : 1, thin = leaving(this, age, 0.4);
      const rot = (o.rot || 0) + (Math.floor(age * 12) / 12) * spin, half = (Math.PI / n) * 0.62 * thin;
      if (half < 0.004) return;
      ctx.beginPath();
      arr.forEach((L, i) => {
        const c = rot + (i / n) * TAU, rr = r0 + (r * L - r0) * grow, h0 = half * 0.18;
        ctx.moveTo(o.x + Math.cos(c - h0) * r0, o.y + Math.sin(c - h0) * r0);
        ctx.lineTo(o.x + Math.cos(c - half) * rr, o.y + Math.sin(c - half) * rr);
        ctx.lineTo(o.x + Math.cos(c + half) * rr, o.y + Math.sin(c + half) * rr);
        ctx.lineTo(o.x + Math.cos(c + h0) * r0, o.y + Math.sin(c + h0) * r0); ctx.closePath();
      });
      ctx.fillStyle = o.color || C.lav; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = o.line || C.violet; ctx.stroke();
    },
  });
}

/* 紙吹雪 (kamifubuki), confetti: slips of paper thrown up, turning over as they fall (a slip shows its edge, then its
   back in the shade tone), swaying on the air, with a few curled ribbons among them. Each slip shrinks away at the
   end of its fall. o: { x, y, n, angle, spread, speed, colors, life } */
export function confetti(o) {
  const out = [], n = amount(o.n || 40), cols = o.colors || [C.pink, C.peri, C.lav, C.fxw, C.violet];
  for (let i = 0; i < n; i++) {
    const R = newR(), curl = R() < 0.2, ang = (o.angle == null ? -Math.PI / 2 : o.angle) + (R() - 0.5) * (o.spread || 1.6), sp = (o.speed || 560) * (0.45 + R() * 0.7);
    const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp, w = curl ? 3.6 : 7 + R() * 4, h = curl ? 26 + R() * 12 : 11 + R() * 6, col = cols[i % cols.length];
    const ph = R() * TAU, flipF = 6 + R() * 8, sway = 20 + R() * 36, swF = 2 + R() * 2.5, spin = (R() - 0.5) * 7, life = (o.life || 1.8) * (0.7 + R() * 0.5), k = 3, vt = 95;
    out.push(add({
      behind: o.behind, layer: o.layer, delay: (o.delay || 0) + R() * 0.05, life,
      draw(ctx, age, u) {
        const e = Math.exp(-k * age), s = Math.min(1, u / 0.04) * (u > 0.78 ? 1 - (u - 0.78) / 0.22 : 1);
        if (s < 0.06) return;
        const x = o.x + (vx * (1 - e)) / k + Math.sin(age * swF + ph) * sway * Math.min(1, age * 2), y = o.y + ((vy - vt) * (1 - e)) / k + vt * age;
        ctx.translate(x, y); ctx.rotate(ph + spin * age);
        ctx.lineWidth = 1.2; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round';
        const flip = Math.cos(age * flipF + ph), fy = Math.max(0.14, Math.abs(flip));
        ctx.beginPath();
        if (curl) {
          const pts = []; for (let j = 0; j <= 10; j++) { const t = j / 10; pts.push([Math.sin(t * TAU * 1.3 + age * 9 + ph) * 5 * s, (t - 0.5) * h * s]); }
          ribbon(ctx, pts, () => w * s);
        } else ctx.rect((-w / 2) * s, (-h / 2) * s * fy, w * s, h * s * fy);
        ctx.fillStyle = !curl && flip < 0 ? C.fxs : col; ctx.fill(); ctx.stroke();
      },
    }));
  }
  return out;
}

/* メラメラ (meramera), flames, burning the way fire does. The fire is a stream of teardrop cells fed from the base:
   each rises, sways more the higher it gets and shrinks as it goes, so the tips break off into loose wisps. All of
   them together make one inked silhouette. Inside it, a white heart at the bottom and screentone dots over the rest,
   the dots growing toward the tips, as fire is toned in manga; square embers jump up off it. Time is stepped at
   12 frames a second (on twos), like limited animation. It burns out by no longer feeding the base and letting the
   last cells rise away, never by fading. A pure function of its age: cell i is born at i / rate, its shape seeded by i.
   o: { x, y (middle of the base), w, h, color (the tone), behind, life } */
export function flame(o) {
  const W = o.w, H = o.h || 40, rate = clamp(W / 3.2, 14, 44), CL = 0.62, pitch = clamp(H / 13, 3.2, 5.2);
  const cell = i => {
    const u1 = hash(i, 1), u2 = hash(i, 2), off = (u1 + u2 - 1) * 0.5;                      // centre-weighted
    return { t: i / rate, L: CL * (0.75 + 0.4 * hash(i, 3)), off, r0: W * 0.2 * (0.7 + 0.5 * hash(i, 4)) * (1 - Math.abs(off) * 0.9), rise: 0.75 + 0.4 * hash(i, 5), ph: hash(i, 6) * TAU, tip: 1.5 + hash(i, 7) * 1.1 };
  };
  const it = add({
    behind: o.behind, layer: o.behind ? 'back' : o.layer, delay: o.delay, life: o.life || 2.2,
    draw(ctx, age) {
      // near its end the fire is fed smaller and lower, so it dies down into the base instead of lifting off
      const T = Math.floor(age * 12) / 12, dieAt = this.life === Infinity ? Infinity : this.life - CL, stop = dieAt;
      const live = [];
      for (let i = Math.max(0, Math.floor((T - CL * 1.2) * rate)); i <= Math.floor(T * rate); i++) {
        const c = cell(i); if (c.t > stop) break;
        const k = (T - c.t) / c.L; if (k < 0 || k >= 1) continue;
        const dim = clamp((dieAt - c.t) / 0.6, 0, 1), ramp = Math.min(1, c.t / 0.3 + 0.35) * dim, r = c.r0 * ramp * Math.pow(1 - k, 0.85) * Math.min(1, 0.45 + k * 5);
        if (r < 0.8) continue;
        const y = o.y - H * c.rise * Math.pow(k, 0.85) * (0.35 + 0.65 * ramp), x = o.x + c.off * W + Math.sin(T * 7 + c.ph) * (2 + W * 0.06) * k + (o.lean || 0) * k * H;
        live.push([x, y, r, r * c.tip, k, Math.sin(T * 9 + c.ph) * r * 0.55 * k]);
      }
      if (!live.length) return;
      // one cell: round below while it is low and fed, its tip flicking; as it rises its bottom draws to a point too, so
      // a wisp that breaks loose is a flame, pointed at both ends, not a falling drop
      const drop = (x, y, r, tl, k = 0, flick = 0) => {
        const pb = clamp((k - 0.55) / 0.35, 0, 1), tx = x + flick, ty = y - r - tl * 0.6, by = y + r * (1 + pb * 0.75), bx = x - flick * 0.4, sq = 1 - pb * 0.4;
        ctx.moveTo(tx, ty); ctx.quadraticCurveTo(x + r * 1.05, y - r * 0.7, x + r, y);
        ctx.quadraticCurveTo(x + r * sq, y + r * (0.95 - pb * 0.1), bx, by); ctx.quadraticCurveTo(x - r * sq, y + r * (0.95 - pb * 0.1), x - r, y);
        ctx.quadraticCurveTo(x - r * 1.05, y - r * 0.7, tx, ty);
      };
      const body = () => { ctx.beginPath(); for (const [x, y, r, tl, k, fl] of live) drop(x, y, r, tl, k, fl); };
      ctx.lineJoin = 'round';
      body(); ctx.lineWidth = 4.6; ctx.strokeStyle = C.ink; ctx.stroke();     // the outline of the whole fire: stroked wide, then filled over
      ctx.fillStyle = C.fxw; ctx.fill();
      // the tone: a dot grid clipped to the fire, the dots growing toward the tips
      ctx.save(); ctx.clip();
      let top = Infinity, l = Infinity, rgt = -Infinity; for (const [x, y, r, tl] of live) { top = Math.min(top, y - r - tl); l = Math.min(l, x - r); rgt = Math.max(rgt, x + r); }
      ctx.fillStyle = o.color || C.pink; ctx.beginPath();
      for (let gy = Math.floor(top / pitch) * pitch; gy <= o.y + pitch; gy += pitch) {
        const hf = clamp((o.y - gy) / H, 0, 1), rd = pitch * 0.5 * clamp(0.3 + hf * 0.95, 0, 0.95), shift = (Math.round(gy / pitch) % 2) * pitch / 2;
        for (let gx = Math.floor(l / pitch) * pitch + shift; gx <= rgt; gx += pitch) { ctx.moveTo(gx + rd, gy); ctx.arc(gx, gy, rd, 0, TAU); }
      }
      ctx.fill(); ctx.restore();
      // the white heart: the young cells, drawn smaller and sitting low
      ctx.beginPath(); for (const [x, y, r, tl, k, fl] of live) if (k < 0.5) drop(x, y + r * 0.25, r * 0.55, tl * 0.5, 0, fl * 0.5);
      ctx.fillStyle = C.fxw; ctx.fill();
      // embers: square, a pixel or three across, jumping up off the fire on twos
      ctx.fillStyle = C.ink;
      for (let j = Math.max(0, Math.floor((T - 0.7) * 7)); j <= Math.floor(T * 7); j++) {
        const t0 = j / 7, k = (T - t0) / 0.7; if (k < 0 || k >= 1 || t0 > stop) continue;
        const ex = Math.round(o.x + (hash(j, 11) - 0.5) * W * 0.9 + Math.sin(T * 9 + j) * 5), ey = Math.round(o.y - H * (0.55 + 0.75 * k)), es = Math.round(4 * (1 - k)) + 1;
        ctx.fillRect(ex - es / 2, ey - es / 2, es, es);
      }
    },
  });
  // ending a held fire lets the last cells finish rising: it needs at least their lifetime
  const end = it.end; it.end = f => end.call(it, Math.max(f || 0, CL + 0.65));
  return it;
}

/* 湯気 (yuge), steam: thin strands rising off something warm, the wave running up them as they go, each one fed from
   below and let go at the top, pointed at both ends. o: { x, y (middle of the base), w, h, n, color, life } */
export function steam(o) {
  const R = newR(), n = o.n || 3, H = o.h || 44, out = [];
  for (let i = 0; i < n; i++) {
    const bx = o.x + (n > 1 ? (i / (n - 1) - 0.5) * (o.w || 30) : 0), ph = R() * TAU, amp = 4 + R() * 3, d = i * 0.16 + R() * 0.06, life = (o.life || 1.4) * (0.85 + R() * 0.25);
    out.push(add({
      behind: o.behind, layer: o.layer, delay: (o.delay || 0) + d, life,
      draw(ctx, age, u) {
        const s1 = Math.min(1, E.outQuad(Math.min(1, u / 0.6))), s0 = E.inQuad(clamp((u - 0.3) / 0.7, 0, 1)), rise = u * H * 0.25;
        if (s1 - s0 < 0.03) return;
        const pts = [];
        for (let j = 0; j <= 16; j++) { const s = s0 + (s1 - s0) * (j / 16); pts.push([bx + Math.sin(s * 7.5 - age * 7 + ph) * amp * (0.35 + s), o.y - s * H - rise]); }
        ctx.beginPath(); ribbon(ctx, pts, t => (o.lw || 3.4) * Math.pow(Math.sin(Math.PI * t), 0.8));
        ctx.fillStyle = o.color || C.violet; ctx.fill();
      },
    }));
  }
  return out;
}

/* 氷結 (hyōketsu), frost: ice grows over something in a few beats, crystals sprouting from its corners and creeping
   along its edges, icicles hanging off the bottom; white facets inked in violet. Held (life: Infinity) while the
   thing stays frozen; it thaws by the crystals drawing back in. o: { box | el, n, life } */
export function frost(o) {
  const b = o.box || sideOf(o, o.el), R = newR(), X = [], { l, t, w, h } = b;
  // clusters of big crystals on the corners, a few smaller ones along the top, icicles off the bottom
  for (const [x, y, a] of [[l, t, -2.3], [l + w, t, -0.84], [l, t + h, 2.5], [l + w, t + h, 0.64]]) {
    const big = y === t;
    for (let j = 0; j < 3; j++) X.push({ x, y, a: a + (j - 1) * 0.5 + (R() - 0.5) * 0.2, L: (big ? 20 : 14) * (j === 1 ? 1.25 : 0.8) * (0.85 + R() * 0.3), d: Math.hypot(x - l, y - t) / Math.hypot(w, h) * 0.3 + j * 0.03 });
  }
  for (let i = 0, m = Math.max(1, Math.round(w / 90)); i < m; i++) { const x = l + w * (i + 0.5 + (R() - 0.5) * 0.4) / m; for (let j = 0; j < 2; j++) X.push({ x, y: t, a: -Math.PI / 2 + (j ? 0.45 : -0.35), L: 10 + R() * 6, d: 0.12 + (x - l) / w * 0.18 }); }
  for (let i = 0, m = Math.max(2, Math.round(w / 48)); i < m; i++) X.push({ x: l + w * (0.15 + 0.7 * (i + R() * 0.5) / m), y: t + h, a: Math.PI / 2, L: 10 + R() * 12, icicle: true, d: 0.2 + R() * 0.12 });
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life || 1.8,
    draw(ctx, age) {
      const back = leaving(this, age, 0.35);
      ctx.lineWidth = 1.6; ctx.strokeStyle = C.violet; ctx.lineJoin = 'round';
      for (const c of X) {
        const g = clamp((age - c.d) / 0.16, 0, 1), L = c.L * (g < 1 ? E.outBack(g) : 1) * back, wd = L * (c.icicle ? 0.3 : 0.3);
        if (L < 1.2) continue;
        const ca = Math.cos(c.a), sa = Math.sin(c.a), nx = -sa, ny = ca, x0 = c.x - ca * 3, y0 = c.y - sa * 3, x1 = c.x + ca * L, y1 = c.y + sa * L, mx = c.x + ca * L * 0.38, my = c.y + sa * L * 0.38;
        if (c.icicle) {
          ctx.beginPath(); ctx.moveTo(c.x - nx * wd, c.y - ny * wd); ctx.lineTo(x1, y1); ctx.lineTo(c.x + nx * wd, c.y + ny * wd); ctx.closePath(); ctx.fillStyle = C.fxw; ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(c.x + nx * wd * 0.1, c.y + ny * wd * 0.1); ctx.lineTo(x1, y1); ctx.lineTo(c.x + nx * wd, c.y + ny * wd); ctx.closePath(); ctx.fillStyle = C.lav; ctx.fill();
          continue;
        }
        // a long diamond, its shaded half in the tone, outlined
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(mx + nx * wd, my + ny * wd); ctx.lineTo(x1, y1); ctx.lineTo(mx - nx * wd, my - ny * wd); ctx.closePath(); ctx.fillStyle = C.fxw; ctx.fill();
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(mx + nx * wd, my + ny * wd); ctx.lineTo(x1, y1); ctx.closePath(); ctx.fillStyle = C.lav; ctx.fill();
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(mx + nx * wd, my + ny * wd); ctx.lineTo(x1, y1); ctx.lineTo(mx - nx * wd, my - ny * wd); ctx.closePath(); ctx.stroke();
      }
    },
  });
}

/* 流線 (ryūsen), the rush: dense parallel lines streaming past something that is going somewhere fast, the world
   flowing behind it. Drawn behind it (`behind`), so they show around it, not over it; they thin away at the end.
   o: { x, y, w, h (the thing's box, centre and size), angle (where it is going), n, len, behind, life } */
export function rush(o) {
  const R = newR(), n = amount(o.n || 26), ang = o.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang), span = Math.max(o.w, o.h) * 2.6 + 120, L = [];
  for (let i = 0; i < n; i++) L.push({ off: (R() - 0.5) * (Math.abs(ca) > 0.5 ? o.h : o.w) * 2.2, len: (o.len || 100) * (0.5 + R()), p: R(), w: 1.4 + R() * 2.2, sp: 1000 + R() * 700 });
  return add({
    behind: o.behind, layer: o.behind ? 'back' : o.layer, delay: o.delay, life: o.life || 0.7,
    draw(ctx, age) {
      const thin = leaving(this, age, 0.25), grow = Math.min(1, age / 0.08);
      ctx.beginPath();
      for (const l of L) {
        const along = span * 0.12 - ((l.p * span + l.sp * age) % span);   // flowing backwards past it, nearly all of them behind
        const cx = o.x + ca * along - sa * l.off, cy = o.y + sa * along + ca * l.off, half = (l.len * grow) / 2;
        const x0 = cx - ca * half, y0 = cy - sa * half, x1 = cx + ca * half, y1 = cy + sa * half, wd = l.w * thin;
        if (wd < 0.15) continue;
        ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx - sa * wd, cy + ca * wd, x1, y1); ctx.quadraticCurveTo(cx + sa * wd, cy - ca * wd, x0, y0);
      }
      ctx.fillStyle = o.color || C.ink; ctx.fill();
    },
  });
}

/* 風 (kaze), a gust: long strokes of wind sweeping across, each ending in a curl at its head, drawn on as it travels
   and eaten from the tail, with a leaf or two tumbling along. o: { x, y (where it starts), len, dir (1 right, -1
   left), n, h (the height it covers), leaves, life } */
export function gust(o) {
  const R = newR(), n = o.n || 3, dir = o.dir || 1, len = o.len || 220, hh = o.h || 60, out = [], paths = [];
  for (let i = 0; i < n; i++) {
    const y0 = o.y + (n > 1 ? (i / (n - 1) - 0.5) * hh : 0), bend = (R() - 0.5) * 22, rc = 7 + R() * 5, pts = [];
    for (let j = 0; j <= 30; j++) { const s = j / 30; pts.push([o.x + dir * len * 0.8 * s, y0 + Math.sin(s * Math.PI) * bend - s * 6]); }
    const [ex, ey] = pts[pts.length - 1], cx = ex, cy = ey - rc;
    for (let j = 1; j <= 16; j++) { const th = Math.PI / 2 - dir * (j / 16) * TAU * 0.95, rr = rc * (1 - j / 16 * 0.55); pts.push([cx + Math.cos(th) * rr * dir, cy + Math.sin(th) * rr]); }
    paths.push({ pts, d: i * 0.06 + R() * 0.04 });
  }
  out.push(add({
    behind: o.behind, layer: o.behind ? 'back' : o.layer, delay: o.delay, life: o.life || 0.75,
    draw(ctx, age) {
      ctx.fillStyle = o.color || C.ink;
      for (const P of paths) {
        const t = age - P.d, head = E.outCubic(clamp(t / 0.38, 0, 1)), tail = E.inQuad(clamp((t - 0.14) / 0.5, 0, 1));
        if (head - tail < 0.02) continue;
        const N = P.pts.length - 1, a = Math.floor(tail * N), b = Math.ceil(head * N), seg = P.pts.slice(a, b + 1);
        if (seg.length < 2) continue;
        ctx.beginPath(); ribbon(ctx, seg, u => (o.lw || 3) * Math.pow(Math.sin(Math.PI * u), 0.7)); ctx.fill();
      }
    },
  }));
  for (let i = 0; i < (o.leaves == null ? 2 : o.leaves); i++) {
    const P = paths[i % paths.length].pts, ph = R() * TAU, size = 7 + R() * 3, d = 0.05 + i * 0.1;
    out.push(add({
      behind: o.behind, layer: o.behind ? 'back' : o.layer, delay: (o.delay || 0) + d, life: 0.6,
      draw(ctx, age, u) {
        const N = P.length - 1, f = Math.min(N, Math.floor(E.outQuad(u) * N)), [x, y] = P[f], s = size * Math.min(1, u / 0.1, (1 - u) / 0.15);
        if (s < 0.5) return;
        ctx.translate(x, y + Math.sin(age * 14 + ph) * 6); ctx.rotate(ph + age * 14 * dir); ctx.scale(s, s * Math.max(0.25, Math.abs(Math.cos(age * 11 + ph))));
        ctx.beginPath(); ctx.moveTo(0, -1.15); ctx.quadraticCurveTo(0.85, -0.1, 0, 1); ctx.quadraticCurveTo(-0.85, -0.1, 0, -1.15); ctx.closePath();
        ctx.fillStyle = C.fxs; ctx.fill(); ctx.lineWidth = 1.5 / s; ctx.strokeStyle = C.ink; ctx.stroke();
      },
    }));
  }
  return out;
}

/* スポットライト (supottoraito), the spotlight: the rest of the page sinks under screentone and one cone of light comes
   down on the thing. It switches on with a flicker (on, off, on, on twos) and goes out by its dots shrinking away,
   never by fading. Held (life: Infinity) for a guided step; .end() puts it out. o: { x, y (the lit spot), r, box
   (the area that darkens, default the viewport), from: [x, y] (where the light comes from), pitch, life } */
let dotTile = null, dotKey = '', paperKey = '', paperDark = false;
// a dark page (the dark theme) sinks under black dots; ink would be the light colour there and lift it instead
function sinkColour() {
  if (paperKey !== C.paper) { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = C.paper; const h = c.fillStyle, n = h[0] === '#' ? parseInt(h.slice(1, 7), 16) : 0xffffff; paperDark = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 110; paperKey = C.paper; }
  return paperDark ? '#000' : C.ink;
}
function dots(ctx, pitch, rad) {
  const ink = sinkColour(), key = pitch + ':' + rad.toFixed(2) + ':' + ink;
  if (key !== dotKey) {
    dotTile = dotTile || document.createElement('canvas'); const d = Math.ceil(pitch * 2); dotTile.width = dotTile.height = d;
    const c = dotTile.getContext('2d'); c.clearRect(0, 0, d, d); c.fillStyle = ink; c.scale(d / pitch / 2, d / pitch / 2);
    for (const [x, y] of [[pitch / 2, pitch / 2], [pitch * 1.5, pitch * 1.5], [pitch * 1.5, pitch / 2], [pitch / 2, pitch * 1.5]]) { c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill(); }
    dotKey = key;
  }
  const p = ctx.createPattern(dotTile, 'repeat'); p.setTransform(new DOMMatrix().scale(pitch * 2 / dotTile.width)); return p;
}
export function spotlight(o) {
  const pitch = o.pitch || 6, r = o.r || 60;
  return add({
    behind: o.behind, layer: o.layer, delay: o.delay, life: o.life || 1.8, keep: o.life === Infinity,
    draw(ctx, age) {
      const tw = Math.floor(age * 12);
      if (tw === 1) return;                                                // the flicker: on, off, on
      const out = leaving(this, age, 0.3), rad = pitch * (paperDark ? 0.4 : 0.3) * out;
      if (rad < 0.12) return;
      const B = o.box || { l: scrollX, t: scrollY, w: innerWidth, h: innerHeight }, [fx, fy] = o.from || [o.x, B.t - 20], rx = r, ry = r * 0.42;
      const g = clamp(age / 0.1, 0, 1), spread = rx * (0.92 + 0.08 * g);
      ctx.beginPath(); ctx.rect(B.l, B.t, B.w, B.h);
      // the cone: narrow at the lamp, as wide as the pool where it lands, then the pool itself
      ctx.moveTo(fx - rx * 0.16, fy); ctx.lineTo(o.x - spread, o.y); ctx.ellipse(o.x, o.y, spread, ry, 0, Math.PI, 0, true); ctx.lineTo(fx + rx * 0.16, fy); ctx.closePath();
      ctx.fillStyle = dots(ctx, pitch, rad); ctx.fill('evenodd');
    },
  });
}

/* 音符 (onpu), notes: a quaver or a pair of beamed ones rising off something that is playing, rocking from side to
   side on twos, inked with a paper keyline so they read on any ground; each shrinks away at the top.
   o: { x, y, n, size, life } */
export function notes(o) {
  const R = newR(), out = [];
  for (let i = 0, n = o.n || 3; i < n; i++) {
    const pair = i % 2 === 1, sz = (o.size || 15) * (0.85 + R() * 0.3), dx = 10 + i * 16 + (R() - 0.5) * 12, ph = R() * TAU, life = (o.life || 1.3) * (0.85 + R() * 0.3);
    out.push(add({
      behind: o.behind, layer: o.layer, delay: (o.delay || 0) + i * 0.26, life,
      draw(ctx, age, u) {
        const s = sz * (u < 0.12 ? E.outBack(u / 0.12) : 1) * (u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1);
        if (s < 1) return;
        ctx.translate(o.x + dx * E.outQuad(u) + Math.sin(age * 5 + ph) * 7, o.y - E.outQuad(u) * 74); ctx.rotate((Math.floor(age * 12) % 2 ? 1 : -1) * 0.2); ctx.scale(s / 16, s / 16);
        const head = (x, y) => { ctx.moveTo(x + 5, y); ctx.ellipse(x, y, 5, 3.6, -0.45, 0, TAU); };
        ctx.beginPath();
        if (pair) { head(-6, 8); head(8, 5); ctx.rect(-2, -14, 2.4, 22); ctx.rect(12, -17, 2.4, 22); ctx.moveTo(-2, -14); ctx.lineTo(14.4, -17); ctx.lineTo(14.4, -12); ctx.lineTo(-2, -9); ctx.closePath(); }
        else { head(0, 8); ctx.rect(4, -14, 2.4, 22); ctx.moveTo(6.4, -14); ctx.quadraticCurveTo(12, -8, 11, 0); ctx.quadraticCurveTo(10, -6, 6.4, -8); ctx.closePath(); }
        ctx.lineWidth = 4.5; ctx.strokeStyle = C.paper; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.fillStyle = C.ink; ctx.fill();
      },
    }));
  }
  return out;
}
