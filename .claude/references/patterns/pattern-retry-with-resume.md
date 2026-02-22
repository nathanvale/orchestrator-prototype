---
slug: retry-with-resume
display_name: "Retry with Resume"
one_liner: "On validation failure, re-dispatch the Builder with full conversation context and specific rejection feedback, while always dispatching the Validator fresh."
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

retry-with-resume

## Quick Summary

Retry-with-Resume is a validation recovery strategy: when a Validator returns `VERDICT: FAIL`, the Orchestrator re-dispatches the same Builder using `resume: agentId` rather than starting a fresh agent. The Builder carries full conversation context -- it remembers the code it wrote and the decisions it made, and now receives the Validator's specific rejection feedback. The Validator always gets a fresh dispatch. Up to 3 automated retry attempts are made before escalation to the user.

## When To Use

- Any pipeline where `VERDICT: FAIL` should trigger automated remediation before escalating to a human
- When the Builder's context from the prior attempt (what was built, why) improves the quality of the fix
- When retry attempts should be tracked per-task and persisted to the spec file for resumption
- When you need a deterministic escalation path after N failed attempts

## Core Mechanism

The retry protocol is asymmetric between Builder and Validator:

**Builder resumes** (`resume: agentId`) -- carries full conversation context including what it built and the Validator's rejection. Knowing what was rejected and why makes the fix more targeted.

**Validator dispatches fresh** -- no resume, no context from previous validation rounds. Independence is the entire point of having a Validator. A Validator that remembers previous conversations is more likely to forgive what it already reviewed and less likely to catch new regressions.

**Decision tree (Step 10):**

1. Validator returns `VERDICT: FAIL` with specific feedback in TaskUpdate metadata.
2. Read `retryCount` from the spec file for this task. If `retryCount >= 3`, skip to escalation.
3. Increment `retryCount` in the spec file.
4. Store the Builder's `agentId` from the previous dispatch.
5. Re-dispatch the Builder with `resume: agentId`. Pass the Validator's feedback verbatim -- do not summarize or soften.
6. After Builder completes, dispatch a fresh Validator (no resume). The Validator gets the original task description and current file state -- not the retry history.
7. Parse the new verdict. If `PASS`, continue. If `FAIL`, return to step 2.

**Escalation after 3 automated retries:**

Present to the user: which task failed, what the Validator rejected (final failure reason), and three options:
- **Skip** -- mark task as skipped, continue with remaining tasks
- **Provide guidance** -- user adds context or correction, retryCount resets to 0
- **Abort** -- halt orchestration, leave spec file in current state for manual recovery

## Key Rules

1. Builder retries use `resume: agentId` -- never start a fresh Builder for a retry.
2. Validator retries always use a fresh dispatch -- never resume a Validator.
3. Validator feedback is passed verbatim to the Builder -- do not summarize or soften.
4. `retryCount` is tracked and persisted in the spec file -- not held in memory.
5. After 3 failed retries, escalate to the user -- do not retry indefinitely.
6. Fixed retry count, not exponential backoff -- the bottleneck is information quality, not load.

## Implementation Notes

`retryCount` is stored in the spec file's per-task metadata. Before each retry, read it from disk (not from memory). This ensures the count survives context compaction and is accurate even if the orchestrator's context was partially evicted.

Pass the Validator's rejection feedback verbatim. Research consistently shows that specific failure feedback ("the exported function is missing a JSDoc `@returns` tag") outperforms generic feedback ("validation failed") in retry scenarios. Summarizing or softening the feedback loses the specificity that makes the Builder's retry effective.

The spec file stores the Builder's `agentId` after each dispatch so it is available for resume even if the orchestrator's context does not hold it.

The fast path does not support retry-with-resume. Fast-path failures escalate directly to the user because there is no spec file with `retryCount` to track.

## Failure Modes

- **Resuming the Validator:** A resumed Validator carries prior context and is more likely to approve work it already reviewed, regardless of whether new regressions were introduced.
- **Summarizing feedback:** The Builder receives softened rejection feedback and does not fix the actual issue. Retries loop without progress.
- **In-memory retryCount:** Context compaction evicts the count. The orchestrator loses track and either retries indefinitely or escalates prematurely.
- **Exponential backoff:** Adding latency between retries provides no benefit. The Builder improves with information, not with time. Backoff only lengthens the feedback loop.
- **No escalation path:** After 3 retries, the orchestrator continues retrying or silently fails. The user never sees the failure.

## Signals & Diagnostics

- **Pattern is needed:** `VERDICT: FAIL` events result in immediate user escalation with no automated remediation, even for clearly fixable issues (missing JSDoc tag, wrong export name).
- **Pattern is working:** Builder retries use `resume`; Validator retries are fresh dispatches; `retryCount` increments correctly in the spec file; escalation occurs at exactly 3 failures.
- **Pattern is failing:** Retries loop without changing the Validator's verdict (feedback is too vague); `retryCount` does not persist across context compaction; the same Validator agentId is reused on retry.

## Tradeoffs

**Gain:** Automated recovery from common validation failures before involving the user. Builder context improves fix quality on each retry. Validator independence is preserved. Clear escalation path with user agency (skip, guide, abort).

**Cost:** Up to 3 extra Builder dispatches and 3 extra Validator dispatches per failing task. Resume dispatch requires storing agentId in the spec file. Fixed retry count means some tasks that could recover on attempt 4 get escalated.

## Related Patterns

- **Builder/Validator** -- the two agents the retry protocol wraps
- **Dispatch Loop** -- the per-task dispatch cycle that retry augments
- **Spec as Source of Truth** -- `retryCount` and `agentId` are persisted in the spec file; retry depends on this
- **Task DAG** -- the DAG execution context that retry operates within

## Source Anchors

Source: `docs/patterns/retry-with-resume.md` on `stage/3-full`
