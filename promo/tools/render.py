# Render the film frame by frame on a virtual clock.
#   render.py --out renders/draft.mp4 [--from S] [--to E]       video of film time [S, E)
#   render.py --stills 1.5,5,8.5 [--from S] --dir evidence/stills  PNG stills at those film times
#   render.py --out renders/film.mp4 --sfx assets/sfx-product.wav   full film plus the library's own sounds
# Page time only moves when __step is called: timers, intervals, requestAnimationFrame, performance.now, Web Animations,
# CSS animations and transitions all follow it, so every frame is exact whatever the screenshot costs.
# The library's sounds go into one OfflineAudioContext that stands in for AudioContext and whose currentTime is the
# film clock, so each sound lands on the sample where its component fired it.
import argparse, asyncio, base64, json, pathlib, shutil, subprocess, sys, time
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
PLAN = json.loads((ROOT / 'plan.json').read_text())
FFMPEG = '/opt/homebrew/bin/ffmpeg'
ap = argparse.ArgumentParser()
ap.add_argument('--out'); ap.add_argument('--stills'); ap.add_argument('--dir', default=str(ROOT / 'evidence/stills'))
ap.add_argument('--from', dest='t0', type=float, default=0); ap.add_argument('--to', dest='t1', type=float)
ap.add_argument('--sfx'); ap.add_argument('--fps', type=int, default=PLAN['fps']); ap.add_argument('--port', type=int, default=8830)
ap.add_argument('--q', type=int, default=92)
a = ap.parse_args()
DUR = PLAN['duration']
t1 = a.t1 if a.t1 is not None else DUR
stills = sorted(float(x) for x in a.stills.split(',')) if a.stills else None
if stills: t1 = max(stills) + 2 / a.fps

INIT = """(() => {
  let s = 0x5a6b7c;   // fixed seed: particles, jitter and noise come out the same every render
  Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const SR = 48000, LEN = %f;
  function FakeAudioContext() {
    if (window.__oc) return window.__oc;
    const oc = new OfflineAudioContext(2, Math.ceil(SR * LEN), SR);
    Object.defineProperty(oc, 'currentTime', { get: () => window.FILM && window.FILM.T0 != null ? Math.max(0, (performance.now() - window.FILM.T0) / 1000) : 0 });
    Object.defineProperty(oc, 'state', { get: () => 'running' });
    oc.resume = () => Promise.resolve(); oc.suspend = () => Promise.resolve(); oc.close = () => Promise.resolve();
    window.__oc = oc; return oc;
  }
  window.AudioContext = window.webkitAudioContext = FakeAudioContext;
})()""" % (DUR + 3)

CLOCK = """() => {
  const V = window.__V = { now: performance.now(), timers: [], rafs: [], id: 1, seen: new WeakMap(), kept: new Set() };
  const realRaf = window.requestAnimationFrame.bind(window);
  performance.now = () => V.now;
  Date.now = () => 1794787200000 + V.now;   // 2026-11-16, fixed
  window.setTimeout = (f, ms, ...r) => { const id = V.id++; V.timers.push({ id, due: V.now + (ms || 0), f: () => f(...r) }); return id; };
  window.setInterval = (f, ms, ...r) => { const id = V.id++, every = Math.max(4, ms || 0); const t = { id, due: V.now + every, f: () => { t.due += every; V.timers.push(t); f(...r); } }; V.timers.push(t); return id; };
  window.clearTimeout = window.clearInterval = id => { V.timers = V.timers.filter(t => t.id !== id); V.dead = id; };
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
    for (let guard = 0; guard < 4000; guard++) {
      V.timers.sort((p, q) => p.due - q.due);
      const t = V.timers[0]; if (!t || t.due > T) break;
      V.timers.shift(); V.now = Math.max(prev, t.due); try { t.f(); } catch (e) { console.error(e); }
    }
    V.now = T;
    const rafs = V.rafs; V.rafs = [];
    for (const r of rafs) { try { r.f(T); } catch (e) { console.error(e); } }
    for (const x of all()) {
      if (!V.seen.has(x)) V.seen.set(x, prev);
      if (x.playState === 'finished' || x.playState === 'idle') { V.kept.delete(x); continue; }
      const t = T - V.seen.get(x), end = x.effect ? x.effect.getComputedTiming().endTime : 0;
      try { if (t >= end) { x.playbackRate = 1; x.finish(); } else { x.playbackRate = 0; ct.set.call(x, t); } } catch (e) { }
    }
    await new Promise(res => realRaf(() => realRaf(res)));
    return window.FILM.drain();
  };
}"""

