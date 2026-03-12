# Known Limitations

## 1. Restart recovery is currently the strongest recovery path

The most reliable automatic recovery path implemented today is the direct restart-recovery path for `gateway restart`.

More general interrupted-task continuation is not fully solved yet.

## 2. `message:sent` is not always available

Some OpenClaw reply paths may skip the internal `message:sent` hook when no reliable `sessionKeyForInternalHooks` is available.

Implication:
- outbound closure cannot rely on one signal alone
- reconcile + recovery state still matters

## 3. General execution continuation is not done

The system can recover communication/status for restart cases, but it does not yet fully resume arbitrary interrupted execution flows.

## 4. Recovery summaries are intentionally compact

Recovery text is currently short and factual.
It is optimized for safe recovery messaging, not for rich semantic reconstruction of every interrupted task.
