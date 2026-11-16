# Contrast of every text role in every palette and theme, from the token values in src/core/palettes.js.
# Small text needs 4.5:1. Exits 1 if any role is below it. usage: contrast.py
import re, sys, pathlib
src = (pathlib.Path(__file__).resolve().parent.parent / 'src/core/palettes.js').read_text()
keys = re.findall(r"'([\w-]+)'", re.search(r'const KEYS = \[(.*?)\]', src).group(1))
pals = {}
for name, body in re.findall(r'(\w+): \{\s*light: \[(.*?)\],\s*dark: \[(.*?)\],\s*\}', src, re.S) and [(m.group(1), m) for m in re.finditer(r'(\w+): \{\s*light: \[(.*?)\],\s*dark: \[(.*?)\],\s*\}', src, re.S)]:
    pals[name] = {t: dict(zip(keys, re.findall(r'#[0-9a-fA-F]{6}', body.group(i)))) for t, i in (('light', 2), ('dark', 3))}
rgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
def lum(c):
    f = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = [f(v / 255) for v in c]; return 0.2126 * r + 0.7152 * g + 0.0722 * b
def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)
mix = lambda a, b, p: [a[i] * p + b[i] * (1 - p) for i in range(3)]
bad = 0
print('%-14s %s' % ('', ' '.join('%-9s' % c for c in ['body', 'on-peri', 'on-hot', 'muted', 'site-mute', 'facts', 'nav-no', 'info-ic', 'solid'])))
for name, p in pals.items():
    for th, t in p.items():
        c = {k: rgb(v) for k, v in t.items()}
        night = mix(c['paper'], [0, 0, 0], 0.55)
        mute = mix(c['ink'], c['paper'], 0.66)
        rows = [
            min(cr(c['ink'], c['paper']), cr(c['ink'], c['surface'])),
            cr(c['ink'], c['peri']),
            cr(c['on-hot'], c['pink']),
            min(cr(c['muted'], c['paper']), cr(c['muted'], c['surface'])),
            min(cr(mute, c['paper']), cr(mute, c['surface'])),
            min(cr(mix(c['pink'], c['ink'], 0.75), c['paper']), cr(mix(c['pink'], c['ink'], 0.75), c['surface'])),
            cr(mix(c['pink'], c['surface'], 0.75), c['ink']) if th == 'light' else cr(c['pink'], night),
            cr(c['surface'], c['violet']),
            cr(c['surface'], c['ink']),
        ]
        bad += sum(1 for r in rows if r < 4.5)
        print('%-14s %s' % (name + ' ' + th, ' '.join(('%-9s' % ('%.2f%s' % (r, '' if r >= 4.5 else ' !'))) for r in rows)))
print('below 4.5:', bad)
sys.exit(1 if bad else 0)
