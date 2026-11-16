# Performance measurements on the docs site. Writes site/measured.json (numbers only; the site words them
# in three languages). Requires the docs server on :8823.
import asyncio, json, subprocess, datetime
from playwright.async_api import async_playwright

REC = """async (ms) => { const d=[]; let last=performance.now(), run=true; const tick=t=>{ d.push(t-last); last=t; if(run) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  await new Promise(r=>setTimeout(r,ms)); run=false; const s=d.slice(2).sort((a,b)=>a-b); const mean=s.reduce((a,b)=>a+b,0)/s.length;
  return { fps: Math.round(1000/mean), p95: +s[Math.floor(s.length*0.95)].toFixed(1), worst: +s[s.length-1].toFixed(1) }; }"""
MANY = """async () => { const f=document.querySelector('#p-field'); const t0=performance.now(); let h='';
  for(let i=0;i<200;i++) h+='<sk-button size="sm">'+i+'</sk-button><sk-switch size="sm"></sk-switch>';
  f.innerHTML=h; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return Math.round(performance.now()-t0); }"""

async def main():
    cpu = subprocess.run(['sysctl', '-n', 'machdep.cpu.brand_string'], capture_output=True, text=True).stdout.strip() or 'unknown CPU'
    out = {'env': 'Playwright headless Chromium, GPU on · %s · 1440×900 · %s' % (cpu, datetime.date.today().isoformat())}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__raf=0; const _o=window.requestAnimationFrame; window.requestAnimationFrame=function(f){ window.__raf++; return _o.call(window,f); };")
        await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(3000)
        # idle page: every component present, nothing interacted with
        n0 = await pg.evaluate('window.__raf'); await pg.wait_for_timeout(3000); n1 = await pg.evaluate('window.__raf')
        info = await pg.evaluate("({ els: [...document.querySelectorAll('*')].filter(e=>e.tagName.startsWith('SK-')).length, canvases: document.querySelectorAll('canvas').length })")
        out['idle'] = {'els': info['els'], 'raf': n1 - n0, 'canvases': info['canvases']}
        # unlock audio first: headless audio init is slow and is not part of an interaction
        await pg.mouse.click(700, 30); await pg.wait_for_timeout(900)

        async def act(key, sel, ms):
            el = pg.locator(sel).first
            await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(900)
            bb = await el.bounding_box()
            fut = asyncio.ensure_future(pg.evaluate(f"({REC})({ms})"))
            await pg.wait_for_timeout(60)
            await pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
            out[key] = await fut

        await act('boom', '#c-sk-button sk-button[fx=boom]', 900)
        await act('switch', '#c-sk-switch sk-switch[size=lg]', 1400)
        await act('checkbox', '#c-sk-checkbox sk-checkbox', 800)

        el = pg.locator('#c-sk-slider sk-slider').first
        await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(900)
        bb = await el.bounding_box(); y = bb['y'] + bb['height'] - 20
        fut = asyncio.ensure_future(pg.evaluate(f"({REC})(1300)"))
        await pg.mouse.move(bb['x'] + 30, y); await pg.mouse.down()
        for i in range(30):
            back = (i // 15) % 2
            await pg.mouse.move(bb['x'] + 30 + (i % 15) * 11 * (-1 if back else 1) + (165 if back else 0), y)
            await pg.wait_for_timeout(22)
        await pg.mouse.up(); out['slider'] = await fut


        await pg.evaluate("document.querySelector('#perf').scrollIntoView()"); await pg.wait_for_timeout(900)
        s = await pg.evaluate('window.__stress(3000)')
        out['stress'] = {'booms': s['booms'], 'fps': s['avgFps'], 'p95': s['p95'], 'worst': s['worst'], 'peak': s['peak']}
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4}); await pg.wait_for_timeout(600)
        s4 = await pg.evaluate('window.__stress(3000)')
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
        out['throttled'] = {'fps': s4['avgFps'], 'p95': s4['p95'], 'q': s4['quality']}
        await pg.wait_for_timeout(1500)
        t = await pg.evaluate(MANY)
        a0 = await pg.evaluate('window.__raf'); await pg.wait_for_timeout(2000); a1 = await pg.evaluate('window.__raf')
        out['many'] = {'ms': t, 'raf': a1 - a0}
        await b.close()
    meta = json.load(open('dist/meta.json'))
    out['size'] = {'all': meta['gzipKB'], 'core': meta['core']['gzipKB']}
    json.dump(out, open('site/measured.json', 'w'), ensure_ascii=False, indent=2)
    print(json.dumps(out, ensure_ascii=False, indent=1))
    print('errors:', errs[:5])

asyncio.run(main())
