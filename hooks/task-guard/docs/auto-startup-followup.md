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

A lightweight post-start script should:

```bash
# 1. wait until gateway status is healthy
# 2. wait until startup approvals exist (if any)
# 3. run send-startup-auto-approvals.mjs
```

This avoids racing the gateway startup sequence or firing before `task-guard` has created the approval.

## Post-start responsibility

The post-start bridge should:
- wait for gateway readiness
- wait for startup auto-followup approvals
- run `send-startup-auto-approvals.mjs`
- avoid duplicate sends
- only add an extra continuation message if the recovery send alone is not enough
