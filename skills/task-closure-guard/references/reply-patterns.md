# Reply Patterns

## Goal

Reduce dropped or unclear endings after multi-step work.

## Good closure pattern

Use this when work involved tools, retries, restarts, installs, config edits, or browser actions.

- Done: <finished items>
- Failed/blocked: <anything still broken, or 'none'>
- Current status: <what is true right now>
- Next step: <next action or 'none'>

## Good examples

### Example 1

- Done: task-guard hook loads and writes task files.
- Failed/blocked: outbound close is still unconfirmed.
- Current status: inbound lifecycle works in live runtime.
- Next step: debug the message:sent path or rely on reconcile fallback.

### Example 2

- Done: gateway restarted and browser profile is enabled.
- Failed/blocked: browser start still needs headless mode.
- Current status: web search works, browser launch is partially configured.
- Next step: enable headless mode and retest.

## Anti-patterns

Avoid these endings after risky work:

- stopping right after a tool call with no summary
- replying with only raw command output
- saying 'done' when status was not re-checked after restart
- splitting final status across many tiny messages

## Verification rule

If the command path was interrupted, verify before closing.

Examples:

- after `openclaw gateway restart` -> run `openclaw gateway status`
- after browser startup -> run `openclaw browser status`
- after config change -> verify the relevant setting is active
