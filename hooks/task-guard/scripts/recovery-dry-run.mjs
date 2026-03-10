#!/usr/bin/env node
import { collectRecoveryCandidates, markRecoveryAttempted } from "../lib/recovery.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const mark = process.argv.includes("--mark");

const candidates = await collectRecoveryCandidates(baseDir);
console.log(JSON.stringify({ count: candidates.length, candidates }, null, 2));

if (mark) {
  for (const candidate of candidates) {
    await markRecoveryAttempted(baseDir, candidate.taskId);
  }
}
