# DAG Execution Reference

**Introduced in: Stage 2 (updated in Stage 3, Stage 4, Stage 6, Stage 7)**

**Purpose:** Technical reference for wave algorithm details, difficulty scoring, spec hardening, Codex CLI dispatch, spec file format, idempotency rules, retry protocol, fast path rules, clarifying question heuristics, token estimation, team resolution, and observability events. `SKILL.md` delegates to this document for the mechanics of multi-task decomposition and execution.

---

## Task Decomposition Rules

When the user prompt is complex enough to require multiple tasks, the orchestrator decomposes it into a task graph before any agent is dispatched.

### Minimum Task Count

Decompose into 3 or more tasks. A single-task prompt does not benefit from a DAG -- that case is handled by the fast path (see Fast Path Rules below). If you cannot identify at least 3 distinct, independently verifiable units of work, you may be over-decomposing a simple task. Check whether the fast path applies instead.

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

## Difficulty Scoring

**Introduced in: Stage 6**

After decomposition and before wave computation, the orchestrator evaluates each task's difficulty. This classification drives routing decisions in Step 10 -- hard tasks may be dispatched to Codex CLI instead of the standard builder.

### Classification

Each task is scored as `standard` or `hard` based on signals from `codex-escalation.md`.

**Hard signals (any match = hard):**
- Task touches 5 or more files
- Task requires understanding complex existing code patterns (refactor, migration)
- Task involves algorithmic complexity (graph algorithms, concurrent state management)
- Task description uses words like "optimize", "refactor across", or "migrate"
- Task has 5 or more acceptance criteria
- Task requires cross-module dependency analysis

**Standard signals:**
- Task creates new files (greenfield)
- Task modifies 1-2 files
- Task follows existing patterns (add a handler like the existing ones)
- Task has clear input/output expectations

### Scoring Rule

If ANY hard signal matches, tag as `hard`; otherwise `standard`. The difficulty field is advisory -- the orchestrator uses judgment informed by the rubric. A task that touches 5 files but follows a simple pattern (adding JSDoc to 5 files) is still `standard`. A task that touches 2 files but requires complex algorithmic work is `hard`.

### Spec File Integration

The difficulty field appears in both the task graph table and the individual task definition:

**Task Graph table (with Difficulty column):**

| Task ID | Subject | Dependencies | Wave | Difficulty | Status |
|---------|---------|-------------|------|------------|--------|
| `define-user-types` | Define User types | (none) | 1 | standard | pending |
| `refactor-auth-module` | Refactor auth module | `define-user-types` | 2 | hard | pending |

**Task definition:**
```
- Difficulty: standard | hard
```

Difficulty is set during Step 4b (Difficulty Assessment), before wave computation. It does not change during execution.

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

Wave 1 runs first (types). Wave 2 runs after (all three handlers, sequentially). Wave 3 runs last (tests, once all handlers are complete).

---

## Execution Protocol

### Wave Sequencing

Execute waves in order: complete all tasks in Wave N before starting Wave N+1. This is the guarantee that dependencies are always satisfied before a task begins.

### Within-Wave Sequencing (Stage 2 Constraint)

In Stage 2 and Stage 3, tasks within a wave are executed sequentially -- one at a time, foreground dispatch, wait for completion. Do not attempt to run multiple tasks concurrently. Parallel dispatch is introduced in Stage 8.

### Per-Task Cycle

For each task in each wave, follow this sequence:

```
1. Read the spec file (see Spec File Format below)
2. Update task status to `in_progress` in the spec file
3. Emit wave.started (once per wave, before the first task in that wave)
4. Dispatch the $BUILDER_AGENT:
     Task tool, model: sonnet, foreground: true
     Store the agentId returned -- needed for retry resume
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
8. Parse the verdict from the spec file or validator's output
9. Record verdict in the spec file execution log
10. If VERDICT: FAIL: enter retry protocol (see Retry Protocol below)
11. If VERDICT: PASS: continue to next task
```

### Wave Boundary: Re-Read the Spec File

At each wave boundary -- before starting the first task in a new wave -- re-read the spec file from disk.

**Why this is mandatory:** Context compaction can evict the plan from the LLM's working context. An LLM mid-orchestration that loses the spec plan may hallucinate task details or skip steps. Re-reading from disk is the defense -- the spec file IS the source of truth, not the LLM's in-context memory of it.

Emit `spec.reread` when you do this (see Observability Events below).

### Failure Handling

**Stage 2 behavior (superseded):** In Stage 2, any VERDICT: FAIL stopped execution immediately with no retry. This is preserved in the Stage 2 branch for reference.

**Stage 3 behavior (current):** On VERDICT: FAIL, enter the retry protocol. Only stop if retries are exhausted AND the user chooses "Abort orchestration". See the Retry Protocol section below for full mechanics.

---

## Codex Dispatch

**Introduced in: Stage 6**

When a task is tagged `hard` and Codex CLI is available (`CODEX_ENABLED == true`), the orchestrator routes to Codex instead of the standard Claude Code builder.

### Decision Branch

Before dispatching the builder for each task:

1. Read the task's `difficulty` field from the spec file
2. If `difficulty == hard` AND `CODEX_ENABLED == true`: route to Codex
3. Otherwise: route to standard builder

### Codex Invocation

```bash
codex exec --full-auto --json --output-last-message /tmp/codex-task-<task-id>.md --cd <project-root> "<task prompt>"
```

- `--full-auto`: unattended execution
- `--json`: structured JSONL output for parsing
- `--output-last-message`: captures result to file for the validator to read
- `--cd`: ensures correct working directory
- Timeout: 5 minutes (300,000ms)

The task prompt includes the full hardened description and acceptance criteria from the spec file. It must be self-contained -- Codex has no prior context.

### Validator Independence

The validator always runs via Claude Code haiku, regardless of which builder was used. The validator reads the spec file and checks the codebase -- it does not know or care whether Claude Code sonnet or Codex CLI produced the changes.

### Fallback Protocol

See `codex-escalation.md` for the full fallback protocol. Summary:

| Scenario | Action | Retry Impact |
|----------|--------|-------------|
| Codex not installed | Dispatch standard builder | None (routing fallback) |
| Codex exits non-zero | Dispatch standard builder | None (routing fallback) |
| Codex times out (5 min) | Dispatch standard builder | None (routing fallback) |

**Key rule:** Fallback does NOT count against the retry cap. The retry counter is only incremented by VERDICT: FAIL from the validator.

---

## Spec Hardening

**Introduced in: Stage 6**

After plan approval (Step 7) and before token estimation (Step 8), the orchestrator performs a hardening pass over every task description. This catches ambiguity before builders encounter it, reducing retry rates.

### When It Runs

- **Full path:** Step 7b, after plan.approved and before tokens.estimated
- **Fast path:** Mini-hardening in Step 3b, before builder dispatch

### Ambiguity Signals

These signals trigger a rewrite:

- Vague phrases: "handle appropriately", "should work", "as needed"
- Filler language: "etc.", "similar", "and so on"
- Missing file paths: "the types file" instead of `src/types/user.ts`
- Implicit dependencies not stated
- Vague acceptance criteria: "works correctly", "handles edge cases"
- Unspecified error handling: "handle errors" without specifying responses

### Rewrite Rules

For each signal found:

