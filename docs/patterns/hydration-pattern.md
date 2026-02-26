# Hydration Pattern

**Introduced in: Stage 7**

---

## What It Is

The Hydration Pattern extends Spec as Source of Truth with explicit state serialization. The spec file gains a Hydration Checkpoint section -- a YAML snapshot of orchestration state written after every state-changing event. On `--resume`, the orchestrator reads the checkpoint, restores state, skips completed tasks, and continues from where it left off.

This enables cross-session orchestration: the user can stop a long-running orchestration (intentionally or due to interruption), return in a new session, and resume without losing completed work. The pattern also enables safe HITL pauses that span session boundaries -- the user can close their terminal after seeing a bounce-back, return later, and the orchestrator re-presents the pending decision.

---

## How We Use It Here

### Checkpoint Structure

The spec file gains a `## Hydration Checkpoint` section appended after every state change:

```yaml
## Hydration Checkpoint

checkpoint_version: 1
timestamp: "2026-02-23T14:30:00Z"
orchestration_id: "rest-api-2026-02-23"
current_wave: 2
completed_tasks:
  - define-user-types
  - implement-get-users
pending_tasks:
  - implement-post-users
  - write-user-route-tests
retry_counts:
  implement-get-users: 1
hitl_decisions:
  - task: implement-post-users
    decision: "use functional approach"
    timestamp: "2026-02-23T13:45:00Z"
team: engineering
flags:
  no_codex: false
```

The most recent checkpoint block is always at the bottom of the section. Each write appends a new block -- the section is an audit trail, not a single record.

### Checkpoint Write Events

A checkpoint is written after every state change:

- After each wave completes
- After each task completes (`VERDICT: PASS`)
- After each HITL decision is recorded
- After resume rehydration (confirming the state was restored correctly)

### Resume Flow

```
/orchestrate --resume specs/rest-api.md
```

1. Parse `--resume` flag and spec file path
2. Route to hydration branch at Step 1 (skip decomposition and plan review)
3. Read the spec file's Hydration Checkpoint section
4. Parse the most recent checkpoint block
5. Restore: current wave, completed tasks, retry counts, HITL decisions, team, flags
6. Emit `orchestration.resumed` with checkpoint metadata
7. Skip all tasks in `completed_tasks`
8. Re-dispatch `in_progress` tasks (interrupted mid-execution)
9. Continue from the current wave

### In-Progress Task Handling

If a task was `in_progress` when the session ended, its files may be partially modified. The correct behavior is re-dispatch (not skip, not treat as complete) -- the builder reads existing files before writing, which handles partial modifications correctly. Treating partially-modified files as complete risks leaving the codebase in an inconsistent state.

---

## Why the Hydration Pattern

### Cross-Session Orchestration

Without hydration, every interruption means starting over. For long-running orchestrations (many tasks, multiple waves), re-running completed tasks is expensive -- both in tokens and in time. Hydration makes completed work permanent.

### HITL Across Sessions

The HITL protocol pauses execution pending a human decision. Without hydration, if the user's session ends before they respond, the orchestration is lost. With hydration, the checkpoint captures the pending HITL state. On resume, the orchestrator re-presents the bounce-back and continues after the user responds.

### Debugging from Known State

Hydration checkpoints are timestamped audit trails. When an orchestration fails, the checkpoint shows exactly what state the orchestrator was in at each step. For debugging, you can resume from a checkpoint at Wave 2 to reproduce a Wave 3 failure without re-running Wave 1 and 2 tasks.

### Separation of Concerns

Hydration separates "what was decided" from "what was executed." The spec file's Task Graph table records the plan. The Execution Log records what happened. The Hydration Checkpoint records the current state. Each section has a single responsibility.

---

## Before and After

**Without hydration:**
- Wave 1 (3 tasks): complete
- Wave 2 (2 tasks): task 1 complete, task 2 running, session ends
- Resume: restart from the beginning, re-run all 3 Wave 1 tasks, re-run Wave 2 task 1

**With hydration:**
- Wave 1 (3 tasks): complete, checkpoint written
- Wave 2 (2 tasks): task 1 complete (checkpoint written), task 2 running, session ends
- Resume: read checkpoint, skip all 4 completed tasks, re-dispatch Wave 2 task 2

---

## Where It Comes From

**Redux-style state persistence:** Redux DevTools and Redux Persist serialize application state to enable time-travel debugging and page-reload recovery. The Hydration Pattern is the same principle applied to orchestration state -- serialize the state store (the orchestrator's knowledge of what has happened) so it can be restored in a new session.

**Database WAL (Write-Ahead Logging):** Databases write state changes to a log before applying them. On crash recovery, the log is replayed to restore consistent state. Hydration checkpoints are the prompt-engineering equivalent -- write state after each change so recovery can restore consistent orchestration state.

**Incremental build systems (Make, Bazel):** Make only re-runs targets whose inputs changed. If a target's output exists and is up to date, it is skipped. The `completed_tasks` list in the hydration checkpoint implements the same skip-if-done logic for orchestration tasks.

**Savepoints in long-running processes:** Video games use save points; distributed sagas use checkpoints. The hydration checkpoint is the orchestration equivalent -- a safe point from which execution can be safely resumed.

---

## Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Cross-session orchestration -- stop and resume without losing progress | Checkpoint writes add latency after every state change |
| HITL decisions survive session boundaries | Spec file grows with each checkpoint append (multiple blocks) |
| Debugging from a known good state | Resume flow adds complexity (branch on `--resume` in Step 1) |
| Completed tasks never re-run on resume | In-progress task re-dispatch may redo partial work that was already correct |

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/spec-as-source-of-truth.md`](spec-as-source-of-truth.md) | The base pattern that hydration extends -- spec file as persistent plan |
| [`docs/patterns/hitl-protocol.md`](hitl-protocol.md) | HITL decisions are serialized in the checkpoint; pending bounce-backs survive session end |
| [`docs/patterns/retry-with-resume.md`](retry-with-resume.md) | retryCount values are serialized in the checkpoint and restored on resume |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | `--resume` parsing in Step 1, checkpoint writes throughout, hydration branch |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 7 overview |
