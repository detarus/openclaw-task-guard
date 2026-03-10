#!/usr/bin/env node
import { confirmRecoverySend } from "../lib/recovery-confirm.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const approvalId = process.argv[3];
const channel = process.argv[4];
const target = process.argv[5];

if (!approvalId || !channel || !target) {
  console.error("Usage: recovery-confirm-send-via-message.mjs <baseDir> <approvalId> <channel> <target>");
  process.exit(2);
}

const result = await confirmRecoverySend(
  baseDir,
  approvalId,
  async ({ message }) => {
    // Real sending is intentionally delegated to OpenClaw runtime/tooling, not implemented inside the script.
    // This script acts as a bridge target for operator-driven sends and records state transitions.
    console.log(JSON.stringify({ needsExternalSend: true, channel, target, message }, null, 2));
  },
);

console.log(JSON.stringify(result, null, 2));
