---
name: task-guard
description: "Track inbound tasks and outbound completion so interrupted runs can be reconciled later. Use for task lifecycle journaling and missing-final-reply detection."
metadata: { "openclaw": { "emoji": "🧷", "events": ["message:preprocessed", "message:sent", "gateway:startup"] } }
---

# Task Guard

Track task lifecycle events on disk so orphaned or half-finished tasks can be detected and reconciled after interruptions, restarts, or missed final replies.
