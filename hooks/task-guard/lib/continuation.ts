import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export type ContinuationStatus =
  | 'active'
  | 'interrupted'
  | 'ready_to_resume'
  | 'resuming'
  | 'completed'
  | 'abandoned';

export type ContinuationRecord = {
  continuationId: string;
  taskId?: string;
  sessionKey: string;
  goal: string;
  currentStep: string;
  completedSteps: string[];
  nextStep?: string;
  verifyCommand?: string;
  resumeStatus?: string;
  canResume: boolean;
  status: ContinuationStatus;
  createdAt: string;
  updatedAt: string;
};

function dir(baseDir: string) {
  return path.join(baseDir, 'state', 'task-guard', 'continuations');
}

async function ensure(baseDir: string) {
  await fs.mkdir(dir(baseDir), { recursive: true });
}

function makeId() {
  return `cont_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export async function createContinuation(baseDir: string, params: {
  taskId?: string;
  sessionKey: string;
  goal: string;
  currentStep: string;
  nextStep?: string;
  verifyCommand?: string;
  resumeStatus?: string;
  canResume?: boolean;
}) {
  await ensure(baseDir);
  const now = new Date().toISOString();
  const record: ContinuationRecord = {
    continuationId: makeId(),
    taskId: params.taskId,
    sessionKey: params.sessionKey,
    goal: params.goal,
    currentStep: params.currentStep,
    completedSteps: [],
    nextStep: params.nextStep,
    verifyCommand: params.verifyCommand,
    resumeStatus: params.resumeStatus,
    canResume: params.canResume ?? true,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  await fs.writeFile(path.join(dir(baseDir), `${record.continuationId}.json`), JSON.stringify(record, null, 2) + '\n');
  return record;
}

export async function listContinuations(baseDir: string) {
  await ensure(baseDir);
  const files = await fs.readdir(dir(baseDir));
  const rows: ContinuationRecord[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(dir(baseDir), f), 'utf8');
    rows.push(JSON.parse(raw) as ContinuationRecord);
  }
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return rows;
}

export async function loadContinuation(baseDir: string, continuationId: string) {
  try {
    const raw = await fs.readFile(path.join(dir(baseDir), `${continuationId}.json`), 'utf8');
    return JSON.parse(raw) as ContinuationRecord;
  } catch {
    return null;
  }
}

export async function saveContinuation(baseDir: string, record: ContinuationRecord) {
  await ensure(baseDir);
  record.updatedAt = new Date().toISOString();
  await fs.writeFile(path.join(dir(baseDir), `${record.continuationId}.json`), JSON.stringify(record, null, 2) + '\n');
}
