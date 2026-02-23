# Stage 7 Test Prompt: Full Flow

**Purpose:** End-to-end test covering the complete Stage 7 feature set in a single orchestration.

---

## Prompt

```
/orchestrate "add a REST API with GET /users and POST /users endpoints, including a middleware layer that checks for an API key header using class-based middleware"
```

This prompt is designed to:
1. Decompose into multiple tasks with dependencies
2. Trigger a bounce-back (class-based middleware conflicting with functional patterns)
3. Exercise hydration checkpoints throughout
4. Produce a final report with bounce-back stats

---

## Expected Decomposition

The orchestrator should produce approximately:

| Task | Wave | Difficulty |
|------|------|-----------|
| `define-user-types` | 1 | standard |
| `add-api-key-middleware` | 1 | standard |
| `implement-get-users` | 2 | standard |
| `implement-post-users` | 2 | standard |
| `write-api-tests` | 3 | standard |

---

## Expected Flow

### Steps 1-7: Setup
- Parse prompt (no flags)
- Clarification check: prompt is specific enough, skip
- Fast path: not triggered (multi-wave, multiple files)
- Decompose into 5 tasks across 3 waves
- Write spec file to `specs/user-api.md`
- Write initial hydration checkpoint
- Present plan for approval

### Step 7b: Spec Hardening
- "class-based middleware" may be flagged as potentially conflicting -- hardened to be explicit about the class shape

### Steps 8-9: Estimation + Task Creation
- ~22,500 tokens estimated
- All 5 tasks created via TaskCreate

### Wave 1 Execution (Steps 10-11)
- `define-user-types`: dispatch builder -> no bounce trigger -> validator -> PASS -> checkpoint written
- `add-api-key-middleware`: dispatch builder

  **Bounce-back fires** if existing middleware uses functional patterns:
  ```
  [HITL] Task `add-api-key-middleware` requires your input.

  Trigger: conflicting-requirements (blocking)

  What the builder said:
  > The existing src/middleware/ uses a functional pattern. A class-based
  > middleware would conflict with the existing functional pattern.

  How do you want to proceed?
  1. Proceed with guidance
  2. Skip this task
  3. Restructure tasks
  4. Abort orchestration
  ```

  **Choose option 1**: "Use a functional middleware instead. Export a function `apiKeyMiddleware(req, res, next)` that reads the X-API-Key header."

  Builder re-dispatched with guidance -> validator -> PASS -> checkpoint written with bounce resolved

### Wave 2 Execution
- `implement-get-users` and `implement-post-users` dispatched sequentially
- Checkpoint written after each

### Wave 3 Execution
- `write-api-tests` dispatched

### Steps 12-13: Result
Final report should include:
- 5 tasks completed
- 0 retries (or however many)
- 1 bounce-back (conflicting-requirements, resolved: proceed-with-guidance)
- 0 Codex tasks (no hard difficulty tasks)
- N tasks hardened during spec hardening
- `resumed: false` (fresh run)

---

## Verification Points

After the orchestration:

1. **Spec file exists** with all sections populated:
   ```bash
   cat specs/user-api.md
   ```
   - Task Graph shows all tasks as `completed`
   - Execution Log has entries for all dispatches
   - Result section has the execution summary
   - Hydration Checkpoint shows `status: completed`

2. **Bounce history** in checkpoint has entry with `resolution: proceed-with-guidance`

3. **Final report** includes bounce-back stats

4. **Source files created** (builder created them):
   - `src/types/user.ts` (or similar)
   - `src/middleware/api-key.ts` (functional, not class-based)
   - `src/routes/users.ts`

5. **Resume test** (optional): after the run, try:
   ```
   /orchestrate --resume specs/user-api.md
   ```
   Expected: orchestrator reads checkpoint, sees status=completed, informs you the orchestration is already complete.

---

## What This Proves (Combined)

- Stage 7 orchestrates a full multi-wave task
- Bounce-back detection fires and resolution is applied correctly
- Hydration checkpoints are written throughout
- Final checkpoint status is `completed`
- Report includes all Stage 7 statistics (bounce-back total, resume flag)
- Spec file is a complete audit trail of the orchestration
