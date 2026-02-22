# Example Spec Output: Stage 2 - REST API

This is an example of what the orchestrator produces for a multi-task decomposition. In Stage 2, the orchestrator decomposes the user prompt into a dependency graph, writes a spec file before dispatching any agents, and executes tasks in wave order -- completing all tasks in a wave before starting the next.

**Stage:** 2 (Multi-Task DAG)

---

## Prompt

```
add a REST API with GET /users, POST /users, and GET /users/:id. Include types, route handlers, and tests.
```

---

## Spec File Written

`specs/rest-api.md`

The orchestrator writes this file before dispatching any agents. Agents read from it. The orchestrator updates it throughout execution. It is the source of truth at all times -- not the orchestrator's in-context memory.

---

## Complete Spec File Output

Below is the full content of `specs/rest-api.md` as written by the orchestrator, then updated through execution.

---

```markdown
# Orchestration Spec: REST API with User Routes

## Prompt

add a REST API with GET /users, POST /users, and GET /users/:id. Include types, route handlers, and tests.

## Task Graph

| Task ID | Subject | Dependencies | Wave | Status |
|---------|---------|-------------|------|--------|
| create-user-types | Define User and API response types in src/types/user.ts | (none) | 1 | completed |
| create-route-handlers | Create GET /users, POST /users, GET /users/:id handlers in src/routes/users.ts | create-user-types | 2 | completed |
| create-server-entry | Wire user routes into server entry point at src/server.ts | create-user-types | 2 | completed |
| create-test-suite | Write tests for all three user routes in tests/routes/users.test.ts | create-route-handlers | 3 | completed |

## Tasks

### create-user-types

- Subject: Define User and API response types in src/types/user.ts
- Dependencies: (none)
- Wave: 1
- Status: completed

**Description:**
Create `src/types/user.ts` exporting two types: `User` and `ApiResponse<T>`.

`User` must have these fields:
- `id: string` -- UUID string
- `name: string` -- display name
- `email: string` -- email address
- `createdAt: Date` -- creation timestamp

`ApiResponse<T>` is a generic wrapper for all API responses:
- `data: T` -- the response payload
- `error?: string` -- optional error message (present on failure, absent on success)

Requirements:
- File: `src/types/user.ts`
- Named exports only (no default exports)
- JSDoc comment on each exported type describing its purpose
- No runtime logic -- types only

**Acceptance Criteria:**
- `src/types/user.ts` exists
- `User` is exported as a named type with fields: `id`, `name`, `email`, `createdAt`
- `ApiResponse<T>` is exported as a named generic type with fields: `data` and optional `error`
- Both types have JSDoc comments
- No default exports
- File contains no runtime code (types only)

### create-route-handlers

- Subject: Create GET /users, POST /users, GET /users/:id handlers in src/routes/users.ts
- Dependencies: create-user-types
- Wave: 2
- Status: completed

**Description:**
Create `src/routes/users.ts` with in-memory route handlers for the three user endpoints. Import `User` and `ApiResponse` from `src/types/user.ts`.

Use an in-memory array as the data store (a module-level `const users: User[] = []`). Do not use a database.

**GET /users**
- Handler function: `handleGetUsers`
- Returns `ApiResponse<User[]>` with all users
- HTTP status: 200

**POST /users**
- Handler function: `handlePostUser`
- Accepts `{ name: string; email: string }` in the request body
- Generates a new `id` using `crypto.randomUUID()`
- Sets `createdAt` to `new Date()`
- Pushes the new user into the in-memory array
- Returns `ApiResponse<User>` with the created user
- HTTP status: 201

**GET /users/:id**
- Handler function: `handleGetUserById`
- Looks up user by `id` in the in-memory array
- If found: returns `ApiResponse<User>` with the user, HTTP status 200
- If not found: returns `ApiResponse<never>` with `error: 'User not found'`, HTTP status 404

Export a `router` object that maps method+path to handler:

```ts
export const router = {
  'GET /users': handleGetUsers,
  'POST /users': handlePostUser,
  'GET /users/:id': handleGetUserById,
}
```

Requirements:
- File: `src/routes/users.ts`
- Named exports: `handleGetUsers`, `handlePostUser`, `handleGetUserById`, `router`
- JSDoc on each exported function and on `router`
- Import types from `../types/user`
- No default exports

**Acceptance Criteria:**
- `src/routes/users.ts` exists
- Imports `User` and `ApiResponse` from `../types/user`
- `handleGetUsers` is exported with JSDoc
- `handlePostUser` is exported with JSDoc, generates UUID, sets createdAt
- `handleGetUserById` is exported with JSDoc, returns 404 shape when user not found
- `router` is exported as a named export mapping method+path to handler
- In-memory `users` array is module-level
- No default exports

### create-server-entry

- Subject: Wire user routes into server entry point at src/server.ts
- Dependencies: create-user-types
- Wave: 2
- Status: completed

**Description:**
Create or update `src/server.ts` to serve the user routes using Bun's built-in HTTP server (`Bun.serve`).

Import `router` from `./routes/users`. Parse incoming requests to route method+path to the correct handler. Return JSON responses with the appropriate HTTP status codes.

The server should listen on port 3000 by default, configurable via the `PORT` environment variable.

Export a `startServer` function that calls `Bun.serve` and returns the server instance. Also export a `PORT` constant.

Requirements:
- File: `src/server.ts`
- Named exports: `startServer`, `PORT`
- JSDoc on `startServer`
- Uses `Bun.serve` (not Node.js `http`)
- Routes requests by matching `${request.method} ${pathname}` against the router keys
- Returns `Response` objects with `Content-Type: application/json`
- Falls through to a 404 `{ error: 'Not found' }` response if no route matches
- No default exports

**Acceptance Criteria:**
- `src/server.ts` exists
- Imports `router` from `./routes/users`
- `startServer` is exported with JSDoc
- `PORT` constant is exported, defaults to 3000
- Server routes requests via `${method} ${pathname}` key lookup on `router`
- Unmatched routes return HTTP 404 with JSON `{ error: 'Not found' }`
- Uses `Bun.serve`, not Node `http`
- No default exports

### create-test-suite

- Subject: Write tests for GET /users, POST /users, GET /users/:id in tests/routes/users.test.ts
- Dependencies: create-route-handlers
- Wave: 3
- Status: completed

**Description:**
Create `tests/routes/users.test.ts` with a test suite for all three user route handlers. Import handler functions directly from `../../src/routes/users` -- do not start an HTTP server in tests.

Use Bun's test runner (`import { describe, it, expect, beforeEach } from 'bun:test'`).

Reset the in-memory `users` array before each test by exporting a `resetUsers` function from `src/routes/users.ts` -- add that export if the builder of `create-route-handlers` did not include it. If `resetUsers` does not exist, create it in `src/routes/users.ts` as part of this task.

**Test cases to write:**

`GET /users`
- Returns an empty array when no users exist
- Returns all users after one or more have been created

`POST /users`
- Creates a user with the given name and email
- Returns the created user with a generated `id` and `createdAt`
- The created user appears in subsequent GET /users results

`GET /users/:id`
- Returns the correct user when a valid id is provided
- Returns a 404-shaped response `{ error: 'User not found' }` when the id does not match any user

Requirements:
- File: `tests/routes/users.test.ts`
- Uses `bun:test` (not Jest, not Vitest)
- `describe` blocks per route, `it` blocks per case
- `beforeEach` resets the in-memory store
- No default exports
- No HTTP server -- test handlers directly

**Acceptance Criteria:**
- `tests/routes/users.test.ts` exists
- Uses `bun:test` imports
- Tests all three handlers: `handleGetUsers`, `handlePostUser`, `handleGetUserById`
- `beforeEach` calls `resetUsers()` or equivalent to clear state
- At least 2 test cases per handler
- No HTTP server started
- All tests pass when run with `bun test`

## Execution Log

### Wave 1

- Task `create-user-types`: builder dispatched -> builder completed -> validator dispatched -> validator completed -> VERDICT: PASS

### Wave 2

- Task `create-route-handlers`: builder dispatched -> builder completed -> validator dispatched -> validator completed -> VERDICT: PASS
- Task `create-server-entry`: builder dispatched -> builder completed -> validator dispatched -> validator completed -> VERDICT: PASS

### Wave 3

- Task `create-test-suite`: builder dispatched -> builder completed -> validator dispatched -> validator completed -> VERDICT: PASS

## Result

All 4 tasks completed successfully across 3 waves.

Files created:
- `src/types/user.ts` -- User and ApiResponse types
- `src/routes/users.ts` -- GET /users, POST /users, GET /users/:id handlers + router
- `src/server.ts` -- Bun.serve entry point wired to user routes
- `tests/routes/users.test.ts` -- full test suite, all cases passing

No tasks failed. No retries required.
```

