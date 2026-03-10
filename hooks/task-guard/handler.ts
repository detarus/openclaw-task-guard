import {
  clearOpenTaskForSession,
  getOpenTaskForSession,
  makeTaskId,
  saveTask,
  setOpenTaskForSession,
  type TaskRecord,
} from "./lib/state.ts";
import { reconcileOpenTasks } from "./lib/reconcile.ts";

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

function getWorkspaceDir(event: any): string {
  return (
    event?.context?.workspaceDir ||
    event?.context?.sessionEntry?.workspaceDir ||
    "/root/.openclaw/workspace"
  );
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

async function onStartup(event: any) {
  const workspaceDir = getWorkspaceDir(event);
  const result = await reconcileOpenTasks(workspaceDir, {
    dryRun: false,
    staleMs: 60_000,
  });
  console.log(`[task-guard] startup reconcile ${JSON.stringify(result)}`);
}

export default async function handler(event: any) {
  try {
    const summary = {
      type: event?.type,
      action: event?.action,
      sessionKey: event?.sessionKey,
      hasContext: !!event?.context,
      contextKeys: event?.context ? Object.keys(event.context) : [],
      channelId: event?.context?.channelId,
      conversationId: event?.context?.conversationId,
      messageId: event?.context?.messageId,
      workspaceDir: getWorkspaceDir(event),
    };
    console.log(`[task-guard] event ${JSON.stringify(summary)}`);

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
  } catch (error: any) {
    console.error(`[task-guard] handler error: ${error?.stack || error?.message || error}`);
  }
}
