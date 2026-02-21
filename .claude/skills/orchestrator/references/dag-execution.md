# DAG Execution Reference

**Introduced in: Stage 2**

**Purpose:** Technical reference for wave algorithm details, spec file format, idempotency rules, and observability events. `SKILL.md` delegates to this document for the mechanics of multi-task decomposition and execution.

---

## Task Decomposition Rules

When the user prompt is complex enough to require multiple tasks, the orchestrator decomposes it into a task graph before any agent is dispatched.

### Minimum Task Count

Decompose into 3 or more tasks. A single-task prompt does not benefit from a DAG -- that case is handled by Stage 1's dispatch loop. If you cannot identify at least 3 distinct, independently verifiable units of work, you may be over-decomposing a simple task. Check whether the fast path (Stage 3) applies instead.

### Task ID Format

Each task gets a unique ID in `kebab-case`, descriptive enough to be meaningful in a log without context. Do not use generic IDs like `task-1` or `t3`.

Good examples:
- `define-user-types`
- `implement-get-users-handler`
- `implement-post-users-handler`
- `write-user-route-tests`

### Required Task Fields

Every task must have all five of these fields defined before execution begins:

| Field | Description |
|-------|-------------|
| `subject` | Short imperative description (e.g., "Define User types in src/types/user.ts") |
| `description` | Full requirements: file paths, function signatures, named exports, JSDoc requirements, and all acceptance criteria. Must be complete enough for a builder with no other context to implement correctly. |
| `activeForm` | Present continuous form shown in the UI spinner (e.g., "Defining User types") |
| `dependencies` | List of task IDs that must complete before this task can start. Empty list for root tasks. |
| `wave` | Computed wave number (see Wave Computation Algorithm below). |

### Dependency Rules

- Dependencies are expressed as task IDs (e.g., `dependencies: ["define-user-types"]`)
- A task can depend on multiple other tasks
- **No circular dependencies allowed.** If task A depends on task B and task B depends on task A, the graph is invalid and cannot be executed. Restructure the decomposition.
- **No orphaned tasks.** Every task must be reachable from at least one root (a task with zero dependencies). A task that nothing depends on and that depends on nothing is a root -- that is fine. A task whose only predecessors are themselves unreachable is an orphan -- that is an error.

---

## Wave Computation Algorithm

Waves group tasks by dependency depth. Tasks in the same wave have no dependencies on each other -- they are ready to execute as soon as all tasks in the previous wave complete.

### Definition

- **Wave 1:** All tasks with zero dependencies (the roots).
- **Wave N:** All tasks whose dependencies are ALL in waves 1 through N-1.

### Pseudocode (Kahn's Algorithm, Grouped by Depth)

```
function computeWaves(tasks):
    # Build adjacency and in-degree maps
    inDegree = {}
    dependents = {}   # task -> list of tasks that depend on it
    for each task in tasks:
        inDegree[task.id] = task.dependencies.length
        for each dep in task.dependencies:
            dependents[dep].append(task.id)

    # Start with all root tasks (zero dependencies)
    queue = [task for task in tasks if inDegree[task.id] == 0]
    waves = []
    waveNumber = 1

    while queue is not empty:
        currentWave = []
        nextQueue = []

        for each task in queue:
            task.wave = waveNumber
            currentWave.append(task)

            # Reduce in-degree for all tasks that depend on this one
            for each dependent in dependents[task.id]:
                inDegree[dependent] -= 1
                if inDegree[dependent] == 0:
                    nextQueue.append(dependent)

        waves.append(currentWave)
        queue = nextQueue
        waveNumber += 1

    # Cycle detection: any task with inDegree > 0 is in a cycle
    if any task has inDegree[task.id] > 0:
        raise Error("Circular dependency detected")

    return waves
```

### Concrete Example

For the prompt "add a REST API with GET /users, POST /users, and GET /users/:id -- include types, handlers, and tests":

| Task ID | Dependencies | Wave |
|---------|-------------|------|
| `define-user-types` | (none) | 1 |
| `implement-get-users` | `define-user-types` | 2 |
| `implement-post-users` | `define-user-types` | 2 |
| `implement-get-user-by-id` | `define-user-types` | 2 |
| `write-user-route-tests` | `implement-get-users`, `implement-post-users`, `implement-get-user-by-id` | 3 |

Wave 1 runs first (types). Wave 2 runs after (all three handlers, sequentially in Stage 2). Wave 3 runs last (tests, once all handlers are complete).

---

## Execution Protocol

### Wave Sequencing

Execute waves in order: complete all tasks in Wave N before starting Wave N+1. This is the guarantee that dependencies are always satisfied before a task begins.

### Within-Wave Sequencing (Stage 2 Constraint)

In Stage 2, tasks within a wave are executed sequentially -- one at a time, foreground dispatch, wait for completion. Do not attempt to run multiple tasks concurrently. Parallel dispatch is introduced in Stage 8.

