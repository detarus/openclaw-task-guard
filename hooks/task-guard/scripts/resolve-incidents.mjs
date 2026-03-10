#!/usr/bin/env node
import { resolvePendingIncidentsToApprovals } from "../lib/incidents.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const approvals = await resolvePendingIncidentsToApprovals(baseDir);
console.log(JSON.stringify({ createdApprovals: approvals }, null, 2));
