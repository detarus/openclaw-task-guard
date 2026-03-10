import fs from "node:fs/promises";
import path from "node:path";
import { loadIndex, loadTask, saveTask, type TaskRecord } from "./state.ts";

export type ReconcileResult = {
  scanned: number;
  updated: number;
  candidates: Array<{
    taskId: string;
    sessionKey: string;
    fromPhase: string;
    toPhase: string;
    reason: string;
  }>;
};

function ageMs(iso: string | undefined, now = Date.now()) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return Number.POSITIVE_INFINITY;
  return now - ts;
}

export async function reconcileOpenTasks(baseDir: string, opts?: { staleMs?: number; dryRun?: boolean }) {
  const staleMs = opts?.staleMs ?? 60_000;
  const dryRun = opts?.dryRun ?? false;
  const index = await loadIndex(baseDir);
  const now = new Date().toISOString();
  const result: ReconcileResult = { scanned: 0, updated: 0, candidates: [] };

  for (const [sessionKey, taskId] of Object.entries(index)) {
    const task = await loadTask(taskId, baseDir);
    if (!task || task.state !== "open") continue;
    result.scanned += 1;

    const taskAge = ageMs(task.updatedAt);
    if (task.phase === "awaiting_reply" && taskAge >= staleMs) {
      result.candidates.push({
        taskId,
        sessionKey,
        fromPhase: task.phase,
        toPhase: "awaiting_confirmation",
        reason: `stale-open-task>${staleMs}ms`,
      });
      if (!dryRun) {
        task.phase = "awaiting_confirmation";
        task.updatedAt = now;
        await saveTask(task, baseDir);
        result.updated += 1;
      }
    }
  }

  return result;
}
