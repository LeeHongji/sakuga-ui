# Original score for 《第 1 话》, synthesised in code (numpy + scipy). 150 BPM, A major, 33 bars = 52.8 s.
# Sections follow the shot boundaries in plan.json; hits sit on the film's key frames. Fixed seed: reruns are identical.
#   usage: score.py OUT.wav
import sys, json, pathlib
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000; BPM = 150; BEAT = 60 / BPM; BAR = 4 * BEAT
PLAN = json.loads((pathlib.Path(__file__).resolve().parents[1] / 'plan.json').read_text())
DUR = PLAN['duration']; N = int(DUR * SR) + SR * 2
rng = np.random.default_rng(150)
bus = {k: np.zeros((N, 2)) for k in ['drums', 'bass', 'keys', 'lead', 'fx', 'send']}

def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, f1, f2, o=2): return sosfilt(butter(o, [f1, f2], 'band', fs=SR, output='sos'), x)
def put(name, t, sig, gain=1.0, pan=0.0, send=0.0):
    i = int(round(t * SR))
    if i >= N or i < 0: return
    sig = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[name][i:i + len(sig), 0] += sig * l * 1.414; bus[name][i:i + len(sig), 1] += sig * r * 1.414
    if send: bus['send'][i:i + len(sig), 0] += sig * l * send; bus['send'][i:i + len(sig), 1] += sig * r * send
def tt(d): return np.arange(int(d * SR)) / SR
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def saw(f, d, det=0.0):
    t = tt(d); ph = (f * (1 + det)) * t + rng.random(); return 2 * (ph % 1) - 1
def env(d, a=0.005, dec=0.2, sus=0.0, rel=0.05):
    t = tt(d); e = np.minimum(1, t / a) * (sus + (1 - sus) * np.exp(-t / dec))
    r = int(rel * SR); e[-r:] *= np.linspace(1, 0, r) if r < len(e) else 1; return e

# ---- instruments ----
def kick(t, g=1.0):
    d = 0.42; x = tt(d); f = 46 + 110 * np.exp(-x / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.16)
    s[:240] += rng.standard_normal(240) * np.linspace(0.5, 0, 240)
    put('drums', t, np.tanh(s * 1.6) * 0.9, g)
def snare(t, g=1.0):
    d = 0.26; x = tt(d); n = bp(rng.standard_normal(len(x)), 900, 6500) * np.exp(-x / 0.07)
    body = np.sin(2 * np.pi * 190 * x) * np.exp(-x / 0.05)
    put('drums', t, (n * 0.9 + body * 0.6) * 0.75, g, 0.05, 0.25)
def clap(t, g=1.0):
    d = 0.3; x = tt(d); n = bp(rng.standard_normal(len(x)), 1100, 3800)
    e = sum(np.exp(-np.maximum(0, x - o) / 0.012) * (x >= o) for o in (0, 0.011, 0.022)) * 0.4 + np.exp(-x / 0.09) * (x >= 0.03)
    put('drums', t, n * e * 0.55, g, -0.05, 0.35)
def hat(t, g=1.0, open_=False):
    d = 0.25 if open_ else 0.06; x = tt(d); s = hp(rng.standard_normal(len(x)), 7500) * np.exp(-x / (0.08 if open_ else 0.018))
    put('drums', t, s * 0.38, g, 0.3)
def crash(t, g=1.0):
    d = 2.2; x = tt(d); s = hp(rng.standard_normal(len(x)), 4200) * np.exp(-x / 0.7)
    put('drums', t, s * 0.42, g, -0.2, 0.4)
def tom(t, n, g=1.0):
    d = 0.3; x = tt(d); f = hz(n) * (1 + 0.5 * np.exp(-x / 0.03)); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.12)
    put('drums', t, s * 0.7, g, (n - 45) / 20)
def bass(t, n, d, g=1.0):
    s = saw(hz(n), d) * 0.6 + np.sin(2 * np.pi * hz(n) * tt(d)) * 0.7
    put('bass', t, lp(s, 700) * env(d, 0.004, 0.25, 0.55, 0.03) * 0.55, g)
def stab(t, notes, d=0.2, g=1.0):
    s = sum(saw(hz(n), d, det) for n in notes for det in (-0.006, 0, 0.007)) / (3 * len(notes))
    put('keys', t, lp(s, 3200) * env(d, 0.003, 0.09, 0.2, 0.04) * 0.9, g, 0.0, 0.35)
