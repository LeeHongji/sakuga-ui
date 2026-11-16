# Logs the button's computed transform every frame after a boom click, at normal speed.
import asyncio, json, urllib.parse
from playwright.async_api import async_playwright
JS = """async () => {
  const el = document.querySelector('sk-button'), b = el.shadowRoot.querySelector('button');
  const out = []; const t0 = performance.now();
  b.click();
  await new Promise(res => { const f = () => { const t = performance.now() - t0; const a = b.getAnimations().map(x => Math.round(x.currentTime)); const r = b.getBoundingClientRect();
    out.push([Math.round(t), getComputedStyle(b).transform.replace(/matrix\\(|\\)/g, '').split(',').map(v => (+v).toFixed(2)).join(' '), b.hasAttribute('data-inv') ? 'INV' : '', a.join('/'), Math.round(r.width) + 'x' + Math.round(r.height)]); t < 420 ? requestAnimationFrame(f) : res(); }; f(); });
  return out;
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 500, 'height': 400})
        await pg.goto('http://localhost:8823/site/dev.html#' + urllib.parse.quote('<sk-button fx="boom">Confirm</sk-button>'))
        await pg.wait_for_function('window.__ready'); await pg.wait_for_timeout(800)
        await pg.evaluate("S.configure({sound:false})")
        for row in await pg.evaluate(JS): print(*row, sep='  ')
        await b.close()
asyncio.run(main())
