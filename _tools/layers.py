# Visual proof that overlays and effects stack correctly: opens each overlay and screenshots the viewport.
# usage: layers.py [outdir]
import sys, asyncio
from playwright.async_api import async_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '_shots'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 760})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('sk-lang','zh')}catch(e){}")
        await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(2400)
        await pg.evaluate("document.querySelectorAll('.koma').forEach(k=>k.classList.add('in')); Sakuga.configure({sound:false})")
        go = "(s) => { const e = document.querySelector(s); scrollTo({ top: e.getBoundingClientRect().top + scrollY - innerHeight / 2 + 60, behavior: 'instant' }); }"
        # 1. dialog: backdrop over sidebar and console; a toast and a ドン! fired from inside it must sit above it
        await pg.evaluate(go, '#c-sk-dialog'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('#c-sk-dialog sk-dialog').show()"); await pg.wait_for_timeout(700)
        await pg.evaluate("Sakuga.toast('Saved from inside the dialog'); const q = Sakuga.rectOf(document.querySelector('#c-sk-dialog sk-dialog').shadowRoot.querySelector('.panel')); Sakuga.moves.boom(q.r - 20, q.t + 10, 0.7); Sakuga.sfx('ドン!', { voice: 'impact', x: q.r - 10, y: q.t - 20, size: 46, hold: 2000, silent: true })")
        await pg.wait_for_timeout(260); await pg.screenshot(path=out + '/L_dialog.png')
        await pg.wait_for_timeout(900)
        order = await pg.evaluate("[...document.querySelectorAll(':popover-open')].map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''))")
        print('top layer, bottom to top:', order)
        await pg.evaluate("document.querySelector('#c-sk-dialog sk-dialog').hide()"); await pg.wait_for_timeout(2600)
        # 2. select, menu, popover, tooltip
        for tag, act in [('sk-select', "el.shadowRoot.querySelector('.trig').click()"), ('sk-menu', "el.querySelector('[slot=trigger]').click()"), ('sk-popover', "el.querySelector('[slot=trigger]').click()"), ('sk-tooltip', "el.dispatchEvent(new PointerEvent('pointerenter'))")]:
            await pg.evaluate(go, '#c-' + tag); await pg.wait_for_timeout(300)
            await pg.evaluate("(tag) => { const el = document.querySelector('#c-' + tag + ' ' + tag); %s }" % act, tag); await pg.wait_for_timeout(700)
            await pg.screenshot(path=out + '/L_%s.png' % tag[3:])
            await pg.evaluate("(tag) => { const el = document.querySelector('#c-' + tag + ' ' + tag); el.open = false; el.close && el.close(); el.dispatchEvent(new PointerEvent('pointerleave')); }", tag); await pg.wait_for_timeout(400)
        # 3. drawer
        await pg.evaluate(go, '#c-sk-drawer'); await pg.evaluate("document.querySelector('#c-sk-drawer sk-drawer').show()"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=out + '/L_drawer.png')
        await pg.evaluate("document.querySelector('#c-sk-drawer sk-drawer').hide()"); await pg.wait_for_timeout(600)
        # 4. a word placed in page space must scroll with the page
        await pg.evaluate("scrollTo({top: 600, behavior: 'instant'}); Sakuga.sfx('ドン!', { voice: 'impact', x: 700, y: 900, size: 50, hold: 4000, silent: true })"); await pg.wait_for_timeout(500)
        y0 = await pg.evaluate("document.querySelector('.sk-w').getBoundingClientRect().top")
        await pg.evaluate("scrollTo({top: 800, behavior: 'instant'})"); await pg.wait_for_timeout(200)
        y1 = await pg.evaluate("document.querySelector('.sk-w').getBoundingClientRect().top")
        print('word follows the page when scrolling 200px:', round(y0 - y1), 'px')
        # 5. console: effects from the controls stay on screen
        await pg.evaluate("scrollTo({top: 0, behavior: 'instant'})"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('#c-sound').shadowRoot.querySelector('button, [role=switch]').click()"); await pg.wait_for_timeout(230)
        await pg.screenshot(path=out + '/L_console.png', clip={'x': 0, 'y': 380, 'width': 420, 'height': 380})
        print('errors:', errs[:5])
        await b.close()
asyncio.run(main())
