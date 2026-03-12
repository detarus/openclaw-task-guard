#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const versionPath = path.join(repoRoot, 'VERSION');
const raw = fs.readFileSync(versionPath, 'utf8').trim();
const parts = raw.split('.').map(Number);
if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0)) {
  console.error(`Invalid VERSION format: ${raw}. Expected x.y.z.n`);
  process.exit(1);
}
parts[3] += 1;
const next = parts.join('.');
fs.writeFileSync(versionPath, next + '\n');
console.log(next);
