import { collectRecoveryCandidates, markRecoveryAttempted } from "./recovery.ts";
import { loadTask } from "./state.ts";

export type RecoveryPolicyDecision = {
  taskId: string;
  sessionKey: string;
  allowSend: boolean;
  reason: string;
  message?: string;
};

function ageMs(iso: string | undefined, now = Date.now()) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return Number.POSITIVE_INFINITY;
  return now - ts;
}

export async function evaluateRecoveryPolicy(baseDir: string, opts?: { minRecoveryPendingMs?: number }) {
  const minRecoveryPendingMs = opts?.minRecoveryPendingMs ?? 30_000;
  const candidates = await collectRecoveryCandidates(baseDir);
  const decisions: RecoveryPolicyDecision[] = [];

  for (const candidate of candidates) {
    const task = await loadTask(candidate.taskId, baseDir);
    if (!task) continue;

    const pendingAge = ageMs(task.updatedAt);
    const attemptCount = task.recovery?.attemptCount ?? 0;

    if (task.phase !== "recovery_pending") {
      decisions.push({
        taskId: candidate.taskId,
        sessionKey: candidate.sessionKey,
        allowSend: false,
        reason: "phase-not-recovery-pending",
      });
      continue;
    }

    if (attemptCount > 0) {
      decisions.push({
        taskId: candidate.taskId,
        sessionKey: candidate.sessionKey,
        allowSend: false,
        reason: "attempt-already-recorded",
      });
      continue;
    }

    if (pendingAge < minRecoveryPendingMs) {
      decisions.push({
        taskId: candidate.taskId,
        sessionKey: candidate.sessionKey,
        allowSend: false,
        reason: `recovery-pending-too-fresh<${minRecoveryPendingMs}ms`,
      });
      continue;
    }

    decisions.push({
      taskId: candidate.taskId,
      sessionKey: candidate.sessionKey,
      allowSend: true,
      reason: "safe-one-shot-recovery",
      message: candidate.message,
    });
  }

  return decisions;
}

export async function markDecisionSent(baseDir: string, taskId: string) {
  return await markRecoveryAttempted(baseDir, taskId);
}
