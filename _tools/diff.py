import sys, os
import numpy as np
from PIL import Image
# usage: diff.py framesdir start end  -> prints mean abs diff between consecutive frames
d, s, e = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
prev = None; out = []
for i in range(s, e + 1):
    a = np.asarray(Image.open(os.path.join(d, f"f_{i:04d}.jpg")).convert("L").resize((270, 270)), dtype=np.int16)
    if prev is not None: out.append((i, float(np.abs(a - prev).mean())))
    prev = a
print(" ".join(f"{i}:{v:.1f}" for i, v in out))
