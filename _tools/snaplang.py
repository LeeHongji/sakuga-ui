# usage: snaplang.py LANG OUT.png [theme]  -> full-page capture with every panel revealed
import sys, asyncio
from playwright.async_api import async_playwright
lang, out = sys.argv[1], sys.argv[2]; theme = sys.argv[3] if len(sys.argv) > 3 else 'light'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.add_init_script(f"try{{localStorage.setItem('sk-lang','{lang}')}}catch(e){{}}")
        await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(2200)
        await pg.evaluate(f"Sakuga.setTheme('{theme}'); document.querySelectorAll('.koma').forEach(k=>k.classList.add('in'))")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=out, full_page=True); print(out, 'errors:', errs[:5]); await b.close()
asyncio.run(main())
