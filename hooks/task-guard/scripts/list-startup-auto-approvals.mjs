#!/usr/bin/env node
import { collectStartupAutoSendApprovals } from "../lib/startup-followup.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const approvals = await collectStartupAutoSendApprovals(baseDir);
console.log(JSON.stringify({ approvals }, null, 2));
