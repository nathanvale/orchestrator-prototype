---
slug: ralph-wiggum-loop
display_name: "Ralph Wiggum Loop"
one_liner: "A visual retry loop where the browser validator screenshots, finds issues, the builder fixes them, and the cycle repeats until the validator reports PASS or max iterations are reached."
intel_date: null
slots:
  pattern_id: "## Pattern ID"
  quick_summary: "## Quick Summary"
  when_to_use: "## When To Use"
  core_mechanism: "## Core Mechanism"
  key_rules: "## Key Rules"
  implementation_notes: "## Implementation Notes"
  failure_modes: "## Failure Modes"
  signals_diagnostics: "## Signals & Diagnostics"
  tradeoffs: "## Tradeoffs"
  related_patterns: "## Related Patterns"
  source_anchors: "## Source Anchors"
---

## Pattern ID

ralph-wiggum-loop

## Quick Summary

The Ralph Wiggum Loop is a visual feedback cycle for UI tasks where browser validation fails. Named for the "I'm in danger" self-awareness loop, it describes the situation where the builder can see (via screenshot) that something is wrong, knows it is wrong, and must iterate until it fixes it. After browser validation emits `VERDICT: FAIL`, the orchestrator re-dispatches the builder with the screenshot and failure details attached, the builder makes visual corrections, the validator re-validates, and the cycle repeats. Maximum 3 iterations. On exhaustion, escalate to the user via the HITL protocol.

## When To Use

- When browser validation emits `VERDICT: FAIL` for a UI task and the failure is visual (not a runtime error or missing functionality)
- When the failure details from the browser validator include a screenshot that the builder can use to diagnose the visual issue
- When automated iteration is likely to converge (the visual issue is fixable from the screenshot -- layout, styling, missing content -- not a missing feature)
- When the task's max-iterations counter has not yet reached 3
- When HITL has not already been triggered for this task (Ralph Wiggum Loop runs before escalation, not after)

## Core Mechanism

The Ralph Wiggum Loop extends the standard retry-with-resume cycle with screenshot-driven context:

**Trigger condition:**
Browser validation emits `VERDICT: FAIL` with a `failure_mode: visual` tag (as opposed to `failure_mode: functional` for missing API behavior or `failure_mode: error` for runtime crashes).

**Loop iteration:**
1. Orchestrator increments the task's `visualRetryCount` (separate from `retryCount` used for code failures).
2. If `visualRetryCount > 3`, escalate to HITL and stop the loop.
3. Re-dispatch the builder with the enriched context:
   - Original task description
   - Screenshot from the failed validation (binary reference, not base64)
   - Failure reason from the validator (e.g., "button is left-aligned, expected center-aligned")
   - Previous fix attempts (brief summary of what was tried in prior iterations)
4. Builder makes targeted visual corrections based on the screenshot and failure reason.
5. Browser validator re-validates: navigate, screenshot, assert.
6. On `VERDICT: PASS`, loop exits successfully. On `VERDICT: FAIL`, return to step 1.

**Exhaustion handling:**
After 3 failed visual iterations, the orchestrator escalates to HITL using the same protocol as retry exhaustion:
- Present the screenshot, the failure reason, and the 3 attempted fixes to the user
- Offer bounded options: provide additional visual guidance, skip this task, or abort
- Record the user's decision in the spec file's Execution Log

## Key Rules

1. `visualRetryCount` is separate from `retryCount` -- visual retries do not consume the task's 3 code-failure retries, and code-failure retries do not consume visual retries.
2. The screenshot from the most recent failed validation MUST be included in the re-dispatch context -- the builder cannot make targeted fixes without seeing the current visual state.
3. Previous fix attempts must be summarized in the re-dispatch context -- the builder must know what was already tried to avoid repeating the same fix.
4. Maximum 3 visual iterations before HITL escalation -- do not loop indefinitely.
5. The loop is only triggered for `failure_mode: visual` verdicts. Runtime errors (`failure_mode: error`) go through the standard retry-with-resume path, not the Ralph Wiggum Loop.
6. On HITL escalation from loop exhaustion, do not also trigger retry escalation -- the task has had its human escalation path, avoid double-escalation.

## Implementation Notes

**failure_mode tagging:** The browser validator must tag its verdict with a failure mode so the orchestrator can route correctly. Convention:
- `VERDICT: FAIL failure_mode:visual` -- goes to Ralph Wiggum Loop
- `VERDICT: FAIL failure_mode:error` -- goes to standard retry-with-resume
- `VERDICT: FAIL failure_mode:functional` -- goes to standard retry-with-resume (missing behavior, not visual)

