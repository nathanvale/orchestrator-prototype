# Codex Escalation Reference

**Introduced in: Stage 6**

**Purpose:** Technical reference for difficulty scoring, spec hardening, and Codex CLI integration. `SKILL.md` delegates to this document for difficulty classification rubric, spec hardening checklist, Codex invocation templates, fallback protocol, and Stage 6 observability events.

---

## Difficulty Scoring Rubric

Before dispatching any agents, the orchestrator scores each task as `standard` or `hard`. The score determines which builder is dispatched -- standard tasks go to the default Claude Code builder; hard tasks are routed to Codex CLI (if available).

### Hard Signals

If ANY of the following signals match, tag the task as `hard`:

- Task touches 5 or more files
- Task requires understanding complex existing code patterns (refactor, migration)
- Task involves algorithmic complexity (graph algorithms, concurrent state management)
- Task description uses words like "optimize", "refactor across", or "migrate"
- Task has 5 or more acceptance criteria
- Task requires cross-module dependency analysis

### Standard Signals

A task is `standard` when ALL of the following apply:

- Task creates new files (greenfield)
- Task modifies 1-2 files
- Task follows existing patterns (add a handler like existing ones)
- Task has clear input/output expectations

### Scoring Rule

If ANY hard signal matches, tag as `hard`; otherwise `standard`.

**The difficulty field is advisory.** The orchestrator uses judgment informed by the rubric. A task that touches 5 files but follows a simple pattern (adding JSDoc to 5 files) is still `standard`. A task that touches 2 files but requires complex algorithmic work is `hard`. When in doubt, prefer `hard` -- the cost of under-routing to Codex is a failed build; the cost of over-routing is slightly higher latency.

### Spec File Format

Each task gets a `difficulty` field in its task definition:

```
- Difficulty: standard | hard
```

The Task Graph table gains a Difficulty column:

| Task ID | Subject | Dependencies | Wave | Difficulty | Status |
|---------|---------|-------------|------|------------|--------|
| `define-user-types` | Define User types | (none) | 1 | standard | pending |
| `migrate-auth-module` | Migrate auth module to new interface | `define-user-types` | 2 | hard | pending |
| `write-auth-tests` | Write auth integration tests | `migrate-auth-module` | 3 | standard | pending |

---

## Spec Hardening Checklist

After decomposition and difficulty scoring, before writing the spec file to disk, the orchestrator audits each task description for ambiguity and rewrites any vague language to be concrete and unambiguous. This step is called spec hardening.

### Ambiguity Signals (trigger rewrite)

Any of the following in a task description signals that hardening is required:

- Vague phrases: "handle appropriately", "should work", "as needed"
- Filler language: "etc.", "similar", "and so on"
- Missing file paths: "the types file" instead of `src/types/user.ts`
- Implicit dependencies not stated: "uses the existing service" without naming the service
- Vague acceptance criteria: "works correctly", "handles edge cases"
- Unspecified error handling: "handle errors" without specifying what error response is expected

### Rewrite Rules

When an ambiguity signal is found, apply the following rules:

1. **Replace vague language with concrete expectations.** "Handle errors" becomes "Return a 400 response with `{ error: 'Invalid input', field: '<field-name>' }` when validation fails."
2. **Resolve file paths by reading the codebase.** Use Glob or Grep to find actual paths. "The types file" becomes `src/types/user.ts` after a quick search.
3. **Enumerate implicit items.** Replace "etc." with the full list. "Handle GET, POST, etc." becomes "Handle GET, POST, PUT, and DELETE."
4. **Add measurable acceptance criteria.** "Returns the correct data" becomes "Returns `{ id: string, name: string, email: string }` with status 200 for an existing user."
5. **Specify function signatures** where descriptions say "a function to..." -- name the function, its parameters, return type, and whether it is exported.
6. **Specify error responses** where descriptions say "handle errors" -- name the HTTP status code, response body shape, and which error conditions trigger it.

### Audit Trail Format

The hardening pass leaves a visible audit trail in the spec file. For each task that was modified:

- The original description is preserved in a "Pre-Hardening" subsection.
- Hardened sections are marked with a `[hardened]` annotation.

**Before/after example:**

