# Contact sheet of stills with their times.   usage: sheet.py OUT.png COLS WIDTH file...
import sys
from PIL import Image, ImageDraw
out, cols, width, files = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in files]
w = width // cols; h = round(w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, (h + 22) * rows), 'white'); d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + 22)); d.text((x + 6, y + 5), f.split('/')[-1], fill='black')
sheet.save(out); print(out, sheet.size)
