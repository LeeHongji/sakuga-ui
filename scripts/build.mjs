// Bundle the library into dist/ and record sizes. Usage: npm run build
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
const common = { bundle: true, minify: true, target: 'es2022', legalComments: 'none' };
await build({ ...common, entryPoints: ['src/index.js'], format: 'esm', outfile: 'dist/sakuga.js' });
await build({ ...common, entryPoints: ['src/index.js'], format: 'iife', globalName: 'Sakuga', outfile: 'dist/sakuga.iife.js' });
await build({ ...common, entryPoints: ['src/core/index.js'], format: 'esm', outfile: 'dist/sakuga.core.js' });

const kb = n => +(n / 1024).toFixed(1);
const size = f => { const b = readFileSync(f); return { rawKB: kb(b.length), gzipKB: kb(gzipSync(b, { level: 9 }).length) }; };
const all = size('dist/sakuga.js'), core = size('dist/sakuga.core.js');
const meta = { version: JSON.parse(readFileSync('package.json', 'utf8')).version, ...all, core };
writeFileSync('dist/meta.json', JSON.stringify(meta, null, 2) + '\n');
console.log(`sakuga.js       ${all.rawKB} kB  (${all.gzipKB} kB gzip)`);
console.log(`sakuga.core.js  ${core.rawKB} kB  (${core.gzipKB} kB gzip)`);
