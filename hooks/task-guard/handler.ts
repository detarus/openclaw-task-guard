import {
  clearOpenTaskForSession,
  getOpenTaskForSession,
  makeTaskId,
  saveTask,
  setOpenTaskForSession,
  type TaskRecord,
} from "./lib/state.js";

function nowIso() {
  return new Date().toISOString();
}

function getSessionKey(event: any): string | undefined {
  return event?.sessionKey || event?.context?.sessionKey;
}

async function onInbound(event: any) {
  const sessionKey = getSessionKey(event);
  if (!sessionKey) return;

  const existing = await getOpenTaskForSession(sessionKey);
  const now = nowIso();
  const content = event?.context?.content || "";

  if (existing) {
    existing.updatedAt = now;
    existing.phase = existing.workDetected ? "awaiting_reply" : "received";
    if (content) existing.userText = content;
    await saveTask(existing);
    return;
  }

  const task: TaskRecord = {
    taskId: makeTaskId(),
    sessionKey,
    agentId: event?.context?.sessionEntry?.agentId,
    channel: event?.context?.channelId,
    conversationId: event?.context?.conversationId,
    messageId: event?.context?.messageId,
    openedAt: now,
    updatedAt: now,
    state: "open",
    phase: "received",
    userText: content || undefined,
    workDetected: false,
    replySentAt: null,
    closedAt: null,
    recovery: {
      needed: false,
      attemptedAt: null,
      attemptCount: 0,
    },
    summary: null,
    tags: ["task-guard"],
  };

  await saveTask(task);
  await setOpenTaskForSession(sessionKey, task.taskId);
}

async function onOutbound(event: any) {
  if (event?.context?.success === false) return;
  const sessionKey = getSessionKey(event);
  if (!sessionKey) return;

  const task = await getOpenTaskForSession(sessionKey);
  if (!task) return;

  const now = nowIso();
  task.updatedAt = now;
  task.replySentAt = now;
  task.closedAt = now;
  task.phase = "reply_sent";
  task.state = "closed";
  await saveTask(task);
  await clearOpenTaskForSession(sessionKey, task.taskId);
}

async function onStartup(_event: any) {
  // Phase 2 scaffold only. Reconciliation logic will be added in the next task.
  return;
}

export default async function handler(event: any) {
  if (event?.type === "message" && event?.action === "preprocessed") {
    await onInbound(event);
    return;
  }

  if (event?.type === "message" && event?.action === "sent") {
    await onOutbound(event);
    return;
  }

  if (event?.type === "gateway" && event?.action === "startup") {
    await onStartup(event);
  }
}
