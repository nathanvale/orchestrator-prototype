---
slug: hydration-pattern
display_name: "Hydration Pattern"
one_liner: "Serialize orchestration state into the spec file as a structured checkpoint, enabling cross-session resume by rehydrating from the checkpoint and skipping completed work."
slots:
  pattern_id: "## Pattern ID"
  quick_summary: "## Quick Summary"
  when_to_use: "## When To Use"
  core_mechanism: "## Core Mechanism"
  key_rules: "## Key Rules"
  implementation_notes: "## Implementation Notes"
  failure_modes: "## Failure Modes"
  signals_diagnostics: "## Signals & Diagnostics"
  tradeoffs: "## Tradeoffs"
  related_patterns: "## Related Patterns"
  source_anchors: "## Source Anchors"
---

## Pattern ID

hydration-pattern

## Quick Summary

The Hydration Pattern extends Spec as Source of Truth with explicit state serialization. The spec file gains a Hydration Checkpoint section -- a YAML snapshot of orchestration state (completed tasks, current wave, retryCount per task, HITL decisions) written after every state-changing event. On `--resume`, the orchestrator reads the checkpoint, restores state, skips completed tasks, and continues from the last checkpoint. This enables cross-session orchestration: the user can stop and restart without losing progress.

## When To Use

- Long-running orchestrations spanning multiple sessions (hours, overnight)
- When the process may be interrupted (user closes terminal, session timeout, Claude Code context limit)
- When HITL bounce-back pauses execution pending user response that may come in a later session
- When partial progress should never be discarded -- completed tasks are expensive to repeat
- When debugging a failing orchestration requires re-running from a known good state

## Core Mechanism

**Checkpoint structure (appended to spec file):**

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

**Checkpoint writes (every state change):**
- After each wave completes
- After each task completes (VERDICT: PASS)
- After each HITL decision is recorded
- After the `--resume` flag is parsed and state is rehydrated

**Resume flow (`--resume specs/<name>.md`):**

1. Parse `--resume` flag and spec file path from the prompt
2. Read the spec file and locate the Hydration Checkpoint section
3. Parse the checkpoint YAML
4. Restore: current wave, completed task list, retryCount per task, HITL decisions, team, flags
5. Emit `orchestration.resumed` with checkpoint metadata
6. Skip all tasks in `completed_tasks`
7. Re-dispatch `in_progress` tasks (prior run was interrupted mid-task)
8. Continue from the current wave

## Key Rules

1. Checkpoint is written after every state change -- not just at wave boundaries.
2. Reading the checkpoint is always the first action in the `--resume` flow -- before any other orchestration logic.
3. Skip `completed_tasks` unconditionally -- never re-dispatch a completed task on resume.
4. Re-dispatch `in_progress` tasks (not skip, not mark complete) -- the prior run was interrupted and may have partially modified files.
5. The checkpoint section is append-only within a run -- each write creates a new checkpoint block with a timestamp. The most recent is authoritative.
6. `orchestration_id` must be unique across runs -- use `<spec-slug>-<date>` convention.

## Implementation Notes

**Checkpoint append strategy:** Each checkpoint write appends a new YAML block to the Hydration Checkpoint section rather than overwriting the previous one. This creates an audit trail of state changes and means the most recent block is always at the bottom. The orchestrator reads the last block on resume.

**In-progress task handling on resume:** If a task was `in_progress` when the session ended, its files may be partially modified. Re-dispatching the builder (not skipping, not treating as complete) is the correct behavior -- the builder reads existing files before writing, which handles partial modifications correctly.

**Interaction with HITL:** When a HITL bounce-back is pending (the orchestrator paused, the user has not responded, the session ended), the resume flow reads the pending HITL state from the checkpoint, re-presents the bounce-back to the user in the new session, and continues after the user responds.

**Context isolation:** The `--resume` flag routes the orchestration into a hydration branch at Step 1. The full decomposition and plan review steps are skipped -- the spec file IS the plan. The orchestrator reads the task graph from the spec, not from re-decomposing the original prompt.

## Failure Modes

- **Checkpoint not written after every state change:** If the process is interrupted between state changes without a checkpoint, resume loses the intermediate work. Checkpoints at wave boundaries only mean up to one wave of re-work.
- **Last checkpoint not found on resume:** If the orchestrator reads the first checkpoint instead of the last (most recent), it may re-run tasks that were completed in later checkpoints.
- **In-progress tasks skipped on resume:** If `in_progress` tasks are treated as `completed` on resume, partially-modified files are not corrected. Subsequent tasks may import broken code.
- **`orchestration_id` collisions:** Two concurrent orchestrations using the same spec file overwrite each other's checkpoints. One resume reads the other's state.

## Signals & Diagnostics

- **Pattern is needed:** Interrupting and resuming an orchestration re-runs completed tasks from the beginning; long-running orchestrations cannot survive a session restart; HITL decisions are lost when the session ends.
- **Pattern is working:** `orchestration.resumed` event fires on `--resume`; task dispatch skips tasks in `completed_tasks`; the checkpoint section in the spec file contains timestamped entries after each state change; retryCount values are restored correctly.
- **Pattern is failing:** Resume re-runs completed tasks; the checkpoint section is missing from the spec file after a mid-run interruption; HITL decisions are re-requested after resume.

## Tradeoffs

**Gain:** Cross-session orchestration becomes possible -- stop and resume without losing progress. HITL pauses can span session boundaries. Debugging is easier -- resume from a known good checkpoint to reproduce a failure.

**Cost:** Checkpoint writes add latency after every state change. The spec file grows with each checkpoint append. The resume flow adds complexity to Step 1 (branch on `--resume` flag presence). `in_progress` task re-dispatch may re-do partial work that was already correct.

## Related Patterns

- **Spec as Source of Truth** -- the spec file that hydration extends with the checkpoint section; the base pattern that makes hydration possible
- **HITL Protocol** -- HITL decisions are persisted in the checkpoint; resume re-presents pending bounce-backs
- **Retry with Resume** -- retryCount values per task are serialized in the checkpoint and restored on resume

## Source Anchors

Stage 7 (concept introduction and proof):
- `orchestration/7-hitl:.claude/skills/orchestrator/SKILL.md:L361-L395` -- Hydration Checkpoint section format in spec file, initial checkpoint write after spec creation
- `orchestration/7-hitl:.claude/skills/orchestrator/SKILL.md:L43-L95` -- --resume flag parsing, hydration algorithm steps, full/basic hydration paths, orchestration.resumed event
- `orchestration/7-hitl:.claude/skills/orchestrator/SKILL.md:L583-L595` -- Checkpoint write after builder dispatch (records agentId in Agent Sessions)
- `orchestration/7-hitl:.claude/skills/orchestrator/references/hitl-protocol.md` -- Resume Protocol: checkpoint schema, hydration steps, bounce history restore
