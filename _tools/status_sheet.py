# The four status glyphs (success, info, warn, danger) plus a badge, a pink tag and a done step, in every palette and
# theme, stitched into one sheet. usage: status_sheet.py OUT.png      (docs server on 8823)
import asyncio, urllib.parse, sys, io
from playwright.async_api import async_playwright
from PIL import Image
MARK = ''.join('<sk-alert variant="%s" title="%s" style="width:230px">Message.</sk-alert>' % (v, v) for v in ['success', 'info', 'warn', 'danger']) \
    + '<sk-badge value="3"><sk-button size="sm">Inbox</sk-button></sk-badge><sk-tag variant="pink">anime</sk-tag>' \
    + '<sk-steps value="1"><sk-step label="Done"></sk-step><sk-step label="Now"></sk-step><sk-step label="Next"></sk-step></sk-steps>'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1500, 'height': 150}, device_scale_factor=2)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8823/site/dev.html#' + urllib.parse.quote(MARK))
        await pg.wait_for_function('window.__ready'); await pg.wait_for_timeout(500)
        await pg.evaluate("() => { S.configure({ sound: false }); document.body.style.margin = 0; document.getElementById('mount').style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;gap:18px;background:var(--sk-paper)'; }")
        shots = []
        for pal in ['sakuga', 'shonen', 'soda', 'sunset', 'mono']:
            for th in ['light', 'dark']:
                await pg.evaluate("([p, t]) => { S.setPalette(p); S.setTheme(t); }", [pal, th]); await pg.wait_for_timeout(500)
                shots.append(Image.open(io.BytesIO(await pg.screenshot())))
        w, h = shots[0].size; sheet = Image.new('RGB', (w, h * len(shots)))
        for i, s in enumerate(shots): sheet.paste(s, (0, i * h))
        sheet.save(sys.argv[1]); print('errors:', errs[:3]); await b.close()
asyncio.run(main())
