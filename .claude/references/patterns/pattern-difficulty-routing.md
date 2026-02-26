---
slug: difficulty-routing
display_name: "Difficulty Routing"
one_liner: "Score each task against a difficulty rubric during decomposition and route hard tasks to a more capable execution engine, with graceful fallback to the standard builder."
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

difficulty-routing

## Quick Summary

Difficulty Routing assesses each task during decomposition and routes hard tasks to a more capable execution engine (Codex CLI) while keeping standard tasks on the faster, cheaper default builder. The assessment is heuristic-based -- concrete signals like file count and description keywords trigger the `hard` tag. Codex is optional: if not installed or if the `--no-codex` flag is passed, all tasks route to the standard builder. Fallback does not count against the retry cap.

## When To Use

- When a prompt decomposes into tasks with significantly different complexity (some greenfield, some complex refactors)
- When certain tasks are likely to fail on first builder attempt and enter the retry loop repeatedly
- When a more capable execution engine is available and worth routing hard tasks to
- When you want a cost optimization that degrades gracefully (removing the engine changes nothing except routing)

## Core Mechanism

The orchestrator evaluates each task against a difficulty rubric during Step 4b (Difficulty Assessment):

**Hard signals (any match = hard):**
- Task touches 5+ files
- Task requires understanding complex existing code patterns (refactor, migration)
- Task involves algorithmic complexity (graph algorithms, concurrent state management)
- Task description uses words like "optimize", "refactor across", "migrate"
- Task has 5+ acceptance criteria
- Task requires cross-module dependency analysis

**Standard signals (all present = standard):**
- Greenfield file creation
- Modifies 1-2 files
- Follows existing patterns
- Clear input/output expectations

The difficulty field is advisory -- the orchestrator uses judgment. A task touching 5 files for a simple pattern (adding JSDoc) is still `standard`.

**Routing in Step 10 (Dispatch):**
- `standard` tasks: dispatch to `$BUILDER_AGENT` (standard builder, typically Claude Code Sonnet)
- `hard` tasks + Codex available: dispatch via `codex exec --full-auto` with the hardened task spec
- `hard` tasks + Codex unavailable (not installed, exits non-zero, times out): fall back to `$BUILDER_AGENT`

The Validator always runs via Claude Code Haiku regardless of which builder was used.

`--no-codex` flag disables all routing -- all tasks use the standard builder regardless of difficulty tag.

## Key Rules

1. Difficulty assessment runs during decomposition (Step 4b) -- before spec file is written, not at dispatch time.
2. The difficulty field is `standard` or `hard` -- no intermediate values.
3. Fallback to standard builder on Codex failure does NOT count against the retry cap for that task.
4. The Validator is always dispatched via Claude Code Haiku -- never routed to Codex.
5. `--no-codex` overrides all routing -- document it in the orchestration summary when used.
6. Codex timeout is 5 minutes -- if exceeded, treat as fallback condition.

## Implementation Notes

The full difficulty scoring rubric and Codex CLI dispatch templates are in `.claude/skills/orchestrator/references/codex-escalation.md`.

Codex availability check: run `codex --version` at orchestration start (Step 1). If it exits non-zero or is not found, set a flag disabling Codex routing for the entire run. This avoids per-task availability checks that would add latency.

Hardened specs (from spec-hardening pattern) are particularly valuable for Codex routing: Codex receives a spec with concrete file paths, function signatures, and measurable acceptance criteria, not the vague original description.

The `difficulty: hard` tag in the spec file's task entry is the routing signal. The task table column records it alongside task ID, subject, dependencies, wave, and status.

## Failure Modes

- **Difficulty assessment at dispatch time (not decomposition):** Assessment happens too late. The spec file doesn't record difficulty; the orchestration summary cannot show which tasks were routed where.
- **Codex timeout not handled:** A hard task dispatched to Codex hangs for 10+ minutes before failing. The 5-minute timeout with fallback to standard builder bounds the worst case.
- **Fallback counted as retry:** If Codex fallback consumes a retry slot, the task exhausts its retry cap before the standard builder even attempts it. Fallback must be outside the retry accounting.
- **Validator routed to Codex:** Codex is optimized for code generation, not mechanical verification. Routing the Validator there wastes Codex capacity and may degrade verdict quality.

## Signals & Diagnostics

- **Pattern is needed:** Hard tasks (refactors spanning many files, algorithmic work) consistently fail on first builder attempt and require 2-3 retries; total cost per orchestration is high for complex prompts.
- **Pattern is working:** `difficulty: hard` appears in the spec file's task table for appropriate tasks; `codex.dispatched` events appear for hard tasks when Codex is available; `codex.fallback` events appear when Codex is unavailable.
- **Pattern is failing:** All tasks are tagged `hard` (over-sensitive rubric) or no tasks are tagged `hard` (under-sensitive rubric); Codex dispatch hangs without timeout handling; fallback tasks consume retry slots.

## Tradeoffs

**Gain:** Hard tasks get a more capable engine, reducing retry rates and total token cost for complex orchestrations. Standard tasks are unaffected -- no overhead, no latency. Codex is optional; removing it changes nothing except routing.

**Cost:** Difficulty assessment adds a reasoning step during decomposition. Heuristic-based classification can misclassify -- a task touching 5 files for a trivial change may be incorrectly tagged `hard`. Codex timeout (5 min) adds latency when Codex fails.

## Related Patterns

- **Spec Hardening** -- companion pattern; hardened specs reduce failure rates regardless of which builder runs; particularly valuable when routing to Codex
- **Fast Path Gate** -- the gate that bypasses the full DAG pipeline for simple prompts; difficulty routing operates within the full pipeline only
- **Retry with Resume** -- the retry loop that difficulty routing aims to reduce; fewer retries = lower cost

## Source Anchors

Stage 6 (concept introduction and proof):
- `orchestration/6-codex:.claude/skills/orchestrator/SKILL.md:L203-L242` -- Step 4b: difficulty assessment rubric, hard/standard signals, Codex availability check
- `orchestration/6-codex:.claude/skills/orchestrator/SKILL.md:L490-L514` -- Step 10: difficulty routing check, Codex dispatch path, fallback to standard builder
- `orchestration/6-codex:.claude/skills/orchestrator/references/codex-escalation.md` -- Full difficulty signal definitions and Codex dispatch protocol
