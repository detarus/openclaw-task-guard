#!/usr/bin/env node
import { evaluateRecoveryPolicy } from "../lib/recovery-policy.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const minArg = process.argv.find((arg) => arg.startsWith("--min-ms="));
const minRecoveryPendingMs = minArg ? Number(minArg.split("=")[1]) : undefined;

const decisions = await evaluateRecoveryPolicy(baseDir, { minRecoveryPendingMs });
console.log(JSON.stringify({ count: decisions.length, decisions }, null, 2));
