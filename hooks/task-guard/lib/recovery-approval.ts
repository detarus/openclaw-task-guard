import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { evaluateRecoveryPolicy } from "./recovery-policy.ts";

export type PendingApproval = {
  approvalId: string;
  taskId: string;
  sessionKey: string;
  message: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "sent" | "cancelled" | "expired";
};

function approvalsDir(baseDir: string) {
  return path.join(baseDir, "state", "task-guard", "approvals");
}

async function ensureDir(baseDir: string) {
  await fs.mkdir(approvalsDir(baseDir), { recursive: true });
}

function makeApprovalId() {
  return `appr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export async function createRecoveryApprovals(baseDir: string, opts?: { minRecoveryPendingMs?: number; ttlMs?: number }) {
  const ttlMs = opts?.ttlMs ?? 15 * 60_000;
  const decisions = await evaluateRecoveryPolicy(baseDir, opts);
  const created: PendingApproval[] = [];
  await ensureDir(baseDir);

  for (const decision of decisions) {
    if (!decision.allowSend || !decision.message) continue;
    const now = Date.now();
    const approval: PendingApproval = {
      approvalId: makeApprovalId(),
      taskId: decision.taskId,
      sessionKey: decision.sessionKey,
      message: decision.message,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
      status: "pending",
    };
    const file = path.join(approvalsDir(baseDir), `${approval.approvalId}.json`);
    await fs.writeFile(file, JSON.stringify(approval, null, 2) + "\n", "utf8");
    created.push(approval);
  }

  return created;
}

export async function loadApproval(baseDir: string, approvalId: string) {
  try {
    const file = path.join(approvalsDir(baseDir), `${approvalId}.json`);
    return JSON.parse(await fs.readFile(file, "utf8")) as PendingApproval;
  } catch {
    return null;
  }
}

export async function saveApproval(baseDir: string, approval: PendingApproval) {
  await ensureDir(baseDir);
  const file = path.join(approvalsDir(baseDir), `${approval.approvalId}.json`);
  await fs.writeFile(file, JSON.stringify(approval, null, 2) + "\n", "utf8");
}

export async function listApprovals(baseDir: string) {
  await ensureDir(baseDir);
  const files = await fs.readdir(approvalsDir(baseDir));
  const rows: PendingApproval[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const row = await loadApproval(baseDir, f.replace(/\.json$/, ""));
    if (row) rows.push(row);
  }
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return rows;
}
