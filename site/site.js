// Docs site logic: language switching, contents, component panels built from data, vocabulary playground,
// theming lab and the in-page stress test.
import * as S from '../src/index.js';
import { GROUPS, COUNT } from './data.js';
import { T, LANGS } from './i18n.js';

window.Sakuga = S;
document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const rnd = (a, b) => a + Math.random() * (b - a);
const wait = ms => new Promise(r => setTimeout(r, ms));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] == null ? '' : o[k]));

/* ---------- language ---------- */
const saved = (() => { try { return localStorage.getItem('sk-lang'); } catch (e) { return null; } })();
let lang = LANGS.includes(saved) ? saved : navigator.language.startsWith('ja') ? 'ja' : navigator.language.startsWith('zh') ? 'zh' : 'en';
const L = () => LANGS.indexOf(lang);
const t = (key, o) => { const v = T[key]; return v ? (o ? fill(v[L()], o) : v[L()]) : key; };
const pick = arr => arr[L()];
const live = [];                       // [element, () => html] pairs re-rendered on language change
const bind = (el, fn) => { live.push([el, fn]); el.innerHTML = fn(); return el; };
function applyLang() {
  document.documentElement.lang = { zh: 'zh-CN', en: 'en', ja: 'ja' }[lang];
  $$('[data-t]').forEach(el => { el.innerHTML = t(el.dataset.t); });
  live.forEach(([el, fn]) => { el.innerHTML = fn(); });
  $('#hero-copy').setAttribute('label', t('hero.copy'));
  document.title = `Sakuga UI · ${t('hero.lede')}`;
  themeCss(); drawMeasured(); markOverflow();
}

