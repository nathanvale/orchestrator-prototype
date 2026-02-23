# Example Spec Output: Stage 8 - Parallel Wave Dispatch

This is an example of what the orchestrator produces when parallel dispatch fires for a multi-task wave. In Stage 8, tasks within a wave are dispatched concurrently -- each builder runs in an isolated git worktree. Results are merged after all builders complete, then validators run on the merged state.

**Stage:** 8 (Parallel Wave Execution + Worktree Isolation)

---

## Prompt

```
/orchestrate "add four HTTP handlers: GET /users, POST /users, DELETE /users/:id, and GET /health. Each handler in its own file under src/routes/. Shared types in src/types/api.ts."
```

---

## Execution Summary

**Wave 1:** 1 task (sequential -- single task, no parallelism benefit)
**Wave 2:** 4 tasks (parallel -- all 4 builders launched concurrently)
**Wave 3:** 1 task (sequential -- test suite depends on all wave 2 tasks)

Total worktrees created: 4
Parallel waves: 1
Sequential fallbacks (conflicts): 0

---

## Spec File Written

`specs/api-handlers.md`

---

## Complete Spec File Output

Below is the full content of `specs/api-handlers.md` as written by the orchestrator, then updated through execution.

---

```markdown
# Orchestration Spec: API Handlers

## Prompt

add four HTTP handlers: GET /users, POST /users, DELETE /users/:id, and GET /health. Each handler in its own file under src/routes/. Shared types in src/types/api.ts.

## Team

engineering (builder: builder, validator: validator)

## Routing

Codex enabled: true
Codex available: false

## Task Graph

| Task ID | Subject | Dependencies | Wave | Difficulty | Status |
|---------|---------|-------------|------|------------|--------|
| define-api-types | Define ApiResponse and User types in src/types/api.ts | (none) | 1 | standard | completed |
| add-get-users | Add GET /users handler in src/routes/users-get.ts | define-api-types | 2 | standard | completed |
| add-post-users | Add POST /users handler in src/routes/users-post.ts | define-api-types | 2 | standard | completed |
| add-delete-user | Add DELETE /users/:id handler in src/routes/users-delete.ts | define-api-types | 2 | standard | completed |
| add-health-check | Add GET /health handler in src/routes/health.ts | (none) | 2 | standard | completed |
| write-route-tests | Write integration tests for all four routes in tests/routes.test.ts | add-get-users, add-post-users, add-delete-user, add-health-check | 3 | standard | completed |

## Tasks

### define-api-types

- Subject: Define ApiResponse and User types in src/types/api.ts
- Dependencies: (none)
- Wave: 1
- Difficulty: standard
- Status: completed
- Retries: 0

**Description:**
Create `src/types/api.ts` with two named exports: `User` and `ApiResponse<T>`.

`User`:
- `id: string` -- UUID
- `name: string` -- display name
- `email: string` -- email address

`ApiResponse<T>`:
- `data: T` -- response payload
- `error?: string` -- optional error (absent on success, present on failure)

No runtime logic. Types only. JSDoc on each exported type.

**Acceptance Criteria:**
- `src/types/api.ts` exists with named exports `User` and `ApiResponse<T>`
- Both types have JSDoc comments
- No default exports

### add-get-users

- Subject: Add GET /users handler in src/routes/users-get.ts
- Dependencies: define-api-types
- Wave: 2
- Difficulty: standard
- Status: completed
- Retries: 0

**Description:**
Create `src/routes/users-get.ts` with a named export `handleGetUsers`.

Import `User` and `ApiResponse` from `../types/api.ts`.

The handler returns a mock response (no database required):
- Status 200
- Body: `ApiResponse<User[]>` with 2 hardcoded users
- Content-Type: application/json

**Acceptance Criteria:**
- `src/routes/users-get.ts` exists
- `handleGetUsers` is a named export with JSDoc
- Returns status 200 with `ApiResponse<User[]>`

### add-post-users

- Subject: Add POST /users handler in src/routes/users-post.ts
- Dependencies: define-api-types
- Wave: 2
- Difficulty: standard
- Status: completed
- Retries: 0

**Description:**
Create `src/routes/users-post.ts` with a named export `handlePostUsers`.

Import `User` and `ApiResponse` from `../types/api.ts`.

The handler creates a new user from the request body:
- Status 201 on success
- Body: `ApiResponse<User>` with the created user (generate a UUID id)
- Status 400 with `ApiResponse<null>` if name or email is missing

**Acceptance Criteria:**
- `src/routes/users-post.ts` exists
- `handlePostUsers` is a named export with JSDoc
- Returns 201 with new user on valid body
- Returns 400 on missing fields

### add-delete-user

- Subject: Add DELETE /users/:id handler in src/routes/users-delete.ts
- Dependencies: define-api-types
- Wave: 2
- Difficulty: standard
- Status: completed
- Retries: 0

**Description:**
Create `src/routes/users-delete.ts` with a named export `handleDeleteUser`.

Import `ApiResponse` from `../types/api.ts`.

The handler:
- Status 200 with `ApiResponse<{ deleted: true, id: string }>` on success
- Status 404 with `ApiResponse<null>` if id is not found (mock: any id not equal to "1" or "2" is not found)

**Acceptance Criteria:**
- `src/routes/users-delete.ts` exists
- `handleDeleteUser` is a named export with JSDoc
- Returns 200 on known id, 404 on unknown id

### add-health-check

- Subject: Add GET /health handler in src/routes/health.ts
- Dependencies: (none)
- Wave: 2
- Difficulty: standard
- Status: completed
- Retries: 0

**Description:**
Create `src/routes/health.ts` with a named export `handleHealth`.

No imports from `src/types/api.ts` needed -- health check returns a plain object.

Response: status 200, body `{ status: "ok", uptime: process.uptime() }`

**Acceptance Criteria:**
- `src/routes/health.ts` exists
- `handleHealth` is a named export with JSDoc
- Returns 200 with `{ status: "ok", uptime: <number> }`

### write-route-tests

- Subject: Write integration tests for all four routes
- Dependencies: add-get-users, add-post-users, add-delete-user, add-health-check
- Wave: 3
- Difficulty: standard
- Status: completed
- Retries: 0

**Description:**
Create `tests/routes.test.ts` with tests for all four handlers.

Import each handler from `src/routes/`. Call each handler with a mock request object.

Tests:
- GET /users: status 200, body contains 2 users
- POST /users (valid): status 201, body contains new user with id
- POST /users (missing email): status 400
- DELETE /users/1: status 200, body.data.deleted === true
- DELETE /users/999: status 404
- GET /health: status 200, body.status === "ok"

**Acceptance Criteria:**
- `tests/routes.test.ts` exists
- All 6 test cases pass with `bun test`

## Execution Log

### Wave 1

**define-api-types** -- PASS

Builder completed. Created `src/types/api.ts` with `User` and `ApiResponse<T>` types. Both have JSDoc comments. No default exports.

Validator verdict: VERDICT: PASS

### Wave 2 (Parallel Dispatch)

Dispatch strategy: PARALLEL (4 tasks, SEQUENTIAL_MODE=false)

All 4 builders dispatched concurrently with worktree isolation.

Worktrees created:
- `/tmp/hop-w2-add-get-users` -- builder for add-get-users
- `/tmp/hop-w2-add-post-users` -- builder for add-post-users
- `/tmp/hop-w2-add-delete-user` -- builder for add-delete-user
- `/tmp/hop-w2-add-health-check` -- builder for add-health-check

All 4 builders completed. No bounce-back triggers detected.

Merge results (in task-id order):
- `add-get-users` diff applied cleanly
- `add-post-users` diff applied cleanly
- `add-delete-user` diff applied cleanly
- `add-health-check` diff applied cleanly
- No conflicts detected

All 4 validators dispatched concurrently on merged state.

Verdicts:
- add-get-users: VERDICT: PASS
- add-post-users: VERDICT: PASS
- add-delete-user: VERDICT: PASS
- add-health-check: VERDICT: PASS

wave.parallel_complete: { parallelTasks: 4, conflictTasks: 0, sequentialFallbacks: 0 }

### Wave 3

**write-route-tests** -- PASS

Builder completed. Created `tests/routes.test.ts` with 6 test cases. All tests pass.

Validator verdict: VERDICT: PASS

## Result

All 6 tasks completed across 3 waves.

Team: engineering (builder: builder, validator: validator)

Execution summary:
- Tasks passed on first attempt: 6
- Tasks passed after retry: 0
- Tasks skipped after retry exhaustion: 0
- Total retries performed: 0
- Tasks routed to Codex: 0
- Codex fallbacks to standard builder: 0
- Tasks hardened during spec hardening: 2
- Bounce-backs: 0 total
- Bounce resolutions: 0 proceeded with guidance, 0 restructured, 0 skipped
- parallelWaves: 1
- sequentialFallbacks: 0
- totalWorktrees: 4

Files created or modified:
- `src/types/api.ts` -- User and ApiResponse types
- `src/routes/users-get.ts` -- GET /users handler
- `src/routes/users-post.ts` -- POST /users handler
- `src/routes/users-delete.ts` -- DELETE /users/:id handler
- `src/routes/health.ts` -- GET /health handler
- `tests/routes.test.ts` -- integration tests for all four routes

Fast path: no
Clarifying questions asked: 0
Resumed from: (not a resumed run)

## Hydration Checkpoint

```yaml
orchestration_id: orch-1708732800000
team: engineering
current_wave: completed
status: completed
agent_sessions: {}
retry_state:
  define-api-types: { attempts: 0, last_verdict: "PASS" }
  add-get-users: { attempts: 0, last_verdict: "PASS" }
  add-post-users: { attempts: 0, last_verdict: "PASS" }
  add-delete-user: { attempts: 0, last_verdict: "PASS" }
  add-health-check: { attempts: 0, last_verdict: "PASS" }
  write-route-tests: { attempts: 0, last_verdict: "PASS" }
