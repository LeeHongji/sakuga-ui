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
const TOP = ['cover', 'start', 'vocab', 'rules'], END = ['theming', 'perf', 'api'];
bind(nav, () => {
  let h = `<a class="grp" href="#cover"><b>00</b>${t('nav.toc')}</a>` + TOP.map(id => `<a class="it" href="#${id}">${t('nav.' + id)}</a>`).join('');
  let n = 0;
  for (const g of GROUPS) h += `<a class="grp" href="#${g.id}"><b>${g.n.padStart(2, '0')}</b>${pick(g.t)}</a>` + g.items.map(it => `<a class="it" href="#c-${it.tag}">${pick(it.t)}<i>${String(++n).padStart(2, '0')}</i></a>`).join('');
  return h + `<a class="grp" href="#theming"><b>∞</b>${t('nav.end')}</a>` + END.map(id => `<a class="it" href="#${id}">${t('nav.' + id)}</a>`).join('');
});

/* ---------- the model sheet under each panel ----------
   Variants and states, the acts a component performs, and its keyboard and accessibility facts are read off the
   component's own classes, so they cannot drift from the code. API notes and related components come from data.js. */
const uniq = a => [...new Set(a)];
const all = (src, re) => uniq([...src.matchAll(re)].map(m => m[1]));
const MOVES = Object.keys(S.moves).filter(k => typeof S.moves[k] === 'function');
const PRIM = ['puff', 'shard', 'burst', 'ring', 'ticks', 'lines', 'sparkle', 'slash', 'arcs', 'drop', 'sticker', 'focus', 'uni', 'bolt', 'tare', 'odoro', 'wobble', 'ghost', 'trail', 'bure', 'crack', 'shock', 'crown', 'spatter', 'drift', 'add'];
const WORD = /['"`]([゠-ヿぁ-ゖ][゠-ヿぁ-ゖ!?！？…〜~]*)['"`]/g;
const KEYS = ['Enter', 'Space', 'Escape', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Backspace', 'Delete'];
const KEYCAP = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Escape: 'Esc' };
const moveMemo = {};
function moveOf(name) {
  if (moveMemo[name]) return moveMemo[name];
  const src = S.moves[name].toString(), f = (moveMemo[name] = { prims: all(src, /\bFX\.(\w+)\(/g), sounds: all(src, /SND\.play\('([\w-]+)'/g) });
  for (const m of MOVES) if (m !== name && new RegExp(`(^|[^.\\w])${m}\\(`).test(src)) { const g = moveOf(m); f.prims.push(...g.prims); f.sounds.push(...g.sounds); }
  return f;
}
function sourceOf(tag) { let src = ''; for (let c = customElements.get(tag); c && c !== S.SkElement && c !== HTMLElement; c = Object.getPrototypeOf(c)) src += c.toString() + '\n'; return src; }
const factMemo = {};
function factsOf(it) {
  if (factMemo[it.tag]) return factMemo[it.tag];
  const tags = [it.tag, ...(it.parts || [])], src = tags.map(sourceOf).join('\n'), cls = tags.map(x => customElements.get(x));
  const moves = all(src, /\bmoves\.(\w+)\(/g).filter(m => MOVES.includes(m)), mf = moves.map(moveOf);
  // key names count only next to where a handler reads the key, so a default label such as 'Delete' is not taken for one
  const near = [...src.matchAll(/[\s\S]{0,260}\.key\b[\s\S]{0,260}/g)].map(m => m[0]).join('\n');
  return (factMemo[it.tag] = {
    moves,
    prims: uniq([...all(src, /\bFX\.(\w+)\(/g), ...mf.flatMap(f => f.prims)]).filter(x => PRIM.includes(x)),
    words: all(src, WORD),
    // a bare moves.tap(el) plays 'tap'; with a second argument it plays that sound instead
    sounds: uniq([...all(src, /SND\.(?:play|loop)\('([\w-]+)'/g), ...all(src, /moves\.tap\([^()]*,\s*'([\w-]+)'\)/g), ...(/moves\.tap\([^,()]*\)/.test(src) ? ['tap'] : []), ...mf.flatMap(f => f.sounds)]).filter(n => S.SND.names.includes(n)),
    anims: uniq([...all(src, /\banim\([^;]*?,\s*'(\w+)'/g), ...all(src, /\b(shake|zipIn|zipOut)\(/g)]),
    springs: uniq([...all(src, /--sk-(spring|bounce|soft|snap)\b/g), ...all(src, /\bspring\([^;]*?\],\s*'(\w+)'/g)]).filter(n => S.SPRINGS[n]),
    roles: uniq([...all(src, /role="([\w-]+)"/g), ...all(src, /'role',\s*'([\w-]+)'/g)]),
    native: all(src, /<(button|input|textarea|select|a)[\s>]/g),
    keys: KEYS.filter(k => (k === 'Space' ? /' '/ : new RegExp(`\\b${k}\\b`)).test(near)),
    aria: all(src, /\baria-([a-z]+)/g),
    form: cls.some(c => c && c.formAssociated),
  });
}
const STATES = ['checked', 'pressed', 'invalid', 'readonly', 'loading', 'indeterminate', 'disabled'];
function specsOf(it) {
  const props = (customElements.get(it.tag) || {}).props || {};
  if ('open' in props) return [];                        // layers: a copy of a closed one shows nothing
  const tpl = document.createElement('template'); tpl.innerHTML = it.demo;
  const base = tpl.content.querySelector(it.tag); if (!base) return [];
  const copy = (attr, val) => {
    const el = base.cloneNode(true);
    [el, ...el.querySelectorAll('[id]')].forEach(n => n.removeAttribute('id'));
    for (const n of ['hidden', 'variant', 'size', ...STATES]) el.removeAttribute(n);
    if (attr) el.setAttribute(attr, val === true ? '' : val);
    const f = document.createElement('figure'); f.append(el, Object.assign(document.createElement('figcaption'), { textContent: !attr ? 'default' : val === true ? attr : `${attr}="${val}"` }));
    return f;
  };
  const out = [];
  for (const name of ['variant', 'size']) {
    const row = (it.attrs || []).find(a => a[0] === name), vals = row ? row[1].split(' | ') : [];
    if (vals.length > 1 && vals.every(v => /^[\w-]+$/.test(v))) for (const v of vals) out.push(copy(name, v));
  }
  const states = STATES.filter(n => props[n] === Boolean || (Array.isArray(props[n]) && props[n][0] === Boolean));
  if (states.length && !out.length) out.push(copy());
  for (const n of states) out.push(copy(n, true));
  return out;
}
function sheet(it) {
  const d = document.createElement('details'), sum = document.createElement('summary'), top = document.createElement('div'), specs = document.createElement('div'), body = document.createElement('div');
  top.className = 'sheet'; specs.className = 'specs'; body.className = 'sheet';
  let built = false, hasSpecs = false;
  const row = (key, list, f = x => `<code>${esc(x)}</code>`) => (list.length ? `<dt>${t(key)}</dt><dd>${list.map(f).join('')}</dd>` : '');
  bind(sum, () => t('api.sum'));
  bind(top, () => (built && hasSpecs ? `<h4>${t('sheet.specs')}</h4>` : ''));
  bind(body, () => {
    if (!built) return '';
    const f = factsOf(it);
    const acts = row('acts.moves', f.moves) + row('acts.prims', f.prims, x => `<code>${x === 'add' ? t('acts.custom') : x}</code>`) + row('acts.words', f.words, x => `<b>${esc(x)}</b>`)
      + row('acts.sounds', f.sounds, x => `<button data-snd="${x}">${x}</button>`) + row('acts.anims', f.anims) + row('acts.springs', f.springs);
    const a11y = row('a11y.roles', f.roles) + row('a11y.native', f.native, x => `<code>&lt;${x}&gt;</code>`) + row('a11y.keys', f.keys, x => `<kbd>${KEYCAP[x] || x}</kbd>`)
      + row('a11y.aria', f.aria, x => `<code>aria-${x}</code>`) + (f.form ? `<dt>${t('a11y.form')}</dt><dd>${t('a11y.form.v')}</dd>` : '');
    return `<h4>${t('sheet.acts')}</h4>${acts ? `<dl>${acts}</dl>` : `<p>${t('acts.none')}</p>`}`
      + (it.attrs && it.attrs.length ? `<h4>API</h4><div class="api"><table class="sk-table"><thead><tr><th>${t('api.name')}</th><th>${t('api.type')}</th><th>${t('api.default')}</th><th>${t('api.note')}</th></tr></thead><tbody>${it.attrs.map(a => `<tr><td>${esc(a[0])}</td><td>${esc(a[1])}</td><td>${esc(a[2])}</td><td>${esc(pick(a[3]))}</td></tr>`).join('')}</tbody></table></div>` : '')
      + `<h4>${t('sheet.a11y')}</h4>${a11y ? `<dl>${a11y}</dl>` : `<p>${t('a11y.none')}</p>`}`
      + (it.rel && it.rel.length ? `<h4>${t('sheet.rel')}</h4><p class="rel">${it.rel.map(r => `<a href="#c-${r}">${pick(ITEM[r].t)} <code>&lt;${r}&gt;</code></a>`).join('')}</p>` : '');
  });
  d.append(sum, top, specs, body);
  d.addEventListener('toggle', () => {
    if (!d.open || built) return;
    built = true; const fs = specsOf(it); hasSpecs = fs.length > 0; specs.append(...fs);
    for (const el of [top, body]) el.innerHTML = live.find(l => l[0] === el)[1]();
  });
  d.addEventListener('click', e => { const b = e.target.closest('[data-snd]'); if (b) S.SND.play(b.dataset.snd); });
  return d;
}
const ITEM = Object.fromEntries(GROUPS.flatMap(g => g.items.map(it => [it.tag, it])));

/* ---------- component panels ---------- */
const host = $('#components');
let serial = 0;
for (const g of GROUPS) {
  const sec = document.createElement('section'); sec.id = g.id; sec.className = 'page';
  const op = document.createElement('header'); op.className = 'opener';
  bind(op, () => `<div class="focus" aria-hidden="true"></div><span class="ep">${t('ep', { n: g.n })}</span><h2>${pick(g.t)}</h2><span class="en">${g.t[1]}</span><span class="cnt">${g.items.length}</span>`);
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
    k.appendChild(sheet(it));
    grid.appendChild(k);
    if (it.run) it.run(stage, S);
  });
  host.appendChild(sec);
}

/* ---------- the ten rules: each with a specimen made of the library's own parts ---------- */
const RULES = [
  { demo: `<sk-button id="rl-line" fx="none">Ruled frame</sk-button>`,
    run: el => el.querySelector('#rl-line').addEventListener('click', e => { const q = S.rectOf(e.currentTarget); S.FX.lines({ x: q.r + 96, y: q.cy, angle: Math.PI, n: 7, len: 70, spread: 46, dist: 70, life: 0.45 }); S.SND.play('swish'); }) },
  { demo: `<sk-button>Ink</sk-button>\n<sk-button variant="primary">Main</sk-button>\n<sk-button variant="pink">Hot</sk-button>\n<sk-switch id="rl-mono" size="sm">mono</sk-switch>`,
    run: el => {
      const sw = el.querySelector('#rl-mono'); let back = 'sakuga';
      sw.addEventListener('change', e => { if (e.detail.checked) { if (S.getPalette() !== 'mono') back = S.getPalette(); S.setPalette('mono'); } else S.setPalette(back); });
      document.addEventListener('sk-palettechange', e => { const on = e.detail.palette === 'mono'; if (sw.checked !== on) sw.checked = on; });
    } },
  { demo: `<sk-hatch value="3" max="4" labels="Blank,Rough,Base,Deep,Done" style="width:210px"></sk-hatch>\n<div style="display:grid;gap:8px;width:170px"><sk-skeleton></sk-skeleton><sk-skeleton style="width:70%"></sk-skeleton></div>` },
  { demo: `<sk-button size="lg">Press</sk-button>\n<sk-card tilt interactive style="width:150px">Hover</sk-card>` },
  { demo: `<sk-switch size="lg"></sk-switch>\n<sk-checkbox>Tick</sk-checkbox>` },
  { demo: `<sk-spinner></sk-spinner>\n<sk-ring id="rl-ring" value="40"></sk-ring>\n<sk-button id="rl-step" size="sm">+20</sk-button>`,
    run: el => el.querySelector('#rl-step').addEventListener('click', () => { const r = el.querySelector('#rl-ring'); r.value = r.value >= 100 ? 0 : Math.min(100, r.value + 20); }) },
  { demo: `<sk-like count="128"></sk-like>\n<output class="live" id="rl-live"></output>`,
    // the readout follows the particle count only while there are particles: this specimen keeps no loop of its own either
    run: el => { const o = el.querySelector('#rl-live'), draw = () => t('rules.live', { n: S.FX.stats().items }), watch = () => { o.textContent = draw(); if (S.FX.stats().items) setTimeout(watch, 100); }; bind(o, draw); el.addEventListener('click', () => setTimeout(watch, 40)); setTimeout(watch, 1200); } },
  { demo: `<sk-button fx="boom" variant="pink" size="lg">ドン!</sk-button>` },
  { demo: `<sk-word text="ズバッ" voice="cut" size="54"></sk-word>\n<sk-word text="キラッ" voice="shine" size="44"></sk-word>`,
    run: el => el.querySelectorAll('sk-word').forEach(w => { w.style.cursor = 'pointer'; w.addEventListener('click', () => { w.style.visibility = 'hidden'; w.shout(); setTimeout(() => { w.style.visibility = ''; }, 1100); }); }) },
  { demo: `<div class="zone"><sk-like count="7"></sk-like><code>full</code></div>\n<div class="zone" data-sk-fx="lite"><sk-like count="7"></sk-like><code>data-sk-fx="lite"</code></div>\n<div class="zone" data-sk-fx="off"><sk-like count="7"></sk-like><code>data-sk-fx="off"</code></div>`,
    code: `<section data-sk-fx="lite">\n  <!-- half the effects in here -->\n</section>` },
];
RULES.forEach((r, i) => {
  const n = i + 1, k = document.createElement('article'), head = document.createElement('header'), stage = document.createElement('div'), foot = document.createElement('p');
  k.className = `koma tone-${i % 4}`; k.id = 'rule-' + n; stage.className = 'stage'; foot.className = 'check';
  bind(head, () => `<span class="no">${String(n).padStart(2, '0')}</span><h3>${t(`r${n}.h`)}</h3><p class="cap">${t(`r${n}.p`)}</p>`);
  bind(foot, () => `<b>${t('rules.check')}</b>${t(`r${n}.c`)}`);
  stage.innerHTML = r.demo; k.append(head, stage);
  if (r.code) { const code = document.createElement('div'); code.className = 'code'; k.appendChild(code); codeBlock(code, r.code, 'html'); }
  k.appendChild(foot); $('#rule-list').appendChild(k);
  if (r.run) r.run(stage);
});
const ROLES = [['ink', 'ink'], ['paper', 'paper', 'surface'], ['peri', 'peri'], ['deep', 'deep'], ['lav', 'lav'], ['violet', 'violet'], ['pink', 'pink'], ['onhot', 'on-hot'], ['off', 'off'], ['muted', 'muted'], ['fx', 'fxw', 'fxs', 'fxo']];
bind($('#role-rows'), () => ROLES.map(([key, ...toks]) => `<tr><td>${toks.map(k => `<i class="chip" style="background:var(--sk-${k})"></i><code>--sk-${k}</code>`).join(' ')}</td><td>${t('role.' + key)}</td></tr>`).join(''));
bind($('#nots'), () => [1, 2, 3, 4].map(n => `<li>${t('not.' + n)}</li>`).join(''));
{
  const ship = $('#ship'), boxes = [];
  for (let n = 1; n <= 10; n++) { const c = document.createElement('sk-checkbox'), sp = document.createElement('span'); bind(sp, () => t('q' + n)); c.appendChild(sp); ship.appendChild(c); boxes.push(c); }
  const count = () => boxes.filter(c => c.checked).length;
  bind($('#ship-n'), () => t('ship.n', { n: count() }));
  ship.addEventListener('change', () => {
    const n = count(); $('#ship-n').textContent = t('ship.n', { n });
    if (n === 10) { const q = S.rectOf($('#ship-n')); S.moves.say('ヨシ!', { voice: 'pop', x: q.r + 60, y: q.cy - 10, size: 40 }); }
  });
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
  ['arcs', (x, y, el) => { S.anim(el, 'nope'); FX.arcs({ el }); }],   // it shakes its head: its ghosts either side and motion strokes
  ['drop', (x, y) => { for (let i = 0; i < 9; i++) FX.drop({ x: x + rnd(-14, 14), y, vx: rnd(-190, 190), vy: rnd(-380, -180), size: rnd(4, 7), life: rnd(0.6, 0.9) }); }],
  ['sticker', (x, y) => { moves.shower(x, y, 'heart', 5); moves.shower(x, y, 'star', 5, { fill: FX.C.fxw, stroke: FX.C.ink }); }],
  ['hop', (x, y) => moves.hop({ x: x - 50, y: y + 20 }, { x: x + 50, y: y + 20 }, { side: 'y', height: 60, dur: 0.5, r: 9, hit: () => moves.dust(x + 50, y + 30, 7) })],
  ['boom', (x, y) => moves.boom(x, y, 0.8)],
  // the scene shelf: each tile plays its move on itself
  ['rays', (x, y, el) => moves.reveal(el)],
  ['confetti', (x, y, el) => moves.celebrate(el)],
  ['flame', (x, y, el) => moves.blaze(el)],
  ['steam', (x, y, el) => moves.fresh(el)],
  ['frost', (x, y, el) => moves.freeze(el)],
  ['rush', (x, y, el) => moves.dash(el)],
  ['gust', (x, y, el) => moves.blowAway(el)],
  ['spotlight', (x, y, el) => moves.spotlight(el)],
  ['notes', (x, y, el) => moves.sing(el)],
];
bind($('#prims'), () => PRIMS.map(([id], i) => `<button class="tile" data-i="${i}">${t('p.' + id)}<small>${id}</small></button>`).join(''));
$('#prims').addEventListener('click', e => { const el = e.target.closest('.tile'); if (!el) return; const q = S.rectOf(el); PRIMS[+el.dataset.i][1](q.cx, q.cy - 6, el); S.SND.play('tap'); });

/* ---------- the technique stage ----------
   One scene per technique, and every scene is a small story from a real interface, played by the library's own
   components: a field that fails validation sinks under gloom lines, a save that fails is struck by lightning,
   a hold-to-delete cracks before it is cut. Scenes are grouped by what they say, not by how they are drawn. */
const stage = $('#tech-stage'), setEl = $('#tech-set');
let quiet = false, undo = [];
const later = (ms, fn) => { const id = setTimeout(fn, ms); undo.push(() => clearTimeout(id)); };
const fx = fn => { const r = FX.within(stage, fn); for (const it of [].concat(r).flat()) if (it && it.kill) undo.push(() => it.kill()); return r; };
const set = html => { setEl.innerHTML = html; return id => setEl.querySelector('#' + id); };
const rc = el => S.rectOf(el);
const boxOf = (q, radius) => ({ l: q.l, t: q.t, w: q.w, h: q.h, radius });
const go = (el, kf, opts) => S.play(el, kf, typeof opts === 'number' ? { duration: opts } : opts);
const say = (text, voice, x, y, size, at = 0) => later(at, () => { const h = S.sfx(text, { voice, x, y, size, silent: quiet }); undo.push(() => h.cancel()); });
const snd = name => { if (!quiet) S.SND.play(name); };
const dark = on => stage.toggleAttribute('data-dark', on);
const show = el => { el.style.visibility = ''; };
// the colour of a mark on a blacked-out panel: paper white by day; by night the page is dark already and the ink is the light one
const white = () => (S.getTheme() === 'dark' ? FX.C.ink : FX.C.paper);
function rest() { undo.forEach(f => f()); undo = []; stage.getAnimations().forEach(a => a.cancel()); dark(false); }
const HOLD = 'cubic-bezier(.2,.9,.3,1)', FALL = 'cubic-bezier(.6,0,.9,.5)';
const PRESS = [{ scale: '1' }, { scale: '1.1 .8', offset: 0.4 }, { scale: '1' }];
const SCENES = [
  // a countdown reaches zero and the button it was waiting for takes the whole panel
  ['look', 'focus', '集中線', st => {
    const $s = set(`<b class="s-count" id="sn">3</b><sk-button id="sa" size="lg" fx="none" disabled>Start</sk-button>`), n = $s('sn'), a = $s('sa');
    [3, 2, 1].forEach((v, i) => later(i * 400, () => { n.textContent = v; go(n, [{ scale: '1.7' }, { scale: '.88', offset: 0.55 }, { scale: '1.05', offset: 0.8 }, { scale: '1' }], 200); snd('tick'); }));   // each number slams down at full ink
    later(1200, () => {
      const q = rc(a.btn);
      n.textContent = 'Go!'; go(n, [{ scale: '1' }, { scale: '1.45', offset: 0.35 }, { scale: '2 0' }], { duration: 280, easing: 'ease-in', fill: 'forwards' });   // punches out, then flattens into a line
      a.disabled = false; a.setAttribute('variant', 'primary'); snd('whoosh');
      go(a, [{ scale: '.9 .84' }, { scale: '1.22', offset: 0.14 }, { scale: '1.12', offset: 0.24 }, { scale: '1.12', offset: 0.86 }, { scale: '1' }], 1400);
      fx(() => FX.focus({ x: q.cx, y: q.cy, r: q.h / 2 + 24, sx: (q.w / 2 + 30) / (q.h / 2 + 24), len: st.w, n: 64, w: 7, bundle: true, behind: a.btn, life: 1.25 }));
      say('バーン!', 'impact', q.r + 76, q.t - 30, 44, 60);
    });
    return 2800;
  }],
  // Delete is pressed: the panel goes black and everything points at the question
  ['look', 'focusW', '白抜き集中線', st => {
    const $s = set(`<sk-card id="sa" class="s-card"><b>Delete chapter 3?</b><small>24 pages go with it.</small><span class="s-row"><sk-button size="sm" variant="ghost" fx="none">Keep</sk-button><sk-button id="sb" size="sm" variant="pink" fx="none">Delete</sk-button></span></sk-card>`), a = $s('sa'), b = $s('sb');
    later(380, () => { go(b, PRESS, 220); snd('tap'); });
    later(600, () => {
      const q = rc(a); dark(true); snd('thud');
      go(a, [{ transform: 'scale(1.5) rotate(-5deg)' }, { transform: 'scale(.95) rotate(1deg)', offset: 0.12 }, { transform: 'scale(1.03)', offset: 0.2 }, { transform: 'none', offset: 0.28 }, { transform: 'none' }], 1300);
      fx(() => FX.focus({ x: q.cx, y: q.cy, r: q.h / 2 + 22, sx: (q.w / 2 + 26) / (q.h / 2 + 22), len: st.w, n: 54, w: 8, color: white(), behind: a, life: 1.5 }));
      say('ドン!', 'pop', q.r + 6, q.t - 44, 44, 80);
    });
    later(2250, () => dark(false));
    return 2400;
  }],
  // a payment goes through
  ['joy', 'focusO', '明かり線', () => {
    const $s = set(`<sk-button id="sa" size="lg" variant="primary" fx="none">Pay ¥1,200</sk-button>`), a = $s('sa');
    later(280, () => { a.loading = true; snd('tap'); });
    later(1200, () => {
      const q = rc(a.btn), r = q.h / 2 + 12;
      a.loading = false; a.done(1500); a.setAttribute('variant', 'pink');
      go(a, [{ translate: '0 0', scale: '1' }, { translate: '0 3px', scale: '1.08 .88', offset: 0.08 }, { translate: '0 -26px', scale: '.95 1.07', offset: 0.24, easing: 'ease-in' }, { translate: '0 0', scale: '1.12 .86', offset: 0.4 }, { translate: '0 -12px', scale: '.98 1.03', offset: 0.54, easing: 'ease-in' }, { translate: '0 0', scale: '1.05 .94', offset: 0.68 }, { translate: '0 0', scale: '1' }], { duration: 950, easing: 'ease-out' });
      later(360, () => fx(() => [FX.focus({ mode: 'out', x: q.cx, y: q.cy, r, sx: (q.w / 2 + 14) / r, len: 46, n: 24, w: 5.4, rag: 0.6, color: FX.C.pink, behind: a.btn, life: 0.95 }), FX.ticks({ x: q.l, y: q.t - 4, angle: -2.3, n: 3, len: 13, dist: 6, life: 0.7 }), FX.ticks({ x: q.r, y: q.t - 4, angle: -0.85, n: 3, len: 13, dist: 6, life: 0.7 })]));
      say('ぱあぁ', 'shine', q.cx, q.t - 46, 32, 360);
    });
    return 3000;
  }],
  // an anniversary greeting
  ['joy', 'petal', 'ハナビラ', st => {
    const $s = set(`<sk-card id="sa" class="s-card center"><sk-avatar name="Matsu" size="46"></sk-avatar><b>Welcome back, Matsu</b><small>One year together today.</small></sk-card>`), a = $s('sa'), q = rc(a);
    S.anim(a, 'drop'); snd('pop');
    go(a, [{ rotate: '0deg' }, { rotate: '-2deg', offset: 0.25 }, { rotate: '2deg', offset: 0.75 }, { rotate: '0deg' }], { duration: 1800, iterations: 2, delay: 300, easing: 'ease-in-out' });
    fx(() => FX.drift({ x: st.l + 10, y: st.t, w: st.w - 70, h: st.h, kind: 'petal', n: 16, size: 9 }));
    say('ふわっ', 'soft', q.r + 30, q.t + 6, 28, 500);
    return 3900;
  }],
  // a counter runs up to a new record, on black, under flicked white
  ['joy', 'spatter', 'ホワイト飛ばし', st => {
    const $s = set(`<span class="s-label">New record</span><sk-counter id="sa" class="s-big" value="0" duration="850"></sk-counter>`), a = $s('sa');
    dark(true);
    later(220, () => { a.value = 128; });
    later(1120, () => {
      const q = rc(a);
      fx(() => [FX.spatter({ x: q.cx, y: q.cy, r: Math.min(st.w, st.h * 1.6) * 0.44, n: 130, size: 3.4, color: white(), layer: 'back', behind: a, life: 1.4 }), FX.sparkle({ x: q.l - 34, y: q.t - 8, r: 15, life: 1.1, delay: 0.1 }), FX.sparkle({ x: q.r + 38, y: q.b + 4, r: 10, life: 1, delay: 0.22 })]);
      say('キラッ', 'shine', q.r + 64, q.t - 30, 34, 40);
    });
    later(2600, () => dark(false));
    return 2700;
  }],
];
const TGROUPS = [...new Set(SCENES.map(s => s[0]))];
let cur = 0;
const head = () => { const [g, id, ja] = SCENES[cur]; $('#tech-no').textContent = String(cur + 1).padStart(2, '0'); $('#tech-name').textContent = ja; $('#tech-gloss').textContent = t('tn.' + id); $('#tech-group').textContent = t('tg.' + g); $('#tech-cap').innerHTML = `<b>${t('tech.' + id)}</b><span><i>${t('tech.use')}</i>${t('use.' + id)}</span>`; };
function playScene(i, opts = {}) {
  cur = (i + SCENES.length) % SCENES.length; quiet = !!opts.quiet;
  rest(); head();
  const strip = $('#techs');
  $$('#techs button').forEach(b => {
    const on = +b.dataset.i === cur; b.setAttribute('aria-pressed', String(on));
    // on a phone the index is one row that scrolls sideways: keep the chosen one in view
    if (on && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: b.offsetLeft - strip.offsetLeft - (strip.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
  });
  const r = stage.getBoundingClientRect();
  if (!opts.quiet && (r.top < 0 || r.bottom > innerHeight)) $('#tech').scrollIntoView({ block: 'start' });
  SCENES[cur][3](S.rectOf(stage));
}
bind($('#techs'), () => TGROUPS.map(g => `<section><h4>${t('tg.' + g)}</h4>${SCENES.map((s, i) => (s[0] === g ? `<button data-i="${i}" aria-pressed="${i === cur}" title="${t('tn.' + s[1])}"><b lang="ja">${s[2]}</b><small>${t('tn.' + s[1])}</small></button>` : '')).join('')}</section>`).join(''));
live.push([$('#tech-cap'), () => { head(); return $('#tech-cap').innerHTML; }]);
head();
$('#techs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) playScene(+b.dataset.i); });
$('#tech-prev').addEventListener('click', () => playScene(cur - 1));
$('#tech-next').addEventListener('click', () => playScene(cur + 1));
$('#tech-again').addEventListener('click', () => playScene(cur));
stage.addEventListener('click', e => { if (e.target === stage || e.target === setEl) playScene(cur); });
// the first scene plays by itself, without sound, the first time the stage is on screen
new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); playScene(0, { quiet: true }); } }, { threshold: 0.7 }).observe(stage);

const SWATCHES = [['グラデトーン', 'grad', { from: 60, to: 0, len: 190 }], ['万線', 'lines', { pct: 30 }], ['カケアミ 2', 'hatch', { level: 2 }], ['カケアミ 4', 'hatch', { level: 4 }],
  ['ナワアミ', 'rope', {}], ['砂目', 'sand', { pct: 22 }], ['点描', 'stipple', { len: 190 }], ['キラキラ', 'sparkle', {}], ['シャボン', 'bubble', {}]];
bind($('#tones'), () => `<figure class="ladder"><div>${[10, 20, 30, 40, 50].map(p => `<i style='${S.tone('dots', { pct: p }).css}'></i>`).join('')}</div><figcaption><b lang="ja">アミ</b><span>${t('tk.dots')}</span><em>10 · 20 · 30 · 40 · 50%</em></figcaption></figure>`
  + SWATCHES.map(([ja, kind, o]) => `<figure><i style='${S.tone(kind, o).css}'></i><figcaption><b lang="ja">${ja}</b><span>${t('tk.' + kind)}</span></figcaption></figure>`).join(''));

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