/* ---------- tiny highlighter ---------- */
function hl(code, kind) {
  let h = esc(code);
  if (kind === 'html') h = h.replace(/ ([\w:-]+)="([^"]*)"/g, ' <i class="a">$1</i>="<i class="s">$2</i>"').replace(/(&lt;\/?)([\w-]+)/g, '$1<i class="t">$2</i>');
  else if (kind === 'css') h = h.replace(/(\/\*[^]*?\*\/)|(--[\w-]+)|(#[0-9a-f]{3,8}|\b\d+(?:\.\d+)?px)/gi, (m, c, v) => `<i class="${c ? 'c' : v ? 'a' : 's'}">${m}</i>`);
  else h = h.replace(/(\/\/[^\n]*)|('[^'\n]*'|`[^`]*`)|\b(import|from|const|class|extends|static|new|await|async|return)\b/g, (m, c, str) => `<i class="${c ? 'c' : str ? 's' : 'k'}">${m}</i>`);
  return h;
}
function codeBlock(el, code, kind) {
  el.innerHTML = `<pre><code>${hl(code, kind)}</code></pre>`;
  const c = document.createElement('sk-copy'); c.setAttribute('value', code); c.setAttribute('label', t('hero.copy'));
  el.appendChild(c);
}
$$('.code[data-code]').forEach(el => codeBlock(el, el.textContent.replace(/^\n/, ''), el.dataset.code));
// a code block wider than its panel says so under the code, until it has been scrolled to the end
function markOverflow() {
  $$('.code').forEach(el => { const pre = $('pre', el); if (!pre) return; el.dataset.more = t('code.more'); const over = pre.scrollWidth > pre.clientWidth + 2; el.classList.toggle('more', over); el.classList.toggle('end', over && pre.scrollLeft + pre.clientWidth >= pre.scrollWidth - 2); });
}
addEventListener('resize', markOverflow, { passive: true });
document.addEventListener('scroll', e => { if (e.target.tagName === 'PRE') markOverflow(); }, { capture: true, passive: true });

/* ---------- contents ---------- */
const nav = $('#nav');
const TOP = ['cover', 'start', 'vocab'], END = ['theming', 'perf', 'api'];
bind(nav, () => {
  let h = `<a class="grp" href="#cover"><b>00</b>${t('nav.toc')}</a>` + TOP.map(id => `<a class="it" href="#${id}">${t('nav.' + id)}</a>`).join('');
  let n = 0;
  for (const g of GROUPS) h += `<a class="grp" href="#${g.id}"><b>0${g.n}</b>${pick(g.t)}</a>` + g.items.map(it => `<a class="it" href="#c-${it.tag}">${pick(it.t)}<i>${String(++n).padStart(2, '0')}</i></a>`).join('');
  return h + `<a class="grp" href="#theming"><b>∞</b>${t('nav.end')}</a>` + END.map(id => `<a class="it" href="#${id}">${t('nav.' + id)}</a>`).join('');
});

/* ---------- component panels ---------- */
const host = $('#components');
let serial = 0;
for (const g of GROUPS) {
  const sec = document.createElement('section'); sec.id = g.id; sec.className = 'page';
  const op = document.createElement('header'); op.className = 'opener';
  bind(op, () => `<div class="focus" aria-hidden="true"></div><span class="ep">${t('ep', { n: g.n })}</span><h2>${pick(g.t)}</h2><span class="en">${g.t[1].toUpperCase()}</span><span class="cnt">${g.items.length}</span>`);
  const grid = document.createElement('div'); grid.className = 'komas';
  sec.append(op, grid);
  g.items.forEach((it, i) => {
    const k = document.createElement('article');
    k.className = `koma tone-${serial++ % 4}` + (it.wide ? ' wide' : ''); k.id = 'c-' + it.tag;
    const head = document.createElement('header');
    bind(head, () => `<span class="no">${g.n}-${i + 1}</span><h3>${pick(it.t)}${lang === 'en' ? '' : `<small>${it.t[1]}</small>`}</h3><code>&lt;${it.tag}&gt;</code><p class="cap">${pick(it.d)}</p>`);
    const stage = document.createElement('div'); stage.className = 'stage' + (it.stack ? ' stack' : ''); stage.innerHTML = it.demo;
    const code = document.createElement('div'); code.className = 'code';
    k.append(head, stage, code);
    codeBlock(code, it.code || it.demo.replace(/ id="d-[\w-]+"/g, ''), it.codeKind || (it.code ? 'js' : 'html'));
    if (it.attrs && it.attrs.length) {
      const d = document.createElement('details');
      bind(d, () => `<summary>${t('api.sum')}</summary><div class="api"><table class="sk-table"><thead><tr><th>${t('api.name')}</th><th>${t('api.type')}</th><th>${t('api.default')}</th><th>${t('api.note')}</th></tr></thead><tbody>${it.attrs.map(a => `<tr><td>${esc(a[0])}</td><td>${esc(a[1])}</td><td>${esc(a[2])}</td><td>${esc(pick(a[3]))}</td></tr>`).join('')}</tbody></table></div>`);
      k.appendChild(d);
    }
    grid.appendChild(k);
    if (it.run) it.run(stage, S);
  });
  host.appendChild(sec);
}

/* ---------- reveal panels as they scroll in, and follow the reader in the contents ---------- */
const reveal = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); } }, { rootMargin: '0px 0px -6% 0px' });
$$('.koma').forEach(k => reveal.observe(k));
const spy = new IntersectionObserver(es => {
  for (const e of es) if (e.isIntersecting) { $$('#nav a.on').forEach(a => a.classList.remove('on')); const a = $(`#nav a.it[href="#${e.target.id}"]`); if (a) { a.classList.add('on'); a.scrollIntoView({ block: 'nearest' }); } }
}, { rootMargin: '-20px 0px -70% 0px' });
$$('main section[id], .koma[id]').forEach(el => spy.observe(el));