### Per-Task Cycle

For each task in each wave, follow this sequence:

```
1. Read the spec file (see Spec File Format below)
2. Update task status to `in_progress` in the spec file
3. Emit wave.started (once per wave, before the first task in that wave)
4. Dispatch the $BUILDER_AGENT:
     Task tool, model: sonnet, foreground: true
     Prompt: "Read task <task-id> from the spec at <spec-path> and implement it.
              When done, update the spec file task status to `completed` and
              summarize your changes."
5. Wait for builder to complete
6. Dispatch the $VALIDATOR_AGENT:
     Task tool, model: haiku, foreground: true
     Prompt: "Read task <task-id> from the spec at <spec-path> and verify the
              builder's work meets all acceptance criteria.
              Update the spec file execution log with VERDICT: PASS or VERDICT: FAIL."
7. Wait for validator to complete
8. Parse the verdict from the spec file or validator's TaskUpdate
9. Record verdict in the spec file execution log
10. If VERDICT: FAIL: stop execution, report failure (no retry in Stage 2 -- see Stage 3)
11. If VERDICT: PASS: continue to next task
```

### Wave Boundary: Re-Read the Spec File

At each wave boundary -- before starting the first task in a new wave -- re-read the spec file from disk.

**Why this is mandatory:** Context compaction can evict the plan from the LLM's working context. An LLM mid-orchestration that loses the spec plan may hallucinate task details or skip steps. Re-reading from disk is the defense -- the spec file IS the source of truth, not the LLM's in-context memory of it.

Emit `spec.reread` when you do this (see Observability Events below).

### Failure Handling (Stage 2)

If any task in any wave receives VERDICT: FAIL:
- Stop execution immediately. Do not proceed to the next task or the next wave.
- Report to the user: which task failed, what wave it was in, and what the validator found wrong.
- Do not retry. Retry logic is introduced in Stage 3.

---

## Spec File Format

### Location and Naming

- Directory: `specs/`
- Filename: derived from the user prompt, kebab-case, descriptive.
  - "add a REST API" -> `specs/rest-api.md`
  - "implement user authentication with JWT" -> `specs/user-auth-jwt.md`
  - When in doubt, keep it short but unambiguous.

### When to Write

Write the spec file BEFORE dispatching any agents. The spec file is a plan, not a report. Agents read it. The orchestrator updates it during execution. It is the source of truth at all times.

### When to Update

Update the spec file at these points:
- When a task's status changes (pending -> in_progress -> completed | failed)
- When an execution log entry is added (builder dispatched, validator dispatched, verdict received)
- When the final result is written

### Full Template

```markdown
# Orchestration Spec: <title>

## Prompt

<original user prompt, verbatim>

## Task Graph

| Task ID | Subject | Dependencies | Wave | Status |
|---------|---------|-------------|------|--------|
| <task-id> | <subject> | (none) | 1 | pending |
| <task-id> | <subject> | <dep-id> | 2 | pending |
| <task-id> | <subject> | <dep-id>, <dep-id> | 3 | pending |

## Tasks

### <task-id>

- Subject: <short imperative description>
- Dependencies: (none) | <task-id>, <task-id>
- Wave: N
- Status: pending | in_progress | completed | failed

**Description:**
<full requirements, file paths, function signatures, named exports, JSDoc requirements>

**Acceptance Criteria:**
- <criterion 1>
- <criterion 2>
- <criterion N>

### <next-task-id>

...

## Execution Log

### Wave 1

- Task `<task-id>`: builder dispatched -> builder completed -> validator dispatched -> validator completed -> VERDICT: PASS
- Task `<task-id>`: builder dispatched -> builder completed -> validator dispatched -> validator completed -> VERDICT: FAIL

### Wave 2

- Task `<task-id>`: builder dispatched -> ...

## Result

<final summary: what was built, which tasks passed, which failed (if any), files created or modified>
```

### Notes on the Template

- The Task Graph table gives a quick overview of the full plan at a glance.
- Each task's description must be complete enough for a builder agent with no other context to implement correctly. Do not rely on the builder reading the user prompt -- the builder reads only the task.
- Acceptance Criteria must be specific and verifiable. "Works correctly" is not verifiable. "Returns 200 with `{ id, name, email }` for an existing user" is verifiable.
- The Execution Log is append-only during execution. Do not overwrite earlier entries.
- Write the Result section only after all waves complete (or after a failure stops execution).

---

## Idempotency Rules

The spec file enables the orchestrator to resume from an interruption without re-executing completed work.

### Task-Level Idempotency

Before dispatching a builder for a task, read the task's `Status` from the spec file.

- If status is `completed`: skip the task entirely. Do not re-dispatch the builder or validator.
- If status is `in_progress`: the previous run was interrupted mid-task. Re-dispatch the builder (treat as a fresh start for that task).
- If status is `pending`: proceed normally.

### Wave-Level Idempotency