1. Resolve file paths by reading the codebase (Glob/Grep to find actual paths)
2. Replace vague language with concrete expectations
3. Enumerate implicit items (replace "etc." with the full list)
4. Add measurable acceptance criteria
5. Specify function signatures where descriptions say "a function to..."
6. Specify error responses where descriptions say "handle errors"

### Audit Trail

Hardening preserves the original description for transparency:

- Original description goes in a "Pre-Hardening" subsection of the task
- Hardened sections are marked with `[hardened]` annotation
- The spec file update is atomic -- all tasks are hardened in one pass

### Before/After Example

**Before hardening:**
```
**Description:**
Migrate the auth module to use the new token service. Handle errors appropriately.
Update tests etc.

**Acceptance Criteria:**
- Auth module works with new token service
- Tests pass
```

**After hardening:**
```
**Pre-Hardening:**
> Migrate the auth module to use the new token service. Handle errors appropriately. Update tests etc.

**Description:** [hardened]
Migrate `src/auth/auth-module.ts` to import and call `src/services/token-service.ts` instead of the inline JWT logic. Replace `generateToken()` calls with `tokenService.create()` and `verifyToken()` calls with `tokenService.verify()`. On `TokenExpiredError`, return 401 with `{ error: "token_expired" }`. On `TokenInvalidError`, return 401 with `{ error: "token_invalid" }`. Update `tests/auth/auth-module.test.ts` and `tests/auth/token-integration.test.ts`.

**Acceptance Criteria:** [hardened]
- `src/auth/auth-module.ts` imports from `src/services/token-service.ts`
- No remaining references to inline JWT logic (`jwt.sign`, `jwt.verify`) in auth-module.ts
- `TokenExpiredError` returns 401 with `{ error: "token_expired" }`
- `TokenInvalidError` returns 401 with `{ error: "token_invalid" }`
- `tests/auth/auth-module.test.ts` passes with updated imports
- `tests/auth/token-integration.test.ts` passes with token service mocks
```

### What Hardening Is NOT

Spec hardening is a focused rewrite, not creative expansion. The orchestrator should not add new requirements during hardening -- only clarify existing ones. If a requirement is genuinely missing (not vague, but absent), that is a decomposition problem from Step 4, not a hardening problem.

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
- When a task's status changes (pending -> in_progress -> completed | failed | skipped)
- When a retry is triggered (increment `Retries` count on the task)
- When an execution log entry is added (builder dispatched, validator dispatched, verdict received, retry attempt)
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
- Status: pending | in_progress | completed | failed | skipped
- Retries: 0

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
  - Retry 1: builder re-dispatched (resume: <agentId>) -> builder completed -> validator dispatched -> VERDICT: PASS

### Wave 2

- Task `<task-id>`: builder dispatched -> ...

## Result

<final summary: what was built, which tasks passed, which failed or were skipped, total retries, files created or modified>
```

### Notes on the Template

- The Task Graph table gives a quick overview of the full plan at a glance.
- Each task's description must be complete enough for a builder agent with no other context to implement correctly. Do not rely on the builder reading the user prompt -- the builder reads only the task.
- Acceptance Criteria must be specific and verifiable. "Works correctly" is not verifiable. "Returns 200 with `{ id, name, email }` for an existing user" is verifiable.
- The `Retries: 0` field on each task is incremented by the orchestrator each time a retry is triggered. It is the source of truth for retry statistics in the final report.
- The Execution Log is append-only during execution. Do not overwrite earlier entries. Retry attempts are appended as sub-entries under the original task log entry.
- Write the Result section only after all waves complete (or after an abort stops execution).

---

## Idempotency Rules

The spec file enables the orchestrator to resume from an interruption without re-executing completed work.

### Task-Level Idempotency

Before dispatching a builder for a task, read the task's `Status` from the spec file.

- If status is `completed`: skip the task entirely. Do not re-dispatch the builder or validator.
- If status is `skipped`: skip the task entirely. It was user-skipped after retry exhaustion.
- If status is `in_progress`: the previous run was interrupted mid-task. Re-dispatch the builder (treat as a fresh start for that task).
- If status is `bounced`: re-present the bounce-back to the user as if it just occurred. The task was awaiting user input when the session ended. Read the trigger type and context from the Hydration Checkpoint's Bounce History field. After the user responds, apply the resolution and continue normally.
- If status is `pending`: proceed normally.

### Wave-Level Idempotency

Before starting a wave, check the status of all tasks in that wave from the spec file.

- If ALL tasks in the wave have status `completed` or `skipped`: skip the wave entirely. Move to the next wave.
- If SOME tasks are `completed` or `skipped` and others are `pending`: execute only the pending tasks.
- If ANY task is `failed`: do not start the wave. Apply the retry protocol or report existing failure.

### Why This Matters

LLM orchestrators can be interrupted by context window limits, network failures, or user cancellation. Without idempotency, resuming an interrupted orchestration would re-execute already-completed and already-validated tasks -- wasting tokens, potentially overwriting good work, and confusing the validator with a file that already matches the spec.

With idempotency, re-invoking `/orchestrate` with the same prompt on the same spec file safely skips completed work and picks up from where execution stopped.

---

## Hydration Checkpoint

**Introduced in: Stage 7**

See `hitl-protocol.md` for the full checkpoint template, field reference, and placement rules. This section explains the relationship between idempotency (which existed in Stage 2) and hydration (the Stage 7 addition).

### Idempotency vs Hydration

Stage 2 idempotency uses task `Status` fields in the Task Graph table to skip completed work on resume. This is coarse-grained -- it can determine what is done but not where exactly the orchestrator was or what volatile state (agent IDs, retry counts, bounce history) existed.

Stage 7 hydration adds a structured `## Hydration Checkpoint` section at the bottom of the spec file. This section captures the volatile state that the Task Graph table cannot express:

| What idempotency provides | What hydration adds |
|---------------------------|---------------------|
| Task status (completed / skipped / pending) | Current wave number |
| Which tasks need re-dispatch | Agent session IDs for in-progress builders (enables `--resume agentId`) |
| (nothing) | Retry attempt counts per task (so 3-retry limit is correctly enforced across restarts) |
| (nothing) | Bounce history with trigger type and resolution per task |
| (nothing) | Codex availability flag and sequential mode flag |

Idempotency reads the Task Graph table. Hydration reads the Checkpoint section AND the Task Graph table, then reconciles them. When both are present, hydration takes precedence.

### Checkpoint Update Frequency

Write the checkpoint after every state-changing event. Do not batch writes.

| Event | What to write |
|-------|---------------|
| Task dispatched (builder) | Add agentId to Agent Sessions; update Wave Progress |
| Task status changes | Update Wave Progress for the affected task |
| Wave boundary crossed | Update Current Wave; clear Wave Progress for completed wave |
| Retry attempt begins | Update Retry State for the task |
| Task reaches terminal status | Clear Agent Sessions and Retry State for that task |
| Bounce detected | Add entry to Bounce History; update Wave Progress to `bounced` |
| Bounce resolved | Update Bounce History entry with resolution; update Wave Progress back to `in_progress` |
| Orchestration starts | Write entire checkpoint (initial state) |

Each write is an atomic overwrite of the Checkpoint section only -- the rest of the spec file is unchanged. Emit `checkpoint.written` after each write.

---

## Resume Protocol

**Introduced in: Stage 7**

### The `--resume` Flag

```
/orchestrate --resume specs/add-rest-api-20260222-143000.md
```

