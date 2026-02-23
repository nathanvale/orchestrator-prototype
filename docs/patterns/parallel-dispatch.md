# Parallel Dispatch

**Introduced in: Stage 8**

---

## What It Is

Parallel Dispatch is the orchestrator's strategy for executing independent tasks within the same wave concurrently, rather than one at a time. When a wave contains 2 or more tasks and `--sequential` is not set, all builders in that wave are launched in a single message -- causing them to run simultaneously. After all builders complete, results are merged and validators are dispatched (also concurrently).

The core mechanic: multiple `Task` tool calls in a single message run concurrently in Claude Code. Parallel Dispatch exploits this property deliberately. Each builder gets an isolated git worktree (see `worktree-isolation.md`) so file writes do not conflict.

Parallel Dispatch does NOT change the wave dependency structure. Wave N still waits for Wave N-1 to complete before starting. Parallelism is within a wave, not across waves.

---

## When To Use

- When a wave contains 2 or more independent tasks (the common case for multi-endpoint or multi-feature prompts)
- When tasks in the wave write to non-overlapping files (good task decomposition ensures this)
- When the time savings from concurrency outweigh the worktree overhead
- When the project is a full git clone (not shallow -- worktrees require full history)

Do NOT use parallel dispatch when:
- `--sequential` flag is set (user override for debugging)
- The wave has only 1 task (no parallelism benefit)
- The project is a shallow git clone (`--depth 1` CI environments) -- fall back to sequential automatically

---

## How It Works

### Dispatch Decision

Before each wave, the orchestrator evaluates:

```
IF SEQUENTIAL_MODE == true  ->  sequential path (Stage 7 behavior)
IF wave.taskCount == 1      ->  sequential path (no benefit)
IF wave.taskCount >= 2      ->  parallel path
```

### Parallel Builder Launch

All builders are dispatched in a SINGLE orchestrator message. In Claude Code, multiple `Task` tool calls in one message are concurrent:

```
# Single message containing N Task calls -- all launch simultaneously
Task(builder, taskId="implement-get-users",    isolation="worktree", model="sonnet")
Task(builder, taskId="implement-post-users",   isolation="worktree", model="sonnet")
Task(builder, taskId="implement-delete-users", isolation="worktree", model="sonnet")
```

The orchestrator stores all agentIds returned. It waits for ALL builders to complete before proceeding.

### Merge and Conflict Handling

After all builders complete:

1. Each builder's worktree diff is applied to the main working tree in task-id order.
2. If a diff applies cleanly, the task's changes are merged.
3. If a diff conflicts, the task is flagged for sequential re-execution.

```
wave.conflict_detected -> re-run conflicting tasks sequentially -> wave.conflict_resolved
```

### Parallel Validator Launch

After merge (and bounce-back detection), validators run concurrently using the same pattern:

```
# Single message containing N Task calls -- all validators launch simultaneously
Task(validator, taskId="implement-get-users",    isolation="worktree", model="haiku")
Task(validator, taskId="implement-post-users",   isolation="worktree", model="haiku")
Task(validator, taskId="implement-delete-users", isolation="worktree", model="haiku")
```

Validators run on the merged state -- they see the combined output of all builders. This lets a validator catch cross-task consistency issues (e.g., a shared type used inconsistently across two route handlers).

---

## Key Rules

1. All builder Task calls for a wave must appear in a SINGLE orchestrator message. Spreading them across multiple messages makes them sequential.
2. Wait for ALL builders to complete before beginning the merge step -- do not merge partial results.
3. Merge in deterministic order (task-id order within the wave) for reproducible results.
4. Bounce-back detection runs on EACH builder's output after merge -- not before. The merged state is the input to bounce-back checks.
5. If SEQUENTIAL_MODE is set at run start, it applies for the entire run. It cannot be toggled mid-orchestration.
6. Emit `wave.parallel_complete` with parallel/conflict/fallback counts at the end of each parallel wave. This is the source of truth for parallel stats in the final report.

---

## Failure Modes

- **Sequential disguised as parallel:** The orchestrator issues builder Task calls in separate messages (one per message). They run sequentially -- no concurrency benefit, but worktree overhead still paid. Detection: `wave.parallel_start` fires but `wave.parallel_complete.parallelTasks` is 1.
- **Missing merge step:** Builders complete but the orchestrator dispatches validators directly against individual worktrees. Validators see a partial state -- cross-task consistency is not verified. Always merge first, then validate.
- **Parallel across waves:** The orchestrator launches builders from Wave 1 and Wave 2 concurrently. Wave 2 builders may read stale state before Wave 1 builders finish writing. The wave ordering contract prevents this -- never start Wave N+1 until Wave N is fully complete, including merge and validation.
- **Conflict flood:** Every task in the wave conflicts because all tasks modify a shared file (e.g., `package.json`). All tasks fall back to sequential -- parallelism gain is zero, worktree overhead was paid for nothing. Fix: improve task decomposition to isolate shared-file changes into a dedicated task in an earlier wave.

---

## Signals and Diagnostics

| Signal | Meaning |
|--------|---------|
| `wave.parallel_start` | Parallel path taken for this wave |
| `wave.parallel_complete.parallelTasks` | How many tasks ran concurrently (should equal wave task count) |
| `wave.parallel_complete.conflictTasks` | How many tasks had merge conflicts and re-ran sequentially |
| `wave.parallel_complete.sequentialFallbacks` | Same as conflictTasks -- audit field |
| `orchestration.completed.parallelWaves` | Total waves that used parallel dispatch |
| `orchestration.completed.totalWorktrees` | Total worktrees created (sum of parallel builder dispatches) |

If `parallelTasks` equals 1 for a wave that should have dispatched 3 builders, the orchestrator issued sequential Task calls. Review Step 10 dispatch logic.

---

## Tradeoffs

| Advantage | Disadvantage |
|-----------|-------------|
| Wave execution time scales with slowest builder, not sum of all builders | Worktree creation/teardown latency per wave |
| Independent tasks do not block each other | Merge step adds post-completion overhead |
| Validators see the full merged state (cross-task consistency) | Shallow git clones cannot use worktrees |
| `--sequential` provides a clean fallback for debugging | Conflict fallback re-executes affected tasks from scratch |

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/worktree-isolation.md`](worktree-isolation.md) | The file isolation mechanism used during parallel dispatch |
| [`docs/patterns/wave-computation.md`](wave-computation.md) | How waves are computed (Kahn's sort) -- parallelism operates within a wave |
| [`docs/patterns/builder-validator.md`](builder-validator.md) | The per-task cycle that parallel dispatch scales |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 8 overview |
