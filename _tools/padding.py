# Optical padding audit: for each component, how far is the visible content from each inner edge of its box?
# Measured on pixels (4x), so italic slant, icon shapes and font metrics are all accounted for the way the eye sees them.
# Labels use words without descenders so the vertical numbers are about cap height, as a designer would centre it.
# Boxes without a border of their own (tabs, bubbles, card and dialog headers) are measured by padding_dom.py instead.
# usage: padding.py [name ...]      prints a table; lines marked ! are off by more than 1 css px
import sys, asyncio, io, urllib.parse
from collections import Counter
from PIL import Image
from playwright.async_api import async_playwright
S = 4
SEL = '<sk-select value="b"><option value="a">Anna</option><option value="b">Bruno</option></sk-select>'
SEG = '<sk-segmented value="b"><button value="a">Dawn</button><button value="b">Noon</button><button value="c">Dusk</button></sk-segmented>'
FIX = [
    # name, markup, locator of the box, js to run first, axes to judge ('hv', 'h', 'v')
    ('button', '<sk-button>Confirm</sk-button>', 'sk-button >> button', '', 'hv'),
    ('button sm', '<sk-button size="sm">Confirm</sk-button>', 'sk-button >> button', '', 'hv'),
    ('button lg', '<sk-button size="lg">Confirm</sk-button>', 'sk-button >> button', '', 'hv'),
    ('button primary', '<sk-button variant="primary">Confirm</sk-button>', 'sk-button >> button', '', 'hv'),
    ('button solid', '<sk-button variant="solid">Confirm</sk-button>', 'sk-button >> button', '', 'hv'),
    ('button done', '<sk-button>Confirm</sk-button>', 'sk-button >> button', 'document.querySelector("sk-button").done(0)', 'hv'),
    ('button loading', '<sk-button loading>Confirm</sk-button>', 'sk-button >> button', '', ''),   # a turning comet: only its size matters, see the size column
    ('hold button', '<sk-hold-button>Hold on</sk-hold-button>', 'sk-hold-button >> button', '', 'hv'),
    ('like', '<sk-like count="128"></sk-like>', 'sk-like >> button', '', 'v'),   # icon first: its side is meant to be a little tighter
    ('copy', '<sk-copy value="x" label="Clone"></sk-copy>', 'sk-copy >> button', '', 'hv'),
    ('copy done', '<sk-copy value="x" label="Clone"></sk-copy>', 'sk-copy >> button', 'document.querySelector("sk-copy").toggleAttribute("data-done", true)', 'hv'),
    ('segmented item', SEG, 'sk-segmented >> .ind', '', 'hv'),
    ('checkbox', '<sk-checkbox checked>Remember</sk-checkbox>', 'sk-checkbox >> button', '', 'h'),   # the tick's own shape is measured in padding_dom terms: its path is centred in its viewBox
    ('input', '<sk-input value="Search" style="width:200px"></sk-input>', 'sk-input >> .field', '', 'v'),
    ('input clearable', '<sk-input value="Search" clearable style="width:200px"></sk-input>', 'sk-input >> .field', '', 'hv'),
    ('textarea', '<sk-textarea rows="2" value="Notes" style="width:200px"></sk-textarea>', 'sk-textarea >> .field', '', ''),
    ('select', SEL, 'sk-select >> .trig', '', 'hv'),
    ('select option', SEL, 'sk-select >> .opt >> nth=1', 'document.querySelector("sk-select").show()', 'v'),
    ('stepper minus', '<sk-stepper value="3"></sk-stepper>', 'sk-stepper >> button >> nth=0', '', 'hv'),
    ('stepper plus', '<sk-stepper value="3"></sk-stepper>', 'sk-stepper >> button >> nth=1', '', 'hv'),
    ('stepper value', '<sk-stepper value="3"></sk-stepper>', 'sk-stepper >> .val', '', 'hv'),
    ('otp cell', '<sk-otp length="4"></sk-otp>', 'sk-otp >> input >> nth=0', '(()=>{const c=document.querySelector("sk-otp").shadowRoot.querySelector("input");c.value="8";c.dispatchEvent(new Event("input",{bubbles:true}));c.blur()})()', 'hv'),
    ('toast', '<sk-toast duration="0">Saved</sk-toast>', 'sk-toast >> .t', '', 'hv'),
    ('alert', '<sk-alert title="Heads up" style="width:260px">Notice sent</sk-alert>', 'sk-alert >> .a', '', 'v'),
    ('alert closable', '<sk-alert title="Heads up" closable style="width:260px">Notice sent</sk-alert>', 'sk-alert >> .a', '', 'v'),
    ('badge', '<sk-badge value="3"></sk-badge>', 'sk-badge >> .b', '', 'hv'),
    ('badge word', '<sk-badge value="NEW" variant="peri"></sk-badge>', 'sk-badge >> .b', '', 'hv'),
    ('tag', '<sk-tag>NOTE</sk-tag>', 'sk-tag >> [part=base]', '', 'hv'),
    ('tag removable', '<sk-tag removable>NOTE</sk-tag>', 'sk-tag >> [part=base]', '', 'hv'),
    ('tooltip', '<sk-tooltip content="Hint text"><sk-button size="sm">Hover</sk-button></sk-tooltip>', 'sk-tooltip >> .tip', 'document.querySelector("sk-tooltip").dispatchEvent(new PointerEvent("pointerenter"))', 'hv'),
    ('menu item', '<sk-menu open><sk-button slot="trigger" size="sm">Menu</sk-button><sk-menu-item>Rename</sk-menu-item><sk-menu-item>Remove</sk-menu-item></sk-menu>', 'sk-menu-item >> nth=0', '', 'v'),
    ('popover', '<sk-popover open><sk-button slot="trigger" size="sm">Open</sk-button>Hidden text</sk-popover>', 'sk-popover >> .pop', '', 'v'),
    ('pagination current', '<sk-pagination page="2" total="9"></sk-pagination>', 'sk-pagination >> button[aria-current]', '', 'hv'),
    ('pagination other', '<sk-pagination page="2" total="9"></sk-pagination>', 'sk-pagination >> button >> nth=1', '', 'hv'),
    ('steps dot', '<sk-steps current="1" style="width:300px"><sk-step label="Cart"></sk-step><sk-step label="Send"></sk-step><sk-step label="Done"></sk-step></sk-steps>', 'sk-steps >> .dot >> nth=1', '', 'hv'),
    ('kbd', '<sk-kbd>K</sk-kbd>', 'sk-kbd >> [part=base]', '', 'hv'),
    ('avatar', '<sk-avatar name="Ken Mori"></sk-avatar>', 'sk-avatar >> [part=base]', '', 'hv'),
    ('card body', '<sk-card style="width:220px"><span slot="header">Episode</span>Sentence<sk-button slot="footer" size="sm">Read</sk-button></sk-card>', 'sk-card >> .b', '', ''),
    ('card', '<sk-card style="width:220px"><span slot="header">Episode</span>Sentence<sk-button slot="footer" size="sm">Read</sk-button></sk-card>', 'sk-card >> .c', '', ''),
]