```markdown
### migrate-auth-module

- Subject: Migrate auth module to new interface
- Difficulty: hard

**Pre-Hardening Description:**
Update the auth module to use the new interface. Handle errors appropriately
and make sure it works with the existing service. Add tests etc.

**Description [hardened]:**
Migrate `src/auth/auth-service.ts` to implement the `AuthServiceV2` interface
defined in `src/types/auth.ts`. The migration must:
- Replace all calls to `legacyVerify(token: string): boolean` with
  `verify(token: string): Promise<AuthResult>` (see `src/types/auth.ts` line 12)
- Return `{ ok: false, reason: 'invalid_token' }` when `verify` rejects
- Return `{ ok: false, reason: 'expired_token' }` when the JWT exp claim is past
- Return `{ ok: true, userId: string }` on success
- Preserve the existing `src/auth/auth-middleware.ts` call sites -- do not
  modify that file; the new interface must remain compatible with how middleware
  calls the service

**Acceptance Criteria [hardened]:**
- `src/auth/auth-service.ts` exports `AuthServiceV2` (named export, no default)
- All 3 legacy `legacyVerify` call sites in `auth-service.ts` are replaced
- `verify` returns `Promise<AuthResult>` matching the type in `src/types/auth.ts`
- `src/auth/auth-middleware.ts` is NOT modified
- Existing tests in `tests/auth.test.ts` still pass without modification
```

### Fast Path Applicability

Spec hardening also applies to fast-path tasks. Even a single task benefits from unambiguous descriptions -- a builder given "handle errors" will make different choices than one given a precise error response contract. Apply the same ambiguity signals and rewrite rules regardless of whether the task goes through the full DAG path or the fast path.

---

## Codex CLI Integration

Codex CLI is an external agentic builder that runs in `--full-auto` mode. The orchestrator treats it as an alternative builder for `hard` tasks -- the same validator always runs afterward, and the same retry protocol applies.

### Detection

Check for Codex CLI availability once at the start of orchestration, before dispatching any agents:

```bash
which codex 2>/dev/null
```

Cache the result for the session. Emit `codex.checked` event with `available: true` or `available: false`.

Do not re-check availability mid-orchestration. If Codex was available at start, assume it remains available. If it disappears mid-run, the non-zero exit code will trigger the fallback protocol.

### Invocation Template

```bash
codex exec --full-auto --json --output-last-message /tmp/codex-task-<task-id>.md --cd <project-root> "<task prompt>"
```

Replace `<task-id>` with the kebab-case task ID from the spec (e.g., `migrate-auth-module`). Replace `<project-root>` with the absolute path to the repository root.

### Task Prompt Format

The task prompt passed to Codex must be self-contained. The builder receives no other context. Include all of the following from the hardened spec:

- Full task description (post-hardening)
- All file paths (absolute or relative to project root)
- Function signatures with parameter types and return types
- All acceptance criteria, numbered
- Named exports required
- Error response shapes

**Example prompt structure:**

```
Implement the following task in the repository at <project-root>.

Task: migrate-auth-module
Subject: Migrate auth module to new interface

Description:
Migrate `src/auth/auth-service.ts` to implement the `AuthServiceV2` interface
defined in `src/types/auth.ts`. ...

Acceptance Criteria:
1. `src/auth/auth-service.ts` exports `AuthServiceV2` (named export, no default)
2. All 3 legacy `legacyVerify` call sites are replaced
3. ...

When done, update the spec file at `specs/<spec-name>.md`: set task
`migrate-auth-module` status to `completed` and append a summary of your
changes to the Execution Log.
```

### Timeout

5 minutes per task. If the Codex process has not exited after 5 minutes, send SIGTERM and enter the fallback protocol with reason `"timeout"`.

### Result Parsing

After Codex exits:

1. Read the output file at `/tmp/codex-task-<task-id>.md`.
2. Check the spec file -- if the builder updated task status to `completed`, treat as success.
3. The `--json` flag causes Codex to emit JSONL events to stdout. Parse the final event for task completion signals. Look for an event with `type: 'task_complete'` or equivalent terminal signal.
4. Extract a summary of file changes from the output for the Execution Log.

### Validator

The validator always runs via Claude Code haiku, regardless of which builder was used. The validator dispatches identically whether the builder was Claude Code sonnet or Codex CLI -- same agent, same prompt shape, same VERDICT: PASS/FAIL contract. Codex is a builder implementation detail that the validator is unaware of.

