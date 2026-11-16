/* Sakuga SND: every sound is synthesised with WebAudio, no audio files.
   A sound is a function (context, output, startTime, params), so one recipe can play live or be
   rendered offline for checking. Nothing is created until the first user gesture. */
import { config, onConfig } from './config.js';

let ctx = null, master = null;
const bufs = new WeakMap();
const rnd = (a, b) => a + Math.random() * (b - a);

function noiseBuf(c) {
  let b = bufs.get(c);
  if (!b) {
    b = c.createBuffer(1, Math.floor(c.sampleRate * 1.5), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    bufs.set(c, b);
  }
  return b;
}
function env(g, t, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
// oscillator with pitch glide and a percussive envelope; lp adds a low-pass
function tone(c, out, t, o) {
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide || o.dur));
  env(g, t, o.a || 0.004, o.gain == null ? 0.3 : o.gain, o.dur);
  if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + 0.05); }
  if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); f.connect(g); } else osc.connect(g);
  g.connect(out); osc.start(t); osc.stop(t + o.dur + 0.05);
}
// filtered noise burst with an optional filter sweep
function noise(c, out, t, o) {
  const src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuf(c); src.loop = true;
  fl.type = o.type || 'bandpass'; fl.Q.value = o.q == null ? 1 : o.q;
  fl.frequency.setValueAtTime(o.f || 1000, t);
  if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide || o.dur));
  env(g, t, o.a || 0.004, o.gain == null ? 0.3 : o.gain, o.dur);
  src.connect(fl); fl.connect(g); g.connect(out);
  src.start(t, Math.random()); src.stop(t + o.dur + 0.05);
}
const bell = (c, out, t, f, gain = 0.15, dur = 0.45) => { tone(c, out, t, { f, dur, gain }); tone(c, out, t, { f: f * 2.01, dur: dur * 0.45, gain: gain * 0.25 }); };

