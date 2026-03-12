#!/usr/bin/env node
import { listContinuations } from '../lib/continuation.ts';
const baseDir = process.argv[2] || '/root/.openclaw/workspace';
const rows = await listContinuations(baseDir);
console.log(JSON.stringify({ continuations: rows }, null, 2));
