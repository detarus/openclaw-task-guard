#!/usr/bin/env node
import { createIncident } from "../lib/incidents.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const incidentType = process.argv[3];
const sessionKey = process.argv[4];

if (!incidentType || !sessionKey) {
  console.error("Usage: create-incident.mjs <baseDir> <incidentType> <sessionKey>");
  process.exit(2);
}

const result = await createIncident(baseDir, { incidentType, sessionKey });
console.log(JSON.stringify(result, null, 2));
