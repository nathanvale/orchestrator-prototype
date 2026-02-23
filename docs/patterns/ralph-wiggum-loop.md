# Ralph Wiggum Loop

**Introduced in: Stage 9**

---

## What It Is

The Ralph Wiggum Loop is a screenshot-driven retry cycle for UI tasks where browser validation fails. Named for the "I'm in danger" meme -- the moment of self-aware distress where something is visibly wrong and the cycle of noticing it keeps repeating -- the pattern describes what happens when the system can see the visual problem, knows it needs fixing, and iterates until it resolves it or gives up.

When browser validation emits `VERDICT: FAIL failure_mode:visual`, the orchestrator does not give up immediately. It re-dispatches the builder with the screenshot and failure details attached, the builder makes targeted visual corrections, and the browser validator re-validates. This cycle repeats up to 3 times. If the issue persists after 3 iterations, the loop escalates to the user via the HITL protocol.

---

## When To Use

- When browser validation emits `VERDICT: FAIL failure_mode:visual` for a UI task
- When the failure details include a screenshot the builder can use to diagnose the issue
- When the visual issue is plausibly fixable from screenshot feedback (layout, styling, missing content, alignment)
- When the task's `visualRetryCount` has not yet reached 3
- When HITL has not already been triggered for this task

For non-visual failures (`failure_mode:error` or `failure_mode:functional`), use the standard retry-with-resume path instead.

---

## How It Works

### Loop Structure

```
Browser validation -> VERDICT: FAIL failure_mode:visual
    |
    v
visualRetryCount++ -> if > 3: escalate to HITL and stop
    |
    v
Re-dispatch builder with:
  - Original task description
  - Screenshot from failed validation (binary reference)
  - Failure reason ("button left-aligned, expected centered")
  - Summary of previous fix attempts
    |
    v
Builder makes targeted visual corrections
    |
    v
Browser validator re-validates
    |
    v (PASS) -> loop exits
    v (FAIL) -> return to top
```

### What Goes in the Re-Dispatch Context

Each iteration builds on the previous one. The re-dispatch includes:

1. **Original task description** -- unchanged; the goal is still the same
2. **Current screenshot** -- binary file reference to the most recent validation screenshot (not base64 -- keeps context window usage bounded)
3. **Failure reason** -- quoted from the validator's `VERDICT: FAIL` report: what specifically is wrong
4. **Previous fix attempts** -- a running summary maintained by the orchestrator:

```markdown
## Previous Fix Attempts

Iteration 1: Changed button margin from `auto` to `0 auto`. Validator still reported left-alignment.
Iteration 2: Moved button to a flex container with `justify-content: center`. Validator reported button is now centered but overlaps the label below it.
```

This summary prevents the builder from repeating the same fix and helps it understand what partial progress has been made.

### Exhaustion and HITL Escalation

After 3 failed visual iterations, escalate to the user:

```
Task: implement-header-component
Visual issue persisted after 3 fix attempts.

Most recent screenshot: [attached]
Most recent failure: "Logo is 4px too far right relative to nav items"

Previous attempts:
  1. Adjusted flex gap -- did not fix alignment
  2. Changed margin-left from 8px to 4px -- slight improvement, still off
  3. Switched to grid layout -- different misalignment, not better

Options:
  A. Provide additional visual guidance (CSS property, expected value, reference screenshot)
  B. Skip this task -- mark as skipped, continue with remaining tasks
  C. Abort the orchestration
```

Record the user's decision in the spec file's Execution Log and proceed accordingly.

### Separate Counter from Code Retry

The `visualRetryCount` counter is completely separate from `retryCount`:

- `retryCount`: tracks code-failure retries (wrong exports, failing tests, type errors) -- max 3
- `visualRetryCount`: tracks visual-failure retries (screenshot-based) -- max 3

A task that exhausts code retries does not inherit a depleted visual retry budget, and vice versa.

---

## Key Rules

1. `visualRetryCount` is separate from `retryCount` -- they do not share budget.
2. The screenshot from the most recent failed validation must be included in every re-dispatch.
3. Previous fix attempts must be summarized in the re-dispatch context -- prevents repeating the same fix.
4. Maximum 3 visual iterations before HITL escalation -- hard cap, no exceptions.
5. Only triggered for `failure_mode:visual` verdicts. Route `failure_mode:error` and `failure_mode:functional` to standard retry-with-resume.
6. On HITL escalation from loop exhaustion, do not also trigger retry escalation.

---

## Failure Modes

- **Screenshot not passed to builder:** Builder receives only a text description of the visual issue. Without seeing the screenshot, the builder guesses and produces the same or a different wrong result. Always attach the screenshot binary reference.
- **`visualRetryCount` mixed with `retryCount`:** Visual retries exhaust the code retry budget (or vice versa), leaving no retries for a different failure mode. Keep the counters strictly separate.
- **Loop runs for functional failures:** Missing API behavior is not diagnosable from a screenshot. Routing functional failures into the Ralph Wiggum Loop wastes iterations that should use standard retry-with-resume.
- **No cap enforced:** The loop runs past 3 iterations, consuming unbounded resources. Always enforce the hard cap.
- **Previous attempts not summarized:** Builder repeats the same fix in iterations 2 and 3. The summary is not optional -- it is the mechanism that enables iteration-over-iteration progress.
- **No HITL escalation on exhaustion:** The orchestration stalls silently after 3 failed iterations instead of surfacing the issue to the user.

---

## Tradeoffs

| Advantage | Disadvantage |
|-----------|-------------|
| Automates visual fix cycles that would otherwise require manual intervention | Each iteration costs a full builder dispatch + browser validation cycle |
| Screenshot attachment makes each iteration targeted, not random | 3 iterations is 3x the cost of a single dispatch before HITL |
| Bounded by a hard cap -- cost is predictable | Works only for visual issues diagnosable from a screenshot |
| Separate counter from code retry -- full retry budget always available for each failure mode | Complex layout issues (CSS specificity, inheritance) may not converge in 3 iterations |

---

## Where It Comes From

**The name:** Ralph Wiggum is a character from The Simpsons, famous for "I'm in danger" -- a moment of self-aware distress. The pattern name captures the loop's essential character: the system can see that something is wrong (the screenshot makes the problem visible), it knows it is in danger of failing, and it cycles through fix attempts with awareness of the situation but uncertainty about the solution.

**Active learning feedback loops:** In machine learning, active learning uses iterative feedback to improve model outputs when the target is not analytically computable. The Ralph Wiggum Loop applies the same structure to visual correction: each iteration uses the validator's feedback to make a more targeted attempt.

**Screenshot-driven debugging:** Developers routinely debug visual issues by taking a screenshot, identifying what is wrong, tweaking CSS or layout, refreshing, and repeating. The Ralph Wiggum Loop automates exactly this cycle for agents.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/browser-validation.md`](browser-validation.md) | Provides the screenshots and failure mode tags that trigger the loop |
| [`docs/patterns/retry-with-resume.md`](retry-with-resume.md) | The parallel pattern for code failures -- same structure, different failure mode |
| [`docs/patterns/builder-validator.md`](builder-validator.md) | The base pattern that the loop wraps |
| [`docs/patterns/hitl-protocol.md`](hitl-protocol.md) | The escalation mechanism when the loop exhausts its 3 iterations |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 9 overview |