def pad(t, notes, d, g=1.0):
    s = sum(saw(hz(n), d, det) for n in notes for det in (-0.004, 0.0035)) / (2 * len(notes))
    e = np.minimum(1, tt(d) / 0.12); e[-int(0.1 * SR):] *= np.linspace(1, 0, int(0.1 * SR))
    put('keys', t, lp(s, 1500) * e * 0.32, g, 0, 0.5)
def pluck(t, n, g=1.0, pan=0.0):
    d = 0.32; x = tt(d); s = (saw(hz(n), d) * 0.5 + np.sin(2 * np.pi * hz(n) * x)) * np.exp(-x / 0.07)
    put('keys', t, lp(s, 5200) * 0.34, g, pan, 0.4)
def lead(t, n, d, g=1.0):
    x = tt(d); f = hz(n) * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * x) * np.minimum(1, x / 0.15))
    ph = np.cumsum(f) / SR; s = np.where((ph % 1) < 0.35, 1.0, -1.0) * 0.5 + np.sin(2 * np.pi * ph) * 0.5
    put('lead', t, lp(s, 3600) * env(d, 0.01, 0.4, 0.6, 0.06) * 0.3, g, 0.1, 0.45)
def riser(t, d, g=1.0):
    x = tt(d); s = bp(rng.standard_normal(len(x)), 1500, 9000) * (x / d) ** 2.2
    put('fx', t, s * 0.35, g, 0, 0.3)
def impact(t, g=1.0):
    d = 1.4; x = tt(d); f = 32 + 60 * np.exp(-x / 0.08); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.5)
    put('fx', t, s * 0.9, g)

# ---- harmony: A major, I V vi IV ----
A, E, Fs, D, Bm = (57, [57, 61, 64, 69]), (52, [56, 59, 64, 68]), (54, [57, 61, 66, 69]), (50, [57, 62, 66, 69]), (47, [59, 62, 66, 71])
PROG = [A, E, Fs, D]
def chord_at(bar):
    if bar >= 31.25: return A
    if bar >= 30: return E
    if bar >= 29: return D
    if 26 <= bar < 29: return [D, E, Fs, E][int(bar) - 26]
    return PROG[int(bar) % 4]

def b(x): return x * BAR   # bars to seconds
def groove(b0, b1, hats=True, stabs=True, arp=False, lead_line=None, kick_g=1.0, four=True):
    beat = b0 * 4
    while beat < b1 * 4 - 1e-9:
        t = beat * BEAT; bar = beat / 4; root, notes = chord_at(bar)
        if four or beat % 2 == 0: kick(t, kick_g)
        if beat % 4 in (1, 3): clap(t) if beat % 8 == 7 else snare(t)
        if hats: hat(t + BEAT / 2); hat(t + BEAT / 4, 0.45); hat(t + 3 * BEAT / 4, 0.45)
        for k in (0, 1): bass(t + k * BEAT / 2, root + (12 if k else 0) - 12 * (root > 52), BEAT / 2 * 0.9)
        if stabs and beat % 4 in (1, 3): stab(t + BEAT / 2, notes, 0.18)
        if arp:
            for k in range(4): pluck(t + k * BEAT / 4, notes[(int(beat) * 4 + k) % 4] + 12, 0.8, -0.3 + 0.2 * k)
        beat += 1
    if lead_line:
        for (bb, n, d) in lead_line: lead(b(bb), n, d * BEAT)

