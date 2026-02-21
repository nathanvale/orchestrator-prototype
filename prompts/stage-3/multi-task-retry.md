# Test Prompt: Multi-Task with Retry

**Stage:** 3 (Full Phase 1)
**Complexity:** High -- multi-task with intentionally vague acceptance criteria to trigger validation failures

---

## Prompt

```
add a REST API with GET /users and POST /users. The GET endpoint should have "good error handling" and the POST endpoint should "validate inputs properly".
```

---

## Note on Prompt Design

"Good error handling" and "validate inputs properly" are deliberately vague. They will likely cause the validator to return `VERDICT: FAIL` because the acceptance criteria are not specific enough for a definitive PASS verdict. The validator cannot confirm "good error handling" without a concrete definition -- what HTTP status codes? which error cases? what response body shape?

This is intentional. The vague criteria test whether the retry protocol fires, passes validator feedback to the builder, and eventually resolves (or escalates to the user after 3 failures).

---

## Expected Behavior

1. **Clarification may or may not trigger.** The prompt names endpoints and files -- it is more specific than "add authentication" -- but the acceptance criteria are vague. The orchestrator might ask what "good error handling" means or might proceed with the best-effort interpretation. Either outcome is valid; what matters is how the orchestrator handles the FAIL that follows.

2. **Fast path does NOT trigger.** Two endpoints, multiple files (types, handlers, tests at minimum), and inter-task dependencies -- this is a multi-task project. `fast_path.evaluated { triggered: false }` must fire.

3. **Full decomposition.** Spec written, plan presented, token estimate shown, tasks created. The task graph should have at least 3 tasks with dependencies.

4. **Retry fires during wave execution.** When the validator evaluates the handler for GET /users or POST /users and encounters the vague criteria ("good error handling", "validate inputs properly"), it should return `VERDICT: FAIL` with specific feedback explaining what is missing or underdefined.

5. **Builder retried with resume.** The builder is re-dispatched using `resume: agentId` (preserving its prior context) and the validator's feedback is passed in the retry prompt. The builder should tighten the implementation based on that feedback -- adding explicit status codes, specific validation rules, concrete error response shapes.

6. **Validator re-evaluated fresh.** The validator is always dispatched fresh (no resume) -- it must evaluate the current state of the code, not its prior conversation.

7. **Resolution.** On PASS, `retry.succeeded` fires and execution continues. If the builder fails all 3 attempts, `retry.exhausted` fires and the user is asked what to do next.

---

## What to Look For

**Fast path correctly not triggered:**

```
orchestration.started
(optional: clarification.started / clarification.completed)
fast_path.evaluated      { triggered: false, reason: "multi-task, 2+ files, dependencies required" }
decomposition.completed  { taskCount: 3-5, waveCount: 2-3 }
spec.written             { specPath: "specs/rest-api-users.md" }
plan.presented           { taskCount: N, waveCount: N }
plan.approved
tokens.estimated         { estimatedTokens: N }
```

**Retry protocol on FAIL:**

```
spec.reread              { waveNumber: N }
wave.started             { waveNumber: N, taskIds: ["implement-get-users"] }
  agent.dispatched       (builder -- attempt 1)
  agent.completed
  agent.dispatched       (validator -- fresh)
  agent.completed
  verdict.received       { verdict: "FAIL" }
  retry.started          { orchestrationId, taskId: "implement-get-users", attempt: 1, maxAttempts: 3 }
  agent.dispatched       (builder -- resumed, same agentId as attempt 1)
  agent.completed
  agent.dispatched       (validator -- fresh again)
  agent.completed
  verdict.received       { verdict: "PASS" }
  retry.succeeded        { orchestrationId, taskId: "implement-get-users", attempt: 1 }
wave.completed
```

**If all 3 retries fail:**

```
  retry.started          { attempt: 3, maxAttempts: 3 }
  ...
  verdict.received       { verdict: "FAIL" }
  retry.exhausted        { orchestrationId, taskId: "..." }
  (AskUserQuestion: "Task has failed 3 times. Skip / Provide guidance / Abort?")
```

**Retry prompt quality:**

- The builder's retry prompt must include the validator's specific feedback -- not just "it failed, try again"
- Example good retry prompt: "The validator found these issues: (1) GET /users returns 500 for DB errors but should return 503, (2) error response body has no `error` key. Fix these specific issues."
- Example bad retry prompt: "The previous attempt failed. Please try again."

**Spec file updated with retry history:**

- Each task's status in the spec should reflect retry attempts (e.g., `status: completed (2 attempts)` or retry count in the Execution Log)

**Enhanced summary report:**

```
orchestration.completed
```

Report should include:
- Which tasks required retries, and how many attempts each took
- Token estimate vs. actual dispatches (actual will be higher if retries fired)
- Overall duration

---

## What NOT to See

- Immediate stop on first FAIL -- that was Stage 2 behavior. Stage 3 retries before stopping.
- Retry using a fresh builder dispatch (no `resume`) -- the builder MUST use `resume: agentId` on retry so it retains its prior file context
- Retry without passing validator feedback to the builder -- the retry prompt must include the specific failure reasons
- More than 3 retry attempts per task -- `maxAttempts: 3` is the hard limit before escalating to user
- `fast_path.evaluated { triggered: true }` -- this is explicitly a multi-task scenario

---

## Why This Prompt

This is verification case #3 from `specs/master-plan.md` Stage 3. It is the canonical test for the retry protocol.

The prompt is designed so that validation failure is likely but not certain. "Good error handling" and "validate inputs properly" are the kind of vague specs that show up in real projects -- a builder will make reasonable choices, but a strict validator may reject those choices for being underdefined. This mirrors real-world conditions better than an artificially broken prompt.

The test validates three things together:

1. **Retry fires correctly** -- the orchestrator does not stop on first FAIL
2. **Resume is used** -- the builder gets its prior context on retry, not a cold start
3. **Feedback is passed** -- the builder knows specifically what to fix, enabling convergence

The combination of `resume` + `feedback` is what makes retry efficient. Without `resume`, the builder restarts from scratch and may reproduce the same implementation. Without `feedback`, it has no signal for what to improve. Both must be present for the retry protocol to be useful.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 3 verification case #3 -- this prompt is the canonical retry test |
| [`specs/stage-3-full-phase-1.md`](../../specs/stage-3-full-phase-1.md) | Stage 3 spec -- Scenario 3: Failed Validation section |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Step 10: Execute Waves -- retry protocol, `resume: agentId`, 3-attempt limit |
| [`.claude/skills/orchestrator/references/dag-execution.md`](../../.claude/skills/orchestrator/references/dag-execution.md) | Retry Protocol section -- mechanics of resume, feedback passing, spec file updates |
| [`docs/patterns/retry-with-resume.md`](../../docs/patterns/retry-with-resume.md) | Pattern: retry on FAIL using resume for context preservation -- the mechanism this prompt exercises |
| [`prompts/stage-2/rest-api.md`](../stage-2/rest-api.md) | Stage 2 REST API prompt -- similar structure but no retry (Stage 2 stops on first FAIL) |
