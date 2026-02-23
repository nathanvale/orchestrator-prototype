---
slug: fast-path-gate
display_name: "Fast Path Gate"
one_liner: "A hard complexity filter that routes simple prompts directly to a single Builder/Validator pair, bypassing the full DAG pipeline."
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

fast-path-gate

## Quick Summary

The Fast-Path Gate is a complexity filter inserted early in the orchestration protocol. It evaluates whether a user prompt is simple enough to skip the full DAG pipeline -- task decomposition, spec file generation, wave computation, and multi-task execution -- and instead go directly to a single Builder/Validator pair with no spec file and no waves. The gate is a hard check: every criterion must pass. If any single criterion fails, the full DAG pipeline runs.

## When To Use

- When most real-world prompts during development are simple, targeted changes (single function, single file)
- When DAG overhead would be wasteful for one-task work
- When Stage 1 dispatch loop behavior should be preserved inside a more complex orchestration protocol
- When you want to avoid spec file overhead for prompts that provably cannot need multi-task coordination

## Core Mechanism

The gate is evaluated in Step 3 of the orchestration protocol, after parsing and optional clarification.

**Fast-Path Criteria (all must be true):**

1. Single, self-contained change -- the implementation fits within one logical unit
2. Affects 1-2 files at most
3. Estimated implementation under 20 lines of code
4. No dependencies between sub-tasks -- there is only one task
5. No new modules, types, or interfaces that other code will consume

If all criteria pass, the gate takes the fast path (Step 3b):

1. Emit `fast-path.taken`
2. Create ONE task via `TaskCreate`
3. Dispatch ONE Builder with `foreground: true`
4. Dispatch ONE Validator with `foreground: true`
5. Report result -- no spec file, no wave tracking, no retry protocol

If any criterion fails, the full DAG pipeline runs (Steps 4-9: decompose, spec file, waves, dispatch).

The gate is binary -- not a heuristic score. "Mostly simple" prompts take the full path. This avoids a class of bugs where prompts skip the spec file and then fail silently because the orchestrator has no written plan to recover from.

## Key Rules

1. All five criteria must be true for the fast path to activate -- any single failure routes to full DAG.
2. Fast-path prompts get no spec file -- do not create one for fast-path execution.
3. Fast-path failures (VERDICT: FAIL) are presented directly to the user -- there is no retry-with-resume without a spec file.
4. The gate is evaluated after parsing, not before -- the orchestrator must understand the prompt before classifying it.
5. The fast path does not support retry-with-resume; if validation fails, the orchestrator escalates to the user immediately.

## Implementation Notes

The gate sits at Step 3 of `.claude/skills/orchestrator/SKILL.md`, between clarification and spec file generation.

**Qualifying examples:**
- "Add JSDoc to the `greet` function in `src/greeting.ts`"
- "Rename variable `usr` to `user` in `src/auth.ts`"
- "Change the default timeout from 5000 to 3000 in `src/config.ts`"

**Disqualifying examples:**
- "Add a `greet` function and export it from the index" -- new export, other code may depend on it
- "Rename `User` to `Account` across the codebase" -- affects many files
- "Add error handling to the fetch wrapper" -- likely affects call sites

The `fast-path.taken` event is emitted when the gate passes so the observability dashboard can distinguish fast-path from full-pipeline executions.

On `VERDICT: FAIL` from a fast-path task, the Orchestrator presents the failure to the user and asks whether to retry (resetting to Step 3) or abort.

## Failure Modes

- **Heuristic scoring instead of hard check:** Treating criteria as a weighted score allows "mostly simple" prompts to take the fast path. These prompts then fail silently because there is no spec file to recover from.
- **Skipping the gate entirely:** All prompts take the full pipeline, including trivial single-file changes. Adds spec file overhead and wave computation for work that needs neither.
- **Applying fast path to prompts with new exports:** New types or interfaces consumed by other code create hidden dependencies. The fast path has no dependency tracking, so downstream failures go undetected.
- **Retrying on the fast path:** Attempting retry-with-resume without a spec file has no checkpoint state. The orchestrator cannot determine what was completed or what to resume from.

## Signals & Diagnostics

- **Pattern is needed:** The orchestrator is running spec file generation and wave computation for prompts that touch a single function in a single file.
- **Pattern is working:** `fast-path.taken` events appear for simple prompts; `orchestration.started` events for complex prompts proceed to spec file generation.
- **Pattern is failing:** Fast-path prompts fail validation and the orchestrator has no recovery state; or complex prompts are incorrectly classified as fast-path and bypass necessary dependency tracking.

## Tradeoffs

**Gain:** Simple prompts pay no overhead -- no spec file write, no wave computation, no multi-task DAG. The most common development case (small targeted changes) runs at Stage 1 speed inside a Stage 3+ protocol.

**Cost:** Fast-path failures cannot use retry-with-resume. The binary hard-check classification requires the orchestrator to correctly evaluate all five criteria -- misclassification has no safety net.

## Related Patterns

- **Dispatch Loop** -- the Stage 1 loop that the fast path preserves as an optimization within the full protocol
- **Task DAG** -- the full pipeline the gate bypasses when all criteria pass
- **Spec as Source of Truth** -- the spec file that is explicitly NOT created on the fast path

## Source Anchors

Stage 3 (concept introduction and proof):
- `orchestration/3-full:.claude/skills/orchestrator/SKILL.md:L60-L120` -- fast-path criteria evaluation in Step 3, fast-path.taken event, single Builder/Validator dispatch path
