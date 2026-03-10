import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type TaskState = "open" | "closed" | "orphaned" | "error";
export type TaskPhase =
  | "received"
  | "working"
  | "awaiting_reply"
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

const ROOT = path.join(process.cwd(), "state", "task-guard");
const TASKS_DIR = path.join(ROOT, "tasks");
const INDEX_PATH = path.join(ROOT, "index.json");

async function ensureLayout() {
  await fs.mkdir(TASKS_DIR, { recursive: true });
}

export function makeTaskId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const rand = crypto.randomBytes(4).toString("hex");
  return `tg_${stamp}_${rand}`;
}

export async function loadIndex(): Promise<Record<string, string>> {
  await ensureLayout();
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveIndex(index: Record<string, string>) {
  await ensureLayout();
  await fs.writeFile(INDEX_PATH, JSON.stringify(index, null, 2) + "\n", "utf8");
}

export async function saveTask(task: TaskRecord) {
  await ensureLayout();
  const file = path.join(TASKS_DIR, `${task.taskId}.json`);
  await fs.writeFile(file, JSON.stringify(task, null, 2) + "\n", "utf8");
}

export async function loadTask(taskId: string): Promise<TaskRecord | null> {
  try {
    const file = path.join(TASKS_DIR, `${taskId}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as TaskRecord;
  } catch {
    return null;
  }
}

export async function getOpenTaskForSession(sessionKey: string): Promise<TaskRecord | null> {
  const index = await loadIndex();
  const taskId = index[sessionKey];
  if (!taskId) return null;
  const task = await loadTask(taskId);
  if (!task) return null;
  if (task.state !== "open") return null;
  return task;
}

export async function setOpenTaskForSession(sessionKey: string, taskId: string) {
  const index = await loadIndex();
  index[sessionKey] = taskId;
  await saveIndex(index);
}

export async function clearOpenTaskForSession(sessionKey: string, taskId?: string) {
  const index = await loadIndex();
  if (!index[sessionKey]) return;
  if (taskId && index[sessionKey] !== taskId) return;
  delete index[sessionKey];
  await saveIndex(index);
}
