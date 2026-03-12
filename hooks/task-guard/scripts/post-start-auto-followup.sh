#!/usr/bin/env bash
set -euo pipefail

# Let the gateway finish startup, create task-guard approvals if needed,
# then trigger an immediate heartbeat/system turn inside OpenClaw.
sleep 4
openclaw system event --text "Process startup auto-followups from task-guard approvals and continue any safe known restart recovery." --mode now || true
