# HITL Protocol Reference

**Stage 7 - Human-in-the-Loop Bounce-Back + Persistence**

This reference defines the complete bounce-back protocol, trigger catalog, status lifecycle, resolution option matrix, resume protocol, and hydration checkpoint integration for the HITL system.

---

## Bounce-Back Trigger Catalog

The orchestrator scans builder and validator output for these trigger types after each agent completes. Triggers are classified by severity: `blocking` (must resolve before continuing) and `advisory` (task passed but concern raised).

### Builder Triggers (blocking)

| Trigger | Detection Phrases | Cause |
|---------|------------------|-------|
| `conflicting-requirements` | "conflicts with", "cannot satisfy both", "inconsistent with", "contradicts the existing" | The task requirements conflict with existing code patterns or other tasks |
| `architectural-decision` | "multiple approaches possible", "design decision required", "should this use X or Y", "could be implemented as either" | The implementation requires a design choice the orchestrator cannot make autonomously |
| `scope-discovery` | "this also requires changes to", "more files affected than expected", "discovered additional files", "out of scope but necessary" | The builder found that the task boundary was set incorrectly -- more work is needed |
| `external-dependency` | "not found", "ENOTFOUND", "package not installed", "connection refused", "module not found", "cannot resolve" | A required external resource (package, service, API) is unavailable |
| `decomposition-error` | "these tasks should be combined", "task boundary issue", "cannot implement this in isolation", "depends on unreleased work from another task" | The task decomposition was incorrect -- tasks need to be merged, split, or reordered |

### Validator Triggers (advisory)

| Trigger | Detection Condition | Cause |
|---------|-------------------|-------|
| `design-concern` | `VERDICT: PASS` + advisory phrase | The implementation passes criteria but raises a non-blocking concern |

Advisory phrases that signal `design-concern`: "concern:", "note:", "warning:", "circular dependency", "potential memory leak", "this pattern may not scale", "technical debt", "recommend revisiting", "future maintainability risk".

---

## Status Lifecycle

Tasks move through these statuses throughout an orchestration:

```
pending
  |
  v
in_progress  <-- set before builder dispatch
  |
  +-- (builder completes, no bounce trigger)
  |         |
  |         v
  |    validator dispatch
  |         |
  |         +-- VERDICT: PASS (no design-concern) -> completed
  |         |
  |         +-- VERDICT: PASS + design-concern -> bounced (advisory)
  |         |         |
  |         |         +-- user: "Proceed" -> completed
  |         |         +-- user: "Restructure" -> task graph rewritten
  |         |         +-- user: "Abort" -> aborted
  |         |
  |         +-- VERDICT: FAIL -> retry loop (up to 3x)
  |                   |
  |                   +-- PASS on retry -> completed
  |                   +-- retry exhausted -> failed
  |                             |
  |                             +-- user: "Skip" -> skipped
  |                             +-- user: "Provide guidance" -> retry continues
  |                             +-- user: "Abort" -> aborted
  |
  +-- (builder completes, bounce trigger detected) -> bounced (blocking)
            |
            +-- user: "Proceed with guidance" -> in_progress (re-dispatch)
            +-- user: "Skip this task" -> skipped (cascade to dependents)
            +-- user: "Restructure tasks" -> task graph rewritten
            +-- user: "Abort orchestration" -> aborted
```

**Terminal statuses:** `completed`, `skipped`, `failed`, `aborted`
**Non-terminal statuses:** `pending`, `in_progress`, `bounced`

Cascade skip: when a task is skipped via bounce-back resolution, all tasks that transitively depend on it are also marked `skipped`. The orchestrator lists cascaded skips in its output.

---

## Resolution Option Matrix

Different trigger types offer different resolution options. The orchestrator presents only the valid options for each trigger.

| Option | `conflicting-requirements` | `architectural-decision` | `scope-discovery` | `external-dependency` | `decomposition-error` |
|--------|--------------------------|------------------------|-------------------|---------------------|--------------------|
| Proceed with guidance | Yes | Yes | Yes | Yes | No |
| Skip this task | Yes | Yes | Yes | Yes | Yes |
| Restructure tasks | Yes | Yes | Yes | No | Yes |
| Abort orchestration | Yes | Yes | Yes | Yes | Yes |

**Why `external-dependency` cannot restructure:** Missing packages or services cannot be resolved by changing the task graph -- the root cause is environmental. The user must install the dependency and then retry.

**Why `decomposition-error` cannot proceed with guidance:** If the task boundary is wrong (tasks need merging or reordering), providing guidance to the builder cannot fix the structural problem. The task graph must be restructured instead.

---

## Bounce-Back Presentation Format

### Blocking trigger (builder bounce-back)

```
[HITL] Task `<taskId>` requires your input.

Trigger: <trigger-name> (blocking)

What the builder said:
> <relevant excerpt -- the specific phrase that triggered the bounce>

How do you want to proceed?
1. Proceed with guidance (describe what the builder should do)
2. Skip this task
3. Restructure tasks (describe changes to the task graph)
4. Abort orchestration
```

Options 3 (Restructure) is omitted for `external-dependency` trigger.
Option 1 (Proceed with guidance) is omitted for `decomposition-error` trigger.

### Advisory trigger (validator bounce-back)

```
[HITL] Task `<taskId>` passed validation but has an advisory concern.

Trigger: design-concern (advisory)

What the validator said:
> <relevant excerpt>

How do you want to proceed?
1. Proceed (accept the concern and continue)
2. Restructure tasks (address the concern now)
3. Abort orchestration
```

---

## Resume Protocol

The `--resume <spec-path>` flag triggers hydration. The orchestrator uses this algorithm:

### Step 1: Locate checkpoint

