# Padding check for boxes the pixel audit cannot isolate (no border of their own, skewed, or with a tail):
# distance from the text's own box (a DOM range) to the inside of the container, in css px.
import asyncio, urllib.parse
from playwright.async_api import async_playwright
FIX = [
    ('tab', '<sk-tabs value="a" style="width:300px"><sk-tab value="a" label="Overview">One</sk-tab><sk-tab value="b" label="Notes">Two</sk-tab></sk-tabs>', "document.querySelector('sk-tabs').shadowRoot.querySelector('.nav button')", ''),
    ('bubble', '<sk-bubble tail="none">Hello there</sk-bubble>', "document.querySelector('sk-bubble').shadowRoot.querySelector('.b')", "document.querySelector('sk-bubble')"),
    ('bubble shout', '<sk-bubble variant="shout" tail="none">HELLO THERE</sk-bubble>', "document.querySelector('sk-bubble').shadowRoot.querySelector('.b')", "document.querySelector('sk-bubble')"),
    ('accordion head', '<sk-accordion style="width:300px"><sk-accordion-item label="Section title">Text</sk-accordion-item></sk-accordion>', "document.querySelector('sk-accordion-item').shadowRoot.querySelector('.head')", "document.querySelector('sk-accordion-item').shadowRoot.querySelector('.lbl')"),
    ('accordion body', '<sk-accordion style="width:300px"><sk-accordion-item label="Section title" open>Inside text</sk-accordion-item></sk-accordion>', "document.querySelector('sk-accordion-item').shadowRoot.querySelector('.pad')", "document.querySelector('sk-accordion-item')"),
    ('card header', '<sk-card style="width:220px"><span slot="header">Section</span>Sentence<sk-button slot="footer" size="sm">Read</sk-button></sk-card>', "document.querySelector('sk-card').shadowRoot.querySelector('.c')", "document.querySelector('sk-card [slot=header]')"),
    ('card footer btn', '<sk-card style="width:220px"><span slot="header">Section</span>Sentence<sk-button slot="footer" size="sm">Read</sk-button></sk-card>', "document.querySelector('sk-card').shadowRoot.querySelector('.c')", "document.querySelector('sk-card sk-button')"),
    ('dialog title', '<sk-dialog open title="Remove it"><p style="margin:0">Text here</p><sk-button slot="footer" size="sm">Close</sk-button></sk-dialog>', "document.querySelector('sk-dialog').shadowRoot.querySelector('.panel')", "document.querySelector('sk-dialog').shadowRoot.querySelector('.ttl')"),
    ('dialog close', '<sk-dialog open title="Remove it"><p style="margin:0">Text here</p></sk-dialog>', "document.querySelector('sk-dialog').shadowRoot.querySelector('.panel')", "document.querySelector('sk-dialog').shadowRoot.querySelector('.x svg')"),
    ('dialog footer btn', '<sk-dialog open title="Remove it"><p style="margin:0">Text here</p><sk-button slot="footer" size="sm">Close</sk-button></sk-dialog>', "document.querySelector('sk-dialog').shadowRoot.querySelector('.panel')", "document.querySelector('sk-dialog sk-button')"),
    ('drawer title', '<sk-drawer open title="Settings"><p style="margin:0">Text here</p></sk-drawer>', "document.querySelector('sk-drawer').shadowRoot.querySelector('.panel')", "document.querySelector('sk-drawer').shadowRoot.querySelector('.ttl')"),
    ('progress badge', '<sk-progress value="40"></sk-progress>', "document.querySelector('sk-progress').shadowRoot.querySelector('.badge')", "document.querySelector('sk-progress').shadowRoot.querySelector('.badge b')"),
    ('calendar', '<sk-calendar value="2026-11-18"></sk-calendar>', "document.querySelector('sk-calendar').shadowRoot.querySelector('[part=base]') || document.querySelector('sk-calendar').shadowRoot.firstElementChild", "document.querySelector('sk-calendar').shadowRoot.querySelector('.d')"),
    ('menu popup', '<sk-menu open><sk-button slot="trigger" size="sm">Menu</sk-button><sk-menu-item>Rename</sk-menu-item><sk-menu-item>Remove</sk-menu-item></sk-menu>', "document.querySelector('sk-menu').shadowRoot.querySelector('.pop')", "document.querySelector('sk-menu-item')"),
    ('select popup', '<sk-select value="b"><option value="a">Anna</option><option value="b">Bruno</option></sk-select>', "(document.querySelector('sk-select').show(), document.querySelector('sk-select').shadowRoot.querySelector('.pop'))", "document.querySelector('sk-select').shadowRoot.querySelector('.opt')"),
]
JS = """([box, inner]) => {
  const b = box.getBoundingClientRect(), cs = getComputedStyle(box);
  const bw = ['Left', 'Top', 'Right', 'Bottom'].map(k => parseFloat(cs['border' + k + 'Width']) || 0);
  let r;
  if (inner && inner !== box) r = inner.getBoundingClientRect();
  else { const g = document.createRange(); g.selectNodeContents(box); r = g.getBoundingClientRect(); }
  const f = v => Math.round(v * 10) / 10;
  return [f(r.left - b.left - bw[0]), f(b.right - bw[2] - r.right), f(r.top - b.top - bw[1]), f(b.bottom - bw[3] - r.bottom), f(b.width), f(b.height), cs.padding];
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        print('%-18s %6s %6s %6s %6s   %-10s %s' % ('box / content', 'left', 'right', 'top', 'bottom', 'size', 'css padding'))
        for name, markup, box, inner in FIX:
            pg = await b.new_page(viewport={'width': 560, 'height': 460})
            await pg.goto('http://localhost:8823/site/dev.html#' + urllib.parse.quote(markup))
            await pg.wait_for_function('window.__ready'); await pg.wait_for_timeout(300)
            await pg.evaluate("S.configure({ sound: false, fx: 'off' })"); await pg.wait_for_timeout(700)
            try:
                h = await pg.evaluate_handle('() => [%s, %s]' % (box, inner or 'null'))
                L, R, T, B, w, hh, pad = await pg.evaluate(JS, h)
                print('%-18s %6.1f %6.1f %6.1f %6.1f   %-10s %s' % (name, L, R, T, B, '%gx%g' % (w, hh), pad))
            except Exception as e:
                print('%-18s could not measure: %s' % (name, str(e).split('\n')[0][:80]))
            await pg.close()
        await b.close()
asyncio.run(main())
