import {
  clearOpenTaskForSession,
  getOpenTaskForSession,
  makeTaskId,
  saveTask,
  setOpenTaskForSession,
  type TaskRecord,
} from "./lib/state.ts";

function nowIso() {
  return new Date().toISOString();
}

function getSessionKey(event: any): string | undefined {
  return event?.sessionKey || event?.context?.sessionKey;
}

function getInboundText(event: any): string {
  return (
    event?.context?.bodyForAgent ||
    event?.context?.body ||
    event?.context?.content ||
    ""
  );
}

function getWorkspaceDir(event: any): string | undefined {
  return event?.context?.workspaceDir || event?.context?.sessionEntry?.workspaceDir;
}

async function onInbound(event: any) {
  const sessionKey = getSessionKey(event);
  if (!sessionKey) return;

  const workspaceDir = getWorkspaceDir(event);
  const existing = await getOpenTaskForSession(sessionKey, workspaceDir);
  const now = nowIso();
  const content = getInboundText(event);

  if (existing) {
    existing.updatedAt = now;
    existing.phase = existing.workDetected ? "awaiting_reply" : "received";
    if (content) existing.userText = content;
    existing.workDetected = true;
    existing.lastWorkAt = now;
    await saveTask(existing, workspaceDir);
    console.log(`[task-guard] inbound refresh session=${sessionKey} workspace=${workspaceDir || process.cwd()}`);
    return;
  }

  const task: TaskRecord = {
    taskId: makeTaskId(),
    sessionKey,
    agentId: event?.context?.sessionEntry?.agentId || event?.agentId,
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

  task.workDetected = true;
  task.lastWorkAt = now;
  await saveTask(task, workspaceDir);
  await setOpenTaskForSession(sessionKey, task.taskId, workspaceDir);
  console.log(`[task-guard] opened task=${task.taskId} session=${sessionKey} workspace=${workspaceDir || process.cwd()}`);
}

async function onOutbound(event: any) {
  if (event?.context?.success === false) return;
  const sessionKey = getSessionKey(event);
  if (!sessionKey) return;

  const workspaceDir = getWorkspaceDir(event);
  const task = await getOpenTaskForSession(sessionKey, workspaceDir);
  if (!task) return;

  const now = nowIso();
  task.updatedAt = now;
  task.replySentAt = now;
  task.closedAt = now;
  task.phase = "reply_sent";
  task.state = "closed";
  await saveTask(task, workspaceDir);
  await clearOpenTaskForSession(sessionKey, task.taskId, workspaceDir);
  console.log(`[task-guard] closed task=${task.taskId} session=${sessionKey} workspace=${workspaceDir || process.cwd()}`);
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
