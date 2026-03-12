# Operator Workflow

## Goal

Provide a safe human-in-the-loop workflow for recovery delivery.

This project is intentionally designed so recovery sends can be previewed and approved before they are actually delivered to the user.

## Recommended mode

Use **manual approved recovery mode** as the default.

That means:
- detect automatically
- reconcile automatically
- preview manually
- confirm manually
- send manually through a trusted message path

### Exception: safe startup follow-ups

A very narrow class of known incidents can prepare a startup follow-up automatically after restart, for example:
- `gateway-restart-interrupt`

For these cases the preferred message should include both:
- recovery acknowledgement
- current resume status

Example:
- "Похоже, прошлый шаг мог оборваться на рестарте. Перепроверил: gateway уже поднялся, task-guard снова загрузился, startup reconcile отработал. Продолжаю с текущего места."

## Workflow

### 0. For planned risky restarts, create an incident marker first

For a gateway restart that may interrupt the current run:

```bash
node hooks/task-guard/scripts/guarded-gateway-restart.mjs /root/.openclaw/workspace agent:main:telegram:direct:759328425
openclaw gateway restart
```

This ensures startup follow-up logic can recover the interruption with a known safe resume-status message.

### 1. Reconcile stale tasks

Run the reconcile script to move open stale tasks forward:

```bash
node hooks/task-guard/scripts/reconcile.mjs /root/.openclaw/workspace
```

### 2. Inspect recovery candidates

Generate recovery candidates:

```bash
node hooks/task-guard/scripts/recovery-dry-run.mjs /root/.openclaw/workspace
```

### 3. Evaluate safe-send policy

Check whether any candidate is safe for one-shot recovery:

```bash
node hooks/task-guard/scripts/recovery-policy-dry-run.mjs /root/.openclaw/workspace
```

### 4. Create approvals

Create preview approvals for allowed candidates:

```bash
node hooks/task-guard/scripts/recovery-preview.mjs /root/.openclaw/workspace
```

This writes approval files under:

```text
state/task-guard/approvals/
```

### 5. Confirm a recovery send

Once an operator decides to send a recovery message, confirm the approval.

Generic confirm path:

```bash
node hooks/task-guard/scripts/recovery-confirm-send.mjs /root/.openclaw/workspace <approvalId> --dry-run
```

Message-bridge helper path:

```bash
node hooks/task-guard/scripts/recovery-confirm-send-via-message.mjs /root/.openclaw/workspace <approvalId> telegram 759328425
```

## Approval lifecycle

Each approval has:
- `approvalId`
- `taskId`
- `sessionKey`
- `message`
- `createdAt`
- `expiresAt`
- `status`

Possible statuses:
- `pending`
- `sent`
- `cancelled`
- `expired`

## Safety rules

- Do not auto-send by default.
- Do not send if `attemptCount > 0` unless you intentionally override policy.
- Do not send expired approvals.
- Prefer a real channel send path with clear observability.
- Keep recovery messages short and factual.

## Recommended human review before sending

Check:
- Is the task actually stale?
- Is the generated recovery message still true?
- Would the send confuse the user if they already got a reply another way?
- Is this the first recovery attempt?

## After successful recovery

On successful confirm/send, the system should:
- mark approval as `sent`
- mark task as `recovered`
- close the task
- clear the open-session index entry
