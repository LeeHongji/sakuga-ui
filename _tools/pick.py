import sys, os
from PIL import Image
# usage: pick.py framesdir out cols cell x0 y0 x1 y1 idx...
d, out = sys.argv[1], sys.argv[2]
cols, cell, x0, y0, x1, y1 = map(int, sys.argv[3:9])
idx = list(map(int, sys.argv[9:]))
rows = (len(idx) + cols - 1) // cols
ch = int(cell * (y1 - y0) / (x1 - x0))
sheet = Image.new("RGB", (cols * cell, rows * ch), "black")
for n, i in enumerate(idx):
    im = Image.open(os.path.join(d, f"f_{i:04d}.jpg")).crop((x0, y0, x1, y1)).resize((cell, ch), Image.LANCZOS)
    sheet.paste(im, ((n % cols) * cell, (n // cols) * ch))
sheet.save(out, quality=92)
print(out, sheet.size)
