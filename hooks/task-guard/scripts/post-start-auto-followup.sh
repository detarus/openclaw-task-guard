#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="/root/.openclaw/workspace"

for _ in $(seq 1 30); do
  if openclaw gateway status >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

node - <<'NODE'
import { listRestartRecoveries, markRestartRecoverySent } from '/root/.openclaw/workspace/hooks/task-guard/lib/restart-recovery.ts';
import { findPendingGatewayRestartContinuation, markGatewayRestartContinuationResuming, markGatewayRestartContinuationCompleted } from '/root/.openclaw/workspace/hooks/task-guard/lib/restart-continuation.ts';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
const baseDir = '/root/.openclaw/workspace';

const rows = await listRestartRecoveries(baseDir);
const pending = rows.filter(r => r.status === 'pending');
const continuation = await findPendingGatewayRestartContinuation(baseDir);
const results = [];

if (continuation) {
  await markGatewayRestartContinuationResuming(baseDir, continuation);
}

for (const row of pending) {
  await execFileAsync('openclaw', ['message', 'send', '--channel', row.channel, '--target', row.target, '--message', row.message]);
  await markRestartRecoverySent(baseDir, row.recoveryId);
  results.push({ recoveryId: row.recoveryId, status: 'sent', channel: row.channel, target: row.target });
}

if (continuation) {
  await execFileAsync('openclaw', ['message', 'send', '--channel', 'telegram', '--target', '759328425', '--message', 'Текущий статус: gateway после рестарта жив, recovery-сообщение отправлено, continuation checkpoint переведён в resuming/completed. Дальше можно продолжать следующий шаг уже из сохранённого состояния.']);
  await markGatewayRestartContinuationCompleted(baseDir, continuation);
}

console.log(JSON.stringify({ restartRecoveries: pending.length, continuationFound: !!continuation, results }, null, 2));
NODE
