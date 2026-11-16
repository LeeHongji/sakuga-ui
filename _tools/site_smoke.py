# Click through every demo on the docs site in both themes and report errors and leftovers.
import asyncio, json
from playwright.async_api import async_playwright
POKE = """async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)); let n = 0;
  for (const st of document.querySelectorAll('.koma .stage, .strip')) {
    for (const el of st.querySelectorAll('*')) {
      if (!el.tagName.startsWith('SK-')) continue;
      const tag = el.tagName.toLowerCase();
      if (['sk-dialog','sk-drawer','sk-tab','sk-step','sk-menu-item','sk-accordion','sk-skeleton','sk-spinner','sk-avatar','sk-divider','sk-word','sk-tooltip','sk-breadcrumb','sk-card','sk-badge','sk-bubble','sk-counter','sk-alert','sk-ring','sk-progress','sk-steps'].includes(tag)) continue;
      if (tag === 'sk-radio') { el.click(); n++; continue; }
      if (tag === 'sk-segmented') { const b = el.querySelectorAll('button'); b[b.length - 1].click(); n++; continue; }
      if (tag === 'sk-hold-button') continue;
      const r = el.shadowRoot; if (!r) continue;
      if (tag === 'sk-tabs') { el.pick(1, true); n++; continue; }
      if (tag === 'sk-pagination') { el.go(el.page + 2); n++; continue; }
      if (tag === 'sk-calendar') { r.querySelector('[data-m="1"]').click(); r.querySelectorAll('.d')[12].click(); n++; continue; }
      if (tag === 'sk-rating') { r.querySelectorAll('button')[4].click(); n++; continue; }
      if (tag === 'sk-stepper') { r.querySelectorAll('button')[1].click(); n++; continue; }
      if (tag === 'sk-otp') { r.querySelectorAll('input').forEach((c, i) => { c.value = String(i); c.dispatchEvent(new Event('input', { bubbles: true })); }); n++; continue; }
      if (tag === 'sk-input' || tag === 'sk-textarea') { const c = r.querySelector('#c'); c.focus(); c.value = 'abc'; c.dispatchEvent(new Event('input', { bubbles: true })); n++; continue; }
      if (tag === 'sk-slider') { const s = r.querySelector('.s'); s.focus(); s.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); n++; continue; }
      if (tag === 'sk-select') { r.querySelector('.trig').click(); await w(60); const o = r.querySelectorAll('.opt'); o[o.length - 1].click(); n++; continue; }
      if (tag === 'sk-kbd') { el.press(true); el.press(false); n++; continue; }
      if (tag === 'sk-accordion-item') { r.querySelector('.head').click(); n++; continue; }
      const b = r.querySelector('button'); if (b) { b.click(); n++; }
      await w(15);
    }
  }
  await w(400);
  document.querySelectorAll('sk-menu-item').forEach((m, i) => { if (i === 0) m.click(); });
  document.querySelectorAll('sk-bubble').forEach(b => b.pop());
  const tg = document.querySelector('sk-tag[removable]'); if (tg) tg.shadowRoot.querySelector('button').click();
  for (const t of document.querySelectorAll('#prims .tile, #voices .tile, #sounds button')) { t.click(); await w(8); }
  await w(2600);
  document.querySelectorAll('sk-dialog,sk-drawer').forEach(d => { d.open = false; });
  document.querySelectorAll('sk-popover,sk-menu').forEach(d => { d.open = false; });
  await w(3200);
  return { poked: n, stats: Sakuga.FX.stats(), words: document.querySelectorAll('.sk-w').length, toasts: document.querySelectorAll('sk-toast').length, openLayers: document.querySelectorAll('sk-dialog[open],sk-drawer[open]').length, scrollLock: document.documentElement.style.overflow };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        pg.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type in ('error', 'warning') and '404' not in m.text else None)
        await pg.goto('http://localhost:8823/'); await pg.wait_for_timeout(2500)
        await pg.mouse.click(700, 30)
        for lg in ('zh', 'en', 'ja'):
            await pg.evaluate(f"document.querySelector('#c-lang button[value={lg}]').click()"); await pg.wait_for_timeout(500)
            r = await pg.evaluate("({lang: document.documentElement.lang, h2: document.querySelector('#start h2').textContent, nav: document.querySelector('#nav a.it').textContent, desc: document.querySelector('#c-sk-switch .cap').textContent.slice(0, 40), empty: [...document.querySelectorAll('[data-t]')].filter(e => !e.textContent.trim()).length})")
            print('lang', json.dumps(r, ensure_ascii=False))
        for theme in ('light', 'dark'):
            await pg.evaluate(f"Sakuga.setTheme('{theme}')")
            r = await pg.evaluate(POKE)
            print(theme, json.dumps(r, ensure_ascii=False))
        await pg.evaluate("Sakuga.configure({fx:'off'})"); r = await pg.evaluate(POKE); print('fx off', json.dumps(r, ensure_ascii=False))
        await pg.evaluate("Sakuga.configure({fx:'lite', sound:false, fps:12})"); r = await pg.evaluate(POKE); print('lite/12fps/muted', json.dumps(r, ensure_ascii=False))
        print('errors:', errs[:12])
        await pg.evaluate("Sakuga.configure({fx:'full', sound:true, fps:24}); Sakuga.setTheme('dark'); scrollTo(0,0)")
        await pg.wait_for_timeout(600); await pg.screenshot(path='_shots/site_dark.png')
        await b.close()
asyncio.run(main())
