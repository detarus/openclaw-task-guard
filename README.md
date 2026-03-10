# openclaw-task-guard

Fixes interrupted OpenClaw runs and missing final task updates in Telegram, WhatsApp, and Discord with task journaling, watchdog recovery, and reliable closure patterns.

## Problem

OpenClaw can successfully do work but still fail to deliver the final user-facing status update.

Common failure modes:

- a shell command is interrupted by `gateway restart`
- browser or exec workflows fail mid-run and the user gets no concise wrap-up
- the agent finishes internal work but forgets to send the closing message
- the outbound reply path fails after the task outcome is already known
- a task is left half-finished after crash, reboot, or process interruption

This project is meant to detect and reduce exactly those cases.

## Approach

`openclaw-task-guard` uses three layers:

1. **Hook-based task journal**
   - Persist task lifecycle state to disk.
   - Track inbound task start and outbound completion.

2. **Watchdog / reconciler**
   - Detect orphaned tasks where work happened but no final reply was sent.
   - Recover cleanly after restarts or interrupted runs.

3. **Closure behavior patterns**
   - Encourage explicit, compact final updates after risky or multi-step work.

Primary completion signal:

- `message:sent`

A task is not considered safely complete until an outbound user-visible final message has actually been sent.

## Current status

Current repo state:

- architecture/design doc added
- hook pack scaffold added
- durable task state helper added
- inbound/outbound hook skeleton added
- reconciler and closure skill still in progress

## Repository layout

```text
.
├── docs/
│   └── task-guard-plan.md
├── hooks/
│   └── task-guard/
└── README.md
```

## Next steps

- enable and validate the hook in OpenClaw
- add startup reconciliation
- add orphan detection heuristics
- add a recovery policy
- add a reusable closure skill
