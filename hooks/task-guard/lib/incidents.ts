import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { type KnownIncidentType, planAutoFollowup } from "./auto-followup.ts";
import { type PendingApproval, saveApproval } from "./recovery-approval.ts";

export type IncidentRecord = {
  incidentId: string;
  incidentType: KnownIncidentType;
  sessionKey: string;
  createdAt: string;
  status: "pending" | "resolved" | "expired";
  attemptCount: number;
};

function incidentsDir(baseDir: string) {
  return path.join(baseDir, "state", "task-guard", "incidents");
}

async function ensureDir(baseDir: string) {
  await fs.mkdir(incidentsDir(baseDir), { recursive: true });
}

function makeIncidentId() {
  return `inc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export async function createIncident(baseDir: string, params: { incidentType: KnownIncidentType; sessionKey: string }) {
  await ensureDir(baseDir);
  const record: IncidentRecord = {
    incidentId: makeIncidentId(),
    incidentType: params.incidentType,
    sessionKey: params.sessionKey,
    createdAt: new Date().toISOString(),
    status: "pending",
    attemptCount: 0,
  };
  const file = path.join(incidentsDir(baseDir), `${record.incidentId}.json`);
  await fs.writeFile(file, JSON.stringify(record, null, 2) + "\n", "utf8");
  return record;
}

export async function listIncidents(baseDir: string) {
  await ensureDir(baseDir);
  const files = await fs.readdir(incidentsDir(baseDir));
  const rows: IncidentRecord[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(incidentsDir(baseDir), f), 'utf8');
    rows.push(JSON.parse(raw) as IncidentRecord);
  }
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return rows;
}

export async function saveIncident(baseDir: string, record: IncidentRecord) {
  await ensureDir(baseDir);
  const file = path.join(incidentsDir(baseDir), `${record.incidentId}.json`);
  await fs.writeFile(file, JSON.stringify(record, null, 2) + "\n", "utf8");
}

export async function resolvePendingIncidentsToApprovals(baseDir: string, opts?: { ttlMs?: number }) {
  const ttlMs = opts?.ttlMs ?? 10 * 60_000;
  const incidents = await listIncidents(baseDir);
  const created: PendingApproval[] = [];

  for (const incident of incidents) {
    if (incident.status !== 'pending') continue;
    const plan = planAutoFollowup({ incidentType: incident.incidentType, attemptCount: incident.attemptCount });
    if (!plan.shouldRun) {
      incident.status = 'resolved';
      incident.attemptCount += 1;
      await saveIncident(baseDir, incident);
      continue;
    }

    const now = Date.now();
    const approval: PendingApproval = {
      approvalId: `appr_${incident.incidentId}`,
      taskId: incident.incidentId,
      sessionKey: incident.sessionKey,
      message: plan.followupTemplate,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
      status: 'pending',
    };
    await saveApproval(baseDir, approval);
    incident.status = 'resolved';
    incident.attemptCount += 1;
    await saveIncident(baseDir, incident);
    created.push(approval);
  }

  return created;
}
