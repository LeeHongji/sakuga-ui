# usage: snapv.py OUT.png W H [lang] [selector|full] [theme]
import sys, asyncio
from playwright.async_api import async_playwright
out, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
lang = sys.argv[4] if len(sys.argv) > 4 else 'zh'
sel = sys.argv[5] if len(sys.argv) > 5 else ''
theme = sys.argv[6] if len(sys.argv) > 6 else 'light'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('sk-lang','%s')}catch(e){}" % lang)
        await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(2500)
        await pg.evaluate("Sakuga.setTheme('%s'); document.querySelectorAll('.koma').forEach(k=>k.classList.add('in'))" % theme)
        await pg.wait_for_timeout(900)
        if sel.startswith('scroll:'):
            await pg.evaluate("(s) => { const e = document.querySelector(s); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 20, behavior: 'instant' }); }", sel[7:]); await pg.wait_for_timeout(500)
            await pg.screenshot(path=out)
        elif sel and sel != 'view':
            await pg.locator(sel).first.scroll_into_view_if_needed(); await pg.wait_for_timeout(300)
            await pg.locator(sel).first.screenshot(path=out)
        else:
            await pg.screenshot(path=out)
        print(out, 'errors:', errs[:5])
        await b.close()
asyncio.run(main())
