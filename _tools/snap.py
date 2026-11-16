# usage: snap.py URL OUT.png [width] [height] [wait_ms] [dsf]
import sys, asyncio
from playwright.async_api import async_playwright
url,out=sys.argv[1],sys.argv[2]; w=int(sys.argv[3]) if len(sys.argv)>3 else 1400; h=int(sys.argv[4]) if len(sys.argv)>4 else 900
wait=int(sys.argv[5]) if len(sys.argv)>5 else 1500; dsf=float(sys.argv[6]) if len(sys.argv)>6 else 1
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=dsf)
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        await pg.goto(url); await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(wait)
        await pg.screenshot(path=out,full_page=True); print(out,'errors:',errs[:5]); await b.close()
asyncio.run(main())
