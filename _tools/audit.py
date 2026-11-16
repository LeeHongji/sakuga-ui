# Display audit of the docs site: layout, overlays and lettering, across viewports and languages.
# usage: audit.py [quick]      -> prints one line per problem; exit code 1 if any were found
import sys, asyncio, json, pathlib
from playwright.async_api import async_playwright
JS = (pathlib.Path(__file__).parent / 'audit.js').read_text()
QUICK = len(sys.argv) > 1 and sys.argv[1] == 'quick'
VIEWS = [(1440, 900), (1280, 720), (1024, 768), (900, 700), (390, 844)]
LANGS = ['zh', 'en', 'ja']

async def main():
    total = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for (vw, vh) in VIEWS:
            for lang in LANGS:
                if QUICK and (lang != 'zh' and vw != 1440):
                    continue
                pg = await b.new_page(viewport={'width': vw, 'height': vh})
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.add_init_script("try{localStorage.setItem('sk-lang','%s')}catch(e){}" % lang)
                await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(2300)
                await pg.evaluate(JS)
                await pg.evaluate("document.querySelectorAll('.koma').forEach(k=>k.classList.add('in')); document.querySelectorAll('.koma details').forEach(d=>{d.open=true})"); await pg.wait_for_timeout(500)
                tag = '%dx%d %s' % (vw, vh, lang)
                lay = await pg.evaluate('window.__audit.layout()')
                for x in lay:
                    total += 1; print(tag, 'LAYOUT', json.dumps(x, ensure_ascii=False))
                if lang == 'zh' or vw == 1440:
                    ov = await pg.evaluate("window.__audit.overlays(%s)" % json.dumps(['mid', 'top', 'bottom'] if vw in (1440, 390) else ['mid']))
                    for x in ov['problems']:
                        total += 1; print(tag, 'OVERLAY', json.dumps(x, ensure_ascii=False))
                    print(tag, 'overlays checked:', ov['checked'])
                    await pg.mouse.click(vw // 2, vh - 5)
                    dw = await pg.evaluate('window.__audit.dockWords()')
                    for x in dw:
                        total += 1; print(tag, 'WORD-OFF-SCREEN', json.dumps(x, ensure_ascii=False))
                for e in errs[:5]:
                    total += 1; print(tag, 'ERROR', e)
                await pg.close()
        await b.close()
    print('problems:', total)
    sys.exit(1 if total else 0)
asyncio.run(main())
