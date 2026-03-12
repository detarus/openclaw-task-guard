#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="/root/.openclaw/workspace"
LOG_TAG="[task-guard post-start]"

for _ in $(seq 1 30); do
  if openclaw gateway status >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

node - <<'NODE'
import { listRestartRecoveries, markRestartRecoverySent } from '/root/.openclaw/workspace/hooks/task-guard/lib/restart-recovery.ts';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
const baseDir = '/root/.openclaw/workspace';
const rows = await listRestartRecoveries(baseDir);
const pending = rows.filter(r => r.status === 'pending');
const results = [];
for (const row of pending) {
  await execFileAsync('openclaw', ['message', 'send', '--channel', row.channel, '--target', row.target, '--message', row.message]);
  await markRestartRecoverySent(baseDir, row.recoveryId);
  results.push({ recoveryId: row.recoveryId, status: 'sent', channel: row.channel, target: row.target });
}
console.log(JSON.stringify({ restartRecoveries: pending.length, results }, null, 2));
NODE
