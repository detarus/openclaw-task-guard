#!/usr/bin/env node
import { createRecoveryApprovals, listApprovals } from "../lib/recovery-approval.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const minArg = process.argv.find((arg) => arg.startsWith("--min-ms="));
const minRecoveryPendingMs = minArg ? Number(minArg.split("=")[1]) : undefined;
const ttlArg = process.argv.find((arg) => arg.startsWith("--ttl-ms="));
const ttlMs = ttlArg ? Number(ttlArg.split("=")[1]) : undefined;

const created = await createRecoveryApprovals(baseDir, { minRecoveryPendingMs, ttlMs });
const approvals = await listApprovals(baseDir);
console.log(JSON.stringify({ created, approvals }, null, 2));
