---
slug: task-dag
display_name: "Task DAG"
one_liner: "Decompose a multi-task prompt into a directed acyclic graph of tasks with explicit dependency edges, enforced at the task infrastructure level."
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

task-dag

## Quick Summary

A Task DAG (Directed Acyclic Graph) is a set of tasks where edges represent dependency relationships: Task B can only start after Task A completes if B has a directed edge to A. The "acyclic" constraint prevents circular dependencies. The DAG is the bridge between "understand the prompt" and "execute the work" -- it captures both what needs to be done and the order constraints between tasks. Without a DAG, you have a list. With a DAG, you have a plan that can be executed in dependency order and validated at each step.

## When To Use

- Any prompt that decomposes into 3 or more tasks with real inter-task dependencies
- When the order of implementation matters because later tasks import or depend on earlier ones
- When the same work could not be done correctly if tasks ran in an arbitrary order
- When parallel execution within independent task groups is anticipated (even if sequential now)

## Core Mechanism

**Decomposition (Step 2):** The Orchestrator breaks the user prompt into tasks with explicit dependency declarations. Each task specifies:

- A unique `task-id` in kebab-case (e.g., `define-user-types`, not `task-1`)
- A complete `description` -- enough for a Builder with no other context to implement correctly
- A `dependencies` list of task IDs that must complete before this task can start

Root tasks have no dependencies. Every other task must trace a path back to at least one root.

**Visualization in the spec file:** Before any agent runs, the full task graph is written as a table:

| Task ID | Subject | Dependencies | Wave | Status |
|---------|---------|-------------|------|--------|
| define-user-types | Define User types | (none) | 1 | pending |
| implement-get-users | Implement GET /users | define-user-types | 2 | pending |

**Enforcement via TaskCreate:** Dependencies are enforced at the infrastructure level using `addBlockedBy`. The task system prevents blocked tasks from being dispatched until their blockers are resolved -- structural enforcement, not documentation.

**Concrete example:** For "add a REST API with GET /users, POST /users, GET /users/:id -- include types, handlers, and tests":

| Task ID | Dependencies | Rationale |
|---------|-------------|-----------|
| `define-user-types` | (none) | Root -- handlers cannot be typed without type definitions |
| `implement-get-users` | `define-user-types` | Handlers import the types |
| `implement-post-users` | `define-user-types` | Same dependency |
| `implement-get-user-by-id` | `define-user-types` | Same dependency |
| `write-user-route-tests` | all three handlers | Tests import all handlers |

The dependency structure mirrors real compile-time constraints: types before handlers, handlers before tests.

## Key Rules

1. Task IDs are kebab-case and descriptive -- not `task-1`, `task-2`.
2. Every task description must be complete and self-contained -- a Builder with no other context must be able to implement from it.
3. The DAG must be valid before the spec file is written: no circular dependencies, no orphaned tasks, minimum 3 tasks.
4. Dependencies are enforced using `addBlockedBy` on TaskCreate -- not just documented in the spec file.
5. Root tasks (zero dependencies) are the entry points -- every other task must trace back to a root.

## Implementation Notes

A single-task prompt belongs in the fast-path gate, not the DAG. The DAG minimum is 3 tasks. Below that threshold, decomposition adds overhead without providing dependency ordering benefit.

Circular dependency detection must happen before writing the spec file. If A depends on B and B depends on A, the DAG is invalid and cannot execute. Report the cycle and stop.

The task ID naming convention matters for readability at the wave-boundary re-read. When the Orchestrator re-reads the spec at Wave 2, descriptive IDs like `implement-get-users` are self-documenting; opaque IDs like `task-3` require cross-referencing.

Dependencies should reflect real structural constraints (A imports B, B's types are consumed by A) -- not artificial sequencing. Artificial dependencies reduce the potential for parallel execution in Stage 8.

## Failure Modes

- **Circular dependencies:** A depends on B and B depends on A. The DAG cannot be topologically sorted; wave computation halts with an error.
- **Incomplete task descriptions:** A Builder dispatched against the task cannot implement correctly without additional context it doesn't have. Validator failures cascade.
- **Opaque task IDs:** `task-1`, `task-2`, `task-3` are indistinguishable in the spec file after context compaction. Wave-boundary re-reads require cross-referencing to understand what is being dispatched.
- **Under-declared dependencies:** Task B imports Task A's output but has no dependency edge. They end up in the same wave. B's Builder runs before A's Builder completes and imports a non-existent module.
- **Over-declared dependencies:** Artificial dependencies collapse tasks that could run in parallel into sequential waves. Correct but slower than necessary.

## Signals & Diagnostics

- **Pattern is needed:** Tasks are being dispatched in an arbitrary order; a Builder fails because a file it imports doesn't exist yet; the orchestrator is manually managing task order in prose logic rather than structure.
- **Pattern is working:** All task dispatches respect the declared dependency order; the spec file task table is complete before any agent is dispatched; `addBlockedBy` calls are made after TaskCreate for all dependent tasks.
- **Pattern is failing:** Wave 2 tasks start before Wave 1 tasks complete; task descriptions are incomplete causing repeated Builder/Validator failures; circular dependency not detected before spec file write.

## Tradeoffs

**Gain:** Dependency constraints are structural, not ad-hoc. The full execution plan is visible before any agent runs. Decomposition enables parallel execution within waves (when infrastructure supports it). The DAG model scales from 3-task to 50-task prompts without conceptual changes.

**Cost:** Decomposition step adds latency before the first agent is dispatched. Requires validating DAG structure (cycle detection) before execution. Task description quality becomes critical -- underspecified tasks cause downstream failures.

## Related Patterns

- **Wave Computation** -- groups DAG tasks into execution layers using topological sort
- **Spec as Source of Truth** -- the spec file that records the task graph before execution
- **Dispatch Loop** -- the per-task dispatch cycle that executes within each wave
- **Fast Path Gate** -- routes simple single-task prompts away from DAG decomposition entirely

## Source Anchors

Stage 2 (concept introduction):
- `orchestration/2-dag:.claude/skills/orchestrator/SKILL.md:L80-L160` -- task decomposition, dependency declarations, addBlockedBy enforcement

Stage 3 (full proof):
- `orchestration/3-full:.claude/skills/orchestrator/SKILL.md:L80-L180` -- DAG with cycle detection, spec file task graph table, wave assignments
