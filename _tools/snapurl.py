# usage: snapurl.py URL OUT.png W [selector]   -> full-page (or one element) screenshot after fonts load
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': int(sys.argv[3]), 'height': 900}, device_scale_factor=1)
        await pg.goto(sys.argv[1]); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(2500)
        if len(sys.argv) > 4: await pg.locator(sys.argv[4]).first.screenshot(path=sys.argv[2])
        else: await pg.screenshot(path=sys.argv[2], full_page=True)
        print(sys.argv[2], await pg.evaluate("[...document.fonts].filter(f=>f.status==='loaded').length"), 'faces loaded')
        await b.close()
asyncio.run(main())
