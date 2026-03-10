import { loadApproval, saveApproval, type PendingApproval } from "./recovery-approval.ts";
import { clearOpenTaskForSession, loadTask, saveTask } from "./state.ts";
import { markDecisionSent } from "./recovery-policy.ts";

export type ConfirmRecoveryResult = {
  approvalId: string;
  status: "sent" | "skipped" | "error";
  reason: string;
  taskId?: string;
  sessionKey?: string;
  message?: string;
};

function isExpired(approval: PendingApproval) {
  const ts = Date.parse(approval.expiresAt);
  return Number.isFinite(ts) ? Date.now() > ts : true;
}

export async function confirmRecoverySend(
  baseDir: string,
  approvalId: string,
  sender: (params: { sessionKey: string; message: string }) => Promise<void>,
) : Promise<ConfirmRecoveryResult> {
  const approval = await loadApproval(baseDir, approvalId);
  if (!approval) {
    return { approvalId, status: "skipped", reason: "approval-not-found" };
  }

  if (approval.status !== "pending") {
    return {
      approvalId,
      status: "skipped",
      reason: `approval-status-${approval.status}`,
      taskId: approval.taskId,
      sessionKey: approval.sessionKey,
      message: approval.message,
    };
  }

  if (isExpired(approval)) {
    approval.status = "expired";
    await saveApproval(baseDir, approval);
    return {
      approvalId,
      status: "skipped",
      reason: "approval-expired",
      taskId: approval.taskId,
      sessionKey: approval.sessionKey,
      message: approval.message,
    };
  }

  try {
    await sender({ sessionKey: approval.sessionKey, message: approval.message });
    approval.status = "sent";
    await saveApproval(baseDir, approval);
    await markDecisionSent(baseDir, approval.taskId);

    const task = await loadTask(approval.taskId, baseDir);
    if (task) {
      task.phase = "recovered";
      task.state = "closed";
      task.closedAt = new Date().toISOString();
      task.summary = approval.message;
      await saveTask(task, baseDir);
      await clearOpenTaskForSession(task.sessionKey, task.taskId, baseDir);
    }

    return {
      approvalId,
      status: "sent",
      reason: "recovery-sent",
      taskId: approval.taskId,
      sessionKey: approval.sessionKey,
      message: approval.message,
    };
  } catch (error: any) {
    return {
      approvalId,
      status: "error",
      reason: error?.message || String(error),
      taskId: approval.taskId,
      sessionKey: approval.sessionKey,
      message: approval.message,
    };
  }
}
