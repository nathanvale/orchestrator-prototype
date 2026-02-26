---
slug: spec-as-source-of-truth
display_name: "Spec as Source of Truth"
one_liner: "Write the full orchestration plan to disk before dispatching any agents, and re-read it at each wave boundary to defend against context compaction."
intel_date: null
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

spec-as-source-of-truth

## Quick Summary

Before dispatching any agents, the Orchestrator writes a spec file to disk. This file captures the full decomposition -- the task graph, task descriptions, acceptance criteria, wave assignments, and an execution log. It is updated throughout execution as tasks progress and re-read at each wave boundary. The spec file is both the plan and the audit trail. It is the defense against context compaction: by re-reading the spec before each wave, the Orchestrator restores its full plan to context even if earlier portions were evicted.

## When To Use

- Any multi-wave orchestration where context compaction could evict the decomposition plan
- When execution must be resumable after interruption (process crash, user abort, context limit)
- When agents need a self-contained contract to implement from -- without reading the full conversation history
- When an append-only audit trail of all dispatches and verdicts is needed

## Core Mechanism

The spec file lifecycle:

1. **Write (Step 4):** After computing the task graph and wave assignments, and before creating any tasks or dispatching any agents, the Orchestrator writes `specs/<descriptive-name>.md`.

2. **Agents read from spec:** Builders receive: "Read the spec file at `specs/<name>.md` and find task `<task-id>`. Implement exactly what the task description and acceptance criteria require." Builders never read the original user prompt -- the spec IS the contract.

3. **Agents write to spec:** Builders update task Status in the spec. Validators append their verdict to the Execution Log. The log is append-only -- entries are never overwritten.

4. **Re-read at each wave boundary (Step 6):** Before starting each wave, the Orchestrator re-reads the spec file from disk. Mandatory. Emits `spec.reread`. This restores the full plan to context before the next wave begins.

5. **Idempotent resumption:** Before dispatching a Builder, the Orchestrator checks the task's Status in the spec: `completed` = skip; `in_progress` = re-dispatch (prior run was interrupted); `pending` = proceed normally.

**Why context compaction matters:** Claude Code automatically compresses older context when the context window approaches its limit. By Wave 3, the Orchestrator may have dispatched 4+ agents and emitted dozens of events. The decomposition plan computed at the start may have been evicted. Re-reading the spec file at each wave boundary restores it. This is not a workaround -- it is correct architecture for any plan that spans many agent dispatches.

## Key Rules

1. Write the spec file before creating any tasks or dispatching any agents -- it is the pre-execution contract.
2. Agents read from the spec file, not from the original user prompt.
3. The Execution Log is append-only -- never overwrite entries.
4. Re-read the spec file from disk at the start of each wave -- do not rely on in-context memory across waves.
5. Check task Status in the spec before dispatching -- skip `completed` tasks to enable idempotent resumption.
6. The spec file reflects the approved plan after iterative refinement -- modifications during refinement are written back before agents run.

## Implementation Notes

**Filename convention:** Short, kebab-case, unambiguous. "add a REST API" -> `specs/rest-api.md`. "implement user authentication with JWT" -> `specs/user-auth-jwt.md`.

**Spec file structure:**

```markdown
# Orchestration Spec: <title>

## Prompt
<original user prompt, verbatim>

## Task Graph
| Task ID | Subject | Dependencies | Wave | Status |
|---------|---------|-------------|------|--------|

## Tasks
### <task-id>
- Subject, Dependencies, Wave, Status
**Description:** ...
**Acceptance Criteria:** ...

## Execution Log
(append-only; populated during execution)

## Result
(written after all waves complete or on failure)
```

The `spec.reread` event is emitted each time the spec is re-read at a wave boundary, making this action visible in the observability dashboard.

## Failure Modes

- **Writing spec after dispatch:** The spec is created as a report of what happened rather than a plan for what will happen. Agents cannot read from it; there is no contract; resumption is impossible.
- **No wave-boundary re-read:** The Orchestrator relies on in-context memory for the plan. Context compaction evicts earlier parts. Wave 3 dispatches use stale or hallucinated task details.
- **Mutable execution log:** Overwriting log entries removes the audit trail. Failures cannot be diagnosed; partial retries cannot be distinguished from clean runs.
- **Status not checked on resume:** Re-invoking `/orchestrate` re-runs `completed` tasks. Work is duplicated; builders overwrite already-validated implementations.
- **Spec file diverges from approved plan:** Modifications during iterative refinement are not written back. The spec file reflects the initial decomposition, not what the user approved.

## Signals & Diagnostics

- **Pattern is needed:** Context compaction causes the Orchestrator to lose track of remaining tasks mid-execution; or interrupting and resuming orchestration re-runs already-completed work.
- **Pattern is working:** `spec.reread` events appear before each wave; Builder prompts reference the spec file path; task Status fields in the spec match actual execution state; re-invoking after interruption skips `completed` tasks.
- **Pattern is failing:** Orchestrator dispatches tasks not present in the spec; Execution Log entries are missing for completed dispatches; task Status in spec diverges from TaskCreate/TaskUpdate records.

## Tradeoffs

**Gain:** Survives context compaction by externalizing the plan to disk. Enables idempotent resumption from interruption. Provides a complete audit trail of every dispatch and verdict. Agents operate from a self-contained contract rather than conversation history.

**Cost:** Writes a file before any agent runs -- adds latency for simple multi-task prompts. Re-reading at each wave adds a disk read per wave. Filename convention must be maintained to avoid spec file collisions across concurrent runs.

## Related Patterns

- **Task DAG** -- the task graph that the spec file captures
- **Wave Computation** -- wave assignments recorded in the spec's Task Graph table; re-read at each wave boundary
- **Iterative Refinement** -- modifications during refinement are written back to the spec before execution
- **Retry with Resume** -- `retryCount` and Builder `agentId` are persisted in the spec file

## Source Anchors

Stage 2 (concept introduction):
- `orchestration/2-dag:.claude/skills/orchestrator/SKILL.md:L140-L200` -- spec file written before agent dispatch, task graph table format, execution log

Stage 3 (full proof):
- `orchestration/3-full:.claude/skills/orchestrator/SKILL.md:L200-L280` -- spec re-read at wave boundaries, idempotent resumption via status check, spec.reread event

Stage 7 (extension -- hydration checkpoints):
- `orchestration/7-hitl:.claude/skills/orchestrator/SKILL.md:L361-L395` -- Hydration Checkpoint section added to spec file format, checkpoint written after spec creation and updated after every state change
