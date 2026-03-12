#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/root/.openclaw/workspace"
SEND_SCRIPT="$BASE_DIR/hooks/task-guard/scripts/send-startup-auto-approvals.mjs"
APPROVAL_DIR="$BASE_DIR/state/task-guard/approvals"
LOG_TAG="[task-guard post-start]"

# Wait until gateway is actually up.
for _ in $(seq 1 20); do
  if openclaw gateway status >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Wait until startup hooks have had time to create approvals.
for _ in $(seq 1 20); do
  if find "$APPROVAL_DIR" -maxdepth 1 -type f -name '*.json' 2>/dev/null | grep -q .; then
    break
  fi
  sleep 1
done

if [ ! -f "$SEND_SCRIPT" ]; then
  echo "$LOG_TAG sender bridge script missing: $SEND_SCRIPT"
  exit 0
fi

node "$SEND_SCRIPT" "$BASE_DIR" || true