---

## Observability Event Sequence

These events were emitted during execution (via `bun run scripts/emit-event.ts`):

```
orchestration.started       { orchestrationId: "orch-a1b2c3" }
decomposition.completed     { taskCount: 4, waveCount: 3, tasks: ["create-user-types", "create-route-handlers", "create-server-entry", "create-test-suite"] }
spec.written                { specPath: "specs/rest-api.md" }

spec.reread                 { waveNumber: 1 }
wave.started                { waveNumber: 1, taskIds: ["create-user-types"] }
  task.created              { taskId: "create-user-types" }
  agent.dispatched          { role: "builder", taskId: "create-user-types" }
  agent.completed           { role: "builder", taskId: "create-user-types" }
  agent.dispatched          { role: "validator", taskId: "create-user-types" }
  agent.completed           { role: "validator", taskId: "create-user-types" }
  verdict.received          { taskId: "create-user-types", verdict: "PASS" }
wave.completed              { waveNumber: 1, verdicts: { "create-user-types": "PASS" } }

spec.reread                 { waveNumber: 2 }
wave.started                { waveNumber: 2, taskIds: ["create-route-handlers", "create-server-entry"] }
  task.created              { taskId: "create-route-handlers" }
  agent.dispatched          { role: "builder", taskId: "create-route-handlers" }
  agent.completed           { role: "builder", taskId: "create-route-handlers" }
  agent.dispatched          { role: "validator", taskId: "create-route-handlers" }
  agent.completed           { role: "validator", taskId: "create-route-handlers" }
  verdict.received          { taskId: "create-route-handlers", verdict: "PASS" }
  task.created              { taskId: "create-server-entry" }
  agent.dispatched          { role: "builder", taskId: "create-server-entry" }
  agent.completed           { role: "builder", taskId: "create-server-entry" }
  agent.dispatched          { role: "validator", taskId: "create-server-entry" }
  agent.completed           { role: "validator", taskId: "create-server-entry" }
  verdict.received          { taskId: "create-server-entry", verdict: "PASS" }
wave.completed              { waveNumber: 2, verdicts: { "create-route-handlers": "PASS", "create-server-entry": "PASS" } }

spec.reread                 { waveNumber: 3 }
wave.started                { waveNumber: 3, taskIds: ["create-test-suite"] }
  task.created              { taskId: "create-test-suite" }
  agent.dispatched          { role: "builder", taskId: "create-test-suite" }
  agent.completed           { role: "builder", taskId: "create-test-suite" }
  agent.dispatched          { role: "validator", taskId: "create-test-suite" }
  agent.completed           { role: "validator", taskId: "create-test-suite" }
  verdict.received          { taskId: "create-test-suite", verdict: "PASS" }
wave.completed              { waveNumber: 3, verdicts: { "create-test-suite": "PASS" } }

orchestration.completed     { orchestrationId: "orch-a1b2c3", result: "PASS" }
```

