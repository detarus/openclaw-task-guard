#!/usr/bin/env node
import { confirmRecoverySend } from "../lib/recovery-confirm.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const approvalId = process.argv[3];
const dryRun = process.argv.includes("--dry-run");

if (!approvalId) {
  console.error("Usage: recovery-confirm-send.mjs <baseDir> <approvalId> [--dry-run]");
  process.exit(2);
}

const sender = async ({ sessionKey, message }) => {
  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, sessionKey, message }, null, 2));
    return;
  }
  throw new Error("No real sender wired yet; use --dry-run or integrate with OpenClaw messaging.");
};

const result = await confirmRecoverySend(baseDir, approvalId, sender);
console.log(JSON.stringify(result, null, 2));
