# Restart Recovery

## Canonical path

For `gateway restart` recovery, the canonical path is now:

1. create a direct restart-recovery marker before restart
2. restart the gateway
3. systemd `ExecStartPost` runs a post-start script
4. the post-start script waits for gateway readiness
5. the post-start script reads pending restart-recovery markers
6. it sends the recovery message through `openclaw message send`
7. the marker is marked `sent`

## Why this path is canonical

This path is simpler and more stable than routing restart recovery through the broader approval/reconcile pipeline.

It avoids extra moving parts for a narrow, known-safe case:
- no approval generation required
- no heartbeat dependency required
- no extra runtime wake-up chain required

## Scope

This path currently targets direct Telegram chat recovery for the main session.

## Current guarantee

If a restart-recovery marker exists before `gateway restart`, the post-start bridge will attempt a one-shot recovery send after startup and mark the marker as `sent` on success.