/* ---------- recipes ---------- */
const S = {
  // ドン!  heavy hit: sub thump, body, crack, a few shards
  boom(c, o, t) {
    tone(c, o, t, { f: 150, f1: 38, dur: 0.42, gain: 0.9, a: 0.002 });
    tone(c, o, t, { type: 'triangle', f: 92, f1: 30, dur: 0.3, gain: 0.45 });
    noise(c, o, t, { type: 'lowpass', f: 1800, f1: 160, dur: 0.28, gain: 0.5 });
    noise(c, o, t, { type: 'highpass', f: 3000, dur: 0.05, gain: 0.22 });
    for (let i = 0; i < 5; i++) tone(c, o, t + 0.09 + i * 0.05 + rnd(0, 0.03), { f: rnd(2200, 5200), dur: 0.12, gain: 0.045 });
  },
  // ジャーン!  cymbal crash over a bright chord
  crash(c, o, t) {
    tone(c, o, t, { f: 130, f1: 45, dur: 0.3, gain: 0.6, a: 0.002 });
    noise(c, o, t, { type: 'highpass', f: 4200, dur: 1.0, gain: 0.26, a: 0.006 });
    noise(c, o, t, { type: 'bandpass', f: 7000, q: 0.6, dur: 0.6, gain: 0.14 });
    [523, 659, 784, 1047].forEach((f, i) => tone(c, o, t + i * 0.012, { type: 'triangle', f, dur: 0.75, gain: 0.1 }));
  },
  // ガッ  blocked, dull
  clunk(c, o, t) {
    tone(c, o, t, { type: 'square', f: 140, f1: 70, dur: 0.12, gain: 0.22, lp: 900 });
    tone(c, o, t, { f: 92, f1: 50, dur: 0.16, gain: 0.55 });
    noise(c, o, t, { f: 500, q: 1.5, dur: 0.08, gain: 0.4 });
  },
  // ズバッ  blade: rising whoosh then a metallic ring
  slash(c, o, t) {
    noise(c, o, t, { f: 700, f1: 7000, q: 1.2, dur: 0.14, gain: 0.95, a: 0.012 });
    noise(c, o, t + 0.06, { type: 'highpass', f: 5000, dur: 0.2, gain: 0.2 });
    [[3300, 0.11], [4950, 0.08], [6100, 0.05]].forEach(([f, g]) => tone(c, o, t + 0.07, { f, dur: 0.4, gain: g }));
  },
  slashBig(c, o, t) { S.slash(c, o, t); tone(c, o, t + 0.05, { f: 112, f1: 45, dur: 0.3, gain: 0.6 }); },
  // カチッ  two-part latch: "ka" then "chi"
  click(c, o, t, p = {}) {
    const k = p.low ? 0.72 : 1;
    tone(c, o, t, { type: 'square', f: 2400 * k, dur: 0.018, gain: 0.14 });
    noise(c, o, t, { type: 'highpass', f: 4000, dur: 0.012, gain: 0.3 });
    tone(c, o, t + 0.045, { type: 'triangle', f: 1500 * k, dur: 0.03, gain: 0.25 });
    noise(c, o, t + 0.045, { type: 'highpass', f: 2500, dur: 0.02, gain: 0.25 });
    tone(c, o, t + 0.045, { f: 320 * k, f1: 160 * k, dur: 0.05, gain: 0.25 });
  },
  // シュッ スッ
  swish(c, o, t, p = {}) {
    if (p.small) noise(c, o, t, { f: 1200, f1: 5000, q: 0.9, dur: 0.12, gain: 0.5, a: 0.02, glide: 0.08 });
    else noise(c, o, t, { f: 500, f1: 4200, q: 0.9, dur: 0.2, gain: 0.8, a: 0.03, glide: 0.12 });
  },
  // ポン
  pop(c, o, t) {
    tone(c, o, t, { f: 330, f1: 880, glide: 0.05, dur: 0.13, gain: 0.5 });
    tone(c, o, t, { f: 660, f1: 1760, glide: 0.05, dur: 0.06, gain: 0.12 });
  },
  // ドキッ  two heart thumps
  doki(c, o, t) {
    tone(c, o, t, { f: 98, f1: 55, dur: 0.12, gain: 0.8, a: 0.003 });
    tone(c, o, t + 0.13, { f: 112, f1: 60, dur: 0.14, gain: 0.65, a: 0.003 });
    bell(c, o, t + 0.13, 1568, 0.06, 0.3);
  },
  // ピョン  springy hop
  boing(c, o, t) {
    tone(c, o, t, { f: 260, f1: 780, glide: 0.16, dur: 0.22, gain: 0.32, vib: [28, 26] });
    tone(c, o, t + 0.16, { type: 'triangle', f: 780, f1: 520, dur: 0.08, gain: 0.14 });
  },
  // キラッ パァッ! パァァ!
  shine(c, o, t) { [1568, 2093, 2637].forEach((f, i) => bell(c, o, t + i * 0.05, f, 0.15)); },
  shineUp(c, o, t) {
    noise(c, o, t, { type: 'highpass', f: 3000, dur: 0.3, gain: 0.1, a: 0.12 });
    tone(c, o, t, { type: 'triangle', f: 392, f1: 1175, glide: 0.18, dur: 0.25, gain: 0.18 });
    [1175, 1568, 2349].forEach((f, i) => bell(c, o, t + 0.16 + i * 0.045, f, 0.13));
  },
  shineBig(c, o, t) {
    [523, 659, 784].forEach(f => tone(c, o, t, { type: 'triangle', f, dur: 0.7, gain: 0.07 }));
    [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => bell(c, o, t + i * 0.055, f, 0.13, 0.55));
    noise(c, o, t, { type: 'highpass', f: 5000, dur: 0.6, gain: 0.07, a: 0.05 });
  },
  // ポフ プスッ シュン  things deflating
  puff(c, o, t) { noise(c, o, t, { type: 'lowpass', f: 1400, f1: 300, dur: 0.16, gain: 0.5, a: 0.01 }); tone(c, o, t, { f: 240, f1: 120, dur: 0.1, gain: 0.2 }); },
  fizz(c, o, t) { noise(c, o, t, { type: 'highpass', f: 6000, f1: 2500, dur: 0.22, gain: 0.22 }); tone(c, o, t, { f: 700, f1: 250, dur: 0.12, gain: 0.1 }); },
  droop(c, o, t) { tone(c, o, t, { type: 'triangle', f: 620, f1: 210, glide: 0.28, dur: 0.32, gain: 0.22 }); noise(c, o, t, { type: 'lowpass', f: 800, dur: 0.2, gain: 0.1, a: 0.03 }); },
  // シーン…  the ring of silence
  hush(c, o, t) {
    tone(c, o, t, { f: 2960, dur: 1.0, gain: 0.035, a: 0.3 });
    tone(c, o, t, { f: 2985, dur: 1.0, gain: 0.025, a: 0.35 });
    noise(c, o, t, { type: 'lowpass', f: 400, dur: 0.9, gain: 0.06, a: 0.3 });
  },
  // ゴ  one rumble per letter, each a step higher
  rumble(c, o, t, p = {}) {
    const base = 46 * (1 + 0.18 * (p.n || 0));
    tone(c, o, t, { type: 'sawtooth', f: base, f1: base * 0.9, dur: 0.36, gain: 0.3, lp: 240, a: 0.02, vib: [22, 5] });
    tone(c, o, t, { f: base / 2, dur: 0.36, gain: 0.5, a: 0.02 });
    noise(c, o, t, { type: 'lowpass', f: 180, dur: 0.3, gain: 0.5, a: 0.02 });
  },
  // グルグル
  whirl(c, o, t) { tone(c, o, t, { type: 'triangle', f: 400, f1: 520, dur: 1.1, gain: 0.09, a: 0.1, vib: [8, 130] }); },

  /* ---- moments without lettering ---- */
  squash(c, o, t) { tone(c, o, t, { f: 300, f1: 120, glide: 0.07, dur: 0.09, gain: 0.3 }); },
  whoosh(c, o, t) { noise(c, o, t, { f: 300, f1: 2600, q: 0.7, dur: 0.22, gain: 0.75, a: 0.06 }); },
  thud(c, o, t) { tone(c, o, t, { f: 170, f1: 70, dur: 0.1, gain: 0.6 }); noise(c, o, t, { type: 'lowpass', f: 600, dur: 0.05, gain: 0.3 }); },
  land(c, o, t) { tone(c, o, t, { f: 190, f1: 90, dur: 0.07, gain: 0.35 }); tone(c, o, t, { type: 'triangle', f: 1300, dur: 0.02, gain: 0.1 }); },
  splash(c, o, t) {
    noise(c, o, t, { f: 2400, f1: 700, q: 0.6, dur: 0.45, gain: 0.62, a: 0.01 });
    for (let i = 0; i < 9; i++) { const f = rnd(500, 1900); tone(c, o, t + rnd(0.03, 0.4), { f, f1: f * 1.5, dur: 0.05, gain: 0.08 }); }
  },
  fill(c, o, t) { tone(c, o, t, { f: 240, f1: 900, glide: 0.14, dur: 0.18, gain: 0.22 }); noise(c, o, t, { f: 900, f1: 2400, dur: 0.16, gain: 0.2, a: 0.02 }); },
  drain(c, o, t) {
    tone(c, o, t, { f: 800, f1: 180, glide: 0.4, dur: 0.45, gain: 0.16 });
    for (let i = 0; i < 6; i++) { const f = 1400 - i * 170; tone(c, o, t + 0.04 + i * 0.06, { f, f1: f * 0.7, dur: 0.05, gain: 0.07 }); }
  },
  ting(c, o, t, p = {}) { bell(c, o, t, p.f || 2637, 0.14, 0.5); },
  tick(c, o, t, p = {}) { tone(c, o, t, { type: 'triangle', f: p.f || 1300, dur: 0.025, gain: 0.18 }); },
  tinkle(c, o, t) { for (let i = 0; i < 6; i++) tone(c, o, t + rnd(0, 0.3), { f: rnd(2500, 6000), dur: 0.08, gain: 0.08 }); },
  ok(c, o, t) { tone(c, o, t, { type: 'triangle', f: 784, dur: 0.09, gain: 0.2 }); tone(c, o, t + 0.08, { type: 'triangle', f: 1175, dur: 0.18, gain: 0.2 }); },
  fanfare(c, o, t) {
    [[523, 0], [659, 0.08], [784, 0.16], [1047, 0.26]].forEach(([f, d], i) => {
      tone(c, o, t + d, { type: 'triangle', f, dur: i === 3 ? 0.45 : 0.12, gain: 0.18 });
      tone(c, o, t + d, { type: 'square', f, dur: i === 3 ? 0.3 : 0.08, gain: 0.04, lp: 2400 });
    });
    bell(c, o, t + 0.3, 2093, 0.1, 0.5);
  },
  step(c, o, t, p = {}) { const k = (p.p || 0) / 100; noise(c, o, t, { f: 600 + 1100 * k, q: 2, dur: 0.035, gain: 0.16 }); tone(c, o, t, { f: 140 + 150 * k, dur: 0.04, gain: 0.12 }); },
  note(c, o, t, p = {}) { const f = [784, 880, 1047, 1175, 1319][p.k || 0]; tone(c, o, t, { type: 'triangle', f, dur: 0.16, gain: 0.2 }); tone(c, o, t, { f: f * 2, dur: 0.1, gain: 0.05 }); },
  unstar(c, o, t) { tone(c, o, t, { type: 'triangle', f: 500, f1: 300, dur: 0.06, gain: 0.1 }); },
  crack(c, o, t) { noise(c, o, t, { type: 'highpass', f: 2000, dur: 0.05, gain: 0.4 }); tone(c, o, t, { type: 'square', f: 200, f1: 80, dur: 0.08, gain: 0.16, lp: 1200 }); },
  wipeDark(c, o, t) { tone(c, o, t, { f: 700, f1: 160, glide: 0.45, dur: 0.5, gain: 0.12 }); noise(c, o, t, { type: 'lowpass', f: 1200, f1: 200, dur: 0.5, gain: 0.12, a: 0.05 }); },
  tap(c, o, t) { tone(c, o, t, { type: 'triangle', f: 520, f1: 300, dur: 0.05, gain: 0.22 }); noise(c, o, t, { type: 'highpass', f: 3000, dur: 0.015, gain: 0.12 }); },
  key(c, o, t) { noise(c, o, t, { type: 'highpass', f: 2600, dur: 0.014, gain: 0.14 }); tone(c, o, t, { type: 'triangle', f: rnd(900, 1300), dur: 0.016, gain: 0.07 }); },
  buzz(c, o, t) { tone(c, o, t, { type: 'sawtooth', f: 118, dur: 0.12, gain: 0.2, lp: 700 }); tone(c, o, t + 0.14, { type: 'sawtooth', f: 104, dur: 0.16, gain: 0.2, lp: 700 }); },
  pick(c, o, t) { tone(c, o, t, { type: 'triangle', f: 1175, dur: 0.05, gain: 0.18 }); tone(c, o, t + 0.04, { type: 'triangle', f: 1568, dur: 0.07, gain: 0.14 }); },
  flip(c, o, t) { noise(c, o, t, { f: 1800, f1: 600, q: 0.8, dur: 0.11, gain: 0.5, a: 0.01 }); },
  open(c, o, t) { noise(c, o, t, { f: 400, f1: 2200, q: 0.7, dur: 0.14, gain: 0.5, a: 0.03 }); tone(c, o, t + 0.1, { f: 150, f1: 70, dur: 0.1, gain: 0.45 }); },
  close(c, o, t) { noise(c, o, t, { f: 2200, f1: 400, q: 0.7, dur: 0.14, gain: 0.45, a: 0.01 }); },
  stamp(c, o, t) { tone(c, o, t, { f: 210, f1: 90, dur: 0.08, gain: 0.5 }); noise(c, o, t, { type: 'lowpass', f: 900, dur: 0.04, gain: 0.3 }); tone(c, o, t + 0.02, { type: 'triangle', f: 1047, dur: 0.1, gain: 0.1 }); },
  wipeLight(c, o, t) { tone(c, o, t, { f: 260, f1: 1100, glide: 0.3, dur: 0.36, gain: 0.12 }); noise(c, o, t, { type: 'highpass', f: 2000, dur: 0.35, gain: 0.08, a: 0.15 }); },
};

