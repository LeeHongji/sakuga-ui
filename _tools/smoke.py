# usage: smoke.py "<html markup>" "<js to eval (async ok)>" [out.png]   -> loads site/dev.html with the markup, reports errors
import sys, asyncio, urllib.parse, json
from playwright.async_api import async_playwright
markup = sys.argv[1] if len(sys.argv) > 1 else ''
js = sys.argv[2] if len(sys.argv) > 2 else 'null'
out = sys.argv[3] if len(sys.argv) > 3 else None
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1100, 'height': 700}, device_scale_factor=1.5)
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        pg.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type in ('error', 'warning') else None)
        await pg.goto('http://localhost:8823/site/dev.html#' + urllib.parse.quote(markup))
        await pg.wait_for_function('window.__ready===true', timeout=8000)
        await pg.wait_for_timeout(500)
        await pg.mouse.click(5, 5)
        res = await pg.evaluate(f"(async()=>{{ {js} }})()")
        if out: await pg.screenshot(path=out)
        print('result:', json.dumps(res, ensure_ascii=False)); print('errors:', errs[:10])
        await b.close()
asyncio.run(main())