/* ---------- contents drawer on narrow screens ---------- */
const side = $('#side'), menuBtn = $('#menu-btn');
const setMenu = on => { side.classList.toggle('open', on); menuBtn.setAttribute('aria-expanded', String(on)); };
menuBtn.addEventListener('click', () => setMenu(!side.classList.contains('open')));
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('pointerdown', e => { if (side.classList.contains('open') && !e.composedPath().some(n => n === side || n === menuBtn)) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* ---------- global controls ---------- */
// palettes: swatches in the console and cards on the theming page, remembered between visits
const PAL = Object.keys(S.PALETTES), tone = (n, k) => S.PALETTES[n].light[['paper', 'ink', 'surface', 'violet', 'lav', 'peri', 'deep', 'pink'].indexOf(k)];
const savedPal = (() => { try { return localStorage.getItem('sk-palette'); } catch (err) { return null; } })();
if (savedPal && S.PALETTES[savedPal]) S.setPalette(savedPal);
bind($('#c-pal'), () => PAL.map(n => `<button role="radio" data-p="${n}" aria-checked="${n === S.getPalette()}" aria-label="${t('pal.' + n)}" title="${t('pal.' + n)}" style="--a:${tone(n, 'peri')};--b:${tone(n, 'pink')};--c:${tone(n, 'ink')}"></button>`).join(''));
bind($('#pal-cards'), () => PAL.map(n => `<button class="pal-card" data-p="${n}" aria-pressed="${n === S.getPalette()}" style="--a:${tone(n, 'peri')};--b:${tone(n, 'pink')};--c:${tone(n, 'ink')};--d:${tone(n, 'lav')};--e:${tone(n, 'paper')}"><i></i><b>${t('pal.' + n)}</b><code>${n}</code></button>`).join(''));
const pickPal = e => {
  const b = e.target.closest('[data-p]'); if (!b) return;
  [...root.style].filter(p => p.startsWith('--sk-')).forEach(p => root.style.removeProperty(p));   // hand-tuned tokens would hide the palette
  S.setPalette(b.dataset.p); try { localStorage.setItem('sk-palette', b.dataset.p); } catch (err) { /* private mode */ }
  const q = S.rectOf(b); S.SND.play('pop'); S.FX.ticks({ x: q.cx, y: q.t - 3, angle: -Math.PI / 2, len: 8, life: 0.3 });
  b.animate([{ scale: '.8' }, { scale: '1.18', offset: 0.55 }, { scale: '1' }], { duration: 240 });
};
$('#c-pal').addEventListener('click', pickPal); $('#pal-cards').addEventListener('click', pickPal);
document.addEventListener('sk-palettechange', e => {
  $$('#c-pal [data-p]').forEach(b => b.setAttribute('aria-checked', b.dataset.p === e.detail.palette));
  $$('#pal-cards [data-p]').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === e.detail.palette));
  drawSwatches(); themeCss();
});
$('#c-lang').value = lang;
$('#c-lang').addEventListener('change', e => { lang = e.detail.value; try { localStorage.setItem('sk-lang', lang); } catch (err) { /* private mode */ } applyLang(); });
$('#c-sound').addEventListener('change', e => S.configure({ sound: e.detail.checked }));
$('#c-fx').addEventListener('change', e => S.configure({ fx: e.detail.value }));
$('#c-fps').addEventListener('change', e => S.configure({ fps: +e.detail.value }));
const hud = $('#hud');
setInterval(() => { if (document.hidden) return; const s = S.FX.stats(); hud.textContent = s.items ? `${s.fps} fps · ${s.items} · q${s.quality}` : t('hud.idle'); }, 400);
$('#go').addEventListener('click', () => setTimeout(() => $('#start').scrollIntoView(), 900));