const WORDS = {
  'ドン!': ['boom'], 'ジャーン!': ['crash'], 'ガッ': ['clunk'], 'ズバッ': ['slash'], 'ザンッ!': ['slashBig'],
  'カチッ!': ['click'], 'カチッ': ['click', { low: 1 }], 'シュッ': ['swish'], 'スッ': ['swish', { small: 1 }],
  'ポン!': ['pop'], 'ポン': ['pop'], 'ドキッ': ['doki'], 'ピョン': ['boing'],
  'キラッ': ['shine'], 'パァッ!': ['shineUp'], 'パァァ!': ['shineBig'],
  'ターン!': ['click'], 'ブブッ': ['buzz'], 'パカッ': ['pop'], 'バーン!': ['boom'], 'ピッ': ['pick'], 'ペタッ': ['stamp'], 'ペラッ': ['flip'],
  'サッ': ['swish', { small: 1 }],
  'ポフ': ['puff'], 'プスッ': ['fizz'], 'シュン': ['droop'], 'シーン…': ['hush'], 'ゴ': ['rumble'], 'グルグル': ['whirl'],
};
const VOICE = { impact: 'boom', cut: 'slash', click: 'click', swish: 'swish', pop: 'pop', shine: 'shine', soft: 'puff', hush: 'hush', rumble: 'rumble', spin: 'whirl' };

