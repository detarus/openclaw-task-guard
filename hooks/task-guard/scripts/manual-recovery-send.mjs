#!/usr/bin/env node
import { runManualRecoverySend } from "../lib/recovery-send.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const minArg = process.argv.find((arg) => arg.startsWith("--min-ms="));
const minRecoveryPendingMs = minArg ? Number(minArg.split("=")[1]) : undefined;
const dryRun = process.argv.includes("--dry-run");

const sender = async ({ sessionKey, message }) => {
  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, sessionKey, message }, null, 2));
    return;
  }
  throw new Error("No real sender wired yet; use --dry-run or integrate with OpenClaw messaging.");
};

const result = await runManualRecoverySend(baseDir, sender, { minRecoveryPendingMs });
console.log(JSON.stringify(result, null, 2));
