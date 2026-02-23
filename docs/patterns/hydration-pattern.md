# Hydration Pattern

**Introduced in: Stage 7 (HITL Bounce-Back + Persistence)**

---

## What It Is

The hydration pattern extends the spec file from a plan-and-audit-trail into a full orchestration state store. After each significant state change, the orchestrator writes a `## Hydration Checkpoint` section to the spec file. This checkpoint captures the complete runtime state: wave position, agent sessions, retry counters, bounce history, and routing flags.

When an orchestration is interrupted (context limit, process kill, network failure, or deliberate pause at a bounce-back), the full state can be restored from the checkpoint. Passing `--resume <spec-path>` to `/orchestrate` hydrates the state and resumes from exactly the right point -- the same wave, the same task, with the same retry counters.

```
Fresh start:
  Orchestrator -> writes spec -> writes initial checkpoint
      |
      v
  Wave 1 execution:
    - Before builder dispatch: writes checkpoint (agentId)
    - After bounce detected: writes checkpoint (bounce_history entry)
    - After bounce resolved: writes checkpoint (resolution recorded)
    - After PASS verdict: writes checkpoint (task completed)
    - After wave: writes checkpoint (current_wave incremented)
      |
      v
  Wave 2, 3 ... N: same pattern

  Final: writes checkpoint (status: completed or aborted)

Resume:
  /orchestrate --resume specs/rest-api.md
      |
      v
  Read checkpoint -> restore state -> jump to Wave N at restored position
```

The checkpoint is NOT a log -- it is overwritten each time with the complete current state. It is a point-in-time snapshot, not an event stream.

---

## How We Use It Here

### Checkpoint Structure

The checkpoint lives in a fenced YAML block under `## Hydration Checkpoint` in the spec file:

```yaml
orchestration_id: orch-1740312600000
team: engineering
current_wave: 2
status: in-progress
agent_sessions:
  implement-get-users: agent-abc123
  implement-post-users: null
retry_state:
  implement-get-users: { attempts: 1, last_verdict: "FAIL" }
bounce_history:
  - task_id: add-user-module
    trigger: conflicting-requirements
    context: "conflicts with the existing functional pattern"
    resolution: "proceed-with-guidance"
codex_available: false
sequential_mode: true
timestamp: 2026-02-23T14:30:00Z
```

Each field is designed for complete, independent restoration:

| Field | Restored As |
|-------|------------|
| `orchestration_id` | Threaded through all subsequent emit calls |
| `team` | Team profile re-loaded if different from current `--team` flag |
| `current_wave` | Lower waves skipped; resume from this wave number |
| `status` | If `completed` or `aborted`, inform user and stop |
| `agent_sessions` | `in_progress` tasks use stored agentId in `resume:` dispatch field |
| `retry_state` | Attempt counters restored to enforce 3-retry cap correctly |
| `bounce_history` | Tasks with `resolution: null` re-presented immediately |
| `codex_available` | Routing decisions preserved (avoids codex flip mid-run) |
| `sequential_mode` | Always true for Stage 7 (Stage 8 adds parallel) |

### Write Triggers

The orchestrator writes the checkpoint after:

1. Initial spec file creation (status: in-progress, wave: 1)
2. Each builder dispatch (agent_sessions updated)
3. Each bounce detection (bounce_history entry added, resolution: null)
4. Each bounce resolution (bounce_history entry updated with resolution)
5. Each PASS verdict with task completion
6. Each retry start (retry_state incremented)
7. Each wave completion (current_wave incremented)
8. Final completion or abort (status: completed | aborted)

### Idempotent Resume

A resumed run must produce the same outcome as if it had never been interrupted. This requires:

- **Completed tasks are never re-executed.** The idempotency check reads `Status` from the Task Graph table before dispatching.
- **Retry counters are preserved.** A task that failed twice before interruption does not get 3 fresh retries on resume.
- **Agent sessions are restored.** The builder can be resumed with its previous context rather than starting cold.
- **Bounced tasks are re-presented.** If a bounce had no resolution when the run was interrupted, the user is asked to resolve it before any new tasks are dispatched.
- **Routing flags are frozen.** If Codex was available in the original run, the resumed run uses the same availability -- prevents routing inconsistency if Codex is installed/uninstalled between runs.

---

## Why This Matters

### Context Compaction Kills Long Runs

Claude Code's context window is finite. In long multi-wave orchestrations, context compaction silently evicts older content. Without hydration checkpoints, an interrupted run has no recovery path -- the orchestration must restart from scratch, re-running all completed tasks.

With hydration checkpoints, an interrupted run resumes from the exact failure point. Completed work is preserved. The spec file on disk is the durable record that outlasts any context window limit.

### HITL Bounce-Back Requires Persistence

When the orchestrator detects a bounce trigger, it pauses and waits for the user. The user may respond immediately, or may need time to think (check other files, consult a colleague, come back the next day). The checkpoint captures the bounced state so the orchestration can be resumed -- potentially in a new Claude Code session -- without losing context.

Without hydration, a bounce-back that spans sessions would require the user to rebuild all context and restart the orchestration. With hydration, `--resume specs/<name>.md` restores everything.

### Cross-Session Resume

The `--resume` flag makes orchestration resumable across Claude Code sessions -- not just within a single conversation. The spec file is a persistent artifact. Any session that can read the spec file can resume the orchestration. This enables:

- Long multi-hour orchestrations that span multiple work sessions
- Orchestrations paused deliberately for human review (bounce-back)
- Recovery from crashes, timeouts, or API errors

---

## Where It Comes From

**Temporal workflow state:** Temporal workflows persist to a durable event log so that a workflow can resume after any failure, including machine crashes. The hydration checkpoint is the lightweight equivalent -- a single-file snapshot instead of a distributed event log.

**Redux state serialization:** Redux DevTools allows time-travel debugging by serializing the complete Redux store to JSON. The hydration checkpoint is the same concept applied to orchestration state: serialize the complete runtime state to a persistent file.

**Kubernetes pod restart policies:** When a Kubernetes pod crashes, Kubernetes restarts it and the application re-reads its state from a persistent volume. The `--resume` flag is the analogous mechanism -- re-launch the orchestrator, point it at the spec file, and it recovers from exactly where it stopped.

**Incremental compilation:** Build tools like Babel and tsc track which files were compiled in a cache file. Subsequent builds skip unchanged files. The hydration checkpoint's idempotency check (skip `completed` tasks) is the same optimization applied to agent dispatch.

---

## Source Anchors

Stage 7 proof:
- `orchestration/7-hitl:.claude/skills/orchestrator/SKILL.md` -- Step 6 (initial checkpoint), Step 10 (checkpoint writes throughout execution), Step 1 (hydration algorithm on `--resume`)
- `orchestration/7-hitl:.claude/skills/orchestrator/references/hitl-protocol.md` -- Hydration checkpoint integration and resume protocol details

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/spec-as-source-of-truth.md`](spec-as-source-of-truth.md) | Foundation: spec file as plan and audit trail (Stage 2) |
| [`docs/patterns/hitl-protocol.md`](hitl-protocol.md) | Bounce-back protocol that relies on hydration for persistence |
| [`docs/patterns/retry-with-resume.md`](retry-with-resume.md) | Agent-level resume (distinct from orchestration-level resume) |
| [`.claude/skills/orchestrator/references/hitl-protocol.md`](../../.claude/skills/orchestrator/references/hitl-protocol.md) | Resume protocol steps, checkpoint field definitions |
