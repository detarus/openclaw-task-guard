# State Machine

## Goal

Describe how `task-guard` moves a task from a normal open state into confirmation and recovery states.

## States

### Task state

- `open`
- `closed`
- `orphaned`
- `error`

### Task phase

- `received`
- `working`
- `awaiting_reply`
- `awaiting_confirmation`
- `reply_sent`
- `recovery_pending`
- `recovered`

## Normal flow

1. inbound message arrives
2. hook opens or refreshes the task
3. task remains `open`
4. task phase moves toward `awaiting_reply`
5. if a reliable outbound close signal exists, task becomes:
   - `state = closed`
   - `phase = reply_sent`

## Stale flow

If the task remains open too long:

- `awaiting_reply` -> `awaiting_confirmation`

This means:
- work likely happened
- a final user-facing update may be missing
- recovery may be needed soon

If the task remains unresolved even longer:

- `awaiting_confirmation` -> `recovery_pending`

This means:
- the task is now a recovery candidate
- policy can decide whether a recovery send is safe

## Recovery flow

1. recovery candidate is generated
2. policy checks:
   - correct phase
   - enough age
   - no duplicate attempt recorded
3. preview flow creates a pending approval
4. operator confirms the recovery send
5. on success:
   - approval -> `sent`
   - task -> `recovered`
   - task state -> `closed`

## Why `message:sent` is not enough

`message:sent` is treated as a strong completion signal, but not the only one.

Some reply paths may skip the internal `message:sent` hook when no reliable session key is available for internal hook correlation.

Because of that, `task-guard` relies on:
- durable journaling
- reconcile heuristics
- approval-based recovery
instead of depending on a single outbound event.