---

## Fallback Protocol

When Codex is unavailable or fails, the orchestrator falls back to the standard Claude Code builder for that task. Fallback is transparent to the user unless explicitly logged.

### Scenario 1 -- Codex Not Found

`which codex` returns empty at the availability check.

- Log `codex.fallback` event with `reason: 'codex CLI not installed'`.
- Dispatch the standard builder (`$BUILDER_AGENT`) for all tasks, regardless of difficulty rating.
- Add a note to the Execution Log: `Codex not available -- hard tasks routed to standard builder`.
- Continue normally.

### Scenario 2 -- Codex Exits Non-Zero

Codex exits with a non-zero exit code.

- Log `codex.fallback` event with `exitCode: <N>` and `reason: 'non-zero exit'`.
- Dispatch the standard builder as a retry for this task.
- The Execution Log entry reads: `codex exited <N> -- falling back to standard builder`.

### Scenario 3 -- Codex Times Out

Codex process does not exit within 5 minutes.

- Send SIGTERM to the Codex process.
- Log `codex.fallback` event with `reason: 'timeout'`.
- Dispatch the standard builder as a retry for this task.
- The Execution Log entry reads: `codex timed out after 5m -- falling back to standard builder`.

### Key Rule: Fallback Does Not Count Against the Retry Cap

Fallback is a routing fallback, not a validation failure. The retry counter on a task is ONLY incremented by VERDICT: FAIL from the validator. A Codex fallback that routes to the standard builder is attempt 0 of the normal dispatch cycle -- the standard builder runs, the validator runs, and the retry counter starts at 0 from there.

This means a hard task that hits a Codex timeout still gets the full 3-retry budget from the standard builder. The retry cap and the fallback protocol are independent mechanisms.

---

## New Observability Events

Stage 6 adds 6 new events covering the difficulty assessment, spec hardening, and Codex lifecycle. All events are emitted via Bash using the same `bun run scripts/emit-event.ts` interface.

### Stage 6 Events

#### difficulty.assessed

Emitted after the difficulty scoring pass completes for all tasks, before spec hardening begins.

```
bun run scripts/emit-event.ts difficulty.assessed '{
  "orchestrationId": "<id>",
  "tasks": [
    { "taskId": "define-user-types", "difficulty": "standard" },
    { "taskId": "migrate-auth-module", "difficulty": "hard" },
    { "taskId": "write-auth-tests", "difficulty": "standard" }
  ]
}'
```

#### spec.hardened

Emitted after the spec hardening pass completes. `tasksModified` is the count of tasks whose descriptions were rewritten. If no tasks required hardening, `tasksModified` is 0 and the event is still emitted (signals the pass ran cleanly).

```
bun run scripts/emit-event.ts spec.hardened '{
  "orchestrationId": "<id>",
  "tasksModified": 2,
  "summary": "Resolved file paths in migrate-auth-module; added error response shapes in write-auth-tests"
}'
```

#### codex.checked

Emitted once at the start of orchestration, after `team.resolved` and before difficulty assessment. Records whether Codex CLI is available for this session.

```
bun run scripts/emit-event.ts codex.checked '{
  "orchestrationId": "<id>",
  "available": true
}'
```

#### codex.dispatched

Emitted when the orchestrator routes a hard task to Codex CLI. Includes the full prompt so the execution log captures what Codex was asked to do.

```
bun run scripts/emit-event.ts codex.dispatched '{
  "orchestrationId": "<id>",
  "taskId": "migrate-auth-module",
  "prompt": "Implement the following task in the repository..."
}'
```

#### codex.completed

Emitted when the Codex process exits cleanly (exit code 0) within the timeout window. `duration` is wall-clock milliseconds.

```
bun run scripts/emit-event.ts codex.completed '{
  "orchestrationId": "<id>",
  "taskId": "migrate-auth-module",
  "exitCode": 0,
  "duration": 87432
}'
```

#### codex.fallback

Emitted when the orchestrator falls back from Codex to the standard builder. `reason` is one of `'codex CLI not installed'`, `'non-zero exit'`, or `'timeout'`.

```
bun run scripts/emit-event.ts codex.fallback '{
  "orchestrationId": "<id>",
  "taskId": "migrate-auth-module",
  "reason": "timeout"
}'
```

### Full Stage 6 Event Sequence (hard task with Codex, plus one fallback)

