#!/usr/bin/env node
import { createIncident } from "../lib/incidents.ts";

const baseDir = process.argv[2] || "/root/.openclaw/workspace";
const sessionKey = process.argv[3] || "agent:main:telegram:direct:759328425";

const incident = await createIncident(baseDir, {
  incidentType: "gateway-restart-interrupt",
  sessionKey,
});

console.log(JSON.stringify({ createdIncident: incident }, null, 2));
console.log("Now run: openclaw gateway restart");