Before starting a wave, check the status of all tasks in that wave from the spec file.

- If ALL tasks in the wave have status `completed`: skip the wave entirely. Move to the next wave.
- If SOME tasks are `completed` and others are `pending`: execute only the pending tasks.
- If ANY task is `failed`: do not start the wave. Report the existing failure.

### Why This Matters

LLM orchestrators can be interrupted by context window limits, network failures, or user cancellation. Without idempotency, resuming an interrupted orchestration would re-execute already-completed and already-validated tasks -- wasting tokens, potentially overwriting good work, and confusing the validator with a file that already matches the spec.

With idempotency, re-invoking `/orchestrate` with the same prompt on the same spec file safely skips completed work and picks up from where execution stopped.

---

## Observability Events (Stage 2 Additions)

These events are added in Stage 2. They extend the Stage 1 events (`orchestration.started`, `task.created`, `agent.dispatched`, `agent.completed`, `verdict.received`, `orchestration.completed`) which remain unchanged.

Emit each event via Bash:

```
bun run scripts/emit-event.ts <event-type> '<json-data>'
```

### decomposition.completed

Emitted after the task graph is fully constructed and wave numbers are assigned, before the spec file is written.

```
bun run scripts/emit-event.ts decomposition.completed '{
  "orchestrationId": "<id>",
  "taskCount": <n>,
  "waveCount": <n>,
  "tasks": ["<task-id>", "<task-id>", ...]
}'
```

### spec.written

Emitted after the spec file is written to disk.

```
bun run scripts/emit-event.ts spec.written '{
  "orchestrationId": "<id>",
  "specPath": "specs/<filename>.md"
}'
```

### spec.reread

Emitted each time the spec file is re-read at a wave boundary (context compaction defense).

```
bun run scripts/emit-event.ts spec.reread '{
  "orchestrationId": "<id>",
  "specPath": "specs/<filename>.md",
  "waveNumber": <n>
}'
```

### wave.started

Emitted when a wave begins, before the first task in that wave is dispatched.

```
bun run scripts/emit-event.ts wave.started '{
  "orchestrationId": "<id>",
  "waveNumber": <n>,
  "taskIds": ["<task-id>", "<task-id>", ...]
}'
```

### wave.completed

Emitted when all tasks in a wave have received verdicts (all PASS, or execution stopped on first FAIL).

```
bun run scripts/emit-event.ts wave.completed '{
  "orchestrationId": "<id>",
  "waveNumber": <n>,
  "verdicts": {
    "<task-id>": "PASS",
    "<task-id>": "PASS"
  }
}'
```

### Event Sequence for a 3-Wave Orchestration

```
orchestration.started
decomposition.completed   { taskCount: 5, waveCount: 3 }
spec.written              { specPath: "specs/rest-api.md" }

spec.reread               { waveNumber: 1 }
wave.started              { waveNumber: 1, taskIds: ["define-user-types"] }
  task.created            { taskId: "define-user-types" }
  agent.dispatched        { role: "builder", taskId: "define-user-types" }
  agent.completed         { role: "builder", taskId: "define-user-types" }
  agent.dispatched        { role: "validator", taskId: "define-user-types" }
  agent.completed         { role: "validator", taskId: "define-user-types" }
  verdict.received        { taskId: "define-user-types", verdict: "PASS" }
wave.completed            { waveNumber: 1, verdicts: { "define-user-types": "PASS" } }

spec.reread               { waveNumber: 2 }
wave.started              { waveNumber: 2, taskIds: ["implement-get-users", ...] }
  ... (per-task events for each task in wave 2)
wave.completed            { waveNumber: 2, verdicts: { ... } }

spec.reread               { waveNumber: 3 }
wave.started              { waveNumber: 3, taskIds: ["write-user-route-tests"] }
  ...
wave.completed            { waveNumber: 3, verdicts: { ... } }

orchestration.completed
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`specs/master-plan.md`](../../../../specs/master-plan.md) | Full staged rollout roadmap; Stage 2 section describes what this reference implements |
| [`.claude/skills/orchestrator/SKILL.md`](../SKILL.md) | The SKILL.md that delegates to this reference for wave algorithm details |
| [`docs/patterns/dispatch-loop.md`](../../../../docs/patterns/dispatch-loop.md) | Stage 1 dispatch loop -- the per-task cycle this reference extends to N tasks across waves |
| [`docs/patterns/task-dag.md`](../../../../docs/patterns/task-dag.md) | Pattern doc: what a task DAG is, why it matters, sources and prior art |
| [`docs/patterns/wave-computation.md`](../../../../docs/patterns/wave-computation.md) | Pattern doc: wave computation algorithm in depth, with examples and tradeoffs |
| [`docs/patterns/spec-as-source-of-truth.md`](../../../../docs/patterns/spec-as-source-of-truth.md) | Pattern doc: why the spec file is canonical, context compaction defense, idempotency |
