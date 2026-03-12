# Task Continuation Plan

## Goal

Make interrupted work resumable after restart or other known interruptions.

This is the next layer after communication recovery.

Current restart-recovery can already restore the conversation by sending a resume-status message.
Task continuation should go further and restore the execution path itself.

## Scope

### In scope

- resumable execution for known, structured, multi-step tasks
- restart-safe checkpoints
- explicit next-step tracking
- verification-before-resume
- continuation after `gateway restart`

### Out of scope for first version

- arbitrary shell continuation for every possible command
- fully semantic recovery of any unstructured run
- replay of unsafe or non-idempotent side effects without operator guardrails

## Core idea

For continuation, a task needs more than lifecycle state.
It needs resumable execution state.

Each resumable task should track:

- `continuationId`
- `taskId`
- `sessionKey`
- `goal`
- `currentStep`
- `completedSteps`
- `nextStep`
- `verifyCommand`
- `resumeStatus`
- `canResume`
- `status`

## First implementation target

The first implementation should support a narrow, explicit checkpoint model:

1. create continuation record
2. update current and next step during work
3. on interruption, detect pending continuation
4. verify current state
5. resume from `nextStep`

## Suggested states

- `active`
- `interrupted`
- `ready_to_resume`
- `resuming`
- `completed`
- `abandoned`

## First practical use case

Use `gateway restart` as the first continuation-aware case:

- before restart, store continuation marker with `nextStep`
- after restart, verify gateway status
- send resume-status
- continue the next scripted step automatically or via controlled resume path

## Design principle

Keep continuation explicit and checkpoint-based.
Do not pretend to recover arbitrary execution from thin air.
