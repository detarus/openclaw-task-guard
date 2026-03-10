# Task Guard Plan

## Goal

Make OpenClaw reliably detect and recover from cases where work happened but the user never received the intended final status message.

This specifically targets failures like:

- shell command interrupted by gateway restart
- long-running exec/browser task completed but no final reply was sent
- agent finished internal work but forgot to summarize outcome
- outbound reply path failed or was never reached
- session was left in a half-finished state after crash/reboot/restart

---

## Chosen Architecture

Use a **three-layer design**:

1. **Hook-based task journal**
   - Record task lifecycle facts on disk.
   - Primary source of truth for in-flight vs closed tasks.

2. **Watchdog / reconciler**
   - Periodically scan for orphaned or half-closed tasks.
   - Detect "work happened, reply missing" situations.

3. **Behavior skill**
   - Teach the agent to explicitly close tasks after risky or multi-step work.
   - Reduce the number of orphaned tasks in the first place.

Completion should be considered **strongly confirmed** after an outbound message is actually sent.
The strongest signal available is the `message:sent` hook event, but in practice it must be treated as a **best-effort strong signal**, not the only closure mechanism, because some outbound reply paths may skip the internal `message:sent` hook when no `sessionKeyForInternalHooks` is available.

---

## Why This Architecture

### Why not skill-only?

A skill improves agent behavior but does not protect against:

- runtime restarts
- shell/session interruption
- message-send failures
- crashes between "task done" and reply delivery

### Why not hook-only?

Hooks can detect missing closure, but without a behavior pattern the agent will keep producing messy endings and force the watchdog to do too much cleanup.

### Why not force all replies through a custom message-send layer?

That is more invasive, easier to misroute, and increases duplicate-message risk.
Use `message:sent` as a confirmation signal, not as the only response path.

---

## Reliability Principle

A task is **not done** when tools finish.
A task is **done** when:

- the work outcome is known enough to report, and
- a user-visible final message was successfully sent, and
- the task journal was marked closed.

---

## Scope

### In scope

- direct chat sessions
- multi-step tasks involving `exec`, `process`, `browser`, `web_search`, `web_fetch`, file edits
- gateway restarts during active work
- background command completion without follow-up summary
- missed or forgotten final user update

### Out of scope for MVP

- perfect semantic detection of whether a message was truly the “best” final answer
- exact per-tool correlation for every internal agent action
- provider-specific guarantees beyond OpenClaw event visibility
- deduplicating every possible edge case across all channels from day one

---

## Core Signals Available in OpenClaw

From docs/local inspection, these are the most useful signals:

### Message lifecycle

- `message:received`
- `message:transcribed`
- `message:preprocessed`
- `message:sent`

Most important:

- `message:received` opens task scope
- `message:sent` confirms successful outbound delivery

### Session durability

- session transcripts on disk:
  - `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`
- session index:
  - `~/.openclaw/agents/<agentId>/sessions/sessions.json`

### Background execution

- `exec` + `process` support long-running commands
- `tools.exec.notifyOnExit` can surface completion events

### Existing limits

- background exec state is not durable across process restart
- hook/event processing may observe sends, but internal agent intent is not enough by itself

---

## Failure Modes to Handle

### FM-1: Shell interrupted after doing real work
Example:
- config updated
- gateway restarted
- current shell aborted
- no user summary sent

Expected recovery:
- watchdog sees open task with no `reply_sent`
- next check emits compact recovery status or queues one

### FM-2: Browser/exec failed after multiple attempts
Example:
- retries happened
- user never got concise final result

Expected recovery:
- task remains open until status message is sent
- reconciler flags stale `awaiting_reply`

### FM-3: Agent forgot to close task conversationally
Example:
- all work done
- no “done / failed / next step” summary

Expected recovery:
- skill reduces occurrence
- watchdog catches leftovers

### FM-4: Gateway or process restart mid-task
Expected recovery:
- task journal survives restart
- orphan scan runs on startup or next event

### FM-5: Outbound message send failed
Expected recovery:
- no `message:sent` confirmation
- task remains open
- retry or recovery flow can occur later

---

## Data Model

Store task state durably in workspace.

Recommended path:

