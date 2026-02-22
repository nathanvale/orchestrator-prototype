# Example Spec Output: Stage 6 Codex Routing

**Stage:** 6
**Demonstrates:** Difficulty tags, spec hardening annotations, Codex routing in execution log

This is an example of what a Stage 6 spec file looks like after execution. Note the `Difficulty` column in the task graph, `[hardened]` annotations in task descriptions, and Codex dispatch entries in the execution log.

---

## Orchestration Spec: Auth Module Refactor

### Prompt

Refactor the auth module from class-based to functional. Update all imports and tests.

### Task Graph

| Task ID | Subject | Dependencies | Wave | Difficulty | Status |
|---------|---------|-------------|------|------------|--------|
| `define-auth-types` | Define auth function types | (none) | 1 | standard | completed |
| `refactor-auth-service` | Refactor AuthService to functions | `define-auth-types` | 2 | hard | completed |
| `update-auth-imports` | Update imports in routes and middleware | `refactor-auth-service` | 3 | standard | completed |
| `update-auth-tests` | Update auth test suite | `refactor-auth-service` | 3 | standard | completed |

### Tasks

#### define-auth-types

- Subject: Define auth function types in src/types/auth.ts
- Dependencies: (none)
- Wave: 1
- Difficulty: standard
- Status: completed
- Retries: 0

**Description:**
Create type definitions for the functional auth module in `src/types/auth.ts`. Export types for `AuthenticateResult`, `TokenPayload`, and `AuthConfig`.

**Acceptance Criteria:**
- `src/types/auth.ts` exports `AuthenticateResult`, `TokenPayload`, `AuthConfig`
- All types use named exports
- JSDoc on each exported type

#### refactor-auth-service

- Subject: Refactor AuthService class to pure functions
- Dependencies: define-auth-types
- Wave: 2
- Difficulty: hard
- Status: completed
- Retries: 0

**Pre-Hardening:**
> Refactor AuthService to pure functions. Handle errors appropriately.

**Description:** [hardened]
Refactor `src/services/auth-service.ts` from class-based `AuthService` to individually exported pure functions: `authenticate(credentials: Credentials): Promise<AuthenticateResult>`, `validateToken(token: string): Promise<TokenPayload>`, `refreshToken(token: string): Promise<string>`. On invalid credentials, throw `AuthenticationError`. On expired token, throw `TokenExpiredError`. Remove the `AuthService` class export.

**Acceptance Criteria:** [hardened]
- `src/services/auth-service.ts` exports `authenticate`, `validateToken`, `refreshToken` as named functions
- No `class AuthService` in the file
- `authenticate` throws `AuthenticationError` on invalid credentials
- `validateToken` throws `TokenExpiredError` on expired token
- All functions have JSDoc

#### update-auth-imports

- Subject: Update auth imports in routes and middleware
- Dependencies: refactor-auth-service
- Wave: 3
- Difficulty: standard
- Status: completed
- Retries: 0

**Description:**
Update `src/routes/auth-routes.ts` and `src/middleware/auth-middleware.ts` to import individual functions instead of `AuthService` class.

**Acceptance Criteria:**
- No remaining `AuthService` imports in auth-routes.ts or auth-middleware.ts
- Functions called directly (not via class instance)

#### update-auth-tests

- Subject: Update auth test suite for functional API
- Dependencies: refactor-auth-service
- Wave: 3
- Difficulty: standard
- Status: completed
- Retries: 0

**Description:**
Update `tests/services/auth-service.test.ts` to test individual exported functions instead of class methods.

**Acceptance Criteria:**
- Tests import individual functions, not `AuthService` class
- All existing test cases preserved (same scenarios, different API)
- `bun test tests/services/auth-service.test.ts` passes

### Execution Log

#### Wave 1

- Task `define-auth-types`: builder dispatched -> builder completed -> validator dispatched -> validator completed -> VERDICT: PASS

#### Wave 2

- Task `refactor-auth-service` (difficulty: hard):
  - Codex CLI dispatched (`codex exec --full-auto`)
  - Codex completed (exit code: 0, duration: 38s)
  - Validator dispatched -> validator completed -> VERDICT: PASS

#### Wave 3

- Task `update-auth-imports`: builder dispatched -> builder completed -> validator dispatched -> validator completed -> VERDICT: PASS
- Task `update-auth-tests`: builder dispatched -> builder completed -> validator dispatched -> validator completed -> VERDICT: PASS

### Result

All 4 tasks completed across 3 waves.

Execution summary:
- Tasks passed on first attempt: 4
- Tasks passed after retry: 0
- Tasks skipped: 0
- Total retries: 0
- Tasks routed to Codex: 1 (refactor-auth-service)
- Codex fallbacks: 0
- Tasks hardened: 1 (refactor-auth-service)

Difficulty breakdown:
- Standard tasks: 3
- Hard tasks: 1

Files created or modified:
- `src/types/auth.ts` -- new type definitions
- `src/services/auth-service.ts` -- refactored from class to functions
- `src/routes/auth-routes.ts` -- updated imports
- `src/middleware/auth-middleware.ts` -- updated imports
- `tests/services/auth-service.test.ts` -- updated tests

Fast path: no
Clarifying questions asked: 0
