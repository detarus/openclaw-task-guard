# Auto Startup Follow-up

## What already works

On `gateway:startup`, `task-guard` can already:
- detect pending known incidents
- reconcile current task state
- create a one-shot approval with a safe resume-status message

For `gateway-restart-interrupt`, the approval text now includes:
- interruption acknowledgement
- current verified status
- continuation cue

Example:

> Похоже, прошлый шаг мог оборваться на рестарте. Перепроверил: gateway уже поднялся, task-guard снова загрузился, startup reconcile отработал. Продолжаю с текущего места.

## Why auto-send is not fully inside the hook yet

The workspace hook runtime can prepare durable state and approvals, but it does not directly own the same safe operator messaging surface as the outer OpenClaw agent/tool environment.

In practice, this means:
- startup hook can prepare a safe approval automatically
- a send bridge still needs to deliver it through a trusted path such as OpenClaw `message.send`

## Recommended wiring

Use this two-part chain:

1. `task-guard` startup hook creates a safe startup approval
2. a local operator bridge picks up eligible approvals and sends them through OpenClaw messaging

## Intended bridge behavior

Only auto-send when all are true:
- approval is `pending`
- approval came from a known safe startup incident
- one-shot limit not exceeded
- target session/channel is explicitly allowlisted

## Current repository support

Current repo already contains:
- incident journal
- startup incident -> approval conversion
- startup auto-send eligibility helper
- real message bridge validation through Telegram

The remaining step is environment-specific wiring between the eligible startup approval and the trusted send surface.
