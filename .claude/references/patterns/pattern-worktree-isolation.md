---
slug: worktree-isolation
display_name: "Worktree Isolation"
one_liner: "Each parallel builder operates in a temporary git worktree so concurrent file writes never conflict, with changes merged back after validation."
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

worktree-isolation

## Quick Summary

Worktree Isolation gives each parallel builder its own isolated copy of the repository using `git worktree add`, so concurrent file writes during parallel dispatch never collide. Each builder operates on its own directory, makes its changes independently, and the orchestrator merges all worktrees back to the main working tree after all builders complete. If merge conflicts occur, the conflicting tasks re-run sequentially in the main working tree. Worktrees are temporary -- created before dispatch and removed after merge.

## When To Use

- When parallel dispatch is in use and two or more builders will execute concurrently in the same wave
- When builders write to files (not just read) and those files might overlap between tasks in the same wave
- When the cost of a merge conflict (re-running one task sequentially) is lower than the cost of serializing all tasks
- When the repo is a git repository (worktrees require git -- non-git projects cannot use this pattern)
- When tasks are well-decomposed and unlikely to modify the same files (worktree isolation handles conflicts but is most efficient when conflicts are rare)

## Core Mechanism

**Lifecycle per wave:**

1. **Before dispatch:** For each task in the wave, the orchestrator creates a worktree:
   ```
   git worktree add /tmp/hop-wave<N>-task<id> HEAD
   ```
   Each worktree is a full working copy of the repo at `HEAD`, in a separate directory on disk.

2. **During dispatch:** Each builder receives its worktree path as context. All reads and writes go to the builder's own directory. Builders have no awareness of each other's worktrees.

3. **After all builders complete:** The orchestrator collects each worktree's diff against `HEAD`:
   ```
   git -C /tmp/hop-wave<N>-task<id> diff HEAD
   ```
   Diffs are applied to the main working tree in task order using `git apply`. If a diff applies cleanly, it is committed to the main working tree. If a diff cannot apply (conflict), that task is queued for sequential re-execution.

4. **Sequential fallback:** Conflicting tasks run sequentially in the main working tree, one at a time, with their current worktree state as context. This handles the rare case where two tasks modified the same file with incompatible changes.

5. **Cleanup:** All worktrees are removed after merge, whether successful or not:
   ```
   git worktree remove /tmp/hop-wave<N>-task<id> --force
   ```

## Key Rules

1. The orchestrator creates and removes all worktrees -- builders never manage their own worktrees.
2. Each builder receives exactly one worktree -- never share a worktree between two builders.
3. Merge happens after ALL builders in the wave complete -- not after each individual builder completes.
4. Worktrees are always cleaned up, even if the merge or validation fails. Use `--force` on removal to handle dirty worktrees.
5. The merge diff is computed against `HEAD` (the state before any builder ran) -- not against another builder's worktree.
6. Validators run on the merged main working tree, not on individual worktrees.
7. If git worktree creation fails (e.g., detached HEAD, shallow clone), fall back to sequential execution and surface a warning.

## Implementation Notes

`git worktree add` creates a new working directory linked to the same `.git` directory. Each worktree can be on a different branch or at the same commit. For isolation, all worktrees start at `HEAD` of the current branch -- builders do not create new commits, they only modify working tree files.

The diff-and-apply merge strategy is simpler than a three-way merge: compute what each builder changed (diff against HEAD), then apply each diff to the main tree. This works when tasks modify non-overlapping files. When they modify the same file, `git apply` will report a conflict.

**Worktree path naming:** Use a deterministic naming scheme like `/tmp/hop-w<wave>-t<taskId>` to make worktrees identifiable in logs and easy to clean up if the process exits unexpectedly.

**Cleanup on unexpected exit:** Register a cleanup handler that runs `git worktree prune` to remove any stale worktrees if the orchestrator exits mid-wave. `git worktree prune` removes worktrees whose lock files are gone.

**Interaction with spec file:** The spec file lives in the main working tree, not in any worktree. Builders do not write to the spec file -- only the orchestrator does. This means spec file updates are always serialized and never conflict.

## Failure Modes

- **Worktree not cleaned up after failure:** Stale worktrees accumulate in `/tmp`, consuming disk space and causing `git worktree add` to fail on name collisions. Always clean up in a finally/cleanup block.
- **Merge applied in wrong order:** Applying task 3's diff before task 1's diff can produce a different result than the intended sequence. Apply in wave-task order for determinism.
- **Conflict fallback not triggered:** If `git apply` partial failures are swallowed, a conflict silently produces a broken file. Check `git apply` exit code and treat non-zero as a conflict requiring fallback.
- **Builder modifies a file outside its task scope:** A builder that accidentally modifies a shared file (e.g., `package.json`) while implementing a feature creates a merge conflict with every other builder in the wave. Spec hardening should scope builders to specific files -- worktree isolation catches the conflict but does not prevent it.
- **Shallow clone incompatibility:** `git worktree` requires a non-shallow clone. CI environments that use `--depth 1` checkouts will fail at worktree creation. Surface a clear error and fall back to sequential execution.

## Signals & Diagnostics

- **Pattern is needed:** Two builders in the same wave write to the same file and silently overwrite each other's changes; parallel dispatch produces corrupted output that sequential dispatch does not.
- **Pattern is working:** Worktree directories appear in `/tmp` before builder dispatch and are gone after merge; merge conflicts are detected and reported with the specific files and tasks involved; sequential fallback runs for conflicting tasks and produces correct output.
- **Pattern is failing:** Stale worktrees accumulate after orchestrator exits; builders write to the main working tree instead of their assigned worktree (worktree path not passed correctly); merge conflicts are silently ignored and corrupted files appear in the output.

## Tradeoffs

**Gain:** Concurrent builders never corrupt each other's work. File conflicts are detected at merge time with a clean fallback path. The main working tree remains consistent throughout the wave -- it only receives changes after all builders have completed and their diffs have been validated for applicability.

**Cost:** Worktree creation and teardown adds latency per wave (typically sub-second, but non-zero). The merge-and-apply strategy is more complex than simple sequential execution. Requires a git repository and a non-shallow clone. Rare conflicts require sequential fallback, which partially negates the parallelism benefit for those tasks.

## Related Patterns

- **parallel-dispatch** -- the execution strategy that requires worktree isolation; these two patterns are designed to work together
- **builder-validator** -- the per-task cycle that worktree isolation scopes; each builder gets its own worktree, validators run on the merged result

## Source Anchors

Stage 8 (concept introduction and proof):
- `orchestration/8-parallel:.claude/skills/orchestrator/SKILL.md:L552-L584` -- Worktree lifecycle: creation via isolation flag, diff-and-apply merge, conflict detection, sequential fallback, cleanup
