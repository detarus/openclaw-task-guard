# openclaw-task-guard

Fixes a common OpenClaw reliability problem where Telegram, WhatsApp, or Discord users do not receive the final status of a completed task, or the agent gets interrupted mid-run and never sends the closing update.

`openclaw-task-guard` adds a durable task journal, reconciliation logic, recovery approval flow, and a companion closure skill so interrupted work can be detected and recovered safely.

## What problem this solves

OpenClaw can successfully do real work and still fail to deliver the final user-facing status update.

Typical failure modes:

- a shell command is interrupted by `openclaw gateway restart`
- browser or exec workflows fail mid-run and the user gets no concise wrap-up
- the agent finishes internal work but forgets to send the closing message
- the outbound reply path does not emit a reliable close signal for the active session
- a task is left half-finished after crash, reboot, or process interruption

## Current status

This repository already contains a usable first operator-driven version:

- workspace hook for durable inbound task journaling
- startup + inbound reconciliation
- task state transitions:
  - `awaiting_reply`
  - `awaiting_confirmation`
  - `recovery_pending`
  - `recovered`
- recovery candidate generation
- safe one-shot recovery policy with dedup protection
- approval preview flow
- approval confirm-and-close flow
- real delivery bridge validated with Telegram via OpenClaw `message.send`
- incident-based startup follow-up preparation for known restart interruption scenarios
- companion skill: `task-closure-guard`

## Architecture

The project uses three layers:

1. **Hook-based task journal**
   - Persist task lifecycle state to disk.
   - Track inbound task start and refresh.

2. **Reconciler / recovery pipeline**
   - Detect stale open tasks.
   - Move them through confirmation and recovery phases.
   - Generate safe recovery candidates.

3. **Closure behavior skill**
   - Encourage compact final user-facing summaries after risky work.
   - Reduce the number of orphaned tasks in the first place.

## Repository layout

```text
.
├── docs/
│   ├── operator-workflow.md
│   ├── state-machine.md
│   └── task-guard-plan.md
├── hooks/
│   └── task-guard/
│       ├── handler.ts
│       ├── lib/
│       └── scripts/
├── skills/
│   └── task-closure-guard/
└── README.md
```

## Hook package overview

### `hooks/task-guard/handler.ts`
Main internal hook entrypoint.

Listens to:
- `message:preprocessed`
- `message:sent`
- `gateway:startup`

Responsibilities:
- open or refresh task state on inbound messages
- reconcile stale tasks on startup and inbound turns
- close tasks when a reliable outbound close event is available

### `hooks/task-guard/lib/state.ts`
Durable task state helpers.

Responsibilities:
- generate task ids
- persist task files
- persist open-session index
- resolve workspace-local state directories

### `hooks/task-guard/lib/reconcile.ts`
State machine transition logic for stale open tasks.

Responsibilities:
- move `awaiting_reply` -> `awaiting_confirmation`
- move `awaiting_confirmation` -> `recovery_pending`

### `hooks/task-guard/lib/recovery*.ts`
Recovery pipeline pieces.

Responsibilities:
- build recovery candidates
- evaluate safe-send policy
- create preview approvals
- confirm approved recovery sends
- close recovered tasks

## Mini documentation

See:
- `docs/state-machine.md` — lifecycle states and transitions
- `docs/operator-workflow.md` — practical operator workflow for preview / approve / confirm recovery sends
- `docs/example-operator-session.md` — minimal end-to-end operator example
- `docs/known-limitations.md` — current constraints and intentional guardrails
- `docs/task-guard-plan.md` — architecture and implementation notes
- `hooks/task-guard/docs/auto-startup-followup.md` — how startup incident follow-ups are prepared and where real auto-send wiring belongs

## Operator workflow

High-level flow:

1. task opens from inbound message
2. reconciler marks stale task as `awaiting_confirmation`
3. reconciler escalates to `recovery_pending`
4. policy decides whether a recovery send is safe
5. preview flow creates a pending approval
6. operator confirms send
7. recovery message is delivered
8. task is marked `recovered` and closed

## Scripts

Representative scripts in `hooks/task-guard/scripts/`:

- `reconcile.mjs` — run reconcile manually
- `recovery-dry-run.mjs` — show recovery candidates
- `recovery-policy-dry-run.mjs` — evaluate safe-send policy without sending
- `recovery-preview.mjs` — create approval records for allowed recovery candidates
- `recovery-confirm-send.mjs` — confirm an approval using an injected sender
- `recovery-confirm-send-via-message.mjs` — bridge helper for operator-driven message-send workflows
- `manual-recovery-send.mjs` — manual sender scaffold for controlled recovery testing

## Notes on reliability

- `message:sent` is treated as a **strong confirmation signal**, not the only closure signal.
- Some OpenClaw reply paths may skip internal `message:sent` emission when no `sessionKeyForInternalHooks` is available.
- For that reason, task recovery must not depend on one signal alone.

## Companion skill

`skills/task-closure-guard/` teaches the agent to always end risky work with a short closure block:

- Done
- Failed/blocked
- Current status
- Next step

This lowers the number of dropped endings before recovery logic is even needed.

## Current recommendation

Use this project in **manual, approved recovery mode** first.

That means:
- detect stale tasks automatically
- preview recovery candidates
- require explicit approval before recovery delivery
- avoid auto-send until confidence and guardrails are stronger

## Real-world testing checklist

Before testing in a live chat:
- ensure the `task-guard` hook is enabled
- restart the OpenClaw gateway so the latest hook code is loaded
- verify `state/task-guard/` is writable in the workspace
- trigger a normal inbound message and confirm a task file is created
- simulate a stale/recovery case before trying a real approved recovery send
