import sys, os
from PIL import Image, ImageDraw, ImageFont
# usage: sheet.py framesdir out start end step cols cell [x0 y0 x1 y1]
d, out, start, end, step, cols, cell = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8])
crop = tuple(map(int, sys.argv[8:12])) if len(sys.argv) >= 12 else None
idx = list(range(start, end + 1, step))
rows = (len(idx) + cols - 1) // cols
ims = []
for i in idx:
    im = Image.open(os.path.join(d, f"f_{i:04d}.jpg"))
    if crop: im = im.crop(crop)
    ims.append((i, im))
w, h = ims[0][1].size
ch = int(cell * h / w)
sheet = Image.new("RGB", (cols * cell, rows * ch), "black")
try: font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
except Exception: font = ImageFont.load_default()
for n, (i, im) in enumerate(ims):
    im = im.resize((cell, ch), Image.LANCZOS)
    dr = ImageDraw.Draw(im)
    label = f"{i} {((i-1)/60):.2f}s"
    dr.rectangle([0, 0, 110, 24], fill="black"); dr.text((4, 2), label, fill="white", font=font)
    sheet.paste(im, ((n % cols) * cell, (n // cols) * ch))
sheet.save(out, quality=88)
print(out, sheet.size, len(idx))