def measure(png, bw, off, rad=0):
    im = Image.open(io.BytesIO(png)).convert('RGB'); W, H = im.size; px = im.load()
    ox, oy, ew, eh = off          # element's offset inside the clip and its size, css px
    G = 5
    x0, y0 = int(round((ox + bw[0]) * S)) + G, int(round((oy + bw[1]) * S)) + G
    x1, y1 = int(round((ox + ew - bw[2]) * S)) - G, int(round((oy + eh - bw[3]) * S)) - G
    if x1 - x0 < 8 or y1 - y0 < 8: return None
    cnt = Counter(px[x, y] for x in range(x0, x1, 2) for y in range(y0, y1, 2))
    bg = cnt.most_common(1)[0][0]
    ink = lambda p: abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > 110
    # rows used for left and right, and columns used for top and bottom: everything except the rounded corners,
    # and never less than the middle 30%
    rp = int(rad * S); hh, ww = y1 - y0, x1 - x0
    ya, yb = y0 + min(rp, int(hh * 0.35)), y1 - min(rp, int(hh * 0.35))
    xa, xb = x0 + min(rp, int(ww * 0.35)), x1 - min(rp, int(ww * 0.35))
    xs = [x for x in range(x0, x1) if any(ink(px[x, y]) for y in range(ya, yb))]
    ys = [y for y in range(y0, y1) if any(ink(px[x, y]) for x in range(xa, xb))]
    if not xs or not ys: return None
    f = lambda v: round(v / S, 1)
    return f(xs[0] - x0 + G), f(x1 - xs[-1] - 1 + G), f(ys[0] - y0 + G), f(y1 - ys[-1] - 1 + G), round(ew, 1), round(eh, 1)

