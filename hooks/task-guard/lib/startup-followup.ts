import { listApprovals, saveApproval, type PendingApproval } from "./recovery-approval.ts";

export type StartupAutoApproval = PendingApproval & {
  autoSendEligible: boolean;
};

// Only allow auto-send for a very narrow class of startup-generated approvals.
// Right now this is intended for known safe restart interruption follow-ups.
export async function collectStartupAutoSendApprovals(baseDir: string) {
  const approvals = await listApprovals(baseDir);
  const rows: StartupAutoApproval[] = [];

  for (const approval of approvals) {
    const autoSendEligible =
      approval.status === "pending" &&
      approval.message.includes("мог оборваться на рестарте") &&
      approval.sessionKey === "agent:main:telegram:direct:759328425";

    rows.push({
      ...approval,
      autoSendEligible,
    });
  }

  return rows.filter((row) => row.autoSendEligible);
}

export async function markStartupApprovalSent(baseDir: string, approvalId: string) {
  const approvals = await listApprovals(baseDir);
  const approval = approvals.find((row) => row.approvalId === approvalId);
  if (!approval) return null;
  approval.status = "sent";
  await saveApproval(baseDir, approval);
  return approval;
}
