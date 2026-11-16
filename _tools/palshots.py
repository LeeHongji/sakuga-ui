# Screenshot the site in every palette and theme. usage: palshots.py OUTDIR [section-id ...]
import sys, asyncio, pathlib
from playwright.async_api import async_playwright
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '_shots/pal'); out.mkdir(parents=True, exist_ok=True)
secs = sys.argv[2:] or ['cover', 'forms']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errs = []
        for pal in ['sakuga', 'shonen', 'soda', 'sunset', 'mono']:
            for th in ['light', 'dark']:
                pg = await b.new_page(viewport={'width': 1440, 'height': 900})
                pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.add_init_script("try{localStorage.setItem('sk-lang','zh');localStorage.setItem('sk-palette','%s')}catch(e){}" % pal)
                await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(2000)
                await pg.evaluate("Sakuga.setTheme('%s'); Sakuga.configure({sound:false}); document.querySelectorAll('.koma').forEach(k=>k.classList.add('in'))" % th)
                await pg.wait_for_timeout(600)
                for s in secs:
                    await pg.evaluate("(s) => { const e = document.querySelector('#' + s); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 16, behavior: 'instant' }); }", s); await pg.wait_for_timeout(350)
                    await pg.screenshot(path=str(out / ('%s_%s_%s.png' % (pal, th, s))))
                await pg.close()
        print('errors:', errs[:4]); await b.close()
asyncio.run(main())
