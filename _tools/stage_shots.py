# Frame-exact stills of the technique stage on the docs site, for reviewing each scene by eye.
# The page runs on the same virtual clock as capture.py, so a frame at 640 ms is the frame at 640 ms.
# usage: stage_shots.py [--only 0,6,21] [--theme dark] [--width 1000]   writes _shots/stage/sheet_*.png
import asyncio, argparse, pathlib, re
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('--only', default=''); ap.add_argument('--theme', default='light'); ap.add_argument('--width', type=int, default=1000)
a = ap.parse_args()
CLOCK = re.search(r'CLOCK = """(.*?)"""', pathlib.Path(__file__).with_name('capture.py').read_text(), re.S).group(1)
# three moments of every scene: before the turn, at the turn, and after it has settled
TIMES = [(800, 1380, 1900), (500, 760, 1400), (700, 1500, 1800), (500, 1600, 2800), (700, 1250, 1700)]
out = pathlib.Path(__file__).resolve().parent.parent / '_shots' / 'stage'

async def main():
    out.mkdir(parents=True, exist_ok=True)
    only = [int(x) for x in a.only.split(',') if x] or range(len(TIMES))
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': a.width, 'height': 800})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and '404' not in m.text else None)
        await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(2500)
        await pg.evaluate("(th) => { Sakuga.configure({ sound: false }); Sakuga.setTheme(th); document.querySelector('#c-lang button[value=zh]').click(); }", a.theme)
        await pg.evaluate("document.querySelector('#tech').scrollIntoView({ block: 'start' })"); await pg.wait_for_timeout(1500)
        await pg.evaluate(f'({CLOCK})()')
        rows = []
        for i in only:
            await pg.evaluate("i => document.querySelectorAll('#techs button')[i].click()", i)
            name = await pg.evaluate("document.querySelector('#tech-name').textContent")
            box = await pg.evaluate("(() => { const h = document.querySelector('.tech-head').getBoundingClientRect(), c = document.querySelector('#tech-cap').getBoundingClientRect(); return [h.left, h.top, h.width, c.bottom - h.top]; })()")
            now, shots = 0, []
            for t in TIMES[i]:
                while now < t: await pg.evaluate('window.__step(1000 / 60)'); now += 1000 / 60
                f = out / f'{i:02d}_{t}.png'
                await pg.screenshot(path=str(f), clip={'x': box[0], 'y': box[1], 'width': box[2], 'height': box[3]})
                shots.append((t, f))
            for _ in range(150): await pg.evaluate('window.__step(1000 / 60)')     # let the scene run out before the next one
            rows.append((i, name, shots))
        await b.close()
    # contact sheets, six scenes to a sheet
    for s in range(0, len(rows), 6):
        part = rows[s:s + 6]; ims = [[Image.open(f) for _, f in sh] for _, _, sh in part]
        k = 0.56; w, h = int(ims[0][0].width * k), int(ims[0][0].height * k)
        sheet = Image.new('RGB', (w * 3 + 8, (h + 18) * len(part)), '#ffffff'); d = ImageDraw.Draw(sheet)
        for r, (row, (i, name, sh)) in enumerate(zip(ims, part)):
            for c, im in enumerate(row):
                sheet.paste(im.resize((w, h), Image.LANCZOS), (c * (w + 4), r * (h + 18) + 16))
                d.text((c * (w + 4) + 4, r * (h + 18) + 2), f'#{i + 1}  {sh[c][0]} ms', fill='#000000')
        name = out / f'sheet_{a.theme}_{part[0][0] + 1:02d}.png'; sheet.save(name); print(name)
    print('errors:', errs[:8])
asyncio.run(main())
