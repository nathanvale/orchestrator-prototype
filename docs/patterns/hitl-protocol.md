# HITL Protocol

**Introduced in: Stage 7**

---

## What It Is

HITL (Human-in-the-Loop) Protocol is a structured pause-and-consult mechanism for situations that automated retry cannot resolve. When the orchestrator detects a decision requiring human judgment -- conflicting design patterns in existing code, ambiguous requirements not caught during spec hardening, missing context that would invalidate multiple downstream tasks -- it pauses execution and presents the situation to the user with a bounded set of resolution options.

This is distinct from two other human interaction points:

- **Iterative refinement** (Stage 3) -- a pre-execution gate where the user approves the plan before any agent runs
- **Retry escalation** (Stage 3) -- post-retry exhaustion where 3 automated attempts all failed

HITL activates mid-execution, after agents have started running, when a qualitative decision is encountered that retries alone cannot resolve.

---

## How We Use It Here

### Bounce-Back Detection

Bounce-back detection runs in Step 10 (dispatch loop), alongside the retry decision:

**Bounce-back triggers (any match):**
- Builder reports a design conflict that affects the task's acceptance criteria
- Builder cannot implement without choosing between two incompatible architectural approaches
- Validator fails with a reason that reflects a missing specification (not a fixable implementation error)
- Three automated retries exhausted but the root cause is a decision, not a defect

The key distinction from retry-fixable failures: a retry-fixable failure has a specific, correctable cause (missing JSDoc, wrong export name). A bounce-back trigger has a root cause that requires a human decision (which architectural pattern to follow, which interpretation of a requirement to use).

### Bounce-Back Presentation

When a bounce-back is triggered, the orchestrator pauses and presents:

1. Which task triggered the bounce-back
2. The specific decision that cannot be automated (quoted from the builder's failure report)
3. The options available (typically 2-4 concrete choices, always bounded -- never open-ended)
4. The downstream impact of each choice (which subsequent tasks are affected)

**Example:**

```
Task: implement-user-service
Situation: The user module uses class-based OOP patterns. Your codebase uses
functional composition throughout src/. Implementing with classes would
conflict with the existing patterns; implementing functionally would
require restructuring the task description.

Options:
A. Proceed with classes -- implement UserService as a class (affects wave 2 handler tasks)
B. Proceed with functions -- rewrite as functional module (task description updated)
C. Provide additional context -- add guidance and retry
D. Skip this task -- mark as skipped, continue with remaining tasks
```

### User Resolution

After the user responds:

1. Record the decision in the spec file's Execution Log with timestamp
2. Update the task description with the user's guidance
3. Reset retryCount to 0 for the task
4. Re-dispatch the builder with the enriched spec
5. Emit `hitl.resolved` event with the chosen option

---

## Why HITL Protocol

### Partial Progress Preserved

Without HITL, a mid-execution decision point causes the entire orchestration to abort. The user loses all progress on completed tasks and must restart. HITL preserves the completed work and resumes from exactly where the decision was needed.

### Focused Interaction

HITL presents a specific decision with bounded options, not a free-form "what should I do?" interaction. This keeps the human's cognitive load low -- they are choosing between 2-4 concrete options, not re-engineering the task from scratch.

### Downstream Transparency

Presenting the downstream impact before the user chooses means the user understands the consequences. "Choice A affects wave 2 handler tasks" is more actionable than just "what approach should I use?"

### Interaction with Spec Hardening

Spec hardening (Stage 6) should catch most requirement ambiguities before dispatch. If a bounce-back triggers due to an ambiguous requirement, it is a signal that hardening missed something -- the ambiguity was not detectable from the spec alone but became visible when the builder encountered existing code.

---

## Where It Comes From

**Human-in-the-loop (HITL) in ML systems:** The concept of pausing automated processing to consult a human on low-confidence decisions appears throughout machine learning pipelines. Active learning, content moderation systems, and medical AI all use HITL for cases where automation is insufficient. The orchestration equivalent is a design decision the orchestrator cannot make unilaterally.

**Approval workflows in business process automation:** Systems like Zapier and n8n include "approval" steps that pause automated workflows pending human sign-off. The HITL protocol is the same mechanism applied to agent orchestration.

**Exception handling in distributed systems:** When a system encounters a state it cannot automatically recover from (deadlock, data inconsistency), it parks the state and alerts an operator. HITL is the same pattern: park the orchestration state (via hydration checkpoint) and alert the user.

---

## Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Preserves completed work when a decision is needed mid-execution | Introduces a synchronous human interaction mid-run |
| Focused interaction with bounded options (low cognitive load) | Long-running orchestrations may pause overnight if user is unavailable |
| Downstream impact stated before user decides | Requires careful trigger calibration -- over-triggering creates friction |
| Integrates with hydration checkpoint (session can end before user responds) | Under-triggering masks decisions that need human judgment |

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`.claude/skills/orchestrator/references/hitl-protocol.md`](../../.claude/skills/orchestrator/references/hitl-protocol.md) | Bounce-back trigger logic, presentation format, resolution options |
| [`docs/patterns/iterative-refinement.md`](iterative-refinement.md) | Pre-execution plan review -- the earlier human gate |
| [`docs/patterns/retry-with-resume.md`](retry-with-resume.md) | Automated retry -- what HITL extends when retry cannot resolve the issue |
| [`docs/patterns/hydration-pattern.md`](hydration-pattern.md) | Persists the HITL decision and checkpoint so sessions can safely end mid-bounce-back |
| [`docs/patterns/spec-hardening.md`](spec-hardening.md) | Pre-dispatch pass that should catch most ambiguities before HITL is needed |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 7 overview |
