---
slug: builder-validator
display_name: "Builder/Validator"
one_liner: "Separate code execution from verification by assigning each role to a distinct agent with non-overlapping tool sets."
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

builder-validator

## Quick Summary

The Builder/Validator pattern separates implementation from verification: one agent writes code, a different agent checks it, and they never share responsibilities. The critical structural enforcement is `disallowedTools` -- the Validator's agent definition explicitly removes Write, Edit, and NotebookEdit, making it architecturally incapable of modifying files. The Validator's verdict is always binary: `VERDICT: PASS` or `VERDICT: FAIL` -- no partial verdicts.

## When To Use

- Any task where independent verification is required -- the same agent should not check its own work
- When you need structural enforcement of role separation, not just instructed behavior
- Multi-task pipelines where consistent pass/fail signaling drives downstream decisions
- Situations where validator cost should be minimized -- Haiku-class models handle mechanical checks cheaply
- Whenever the orchestrator needs a clear, machine-parseable signal to determine next action

## Core Mechanism

The Builder and Validator run as separate dispatched agents with distinct tool sets:

**Builder:** Uses Read, Glob, Grep, Write, Edit, Bash, TaskGet, TaskUpdate. Implements the task. Reads before writing, respects file boundaries, reports changes via TaskUpdate.

**Validator:** Uses Read, Glob, Grep, Bash, TaskGet, TaskUpdate. Has `disallowedTools: [Write, Edit, NotebookEdit]`. Checks the Builder's output against acceptance criteria. Ends every report with exactly `VERDICT: PASS` or `VERDICT: FAIL`.

The asymmetry is enforced at the runtime level: `disallowedTools` means the runtime rejects any Write/Edit/NotebookEdit call from the Validator regardless of what the prompt says. This is the difference between policy (instruction) and architecture (enforcement).

Different models are used by design: the Builder typically uses a capable generation model (Sonnet), and the Validator uses a cheaper model (Haiku) because validation is mechanical -- read files, confirm presence of exports, check signatures, verify JSDoc.

## Key Rules

1. The Builder never validates its own work -- roles must be held by distinct agents.
2. The Validator's verdict is always binary: `VERDICT: PASS` or `VERDICT: FAIL`. No hedging, no partial verdicts.
3. The Validator must list specific failed checks on `VERDICT: FAIL` -- not just "validation failed."
4. The Validator checks all criteria even if early checks fail -- no short-circuiting.
5. The Validator never suggests fixes -- it describes problems only; the orchestrator decides what happens next.
6. The Builder reads before writing -- always inspect existing files before modifying them.
7. The Builder only touches files explicitly mentioned in the task description.

## Implementation Notes

Define the Validator's agent with `disallowedTools: [Write, Edit, NotebookEdit]` -- do not rely on prompt instruction alone.

Use different models: a generation-capable model for the Builder, a cheaper fast model for the Validator. Validation is mechanical; over-provisioning it wastes tokens.

The Builder's task description must be complete: file paths, function signatures, named exports, JSDoc requirements, and acceptance criteria. Incomplete task descriptions cause Validator failures that are actually orchestrator failures.

The Validator's prompt should reference the same task description the Builder received so it checks against the same contract.

## Failure Modes

- **Validator modifies files:** Occurs when `disallowedTools` is not set and the prompt instruction is insufficient. The Validator starts "helping" by fixing issues instead of reporting them, destroying the independence property.
- **Partial verdicts:** Validator returns "mostly works" or lists caveats instead of a binary verdict. Causes ambiguity in the orchestrator's retry logic.
- **Incomplete checks:** Validator skips later criteria after early failures. Allows regressions to pass if the first check happens to pass in a retry.
- **Vague failure feedback:** Validator reports "exports are missing" without specifying which export. The Builder retries blindly and may not fix the actual issue.
- **Over-provisioned Validator:** Using a powerful model for mechanical checks inflates cost without improving verdict quality.

## Signals & Diagnostics

- **Pattern is needed:** A task has no independent check -- the same agent that implements also declares success.
- **Pattern is working:** Every task's TaskUpdate includes a binary verdict; the orchestrator can branch on `VERDICT: PASS` vs `VERDICT: FAIL` without parsing prose.
- **Pattern is failing:** Validator output contains hedged language ("seems to work," "mostly correct"); or Validator updates source files; or retry loop runs indefinitely without meaningful feedback changes.

## Tradeoffs

**Gain:** Independent verification catches regressions and ensures the Builder's output meets a stated contract. Role separation makes each agent's responsibility precise and auditable.

**Cost:** Two agent dispatches per task instead of one. Using different models adds configuration overhead. The Validator cannot make minor corrections -- every failure requires a full Builder retry.

## Related Patterns

- **Dispatch Loop** -- the orchestrator mechanism that sequences Builder then Validator for each task
- **Retry with Resume** -- wraps the Builder/Validator pair with retry logic when `VERDICT: FAIL` is received
- **Higher-Order Prompt** -- BUILDER_AGENT and VALIDATOR_AGENT are variables; the pair is swappable

## Source Anchors

Source: `docs/patterns/builder-validator.md` on `stage/3-full`