When `--resume` is present, skip all decomposition, clarifying questions, plan review, and cost estimation. Go directly to the spec file, locate the `## Hydration Checkpoint` section, and restore state.

### Hydration Algorithm

On finding a valid checkpoint, restore state in this order:

1. **Restore orchestration identity** -- read `Orchestration ID` and `Team`. Load the team profile named in `Team` to resolve agent identities (`$BUILDER_AGENT`, `$VALIDATOR_AGENT`).
2. **Restore wave position** -- read `Current Wave`. Skip all waves numbered lower than `Current Wave` if their tasks are all `completed` or `skipped`.
3. **Restore agent sessions** -- read `Agent Sessions`. For any task currently `in_progress`, use the stored agentId to resume the builder with `--resume <agentId>`.
4. **Restore retry state** -- read `Retry State`. For any task being retried, the attempt counter is restored so the 3-retry limit is correctly enforced.
5. **Restore bounce history** -- read `Bounce History`. Tasks still in `bounced` status are re-presented to the user immediately.
6. **Restore routing flags** -- read `Codex Available` and `Sequential Mode`. Apply the same routing decisions as the original run.

Emit `orchestration.resumed` after hydration completes and before dispatching any tasks.

### Idempotency on Resume

Per-task rules when executing after hydration:

| Task status at resume | Action |
|-----------------------|--------|
| `completed` | Skip -- do not re-dispatch. |
| `skipped` | Skip -- cascade skips still apply to any dependents not yet skipped. |
| `failed` | Re-present to user -- ask whether to retry, skip, or abort. |
| `aborted` | Skip -- do not re-dispatch. |
| `bounced` | Re-present the bounce-back to the user as if it just occurred. Use the stored trigger and context from Bounce History. |
| `in_progress` | Re-dispatch builder using `--resume <agentId>` from Agent Sessions. If agentId is missing (session expired), dispatch a fresh builder with the full task description. |
| `pending` | Dispatch normally when the wave is reached and all predecessors are complete. |

### Edge Cases

**Missing Hydration Checkpoint (pre-Stage-7 spec file)** -- if the spec file is valid but has no `## Hydration Checkpoint` section, fall back to basic idempotency: read each task's `Status` from the Task Graph table and apply the rules above. Emit a warning: `No hydration checkpoint found. Resuming with status-based idempotency only -- retry counts and agent sessions cannot be restored.`

**Corrupted spec file** -- if the spec file cannot be parsed (missing required sections, malformed markdown), report the error and refuse to resume. Do not attempt partial hydration. Message: `Cannot resume: spec file at <path> is malformed. Start a new orchestration or repair the spec file manually.`

**Team profile not found** -- if the team name from the checkpoint does not match any profile in `.claude/skills/orchestrator/teams/`, abort with: `Cannot resume: team profile '<team>' not found. The profile may have been renamed or removed.`

**Spec file not found** -- if the path passed to `--resume` does not exist, abort immediately: `Cannot resume: spec file not found at <path>.`

---

## Retry Protocol

**Introduced in: Stage 3**

When a task receives VERDICT: FAIL, do not stop immediately. Apply the retry protocol: re-dispatch the builder up to 3 times before escalating to the user.

### Core Mechanics

**Builder retry uses `resume: agentId`.**
Store the agentId returned by the Task tool after each builder dispatch. On retry, pass `resume: <agentId>` to the Task tool so the builder receives its previous conversation context. This means the validator's feedback lands in a thread that already knows what was built -- the builder does not need to re-read the spec from scratch and already has full context of what it tried.

**Validator always gets a fresh dispatch (no resume).**
The validator's job is an independent read-and-check. Resuming a validator would inherit the previous run's framing, which could bias the verdict toward leniency or carry over stale context. Fresh dispatch keeps each validation independent.

**Retry prompt (builder):**
```
Your previous implementation of task <task-id> failed validation.

The validator's specific findings:
<paste validator report from Execution Log>

Fix these issues. When done, update the spec file task status and append a
summary of your corrections to the Execution Log.
```

### Retry Sequence

```
Initial dispatch (attempt 0):
  builder dispatched -> builder completed
  validator dispatched -> validator completed
  VERDICT: FAIL

Retry attempt 1:
  emit retry.started { taskId, attempt: 1, maxAttempts: 3 }
  increment Retries counter in spec file
  builder re-dispatched (resume: agentId) with validator feedback
  builder completed
  validator dispatched (fresh, no resume)
  validator completed
  VERDICT: PASS -> emit retry.succeeded, mark task completed, continue
  VERDICT: FAIL -> retry attempt 2

Retry attempt 2:
  emit retry.started { taskId, attempt: 2, maxAttempts: 3 }
  increment Retries counter in spec file
  builder re-dispatched (resume: latest agentId)
  ... (same cycle)
  VERDICT: PASS -> emit retry.succeeded, continue
  VERDICT: FAIL -> retry attempt 3

Retry attempt 3:
  ... (same cycle)
  VERDICT: PASS -> emit retry.succeeded, continue
  VERDICT: FAIL -> emit retry.exhausted, escalate to user
```

### Spec File Updates During Retry

For each retry attempt:
1. Increment `Retries: N` on the task in the Tasks section.
2. Append a retry entry to the Execution Log under the task's wave section:
   ```
   - Retry <N>: builder re-dispatched (resume: <agentId>) -> builder completed -> validator dispatched -> VERDICT: PASS|FAIL
   ```
3. If retry succeeds: update task Status to `completed`.
4. If retry exhausted: update task Status to `failed`.

### After 3 Failures: User Escalation

Emit `retry.exhausted`, then ask the user via AskUserQuestion with three options:

**"Skip this task"**
- Mark task Status as `skipped` in the spec file.
- Continue to the next task in the wave (and subsequent waves).
- Note in the Result section that this task was skipped after retry exhaustion.

**"Provide guidance for the builder"**
- Accept the user's description of what needs fixing.
- Incorporate the guidance into the next builder prompt.
- Dispatch one more builder+validator cycle (this additional cycle is NOT counted against the 3-attempt cap -- it is a user-guided override).
- If PASS: continue normally. If FAIL: ask the user again.

**"Abort orchestration"**
- Update task Status to `failed` in the spec file.
- Write the Result section with the failure summary and retry count.
- Emit `orchestration.cancelled` with reason "retry exhausted, user aborted".
- Stop. Do not execute further tasks or waves.

---

## Bounce-Back Protocol

**Introduced in: Stage 7**

See `hitl-protocol.md` for the full trigger catalog, detection heuristics, presentation format, and resolution action mechanics. This section summarises the key concepts and the `bounced` task status lifecycle as it integrates with the broader execution protocol.

### When Bounce-Back Applies

Retry resolves execution quality problems: the builder produced an incorrect result but the task is structurally sound. Bounce-back resolves judgment problems: the task cannot proceed without a human decision. The two mechanisms are orthogonal -- a task can bounce back for a judgment call AND later need retries if the re-attempted implementation still fails validation.

When the orchestrator detects a bounce-back trigger (after scanning builder or validator output), it immediately:
1. Updates task status to `bounced` in the spec file
2. Emits `hitl.bounced`
3. Presents the situation to the user via AskUserQuestion
4. Waits for a resolution before proceeding

### The `bounced` Status

