import { loadIndex, loadTask, saveTask, type TaskRecord } from "./state.ts";

export type RecoveryCandidate = {
  taskId: string;
  sessionKey: string;
  phase: string;
  message: string;
};

function buildRecoveryMessage(task: TaskRecord) {
  const bits: string[] = [];
  bits.push("Похоже, прошлый шаг мог оборваться.");
  if (task.summary) bits.push(`Короткий итог: ${task.summary}`);
  else if (task.userText) bits.push(`Последний контекст: ${task.userText}`);
  bits.push(`Текущая фаза: ${task.phase}.`);
  return bits.join(" ");
}

export async function collectRecoveryCandidates(baseDir: string) {
  const index = await loadIndex(baseDir);
  const candidates: RecoveryCandidate[] = [];

  for (const [sessionKey, taskId] of Object.entries(index)) {
    const task = await loadTask(taskId, baseDir);
    if (!task || task.state !== "open") continue;
    if (task.phase !== "recovery_pending") continue;

    candidates.push({
      taskId,
      sessionKey,
      phase: task.phase,
      message: buildRecoveryMessage(task),
    });
  }

  return candidates;
}

export async function markRecoveryAttempted(baseDir: string, taskId: string) {
  const task = await loadTask(taskId, baseDir);
  if (!task) return null;
  task.recovery = {
    needed: true,
    attemptedAt: new Date().toISOString(),
    attemptCount: (task.recovery?.attemptCount ?? 0) + 1,
  };
  await saveTask(task, baseDir);
  return task;
}