async def main():
    only = sys.argv[1:]
    async with async_playwright() as p:
        b = await p.chromium.launch()
        print('%-20s %6s %6s %6s %6s   %-9s %s' % ('component', 'left', 'right', 'top', 'bottom', 'size', 'verdict'))
        bad = 0
        for name, markup, loc, pre, axes in FIX:
            if only and not any(o in name for o in only): continue
            pg = await b.new_page(viewport={'width': 520, 'height': 420}, device_scale_factor=S)
            await pg.goto('http://localhost:8823/site/dev.html#' + urllib.parse.quote(markup))
            await pg.wait_for_function('window.__ready'); await pg.wait_for_timeout(350)
            await pg.evaluate("S.configure({ sound: false, fx: 'off' })")
            if pre: await pg.evaluate(pre)
            await pg.wait_for_timeout(900)
            el = pg.locator(loc).first
            try:
                bw = await el.evaluate("e => { const c = getComputedStyle(e); return [c.borderLeftWidth, c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderTopLeftRadius].map(parseFloat); }")
                await el.scroll_into_view_if_needed()
                q = await el.evaluate('e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }')
                import math
                cx, cy = math.floor(q[0]), math.floor(q[1]); cw, ch = math.ceil(q[0] + q[2]) - cx, math.ceil(q[1] + q[3]) - cy
                m = measure(await pg.screenshot(clip={'x': cx, 'y': cy, 'width': cw, 'height': ch}), bw[:4], (q[0] - cx, q[1] - cy, q[2], q[3]), bw[4] or 0)
                import os
                if os.environ.get('SAVE'):
                    os.makedirs(os.environ['SAVE'], exist_ok=True)
                    await pg.screenshot(path=os.path.join(os.environ['SAVE'], name.replace(' ', '_') + '.png'), clip={'x': cx - 8, 'y': cy - 8, 'width': cw + 18, 'height': ch + 18})
            except Exception as e:
                print('%-20s  could not measure: %s' % (name, str(e).split('\n')[0][:70])); await pg.close(); continue
            await pg.close()
            if not m: print('%-20s  nothing to measure' % name); continue
            L, R, T, B, w, h = m
            notes = []
            if 'h' in axes and abs(L - R) > 1: notes.append('! left/right differ by %.1f' % abs(L - R))
            if 'v' in axes and abs(T - B) > 1: notes.append('! top/bottom differ by %.1f' % abs(T - B))
            if 'h' in axes and 'v' in axes and min(L, R) < min(T, B) - 0.5 and w > h * 1.3: notes.append('! sides tighter than top/bottom')
            bad += len(notes)
            print('%-20s %6.1f %6.1f %6.1f %6.1f   %-9s %s' % (name, L, R, T, B, '%gx%g' % (w, h), '; '.join(notes) or ('ok' if axes == 'hv' else 'ok (%s only)' % {'h': 'left/right', 'v': 'top/bottom'}[axes] if axes else 'not judged: see the note on this fixture')))
        print('flagged:', bad)
        await b.close()
asyncio.run(main())
