import { build } from 'esbuild';
import { statSync } from 'node:fs';

const started = Date.now();
await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'app.js',
  format: 'iife',
  target: ['chrome90', 'firefox88', 'safari14'],
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
});

const bytes = statSync('app.js').size;
console.log(`\nBuilt app.js — ${(bytes / 1024).toFixed(1)} kB in ${Date.now() - started} ms`);
