#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { collectStartupAutoSendApprovals, markStartupApprovalSent } from '../lib/startup-followup.ts';

const execFileAsync = promisify(execFile);
const baseDir = process.argv[2] || '/root/.openclaw/workspace';
const dryRun = process.argv.includes('--dry-run');

function parseSessionTarget(sessionKey) {
  const parts = String(sessionKey || '').split(':');
  if (parts.length >= 5 && parts[2] === 'telegram' && parts[3] === 'direct') {
    return { channel: 'telegram', target: parts[4] };
  }
  return null;
}

const approvals = await collectStartupAutoSendApprovals(baseDir);
const results = [];

for (const approval of approvals) {
  const target = parseSessionTarget(approval.sessionKey);
  if (!target) {
    results.push({ approvalId: approval.approvalId, status: 'skipped', reason: 'unsupported-session-target' });
    continue;
  }

  if (dryRun) {
    results.push({ approvalId: approval.approvalId, status: 'dry-run', channel: target.channel, target: target.target, message: approval.message });
    continue;
  }

  await execFileAsync('openclaw', [
    'message', 'send',
    '--channel', target.channel,
    '--target', target.target,
    '--message', approval.message,
  ]);

  await markStartupApprovalSent(baseDir, approval.approvalId);
  results.push({ approvalId: approval.approvalId, status: 'sent', channel: target.channel, target: target.target });
}

console.log(JSON.stringify({ approvals: approvals.length, results }, null, 2));