**Screenshot context efficiency:** The screenshot is passed to the re-dispatched builder as a binary reference (a file path the builder can read), not as inline base64. This keeps the re-dispatch context window size bounded regardless of screenshot resolution.

**Previous fix summary:** The orchestrator maintains a running list of what the builder tried in each iteration. This is appended to the re-dispatch context in a `## Previous Fix Attempts` section. Format: iteration number, what was changed, why the validator still failed.

**Interaction with worktree isolation:** If the Ralph Wiggum Loop runs during a parallel wave (the failed UI task was part of a parallel batch), the loop iterations run in the main working tree after merge -- not in a new worktree. The worktree for the original dispatch has already been merged and removed.

**Name origin:** The name references Ralph Wiggum from The Simpsons, specifically the "I'm in danger" meme where Ralph sits in an uncomfortable situation, aware something is wrong, cycling through it repeatedly. The pattern captures the iterative visual-fix cycle where the system knows it is failing and keeps trying until it succeeds or escalates.

## Failure Modes

- **Screenshot not passed to builder:** Builder receives a `VERDICT: FAIL` with a text description only. The builder guesses at the visual issue and produces the same or a different wrong result. Always attach the screenshot binary reference.
- **`visualRetryCount` not tracked separately:** Visual retries exhaust the task's `retryCount`, leaving no retries available for genuine code failures that occur after visual issues are fixed. Keep counters separate.
- **Loop runs for functional failures:** A missing API endpoint is not fixable by looking at a screenshot. Routing `failure_mode:functional` into the Ralph Wiggum Loop wastes iterations that should go through standard retry.
- **No HITL escalation on exhaustion:** The loop runs past 3 iterations silently, with diminishing returns. Without escalation, the orchestration may loop indefinitely. Enforce the 3-iteration hard cap.
- **Previous fix attempts not summarized:** Builder repeats the same fix in iteration 2 and 3, wasting iterations. The summary of prior attempts is essential context for making progress.

## Signals & Diagnostics

- **Pattern is needed:** Browser validation repeatedly fails with `failure_mode:visual`; builders make visual changes but the next validation screenshot shows the same or similar issue; users manually intervene to describe visual corrections that the builder should be making automatically.
- **Pattern is working:** `ralph-wiggum.iteration` events fire with screenshot references; builder fix attempts are progressively targeted (not random); `VERDICT: PASS` arrives within 1-3 iterations for tractable visual issues; HITL escalation fires at iteration 3 for stubborn visual issues.
- **Pattern is failing:** Loop runs more than 3 iterations (cap not enforced); builder produces the same output on iteration 2 as iteration 1 (screenshot not passed); `visualRetryCount` and `retryCount` are mixed (wrong counter tracked); HITL not triggered on exhaustion.

## Tradeoffs

**Gain:** Visual issues are often fixable with 1-2 iterations of screenshot-driven feedback. The loop automates what would otherwise require manual user intervention for each visual correction. Attaching the screenshot to the re-dispatch context makes each iteration more targeted than a blind retry.

**Cost:** Each iteration costs a full builder dispatch plus a browser validation cycle (navigate, screenshot, assert). Three iterations is three times the cost of a single dispatch. The loop is a bounded cost -- maximum 3 iterations before HITL -- but the baseline cost is higher than non-visual retry. The loop only works when the visual issue is diagnosable from a screenshot; layout issues caused by missing CSS variables or complex inheritance chains may not be fixable within 3 iterations.

## Related Patterns

- **browser-validation** -- provides the screenshots and `failure_mode:visual` verdicts that trigger the Ralph Wiggum Loop; without browser-validation, there is no visual feedback to drive the loop
- **retry-with-resume** -- the code-failure retry mechanism that Ralph Wiggum Loop parallels for visual failures; the two loops use separate counters and handle distinct failure modes
- **builder-validator** -- the base pattern that both retry-with-resume and ralph-wiggum-loop extend; builder-validator is the per-task cycle; ralph-wiggum-loop is the visual-specific retry wrapper around it
- **hitl-protocol** -- the escalation mechanism that fires when ralph-wiggum-loop exhausts its 3 iterations; the loop ends, the human picks up the visual issue

## Source Anchors

Stage 9 (concept introduction and proof):
- `orchestration/9-browser:.claude/skills/orchestrator/SKILL.md:L862-L920` -- Ralph Wiggum loop: visualRetryCount counter, screenshot-fix-screenshot cycle, builder re-dispatch with failure details, max 3 iterations, HITL escalation on loop exhaustion