---

## Example Builder and Validator Outputs

### Wave 1: create-user-types

**Builder output:**

```
Created src/types/user.ts.

Exported types:
- User: { id: string; name: string; email: string; createdAt: Date } with JSDoc
- ApiResponse<T>: { data: T; error?: string } with JSDoc

Named exports only. No runtime code.
```

**Validator output:**

```
## Validation Report

**Task:** create-user-types

### Checks
- [PASS] File exists: src/types/user.ts
- [PASS] Type exported: User
- [PASS] User has fields: id (string), name (string), email (string), createdAt (Date)
- [PASS] Type exported: ApiResponse<T>
- [PASS] ApiResponse has fields: data (T), error? (string)
- [PASS] JSDoc present on User
- [PASS] JSDoc present on ApiResponse
- [PASS] No default exports
- [PASS] No runtime code

### Issues
None

VERDICT: PASS
```

---

### Wave 2: create-route-handlers

**Builder output:**

```
Created src/routes/users.ts.

In-memory store: const users: User[] = [] at module level.

Exported handlers:
- handleGetUsers: returns ApiResponse<User[]> with all users, status 200
- handlePostUser: creates user with crypto.randomUUID() and new Date(), status 201
- handleGetUserById: looks up by id, returns 404 shape if not found
- router: maps 'GET /users', 'POST /users', 'GET /users/:id' to handlers
- resetUsers: clears the in-memory array (for test isolation)

All exports named. JSDoc on each export.
```

**Validator output:**

```
## Validation Report

**Task:** create-route-handlers

### Checks
- [PASS] File exists: src/routes/users.ts
- [PASS] Imports User and ApiResponse from ../types/user
- [PASS] handleGetUsers exported with JSDoc
- [PASS] handlePostUser exported with JSDoc
- [PASS] handleGetUserById exported with JSDoc
- [PASS] router exported mapping method+path keys to handlers
- [PASS] crypto.randomUUID() used in handlePostUser
- [PASS] new Date() used for createdAt in handlePostUser
- [PASS] handleGetUserById returns 404-shaped response for unknown id
- [PASS] resetUsers exported (test isolation helper)
- [PASS] No default exports

### Issues
None

VERDICT: PASS
```

