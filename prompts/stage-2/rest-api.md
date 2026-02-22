# Test Prompt: REST API

**Stage:** 2 (Multi-Task DAG)
**Complexity:** Medium -- multi-file, multi-task, dependencies required

---

## Prompt

```
add a REST API with GET /users, POST /users, and GET /users/:id. Include types, route handlers, and tests.
```

---

## Expected Behavior

1. **Orchestrator** decomposes the prompt into 3-5 tasks with explicit dependency relationships. Types must exist before handlers can be written. All handlers must exist before tests can be written. The dependency graph has a natural 3-wave structure.

2. **Spec file** is written to `specs/rest-api.md` before any agent is dispatched. The spec contains the full task graph table with wave assignments, per-task descriptions with acceptance criteria, and an empty Execution Log.

3. **Wave 1** executes: the types/foundation task runs first (no dependencies). Builder creates the type definitions, Validator checks them, verdict reported.

4. **Wave 2** executes: the three route handler tasks run sequentially (each depends on Wave 1). Builder implements each handler, Validator checks each one in turn.

5. **Wave 3** executes: the test task runs last (depends on all three handlers). Builder writes the tests, Validator checks coverage and structure.

6. **Final report** summarizes all three waves, all task verdicts (task-id and PASS/FAIL per task), and the files created.

---

## What to Look For

**Decomposition:**

- Task IDs are descriptive kebab-case -- `define-user-types`, `implement-get-users`, `implement-post-users`, `implement-get-user-by-id`, `write-user-route-tests` -- not generic like `task-1`, `task-2`
- Dependencies are explicit: handler tasks list `define-user-types` in their dependencies; the test task lists all three handler task IDs
- Wave assignments match the dependency structure: types in Wave 1, handlers in Wave 2, tests in Wave 3
- At least 3 tasks (per Stage 2 minimum), realistically 4-5 for this prompt

**Spec file:**

- Written to `specs/rest-api.md` before the first agent is dispatched
- Task Graph table lists all tasks with their dependencies, wave numbers, and `pending` status
- Per-task descriptions are self-contained -- a builder reading only the spec can implement the task without reading the user prompt
- Acceptance criteria are specific and verifiable (e.g., "returns 200 with `{ id, name, email }` for GET /users/:id with a valid ID", not "works correctly")

**Wave execution:**

- `spec.reread` is emitted before each wave starts -- check for 3 `spec.reread` events across the run
- `wave.started` emits the correct task IDs for each wave
- Within each wave, tasks execute sequentially: builder dispatched -> builder completed -> validator dispatched -> validator completed -> verdict -> next task
- If any validator returns `VERDICT: FAIL`, execution stops immediately -- subsequent tasks are NOT dispatched

**Observability events (in order):**

```
orchestration.started
decomposition.completed   { taskCount: 4-5, waveCount: 3 }
spec.written              { specPath: "specs/rest-api.md" }

spec.reread               { waveNumber: 1 }
wave.started              { waveNumber: 1 }
  agent.dispatched / agent.completed (builder)
  agent.dispatched / agent.completed (validator)
  verdict.received        { verdict: "PASS" }
wave.completed            { waveNumber: 1 }

spec.reread               { waveNumber: 2 }
wave.started              { waveNumber: 2 }
  ... (one builder+validator cycle per handler task)
wave.completed            { waveNumber: 2 }

spec.reread               { waveNumber: 3 }
wave.started              { waveNumber: 3 }
  ...
wave.completed            { waveNumber: 3 }

orchestration.completed
```

**What NOT to see:**

- The orchestrator writing any files itself (it dispatches agents only)
- Tasks in Wave 2 starting before Wave 1 completes
- The test task starting before all handler tasks complete
- A `spec.reread` event missing at any wave boundary

---

## Why This Prompt

This is the verification prompt from Stage 2 in `specs/master-plan.md`. It is the canonical test for the three capabilities Stage 2 introduces:

- **Task decomposition** -- the prompt has a natural DAG structure the orchestrator must discover
- **Wave computation** -- Kahn's algorithm produces a 3-wave result for this dependency graph
- **Spec-as-source-of-truth** -- the spec file must be written before agents run and re-read at each wave boundary

The REST API prompt also provides the concrete example in `dag-execution.md` (the wave computation table). If the orchestrator produces the same wave assignments as the example in the reference doc, wave computation is working correctly.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 2 verification section -- this prompt is the primary verification case |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | The 8-step dispatch protocol being exercised here |
| [`.claude/skills/orchestrator/references/dag-execution.md`](../../.claude/skills/orchestrator/references/dag-execution.md) | Wave algorithm details, spec file format, observability events |
| [`prompts/stage-2/cli-tool.md`](cli-tool.md) | Second Stage 2 test prompt -- different DAG shape, validates decomposition is prompt-driven |