```
orchestration.started
team.resolved               { team: 'engineering', builderAgent: 'builder', validatorAgent: 'validator' }
codex.checked               { available: true }

# Clarification + fast path gate (unchanged from Stage 4)
clarification.skipped       { reason: 'files and strategy specified' }
fast_path.evaluated         { triggered: false, reason: '3 tasks, multiple files' }

# Decompose, score, harden
decomposition.completed     { taskCount: 3, waveCount: 2 }
difficulty.assessed         { tasks: [{ taskId: 'define-user-types', difficulty: 'standard' }, { taskId: 'migrate-auth-module', difficulty: 'hard' }, { taskId: 'write-auth-tests', difficulty: 'standard' }] }
spec.hardened               { tasksModified: 1, summary: 'Resolved implicit file paths in migrate-auth-module' }
spec.written                { specPath: 'specs/auth-migration.md' }

# Plan + estimate (unchanged from Stage 4)
plan.presented              { taskCount: 3, waveCount: 2 }
plan.approved
tokens.estimated            { estimatedTokens: 13500, breakdown: { wave1: 4500, wave2: 9000 } }

# Create tasks
task.created                { taskId: '1', subject: 'Define User types' }
task.created                { taskId: '2', subject: 'Migrate auth module' }
task.created                { taskId: '3', subject: 'Write auth tests' }

# Wave 1 (standard task -> standard builder)
spec.reread                 { waveNumber: 1 }
wave.started                { waveNumber: 1, taskIds: ['define-user-types'] }
  agent.dispatched          { role: 'builder', taskId: '1', model: 'sonnet' }
  agent.completed           { role: 'builder', taskId: '1' }
  agent.dispatched          { role: 'validator', taskId: '1', model: 'haiku' }
  agent.completed           { role: 'validator', taskId: '1' }
  verdict.received          { taskId: '1', verdict: 'PASS' }
wave.completed              { waveNumber: 1, verdicts: { 'define-user-types': 'PASS' } }

# Wave 2 (hard task -> Codex, times out, falls back to standard builder)
spec.reread                 { waveNumber: 2 }
wave.started                { waveNumber: 2, taskIds: ['migrate-auth-module', 'write-auth-tests'] }
  codex.dispatched          { taskId: 'migrate-auth-module', prompt: '...' }
  codex.fallback            { taskId: 'migrate-auth-module', reason: 'timeout' }
  agent.dispatched          { role: 'builder', taskId: '2', model: 'sonnet' }  # fallback builder
  agent.completed           { role: 'builder', taskId: '2' }
  agent.dispatched          { role: 'validator', taskId: '2', model: 'haiku' }
  agent.completed           { role: 'validator', taskId: '2' }
  verdict.received          { taskId: '2', verdict: 'PASS' }
  agent.dispatched          { role: 'builder', taskId: '3', model: 'sonnet' }  # standard task
  agent.completed           { role: 'builder', taskId: '3' }
  agent.dispatched          { role: 'validator', taskId: '3', model: 'haiku' }
  agent.completed           { role: 'validator', taskId: '3' }
  verdict.received          { taskId: '3', verdict: 'PASS' }
wave.completed              { waveNumber: 2, verdicts: { 'migrate-auth-module': 'PASS', 'write-auth-tests': 'PASS' } }

orchestration.completed     { verdict: 'PASS', taskCount: 3, retriesTotal: 0, fastPath: false, clarifyingQuestionsAsked: 0 }
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`.claude/skills/orchestrator/SKILL.md`](../SKILL.md) | The SKILL.md that delegates to this reference for difficulty routing and Codex invocation |
| [`dag-execution.md`](./dag-execution.md) | Wave algorithm, spec file format, retry protocol, fast path, and all Stage 1-4 events |
| [`docs/patterns/difficulty-routing.md`](../../../../docs/patterns/difficulty-routing.md) | Pattern doc: difficulty scoring rationale, routing decisions, Codex as an alternative builder |
| [`docs/patterns/spec-hardening.md`](../../../../docs/patterns/spec-hardening.md) | Pattern doc: why ambiguous specs cause builder failures, hardening as a pre-flight pass |
| [`specs/master-plan.md`](../../../../specs/master-plan.md) | Full staged roadmap; Stage 6 section describes what this reference implements |