`bounced` is a temporary hold state. A task in `bounced` status is not failed -- it is paused pending user input. It always transitions to one of:
- `in_progress` (user chose "Proceed with guidance" -- builder is re-dispatched with guidance prepended)
- `skipped` (user chose "Skip this task" -- cascade skip applies to all dependents)
- `aborted` via orchestration abort (user chose "Abort orchestration")

A task can enter and exit `bounced` multiple times. Each bounce cycle is recorded separately in the Hydration Checkpoint's Bounce History field.

### Bounce-Back Trigger Summary

The six trigger types and their severities (see `hitl-protocol.md` for full detection heuristics and examples):

| Trigger | Severity | When it fires |
|---------|----------|---------------|
| `conflicting-requirements` | Blocking | Builder finds contradictory requirements between tasks or with existing code |
| `architectural-decision` | Blocking | Builder reaches a design fork with multiple valid approaches and downstream consequences |
| `scope-discovery` | Blocking | Builder discovers the task scope is larger than described (additional files required) |
| `external-dependency` | Blocking | A required package, service, or environment resource is unavailable |
| `decomposition-error` | Blocking | Builder or validator identifies a structural problem with the task graph itself |
| `design-concern` | Advisory | Validator issues VERDICT: PASS but flags a concern with future consequences |

### Resolution Options

| Resolution | Effect |
|------------|--------|
| **Proceed with guidance** | User's guidance is prepended to the task description. Builder is re-dispatched. Retry count resets for this bounce (new attempt, new context). |
| **Skip this task** | Task status -> `skipped`. All dependent tasks are cascade-skipped. |
| **Restructure tasks** | Orchestrator rewrites the task graph per user instructions, recomputes waves, re-presents plan for review, then resumes. |
| **Abort orchestration** | All in-progress and pending tasks -> `aborted`. Final summary is reported. |

Note: not all resolution options are available for every trigger type. `decomposition-error` does not offer "Proceed with guidance" (the graph is structurally unsound). `design-concern` does not offer "Skip this task" (the task already passed). See `hitl-protocol.md` for per-trigger option availability.

---

## Fast Path Rules

**Introduced in: Stage 3**

The fast path is an optimization that bypasses DAG decomposition, spec file creation, wave execution, and plan refinement for trivially simple prompts. It is essentially the Stage 1 dispatch loop preserved as an optimization within Stage 3.

### Fast Path Criteria

ALL of the following must be true to trigger the fast path:

1. **Single, self-contained change** -- the prompt describes one coherent unit of work with no sub-tasks.
2. **Affects 1-2 files at most** -- the change is localized; it does not require modifications across multiple modules.
3. **Estimated less than 20 lines of code** -- the implementation is small enough that one builder dispatch will complete it in a single pass.
4. **No dependencies between sub-tasks** -- there are no ordering constraints because there is only one task.

**Canonical examples that trigger fast path:**
- "Add JSDoc to the greet function in src/hello.ts"
- "Rename variable `userId` to `accountId` in src/auth.ts"
- "Fix the typo in the README introduction paragraph"
- "Add a missing semicolon to line 42 of src/index.ts"

**Examples that do NOT trigger fast path:**
- "Add authentication to the app" (vague scope, multiple files)
- "Refactor the user module" (unclear scope, likely many files)
- "Add tests for the API endpoints" (multiple test files, depends on endpoint structure)

### Fast Path Dispatch Shape

When the fast path triggers:

1. Create ONE task via TaskCreate (no wave annotation, no dependency graph).
2. Dispatch builder (sonnet, foreground) with the full task description and acceptance criteria.
3. Dispatch validator (haiku, foreground, fresh) to verify.
4. Parse verdict.
5. On PASS: report result and emit `orchestration.completed`.
6. On FAIL: apply the retry protocol (same mechanics as full execution -- up to 3 retries with `resume: agentId`).

There is no spec file, no plan refinement step, no token estimation step, and no wave events. The `task.created` event fires. The `agent.dispatched`, `agent.completed`, and `verdict.received` events fire. Retry events fire if needed. `orchestration.completed` fires at the end.

### Why Preserve the Fast Path

Without the fast path, a prompt like "add JSDoc to one function" would trigger full DAG decomposition (minimum 3 tasks), a spec file write, a plan refinement loop, token estimation presentation, and TaskCreate calls for all three synthesized tasks -- all for a change a single builder call can complete in seconds. The fast path eliminates this overhead for the cases where it provides no value.

---

## Clarifying Questions Heuristics

**Introduced in: Stage 3**

Before decomposing or routing to the fast path, evaluate whether the prompt is specific enough to act on without asking the user for more information.

### Ambiguity Signals

Any of the following signals should trigger clarification:

- **No target files or paths specified** -- "add authentication" without naming any files leaves the builder guessing at scope.
- **No function signatures or types mentioned** -- "add a user service" could mean a class, a module, a set of functions, or an HTTP client.
- **Vague scope language** -- "improve performance", "fix the bugs", "add error handling", "clean up the code".
- **Multiple valid interpretations** -- "add login" could mean JWT, session cookies, OAuth, or a simple username/password check.

### Question Generation Guidelines

When clarification is needed, ask 2-4 specific, actionable questions:

- **Narrow scope, do not expand it.** Ask questions that eliminate ambiguity, not questions that open new directions. "Which file should the function go in?" not "What other features should we add while we're at it?"
- **Include concrete options where possible.** "JWT, session cookies, or OAuth?" is easier to answer than "What kind of authentication?". Options reduce cognitive load and speed up the response.
- **Do not ask about implementation details the builder should decide.** Variable naming, internal structure, code style -- these are builder decisions, not orchestration inputs. Only ask about things that would change the task graph or acceptance criteria.
- **Prioritize questions by impact.** If you can only ask two questions, ask the ones that would most change what gets built.

**Example -- "add authentication" prompt:**
1. Which files or modules should authentication apply to? (e.g., all API routes, specific endpoints, the entire app)
2. What authentication mechanism? (JWT tokens, session cookies, or OAuth via a provider)
3. Should the implementation include tests?

### Skip Condition

Skip clarification and emit `clarification.skipped` with a reason when:

- The prompt names specific files or modules
- The prompt specifies function signatures or types
- The prompt has a clear, unambiguous scope with one obvious interpretation
- The user has already answered clarifying questions in this session (do not ask twice)

---

## Token Estimation Model

**Introduced in: Stage 3**

Before dispatching any agents (after plan approval, before creating tasks), estimate the token cost of the full orchestration and present it to the user as informational context.

### Per-Task Estimation Formula

| Dispatch | Input Tokens | Output Tokens | Total |
|----------|-------------|--------------|-------|
| Builder | ~2,000 | ~1,000 | ~3,000 |
| Validator | ~1,000 | ~500 | ~1,500 |
| **Per-task total** | | | **~4,500** |

These are conservative estimates. Actual usage varies by task complexity and spec file length (which grows as the execution log fills).

### Wave-Level Calculation

```
Wave N estimated tokens = (number of tasks in Wave N) x 4,500
Total estimated tokens  = sum of all wave estimates
```

### Retry Multiplier

If retries are likely (complex tasks, underspecified acceptance criteria):

- No retries (best case): 1x multiplier -- base estimate
- 1 retry per task: 2x multiplier (one extra builder + validator cycle per task)
- 3 retries per task (worst case): 4x multiplier

Present the base estimate to the user. Mention the retry multiplier if the tasks look complex.

### Model Cost Assumptions