/* ---------- live context ---------- */
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = config.sound ? config.volume : 0.0001;
    master.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}
// sounds asked for before the first user gesture are dropped, never queued
const ready = () => config.sound && ctx && ctx.state !== 'closed';
// the same sound is never started twice within 28 ms, and bursts are capped, so a storm of events stays cheap
const lastAt = {};
let burstT = 0, burstN = 0;
export function play(name, p, delay = 0) {
  if (!ready() || !S[name]) return;
  const n = ctx.currentTime;
  if (!delay && n - (lastAt[name] || -1) < 0.028) return;
  if (n - burstT > 0.12) { burstT = n; burstN = 0; }
  if (++burstN > 14) return;
  lastAt[name] = n;
  S[name](ctx, master, n + 0.005 + delay, p || {});
}
export function word(text, o = {}) {
  const w = WORDS[text];
  if (w) play(w[0], text === 'ゴ' ? { n: Math.round(((o.size || 30) - 30) / 10) } : w[1]);
  else if (VOICE[o.voice]) play(VOICE[o.voice]);
}

// continuous sounds that follow a value: slider drag, charge, spinner
const NONE = { set() {}, stop() {} };
export function loop(kind) {
  if (!ready()) return NONE;
  const t = ctx.currentTime, g = ctx.createGain(), fl = ctx.createBiquadFilter(), nodes = [];
  g.gain.value = 0.0001; g.connect(master); fl.connect(g);
  let set = () => {};
  if (kind === 'drag') {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf(ctx); src.loop = true;
    fl.type = 'bandpass'; fl.Q.value = 0.8; fl.frequency.value = 600;
    src.connect(fl); src.start(t); nodes.push(src);
    set = v => { if (!Number.isFinite(v)) return; const n = ctx.currentTime; g.gain.setTargetAtTime(0.3 * v, n, 0.03); fl.frequency.setTargetAtTime(500 + 2800 * v, n, 0.05); };
  } else if (kind === 'charge') {
    const saw = ctx.createOscillator(), sub = ctx.createOscillator();
    saw.type = 'sawtooth'; fl.type = 'lowpass'; fl.frequency.value = 300;
    saw.connect(fl); sub.connect(fl); saw.start(t); sub.start(t); nodes.push(saw, sub);
    set = v => { if (!Number.isFinite(v)) return; const n = ctx.currentTime, f = 70 + 270 * v * v; saw.frequency.setTargetAtTime(f, n, 0.03); sub.frequency.setTargetAtTime(f / 2, n, 0.03); fl.frequency.setTargetAtTime(300 + 1900 * v, n, 0.05); g.gain.setTargetAtTime(0.04 + 0.2 * v, n, 0.04); };
    set(0);
  } else if (kind === 'spin') {
    const src = ctx.createBufferSource(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    src.buffer = noiseBuf(ctx); src.loop = true;
    fl.type = 'bandpass'; fl.Q.value = 2.2; fl.frequency.value = 900;
    lfo.frequency.value = 3; lg.gain.value = 520; lfo.connect(lg); lg.connect(fl.frequency);
    src.connect(fl); src.start(t); lfo.start(t); nodes.push(src, lfo);
    g.gain.setTargetAtTime(0.16, t, 0.08);
  }
  return {
    set,
    stop() { const n = ctx.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0.0001, n, 0.03); nodes.forEach(x => x.stop(n + 0.25)); set = () => {}; this.set = set; },
  };
}

// render one recipe offline and measure it; used to check that nothing is silent or clipping
export async function test(name, p) {
  const sr = 44100, oc = new OfflineAudioContext(1, Math.floor(sr * 1.6), sr);
  S[name](oc, oc.destination, 0.01, p || {});
  const d = (await oc.startRendering()).getChannelData(0);
  let peak = 0, sum = 0, last = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += a * a; if (a > 0.002) last = i; }
  return { name, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), dur: +(last / sr).toFixed(2) };
}


if (typeof addEventListener === 'function') {
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);
}
onConfig(c => { if (master) master.gain.setTargetAtTime(c.sound ? c.volume : 0.0001, ctx.currentTime, 0.02); });

export const names = Object.keys(S);
export const words = WORDS;
export const state = () => (ctx ? ctx.state : 'none');
