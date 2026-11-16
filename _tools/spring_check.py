# Functional checks for the springy, function-specific interactions (real pointer input).
import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(2200)
        await pg.evaluate("document.querySelectorAll('.koma').forEach(k=>k.classList.add('in'))")
        out = {}

        async def box(sel, inner=None):
            el = pg.locator(sel).first
            await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(500)
            return await (el.locator(inner).first if inner else el).bounding_box()

        # stepper: hold + to repeat
        bb = await box('#c-sk-stepper sk-stepper', 'button[data-d="1"]')
        await pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await pg.mouse.down(); await pg.wait_for_timeout(1500); await pg.mouse.up()
        out['stepper_after_hold'] = await pg.evaluate("document.querySelector('#c-sk-stepper sk-stepper').value")

        # slider: pull past the right end, then release
        bb = await box('#c-sk-slider sk-slider', '.s')
        y = bb['y'] + bb['height'] / 2
        await pg.mouse.move(bb['x'] + bb['width'] * 0.3, y); await pg.mouse.down()
        for i in range(12): await pg.mouse.move(bb['x'] + bb['width'] * 0.3 + (bb['width'] * 0.7 + 90) * (i + 1) / 12, y); await pg.wait_for_timeout(20)
        await pg.wait_for_timeout(350)
        held = await pg.evaluate("(()=>{const s=document.querySelector('#c-sk-slider sk-slider'); const el=s.shadowRoot.querySelector('.s'); return {x: parseFloat(el.style.getPropertyValue('--x')), w: el.clientWidth, grab: el.hasAttribute('data-grab'), value: s.value}})()")
        await pg.mouse.up(); await pg.wait_for_timeout(900)
        rel = await pg.evaluate("(()=>{const el=document.querySelector('#c-sk-slider sk-slider').shadowRoot.querySelector('.s'); return {x: parseFloat(el.style.getPropertyValue('--x')), w: el.clientWidth, grab: el.hasAttribute('data-grab')}})()")
        out['slider'] = {'overshoot_px_while_held': round(held['x'] - held['w'], 1), 'grab': held['grab'], 'value': held['value'], 'overshoot_after_release': round(rel['x'] - rel['w'], 1), 'grab_after': rel['grab']}

        # hold button: compressed while charging, released early
        bb = await box('#c-sk-hold-button sk-hold-button')
        await pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await pg.mouse.down(); await pg.wait_for_timeout(600)
        mid = await pg.evaluate("document.querySelector('#c-sk-hold-button sk-hold-button').shadowRoot.querySelector('button').style.scale")
        await pg.mouse.up(); await pg.wait_for_timeout(200)
        out['hold'] = {'scale_while_charging': mid, 'scale_after_release': await pg.evaluate("document.querySelector('#c-sk-hold-button sk-hold-button').shadowRoot.querySelector('button').style.scale")}

        # rating: hover preview
        bb = await box('#c-sk-rating sk-rating', 'button[data-i="3"]')
        await pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); await pg.wait_for_timeout(200)
        out['rating_hover_preview'] = await pg.evaluate("document.querySelector('#c-sk-rating sk-rating').shadowRoot.querySelectorAll('[data-hov]').length")

        # card: tilt follows the pointer and resets
        bb = await box('#c-sk-card sk-card')
        await pg.mouse.move(bb['x'] + bb['width'] * 0.85, bb['y'] + bb['height'] * 0.2); await pg.wait_for_timeout(200)
        tilt = await pg.evaluate("(()=>{const c=document.querySelector('#c-sk-card sk-card').shadowRoot.querySelector('.c'); return [c.style.getPropertyValue('--rx'), c.style.getPropertyValue('--ry')]})()")
        await pg.mouse.move(5, 5); await pg.wait_for_timeout(200)
        out['card_tilt'] = {'while_over': tilt, 'after_leave': await pg.evaluate("document.querySelector('#c-sk-card sk-card').shadowRoot.querySelector('.c').style.getPropertyValue('--rx')")}

        # toast: a short drag springs back, a long drag throws it away
        await pg.evaluate("window.__t = Sakuga.toast('Drag me', {duration: 0})"); await pg.wait_for_timeout(900)
        bb = await pg.evaluate("(()=>{const r=window.__t.shadowRoot.querySelector('.t').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}})()")
        cx, cy = bb['x'] + bb['w'] / 2, bb['y'] + bb['h'] / 2
        await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx + 40, cy, steps=4); await pg.mouse.up(); await pg.wait_for_timeout(1400)
        short = await pg.evaluate("document.querySelectorAll('sk-toast').length")
        await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx + 170, cy, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(900)
        out['toast'] = {'after_short_drag': short, 'after_long_drag': await pg.evaluate("document.querySelectorAll('sk-toast').length")}

        # input: no outline on the inner field, clear button works
        bb = await box('#c-sk-input sk-input')
        res = await pg.evaluate("(()=>{const i=document.querySelector('#c-sk-input sk-input'); const c=i.shadowRoot.querySelector('#c'); c.focus(); c.value='abc'; c.dispatchEvent(new Event('input',{bubbles:true})); const o=getComputedStyle(c).outlineStyle; i.shadowRoot.querySelector('.clr').click(); return {inner_outline:o, value_after_clear:i.value}})()")
        out['input'] = res
        print(json.dumps(out, ensure_ascii=False, indent=1)); print('errors:', errs[:6])
        await b.close()
asyncio.run(main())