- **Builders** dispatch on **sonnet** (higher capability, higher cost).
- **Validators** dispatch on **haiku** (sufficient for read-and-verify, lower cost).

The cost ratio between sonnet and haiku matters if translating token counts to dollar estimates. For token counts alone, use the formula above directly.

### Presentation Format

```
Token estimate (before retries):
  Wave 1: 1 task  -- ~4,500 tokens
  Wave 2: 3 tasks -- ~13,500 tokens
  Wave 3: 1 task  -- ~4,500 tokens
  Total:          -- ~22,500 tokens

Note: retries add ~4,500 tokens per retry attempt if needed.
```

This is informational only. There is no approval gate. The orchestrator continues to Step 9 immediately after presenting the estimate.

---

## Team Resolution

**Introduced in: Stage 4**

The orchestrator resolves which agents to dispatch by reading a team profile at the start of every orchestration run. This decouples agent identity from orchestration logic -- the 12-step dispatch protocol is identical regardless of which team is selected.

### Team Profile Location

Team profiles live in `.claude/skills/orchestrator/teams/`. Each profile is a markdown file with YAML frontmatter.

### Team Profile Format

```yaml
---
name: <team-name>
description: <what this team is optimized for>
builder: <agent-slug>
validator: <agent-slug>
---
```

The `builder` and `validator` fields reference agent definition files in `.claude/agents/` (without the `.md` extension).

### Resolution Algorithm

1. Parse `--team <name>` from the end of the user prompt. If present, strip the flag from the prompt.
2. If no `--team` flag: default to `engineering`.
3. Read `.claude/skills/orchestrator/teams/<name>.md`.
4. Parse YAML frontmatter to extract `builder` and `validator` fields.
5. Set `$BUILDER_AGENT` and `$VALIDATOR_AGENT` to the resolved values.
6. Emit `team.resolved` event with the team name and resolved agent identities.

### Default Team

When no `--team` flag is specified, the orchestrator uses the `engineering` team profile. This resolves to:

- `BUILDER_AGENT: builder` (the standard code implementation agent)
- `VALIDATOR_AGENT: validator` (the standard read-only verification agent)

This preserves backward compatibility -- all Stage 1-3 orchestrations work identically without any --team flag.

### Available Teams

| Team | Builder | Validator | Use Case |
|------|---------|-----------|----------|
| `engineering` (default) | `builder` | `validator` | Code implementation and modification |
| `research` | `research-builder` | `research-validator` | Web research, synthesis, and information gathering |

---

## Observability Events

These events are emitted via Bash throughout orchestration. The full catalog includes Stage 1, Stage 2, and Stage 3 events.

Emit each event via Bash:

```
bun run scripts/emit-event.ts <event-type> '<json-data>'
```

### Stage 1 Events (unchanged)

#### orchestration.started

```
bun run scripts/emit-event.ts orchestration.started '{
  "orchestrationId": "<id>",
  "prompt": "<user prompt>",
  "team": "<team-name>",
  "builderAgent": "<resolved-builder-agent>",
  "validatorAgent": "<resolved-validator-agent>"
}'
```

#### task.created

```
bun run scripts/emit-event.ts task.created '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>",
  "subject": "<subject>"
}'
```

#### agent.dispatched

```
bun run scripts/emit-event.ts agent.dispatched '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>",
  "role": "builder|validator",
  "agentType": "builder|validator",
  "model": "sonnet|haiku"
}'
```

#### agent.completed

```
bun run scripts/emit-event.ts agent.completed '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>",
  "role": "builder|validator",
  "agentType": "builder|validator"
}'
```

#### verdict.received

```
bun run scripts/emit-event.ts verdict.received '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>",
  "verdict": "PASS|FAIL"
}'
```

#### orchestration.completed

```
bun run scripts/emit-event.ts orchestration.completed '{
  "orchestrationId": "<id>",
  "verdict": "PASS|FAIL",
  "taskCount": <n>,
  "retriesTotal": <n>,
  "fastPath": <true|false>,
  "clarifyingQuestionsAsked": <n>
}'
```

On failure, also include `failedTaskId` and `failedWave`:

```
bun run scripts/emit-event.ts orchestration.completed '{
  "orchestrationId": "<id>",
  "verdict": "FAIL",
  "failedTaskId": "<task-id>",
  "failedWave": <n>,
  "retriesTotal": <n>,
  "fastPath": <false>
}'
```

### Stage 2 Events (unchanged)

#### decomposition.completed

Emitted after the task graph is fully constructed and wave numbers are assigned, before the spec file is written.

```
bun run scripts/emit-event.ts decomposition.completed '{
  "orchestrationId": "<id>",
  "taskCount": <n>,
  "waveCount": <n>,
  "tasks": ["<task-id>", "<task-id>", ...]
}'
```

#### spec.written

Emitted after the spec file is written to disk.

```
bun run scripts/emit-event.ts spec.written '{
  "orchestrationId": "<id>",
  "specPath": "specs/<filename>.md"
}'
```

#### spec.reread

Emitted each time the spec file is re-read at a wave boundary (context compaction defense).

```
bun run scripts/emit-event.ts spec.reread '{
  "orchestrationId": "<id>",
  "specPath": "specs/<filename>.md",
  "waveNumber": <n>
}'
```

#### wave.started

Emitted when a wave begins, before the first task in that wave is dispatched.

```
bun run scripts/emit-event.ts wave.started '{
  "orchestrationId": "<id>",
  "waveNumber": <n>,
  "taskIds": ["<task-id>", "<task-id>", ...]
}'
```

#### wave.completed

Emitted when all tasks in a wave have received verdicts (all PASS, skipped, or execution stopped).

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

### Stage 3 Events (new)

#### clarification.started

Emitted when the orchestrator begins asking the user clarifying questions.

```
bun run scripts/emit-event.ts clarification.started '{
  "orchestrationId": "<id>"
}'
```

#### clarification.completed

Emitted after the user has answered clarifying questions and the prompt has been re-parsed.

```
bun run scripts/emit-event.ts clarification.completed '{
  "orchestrationId": "<id>",
  "questionsAsked": <N>
}'
```

#### clarification.skipped

Emitted when the prompt is specific enough that no clarification is needed.

```
bun run scripts/emit-event.ts clarification.skipped '{
  "orchestrationId": "<id>",
  "reason": "<brief explanation of why the prompt was specific enough>"
}'
```

#### fast_path.evaluated

Emitted after the fast path gate check completes, regardless of the result.

```
bun run scripts/emit-event.ts fast_path.evaluated '{
  "orchestrationId": "<id>",
  "triggered": <true|false>,
  "reason": "<brief explanation>"
}'
```

#### plan.presented

Emitted when the task graph is shown to the user for review (Step 7 of the full path).

```
bun run scripts/emit-event.ts plan.presented '{
  "orchestrationId": "<id>",
  "taskCount": <n>,
  "waveCount": <n>
}'
```

#### plan.approved

Emitted when the user approves the task graph without modifications.

```
bun run scripts/emit-event.ts plan.approved '{
  "orchestrationId": "<id>"
}'
```

#### plan.modified

Emitted when the user requests changes to the task graph during plan refinement. May be emitted multiple times in a single refinement loop.

```
bun run scripts/emit-event.ts plan.modified '{
  "orchestrationId": "<id>",
  "modifications": "<brief summary of what the user changed>"
}'
```

