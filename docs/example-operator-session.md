# Example Operator Session

## Goal

Show a minimal operator flow from stale task detection to approved recovery send.

## Example

### 1. Reconcile stale tasks

```bash
node hooks/task-guard/scripts/reconcile.mjs /root/.openclaw/workspace
```

### 2. Inspect recovery candidates

```bash
node hooks/task-guard/scripts/recovery-dry-run.mjs /root/.openclaw/workspace
```

### 3. Check policy

```bash
node hooks/task-guard/scripts/recovery-policy-dry-run.mjs /root/.openclaw/workspace
```

### 4. Create approvals

```bash
node hooks/task-guard/scripts/recovery-preview.mjs /root/.openclaw/workspace
```

### 5. Confirm a recovery send

```bash
node hooks/task-guard/scripts/recovery-confirm-send.mjs /root/.openclaw/workspace <approvalId> --dry-run
```

### 6. Real operator-driven message send

Use a trusted OpenClaw send path, for example a manual `message.send`, then confirm and close the task through the approval flow.

## Expected result

After successful recovery:
- approval status becomes `sent`
- task phase becomes `recovered`
- task state becomes `closed`
- open-session index entry is cleared
