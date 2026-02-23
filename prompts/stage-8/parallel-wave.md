# Stage 8 Test Prompt: Parallel Wave Dispatch

**Purpose:** Test that the orchestrator dispatches independent tasks within the same wave concurrently, using worktree isolation for each builder.

---

## Setup

This prompt assumes a basic project structure with a `src/` directory and a working Bun setup. The routes do not need to exist beforehand -- the orchestrator will create them.

Ensure the repo is a full git clone (not shallow). Worktrees require full git history:
```bash
git fetch --unshallow 2>/dev/null || true
```

---

## Prompt

```
/orchestrate "add four independent HTTP handlers: GET /users, POST /users, DELETE /users/:id, and GET /health. Each handler lives in its own file under src/routes/. Add a types file for shared types."
```

---

## Expected Behavior

1. **Step 1-7**: Normal orchestration flow -- decompose, write spec, harden, present plan.

2. **Wave 1** (define-types): Single task, sequential dispatch (no parallelism needed).

3. **Wave 2** (4 route handlers): Parallel dispatch fires.
   - `wave.parallel_start` emitted with `taskCount: 4`
   - All 4 builders dispatched in a single message with `isolation: "worktree"`
   - Each builder receives its own worktree at a separate path
   - All 4 builders run simultaneously

4. **After all builders complete:**
   - Worktree results merged in task-id order
   - No conflicts expected (each handler is in its own file)
   - Bounce-back detection runs on all 4 outputs

5. **Validators dispatched concurrently:**
   - All 4 validators launched in a single message
   - Validators run on the merged state
   - `wave.parallel_complete` emitted with `parallelTasks: 4, conflictTasks: 0`

---

## Verification

After the orchestration completes:

```bash
# Verify all route files were created
ls src/routes/

# Check the parallel execution stats in the spec file
cat specs/*.md | grep -A5 "parallelWaves"

# Verify the event log
cat specs/*.md | grep "wave.parallel"
```

The `wave.parallel_complete` event should show `parallelTasks: 4` and `conflictTasks: 0`.

---

## What This Proves

- Parallel dispatch fires automatically for waves with 2+ tasks
- Each builder gets an isolated worktree (no file conflicts)
- Results are merged correctly after all builders complete
- Validators run concurrently on the merged state
- `wave.parallel_start` and `wave.parallel_complete` events are emitted with correct stats
