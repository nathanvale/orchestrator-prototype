# Worktree Isolation

**Introduced in: Stage 8**

---

## What It Is

Worktree Isolation gives each parallel builder its own isolated copy of the repository using `git worktree add`. When multiple builders run concurrently in a wave, they each operate in a separate directory on disk -- reading and writing files independently, with no awareness of each other's changes.

After all builders complete, the orchestrator collects each worktree's diff and applies them to the main working tree. If two builders modified the same file with incompatible changes, the merge catches the conflict and those tasks re-run sequentially. Worktrees are temporary: created before dispatch, removed after merge.

Without worktree isolation, parallel builders would write to the same working tree concurrently, producing race conditions, partial writes, and corrupted files.

---

## When To Use

- When parallel dispatch is in use (2+ builders running concurrently in a wave)
- When any builder in the wave writes to files (not just reads)
- When the project is a git repository and not a shallow clone
- When the cost of a merge conflict (sequential fallback for one task) is acceptable relative to the parallelism benefit

For sequential execution (single-task waves or `--sequential` flag), worktree isolation is not needed -- there is only one builder at a time.

---

## How It Works

### Worktree Lifecycle

**Before dispatch:**

```bash
git worktree add /tmp/hop-w2-t1 HEAD   # task 1
git worktree add /tmp/hop-w2-t2 HEAD   # task 2
git worktree add /tmp/hop-w2-t3 HEAD   # task 3
```

Each worktree is a full working copy of the repo at `HEAD`, in its own directory. The builders receive their worktree path as context and operate entirely within it.

**During dispatch:**

All builders run concurrently. Builder 1 writes to `/tmp/hop-w2-t1/src/users/get.ts`. Builder 2 writes to `/tmp/hop-w2-t2/src/users/post.ts`. They never touch each other's directories.

**After all builders complete:**

```bash
# Compute what each builder changed
git -C /tmp/hop-w2-t1 diff HEAD > /tmp/t1.patch
git -C /tmp/hop-w2-t2 diff HEAD > /tmp/t2.patch
git -C /tmp/hop-w2-t3 diff HEAD > /tmp/t3.patch

# Apply diffs to main working tree in task order
git apply /tmp/t1.patch    # clean apply
git apply /tmp/t2.patch    # clean apply
git apply /tmp/t3.patch    # conflict! -> queue t3 for sequential fallback
```

**Sequential fallback for conflicts:**

Task 3 re-runs in the main working tree (after t1 and t2 are already merged) using the standard sequential dispatch loop.

**Cleanup:**

```bash
git worktree remove /tmp/hop-w2-t1 --force
git worktree remove /tmp/hop-w2-t2 --force
git worktree remove /tmp/hop-w2-t3 --force
```

Always use `--force` to handle dirty worktrees. Register a cleanup handler for unexpected exits: `git worktree prune` removes stale worktrees whose lock files are gone.

### Why Diff-and-Apply Instead of Three-Way Merge

The diff-and-apply merge strategy (compute what each builder changed relative to HEAD, then apply each diff to the main tree) is simpler than a three-way merge:

- It works correctly when tasks modify non-overlapping files -- the common case for well-scoped tasks
- It produces a clear conflict signal when tasks modify the same file
- It does not require the orchestrator to understand file semantics -- `git apply` handles the mechanics

The tradeoff: it cannot automatically resolve conflicts the way a three-way merge might. That is intentional -- automatic conflict resolution for agent-generated code is unsafe. Surface the conflict, fall back to sequential, let the builder retry with full context.

---

## Key Rules

1. The orchestrator creates and removes all worktrees -- builders never manage their own worktrees.
2. Each builder receives exactly one worktree -- never share a worktree between two builders.
3. Merge happens after ALL builders in the wave complete -- not after each individual builder.
4. Worktrees are always cleaned up, even on failure. Use `--force` on removal.
5. Diffs are computed against HEAD (the state before any builder ran) -- not against another builder's worktree.
6. Validators run on the merged main working tree, not on individual worktrees.
7. If `git worktree add` fails (shallow clone, detached HEAD), fall back to sequential execution and emit a warning.

---

## Failure Modes

- **Stale worktrees:** The orchestrator exits mid-wave and worktrees are not cleaned up. They accumulate in `/tmp` and cause `git worktree add` to fail on name collisions in subsequent runs. Fix: register a cleanup handler; run `git worktree prune` on startup.
- **Wrong merge order:** Applying task 3's diff before task 1's diff produces a different (possibly incorrect) result. Always apply diffs in wave-task order for determinism.
- **Conflict not detected:** `git apply` exits non-zero but the error is swallowed. A conflict silently produces a broken file. Always check `git apply` exit code; treat non-zero as a conflict requiring sequential fallback.
- **Builder writes outside its task scope:** A builder that modifies `package.json` while implementing a feature creates a conflict with every other builder in the wave that also modifies it. Well-scoped tasks (spec hardening responsibility) minimize this. Worktree isolation catches the conflict but cannot prevent it.
- **Shallow clone:** `git worktree` requires a full clone. CI environments using `--depth 1` will fail at worktree creation. Detect shallow clones on startup and fall back to `--sequential` automatically.

---

## Tradeoffs

| Advantage | Disadvantage |
|-----------|-------------|
| Concurrent builders never corrupt each other's files | Worktree creation/teardown adds latency per wave |
| Conflicts detected cleanly at merge time -- not silently | Diff-and-apply cannot auto-resolve conflicts (intentional) |
| Main working tree stays consistent throughout the wave | Requires a non-shallow git clone |
| Fallback to sequential is clean and isolated to conflicting tasks | Adds code complexity to the dispatch loop |

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/parallel-dispatch.md`](parallel-dispatch.md) | The execution strategy that requires worktree isolation |
| [`docs/patterns/builder-validator.md`](builder-validator.md) | The per-task cycle that worktree isolation scopes |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 8 overview |
