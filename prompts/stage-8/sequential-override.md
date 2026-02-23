# Stage 8 Test Prompt: Sequential Override Flag

**Purpose:** Test that the `--sequential` flag disables parallel dispatch and reverts to Stage 7 behavior for the entire orchestration.

---

## Setup

Same as `parallel-wave.md` -- a basic project structure with `src/` and a working Bun setup. This test runs the same task as the parallel-wave test but with `--sequential` to verify the flag is respected.

---

## Prompt

```
/orchestrate "add GET /users, POST /users, and DELETE /users/:id handlers in src/routes/" --sequential
```

---

## Expected Behavior

1. **Step 1 flag parsing**: `--sequential` is stripped from the prompt and `SEQUENTIAL_MODE` is set to `true`.

2. **No parallel dispatch**: Even though Wave 2 contains 3 tasks, sequential mode is active. Tasks run one at a time.

3. **No `wave.parallel_start` event**: This event should NOT appear in the execution log.

4. **Standard sequential dispatch per task**:
   - Builder dispatched for task 1
   - Builder completes, bounce-back check, validator dispatched
   - Validator completes, verdict parsed
   - Repeat for task 2, then task 3

5. **Summary shows sequential mode**: The final report and spec file should reflect that parallel dispatch was not used.

---

## Verification

After the orchestration completes:

```bash
# The event log should NOT contain wave.parallel_start
grep "wave.parallel" specs/*.md
# Expected output: (empty -- no parallel events)

# The event log SHOULD contain sequential task completion
grep "agent.dispatched" specs/*.md
# Expected: one dispatched event per task, not batched

# Verify sequential_mode in the hydration checkpoint
grep "sequential_mode" specs/*.md
# Expected: sequential_mode: true
```

---

## What This Proves

- `--sequential` flag is parsed correctly in Step 1
- `SEQUENTIAL_MODE: true` suppresses parallel dispatch for all waves
- The sequential path (Stage 7 behavior) executes correctly
- Hydration checkpoint records `sequential_mode: true`
- `--resume specs/<name>.md` on a sequential run restores sequential mode correctly
