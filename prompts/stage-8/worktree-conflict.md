# Stage 8 Test Prompt: Worktree Conflict Resolution

**Purpose:** Test that the orchestrator detects a merge conflict when two parallel builders modify the same file, and automatically falls back to sequential re-execution for the conflicting task.

---

## Setup

This test intentionally creates a scenario where two builders in the same wave will both modify `src/config.ts` (or a similarly shared file). The orchestrator should detect the conflict at merge time and re-run the conflicting task sequentially.

Before running, create a shared config file that both tasks will need to modify:

```typescript
// src/config.ts
export const config = {
  port: 3000,
  host: 'localhost'
}
```

---

## Prompt

```
/orchestrate "add a GET /users handler in src/routes/users.ts that reads config.port from src/config.ts, AND add a GET /products handler in src/routes/products.ts that reads config.host from src/config.ts. Both handlers must import config directly. Also update src/config.ts to add a database connection string field."
```

---

## Expected Behavior

1. **Decomposition**: The orchestrator creates at least 3 tasks:
   - `add-users-route` -- creates `src/routes/users.ts`, reads `src/config.ts`
   - `add-products-route` -- creates `src/routes/products.ts`, reads `src/config.ts`
   - `update-config` -- adds `dbUrl` field to `src/config.ts`

2. **Wave assignment**: `add-users-route` and `add-products-route` may both land in the same wave (if `update-config` is a dependency of both, they'll be in Wave 2 or later -- both in the same wave). If the orchestrator correctly identifies that both routes need to read `src/config.ts`, it may put `update-config` in Wave 1 and the routes in Wave 2. Either way, the two route tasks should be in the same wave.

3. **Parallel dispatch**: Both route tasks dispatched concurrently with worktree isolation. Each builder modifies `src/config.ts` in its worktree to add its own import or usage.

4. **Conflict detected at merge time**:
   - `add-users-route` worktree diff applied first -- clean apply
   - `add-products-route` worktree diff applied second -- `git apply` fails (both modified `src/config.ts`)
   - `wave.conflict_detected` emitted with `conflictingTasks: ["add-products-route"]`

5. **Sequential fallback**:
   - `add-products-route` re-dispatched sequentially in the main working tree (after `add-users-route` is already merged)
   - Builder sees the merged state of `src/config.ts` and implements correctly
   - `wave.conflict_resolved` emitted

6. **wave.parallel_complete** shows: `parallelTasks: 2, conflictTasks: 1, sequentialFallbacks: 1`

---

## Verification

After the orchestration completes:

```bash
# Both route files should exist
cat src/routes/users.ts
cat src/routes/products.ts

# config.ts should have the database field
cat src/config.ts

# The event log should show the conflict detection and resolution
cat specs/*.md | grep -E "conflict_detected|conflict_resolved"

# wave.parallel_complete should show conflictTasks: 1
cat specs/*.md | grep "parallel_complete"
```

---

## What This Proves

- Parallel builders can modify the same file without corrupting each other (worktree isolation)
- The merge step detects conflicts using `git apply` exit codes
- `wave.conflict_detected` is emitted with the correct task IDs
- Conflicting tasks are re-executed sequentially in the merged main working tree
- `wave.conflict_resolved` is emitted after sequential fallback completes
- The final `wave.parallel_complete` event accurately records conflict counts
- The orchestration produces a correct result despite the conflict -- no manual intervention required