bounce_history: []
codex_available: false
sequential_mode: false
parallel_waves: 1
total_worktrees: 4
sequential_fallbacks: 0
timestamp: 2026-02-23T12:00:00.000Z
```
```

---

## Event Log

```
team.resolved               { team: "engineering", builderAgent: "builder", validatorAgent: "validator" }
orchestration.started       { prompt: "add four HTTP handlers...", team: "engineering" }
clarification.skipped       { reason: "file paths specified, handler signatures clear" }
fast_path.evaluated         { triggered: false, reason: "6 tasks across 3 waves" }
decomposition.completed     { taskCount: 6, waveCount: 3 }
difficulty.assessed         { tasks: [{ taskId: "define-api-types", difficulty: "standard" }, ...] }
codex.checked               { available: false, noCodexFlag: false }
spec.written                { specPath: "specs/api-handlers.md", team: "engineering" }
checkpoint.written          { currentWave: 1 }
plan.presented              { taskCount: 6, waveCount: 3, team: "engineering" }
plan.approved               { orchestrationId: "orch-1708732800000" }
spec.hardened               { tasksModified: 2, summary: "added explicit error responses to POST and DELETE handlers" }
tokens.estimated            { estimatedTokens: 27000, breakdown: { wave1: 4500, wave2: 18000, wave3: 4500 } }

task.created                { taskId: "1", subject: "Define ApiResponse and User types" }
task.created                { taskId: "2", subject: "Add GET /users handler" }
task.created                { taskId: "3", subject: "Add POST /users handler" }
task.created                { taskId: "4", subject: "Add DELETE /users/:id handler" }
task.created                { taskId: "5", subject: "Add GET /health handler" }
task.created                { taskId: "6", subject: "Write integration tests" }

spec.reread                 { waveNumber: 1 }
wave.started                { waveNumber: 1, taskIds: ["define-api-types"] }
  -- 1 task: sequential dispatch
  agent.dispatched          { role: "builder", taskId: "1", model: "sonnet" }
  checkpoint.written        { currentWave: 1 }
  agent.completed           { role: "builder", taskId: "1" }
  agent.dispatched          { role: "validator", taskId: "1", model: "haiku" }
  agent.completed           { role: "validator", taskId: "1" }
  verdict.received          { taskId: "1", verdict: "PASS" }
  checkpoint.written        { currentWave: 1 }
wave.completed              { waveNumber: 1, verdicts: { "define-api-types": "PASS" } }
checkpoint.written          { currentWave: 2 }

spec.reread                 { waveNumber: 2 }
wave.started                { waveNumber: 2, taskIds: ["add-get-users", "add-post-users", "add-delete-user", "add-health-check"] }
  -- 4 tasks, SEQUENTIAL_MODE=false: parallel dispatch
  wave.parallel_start       { waveNumber: 2, taskIds: [...], taskCount: 4 }
  agent.dispatched          { role: "builder", taskId: "2", model: "sonnet", isolation: "worktree" }
  agent.dispatched          { role: "builder", taskId: "3", model: "sonnet", isolation: "worktree" }
  agent.dispatched          { role: "builder", taskId: "4", model: "sonnet", isolation: "worktree" }
  agent.dispatched          { role: "builder", taskId: "5", model: "sonnet", isolation: "worktree" }
  -- all 4 builders running concurrently ...
  agent.completed           { role: "builder", taskId: "2" }
  agent.completed           { role: "builder", taskId: "3" }
  agent.completed           { role: "builder", taskId: "4" }
  agent.completed           { role: "builder", taskId: "5" }
  -- merge worktree diffs in task-id order (all clean)
  -- bounce-back detection: no triggers in any builder output
  agent.dispatched          { role: "validator", taskId: "2", model: "haiku", isolation: "worktree" }
  agent.dispatched          { role: "validator", taskId: "3", model: "haiku", isolation: "worktree" }
  agent.dispatched          { role: "validator", taskId: "4", model: "haiku", isolation: "worktree" }
  agent.dispatched          { role: "validator", taskId: "5", model: "haiku", isolation: "worktree" }
  agent.completed           { role: "validator", taskId: "2" }
  agent.completed           { role: "validator", taskId: "3" }
  agent.completed           { role: "validator", taskId: "4" }
  agent.completed           { role: "validator", taskId: "5" }
  verdict.received          { taskId: "2", verdict: "PASS" }
  verdict.received          { taskId: "3", verdict: "PASS" }
  verdict.received          { taskId: "4", verdict: "PASS" }
  verdict.received          { taskId: "5", verdict: "PASS" }
  wave.parallel_complete    { waveNumber: 2, parallelTasks: 4, conflictTasks: 0, sequentialFallbacks: 0 }
wave.completed              { waveNumber: 2, verdicts: { "add-get-users": "PASS", "add-post-users": "PASS", "add-delete-user": "PASS", "add-health-check": "PASS" } }
checkpoint.written          { currentWave: 3 }

spec.reread                 { waveNumber: 3 }
wave.started                { waveNumber: 3, taskIds: ["write-route-tests"] }
  -- 1 task: sequential dispatch
  agent.dispatched          { role: "builder", taskId: "6", model: "sonnet" }
  checkpoint.written        { currentWave: 3 }
  agent.completed           { role: "builder", taskId: "6" }
  agent.dispatched          { role: "validator", taskId: "6", model: "haiku" }
  agent.completed           { role: "validator", taskId: "6" }
  verdict.received          { taskId: "6", verdict: "PASS" }
  checkpoint.written        { currentWave: 3 }
wave.completed              { waveNumber: 3, verdicts: { "write-route-tests": "PASS" } }
checkpoint.written          { currentWave: "completed" }

orchestration.completed     { verdict: "PASS", team: "engineering", taskCount: 6, retriesTotal: 0,
                              fastPath: false, clarifyingQuestionsAsked: 0, codexTasks: 0,
                              codexFallbacks: 0, tasksHardened: 2, bounceBackTotal: 0,
                              parallelWaves: 1, totalWorktrees: 4, sequentialFallbacks: 0,
                              resumed: false }
```
