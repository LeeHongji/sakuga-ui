# Record one component interaction as a 60 fps clip, frame-exact: the page runs on a virtual clock that is stepped
# 1/60 s per frame (timers, requestAnimationFrame, performance.now, Web Animations and CSS transitions all follow it).
# usage: capture.py OUT.mp4 MARKUP ACTION DURATION_MS [--size 540] [--dsf 2] [--pre JS] [--theme light] [--lead 12]
#   ACTION: click:<sel> | press:<sel>:<holdMs> | drag:<sel>:<fromFrac>:<toFrac>:<ms>[:<holdMs>] | js:<code> | seq:<sel>:<gapMs>
#   <sel> may reach into shadow roots (Playwright does). --lead is the number of untouched frames before the input.
import sys, asyncio, argparse, pathlib, shutil, subprocess, urllib.parse
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument('out'); ap.add_argument('markup'); ap.add_argument('action'); ap.add_argument('ms', type=float)
ap.add_argument('--size', type=int, default=540); ap.add_argument('--dsf', type=float, default=2)
ap.add_argument('--pre', default=''); ap.add_argument('--theme', default='light'); ap.add_argument('--lead', type=int, default=12)
ap.add_argument('--k', type=float, default=1)   # accepted for old command lines; unused
a = ap.parse_args()
kind, _, rest = a.action.partition(':')

CLOCK = """() => {
  const V = window.__V = { now: performance.now(), timers: [], rafs: [], id: 1, seen: new WeakMap(), kept: new Set() };
  const realRaf = window.requestAnimationFrame.bind(window);
  performance.now = () => V.now;
  window.setTimeout = (f, ms, ...r) => { const id = V.id++; V.timers.push({ id, due: V.now + (ms || 0), f: () => f(...r) }); return id; };
  window.clearTimeout = id => { V.timers = V.timers.filter(t => t.id !== id); };
  window.requestAnimationFrame = f => { const id = V.id++; V.rafs.push({ id, f }); return id; };
  window.cancelAnimationFrame = id => { V.rafs = V.rafs.filter(t => t.id !== id); };
  const an = Element.prototype.animate;
  const ct = Object.getOwnPropertyDescriptor(Animation.prototype, 'currentTime');
  Element.prototype.animate = function (kf, o) {
    const x = an.call(this, kf, o); V.seen.set(x, V.now); V.kept.add(x); x.playbackRate = 0;
    Object.defineProperty(x, 'currentTime', { configurable: true, get() { return ct.get.call(x); }, set(v) { V.seen.set(x, V.now - v); ct.set.call(x, v); } });
    return x;
  };
  const all = () => { const out = new Set(document.getAnimations()); const walk = r => r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) { e.shadowRoot.getAnimations().forEach(x => out.add(x)); walk(e.shadowRoot); } }); walk(document); out.forEach(x => V.kept.add(x)); return [...V.kept]; };
  window.__step = async dt => {
    const prev = V.now, T = prev + dt;
    for (let guard = 0; guard < 2000; guard++) {            // timers in due order, each seeing its own due time
      V.timers.sort((p, q) => p.due - q.due);
      const t = V.timers[0]; if (!t || t.due > T) break;
      V.timers.shift(); V.now = Math.max(prev, t.due); try { t.f(); } catch (e) { console.error(e); }
    }
    V.now = T;
    const rafs = V.rafs; V.rafs = [];
    for (const r of rafs) { try { r.f(T); } catch (e) { console.error(e); } }
    for (const x of all()) {
      if (!V.seen.has(x)) V.seen.set(x, prev);                // a CSS transition first seen now started during the last step
      if (x.playState === 'finished' || x.playState === 'idle') { V.kept.delete(x); continue; }
      const t = T - V.seen.get(x), end = x.effect ? x.effect.getComputedTiming().endTime : 0;
      try { if (t >= end) { x.playbackRate = 1; x.finish(); } else { x.playbackRate = 0; ct.set.call(x, t); } } catch (e) { /* detached */ }
    }
    await new Promise(res => realRaf(() => realRaf(res)));
  };
}"""

async def main():
    out = pathlib.Path(a.out); tmp = out.with_suffix('.frames')
    shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(parents=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width': a.size, 'height': a.size}, device_scale_factor=a.dsf)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto('http://localhost:8823/site/dev.html#' + urllib.parse.quote(a.markup))
        await pg.wait_for_function('window.__ready'); await pg.wait_for_timeout(500)
        await pg.evaluate("(th) => { document.body.style.margin = 0; const m = document.getElementById('mount'); m.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;place-content:center;gap:24px'; S.setTheme(th); S.configure({ sound: false }); return S.loadFaces(); }", a.theme)
        await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(700)
        if a.pre: await pg.evaluate(a.pre); await pg.wait_for_timeout(1500)
        await pg.evaluate(f'({CLOCK})()')
        n = int(a.ms * 60 / 1000) + a.lead
        sel = rest.split(':')[0] if kind != 'js' else None
        eb = await pg.locator(sel).first.bounding_box() if sel else None
        parts = rest.split(':')
        up_at = None; drag = None
        for i in range(n):
            f = i - a.lead                                        # frame index relative to the input
            if f == 0:
                if kind in ('click', 'seq', 'press'):
                    await pg.mouse.move(eb['x'] + eb['width'] / 2, eb['y'] + eb['height'] / 2); await pg.mouse.down()
                    if kind == 'press': up_at = round(float(parts[1]) * 60 / 1000)
                    else: await pg.mouse.up()
                elif kind == 'drag':
                    f0, f1, ms = float(parts[1]), float(parts[2]), float(parts[3]); hold = float(parts[4]) if len(parts) > 4 else 130
                    y = eb['y'] + eb['height'] / 2
                    await pg.mouse.move(eb['x'] + eb['width'] * f0, y); await pg.mouse.down()
                    drag = (f0, f1, max(1, round(ms * 60 / 1000)), y); up_at = drag[2] + round(hold * 60 / 1000)
                elif kind == 'js':
                    await pg.evaluate(rest)
            elif f > 0:
                if drag and f <= drag[2]:
                    u = f / drag[2]; e = u * u * (3 - 2 * u)
                    await pg.mouse.move(eb['x'] + eb['width'] * (drag[0] + (drag[1] - drag[0]) * e), drag[3])
                if up_at is not None and f == up_at: await pg.mouse.up()
                if kind == 'seq' and f == round(float(parts[1]) * 60 / 1000): await pg.mouse.down(); await pg.mouse.up()
            await pg.evaluate('window.__step(1000 / 60)')
            await pg.screenshot(path=str(tmp / f'{i:04d}.jpg'), type='jpeg', quality=93)
        await b.close()
    subprocess.run(['/opt/homebrew/bin/ffmpeg', '-y', '-loglevel', 'error', '-framerate', '60', '-i', str(tmp / '%04d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', str(out)], check=True)
    shutil.rmtree(tmp)
    print(out, n, 'frames (input at frame %d)' % a.lead, 'errors:', errs[:4])
asyncio.run(main())