async def main():
    frames = None
    if a.out:
        frames = pathlib.Path(a.out).with_suffix('.frames'); shutil.rmtree(frames, ignore_errors=True); frames.mkdir(parents=True)
    if stills: pathlib.Path(a.dir).mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--font-render-hinting=none'])
        ctx = await b.new_context(viewport={'width': 960, 'height': 540}, device_scale_factor=2, permissions=['clipboard-read', 'clipboard-write'])
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.add_init_script(INIT)
        await pg.goto(f'http://localhost:{a.port}/promo/film/index.html')
        await pg.wait_for_function('window.FILM && window.FILM.ready', timeout=30000)
        await pg.evaluate(f'({CLOCK})()')
        await pg.evaluate('t => FILM.start(t)', a.t0)
        dt = 1000 / a.fps
        n = round((t1 - a.t0) * a.fps)
        si = 0; started = time.time(); ops = []
        for i in range(n):
            t = a.t0 + i / a.fps
            for op in ops:
                k = op['k']
                if k == 'move': await pg.mouse.move(op['x'], op['y'])
                elif k == 'down': await pg.mouse.down()
                elif k == 'up': await pg.mouse.up()
                elif k == 'key': await pg.keyboard.press(op['key'])
            if frames: await pg.screenshot(path=str(frames / f'{i:05d}.jpg'), type='jpeg', quality=a.q)
            while stills and si < len(stills) and stills[si] <= t + 0.5 / a.fps:
                await pg.screenshot(path=str(pathlib.Path(a.dir) / f't{stills[si]:06.2f}.png')); si += 1
            ops = await pg.evaluate('dt => __step(dt)', dt)
            if i % 300 == 0: print(f'  t={t:6.2f}s  {time.time() - started:6.1f}s elapsed', flush=True)
        if a.sfx:
            await pg.evaluate("FILM.flush()")
            n_ch = await pg.evaluate("async () => { if (!window.__oc) return 0; window.__buf = await window.__oc.startRendering(); return window.__buf.numberOfChannels; }")
            if n_ch:
                import numpy as np, soundfile as sf
                L = await pg.evaluate('__buf.length'); chans = []
                for c in range(n_ch):
                    parts = []
                    for off in range(0, L, 1 << 20):
                        s = await pg.evaluate("([c, o, n]) => { const d = __buf.getChannelData(c).subarray(o, o + n); const u = new Uint8Array(d.buffer, d.byteOffset, d.byteLength); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }", [c, off, 1 << 20])
                        parts.append(np.frombuffer(base64.b64decode(s), dtype=np.float32))
                    chans.append(np.concatenate(parts))
                data = np.stack(chans, 1)[:round(DUR * 48000)]
                sf.write(a.sfx, data, 48000, subtype='FLOAT')
                print('sfx', a.sfx, data.shape, 'peak', float(np.abs(data).max()))
            else: print('sfx: no AudioContext was created')
        await b.close()
    print('errors:', errs[:6])
    if frames:
        subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-framerate', str(a.fps), '-i', str(frames / '%05d.jpg'),
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', a.out], check=True)
        shutil.rmtree(frames)
        print(a.out, n, 'frames', f'{time.time() - started:.0f}s')
asyncio.run(main())
