# Wave Computation Pattern

**Introduced in: Stage 2 (Multi-Task DAG)**

---

## What It Is

Wave computation groups DAG tasks into execution layers called waves. Each wave contains exactly the tasks that are ready to execute -- meaning all of their dependencies are in earlier waves.

- **Wave 1:** All root tasks (zero dependencies)
- **Wave 2:** All tasks whose dependencies are entirely in Wave 1
- **Wave N:** All tasks whose dependencies are entirely in Waves 1 through N-1

This is Kahn's topological sort algorithm applied to task scheduling. The algorithm produces a total execution order that respects all dependency constraints, grouped into layers that could theoretically run in parallel (though Stage 2 runs them sequentially -- more on that below).

```
Wave 1: [define-user-types]
             |
             v
Wave 2: [implement-get-users] [implement-post-users] [implement-get-user-by-id]
             |                        |                        |
             +------------------------+------------------------+
                                      |
                                      v
Wave 3: [write-user-route-tests]
```

The orchestrator computes waves in Step 3 of the dispatch protocol, annotates each task with its wave number, and then executes waves in order -- completing Wave N in full before starting Wave N+1.

---

## How We Use It Here

### Computing Waves (Step 3)

The orchestrator applies Kahn's algorithm to the task graph produced in Step 2:

1. Build an in-degree map: for each task, count how many other tasks it depends on.
2. Queue all tasks with in-degree 0 -- these are Wave 1.
3. Process the queue: assign the current wave number to each queued task. For each task processed, decrement the in-degree of every task that depends on it. Any task whose in-degree reaches 0 goes into the next queue.
4. Repeat until all tasks are assigned a wave number.
5. If any task still has in-degree > 0 after the algorithm completes, a circular dependency exists -- stop and report the error.

The full pseudocode with cycle detection is in [`dag-execution.md`](../../.claude/skills/orchestrator/references/dag-execution.md).

### Executing Waves (Step 6)

Waves execute sequentially: Wave 1 completes before Wave 2 starts. Within a wave, tasks also execute sequentially (Stage 2 constraint -- see below).

Before starting each wave, the orchestrator re-reads the spec file from disk. This is mandatory -- it is the context compaction defense. See [`spec-as-source-of-truth.md`](spec-as-source-of-truth.md) for why.

For each task in the wave, the orchestrator dispatches the Builder, waits for completion, dispatches the Validator, waits for verdict. On `VERDICT: FAIL`, execution stops immediately -- no retry in Stage 2 (that is Stage 3).

### Concrete Example

For a 5-task REST API decomposition:

| Task ID | Dependencies | Wave |
|---------|-------------|------|
| `define-user-types` | (none) | 1 |
| `implement-get-users` | `define-user-types` | 2 |
| `implement-post-users` | `define-user-types` | 2 |
| `implement-get-user-by-id` | `define-user-types` | 2 |
| `write-user-route-tests` | `implement-get-users`, `implement-post-users`, `implement-get-user-by-id` | 3 |

Execution order: types -> get-users -> post-users -> get-user-by-id -> tests. The handlers could theoretically run in parallel (they share no dependencies between them), but Stage 2 runs them one at a time.

### The Spec File Records Waves

Each task's wave assignment is written to the spec file's Task Graph table before any agent is dispatched. This makes the full execution plan visible upfront -- not just what will be built, but in what order and why.

---

## Why Sequential Within Waves (For Now)

Stage 2 executes tasks within a wave sequentially -- one task at a time, foreground dispatch, wait for completion before starting the next.

**The constraint is architectural, not arbitrary:**

Claude Code's foreground dispatch runs agents in the same context window as the orchestrator. Running two foreground agents simultaneously is not possible -- there is only one foreground. Background agents could run concurrently, but background agents cannot use MCP tools (TaskGet, TaskUpdate, Read, Write, Bash), which both Builder and Validator require.

The solution -- worktree isolation, where each agent gets its own git worktree and its own context -- requires significant infrastructure. That is Stage 8.

Sequential within-wave execution is the simplest thing that correctly respects dependencies and produces verifiable results. For the purpose of Stage 2 (learning the DAG and wave patterns), it is more than sufficient.

**What changes in Stage 8:** Each task in a wave gets its own worktree. The orchestrator dispatches all tasks in a wave concurrently and waits for all to complete before starting the next wave. The wave computation algorithm does not change -- only the execution strategy within a wave.

---

## Where It Comes From

**Kahn's algorithm (1962):** Arthur Kahn published the classic topological sort algorithm in "Topological Sorting of Large Networks." The core insight -- repeatedly remove nodes with no incoming edges, revealing the next layer -- maps directly to wave computation. Kahn's algorithm is O(V + E) and is the standard approach for dependency-ordered execution.

**Build system parallelism:** `make -j`, Bazel's action graph, and Turborepo's pipeline all compute dependency layers to determine which targets can run in parallel. Turborepo calls these "tasks that can be run concurrently given their dependencies" -- which is exactly a wave. The difference is that build systems parallelize within layers; Stage 2 sequences within waves (Stage 8 catches up).

**GPU warp scheduling:** GPU architectures group independent work items into warps or waves for concurrent execution on shader cores. The wave terminology in GPU computing and agent orchestration converges on the same concept: a group of independent work items that can proceed simultaneously because they share no data dependencies.

**Database query planning:** Join ordering in SQL query planners uses dependency analysis to determine execution layers -- which tables must be scanned before joins can proceed. The query optimizer's "pipeline" is a wave decomposition over the query DAG.

**LangGraph's parallel node execution:** LangGraph introduced parallel node execution in late 2024 -- nodes in the same graph level execute concurrently when they have no edges between them. This is wave computation under a different name. The graph-level grouping IS the wave.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/task-dag.md`](task-dag.md) | The dependency graph that wave computation operates on |
| [`docs/patterns/spec-as-source-of-truth.md`](spec-as-source-of-truth.md) | Why the spec file is re-read at each wave boundary |
| [`docs/patterns/dispatch-loop.md`](dispatch-loop.md) | The per-task dispatch cycle that executes within each wave |
| [`.claude/skills/orchestrator/references/dag-execution.md`](../../.claude/skills/orchestrator/references/dag-execution.md) | Full pseudocode for Kahn's algorithm, wave execution protocol, idempotency rules |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 8 section -- where parallel within-wave execution is introduced |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Steps 3 and 6 of the dispatch protocol -- wave computation and execution |