---

### Wave 2: create-server-entry

**Builder output:**

```
Created src/server.ts.

Exports:
- PORT: defaults to process.env.PORT ?? 3000
- startServer: calls Bun.serve, routes requests by `${method} ${pathname}` key,
  returns JSON responses, falls back to 404 { error: 'Not found' } for unmatched routes

JSDoc on startServer. Named exports only.
```

**Validator output:**

```
## Validation Report

**Task:** create-server-entry

### Checks
- [PASS] File exists: src/server.ts
- [PASS] Imports router from ./routes/users
- [PASS] startServer exported with JSDoc
- [PASS] PORT constant exported, defaults to 3000
- [PASS] Uses Bun.serve (not Node http)
- [PASS] Routes by ${method} ${pathname} key lookup on router
- [PASS] Returns Content-Type: application/json responses
- [PASS] Unmatched routes return HTTP 404 with { error: 'Not found' }
- [PASS] No default exports

### Issues
None

VERDICT: PASS
```

---

### Wave 3: create-test-suite

**Builder output:**

```
Created tests/routes/users.test.ts.

Uses bun:test. Imports handleGetUsers, handlePostUser, handleGetUserById,
resetUsers from ../../src/routes/users.

describe blocks: 'GET /users', 'POST /users', 'GET /users/:id'
beforeEach: calls resetUsers() to clear in-memory store

Test cases:
  GET /users
    - returns empty array when no users exist
    - returns all users after POST /users called

  POST /users
    - creates user with provided name and email
    - returns user with generated id and createdAt timestamp
    - created user appears in GET /users results

  GET /users/:id
    - returns correct user when id matches
    - returns { error: 'User not found' } when id does not match

No HTTP server. No default exports.
```

**Validator output:**

```
## Validation Report

**Task:** create-test-suite

### Checks
- [PASS] File exists: tests/routes/users.test.ts
- [PASS] Uses bun:test imports (describe, it, expect, beforeEach)
- [PASS] Imports handleGetUsers, handlePostUser, handleGetUserById from src/routes/users
- [PASS] beforeEach calls resetUsers()
- [PASS] describe block for GET /users with 2+ test cases
- [PASS] describe block for POST /users with 2+ test cases
- [PASS] describe block for GET /users/:id with 2+ test cases
- [PASS] 404-shaped response tested for missing user
- [PASS] No HTTP server started
- [PASS] No default exports
- [PASS] bun test passes with exit code 0

### Issues
None

VERDICT: PASS
```

---

## Orchestrator Report

All 4 tasks completed across 3 waves. All validators returned VERDICT: PASS. No failures, no retries.

**Wave summary:**
- Wave 1 (1 task): `create-user-types` -- PASS
- Wave 2 (2 tasks): `create-route-handlers` -- PASS, `create-server-entry` -- PASS
- Wave 3 (1 task): `create-test-suite` -- PASS

**Files created:**
- `src/types/user.ts`
- `src/routes/users.ts`
- `src/server.ts`
- `tests/routes/users.test.ts`

---

## What Stage 2 Adds vs Stage 1

| Capability | Stage 1 | Stage 2 |
|------------|---------|---------|
| Task count | 1 | 3 or more |
| Spec file | None | Written before any agent dispatched |
| Dependency tracking | None | Explicit `dependencies` list per task |
| Wave computation | None | Kahn's algorithm assigns wave numbers |
| Execution order | Single dispatch | Wave N completes before Wave N+1 starts |
| Spec re-read | None | Re-read at each wave boundary |
| Idempotency | None | Completed tasks skipped on resume |
| Observability events | 6 events | 6 + wave.started, wave.completed, decomposition.completed, spec.written, spec.reread |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`specs/master-plan.md`](../master-plan.md) | Full staged rollout roadmap; Stage 2 section describes what this example demonstrates |
| [`.claude/skills/orchestrator/references/dag-execution.md`](../../.claude/skills/orchestrator/references/dag-execution.md) | Technical reference for wave algorithm, spec file format, idempotency rules, and observability events |
| [`specs/examples/stage-1-hello-world.md`](./stage-1-hello-world.md) | Stage 1 example -- single task dispatch, no spec file |
| [`docs/patterns/task-dag.md`](../../docs/patterns/task-dag.md) | Pattern doc: what a task DAG is, why it matters |
| [`docs/patterns/wave-computation.md`](../../docs/patterns/wave-computation.md) | Pattern doc: wave computation algorithm in depth |
| [`docs/patterns/spec-as-source-of-truth.md`](../../docs/patterns/spec-as-source-of-truth.md) | Pattern doc: why the spec file is canonical, context compaction defense |