/* ---------- cover: facts and the two starburst shapes ---------- */
const TAGS = ['sk-button', 'sk-hold-button', 'sk-like', 'sk-segmented', 'sk-copy', 'sk-switch', 'sk-theme-switch', 'sk-checkbox', 'sk-radio', 'sk-radio-group', 'sk-slider', 'sk-input', 'sk-textarea', 'sk-select', 'sk-stepper', 'sk-rating', 'sk-otp', 'sk-toast', 'sk-alert', 'sk-progress', 'sk-ring', 'sk-spinner', 'sk-skeleton', 'sk-badge', 'sk-tag', 'sk-dialog', 'sk-drawer', 'sk-tooltip', 'sk-popover', 'sk-menu', 'sk-menu-item', 'sk-tabs', 'sk-tab', 'sk-accordion', 'sk-accordion-item', 'sk-breadcrumb', 'sk-pagination', 'sk-steps', 'sk-step', 'sk-card', 'sk-avatar', 'sk-divider', 'sk-kbd', 'sk-bubble', 'sk-counter', 'sk-calendar', 'sk-word', 'sk-icon', 'sk-loader', 'sk-koma', 'sk-koma-panel', 'sk-pages', 'sk-page', 'sk-balloon-input', 'sk-speedbar', 'sk-flash', 'sk-tone', 'sk-hatch', 'sk-yonkoma', 'sk-koma-step', 'sk-breakout', 'sk-reactions', 'sk-reaction'];
let gz = null;
bind($('#facts'), () => [[COUNT, 'fact.components'], [TAGS.filter(x => customElements.get(x)).length, 'fact.tags'], [S.SND.names.length, 'fact.sounds'], [Object.keys(S.VOICES).length, 'fact.voices'], [0, 'fact.deps']].map(([n, k]) => `<li><b>${n}</b>${t(k)}</li>`).join('') + (gz ? `<li><b>${gz}</b>kB gzip</li>` : ''));
const star = (n, inner, jitter) => 'polygon(' + Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? inner + ((i * 7) % 5) * jitter : 1 - ((i * 3) % 4) * jitter; return `${(50 + Math.cos(a) * 50 * r).toFixed(1)}% ${(50 + Math.sin(a) * 50 * r).toFixed(1)}%`; }).join(',') + ')';
$('.sticker').style.clipPath = star(14, 0.78, 0.012);
$('.flash').style.clipPath = star(22, 0.5, 0.045);

/* ---------- vocabulary ---------- */
const { FX, moves } = S;
const PRIMS = [
  ['puff', (x, y) => FX.puff({ x, y, r: 20, vy: -34, life: 1.1 })],
  ['shard', (x, y) => moves.shards(x, y, 9, 320)],
  ['burst', (x, y) => FX.burst({ x, y, r: 74, life: 0.55, layer: 'front' })],
  ['ring', (x, y) => moves.rings(x - 20, y + 10)],
  ['ticks', (x, y) => { for (let i = 0; i < 4; i++) FX.ticks({ x, y, angle: -0.6 - i * 0.65, len: 16, dist: 34, life: 0.7 }); }],
  ['lines', (x, y) => FX.lines({ x: x + 50, y, angle: Math.PI, n: 7, len: 70, spread: 50, dist: 70, life: 0.45 })],
  ['sparkle', (x, y) => { FX.sparkle({ x, y, r: 20, life: 1.2 }); FX.sparkle({ x: x + 30, y: y - 24, r: 10, life: 1, delay: 0.1, color: FX.C.ink }); }],
  ['slash', (x, y) => moves.cut({ cx: x, cy: y }, { len: 150 })],
  ['arcs', (x, y) => { FX.arcs({ x: x - 30, y, dir: -1, n: 3, r: 22, life: 0.5 }); FX.arcs({ x: x + 30, y, dir: 1, n: 3, r: 22, life: 0.5 }); }],
  ['drop', (x, y) => { for (let i = 0; i < 9; i++) FX.drop({ x: x + rnd(-14, 14), y, vx: rnd(-190, 190), vy: rnd(-380, -180), size: rnd(4, 7), life: rnd(0.6, 0.9) }); }],
  ['sticker', (x, y) => { moves.shower(x, y, 'heart', 5); moves.shower(x, y, 'star', 5, { fill: FX.C.fxw, stroke: FX.C.ink }); }],
  ['hop', (x, y) => moves.hop({ x: x - 50, y: y + 20 }, { x: x + 50, y: y + 20 }, { side: 'y', height: 60, dur: 0.4, r: 9, done: () => moves.dust(x + 50, y + 30, 7) })],
  ['boom', (x, y) => moves.boom(x, y, 0.8)],
];
bind($('#prims'), () => PRIMS.map(([id], i) => `<button class="tile" data-i="${i}">${t('p.' + id)}<small>${id}</small></button>`).join(''));
$('#prims').addEventListener('click', e => { const el = e.target.closest('.tile'); if (!el) return; const q = S.rectOf(el); PRIMS[+el.dataset.i][1](q.cx, q.cy - 6); S.SND.play('tap'); });

