# Cut the recorded product sound track (every sound the components made, on the sample they made it) into one cue per
# key action, write them to assets/sfx/ and into plan.json audio.cues. The cuts are contiguous, so the cues add back up
# to the whole track; each cue's syncOffset points at its action. It also reports where each cue's first sound
# actually starts relative to its action, so a missing or late sound shows up.   usage: cues.py assets/sfx-product.wav
import sys, json, pathlib
import numpy as np, soundfile as sf
ROOT = pathlib.Path(__file__).resolve().parents[1]
plan_path = ROOT / 'plan.json'; plan = json.loads(plan_path.read_text())
x, sr = sf.read(sys.argv[1], always_2d=True)
amp = np.abs(x).max(1)
# --snap: move each sounded action to where its first sound actually starts (within 120 ms), so the plan records
# the moment the component reacted rather than the moment the cursor was scheduled
if '--snap' in sys.argv:
    for s in plan['shots']:
        for a in s['actions']:
            if not a.get('soundRequired') or a.get('snap') is False: continue
            t = s['start'] + a['at']; lo, hi = round((t - 0.06) * sr), round((t + 0.12) * sr)
            hit = np.nonzero(amp[lo:hi] > 0.02)[0]
            if len(hit): a['at'] = round((lo + hit[0]) / sr - s['start'], 3)
PRE = 0.05
acts = []
for s in plan['shots']:
    for a in s['actions']:
        if a.get('soundRequired'): acts.append((round(s['start'] + a['at'], 3), a['id']))
acts.sort()
bounds = [0.0] + [round(t - PRE, 3) for t, _ in acts[1:]] + [plan['duration']]
out = ROOT / 'assets/sfx'; out.mkdir(parents=True, exist_ok=True)
for f in out.glob('*.wav'): f.unlink()
cues, report = [], []
for i, (t, aid) in enumerate(acts):
    b0, b1 = bounds[i], bounds[i + 1]
    seg = x[round(b0 * sr): round(b1 * sr)]
    f = out / f'{i:02d}-{aid}.wav'; sf.write(f, seg.astype(np.float32), sr, subtype='FLOAT')
    # first sound at or after 60 ms before the action
    lo = round(max(b0, t - 0.06) * sr); hit = np.nonzero(amp[lo: round(b1 * sr)] > 0.02)[0]
    onset = (lo + hit[0]) / sr if len(hit) else None
    peak = float(np.abs(seg).max()) if len(seg) else 0
    report.append({'action': aid, 'actionTime': t, 'firstSound': None if onset is None else round(onset, 3),
                   'offsetMs': None if onset is None else round((onset - t) * 1000), 'peak': round(peak, 3)})
    cues.append({'at': b0, 'actionId': aid, 'file': f'assets/sfx/{f.name}', 'gain': 1.0, 'role': 'sfx',
                 'kind': 'product-' + aid.split('-')[0], 'syncOffset': round(t - b0, 3)})
plan['audio']['cues'] = cues
plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'evidence').mkdir(exist_ok=True)
(ROOT / 'evidence/sfx-timing.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
for r in report: print(f"{r['action']:16s} action {r['actionTime']:6.2f}  first sound {r['firstSound']}  ({r['offsetMs']} ms)  peak {r['peak']}")
print(len(cues), 'cues; total', round(sum(len(sf.read(ROOT / c['file'])[0]) for c in cues) / sr, 3), 's of', round(len(x) / sr, 3))
