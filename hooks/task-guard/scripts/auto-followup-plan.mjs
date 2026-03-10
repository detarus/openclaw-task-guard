#!/usr/bin/env node
import { listKnownFollowupRules, planAutoFollowup } from "../lib/auto-followup.ts";

const incidentType = process.argv[2];
const attemptArg = process.argv.find((arg) => arg.startsWith("--attempt="));
const attemptCount = attemptArg ? Number(attemptArg.split("=")[1]) : 0;

if (!incidentType) {
  console.log(JSON.stringify({ knownRules: listKnownFollowupRules() }, null, 2));
  process.exit(0);
}

const plan = planAutoFollowup({ incidentType, attemptCount });
console.log(JSON.stringify(plan, null, 2));
