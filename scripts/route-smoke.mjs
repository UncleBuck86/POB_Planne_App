#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const assetsDir = path.join(root, 'dist', 'assets');
const requiredTokens = [
  'dashboard',
  'planner',
  'personnel',
  'logistics',
  'pob',
  'admin',
  'logistics/manifest'
];

function fail(msg){
  console.error('ROUTE SMOKE FAIL:', msg);
  process.exit(1);
}

function ok(msg){
  console.log('ROUTE SMOKE PASS:', msg);
}

try {
  const files = fs.readdirSync(assetsDir).filter(f => /index-.*\.js$/.test(f));
  if (!files.length) fail('No built index-*.js found in dist/assets');
  const indexJs = path.join(assetsDir, files[0]);
  const content = fs.readFileSync(indexJs, 'utf8');
  const missing = requiredTokens.filter(tok => !content.includes(tok));
  if (missing.length) fail('Missing route tokens: ' + missing.join(', '));
  ok('All required route tokens present.');
} catch (e) {
  fail(e.message || String(e));
}