# ---- arrangement (bars; 1 bar = 1.6 s) ----
# cover 0–2.5: arp pickup, hit on the press at bar 1 (1.6 s), light groove, fill into the page turn
for k in range(16): pluck(k * BEAT / 4, A[1][k % 4] + 12, 0.35 + 0.65 * k / 16, -0.2 + 0.4 * (k % 2))
riser(0.2, 1.4)
crash(b(1)); impact(b(1), 0.8); stab(b(1), A[1], 0.5, 1.3)
groove(1, 2, hats=False, stabs=False)
for k in range(8): snare(b(2) + k * BEAT / 4, 0.35 + 0.08 * k)
riser(b(2), 0.8, 0.8)
# press + forms 2.5–9: groove A, crash on each shot change
crash(b(2.5)); groove(2.5, 9, arp=False)
crash(b(6)); stab(b(6), Fs[1], 0.3, 1.1)
# lettering 9–12: drums hit with each word, then silence for シーン… (18.4 s = bar 11.5)
crash(b(9)); impact(b(9), 0.6)
groove(9, 10.75, hats=True, stabs=True)
pad(b(9), A[1], b(2.5))
for k, n in enumerate([45, 43, 40]): tom(b(10.75) + k * BEAT / 3, n, 0.8)
# 11.0–11.5: only a held pad note fading; 11.5–12: silence
pad(b(11), [69, 73], b(0.45), 0.6)
# icons + loaders 12–19: groove B with arp and lead
crash(b(12)); impact(b(12), 0.5)
MEL = [(0, 76, 1), (0.25, 78, 0.5), (0.375, 76, 0.5), (0.5, 73, 1.5), (1, 71, 1), (1.25, 73, 0.5), (1.375, 76, 0.5), (1.5, 78, 2),
       (2, 81, 1.5), (2.375, 80, 0.5), (2.5, 78, 1), (2.75, 76, 1), (3, 74, 1.5), (3.375, 73, 0.5), (3.5, 71, 2)]
groove(12, 19, arp=True, lead_line=[(12 + bb, n, d) for bb, n, d in MEL] + [(16 + bb, n, d) for bb, n, d in MEL[:11]])
crash(b(15))
# palettes 19–23: groove A, stabs on each palette swap
crash(b(19)); groove(19, 23, arp=False)
for t in [31.2, 32.0, 32.8, 33.6, 34.4, 35.2, 36.0]: stab(t, chord_at(t / BAR)[1], 0.22, 0.9)
# overlays 23–26: half-time feel, then build
crash(b(23)); groove(23, 26, four=False, arp=True)
# montage 26–29: driving eighths, snare on every beat, rising
crash(b(26)); groove(26, 29, arp=True)
for k in range(12): snare(b(28.25) + k * BEAT / 4 * 1.0, 0.3 + 0.06 * k)
riser(b(28), b(1), 1.0)
# end 29–33: big chorus, logo hit at 50.0 s, ring out
crash(b(29)); impact(b(29), 0.6)
groove(29, 31.25, arp=True, lead_line=[(29 + bb, n, d) for bb, n, d in MEL[:8]])
crash(50.0, 1.2); impact(50.0, 1.0); stab(50.0, [57, 61, 64, 69, 73], 0.9, 1.4)
kick(50.0, 1.1)
pad(50.0, [45, 57, 64, 69, 73, 76], DUR - 50.0 + 0.6, 1.3)
for k in range(8): pluck(50.4 + k * BEAT / 2, [69, 73, 76, 81][k % 4] + 12, 0.7 * (1 - k / 10), 0.3 * ((k % 2) * 2 - 1))
bass(50.0, 33, 2.6, 0.9)

# ---- mix: sidechain from the kick, reverb send, glue ----
kick_env = np.abs(bus['drums'][:, 0]); kick_env = lp(kick_env, 8, 1); kick_env /= kick_env.max() + 1e-9
duck = 1 - 0.45 * np.clip(kick_env * 2.5, 0, 1)
for k in ('bass', 'keys'): bus[k] *= duck[:, None]
ir_t = np.arange(int(1.6 * SR)) / SR
ir = np.stack([rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.38) for _ in range(2)], 1); ir = np.stack([lp(ir[:, c], 6000) for c in range(2)], 1) * 0.05
rev = np.stack([fftconvolve(bus['send'][:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = bus['drums'] * 0.9 + bus['bass'] * 0.85 + bus['keys'] * 0.8 + bus['lead'] * 0.75 + bus['fx'] * 0.7 + rev * 0.9
mix = np.stack([hp(mix[:, c], 30) for c in range(2)], 1)
mix = mix[: int(DUR * SR)]
# シーン…: the music stops dead for the silence beat (18.2-19.2 s) and comes back on the crash at 19.2 s
gate = np.ones(len(mix)); i0, i1, i2 = int(18.08 * SR), int(18.2 * SR), int(19.19 * SR)
gate[i0:i1] = np.linspace(1, 0, i1 - i0); gate[i1:i2] = 0; mix *= gate[:, None]
fade = int(0.6 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.4) * 0.89
sf.write(sys.argv[1], mix.astype(np.float32), SR, subtype='FLOAT')
print(sys.argv[1], f'{len(mix) / SR:.2f}s', 'peak', float(np.abs(mix).max()))
