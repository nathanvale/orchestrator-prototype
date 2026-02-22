# Task DAG Pattern

**Introduced in: Stage 2 (Multi-Task DAG)**

---

## What It Is

A Task DAG (Directed Acyclic Graph) is a set of tasks where the edges between them represent dependency relationships. Task B can only start after Task A completes if B has a directed edge to A. The "acyclic" constraint ensures there are no circular dependencies -- no task can transitively depend on itself.

```
define-user-types (Wave 1)
       |
       +-- implement-get-users (Wave 2)
       |          |
       +-- implement-post-users (Wave 2)   +-- write-user-route-tests (Wave 3)
       |          |                                      ^
       +-- implement-get-user-by-id (Wave 2) -----------+
```

The DAG is the bridge between "understand the prompt" and "execute the work." It captures both what needs to be done and the order constraints between tasks. Without a DAG, you have a list. With a DAG, you have a plan.

---

## How We Use It Here

### Decomposition (Step 2)

The orchestrator breaks the user prompt into 3 or more tasks with explicit dependency declarations. Each task specifies:

- A unique `task-id` in kebab-case (e.g., `define-user-types`, not `task-1`)
- A full `description` -- complete enough for a builder with no other context to implement correctly
- A `dependencies` list of task IDs that must complete before this task can start

Root tasks -- those with no dependencies -- are the entry points of the DAG. Every other task must trace a path back to at least one root.

### Visualization in the Spec File

Before any agent is dispatched, the orchestrator writes the full task graph to the spec file as a table:

```markdown
| Task ID | Subject | Dependencies | Wave | Status |
|---------|---------|-------------|------|--------|
| define-user-types | Define User types | (none) | 1 | pending |
| implement-get-users | Implement GET /users | define-user-types | 2 | pending |
| write-user-route-tests | Write route tests | implement-get-users, implement-post-users, implement-get-user-by-id | 3 | pending |
```

This table makes the entire plan visible before a single line of code is written.

### Enforcement via TaskCreate

Dependencies are enforced at the task infrastructure level using `addBlockedBy`. After all tasks are created, the orchestrator calls `TaskUpdate` on each task that has dependencies, passing the numeric task IDs returned by `TaskCreate`. Claude Code's task system then prevents blocked tasks from being dispatched until their blockers are resolved.

This is structural enforcement -- not just documentation. A task in Wave 3 is architecturally incapable of running before Wave 2 completes, because the task system blocks it.

### Validity Requirements

The orchestrator's decomposition step must produce a valid DAG before writing the spec file:

- **No circular dependencies** -- if A depends on B and B depends on A, the graph is invalid and cannot execute
- **No orphaned tasks** -- every task must be reachable from a root
- **Minimum 3 tasks** -- a single-task prompt belongs in the Stage 1 dispatch loop, not a DAG

### Concrete Example

For the prompt "add a REST API with GET /users, POST /users, and GET /users/:id -- include types, handlers, and tests":

| Task ID | Dependencies | Rationale |
|---------|-------------|-----------|
| `define-user-types` | (none) | Root -- handlers cannot be typed without the type definitions |
| `implement-get-users` | `define-user-types` | Handlers import the types -- must come after |
| `implement-post-users` | `define-user-types` | Same dependency as get-users |
| `implement-get-user-by-id` | `define-user-types` | Same dependency as get-users |
| `write-user-route-tests` | `implement-get-users`, `implement-post-users`, `implement-get-user-by-id` | Tests import all three handlers -- must come last |

The dependency structure here is not arbitrary -- it mirrors real compile-time constraints. Types must exist before handlers can import them. Handlers must exist before tests can import them.

---

## Where It Comes From

The DAG as a model for dependency-ordered execution has been independently discovered by virtually every serious workflow system:

**Build systems:** Make (1976) was the first mainstream system to model compilation as a DAG. Bazel and Gradle both use DAGs to determine which targets need rebuilding and in what order. The classic Makefile `all: types handlers tests` is a hand-written DAG.

**Workflow orchestrators:** Temporal, Dagster, Airflow, and Prefect all model workflows as DAGs. Airflow's DAG object is literally named after the pattern. Dagster's asset graph is a DAG of data assets with dependency edges. These systems proved that the DAG model scales from 5-task pipelines to 5,000-task pipelines without conceptual changes.

**Agent frameworks:** LangGraph models agent workflows as directed graphs with conditional edges -- a generalized DAG where edges can carry routing logic. CrewAI's sequential and hierarchical processes are linearized DAGs (chains and trees, respectively). AutoGen's GroupChat patterns with defined execution order are implicit DAGs.

**Community convergence:** Multi-agent coordination research consistently converges on DAG-based dependency tracking as the correct abstraction. The alternative -- ad-hoc "run this after that" logic baked into the orchestrator -- does not compose. A DAG is the minimal structure that is both expressive enough to capture real dependencies and simple enough to reason about.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/wave-computation.md`](wave-computation.md) | How the DAG is executed -- grouping tasks into waves via Kahn's topological sort |
| [`docs/patterns/spec-as-source-of-truth.md`](spec-as-source-of-truth.md) | How the DAG is recorded on disk before execution begins |
| [`docs/patterns/dispatch-loop.md`](dispatch-loop.md) | The per-task dispatch cycle that executes within each wave |
| [`.claude/skills/orchestrator/references/dag-execution.md`](../../.claude/skills/orchestrator/references/dag-execution.md) | Technical reference: full pseudocode, decomposition rules, idempotency |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 2 section -- what DAG decomposition adds to the dispatch loop |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Steps 2 and 3 of the dispatch protocol -- decomposition and wave computation |
