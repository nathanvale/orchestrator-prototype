---
slug: parallel-dispatch
display_name: "Parallel Dispatch"
one_liner: "When multiple tasks in the same wave have no dependencies between them, dispatch their builders concurrently instead of sequentially to reduce wall-clock time."
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

parallel-dispatch

## Quick Summary

Parallel Dispatch replaces the sequential within-wave execution of Stage 2-7 with concurrent builder invocations for all tasks in the same wave. When a wave contains N independent tasks, the orchestrator launches all N builders in a single message using multiple foreground Task calls, then waits for all to complete before advancing to the next wave. Each builder receives worktree isolation to prevent file conflicts. This cuts wall-clock time from O(N * task_time) to O(max(task_times)) within each wave.

## When To Use

- When multiple tasks in the same wave have no dependencies between each other and can therefore run concurrently
- When wall-clock time matters and task execution is the bottleneck (not the orchestrator's planning overhead)
- When tasks within a wave do not share write access to the same files (or worktree isolation is in place to handle conflicts)
- When the `--sequential` flag has NOT been passed by the user (parallel is the default in Stage 8+; sequential is available as a fallback)
- When the wave has 2 or more tasks (single-task waves gain nothing from the pattern -- sequential and parallel are identical)

## Core Mechanism

Within-wave parallel execution replaces the sequential per-task loop used in earlier stages:

**Sequential (Stages 2-7):**
For each task in the wave: dispatch builder -> wait -> dispatch validator -> wait -> next task.

**Parallel (Stage 8+):**
1. For each task in the wave, create a worktree: `git worktree add <path> HEAD`.
2. Launch all builders in a single message using multiple foreground Task calls. Each builder receives its own worktree path in the task context.
3. Wait for all builders to complete (all Task calls in the same message resolve together).
4. Merge each worktree's changes back to the main working tree in task order. If merge conflicts are detected, fall back to sequential re-execution for the conflicting tasks only.
5. Run all validators on the merged state. Validators execute sequentially after merge (validators read, not write -- no parallelism benefit).
6. On any `VERDICT: FAIL`, follow normal retry/HITL protocol for the failing task. Successful tasks in the same wave are not re-executed.

The `--sequential` flag bypasses step 1-3 and runs the Stage 2-7 sequential loop instead. This is available for debugging, compatibility, or user preference.

## Key Rules

1. Only tasks within the same wave are candidates for parallel dispatch -- cross-wave parallelism violates dependency ordering.
2. Each builder must receive a unique worktree path -- never dispatch two builders to the same working tree.
3. Merge happens after ALL builders in the wave complete, not after each individual builder.
4. If merge conflicts occur, fall back to sequential re-execution of the conflicting tasks -- do not attempt automated conflict resolution.
5. Validators run after merge on the merged state -- not per-worktree.
6. The `--sequential` flag must fully disable parallel dispatch and revert to the sequential per-task loop.
7. A single-task wave is always sequential (no parallel overhead for no benefit).

## Implementation Notes

Multiple foreground Task calls in a single Claude Code message is the mechanism for concurrent agent execution. Claude Code resolves all Task calls in a single message concurrently -- this is the parallel execution primitive.

Worktree creation uses `git worktree add <tmp-path> HEAD` before dispatch and `git worktree remove <tmp-path>` after merge. The orchestrator owns the worktree lifecycle -- builders do not create or remove their own worktrees.

The merge strategy is simple: apply each worktree's diff to the main tree in task order. If a diff cannot apply cleanly (conflict), that task re-runs sequentially after the clean diffs have been merged.

**Interaction with retry:** If a builder fails in a parallel wave, only that task re-enters the retry loop. Other tasks that succeeded are not re-executed. The wave is not considered complete until all tasks succeed (or are explicitly skipped via HITL).

**Interaction with spec file:** The spec file is written by the orchestrator, not builders. Builders write implementation files only. The spec file update (task status -> complete) happens after the validator passes, one task at a time -- this serializes the spec writes without serializing the execution.

## Failure Modes

- **File conflicts not detected:** If two builders write to the same file in different worktrees and merge is not conflict-checked, the second write silently overwrites the first. Worktree isolation prevents this at the OS level -- the builders write to separate directories. Conflict detection happens at merge time.
- **Merge fallback not implemented:** Without the sequential fallback, a merge conflict causes the entire wave to fail. The fallback re-runs only the conflicting tasks, not the whole wave.
- **Validators run per-worktree instead of on merged state:** A per-worktree validator passes even if the merged result is broken. Validators must run on the merged tree.
- **Single-task wave dispatched with parallel overhead:** No correctness issue, but wastes worktree creation/teardown time for no parallelism benefit. Guard: skip parallel path when wave has exactly 1 task.
- **`--sequential` flag ignored:** A user who passes `--sequential` for debugging and gets parallel execution anyway cannot isolate task failures. The flag must be respected unconditionally.

## Signals & Diagnostics

- **Pattern is needed:** Wave execution time scales linearly with the number of tasks in the wave; users wait N * task_time for a wave with N independent tasks; the spec file shows multiple tasks in Wave N with no inter-dependencies.
- **Pattern is working:** All builders in the wave start at approximately the same time (visible in tool call timestamps); wall-clock time per wave drops relative to sequential baseline; worktree directories are created before dispatch and removed after merge.
- **Pattern is failing:** Builders overwrite each other's changes (no worktree isolation); validators fail on tasks that individually passed (merge conflict not caught); sequential fallback not triggered despite merge conflict (fallback not implemented).

## Tradeoffs

**Gain:** Wall-clock time per wave drops from O(N * task_time) to O(max(task_times)). For a wave with 4 equal-cost tasks, this is a 4x speedup. The DAG structure and wave computation algorithm do not change -- only the execution strategy within a wave.

**Cost:** Requires worktree infrastructure (setup, teardown, merge). Adds complexity to the dispatch loop -- the simple sequential loop becomes a parallel fan-out with merge and fallback logic. Merge conflicts, while rare for well-decomposed tasks, require a fallback path. The `--sequential` flag must be maintained as a supported escape hatch.

## Related Patterns

- **wave-computation** -- determines which tasks are in each wave; parallel-dispatch is the execution strategy for within-wave tasks
- **worktree-isolation** -- the file-safety mechanism that makes parallel dispatch safe; without it, concurrent writes conflict
- **builder-validator** -- the per-task build/check cycle that parallel dispatch fans out and then re-converges
- **dispatch-loop** -- the sequential baseline that parallel-dispatch extends and can fall back to

## Source Anchors

Stage 8 (concept introduction and proof):
- `orchestration/8-parallel:.claude/skills/orchestrator/SKILL.md:L517-L593` -- Parallel dispatch protocol: wave decision, worktree creation, concurrent builder launch, merge, conflict detection
- `orchestration/8-parallel:.claude/skills/orchestrator/SKILL.md:L25` -- SEQUENTIAL_MODE HOP variable
- `orchestration/8-parallel:.claude/skills/orchestrator/SKILL.md:L47` -- --sequential flag parsing in Step 1
