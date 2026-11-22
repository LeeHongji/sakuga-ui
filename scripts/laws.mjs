// The part of DESIGN.md a script can check. Run with `npm run laws`; exits 1 when something breaks a rule.
import { readFileSync, readdirSync } from 'node:fs';
import { GROUPS } from '../site/data.js';
import { T } from '../site/i18n.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const files = ['src/core', 'src/components'].flatMap(d => readdirSync(new URL('../' + d, import.meta.url)).filter(f => f.endsWith('.js')).map(f => `${d}/${f}`));
const problems = [];
const fail = (rule, msg) => problems.push(`${rule}: ${msg}`);

/* rule 3: shade with tone and hatching, never with blur or filters */
const BANNED = [/\bblur\(/, /\bdrop-shadow\(/, /backdrop-filter/, /feTurbulence/, /feDisplacementMap/, /feGaussianBlur/];
/* rule 4: shadows are hard. In `x y blur spread colour` the third length has to be 0 */
const isLength = tok => /^-?[\d.]+(px|em|rem)?$/.test(tok) || tok.startsWith('calc(') || tok === 'var(--sk-sh)';
function split(text, sep) {                       // split on a separator that is not inside brackets
  const out = []; let depth = 0, cur = '';
  for (const ch of text) { if (ch === '(') depth++; else if (ch === ')') depth--; if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch; }
  return [...out, cur].map(x => x.trim()).filter(Boolean);
}
for (const f of files) {
  const src = read(f);
  for (const re of BANNED) if (re.test(src)) fail('rule 3', `${f} uses ${re.source.replace(/\\[b(]/g, '')}`);
  for (const m of src.matchAll(/(?:box|text)-shadow:([^;}`]+)/g)) {
    for (const shadow of split(m[1], ',')) {
      const lengths = split(shadow.replace(/^inset\s+/, ''), ' ').filter(isLength);
      if (lengths.length >= 3 && !/^0(px)?$/.test(lengths[2])) fail('rule 4', `${f} has a blurred shadow: ${shadow}`);
    }
  }
}

/* type: component text is lettered with the two comic voices. A `font:` shorthand names --sk-font-head or --sk-font
   (or a monospace stack for code, or a display face of the sound words for a drawn mark such as the seal stamp);
   the head face has one weight, so it is set at 400 and never italic */
for (const f of files.filter(f => f.startsWith('src/components'))) {
  for (const m of read(f).matchAll(/[{;"'`]font:([^;}`]+)/g)) {
    const v = m[1];
    if (!/var\(--sk-font(-head)?\)|inherit|monospace|"Dela Gothic One"/.test(v)) fail('type', `${f} sets a face outside the lettering tokens: font:${v}`);
    if (/--sk-font-head/.test(v) && !/^400 /.test(v.trim())) fail('type', `${f} sets the head voice at another weight or style: font:${v}`);
  }
  if (/Helvetica|Arial(?! Narrow)/.test(read(f))) fail('type', `${f} names a plain sans face`);
}
// lettering keeps its lower case: no face that only has capitals, and nothing that forces text into capitals
for (const f of [...files, 'site/site.css']) {
  const src = read(f);
  if (/Bangers|Luckiest Guy/.test(src)) fail('type', `${f} names a face that only has capitals`);
  if (/text-transform:\s*uppercase/.test(src)) fail('type', `${f} forces text into capitals`);
}

/* every tag is documented in three languages, typed, and listed in both READMEs */
const tags = [...new Set(files.flatMap(f => [...read(f).matchAll(/define\('(sk-[\w-]+)'/g)].map(m => m[1])))];
const items = GROUPS.flatMap(g => g.items), documented = new Set(items.flatMap(it => [it.tag, ...(it.parts || [])]));
const types = read('types/index.d.ts'), readmes = ['README.md', 'README.en.md'].map(p => [p, read(p)]);
for (const tag of tags) {
  if (!documented.has(tag)) fail('docs', `${tag} has no entry in site/data.js (as an item or as one of its parts)`);
  if (!types.includes(`'${tag}'`)) fail('types', `${tag} is missing from types/index.d.ts`);
  for (const [p, text] of readmes) if (!text.includes('`' + tag + '`')) fail('readme', `${tag} is not listed in ${p}`);
}
for (const tag of documented) if (!tags.includes(tag)) fail('docs', `site/data.js documents ${tag}, which no file defines`);

const three = v => Array.isArray(v) && v.length === 3 && v.every(x => typeof x === 'string' && x.trim());
const seen = new Set();
for (const g of GROUPS) {
  if (!three(g.t)) fail('docs', `group ${g.id} needs a name in three languages`);
  for (const it of g.items) {
    if (seen.has(it.tag)) fail('docs', `${it.tag} is documented twice`); seen.add(it.tag);
    if (!three(it.t) || !three(it.d)) fail('docs', `${it.tag} needs a title and a description in three languages`);
    for (const a of it.attrs || []) if (!three(a[3])) fail('docs', `${it.tag}: the note for "${a[0]}" needs three languages`);
    for (const r of it.rel || []) if (!items.some(x => x.tag === r)) fail('docs', `${it.tag} lists ${r} as related, which has no entry`);
  }
}
for (const [key, v] of Object.entries(T)) if (!three(v)) fail('i18n', `"${key}" needs three languages`);
// every string the site asks for by a whole literal key exists (keys built by concatenation are not checked)
const asked = [...read('site/site.js').matchAll(/\bt\('([\w.]+)'\s*[,)]/g), ...read('index.html').matchAll(/data-t="([\w.]+)"/g)].map(m => m[1]);
for (const key of new Set(asked)) if (!T[key]) fail('i18n', `"${key}" is used by the site but missing from site/i18n.js`);

if (problems.length) { console.error(problems.join('\n')); console.error(`\n${problems.length} problem(s). See DESIGN.md.`); process.exit(1); }
console.log(`laws: ${files.length} source files, ${tags.length} tags, ${items.length} docs entries, ${Object.keys(T).length} strings. All clear.`);
