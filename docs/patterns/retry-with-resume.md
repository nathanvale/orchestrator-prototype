# Retry-with-Resume Pattern

**Introduced in: Stage 3 (Full Phase 1)**

---

## What It Is

Retry-with-Resume is a validation recovery strategy: when a Validator returns `VERDICT: FAIL`, the Orchestrator re-dispatches the same Builder using `resume: agentId` rather than starting a fresh agent. The Builder picks up with full conversation context -- it remembers the code it wrote, the decisions it made, and now also receives the Validator's specific rejection feedback. Up to 3 automated retry attempts are made before the Orchestrator escalates to the user.

```
[Validator] --> VERDICT: FAIL
       |
       v
[Orchestrator] stores builder.agentId
       |
       v
[Builder] <-- resume: agentId + validator feedback
       |
       v
[Validator (fresh)] --> VERDICT: PASS or FAIL
       |
       +--> PASS: continue
       |
       +--> FAIL: retry again (max 3)
       |
       +--> FAIL after 3: escalate to user
```

The key insight is the asymmetry between Builder and Validator on retry. The Builder resumes -- it carries full context because knowing what you built and why it was rejected makes the fix better. The Validator always gets a fresh dispatch -- it carries no context because independence is the entire point of having a Validator. A Validator that remembers the previous conversation is more likely to forgive what it already reviewed and less likely to catch new regressions.

---

## How We Use It Here

The retry protocol is defined in Step 10 of [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) and tracked in the spec file written during Step 4.

**Step 10: Handle Validation Failure**

1. The Validator returns `VERDICT: FAIL` with specific feedback in the TaskUpdate metadata.
2. The Orchestrator reads `retryCount` from the spec file for this task. If `retryCount >= 3`, skip to escalation.
3. Increment `retryCount` in the spec file.
4. Store the Builder's `agentId` from the previous dispatch.
5. Re-dispatch the Builder with `resume: agentId`. Pass the Validator's feedback verbatim -- do not summarize or soften it. The Builder needs the exact rejection criteria.
6. After the Builder completes, dispatch a fresh Validator (no resume). The Validator gets the original task description plus the current state of the files, not the retry history.
7. Parse the new verdict. If `PASS`, continue. If `FAIL`, return to step 2.

**Escalation path (after 3 automated retries):**

Present to the user:
- Which task failed
- What the Validator rejected (the final failure reason)
- Three options:
  - **Skip** -- mark the task as skipped and continue with remaining tasks
  - **Provide guidance** -- the user adds context or a correction, then retry resets to 0
  - **Abort** -- halt orchestration, leave the spec file in its current state for manual recovery

**Why fixed retries, not exponential backoff:**

Exponential backoff exists to avoid overwhelming a resource that is temporarily unavailable. The Builder is not temporarily unavailable -- it is receiving better information on each attempt because of the resumed context. Waiting longer between retries does not help. What helps is the specificity of the Validator's feedback and the Builder's memory of its own previous attempt. Fixed retries keep the feedback loop tight.

---

## Where It Comes From

**Temporal retry policies:** Temporal Workflows support configurable retry policies on Activities -- max attempts, backoff coefficients, non-retryable error types. The retry-with-resume pattern applies the same "retry the unit of work, not the whole workflow" principle, but adds the resume dimension: the worker gets smarter on each retry because it carries prior context.

**Exponential backoff in distributed systems:** Classic distributed systems use backoff to reduce load on degraded services. We deliberately diverge here -- fixed retries, not exponential -- because the bottleneck is not load but information. The Builder improves with each attempt when given specific feedback; adding latency between attempts provides no benefit.

**Human escalation in support workflows:** Tiered support systems (L1 automated, L2 human) escalate when automated resolution fails after N attempts. The pattern here mirrors that structure: N automated retries (agents), then a human decision point. The escalation options -- skip, guide, abort -- map directly to support workflow branches (defer issue, add information, close ticket).

**Agent self-correction research:** Community findings from 2024-2025 multi-agent experiments consistently show that agents improve on retry when given specific failure feedback rather than generic "try again" instructions. The critical variable is specificity: "the exported function is missing a JSDoc `@returns` tag" outperforms "validation failed." This is why the retry protocol passes the Validator's feedback verbatim rather than summarized.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Step 10 retry protocol -- the full decision tree |
| [`docs/patterns/task-dag.md`](task-dag.md) | The DAG execution context that retry operates within, including the Retry Protocol section |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 3 description and the role of retry in full phase 1 |
| [`docs/patterns/dispatch-loop.md`](dispatch-loop.md) | The per-task dispatch cycle that retry wraps around |
