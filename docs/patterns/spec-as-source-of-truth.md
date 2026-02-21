# Spec-as-Source-of-Truth Pattern

**Introduced in: Stage 2 (Multi-Task DAG)**

---

## What It Is

Before dispatching any agents, the orchestrator writes a spec file to disk. This file captures the full decomposition -- the task graph, task descriptions, acceptance criteria, wave assignments, and an execution log. It is updated throughout execution as tasks progress. It is re-read at each wave boundary.

The spec file is both the plan and the audit trail. It is written before any agent runs, and it is the last thing updated after all agents complete.

```
User Prompt
    |
    v
[Orchestrator] -- Computes task graph and waves
    |
    v
Write spec file to specs/<name>.md  <-- plan written here; no agents dispatched yet
    |
    v
Create all tasks (TaskCreate + addBlockedBy)
    |
    v
Wave 1: re-read spec -> dispatch agents -> update spec with verdicts
    |
    v
Wave 2: re-read spec -> dispatch agents -> update spec with verdicts
    |
    v
Wave N: re-read spec -> dispatch agents -> write Result section
```

The spec file is not a report of what happened -- it is the active source of truth that all agents read from and write to throughout the orchestration.

---

## How We Use It Here

### Writing the Spec (Step 4)

The orchestrator writes the spec file to `specs/<descriptive-name>.md` after computing the task graph and wave assignments, and before creating any tasks or dispatching any agents.

**Filename convention:**
- "add a REST API" -> `specs/rest-api.md`
- "implement user authentication with JWT" -> `specs/user-auth-jwt.md`
- Short, kebab-case, unambiguous

**Spec file structure:**

```markdown
# Orchestration Spec: <title>

## Prompt
<original user prompt, verbatim>

## Task Graph
| Task ID | Subject | Dependencies | Wave | Status |
|---------|---------|-------------|------|--------|
| ...     | ...     | ...         | ...  | pending |

## Tasks
### <task-id>
- Subject: ...
- Dependencies: ...
- Wave: N
- Status: pending

**Description:**
<full requirements, file paths, function signatures, JSDoc requirements>

**Acceptance Criteria:**
- <specific, verifiable criterion>

## Execution Log
(populated during execution)

## Result
(written after all waves complete or on failure)
```

### Agents Read From the Spec

When a Builder is dispatched, its prompt is: "Read the spec file at `specs/<name>.md` and find task `<task-id>`. Implement exactly what the task description and acceptance criteria require."

The Builder never reads the original user prompt. The spec file IS the contract. This is intentional -- it enforces that every task description must be complete and self-contained. A builder with no other context must be able to implement correctly from the spec alone.

The Validator's prompt is similar: "Read task `<task-id>` from the spec file and verify the builder's work meets all acceptance criteria listed in that task."

### Agents Write to the Spec

When a Builder completes, it updates the task's Status to `in_progress` -> `completed` in the spec file and appends a summary to the Execution Log.

When a Validator completes, it appends its structured report to the Execution Log and writes `VERDICT: PASS` or `VERDICT: FAIL`.

The Execution Log is append-only -- entries are never overwritten, only added.

### Re-Read at Each Wave Boundary

Before starting each wave, the orchestrator re-reads the spec file from disk. This is mandatory.

This is the context compaction defense -- see "Why Context Compaction Matters" below.

The `spec.reread` event is emitted each time this happens, so the observability dashboard can show that the orchestrator is actively refreshing its plan from disk.

### Idempotent Resumption

The spec file enables safe resumption from interruption. Before dispatching a Builder, the orchestrator checks the task's Status in the spec:

- `completed` -- skip entirely; it was already done
- `in_progress` -- the previous run was interrupted; re-dispatch the builder
- `pending` -- proceed normally

This means re-invoking `/orchestrate` on the same prompt, with the same spec file on disk, safely skips already-validated tasks and picks up from the interruption point. Completed work is never re-executed.

---

## Why Context Compaction Matters

Claude Code automatically compresses older context when the active context window approaches its limit. This is invisible to the user -- it happens silently as a conversation grows.

In a multi-wave orchestration, this creates a real problem. The decomposition plan computed in Step 2 -- which tasks exist, what their dependencies are, which wave each belongs to -- lives in the orchestrator's context. By the time Wave 3 starts, the orchestrator may have dispatched 4+ agents (each with their own tool calls and outputs), written and updated the spec file multiple times, and emitted dozens of observability events. The context window is significantly fuller than it was at the start.

If context compaction evicts the decomposition plan, the orchestrator loses track of which tasks remain, what dependencies they have, and what the acceptance criteria are. It may hallucinate task details or skip steps entirely.

The spec file re-read at each wave boundary is the defense. The spec file on disk is always complete and up-to-date. Re-reading it at each wave boundary restores the full plan to the context window before the next wave begins.

This is not a workaround -- it is correct architecture. An orchestrator that depends entirely on in-context memory for a plan that spans many agent dispatches is fragile by design. Externalizing the plan to disk and re-reading it periodically is the durable alternative.

---

## Where It Comes From

**Temporal workflow snapshots:** Temporal persists workflow state to a durable log so that workflows survive process restarts, network failures, and host crashes. The spec file serves the same purpose at a smaller scale -- it survives context compaction by being external to the LLM's context window.

**Event sourcing:** The spec file's Execution Log is an event log of the orchestration. Each builder dispatch, validator verdict, and status change is appended. The log is never overwritten. The final state of the orchestration can be reconstructed by replaying the log -- exactly as in event-sourced systems.

**agentic-orchestration plugin:** The `plan-with-team` command in the agentic-orchestration plugin writes spec files to `specs/` as execution blueprints before dispatching any agents. The spec file pattern here follows that established convention directly.

**IndyDevDan's framing:** "The spec is the source of truth, not the conversation context." This principle -- that the plan should live outside the LLM's volatile working memory -- is the foundation of the spec-as-source-of-truth pattern. External, durable, re-readable.

**Community consensus:** Long-running agent workflows (multi-hour, multi-session) consistently require durable plans that survive context window limits. The community has converged on writing plans to disk (as files, database rows, or workflow state) and re-reading them at execution boundaries. The spec file is this repo's implementation of that consensus.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/task-dag.md`](task-dag.md) | The task graph that the spec file captures |
| [`docs/patterns/wave-computation.md`](wave-computation.md) | The wave assignments recorded in the spec file's Task Graph table |
| [`docs/patterns/dispatch-loop.md`](dispatch-loop.md) | The per-task dispatch cycle that reads from and writes to the spec file |
| [`.claude/skills/orchestrator/references/dag-execution.md`](../../.claude/skills/orchestrator/references/dag-execution.md) | Full spec file template, idempotency rules, when to write vs. update |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Key design decisions section -- "spec re-read at each wave" rationale |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Steps 4 and 6 of the dispatch protocol -- spec file writing and wave-boundary re-read |