#### orchestration.cancelled

Emitted when the user cancels the orchestration, either during plan refinement or after retry exhaustion.

```
bun run scripts/emit-event.ts orchestration.cancelled '{
  "orchestrationId": "<id>",
  "reason": "<user cancelled at plan review | retry exhausted, user aborted>"
}'
```

#### tokens.estimated

Emitted after the token estimate is calculated and presented to the user.

```
bun run scripts/emit-event.ts tokens.estimated '{
  "orchestrationId": "<id>",
  "estimatedTokens": <total>,
  "breakdown": {
    "wave1": <tokens>,
    "wave2": <tokens>,
    "wave3": <tokens>
  }
}'
```

#### retry.started

Emitted at the beginning of each retry attempt for a failed task.

```
bun run scripts/emit-event.ts retry.started '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>",
  "attempt": <N>,
  "maxAttempts": 3
}'
```

#### retry.succeeded

Emitted when a retry attempt produces VERDICT: PASS.

```
bun run scripts/emit-event.ts retry.succeeded '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>",
  "attempt": <N>
}'
```

#### retry.exhausted

Emitted when all 3 retry attempts have failed and the user must decide how to proceed.

```
bun run scripts/emit-event.ts retry.exhausted '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>"
}'
```

### Stage 4 Events (new)

#### team.resolved

Emitted after the team profile is read and agent identities are resolved, before any other processing. This is the first event after `orchestration.started`.

```
bun run scripts/emit-event.ts team.resolved '{
  "orchestrationId": "<id>",
  "team": "<team-name>",
  "builderAgent": "<resolved-builder-agent>",
  "validatorAgent": "<resolved-validator-agent>"
}'
```

### Stage 6 Events (new)

#### difficulty.assessed

Emitted after difficulty scoring completes for all tasks in the decomposition.

```
bun run scripts/emit-event.ts difficulty.assessed '{
  "orchestrationId": "<id>",
  "tasks": [
    { "taskId": "<task-id>", "difficulty": "standard" },
    { "taskId": "<task-id>", "difficulty": "hard" }
  ]
}'
```

#### codex.checked

Emitted after checking Codex CLI availability.

```
bun run scripts/emit-event.ts codex.checked '{
  "orchestrationId": "<id>",
  "available": true
}'
```

#### spec.hardened

Emitted after spec hardening rewrites task descriptions.

```
bun run scripts/emit-event.ts spec.hardened '{
  "orchestrationId": "<id>",
  "tasksModified": 3,
  "summary": "Resolved file paths for 2 tasks, added concrete acceptance criteria for 1 task"
}'
```

#### codex.dispatched

Emitted when a hard task is routed to Codex CLI.

```
bun run scripts/emit-event.ts codex.dispatched '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>",
  "prompt": "<full task prompt sent to Codex>"
}'
```

#### codex.completed

Emitted when Codex CLI finishes execution (success or failure).

```
bun run scripts/emit-event.ts codex.completed '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>",
  "exitCode": 0,
  "duration": 45000
}'
```

#### codex.fallback

Emitted when Codex is unavailable or fails and the standard builder is used instead.

```
bun run scripts/emit-event.ts codex.fallback '{
  "orchestrationId": "<id>",
  "taskId": "<numeric-id>",
  "reason": "codex CLI not installed"
}'
```

### Stage 7 Events (new)

#### hitl.bounced

Emitted when a bounce-back trigger is detected, before presenting to the user.

```
bun run scripts/emit-event.ts hitl.bounced '{
  "orchestrationId": "<id>",
  "taskId": "<task-id>",
  "trigger": "scope-discovery",
  "severity": "blocking",
  "context": "<relevant excerpt from builder or validator output>"
}'
```

Fields:
- `trigger` -- one of: `conflicting-requirements`, `architectural-decision`, `scope-discovery`, `external-dependency`, `decomposition-error`, `design-concern`
- `severity` -- `blocking` or `advisory`
- `context` -- the relevant excerpt from builder or validator output that matched the detection heuristic

#### hitl.resolved

Emitted after the user provides a resolution, before the orchestrator acts on it.

```
bun run scripts/emit-event.ts hitl.resolved '{
  "orchestrationId": "<id>",
  "taskId": "<task-id>",
  "resolution": "proceed with guidance",
  "guidance": "<user free-text instruction, or empty string>"
}'
```

Fields:
- `resolution` -- one of: `proceed with guidance`, `skip this task`, `restructure tasks`, `abort orchestration`, `proceed` (advisory triggers only)
- `guidance` -- empty string if the user chose skip, restructure, or abort without additional text

#### orchestration.resumed

Emitted after hydration completes, before any tasks are dispatched.

```
bun run scripts/emit-event.ts orchestration.resumed '{
  "orchestrationId": "<id>",
  "specPath": "specs/<filename>.md",
  "restoreWave": <n>,
  "completedTasks": ["<task-id>", "<task-id>"],
  "pendingTasks": ["<task-id>", "<task-id>"],
  "bouncedTasks": [],
  "timestamp": "<ISO 8601>"
}'
```

#### checkpoint.written

Emitted after each checkpoint write to the spec file.

```
bun run scripts/emit-event.ts checkpoint.written '{
  "orchestrationId": "<id>",
  "specPath": "specs/<filename>.md",
  "currentWave": <n>,
  "timestamp": "<ISO 8601>"
}'
```

### Full Event Sequence -- Stage 3 (3-Wave Orchestration with Clarification, Fast Path Evaluation, Plan Refinement, Token Estimation, and Retry)

```
orchestration.started
team.resolved               { team: "engineering", builderAgent: "builder", validatorAgent: "validator" }

# Step 2: Clarifying Questions
clarification.started
# (user answers questions)
clarification.completed     { questionsAsked: 2 }

# Step 3: Fast Path Gate
fast_path.evaluated         { triggered: false, reason: "5 tasks, multiple files" }

# Step 4-5: Decompose and compute waves
decomposition.completed     { taskCount: 5, waveCount: 3 }

# Step 6: Write spec file
spec.written                { specPath: "specs/rest-api.md" }

# Step 7: Plan Refinement
plan.presented              { taskCount: 5, waveCount: 3 }
plan.modified               { modifications: "split implement-get-users into two tasks" }
plan.presented              { taskCount: 6, waveCount: 3 }
plan.approved

# Step 8: Token Estimation
tokens.estimated            { estimatedTokens: 27000, breakdown: { wave1: 4500, wave2: 18000, wave3: 4500 } }

# Step 9: Create all tasks
task.created                { taskId: "1", subject: "Define User types" }
task.created                { taskId: "2", subject: "Implement GET /users handler" }
task.created                { taskId: "3", subject: "Implement GET /users pagination" }
task.created                { taskId: "4", subject: "Implement POST /users" }
task.created                { taskId: "5", subject: "Implement GET /users/:id" }
task.created                { taskId: "6", subject: "Write user route tests" }

# Step 10: Execute Wave 1
spec.reread                 { waveNumber: 1 }
wave.started                { waveNumber: 1, taskIds: ["define-user-types"] }
  agent.dispatched          { role: "builder", taskId: "1", model: "sonnet" }
  agent.completed           { role: "builder", taskId: "1" }
  agent.dispatched          { role: "validator", taskId: "1", model: "haiku" }
  agent.completed           { role: "validator", taskId: "1" }
  verdict.received          { taskId: "1", verdict: "PASS" }
wave.completed              { waveNumber: 1, verdicts: { "define-user-types": "PASS" } }

# Step 10: Execute Wave 2 (one task fails and requires retry)
spec.reread                 { waveNumber: 2 }
wave.started                { waveNumber: 2, taskIds: ["implement-get-users", ...] }
  agent.dispatched          { role: "builder", taskId: "2", model: "sonnet" }
  agent.completed           { role: "builder", taskId: "2" }
  agent.dispatched          { role: "validator", taskId: "2", model: "haiku" }
  agent.completed           { role: "validator", taskId: "2" }
  verdict.received          { taskId: "2", verdict: "FAIL" }
  retry.started             { taskId: "2", attempt: 1, maxAttempts: 3 }
  agent.dispatched          { role: "builder", taskId: "2", model: "sonnet" }  # resume: agentId
  agent.completed           { role: "builder", taskId: "2" }
  agent.dispatched          { role: "validator", taskId: "2", model: "haiku" }  # fresh dispatch
  agent.completed           { role: "validator", taskId: "2" }
  verdict.received          { taskId: "2", verdict: "PASS" }
  retry.succeeded           { taskId: "2", attempt: 1 }
  # (remaining wave 2 tasks proceed normally)
  ...
wave.completed              { waveNumber: 2, verdicts: { ... } }

# Step 10: Execute Wave 3
spec.reread                 { waveNumber: 3 }
wave.started                { waveNumber: 3, taskIds: ["write-user-route-tests"] }
  ...
wave.completed              { waveNumber: 3, verdicts: { ... } }

# Steps 11-12: Update spec and report
orchestration.completed     { verdict: "PASS", taskCount: 6, retriesTotal: 1, fastPath: false, clarifyingQuestionsAsked: 2 }
```

