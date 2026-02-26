---
slug: wave-computation
display_name: "Wave Computation"
one_liner: "Group DAG tasks into topologically-sorted execution layers so dependency constraints are respected and independent tasks are eligible for parallelism."
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

wave-computation

## Quick Summary

Wave computation groups DAG tasks into execution layers called waves. Wave 1 contains all root tasks (zero dependencies). Wave 2 contains all tasks whose dependencies are entirely in Wave 1. Wave N contains all tasks whose dependencies are entirely in Waves 1 through N-1. This is Kahn's topological sort algorithm applied to task scheduling. Waves execute sequentially -- Wave N completes before Wave N+1 starts. Within a wave, tasks currently execute sequentially (Stage 2 constraint); the wave structure preserves the option for parallel within-wave execution when infrastructure supports it.

## When To Use

- Any multi-task DAG where dependencies between tasks determine execution order
- When you need to dispatch all dependency-free tasks before any dependent tasks start
- When the spec file should record the full execution plan (including wave assignments) before any agent runs
- As the prerequisite for parallel within-wave execution in later stages

## Core Mechanism

**Computing waves (Step 3):** Kahn's algorithm applied to the task graph:

1. Build an in-degree map: for each task, count how many other tasks it depends on.
2. Queue all tasks with in-degree 0 -- these are Wave 1.
3. Process the queue: assign the current wave number to each queued task. For each task processed, decrement the in-degree of every task that depends on it. Any task whose in-degree reaches 0 joins the next queue.
4. Repeat until all tasks are assigned a wave number.
5. If any task still has in-degree > 0 after the algorithm completes, a circular dependency exists -- stop and report the error.

**Concrete example:**

| Task ID | Dependencies | Wave |
|---------|-------------|------|
| `define-user-types` | (none) | 1 |
| `implement-get-users` | `define-user-types` | 2 |
| `implement-post-users` | `define-user-types` | 2 |
| `implement-get-user-by-id` | `define-user-types` | 2 |
| `write-user-route-tests` | all three handlers | 3 |

Execution order: types -> (get-users, post-users, get-user-by-id sequentially) -> tests.

**Executing waves (Step 6):** Waves execute in order. Before starting each wave, the Orchestrator re-reads the spec file from disk (mandatory -- context compaction defense). For each task in the wave: dispatch Builder, wait, dispatch Validator, wait. On `VERDICT: FAIL`, execution stops. Wave N does not start until Wave N-1 is fully complete.

**Wave assignments in the spec file:** Each task's wave number is written to the spec file's Task Graph table before any agent is dispatched, making the full execution plan visible upfront.

## Key Rules

1. All tasks in Wave N must be complete before any task in Wave N+1 is dispatched.
2. Re-read the spec file from disk at the start of each wave -- do not rely on in-context memory.
3. Emit `spec.reread` each time the spec is re-read at a wave boundary.
4. Cycle detection is mandatory -- if Kahn's algorithm finds unresolved in-degrees, stop and report.
5. Wave assignments are written to the spec file before the first agent is dispatched -- not computed per-wave at execution time.

## Implementation Notes

The full Kahn's algorithm pseudocode with cycle detection is in `.claude/skills/orchestrator/references/dag-execution.md`.

**Why sequential within waves (Stage 2 constraint):** Claude Code's foreground dispatch runs agents in the same context window as the Orchestrator. Two foreground agents cannot run simultaneously -- there is only one foreground. Background agents could run concurrently but cannot use MCP tools. The solution -- worktree isolation where each agent gets its own git worktree and context -- is Stage 8. Sequential within-wave execution is the simplest correct implementation.

**What changes in Stage 8:** Each task in a wave gets its own worktree. The Orchestrator dispatches all tasks in a wave concurrently and waits for all to complete before starting the next wave. The wave computation algorithm does not change -- only the within-wave execution strategy.

The `spec.reread` event is emitted at each wave boundary so the observability dashboard can confirm that the Orchestrator is actively refreshing its plan from disk, not relying on potentially-evicted context.

## Failure Modes

- **No cycle detection:** Circular dependencies in the DAG cause Kahn's algorithm to leave tasks with unresolved in-degrees. Without detection, those tasks are never dispatched and the Orchestrator hangs waiting for them.
- **No wave-boundary spec re-read:** Context compaction evicts the task graph computed in Step 2. The Orchestrator dispatches Wave 3 tasks using hallucinated or stale task details.
- **Wave N+1 starts before Wave N completes:** A dependent task's Builder runs before the task it depends on completes. Imports fail; the Validator catches them; retries burn tokens on a structurally impossible task.
- **Wave assignments computed at execution time (not upfront):** The spec file does not show wave assignments before execution. The plan is not visible for iterative refinement review; the user cannot see what will run in what order.

## Signals & Diagnostics

- **Pattern is needed:** Tasks fail because dependencies are not yet implemented; tasks run in an unpredictable order; no structure to distinguish which tasks can run now from which must wait.
- **Pattern is working:** `spec.reread` events appear before each wave; wave assignments in the spec file match actual dispatch order; no dependent task is dispatched before its dependencies are `VERDICT: PASS`.
- **Pattern is failing:** Wave 2 tasks dispatch before Wave 1 tasks complete; cycle detection is absent and certain tasks are never dispatched; Orchestrator dispatches tasks in a different order than the wave table declares.

## Tradeoffs

**Gain:** Dependency constraints are respected structurally, not by ad-hoc ordering in the orchestrator prompt. The full wave plan is visible before execution. Wave grouping enables parallel execution within layers when infrastructure supports it. Kahn's algorithm runs in O(V + E) -- efficient even for large task graphs.

**Cost:** Wave computation adds a pre-execution step (Kahn's algorithm). Sequential within-wave execution in Stage 2 does not realize the parallelism that wave grouping enables -- that benefit comes in Stage 8. An extra disk read (spec re-read) occurs at each wave boundary.

## Related Patterns

- **Task DAG** -- the dependency graph that wave computation operates on
- **Spec as Source of Truth** -- wave assignments are written to the spec before execution; spec is re-read at each wave boundary
- **Dispatch Loop** -- the per-task dispatch cycle that executes within each wave

## Source Anchors

Stage 2 (concept introduction):
- `orchestration/2-dag:.claude/skills/orchestrator/SKILL.md:L120-L200` -- Kahn's algorithm implementation, wave assignment loop, in-degree map construction

Stage 2 (dag-execution reference):
- `orchestration/2-dag:.claude/skills/orchestrator/references/dag-execution.md` -- full Kahn's algorithm pseudocode with cycle detection

Stage 3 (full proof):
- `orchestration/3-full:.claude/skills/orchestrator/SKILL.md:L180-L260` -- wave execution loop with spec re-read, spec.reread event emission
