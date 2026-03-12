import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export type RestartRecoveryRecord = {
  recoveryId: string;
  sessionKey: string;
  channel: string;
  target: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'sent' | 'expired';
  sentAt?: string;
};

function dir(baseDir: string) {
  return path.join(baseDir, 'state', 'task-guard', 'restart-recovery');
}

async function ensure(baseDir: string) {
  await fs.mkdir(dir(baseDir), { recursive: true });
}

function makeId() {
  return `rr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function parseSessionTarget(sessionKey: string) {
  const parts = String(sessionKey || '').split(':');
  if (parts.length >= 5 && parts[2] === 'telegram' && parts[3] === 'direct') {
    return { channel: 'telegram', target: parts[4] };
  }
  throw new Error(`Unsupported session target for restart recovery: ${sessionKey}`);
}

export async function createRestartRecovery(baseDir: string, sessionKey: string, message?: string) {
  await ensure(baseDir);
  const target = parseSessionTarget(sessionKey);
  const record: RestartRecoveryRecord = {
    recoveryId: makeId(),
    sessionKey,
    channel: target.channel,
    target: target.target,
    message: message || 'Похоже, прошлый шаг мог оборваться на рестарте. Перепроверил: gateway уже поднялся. Продолжаю с текущего места.',
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  const file = path.join(dir(baseDir), `${record.recoveryId}.json`);
  await fs.writeFile(file, JSON.stringify(record, null, 2) + '\n', 'utf8');
  return record;
}

export async function listRestartRecoveries(baseDir: string) {
  await ensure(baseDir);
  const files = await fs.readdir(dir(baseDir));
  const rows: RestartRecoveryRecord[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(dir(baseDir), f), 'utf8');
    rows.push(JSON.parse(raw));
  }
  rows.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  return rows;
}

export async function markRestartRecoverySent(baseDir: string, recoveryId: string) {
  const rows = await listRestartRecoveries(baseDir);
  const row = rows.find(r => r.recoveryId === recoveryId);
  if (!row) return null;
  row.status = 'sent';
  row.sentAt = new Date().toISOString();
  const file = path.join(dir(baseDir), `${row.recoveryId}.json`);
  await fs.writeFile(file, JSON.stringify(row, null, 2) + '\n', 'utf8');
  return row;
}
