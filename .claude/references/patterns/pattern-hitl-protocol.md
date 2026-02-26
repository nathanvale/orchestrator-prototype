---
slug: hitl-protocol
display_name: "HITL Protocol"
one_liner: "When the orchestrator encounters a decision that automated retry cannot resolve, it pauses execution and bounces back to the human for guidance before resuming."
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

hitl-protocol

## Quick Summary

The HITL (Human-in-the-Loop) Protocol is a structured pause-and-consult mechanism for situations that automated retry cannot resolve. When the orchestrator detects a decision requiring human judgment -- conflicting patterns in existing code, ambiguous requirements, missing context -- it pauses execution and presents the situation to the user with a bounded set of resolution options. Execution resumes once the user responds. This is distinct from iterative refinement (pre-execution plan review) and from retry escalation (post-retry exhaustion). HITL activates mid-execution when a qualitative decision is encountered.

## When To Use

- When the builder detects a design conflict in existing code that cannot be resolved without human judgment (e.g., new code using OOP patterns in a functional codebase)
- When the orchestrator encounters an ambiguous requirement that was not caught during decomposition and spec hardening
- When automated retry has changed the builder's approach but the fundamental conflict remains
- When the decision has significant downstream consequences -- the wrong choice would invalidate multiple subsequent tasks
- When providing guidance is more efficient than aborting and restarting from scratch

## Core Mechanism

Bounce-back detection runs in Step 10 (dispatch loop), alongside the retry decision:

**Bounce-back triggers (any match):**
- Builder reports a design conflict that affects the task's acceptance criteria
- Builder cannot implement without choosing between two incompatible architectural approaches
- Validator fails with a reason that reflects a missing specification (not a fixable implementation error)
- Three automated retries exhausted but the root cause is a decision, not a defect

**Bounce-back presentation:**
The orchestrator pauses and presents to the user:
1. Which task triggered the bounce-back
2. The specific decision that cannot be automated (quoted from the builder's failure report)
3. The options available (typically 2-4 concrete choices)
4. The downstream impact of each choice (which subsequent tasks are affected)

**User resolution options (task-dependent, always bounded):**
- **Proceed with approach A** -- continue with one implementation approach
- **Proceed with approach B** -- continue with the alternative
- **Provide additional context** -- user supplies missing information; orchestrator re-hardens and retries
- **Skip this task** -- mark as skipped, continue with remaining tasks unaffected

After the user responds, the orchestrator:
1. Records the decision in the spec file's Execution Log
2. Updates the task description with the user's guidance
3. Resets retryCount for the task to 0
4. Re-dispatches the builder with the enriched spec
5. Emits `hitl.resolved` event with the chosen option

## Key Rules

1. Bounce-back is not the same as retry escalation -- escalation exhausts retries, bounce-back detects a qualitative decision point that retries cannot resolve.
2. Always present a bounded set of options -- never ask an open-ended question mid-execution.
3. Record the user's decision in the spec file's Execution Log before re-dispatching.
4. Reset retryCount to 0 after a bounce-back resolution -- the user's guidance changes the task context.
5. Emit `hitl.invoked` when pausing and `hitl.resolved` when resuming.
6. Downstream task impact must be stated in the bounce-back presentation -- the user needs to know what their decision affects.

## Implementation Notes

Bounce-back detection logic is in `.claude/skills/orchestrator/references/hitl-protocol.md`.

The key distinction between bounce-back triggers and normal retry failure: a retry-fixable failure has a specific, correctable cause (missing JSDoc, wrong export name). A bounce-back trigger has a root cause that requires a human decision (which architectural pattern to follow, which interpretation of a requirement to use).

**Interaction with spec hardening:** Spec hardening should catch most requirement ambiguities before dispatch. If a bounce-back triggers due to an ambiguous requirement, it is a signal that hardening missed something -- worth noting in the orchestration summary for later tuning.

**Interaction with hydration:** When bounce-back pauses execution, the spec file's hydration checkpoint is written before presenting to the user. If the user's session ends before responding, the orchestration can be resumed from the checkpoint and the bounce-back re-presented.

## Failure Modes

- **Bounce-back for every validator failure:** Over-triggering HITL removes the benefit of automated retry. Bounce-back should activate only when the decision is genuinely beyond automation.
- **Open-ended bounce-back question:** Asking "what should I do?" without options forces the user to reason from scratch. Bounded options (A, B, skip, provide context) keep the interaction focused.
- **Decision not recorded in spec:** If the user's guidance is not persisted, a later resume will re-trigger the same bounce-back -- the user is asked the same question again.
- **RetryCount not reset after bounce-back:** The task enters the re-dispatch with retryCount = 3 (or wherever it was). The first builder failure after bounce-back immediately triggers escalation again.

## Signals & Diagnostics

- **Pattern is needed:** Users manually interrupt orchestrations to provide mid-execution guidance; builders enter retry loops on tasks where the root cause is a design decision, not an implementation defect.
- **Pattern is working:** `hitl.invoked` events appear for decision points; `hitl.resolved` events follow user responses; the spec file's Execution Log contains the user's decision with timestamp; subsequent builder dispatches succeed because the task description is now unambiguous.
- **Pattern is failing:** Bounce-back triggers for routine validator failures; the user is asked the same question on resume (decision not persisted); bounce-back options are too vague to guide the builder effectively.

## Tradeoffs

**Gain:** Execution resumes from the exact decision point rather than aborting and restarting. The user provides guidance at the moment it is needed, with full context visible in the spec file. Downstream task impact is communicated before the user chooses.

**Cost:** Introduces a synchronous human interaction step mid-execution. Long-running orchestrations may need to pause overnight if the user is unavailable. Requires careful trigger calibration -- over-triggering creates friction; under-triggering masks decisions that need human judgment.

## Related Patterns

- **Retry with Resume** -- the automated recovery mechanism that HITL extends; HITL activates when retry cannot resolve the issue
- **Iterative Refinement** -- the pre-execution plan review gate; HITL is the mid-execution equivalent
- **Hydration Pattern** -- ensures the orchestration state is persisted when HITL pauses execution, enabling resume if the session ends before the user responds
- **Spec as Source of Truth** -- the spec file that records HITL decisions in the Execution Log

## Source Anchors

Stage 7 (concept introduction and proof):
- `orchestration/7-hitl:.claude/skills/orchestrator/SKILL.md:L597-L644` -- Bounce-back detection, trigger catalog, user presentation, resolution options (proceed/skip/restructure/abort)
- `orchestration/7-hitl:.claude/skills/orchestrator/SKILL.md:L72-L95` -- Resume branch: hydration algorithm, bounce history restore, re-presentation of pending bounce-backs
- `orchestration/7-hitl:.claude/skills/orchestrator/references/hitl-protocol.md` -- Full trigger catalog, severity levels, resolution option matrix per trigger type
