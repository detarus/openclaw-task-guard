# Known Limitations

## 1. `message:sent` is not always available

Some OpenClaw reply paths may skip the internal `message:sent` hook when no reliable `sessionKeyForInternalHooks` is available.

Implication:
- outbound closure cannot rely on one signal alone
- reconcile + approval recovery remains necessary

## 2. Current recovery summaries are simple

Recovery text is currently built from:
- stored task summary, or
- last known user context, or
- current task phase

Implication:
- recovery messages are intentionally compact, but not yet deeply semantic

## 3. Manual recovery mode is the recommended default

The current implementation is strongest in:
- detection
- classification
- approval-based recovery

Automatic recovery delivery is intentionally not enabled by default.

## 4. Workspace state contains operational history

`state/task-guard/` is designed for inspection and durability.

Implication:
- test/demo runs should be cleaned up periodically
- state files are part of the operator workflow, not disposable temp files
