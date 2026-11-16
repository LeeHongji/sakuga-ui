# One sheet of every icon: all at 72 px, eight at 24 px, eight plain, and icons inside buttons.
# usage: icons_sheet.py OUT.png [theme] [palette]      (docs server on 8823)
import asyncio, urllib.parse, sys
from playwright.async_api import async_playwright
theme = sys.argv[2] if len(sys.argv) > 2 else 'light'
pal = sys.argv[3] if len(sys.argv) > 3 else 'sakuga'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1000, 'height': 620}, device_scale_factor=2)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8823/site/dev.html#' + urllib.parse.quote('<span></span>'))
        await pg.wait_for_function('window.__ready'); await pg.wait_for_timeout(500)
        await pg.evaluate("""([th, pal]) => { S.setTheme(th); S.setPalette(pal); const m = document.getElementById('mount'); m.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:26px 18px;align-items:center;justify-items:center;margin:0';
          document.body.style.margin = '30px';
          m.innerHTML = S.iconNames.map(n => `<div style="text-align:center;font:600 11px monospace;color:var(--sk-ink)"><sk-icon name="${n}" size="72" still></sk-icon><br><span style="color:var(--sk-muted)">${n}</span></div>`).join('')
            + S.iconNames.slice(0, 8).map(n => `<sk-icon name="${n}" size="24" still></sk-icon>`).join('') + S.iconNames.slice(0, 8).map(n => `<sk-icon name="${n}" size="32" plain still></sk-icon>`).join('')
            + '<sk-button><sk-icon name="download"></sk-icon>Download</sk-button><sk-button variant="primary" icon aria-label="bell"><sk-icon name="bell"></sk-icon></sk-button><sk-button variant="solid"><sk-icon name="send" plain></sk-icon>Send</sk-button><sk-button variant="pink"><sk-icon name="trash" plain></sk-icon>Delete</sk-button>'; }""", [theme, pal])
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=sys.argv[1]); print('errors:', errs[:3]); await b.close()
asyncio.run(main())
