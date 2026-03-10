#!/usr/bin/env node
import { reconcileOpenTasks } from "../lib/reconcile.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const dryRun = process.argv.includes("--dry-run");
const staleArg = process.argv.find((arg) => arg.startsWith("--stale-ms="));
const staleMs = staleArg ? Number(staleArg.split("=")[1]) : undefined;

const result = await reconcileOpenTasks(baseDir, { dryRun, staleMs });
console.log(JSON.stringify(result, null, 2));
