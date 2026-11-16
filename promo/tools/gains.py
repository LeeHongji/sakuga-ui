# Set each SFX cue's gain so the component's sound peaks at least 3 dB above the ducked music at its action.
# Run after a first mix (needs assets/music-ducked.wav), then mix again.   usage: gains.py
import json, pathlib
import numpy as np, soundfile as sf
ROOT = pathlib.Path(__file__).resolve().parents[1]
plan = json.loads((ROOT / 'plan.json').read_text())
m, sr = sf.read(ROOT / 'assets/music-ducked.wav')
pk = lambda x: 20 * np.log10(np.abs(x).max() + 1e-9)
for c in plan['audio']['cues']:
    x, _ = sf.read(ROOT / c['file'])
    a = round(c['syncOffset'] * sr); w = x[a: a + round(0.15 * sr)]
    t = round((c['at'] + c['syncOffset']) * sr); mw = m[t: t + round(0.15 * sr)]
    need = pk(mw) + 3 - pk(w)          # dB needed at gain 1 (music file is already at its plan gain)
    # but never let the whole cue sit more than 2 dB above the music on average: a sound that ramps up from quiet
    # (the hold button's charge) would otherwise be boosted for its whole length
    rms = lambda y: 20 * np.log10(np.sqrt((y ** 2).mean()) + 1e-9)
    seg_m = m[round(c['at'] * sr): round(c['at'] * sr) + len(x)]
    cap = rms(seg_m) + 2 - rms(x)
    c['gain'] = round(float(np.clip(10 ** (min(need, cap) / 20), 1.0, 4.0)), 2)
    print(f"{c['actionId']:16s} sfx {pk(w):6.1f}  music {pk(mw):6.1f}  gain {c['gain']}")
(ROOT / 'plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n')