const VOX = [['impact', 'ドン!'], ['cut', 'ズバッ'], ['click', 'カチッ!'], ['swish', 'シュッ'], ['pop', 'ポン!'], ['shine', 'キラッ'], ['soft', 'ポフ'], ['hush', 'シーン…'], ['rumble', 'ゴゴゴ'], ['spin', 'グルグル']];
$('#voices').innerHTML = VOX.map(([v, w]) => `<button class="tile" data-v="${v}"><sk-word text="${w}" voice="${v}" size="${v === 'impact' || v === 'cut' ? 40 : 32}"></sk-word><span></span></button>`).join('');
$$('#voices .tile').forEach(el => bind($('span', el), () => `${t('v.' + el.dataset.v)} <small>${el.dataset.v}</small>`));
$('#voices').addEventListener('click', e => { const el = e.target.closest('.tile'); if (!el) return; const w = $('sk-word', el); w.style.visibility = 'hidden'; w.shout(); setTimeout(() => { w.style.visibility = ''; }, 1100); });

bind($('#snd-n'), () => t('vocab.sndn', { n: S.SND.names.length }));
$('#sounds').innerHTML = S.SND.names.map(n => `<button data-n="${n}">${n}</button>`).join('');
$('#sounds').addEventListener('click', e => { const b = e.target.closest('button'); if (b) S.SND.play(b.dataset.n); });

