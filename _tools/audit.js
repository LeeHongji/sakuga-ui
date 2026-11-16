// Page-side checks for the display audit. Loaded by audit.py and called as window.__audit.*
(() => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const name = el => {
    if (!el) return 'null';
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    return s;
  };
  const where = el => { const k = el.closest && el.closest('.koma[id], section[id], .dock'); return k ? name(k) : ''; };
  function deepAt(x, y) {
    let el = document.elementFromPoint(x, y);
    while (el && el.shadowRoot) { const e2 = el.shadowRoot.elementFromPoint(x, y); if (!e2 || e2 === el) break; el = e2; }
    return el;
  }
  function inside(el, host) {
    while (el) { if (el === host) return true; el = el.parentNode instanceof ShadowRoot ? el.parentNode.host : el.parentNode; }
    return false;
  }
  // how much of a box is actually on top at its own position, and how much of it is on screen
  function probe(box, host) {
    const r = box.getBoundingClientRect(), pe = box.style.pointerEvents;
    box.style.pointerEvents = 'auto';   // tooltips ignore the pointer; they still have to be on top
    let hit = 0, n = 0; const blockers = new Set();
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      const x = r.left + (r.width * (i + 0.5)) / 7, y = r.top + (r.height * (j + 0.5)) / 7;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      n++;
      const el = deepAt(x, y);
      if (inside(el, host)) hit++; else blockers.add(name(el));
    }
    box.style.pointerEvents = pe;
    const off = [r.left < -0.5 ? 'left' : '', r.top < -0.5 ? 'top' : '', r.right > innerWidth + 0.5 ? 'right' : '', r.bottom > innerHeight + 0.5 ? 'bottom' : ''].filter(Boolean);
    return { w: Math.round(r.width), h: Math.round(r.height), covered: n ? +(1 - hit / n).toFixed(2) : 1, blockers: [...blockers].slice(0, 4), off };
  }

  /* ---------- static layout ---------- */
  function layout() {
    const out = [];
    const de = document.documentElement;
    if (de.scrollWidth > innerWidth + 1) out.push({ kind: 'page-scrolls-sideways', by: de.scrollWidth - innerWidth });
    const dock = document.querySelector('.dock'), side = document.querySelector('.side'), navEl = document.querySelector('#nav');
    const dr = dock.getBoundingClientRect(), sr = side.getBoundingClientRect();
    const sideShown = sr.right > 1;
    if (sideShown && (dr.left < sr.left - 1 || dr.right > sr.right + 1 || dr.bottom > innerHeight + 1 || dr.top < 0)) out.push({ kind: 'console-outside-sidebar', dock: [dr.left, dr.top, dr.right, dr.bottom].map(Math.round) });
    if (sideShown && navEl.getBoundingClientRect().height < 110) out.push({ kind: 'contents-squeezed', h: Math.round(navEl.getBoundingClientRect().height) });
    if (!sideShown && !vis(document.querySelector('.menu-btn'))) out.push({ kind: 'no-way-to-open-contents' });
    const mr = document.querySelector('main').getBoundingClientRect();
    if (sideShown && mr.left < sr.right - 1) out.push({ kind: 'sidebar-over-content', by: Math.round(sr.right - mr.left) });
    // anything sticking out of its panel, page or tile
    for (const box of document.querySelectorAll('.page, .koma, .tile, .narr, .cut, .measures li, .bench, .knobs, .sw, .dock, .side a, .mast, .opener, .facts li')) {
      if (!vis(box) || /hidden|clip/.test(getComputedStyle(box).overflowX) && !box.matches('.cover, .opener')) continue;   // a box that clips draws nothing outside itself
      const b = box.getBoundingClientRect();
      for (const el of box.querySelectorAll('*')) {
        if (!vis(el) || el.closest('.focus, .tone-fade, .dock-h')) continue;
        const cs = getComputedStyle(el);
        if (cs.position === 'absolute' && el.matches('.strip-tag, .vcopy, .flash, .cover-word, .sticker, .barcode')) continue;
        const r = el.getBoundingClientRect();
        const dx = Math.max(b.left - r.left, r.right - b.right), dy = Math.max(b.top - r.top, r.bottom - b.bottom);
        if (dx > 2.5 || (dy > 2.5 && !box.matches('.page, .koma'))) {
          // a scrolling ancestor inside the box is allowed to hold wider content
          let p = el.parentElement, scrolls = false;
          while (p && p !== box) { const o = getComputedStyle(p); if (/auto|scroll|hidden/.test(o.overflowX + o.overflowY)) { scrolls = true; break; } p = p.parentElement; }
          if (!scrolls) { out.push({ kind: 'sticks-out', of: name(box), el: name(el), at: where(el), dx: Math.round(dx), dy: Math.round(dy), text: (el.textContent || '').trim().slice(0, 24) }); break; }
        }
      }
    }
    // clipped text
    for (const el of document.querySelectorAll('main *, .dock *, .side *')) {
      if (!vis(el) || el.children.length > 3) continue;
      const cs = getComputedStyle(el);
      if (cs.overflowX === 'visible' || el.matches('pre, .api, .bench-field, .side')) continue;
      if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX === 'hidden') out.push({ kind: 'text-clipped', el: name(el), at: where(el), by: el.scrollWidth - el.clientWidth, text: el.textContent.trim().slice(0, 24) });
    }
    // demo items overlapping each other
    for (const st of document.querySelectorAll('.stage, .cut > div, .cta, .perf-top, .dock')) {
      const kids = [...st.children].filter(vis).filter(k => getComputedStyle(k).position !== 'absolute');
      for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i].getBoundingClientRect(), c = kids[j].getBoundingClientRect();
        const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (ox > 5 && oy > 5) out.push({ kind: 'items-overlap', at: where(st) || name(st), a: name(kids[i]), b: name(kids[j]), ox: Math.round(ox), oy: Math.round(oy) });
      }
    }
    // cover decorations over cover copy
    const deco = [...document.querySelectorAll('.vcopy, .flash, .cover-word, .sticker, .barcode')].filter(vis);
    const copy = [...document.querySelectorAll('.cover .kicker, .cover h1, .cover .narr, .cover .cta > *, .cover .soon, .cover .facts li')].filter(vis);
    // text boxes are measured around the glyphs; for the all-caps title the empty ascender and descender bands are trimmed
    const tight = el => { if (!el.matches('.kicker, h1, .soon')) return el.getBoundingClientRect(); const g = document.createRange(); g.selectNodeContents(el); const r = g.getBoundingClientRect(); if (!el.matches('h1')) return r; return { left: r.left, right: r.right, top: r.top + r.height * 0.16, bottom: r.bottom - r.height * 0.2 }; };
    for (const d of deco) for (const c of copy) {
      const a = d.getBoundingClientRect(), b = tight(c);
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 4 && oy > 4) out.push({ kind: 'cover-collision', deco: name(d), copy: name(c), ox: Math.round(ox), oy: Math.round(oy) });
    }
    return out;
  }

  /* ---------- overlays: open each one in three scroll positions and see whether it is on top and on screen ---------- */
  async function place(el, pos) {
    const r = el.getBoundingClientRect(), y = scrollY + r.top;
    const target = pos === 'top' ? y - 70 : pos === 'bottom' ? y + r.height - innerHeight + 24 : y + r.height / 2 - innerHeight / 2;
    scrollTo({ top: Math.max(0, target), behavior: 'instant' });
    await w(120);
  }
  async function overlays(positions) {
    const out = [];
    document.querySelectorAll('.koma').forEach(k => k.classList.add('in'));
    await w(500);
    const all = [...document.querySelectorAll('main sk-select, main sk-popover, main sk-menu, main sk-tooltip, main sk-dialog, main sk-drawer')];
    for (const el of all) {
      const tag = el.tagName.toLowerCase(), modal = tag === 'sk-dialog' || tag === 'sk-drawer';
      for (const pos of modal ? ['mid'] : positions) {
        const anchor = modal ? el.closest('.koma, section') : el;
        if (!vis(anchor)) continue;
        await place(anchor, pos);
        const sr = el.shadowRoot;
        let box;
        if (tag === 'sk-select') { sr.querySelector('.trig').click(); box = sr.querySelector('.pop'); }
        else if (tag === 'sk-tooltip') { el.dispatchEvent(new PointerEvent('pointerenter')); box = sr.querySelector('.tip'); }
        else if (modal) { el.show(); box = sr.querySelector('.panel'); }
        else { const t = el.querySelector('[slot=trigger]'); if (!t) continue; t.click(); box = sr.querySelector('.pop'); }
        await w(modal ? 650 : 420);
        await Promise.all(box.getAnimations().map(a => a.finished.catch(() => {})));
        const res = probe(box, el);
        const row = { tag, at: where(el), pos, ...res };
        if (modal) {
          // the backdrop has to cover the dock and the sidebar too
          const pts = [[innerWidth - 60, 30], [60, 200], [innerWidth / 2, innerHeight - 20], [innerWidth - 40, innerHeight - 40]];
          row.backdropHoles = pts.filter(([x, y]) => !inside(deepAt(x, y), el)).map(([x, y]) => name(deepAt(x, y)));
        }
        if (res.covered > 0.02 || res.off.length || (row.backdropHoles && row.backdropHoles.length) || res.w === 0) out.push(row);
        if (tag === 'sk-select') { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.open = false; }
        else if (tag === 'sk-tooltip') el.dispatchEvent(new PointerEvent('pointerleave'));
        else el.open = false;
        await w(modal ? 420 : 260);
      }
    }
    return { checked: all.length, problems: out };
  }

  /* ---------- lettering: is every sound-effect word fully on screen when it appears? ---------- */
  function watchWords() {
    const seen = [];
    const check = n => { if (!n.classList || !n.classList.contains('sk-w')) return; setTimeout(async () => {
      await Promise.all(n.getAnimations({ subtree: true }).filter(a => a.effect.getComputedTiming().iterations !== Infinity && a.effect.getComputedTiming().fill !== 'forwards').map(a => a.finished.catch(() => {})));
      const t = n.querySelector('text'); if (!t) return;
      let l = 1e9, tp = 1e9, r = -1e9, b = -1e9;
      n.querySelectorAll('text').forEach(x => { const q = x.getBoundingClientRect(); l = Math.min(l, q.left); tp = Math.min(tp, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); });
      const off = [l < 0 ? 'left ' + Math.round(l) : '', tp < 0 ? 'top ' + Math.round(tp) : '', r > innerWidth ? 'right +' + Math.round(r - innerWidth) : '', b > innerHeight ? 'bottom +' + Math.round(b - innerHeight) : ''].filter(Boolean);
      seen.push({ word: n.textContent.trim().slice(0, 8), off });
    }, 140); };
    const mo = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(check)));
    mo.observe(document.body, { childList: true, subtree: true });
    return { seen, stop: () => mo.disconnect() };
  }
  async function dockWords() {
    scrollTo({ top: 0, behavior: 'instant' });
    const mb = document.querySelector('.menu-btn'); if (vis(mb)) { mb.click(); await w(700); }
    const wt = watchWords();
    for (const el of document.querySelectorAll('.dock sk-segmented, .dock sk-switch, .dock sk-theme-switch')) {
      const sr = el.shadowRoot;
      if (el.tagName === 'SK-SEGMENTED') { const b = el.querySelectorAll('button'); const cur = el.value; const other = [...b].find(x => x.value !== cur); other.click(); await w(500); [...b].find(x => x.value === cur).click(); }
      else { const b = sr.querySelector('button, [role=switch]') || el; b.click(); await w(700); b.click(); }
      await w(700);
    }
    await w(600); wt.stop();
    return wt.seen.filter(s => s.off.length);
  }
  window.__audit = { layout, overlays, dockWords, watchWords, probe, deepAt, name };
})();
