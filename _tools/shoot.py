# Slow-motion frame capture for sakuga-ui.
# usage: shoot.py OUT.jpg ACTION T1,T2,... [--k 10] [--cols 4] [--pre JS] [--pad 30] [--dsf 1.5]
#   ACTION: click:<sel> | hold:<sel>:<ms> | drag:<sel>:<fromFrac>:<toFrac>:<ms> | none:<sel>
#   Times are animation milliseconds after the action starts.
import sys, asyncio, io, argparse
from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument('out'); ap.add_argument('action'); ap.add_argument('times')
ap.add_argument('--k', type=float, default=10); ap.add_argument('--cols', type=int, default=4)
ap.add_argument('--pre', default=''); ap.add_argument('--pad', type=int, default=0)
ap.add_argument('--dsf', type=float, default=1.5); ap.add_argument('--url', default='http://localhost:8823/')
a = ap.parse_args()
times = [float(t) for t in a.times.split(',')]
kind, sel, *rest = a.action.split(':')

SLOW = """(k)=>{ const pn=performance.now.bind(performance); const base=pn(); performance.now=()=>base+(pn()-base)/k;
 const st=window.setTimeout; window.setTimeout=(f,ms,...r)=>st(f,(ms||0)*k,...r);
 const an=Element.prototype.animate; Element.prototype.animate=function(kf,o){ const x=an.call(this,kf,o); x.playbackRate=1/k; return x; };
 const s=document.createElement('style'); s.textContent='*,*::before,*::after{transition-duration:calc(var(--td,0s)) !important}'; }"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 900}, device_scale_factor=a.dsf)
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(a.url)
        await pg.wait_for_timeout(900)
        await pg.evaluate("document.fonts.ready")
        el = pg.locator(sel).first
        await el.scroll_into_view_if_needed()
        await pg.evaluate("(s)=>document.querySelector(s).closest('.cell').scrollIntoView({block:'center'})", sel)
        await pg.wait_for_timeout(300)
        if a.pre:
            await pg.evaluate(a.pre); await pg.wait_for_timeout(1800)
        box = await pg.evaluate("(s)=>{const r=document.querySelector(s).closest('.cell').getBoundingClientRect();return [r.x,r.y,r.width,r.height]}", sel)
        clip = {'x': max(0, box[0] - a.pad), 'y': max(0, box[1] - a.pad), 'width': box[2] + 2 * a.pad, 'height': box[3] + 2 * a.pad}
        eb = await el.bounding_box()
        await pg.evaluate(f"({SLOW})({a.k})")
        loop = asyncio.get_event_loop()
        if kind == 'click':
            await pg.mouse.move(eb['x'] + eb['width'] / 2, eb['y'] + eb['height'] / 2)
            await pg.mouse.down(); await pg.mouse.up()
        elif kind == 'hold':
            await pg.mouse.move(eb['x'] + eb['width'] / 2, eb['y'] + eb['height'] / 2)
            await pg.mouse.down()
            asyncio.ensure_future(release(pg, float(rest[0]) * a.k / 1000))
        elif kind == 'drag':
            f0, f1, ms = float(rest[0]), float(rest[1]), float(rest[2])
            y = eb['y'] + eb['height'] / 2
            await pg.mouse.move(eb['x'] + eb['width'] * f0, y); await pg.mouse.down()
            asyncio.ensure_future(drag(pg, eb, f0, f1, ms * a.k / 1000, y))
        t0 = loop.time()
        shots = []
        for t in times:
            wait = t0 + t * a.k / 1000 - loop.time()
            if wait > 0: await asyncio.sleep(wait)
            real = (loop.time() - t0) * 1000 / a.k
            shots.append((real, await pg.screenshot(clip=clip, type='png')))
        await b.close()
        ims = [(t, Image.open(io.BytesIO(s)).convert('RGB')) for t, s in shots]
        w, h = ims[0][1].size
        rows = (len(ims) + a.cols - 1) // a.cols
        sheet = Image.new('RGB', (a.cols * w, rows * h), 'black')
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
        for n, (t, im) in enumerate(ims):
            d = ImageDraw.Draw(im); d.rectangle([0, 0, 96, 28], fill='black'); d.text((5, 3), f'{t:.0f}ms', fill='white', font=font)
            sheet.paste(im, ((n % a.cols) * w, (n // a.cols) * h))
        sheet.save(a.out, quality=90)
        print(a.out, sheet.size, 'errors:', errs[:6])

async def release(pg, sec):
    await asyncio.sleep(sec); await pg.mouse.up()

async def drag(pg, eb, f0, f1, sec, y):
    n = max(8, int(sec / 0.03)); loop = asyncio.get_event_loop(); t0 = loop.time()
    for i in range(1, n + 1):
        u = i / n; e = u * u * (3 - 2 * u)
        await pg.mouse.move(eb['x'] + eb['width'] * (f0 + (f1 - f0) * e), y)
        w = t0 + sec * u - loop.time()
        if w > 0: await asyncio.sleep(w)
    await asyncio.sleep(0.4 * sec); await pg.mouse.up()

asyncio.run(main())
