import { evaluateRecoveryPolicy, markDecisionSent } from "./recovery-policy.ts";
import { clearOpenTaskForSession, loadTask, saveTask } from "./state.ts";

export type RecoverySendResult = {
  attempted: number;
  sent: number;
  skipped: number;
  results: Array<{
    taskId: string;
    sessionKey: string;
    status: "sent" | "skipped" | "error";
    reason: string;
    message?: string;
  }>;
};

export async function runManualRecoverySend(baseDir: string, sender: (params: { sessionKey: string; message: string }) => Promise<void>, opts?: { minRecoveryPendingMs?: number }) {
  const decisions = await evaluateRecoveryPolicy(baseDir, opts);
  const result: RecoverySendResult = { attempted: 0, sent: 0, skipped: 0, results: [] };

  for (const decision of decisions) {
    result.attempted += 1;

    if (!decision.allowSend || !decision.message) {
      result.skipped += 1;
      result.results.push({
        taskId: decision.taskId,
        sessionKey: decision.sessionKey,
        status: "skipped",
        reason: decision.reason,
      });
      continue;
    }

    try {
      await sender({ sessionKey: decision.sessionKey, message: decision.message });
      await markDecisionSent(baseDir, decision.taskId);
      const task = await loadTask(decision.taskId, baseDir);
      if (task) {
        task.phase = "recovered";
        task.state = "closed";
        task.closedAt = new Date().toISOString();
        task.summary = decision.message;
        await saveTask(task, baseDir);
        await clearOpenTaskForSession(task.sessionKey, task.taskId, baseDir);
      }
      result.sent += 1;
      result.results.push({
        taskId: decision.taskId,
        sessionKey: decision.sessionKey,
        status: "sent",
        reason: decision.reason,
        message: decision.message,
      });
    } catch (error: any) {
      result.results.push({
        taskId: decision.taskId,
        sessionKey: decision.sessionKey,
        status: "error",
        reason: error?.message || String(error),
        message: decision.message,
      });
    }
  }

  return result;
}
