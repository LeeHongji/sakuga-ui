# Round-3 site screenshots: the states Codex asked to see. usage: site_shots3.py OUTDIR
import sys, asyncio, pathlib
from playwright.async_api import async_playwright
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '_review/site3'); out.mkdir(parents=True, exist_ok=True)
GO = "(s) => { const e = document.querySelector(s); scrollTo({ top: e.getBoundingClientRect().top + scrollY - 16, behavior: 'instant' }); }"
SHOTS = []
L3, TH = ['zh', 'en', 'ja'], ['light', 'dark']
for l in L3:
    for th in TH:
        for h in (844, 667):
            SHOTS.append((f'{l}_drawer_{h}_{th}', 390, h, l, th, 'drawer', None))
        SHOTS.append((f'{l}_drawer_end_844_{th}', 390, 844, l, th, 'drawer-end', None))
        SHOTS.append((f'{l}_phone_cover_{th}', 390, 844, l, th, None, '#cover'))
        SHOTS.append((f'{l}_phone_vocab_{th}', 390, 844, l, th, None, '#vocab'))
        SHOTS.append((f'{l}_phone_hold_{th}', 390, 844, l, th, None, '#c-sk-hold-button'))
        SHOTS.append((f'{l}_phone_accordion_{th}', 390, 844, l, th, None, '#c-sk-accordion'))
        for sec in ('start', 'actions', 'feedback', 'theming', 'forms', 'vocab'):
            if l == 'zh' and sec in ('forms', 'vocab') and th == 'light': continue
            SHOTS.append((f'{l}_{sec}_{th}', 1440, 900, l, th, None, '#' + sec))
    SHOTS.append((f'{l}_phone_start_code_end', 390, 844, l, 'light', 'code-end', '#start'))
    SHOTS.append((f'{l}_phone_start', 390, 844, l, 'light', None, '#start'))
    SHOTS.append((f'{l}_phone_theming', 390, 844, l, 'light', None, '#theming'))
for th in TH:
    SHOTS.append((f'zh_actions_1440x1000_{th}', 1440, 1000, 'zh', th, None, '#actions'))
    SHOTS.append((f'zh_actions_1181x1000_{th}', 1181, 1000, 'zh', th, None, '#actions'))
    SHOTS.append((f'zh_start_third_{th}', 1440, 900, 'zh', th, None, '#start .koma:nth-child(3)'))
SHOTS.append(('zh_actions_1179x1000_light', 1179, 1000, 'zh', 'light', None, '#actions'))
SHOTS.append(('zh_phone_theming_dark', 390, 844, 'zh', 'dark', None, '#theming'))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errs = []
        for name, w, h, lang, th, mode, sel in SHOTS:
            pg = await b.new_page(viewport={'width': w, 'height': h})
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script("try{localStorage.setItem('sk-lang','%s')}catch(e){}" % lang)
            await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(1900)
            await pg.evaluate("Sakuga.setTheme('%s'); Sakuga.configure({sound:false}); document.querySelectorAll('.koma').forEach(k=>k.classList.add('in'))" % th)
            await pg.wait_for_timeout(700)
            if sel: await pg.evaluate(GO, sel); await pg.wait_for_timeout(350)
            if mode in ('drawer', 'drawer-end'):
                await pg.click('#menu-btn'); await pg.wait_for_timeout(800)
                if mode == 'drawer-end': await pg.evaluate("document.querySelector('#nav').scrollTop = 1e5"); await pg.wait_for_timeout(200)
            if mode == 'code-end':
                await pg.evaluate("(() => { const pre = document.querySelector('#start .code pre'); pre.scrollLeft = 1e5; })()"); await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(out / (name + '.png')))
            await pg.close()
        print(len(SHOTS), 'shots; errors:', errs[:5])
        await b.close()
asyncio.run(main())