**Fast path event sequence (trivial prompt, no clarification needed):**

```
orchestration.started
team.resolved               { team: "engineering", builderAgent: "builder", validatorAgent: "validator" }
clarification.skipped       { reason: "file and function named explicitly" }
fast_path.evaluated         { triggered: true, reason: "single file, < 5 lines" }
task.created                { taskId: "1", subject: "Add JSDoc to greet function" }
agent.dispatched            { role: "builder", taskId: "1", model: "sonnet" }
agent.completed             { role: "builder", taskId: "1" }
agent.dispatched            { role: "validator", taskId: "1", model: "haiku" }
agent.completed             { role: "validator", taskId: "1" }
verdict.received            { taskId: "1", verdict: "PASS" }
orchestration.completed     { verdict: "PASS", taskCount: 1, retriesTotal: 0, fastPath: true, clarifyingQuestionsAsked: 0 }
```

### Full Event Sequence -- Stage 6 (3-Wave Orchestration with Difficulty Routing, Spec Hardening, and Codex Dispatch)

```
orchestration.started
team.resolved               { team: "engineering", builderAgent: "builder", validatorAgent: "validator" }

# Step 2: Clarifying Questions
clarification.skipped       { reason: "prompt specifies files and scope" }

# Step 3: Fast Path Gate
fast_path.evaluated         { triggered: false, reason: "5 tasks, multiple files" }

# Step 4: Decompose
decomposition.completed     { taskCount: 5, waveCount: 3 }

# Step 4b: Difficulty Assessment
difficulty.assessed         { tasks: [{ taskId: "define-types", difficulty: "standard" }, { taskId: "refactor-auth", difficulty: "hard" }, ...] }
codex.checked               { available: true }

# Step 5-6: Compute waves, write spec
spec.written                { specPath: "specs/auth-refactor.md" }

# Step 7: Plan Refinement
plan.presented              { taskCount: 5, waveCount: 3 }
plan.approved

# Step 7b: Spec Hardening
spec.hardened               { tasksModified: 2, summary: "Resolved file paths, added concrete error responses" }

# Step 8: Token Estimation
tokens.estimated            { estimatedTokens: 22500 }

# Step 9: Create all tasks
task.created                { taskId: "1", subject: "Define auth types" }
task.created                { taskId: "2", subject: "Refactor auth module" }
...

# Step 10: Execute Wave 1 (standard task)
spec.reread                 { waveNumber: 1 }
wave.started                { waveNumber: 1, taskIds: ["define-types"] }
  agent.dispatched          { role: "builder", taskId: "1", model: "sonnet" }
  agent.completed           { role: "builder", taskId: "1" }
  agent.dispatched          { role: "validator", taskId: "1", model: "haiku" }
  agent.completed           { role: "validator", taskId: "1" }
  verdict.received          { taskId: "1", verdict: "PASS" }
wave.completed              { waveNumber: 1 }

# Step 10: Execute Wave 2 (hard task -- Codex timeout, fallback to standard builder)
spec.reread                 { waveNumber: 2 }
wave.started                { waveNumber: 2, taskIds: ["refactor-auth", ...] }
  codex.dispatched          { taskId: "2", prompt: "Refactor src/auth/auth-module.ts..." }
  codex.completed           { taskId: "2", exitCode: -1, duration: 300000 }
  codex.fallback            { taskId: "2", reason: "timeout after 300000ms" }
  agent.dispatched          { role: "builder", taskId: "2", model: "sonnet" }  -- fallback
  agent.completed           { role: "builder", taskId: "2" }
  agent.dispatched          { role: "validator", taskId: "2", model: "haiku" }
  agent.completed           { role: "validator", taskId: "2" }
  verdict.received          { taskId: "2", verdict: "PASS" }
  ...
wave.completed              { waveNumber: 2 }

# Step 10: Execute Wave 3
spec.reread                 { waveNumber: 3 }
wave.started                { waveNumber: 3, taskIds: ["write-tests"] }
  ...
wave.completed              { waveNumber: 3 }

# Steps 11-12
orchestration.completed     { verdict: "PASS", taskCount: 5, retriesTotal: 0, codexTasks: 1, codexFallbacks: 1, tasksHardened: 2 }
```

### Full Event Sequence -- Stage 7: Bounce-Back Mid-Wave

This example shows a 2-wave orchestration where a task in Wave 2 triggers a bounce-back, the user provides guidance, and execution resumes.