Read the spec file at `<spec-path>`. Find the `## Hydration Checkpoint` section.

### Step 2: Full hydration (checkpoint present)

Read the YAML block under the checkpoint heading:

```yaml
orchestration_id: orch-<timestamp>
team: engineering
current_wave: 2
status: in-progress
agent_sessions:
  implement-get-users: agent-abc123
retry_state:
  implement-get-users: { attempts: 1, last_verdict: "FAIL" }
bounce_history:
  - { task_id: add-user-module, trigger: conflicting-requirements, context: "conflicts with functional pattern", resolution: null }
codex_available: false
sequential_mode: true
timestamp: 2026-02-23T14:30:00Z
```

Restore each field:

1. **orchestration_id**: thread through all subsequent emits
2. **team**: re-load team profile if different from current TEAM flag
3. **current_wave**: skip all lower waves where tasks are in terminal statuses
4. **status**: if `aborted` or `completed`, inform the user and stop (cannot resume a terminal run)
5. **agent_sessions**: for tasks still `in_progress`, use stored agentId in the `resume:` field of builder re-dispatch
6. **retry_state**: restore attempt counters so the 3-retry cap is accurately enforced
7. **bounce_history**: re-present any tasks with `resolution: null` immediately before dispatching other tasks
8. **codex_available**: use same routing decision as original run (prevents codex availability flip mid-run)
9. **sequential_mode**: always true for Stage 7 (Stage 8 adds parallel)

### Step 3: Basic idempotency (no checkpoint)

If no `## Hydration Checkpoint` section exists (pre-Stage-7 spec file):

1. Emit warning: `No hydration checkpoint found. Resuming with status-based idempotency only -- retry counts and agent sessions cannot be restored.`
2. Read each task's `Status` from the Task Graph table
3. Apply: skip `completed` + `skipped`; re-present `bounced`; re-dispatch `in_progress` as fresh starts; dispatch `pending` normally

### Step 4: Emit and jump

Emit `orchestration.resumed` with restored wave, completed task list, and pending task list. Jump to Step 10 at the restored wave position.

---

## Hydration Checkpoint Integration

The orchestrator writes or overwrites the `## Hydration Checkpoint` section of the spec file after each significant state change. The section contains a fenced YAML block.

**Write triggers:**

| When | What changes in checkpoint |
|------|--------------------------|
| After `spec.written` (Step 6) | Initial state: status=in-progress, wave=1, all pending |
| After `agent.dispatched` (builder) | agent_sessions: add taskId -> agentId |
| After bounce detected | bounce_history: add entry with resolution=null |
| After bounce resolved | bounce_history: update entry with resolution |
| After `verdict.received` PASS | (no checkpoint -- task marked completed in Task Graph) |
| After retry starts | retry_state: increment attempts |
| After retry succeeds | retry_state: update last_verdict=PASS |
| After `wave.completed` | current_wave: increment |
| After final Result written | status: completed or aborted |

The checkpoint overwrites the entire `## Hydration Checkpoint` section each time -- it is not appended. The section always reflects the latest complete state.

---

## Interaction with Retry Protocol

Bounce-back and retry are distinct mechanisms:

| | Retry | Bounce-Back |
|---|-------|------------|
| **Trigger** | `VERDICT: FAIL` from validator | Specific phrases in builder or validator output |
| **Decision-maker** | Orchestrator (automated) | Human user |
| **Cap** | 3 attempts max | No cap (each bounce is a separate human decision) |
| **Counts against retry cap** | Yes | No (bounce re-dispatch resets retry counter) |
| **Spec update** | Increments `Retries` field | Updates task `Status` to `bounced` |
| **Checkpoint** | Written per retry attempt | Written at bounce detection and resolution |

A task can be both bounced AND retried in the same run (bounce occurs, user provides guidance, builder re-dispatches, validator fails, retry protocol applies).

---

## Example: Class-Based OOP Conflict

Prompt: `/orchestrate "add a user module using class-based OOP patterns"`

The orchestrator decomposes the task, hardens specs, and dispatches the builder. The builder finds existing functional patterns in `src/users/`:

Builder output excerpt:
```
I cannot implement this as class-based OOP. The existing code in src/users/
uses a purely functional pattern (functions and plain objects). A class-based
User module would be inconsistent with the codebase. This conflicts with the
existing functional pattern.
```

The orchestrator detects `conflicting-requirements` (phrase: "conflicts with the existing functional pattern").

Bounce presentation:
```
[HITL] Task `add-user-module` requires your input.

Trigger: conflicting-requirements (blocking)

What the builder said:
> I cannot implement this as class-based OOP. The existing code in src/users/
> uses a purely functional pattern. This conflicts with the existing functional pattern.

How do you want to proceed?
1. Proceed with guidance (describe what the builder should do)
2. Skip this task
3. Restructure tasks (describe changes to the task graph)
4. Abort orchestration
```

User selects option 1 with guidance: "Use functional patterns -- exported functions and plain object types. No classes."

The orchestrator prepends this to the task description, resets status to `in_progress`, writes a checkpoint, and re-dispatches the builder. The bounce does not count against the retry cap.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| `SKILL.md` Step 10 | Bounce-back detection and resolution in the execution loop |
| `SKILL.md` Step 1 | Resume branch and hydration algorithm |
| `docs/patterns/hitl-protocol.md` | Pattern-level explanation of HITL bounce-back |
| `docs/patterns/hydration-pattern.md` | Pattern-level explanation of spec persistence |
| `docs/patterns/spec-as-source-of-truth.md` | Foundation pattern -- spec file as shared truth |
| `references/dag-execution.md` | DAG execution, wave computation, idempotency rules |
| `references/codex-escalation.md` | Difficulty routing and Codex dispatch (Stage 6) |