- `workspace/state/task-guard/tasks/<taskId>.json`
- `workspace/state/task-guard/index.json`
- `workspace/state/task-guard/events.jsonl` (optional, phase 2)

### Task record

```json
{
  "taskId": "tg_20260310_abcdef",
  "sessionKey": "agent:main:telegram:direct:759328425",
  "agentId": "main",
  "channel": "telegram",
  "conversationId": "telegram:759328425",
  "messageId": "75",
  "openedAt": "2026-03-10T19:54:00Z",
  "updatedAt": "2026-03-10T19:54:05Z",
  "state": "open",
  "phase": "awaiting_reply",
  "userText": "да, делаем оба пункта",
  "workDetected": true,
  "lastWorkAt": "2026-03-10T19:54:20Z",
  "replySentAt": null,
  "closedAt": null,
  "recovery": {
    "needed": false,
    "attemptedAt": null,
    "attemptCount": 0
  },
  "summary": null,
  "tags": ["planning", "task-guard"]
}
```

### State machine

Primary states:

- `open`
- `closed`
- `orphaned`
- `error`

Primary phases:

- `received`
- `working`
- `awaiting_reply`
- `awaiting_confirmation`
- `reply_sent`
- `recovery_pending`
- `recovered`

---

## Task Correlation Strategy

For MVP, correlate by:

- `sessionKey`
- recent inbound message window
- channel/conversation identifiers

Practical rule:

- the latest inbound user message opens or refreshes the active task for that session
- a successful outbound assistant message closes the current open task unless explicitly marked otherwise

This is intentionally simple for stability.

Phase 2 can add richer matching (message IDs, tool phase, structured correlation IDs).

---

## Hook Design

## Hook 1: `task-open`

Trigger on:

- `message:received` or `message:preprocessed`

Responsibilities:

- create/open task for session
- store inbound metadata
- mark phase `received`
- roll forward any stale orphan logic if needed

Prefer `message:preprocessed` if we want the enriched text body.
Use `message:received` if we need earliest visibility.

### Hook 2: `task-close`

Trigger on:

- `message:sent`

Responsibilities:

- find open task for this session/channel
- mark `replySentAt`
- mark phase `reply_sent`
- close task

### Hook 3: optional `task-work-mark`

If plugin/tool hooks are practical later, mark when meaningful work happened:

- exec started / finished
- browser action happened
- file write/edit happened

For MVP, this can be approximated by agent behavior and timestamps instead of deep tool instrumentation.

---

## Watchdog / Reconciler Design

### Purpose

Find tasks that look abandoned or incompletely closed.

### Trigger options

Priority order:

1. startup run (`gateway:startup` hook)
2. periodic cron/heartbeat check
3. run opportunistically on new inbound messages

### Detection heuristics (MVP)

Mark task suspicious when all are true:

- state is `open`
- phase is not `reply_sent`
- age > threshold (for example 45s or 90s)
- there is evidence of work or long-running activity

Mark task orphaned when additionally:

- no `message:sent` was seen
- session appears idle / prior command finished / process disappeared / enough time passed

### Recovery actions

Order from safest to most aggressive:

1. mark `recovery_pending`
2. append structured note to task file
3. if a reply appears to have been generated but `message:sent` was never observed, move task to `awaiting_confirmation` instead of assuming hard failure
4. on next user interaction, force a reconciliation summary
5. optional automatic fallback outbound message:
   - “Похоже, прошлый шаг мог оборваться. Короткий итог: …”

For MVP, prefer **conservative recovery**:
- detect and mark first
- treat `message:sent` as strong confirmation when present
- allow a fallback `awaiting_confirmation` state when outbound hook confirmation is missing
- auto-send only in clearly tool-heavy sessions or after restart interruption patterns

---

## Agent Skill Design

Skill purpose:

Teach the agent to explicitly close risky tasks with a concise status.

Suggested skill name:

- `task-closure-guard`

Suggested trigger description:

- Use when performing multi-step work, restarts, browser automation, package installs, long-running shell commands, config edits, or any task where the final user-facing status could be missed after an interruption.

### Required behavior rules inside the skill

After risky work, always send a compact closure block:

- what changed
- current result
- whether anything failed
- what remains

If a shell command was interrupted by restart or process loss:

- do not assume outcome
- run a fresh status check
- then send the summary

Never leave a task after tool activity without either:

- a final user update, or
- an explicit statement that more checking is in progress

### Preferred reply pattern

Use a short format like:

- Done:
- Failed/blocked:
- Current status:
- Next step:

This reduces omission risk and is easy for the watchdog to reason about.

---

## Recovery Message Policy

Auto-recovery messages must be:

- short
- non-alarming
- idempotent-friendly
- explicit that they are a recovery/follow-up

Examples:

- “Похоже, прошлый шаг мог оборваться. Проверил статус: gateway жив, browser поднят.”
- “Похоже, ответ в прошлый раз не дошёл. Короткий итог: ключ записан, поиск работает.”

Avoid sending long repeated summaries automatically.

---

## Phased Implementation Plan

## Phase 1 — design + scaffolding

Deliverables:

- this plan
- choose file layout
- define task schema
- define threshold defaults

### Phase 2 — MVP hook pack

Deliverables:

- workspace hook pack `task-guard`
- open task on inbound message
- close task on outbound message sent
- persist task files
- orphan scan on startup / manual run

Success criteria:

- can see open vs closed tasks on disk
- restart does not erase task state

### Phase 3 — watchdog

Deliverables:

- reconciler script
- stale-task detection
- orphan marking
- optional dry-run report mode

Success criteria:

- detect at least the real failure pattern observed in this session

### Phase 4 — skill

Deliverables:

- `task-closure-guard` skill
- concise closure instructions
- explicit restart/interrupt recovery rules

Success criteria:

- lower rate of orphaned tasks even before watchdog triggers

### Phase 5 — auto-recovery

Deliverables:

- optional outbound fallback on clear orphan cases
- cooldown/dedup protection

Success criteria:

- no silent task drops in common restart/install/browser flows

---

## Testing Plan

### Test 1: gateway restart during config change

1. open task
2. edit config
3. restart gateway
4. interrupt command path
5. verify task remains open
6. run reconciler
7. verify recovery summary is emitted or marked pending

### Test 2: browser start failure

1. start browser with bad config
2. command fails
3. ensure final status still closes task

### Test 3: successful long-running install

1. run backgrounded install
2. completion occurs
3. ensure final summary sent and task closes

### Test 4: simulated message-send miss

1. create task
2. do work
3. suppress close event in test harness
4. ensure reconciler flags orphan

### Test 5: duplicate protection

1. orphan detected
2. recovery attempted once
3. repeated scan should not spam user

---

## Operational Guardrails

- Keep recovery throttled per session
- Prefer marking before auto-sending
- Keep all task files small and append-friendly
- Make every recovery action auditable from disk
- Make reconciler idempotent
- Do not rely on volatile exec/process memory as sole truth

---

## Risks

### False positives

A task may be considered orphaned when the assistant was intentionally silent.

Mitigation:
- only apply watchdog to sessions with actual work signals or risky patterns
- allow silence for obvious no-op turns

### False negatives

A weak heuristic might miss a dropped response.

Mitigation:
- combine journal + transcript + message:sent signal
- improve heuristics iteratively from real cases

### Duplicate recovery messages

Mitigation:
- store recovery attempts in task file
- cooldown window
- require no successful `message:sent` after last attempt

---

## Recommended File Layout

```text
workspace/
  docs/
    task-guard-plan.md
  hooks/
    task-guard/
      package.json
      hooks/
        task-open.ts
        task-close.ts
        gateway-startup-reconcile.ts
      lib/
        state.ts
        reconcile.ts
  skills/
    task-closure-guard/
      SKILL.md
      references/
        reply-patterns.md
  state/
    task-guard/
      index.json
      tasks/
```

---

## Recommended Next Step

Implement **Phase 2 (MVP hook pack)** first.

That gives the biggest reliability gain with the least speculative logic.
After that, add the skill so the agent naturally produces cleaner closure behavior.

---

## Decision Summary

Chosen target architecture:

- **Hook-based durable task journal**
- **Watchdog/reconciler for orphan detection**
- **Skill for explicit task closure discipline**
- **`message:sent` as the primary completion confirmation signal**

This is the most reliable and stable approach because it does not trust model intent alone and does not depend only on volatile runtime state.