```
orchestration.started
team.resolved               { team: "engineering", builderAgent: "builder", validatorAgent: "validator" }
clarification.skipped       { reason: "prompt specifies files and scope" }
fast_path.evaluated         { triggered: false, reason: "4 tasks, multiple files" }
decomposition.completed     { taskCount: 4, waveCount: 2 }
difficulty.assessed         { tasks: [...] }
codex.checked               { available: false }
spec.written                { specPath: "specs/auth-refactor.md" }
plan.presented              { taskCount: 4, waveCount: 2 }
plan.approved
spec.hardened               { tasksModified: 1, summary: "Resolved file paths for 1 task" }
tokens.estimated            { estimatedTokens: 18000 }
task.created                { taskId: "1", subject: "Define auth types" }
task.created                { taskId: "2", subject: "Implement auth middleware" }
task.created                { taskId: "3", subject: "Implement session store" }
task.created                { taskId: "4", subject: "Write auth tests" }

# Wave 1 -- clean
spec.reread                 { waveNumber: 1 }
wave.started                { waveNumber: 1, taskIds: ["define-auth-types"] }
  agent.dispatched          { role: "builder", taskId: "1", model: "sonnet" }
  agent.completed           { role: "builder", taskId: "1" }
  agent.dispatched          { role: "validator", taskId: "1", model: "haiku" }
  agent.completed           { role: "validator", taskId: "1" }
  verdict.received          { taskId: "1", verdict: "PASS" }
  checkpoint.written        { currentWave: 1 }
wave.completed              { waveNumber: 1 }

# Wave 2 -- implement-auth-middleware bounces (scope-discovery trigger)
spec.reread                 { waveNumber: 2 }
wave.started                { waveNumber: 2, taskIds: ["implement-auth-middleware", "implement-session-store"] }
  agent.dispatched          { role: "builder", taskId: "2", model: "sonnet" }
  agent.completed           { role: "builder", taskId: "2" }
  # Builder output matches scope-discovery heuristic -- task status -> bounced
  hitl.bounced              { taskId: "implement-auth-middleware", trigger: "scope-discovery", severity: "blocking", context: "this also requires changes to src/session/store.ts not listed in the task" }
  checkpoint.written        { currentWave: 2 }
  # (session-store task is independent -- it continues while waiting for bounce resolution)
  agent.dispatched          { role: "builder", taskId: "3", model: "sonnet" }
  agent.completed           { role: "builder", taskId: "3" }
  agent.dispatched          { role: "validator", taskId: "3", model: "haiku" }
  agent.completed           { role: "validator", taskId: "3" }
  verdict.received          { taskId: "3", verdict: "PASS" }
  checkpoint.written        { currentWave: 2 }
  # User responds to bounce-back
  hitl.resolved             { taskId: "implement-auth-middleware", resolution: "proceed with guidance", guidance: "Expand scope to include src/session/store.ts as listed" }
  checkpoint.written        { currentWave: 2 }
  # Builder re-dispatched with guidance prepended to task description
  agent.dispatched          { role: "builder", taskId: "2", model: "sonnet" }
  agent.completed           { role: "builder", taskId: "2" }
  agent.dispatched          { role: "validator", taskId: "2", model: "haiku" }
  agent.completed           { role: "validator", taskId: "2" }
  verdict.received          { taskId: "2", verdict: "PASS" }
  checkpoint.written        { currentWave: 2 }
wave.completed              { waveNumber: 2, verdicts: { "implement-auth-middleware": "PASS", "implement-session-store": "PASS" } }

# Wave 3 -- clean
spec.reread                 { waveNumber: 3 }
wave.started                { waveNumber: 3, taskIds: ["write-auth-tests"] }
  ...
wave.completed              { waveNumber: 3 }

orchestration.completed     { verdict: "PASS", taskCount: 4, retriesTotal: 0 }
```

### Full Event Sequence -- Stage 7: Resume Flow

This example shows a resume where Wave 1 is complete and Wave 2 has one completed task and one in-progress task (the session ended mid-wave).

```
# User runs: /orchestrate --resume specs/auth-refactor.md
# Orchestrator reads spec file, finds Hydration Checkpoint

orchestration.resumed       {
                              orchestrationId: "orch-1708642800000",
                              specPath: "specs/auth-refactor.md",
                              restoreWave: 2,
                              completedTasks: ["define-auth-types", "implement-session-store"],
                              pendingTasks: ["implement-auth-middleware", "write-auth-tests"],
                              bouncedTasks: []
                            }

# Hydration: Wave 1 tasks are all completed -- skip Wave 1 entirely
# Hydration: Current Wave is 2 -- resume at Wave 2
# Hydration: implement-auth-middleware was in_progress with agentId agent-def456

spec.reread                 { waveNumber: 2 }
wave.started                { waveNumber: 2, taskIds: ["implement-auth-middleware", "implement-session-store"] }
  # implement-session-store status: completed -- skip it
  # implement-auth-middleware status: in_progress -- re-dispatch with stored agentId
  agent.dispatched          { role: "builder", taskId: "2", model: "sonnet" }  # resume: agent-def456
  agent.completed           { role: "builder", taskId: "2" }
  agent.dispatched          { role: "validator", taskId: "2", model: "haiku" }
  agent.completed           { role: "validator", taskId: "2" }
  verdict.received          { taskId: "2", verdict: "PASS" }
  checkpoint.written        { currentWave: 2 }
wave.completed              { waveNumber: 2 }

spec.reread                 { waveNumber: 3 }
wave.started                { waveNumber: 3, taskIds: ["write-auth-tests"] }
  ...
wave.completed              { waveNumber: 3 }

orchestration.completed     { verdict: "PASS", taskCount: 4, retriesTotal: 0 }
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`specs/master-plan.md`](../../../../specs/master-plan.md) | Full staged rollout roadmap; Stage 2 and Stage 3 sections describe what this reference implements |
| [`.claude/skills/orchestrator/SKILL.md`](../SKILL.md) | The SKILL.md that delegates to this reference for wave algorithm details |
| [`docs/patterns/dispatch-loop.md`](../../../../docs/patterns/dispatch-loop.md) | Stage 1 dispatch loop -- the per-task cycle this reference extends to N tasks across waves |
| [`docs/patterns/task-dag.md`](../../../../docs/patterns/task-dag.md) | Pattern doc: what a task DAG is, why it matters, sources and prior art |
| [`docs/patterns/wave-computation.md`](../../../../docs/patterns/wave-computation.md) | Pattern doc: wave computation algorithm in depth, with examples and tradeoffs |
| [`docs/patterns/spec-as-source-of-truth.md`](../../../../docs/patterns/spec-as-source-of-truth.md) | Pattern doc: why the spec file is canonical, context compaction defense, idempotency |
| [`docs/patterns/retry-with-resume.md`](../../../../docs/patterns/retry-with-resume.md) | Pattern doc: retry mechanics, why resume preserves builder context, validator independence |
| [`docs/patterns/fast-path-gate.md`](../../../../docs/patterns/fast-path-gate.md) | Pattern doc: fast path criteria, tradeoffs, when to bypass DAG decomposition |
| [`docs/patterns/iterative-refinement.md`](../../../../docs/patterns/iterative-refinement.md) | Pattern doc: plan refinement loop, clarifying questions, user-in-the-loop orchestration |
| [`docs/patterns/team-profiles.md`](../../../../docs/patterns/team-profiles.md) | Pattern doc: team profiles as agent identity bundles, resolution algorithm, extensibility |
| [`codex-escalation.md`](./codex-escalation.md) | Reference: Codex CLI availability check, invocation format, fallback protocol, and retry impact rules |
| [`docs/patterns/difficulty-routing.md`](../../../../docs/patterns/difficulty-routing.md) | Pattern doc: difficulty scoring signals, routing decision branch, Codex vs standard builder tradeoffs |
| [`docs/patterns/spec-hardening.md`](../../../../docs/patterns/spec-hardening.md) | Pattern doc: ambiguity signals, rewrite rules, audit trail, before/after examples |
| [`hitl-protocol.md`](./hitl-protocol.md) | Reference: full HITL bounce-back trigger catalog, detection heuristics, bounce-back mechanics, hydration checkpoint format, and resume protocol |
| [`docs/patterns/hitl-protocol.md`](../../../../docs/patterns/hitl-protocol.md) | Pattern doc: what HITL bounce-back is, how it works, why it is needed |
| [`docs/patterns/hydration-pattern.md`](../../../../docs/patterns/hydration-pattern.md) | Pattern doc: spec-file-based state hydration for crash recovery and idempotent resume |
