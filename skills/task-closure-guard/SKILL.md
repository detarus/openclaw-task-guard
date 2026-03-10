---
name: task-closure-guard
description: Improve closure reliability for multi-step OpenClaw work. Use when performing shell commands, package installs, gateway restarts, browser automation, config edits, web research, or any task where the final user-facing status may be forgotten, interrupted, or lost before it is sent. Especially relevant for Telegram, WhatsApp, and Discord conversations where completed work may not be followed by a closing update.
---

# Task Closure Guard

After risky or multi-step work, always end with a compact closure update.

## Use this reply pattern

Write a short final block with these fields when relevant:

- Done:
- Failed/blocked:
- Current status:
- Next step:

Keep it brief. Do not repeat the full work log.

## Apply this skill after

- `exec` or long shell commands
- package installs or service changes
- `openclaw gateway restart`
- browser start/debug flows
- config edits
- any task with retries, restarts, or partial failure risk

## Rules

1. Do not stop after tool output alone.
2. If a restart or shell interruption happened, run a fresh status check before replying.
3. If success is partial, say exactly what is done and what is still missing.
4. If the result is uncertain, say that verification is still in progress instead of silently ending.
5. Prefer one compact final status over multiple fragmented follow-ups.

## Preferred examples

### Successful but interruption-prone task

- Done: Chrome installed, browser profile started.
- Failed/blocked: nothing currently.
- Current status: browser is running and reachable.
- Next step: test page navigation.

### Partial failure

- Done: Gemini key saved, gateway restarted.
- Failed/blocked: browser still missing from host.
- Current status: web search works, browser automation does not yet.
- Next step: install Chromium/Chrome and retry browser startup.

### After restart uncertainty

If a restart interrupted the shell, do not assume the last step succeeded. First verify with a status command, then send the closure block.

## References

- Read `references/reply-patterns.md` for compact closure templates and anti-patterns.