/* ---------- theming lab ---------- */
const TOK = ['paper', 'surface', 'ink', 'peri', 'lav', 'pink', 'violet', 'deep'];
const root = document.documentElement;
const hex = v => { const m = /^#([0-9a-f]{3})$/i.exec(v.trim()); return m ? '#' + [...m[1]].map(c => c + c).join('') : v.trim(); };
function drawSwatches() { const cs = getComputedStyle(root); $('#swatches').innerHTML = TOK.map(k => `<label class="sw"><input type="color" data-t2="${k}" value="${hex(cs.getPropertyValue('--sk-' + k))}">--sk-${k}</label>`).join(''); }
function themeCss() {
  const over = [...root.style].filter(p => p.startsWith('--sk-')).map(p => `  ${p}: ${root.style.getPropertyValue(p).trim()};`);
  codeBlock($('#t-css'), over.length ? `:root {\n${over.join('\n')}\n}` : t('theming.hint'), 'css');
}
$('#swatches').addEventListener('input', e => { root.style.setProperty('--sk-' + e.target.dataset.t2, e.target.value); S.FX.invalidateTheme(); themeCss(); });
for (const [id, v] of [['t-r', 'r'], ['t-bw', 'bw'], ['t-sh', 'sh']]) $('#' + id).addEventListener('input', e => { root.style.setProperty('--sk-' + v, e.detail.value + 'px'); themeCss(); });
$('#t-reset').addEventListener('click', () => { [...root.style].filter(p => p.startsWith('--sk-')).forEach(p => root.style.removeProperty(p)); $('#t-r').value = 14; $('#t-bw').value = 3; $('#t-sh').value = 5; S.FX.invalidateTheme(); drawSwatches(); themeCss(); });
document.addEventListener('sk-themechange', drawSwatches);
drawSwatches();

/* ---------- performance ---------- */
bind($('#measures'), () => Array.from({ length: 8 }, (_, i) => `<li><i>${i + 1}</i><b>${t(`m${i + 1}.h`)}</b>${t(`m${i + 1}.p`)}</li>`).join(''));
async function stress(ms = 3000) {
  const dts = []; let last = performance.now(), run = true;
  const tick = now => { dts.push(now - last); last = now; if (run) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  let booms = 0, peak = 0;
  const timer = setInterval(() => {
    for (let i = 0; i < 3; i++) { moves.boom(scrollX + rnd(280, innerWidth - 80), scrollY + rnd(120, innerHeight - 80), rnd(0.5, 1)); booms++; }
    S.sfx(['ドン!', 'ズバッ', 'キラッ', 'ポン!'][booms % 4], { voice: ['impact', 'cut', 'shine', 'pop'][booms % 4], x: scrollX + rnd(300, innerWidth - 120), y: scrollY + rnd(140, innerHeight - 100), size: 40, silent: booms % 3 !== 0 });
    peak = Math.max(peak, FX.stats().items);
  }, 50);
  await wait(ms); clearInterval(timer); const st = FX.stats(); await wait(700); run = false;
  const d = dts.slice(2).sort((a, b) => a - b), mean = d.reduce((a, b) => a + b, 0) / d.length;
  return { booms, avgFps: Math.round(1000 / mean), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), worst: +d[d.length - 1].toFixed(1), peak, dropped: st.dropped, quality: st.quality };
}
window.__stress = stress;
let benchText = null;                   // the last result, kept so it can be re-rendered in another language
const out = $('#p-out');
const drawBench = () => { if (benchText) out.innerHTML = benchText(); };
$('#p-run').addEventListener('click', async e => {
  const b = e.currentTarget;
  b.loading = true; benchText = () => t('bench.running'); drawBench();
  const r = await stress();
  b.loading = false;
  benchText = () => t('bench.result', { fps: r.avgFps, p95: r.p95, worst: r.worst, booms: r.booms, peak: r.peak, q: r.quality }); drawBench();
});
$('#p-many').addEventListener('click', () => {
  const f = $('#p-field'), t0 = performance.now();
  let h = '';
  for (let i = 0; i < 200; i++) h += `<sk-button size="sm">${i + 1}</sk-button><sk-switch size="sm"${i % 3 ? '' : ' checked'}></sk-switch>`;
  f.innerHTML = h;
  requestAnimationFrame(() => requestAnimationFrame(() => { const ms = Math.round(performance.now() - t0); benchText = () => t('bench.manyr', { ms }); drawBench(); }));
});
live.push([out, () => (benchText ? benchText() : t('bench.hint'))]);

let measured = null;
function drawMeasured() {
  const m = measured; if (!m) return;
  const one = k => [t('meas.' + k), t('meas.single.v', m[k])];
  const rows = [[t('meas.idle', m.idle), t('meas.idle.v', m.idle)], one('boom'), one('switch'), one('checkbox'), one('slider'), [t('meas.stress', m.stress), t('meas.stress.v', m.stress)], [t('meas.thr'), t('meas.thr.v', m.throttled)], [t('meas.many'), t('meas.many.v', m.many)], [t('meas.size'), t('meas.size.v', m.size)]];
  $('#measured').innerHTML = `<h4>${t('meas.h')}</h4><small>${esc(m.env)}</small><table class="sk-table"><thead><tr><th>${t('meas.scene')}</th><th>${t('meas.result')}</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>`;
}
fetch('site/measured.json').then(r => (r.ok ? r.json() : null)).then(m => { if (m && m.idle) { measured = m; drawMeasured(); } }).catch(() => {});
fetch('dist/meta.json').then(r => (r.ok ? r.json() : null)).then(m => { if (m) { gz = m.gzipKB; applyLang(); } }).catch(() => {});

applyLang();
