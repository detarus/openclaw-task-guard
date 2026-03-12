import { createContinuation, listContinuations, saveContinuation, type ContinuationRecord } from './continuation.ts';

export async function createGatewayRestartContinuation(baseDir: string, sessionKey: string) {
  return await createContinuation(baseDir, {
    sessionKey,
    goal: 'Continue work after guarded gateway restart',
    currentStep: 'gateway-restart-issued',
    nextStep: 'post-restart-status-check',
    verifyCommand: 'openclaw gateway status',
    resumeStatus: 'Похоже, прошлый шаг мог оборваться на рестарте. Перепроверил: gateway уже поднялся. Продолжаю с текущего места.',
    canResume: true,
  });
}

export async function findPendingGatewayRestartContinuation(baseDir: string) {
  const rows = await listContinuations(baseDir);
  return rows.find(
    (row) =>
      row.status === 'active' &&
      row.currentStep === 'gateway-restart-issued' &&
      row.nextStep === 'post-restart-status-check' &&
      row.canResume,
  ) || null;
}

export async function markGatewayRestartContinuationResuming(baseDir: string, record: ContinuationRecord) {
  record.status = 'resuming';
  record.completedSteps = [...record.completedSteps, record.currentStep];
  record.currentStep = 'post-restart-status-check';
  record.nextStep = 'send-resume-status';
  await saveContinuation(baseDir, record);
  return record;
}

export async function markGatewayRestartContinuationCompleted(baseDir: string, record: ContinuationRecord) {
  record.status = 'completed';
  record.completedSteps = [...record.completedSteps, record.currentStep];
  record.currentStep = 'completed';
  record.nextStep = undefined;
  await saveContinuation(baseDir, record);
  return record;
}
