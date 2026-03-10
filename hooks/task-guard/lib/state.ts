import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type TaskState = "open" | "closed" | "orphaned" | "error";

// Phases describe the lifecycle stage inside an otherwise open/closed task record.
export type TaskPhase =
  | "received"
  | "working"
  | "awaiting_reply"
  | "awaiting_confirmation"
  | "reply_sent"
  | "recovery_pending"
  | "recovered";

export interface TaskRecord {
  taskId: string;
  sessionKey: string;
  agentId?: string;
  channel?: string;
  conversationId?: string;
  messageId?: string;
  openedAt: string;
  updatedAt: string;
  state: TaskState;
  phase: TaskPhase;
  userText?: string;
  workDetected: boolean;
  lastWorkAt?: string;
  replySentAt?: string | null;
  closedAt?: string | null;
  recovery: {
    needed: boolean;
    attemptedAt?: string | null;
    attemptCount: number;
  };
  summary?: string | null;
  tags?: string[];
}

// All durable state lives under the workspace so task history survives restarts
// and is easy to inspect alongside the project.
function resolveRoot(baseDir?: string) {
  const rootBase = baseDir || process.cwd();
  return path.join(rootBase, "state", "task-guard");
}

function getPaths(baseDir?: string) {
  const root = resolveRoot(baseDir);
  return {
    ROOT: root,
    TASKS_DIR: path.join(root, "tasks"),
    INDEX_PATH: path.join(root, "index.json"),
  };
}

async function ensureLayout(baseDir?: string) {
  const { TASKS_DIR } = getPaths(baseDir);
  await fs.mkdir(TASKS_DIR, { recursive: true });
}

export function makeTaskId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const rand = crypto.randomBytes(4).toString("hex");
  return `tg_${stamp}_${rand}`;
}

export async function loadIndex(baseDir?: string): Promise<Record<string, string>> {
  await ensureLayout(baseDir);
  const { INDEX_PATH } = getPaths(baseDir);
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveIndex(index: Record<string, string>, baseDir?: string) {
  await ensureLayout(baseDir);
  const { INDEX_PATH } = getPaths(baseDir);
  await fs.writeFile(INDEX_PATH, JSON.stringify(index, null, 2) + "\n", "utf8");
}

export async function saveTask(task: TaskRecord, baseDir?: string) {
  await ensureLayout(baseDir);
  const { TASKS_DIR } = getPaths(baseDir);
  const file = path.join(TASKS_DIR, `${task.taskId}.json`);
  await fs.writeFile(file, JSON.stringify(task, null, 2) + "\n", "utf8");
}

export async function loadTask(taskId: string, baseDir?: string): Promise<TaskRecord | null> {
  try {
    const { TASKS_DIR } = getPaths(baseDir);
    const file = path.join(TASKS_DIR, `${taskId}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as TaskRecord;
  } catch {
    return null;
  }
}

// The index maps one active open task per session. This keeps lookup cheap while
// leaving the full task history in per-task JSON files.
export async function getOpenTaskForSession(sessionKey: string, baseDir?: string): Promise<TaskRecord | null> {
  const index = await loadIndex(baseDir);
  const taskId = index[sessionKey];
  if (!taskId) return null;

  const task = await loadTask(taskId, baseDir);
  if (!task) return null;
  if (task.state !== "open") return null;
  return task;
}

export async function setOpenTaskForSession(sessionKey: string, taskId: string, baseDir?: string) {
  const index = await loadIndex(baseDir);
  index[sessionKey] = taskId;
  await saveIndex(index, baseDir);
}

export async function clearOpenTaskForSession(sessionKey: string, taskId?: string, baseDir?: string) {
  const index = await loadIndex(baseDir);
  if (!index[sessionKey]) return;
  if (taskId && index[sessionKey] !== taskId) return;
  delete index[sessionKey];
  await saveIndex(index, baseDir);
}
