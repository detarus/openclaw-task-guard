# Auto Startup Follow-up

## Recommended runtime wiring

Use a two-step startup path:

1. `task-guard` startup hook prepares safe startup approvals for known incidents
2. a post-start system event triggers a normal OpenClaw heartbeat/agent turn
3. the heartbeat checks for startup auto-followup approvals and sends them through the trusted runtime path

This is more reliable than trying to push a user-visible send directly out of a thin systemd tail.

## Why this is better

- the startup hook keeps durable state and approvals inside the workspace
- the heartbeat turn runs inside the normal OpenClaw runtime/tool environment
- sending happens through the same trusted agent path used for normal message delivery

## Suggested post-start wrapper

A lightweight post-start script can do only this:

```bash
openclaw system event --text "Process startup auto-followups from task-guard approvals and continue any safe known restart recovery." --mode now
```

## Heartbeat responsibility

The heartbeat should:
- look for startup auto-followup approvals
- run `send-startup-auto-approvals.mjs`
- avoid duplicate sends
- only add an extra continuation message if the recovery send alone is not enough
