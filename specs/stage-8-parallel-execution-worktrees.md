# Plan: Stage 8 - Parallel Execution + Worktrees

## Task Description

Stage 8 removes the "sequential within waves" constraint that has been in place since Stage 2. Tasks within a wave that share no file dependencies now run in parallel, each in an isolated git worktree. The wave computation algorithm is unchanged -- only the execution strategy within a wave changes. This is the performance breakthrough: a 3-task wave that took 3x serial time now completes in ~1x time. Worktree isolation prevents file conflicts when multiple builders work simultaneously.

**Reference:** [Master Plan - Stage 8](./master-plan.md#stages-6-9-advanced-capabilities)

---

## Objective

When complete:

1. Tasks within a wave dispatch concurrently using `isolation: "worktree"` on the Task tool
2. Each builder operates in its own git worktree -- no file conflicts between concurrent tasks
3. After a wave completes, the orchestrator merges worktree changes back to the main working tree
4. Validators run after their corresponding builder completes (not after the entire wave)
5. The orchestrator detects file overlap between tasks in a wave and falls back to sequential execution for conflicting tasks
6. Wave computation algorithm is unchanged -- waves still respect inter-wave dependencies
7. Fast path is unchanged -- single tasks have no parallelism to exploit
8. Retry protocol works with worktree isolation -- resume preserves the worktree context
9. New pattern docs explain parallel dispatch and worktree isolation
10. New observability events track worktree creation, merge, and conflict detection

---

## Problem Statement

Since Stage 2, tasks within a wave execute sequentially -- one at a time, foreground dispatch, wait for completion. The constraint was architectural: Claude Code's foreground dispatch runs agents in the same working directory, so two builders writing to the same files would conflict. The workaround was "wait for one to finish before starting the next."

This is correct but slow. In a wave with 3 independent handlers (get-users, post-users, get-user-by-id), sequential execution takes 3x the time of a single handler. These tasks touch different files and have no data dependencies between them -- they could run simultaneously if each had its own workspace.

The Claude Code Task tool supports `isolation: "worktree"`, which creates a temporary git worktree for each agent. This gives each builder an isolated copy of the repository. Stage 8 uses this mechanism to parallelize within-wave execution while keeping the wave-boundary serialization that guarantees dependency correctness.

---

## Solution Approach

### 1. Parallel Dispatch Within Waves

Change Step 10 (Execute Waves) from sequential to parallel within-wave execution:

**Before (Stage 2-7):**
```
For each task in wave:
    dispatch builder (foreground, wait)
    dispatch validator (foreground, wait)
    parse verdict
    next task
```

**After (Stage 8):**
```
For each wave:
    analyze file overlap between tasks
    group tasks: parallel-safe vs sequential-fallback

    for parallel-safe tasks (dispatched concurrently):
        dispatch builder (foreground, isolation: "worktree")
        on builder completion: dispatch validator
        collect all verdicts

    for sequential-fallback tasks (after parallel batch):
        dispatch builder (foreground, no worktree)
        dispatch validator
        parse verdict

    merge worktree changes back to main working tree
    next wave
```

### 2. Worktree Isolation via Task Tool

The Task tool's `isolation: "worktree"` parameter creates a temporary git worktree for the agent:

- The agent receives an isolated copy of the repository
- File changes are made in the worktree, not the main working directory
- If the agent makes changes, the worktree path and branch are returned in the result
- If the agent makes no changes, the worktree is automatically cleaned up

**Builder dispatch with worktree:**
```
Task({
    description: "Build task <task-id>",
    prompt: "<builder prompt>",
    subagent_type: "$BUILDER_AGENT",
    model: "sonnet",
    isolation: "worktree"
})
```

The builder operates in the worktree. When it completes, the orchestrator gets back the worktree path and branch name.

### 3. File Overlap Detection

Before dispatching tasks in parallel, the orchestrator must check for file conflicts. Two tasks that modify the same file cannot run in parallel -- they must be sequenced.

**Detection algorithm:**
1. For each task in the wave, extract the target files from the task description (file paths listed in the description and acceptance criteria).
2. Build a file-to-tasks map: `{ "src/types/user.ts": ["task-a", "task-b"] }`.
3. If any file maps to more than one task, those tasks conflict.
4. Group tasks into:
   - **Parallel-safe:** tasks with no file overlap with any other task in the wave
   - **Sequential-fallback:** tasks that share files with other tasks (run these one-at-a-time after the parallel batch)

**Example:**
```
Wave 2 tasks:
  implement-get-users     -> src/routes/users.ts, src/handlers/get-users.ts
  implement-post-users    -> src/routes/users.ts, src/handlers/post-users.ts
  implement-get-user-by-id -> src/routes/users.ts, src/handlers/get-user-by-id.ts

File overlap: src/routes/users.ts is shared by all 3 tasks
Result: all 3 tasks fall back to sequential execution
```

```
Wave 2 tasks:
  implement-get-users     -> src/handlers/get-users.ts
  implement-post-users    -> src/handlers/post-users.ts
  implement-get-user-by-id -> src/handlers/get-user-by-id.ts

File overlap: none
Result: all 3 tasks run in parallel
```

### 4. Worktree Merge Protocol

After all parallel builders in a wave complete, the orchestrator merges changes from each worktree back to the main working tree:

1. For each completed worktree (where the builder made changes):
   - The Task tool returns the worktree branch name
   - Use `git merge <worktree-branch> --no-edit` to merge changes into the current branch
   - If merge succeeds: proceed to validation
   - If merge conflicts: log the conflict, dispatch the builder again in the main working tree (sequential fallback) to resolve
2. After all merges complete, run validators for each task

**Merge order:** Process worktrees in task dependency order within the wave (though in practice, same-wave tasks have no dependencies between each other, so order doesn't matter).

**Conflict handling:** Merge conflicts indicate that the file overlap detection missed something (a builder modified a file not listed in its task description). Log a `worktree.conflict` event and fall back to sequential re-execution for the conflicting task. This is a recovery mechanism, not a common path.

### 5. Validator Dispatch Strategy

Two options for when validators run in parallel mode:

**Option A (chosen): Validate after each builder completes.**
As each parallel builder finishes, immediately dispatch its validator. Validators can run while other builders are still in progress. This maximizes concurrency -- the validator for task A starts as soon as builder A finishes, even if builder B and C are still running.

**Option B (not chosen): Validate after all builders in the wave complete.**
Wait for all parallel builders to finish, merge all worktrees, then validate each task sequentially. This is simpler but slower -- validators can't start until the slowest builder in the wave finishes.

We choose Option A because:
- Validators are fast (haiku) -- they don't benefit from batching
- Early validation means early retry if needed
- The overall wave time is dominated by the slowest builder, not the validators

**However**, validators need to see the merged state (all builders' changes) to validate cross-task consistency. Since validators run on the merged main tree (not in worktrees), we need the merge to complete before validation. This creates a constraint: validate after merge, not after builder completion.

**Revised strategy:** After ALL parallel builders in a wave complete and their worktrees are merged, dispatch all validators concurrently (validators are read-only, so they can safely run in parallel on the merged tree).

### 6. Retry with Worktree Isolation

When a task fails validation in parallel mode:

1. The orchestrator has the worktree branch from the original builder dispatch
2. On retry, dispatch the builder with `resume: agentId` and `isolation: "worktree"`
3. The resumed builder continues in a new worktree (it has its prior conversation context from `resume` but a fresh file state from the worktree)
4. After the retry builder completes, merge the new worktree and re-validate
5. Retry mechanics (3 attempts, user escalation) are unchanged

### 7. Updated Dispatch Protocol

Step 10 expands but the overall protocol step count stays at 14 (from Stage 6):

| Step | Name | Change for Stage 8 |
|------|------|---------------------|
| 1-9 | Parse through Create Tasks | unchanged |
| 10 | Execute Waves | **MAJOR CHANGE** -- parallel dispatch within waves |
| 10a | **File Overlap Detection** | **NEW** sub-step within Step 10 |
| 10b | **Parallel Builder Dispatch** | **NEW** sub-step within Step 10 |
| 10c | **Worktree Merge** | **NEW** sub-step within Step 10 |
| 10d | **Parallel Validator Dispatch** | **NEW** sub-step within Step 10 |
| 11-12 | Update Spec, Report | changed -- include parallel execution stats |

### 8. New Observability Events

| Event | When |
|-------|------|
| `parallel.evaluated` | After file overlap detection -- reports which tasks are parallel-safe |
| `worktree.created` | When a builder is dispatched with worktree isolation |
| `worktree.merged` | When a worktree is successfully merged back |
| `worktree.conflict` | When a merge conflict is detected (triggers sequential fallback) |
| `parallel.stats` | At wave completion -- total time saved by parallel execution |

### 9. Fast Path Unchanged

The fast path (Step 3b) has a single task -- there is nothing to parallelize. Fast path dispatch is unchanged. Worktree isolation is not used for fast path because there's no conflict risk with a single builder.

---

## Relevant Files

### Existing Files to Modify

- `.claude/skills/orchestrator/SKILL.md` -- major rewrite of Step 10 (Execute Waves) to add parallel dispatch, file overlap detection, worktree merge; add sub-steps 10a-10d; update Steps 11 and 12 with parallel stats
- `.claude/skills/orchestrator/references/dag-execution.md` -- add Parallel Execution section, File Overlap Detection algorithm, Worktree Merge Protocol, update Within-Wave Sequencing constraint to show parallel option, add Stage 8 events to catalog, update event sequence examples
- `.claude/commands/orchestrate.md` -- document `--sequential` flag to disable parallel execution (fall back to pre-Stage-8 sequential behavior)
- `.claude/CLAUDE.md` -- update project description for Stage 8, update "What This Stage Does NOT Do" (remove "No parallel wave execution")
- `docs/patterns/wave-computation.md` -- update "Why Sequential Within Waves" section to show the Stage 8 parallel option, update the "What changes in Stage 8" preview to full documentation
- `docs/agents.md` -- add note about builders running in worktrees during parallel execution
- `specs/master-plan.md` -- mark Stage 8 complete, add file tables, update status

### New Files

- `docs/patterns/parallel-dispatch.md` -- pattern doc for parallel within-wave execution
- `docs/patterns/worktree-isolation.md` -- pattern doc for git worktree isolation in agent orchestration
- `specs/stage-8-parallel-execution-worktrees.md` -- this file (stage spec)
- `prompts/stage-8/parallel-handlers.md` -- test prompt with 3+ independent tasks in one wave (expect parallel execution)
- `prompts/stage-8/file-overlap.md` -- test prompt where tasks share files (expect sequential fallback)
- `specs/examples/stage-8-parallel-execution.md` -- example spec output showing parallel dispatch, worktree events, merge, and timing stats

---

## Implementation Phases

### Phase 1: Foundation (Reference + Pattern Docs)

Create the parallel execution reference sections in dag-execution.md and write the two new pattern docs. These define the mechanics before SKILL.md references them.

1. Add Parallel Execution section to dag-execution.md: file overlap detection algorithm, worktree merge protocol, parallel validator dispatch strategy, retry with worktrees
2. Add Stage 8 events to dag-execution.md observability catalog
3. Create parallel-dispatch.md pattern doc
4. Create worktree-isolation.md pattern doc

### Phase 2: Core Implementation (SKILL.md Rewrite)

Modify SKILL.md Step 10 to support parallel execution with worktree isolation.

1. Rewrite Step 10 with sub-steps 10a (file overlap detection), 10b (parallel builder dispatch), 10c (worktree merge), 10d (parallel validator dispatch)
2. Update the retry protocol section for worktree-aware retries
3. Update Steps 11 and 12 with parallel execution stats
4. Update HOP Configuration if needed
5. Update "What This Stage Does NOT Do" section

### Phase 3: Integration + Polish

Update supporting files, create test prompts, update master plan.

1. Update orchestrate.md with --sequential flag
2. Update CLAUDE.md project description
3. Update wave-computation.md pattern doc
4. Update agents.md with worktree notes
5. Create test prompts (parallel-handlers, file-overlap)
6. Create example spec output
7. Update master-plan.md with Stage 8 status and file tables

---

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. Use Task and Task* tools only.
- Take note of the session id (agentId) of each team member for resume operations.

### Model Selection Guide

| Role | Model | Rationale |
|------|-------|-----------|
| All builders | sonnet | Executes well-specified tasks reliably |
| All validators | haiku | Mechanical checks: read files, run commands, report PASS/FAIL |

### Team Members

- Builder
  - Name: builder-reference
  - Role: Add parallel execution sections to dag-execution.md and create both pattern docs
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-skill
  - Role: Rewrite SKILL.md Step 10 with parallel dispatch, worktree merge, and updated retry protocol
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Update supporting files (orchestrate.md, CLAUDE.md, wave-computation.md, agents.md), create test prompts, example spec, update master plan
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-stage8
  - Role: Validate all Stage 8 files for correctness, consistency, and completeness
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

---

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.

### 1. Add Parallel Execution to dag-execution.md
- **Task ID**: update-dag-reference-parallel
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current dag-execution.md thoroughly before modifying
- Update header: "Introduced in: Stage 2 (updated in Stage 3, Stage 6, Stage 8)"
- Update "Within-Wave Sequencing (Stage 2 Constraint)" section:
  - Rename to "Within-Wave Execution Strategy"
  - Document both modes: sequential (default pre-Stage 8) and parallel (Stage 8+)
  - The `--sequential` flag reverts to pre-Stage 8 behavior
- Add "Parallel Execution" section after Execution Protocol:
  - **File Overlap Detection Algorithm:**
    - Extract target files from each task's description (file paths, not just directory references)
    - Build file-to-tasks map
    - Tasks sharing any file are "conflicting" -- must run sequentially
    - Tasks with no shared files are "parallel-safe"
    - Emit `parallel.evaluated` event with the grouping result
  - **Parallel Builder Dispatch:**
    - All parallel-safe tasks in a wave dispatch concurrently
    - Each builder gets `isolation: "worktree"` on the Task tool
    - The orchestrator dispatches all builders, then waits for all to complete
    - Sequential-fallback tasks run after the parallel batch completes
  - **Worktree Merge Protocol:**
    - After all parallel builders complete, merge each worktree branch into the current branch
    - Use `git merge <branch> --no-edit` for each
    - On merge success: emit `worktree.merged`, proceed to validation
    - On merge conflict: emit `worktree.conflict`, dispatch builder again sequentially to resolve
    - Process merges one at a time to prevent cascading conflicts
  - **Parallel Validator Dispatch:**
    - After all worktrees are merged, dispatch validators concurrently
    - Validators are read-only -- they can safely run in parallel on the merged tree
    - Collect all verdicts, then process retries for any FAIL results
  - **Retry with Worktree Isolation:**
    - On FAIL, retry builder with `resume: agentId` and `isolation: "worktree"`
    - The resumed builder has its prior conversation context but a fresh worktree
    - After retry builder completes, merge worktree, re-validate
    - Retry cap (3 attempts) and user escalation are unchanged
- Add Stage 8 events to Observability Events section:
  - `parallel.evaluated` -- after file overlap detection: `{ orchestrationId, waveNumber, parallelSafe: ["task-a", "task-b"], sequentialFallback: ["task-c"], fileOverlaps: { "src/routes/users.ts": ["task-a", "task-c"] } }`
  - `worktree.created` -- when worktree builder dispatched: `{ orchestrationId, taskId, worktreePath }`
  - `worktree.merged` -- on successful merge: `{ orchestrationId, taskId, branch }`
  - `worktree.conflict` -- on merge conflict: `{ orchestrationId, taskId, conflictFiles: [...] }`
  - `parallel.stats` -- at wave completion: `{ orchestrationId, waveNumber, parallelTasks, sequentialTasks, wallTimeMs, serialEstimateMs, speedup }`
- Update Full Event Sequence to show a Stage 8 parallel flow:
  - Show parallel.evaluated, worktree.created (x3), worktree.merged (x3), parallel.stats
- Update Related Documents table

### 2. Create Parallel Dispatch Pattern Doc
- **Task ID**: create-parallel-dispatch-pattern
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 1)
- Create `docs/patterns/parallel-dispatch.md` with:
  - **What It Is:** concurrent execution of independent tasks within a dependency wave, using workspace isolation to prevent file conflicts
  - **How We Use It Here:** file overlap detection groups tasks into parallel-safe and sequential-fallback buckets; parallel-safe tasks dispatch concurrently with worktree isolation; validators run after merge; retry preserves worktree semantics
  - **The Key Insight:** wave computation already identifies which tasks CAN run in parallel (same-wave tasks have no dependencies between them). The only barrier was file-level conflicts in a shared workspace. Worktree isolation removes that barrier for tasks touching different files.
  - **Why Not Just Background Agents:** Claude Code background agents cannot use MCP tools (Read, Write, Bash, etc.). Worktree isolation via the Task tool's `isolation: "worktree"` parameter gives each foreground agent its own workspace without losing MCP access.
  - **Community Sources:** Turborepo's parallel task execution, Bazel's action graph parallelism, GPU warp scheduling, LangGraph's parallel node execution, IndyDevDan's multi-agent dispatch patterns
  - **Trade-offs:**
    - Merge conflicts possible (mitigated by file overlap detection)
    - Worktree creation has overhead (~1-2s per worktree) -- not worth it for 1-task waves
    - Token cost is the same (same number of dispatches) but wall-clock time decreases
    - Debugging is harder (parallel logs interleave)
  - **Related Documents:** links to worktree-isolation.md, wave-computation.md, SKILL.md, dag-execution.md

### 3. Create Worktree Isolation Pattern Doc
- **Task ID**: create-worktree-isolation-pattern
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 1, 2)
- Create `docs/patterns/worktree-isolation.md` with:
  - **What It Is:** using git worktrees to give each concurrent agent an isolated copy of the repository, preventing file-level conflicts during parallel execution
  - **How We Use It Here:** the Task tool's `isolation: "worktree"` parameter creates a temporary worktree for each builder in a parallel wave; builders work on isolated branches; changes merge back after completion
  - **Git Worktree Mechanics:**
    - A worktree is a separate working directory attached to the same git repository
    - Each worktree has its own branch, index, and working tree -- but shares the object store
    - Creation is fast (no full clone, just checkout)
    - Cleanup is automatic when the agent makes no changes
    - When changes are made: the worktree path and branch name are returned
  - **Why Worktrees Over Other Isolation:**
    - Full clones: too slow, waste disk space, separate object store
    - Docker containers: too heavy for per-task isolation, networking complexity
    - Branch switching: only one checked-out branch per working directory
    - Worktrees: fast, lightweight, shared object store, native git feature
  - **The Merge Challenge:** multiple worktrees modifying the same file can conflict on merge. The file overlap detection algorithm prevents this by routing conflicting tasks to sequential execution.
  - **Community Sources:** git worktree documentation, Copilot Workspace's parallel editing model, distributed build systems using per-task workspaces
  - **Related Documents:** links to parallel-dispatch.md, SKILL.md, dag-execution.md

### 4. Validate Reference and Pattern Docs
- **Task ID**: validate-reference-patterns
- **Depends On**: update-dag-reference-parallel, create-parallel-dispatch-pattern, create-worktree-isolation-pattern
- **Assigned To**: validator-stage8
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify dag-execution.md has "Parallel Execution" section with:
  - File Overlap Detection Algorithm
  - Parallel Builder Dispatch
  - Worktree Merge Protocol
  - Parallel Validator Dispatch
  - Retry with Worktree Isolation
- Verify dag-execution.md has 5 new events in observability catalog
- Verify dag-execution.md event sequence includes a parallel flow example
- Verify `docs/patterns/parallel-dispatch.md` exists with all required sections
- Verify `docs/patterns/worktree-isolation.md` exists with all required sections
- Verify cross-references between the three files are consistent
- Report VERDICT: PASS or VERDICT: FAIL

### 5. Rewrite SKILL.md Step 10 for Parallel Execution
- **Task ID**: rewrite-skill-step10
- **Depends On**: validate-reference-patterns
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current SKILL.md thoroughly before modifying
- Update title: "HOP Orchestrator (Stage 8 - Parallel Execution + Worktrees)"
- Rewrite Step 10 (Execute Waves) with the following sub-steps:

**Step 10a: File Overlap Detection (per wave)**
- Before dispatching any builders in a wave, extract target files from each task's description
- Build a file-to-tasks map
- Group tasks into parallel-safe (no shared files) and sequential-fallback (shared files)
- Emit `parallel.evaluated` event with the grouping
- If ALL tasks conflict (worst case): log the overlap and execute all tasks sequentially (same as pre-Stage 8 behavior)
- If `--sequential` flag was provided: skip overlap detection, execute all tasks sequentially

**Step 10b: Parallel Builder Dispatch**
- For all parallel-safe tasks, dispatch builders concurrently:
  - Each Task tool call includes `isolation: "worktree"` and `model: "sonnet"`
  - Emit `worktree.created` for each dispatched builder
  - Wait for ALL parallel builders to complete
- After parallel batch completes, execute sequential-fallback tasks one at a time (same as pre-Stage 8 behavior, no worktree isolation)

**Step 10c: Worktree Merge**
- For each completed parallel builder that made changes:
  - Read the worktree branch name from the Task tool result
  - Merge via `git merge <branch> --no-edit`
  - On success: emit `worktree.merged`
  - On conflict: emit `worktree.conflict`, abort merge (`git merge --abort`), re-dispatch builder sequentially without worktree isolation
- Process merges one at a time

**Step 10d: Parallel Validator Dispatch**
- After all builders complete and all worktrees are merged:
  - Dispatch validators concurrently for all tasks in the wave
  - Validators run on the merged main tree (no worktree isolation needed -- they are read-only)
  - Wait for ALL validators to complete
  - Parse all verdicts

**Retry in Parallel Mode:**
- On FAIL: retry the specific builder with `resume: agentId` and `isolation: "worktree"`
- After retry builder completes: merge worktree, re-validate
- Retry cap (3 attempts) and user escalation unchanged

- Update Steps 11 and 12:
  - Step 11: include parallel execution stats in Result section (parallel tasks, sequential fallback tasks, speedup)
  - Step 12: report parallel execution stats, worktree merge results
- Update "What This Stage Does NOT Do":
  - Remove "No parallel wave execution" (it's now implemented)
  - Keep remaining future-stage items
- Add `parallel.stats` event emission at end of each wave

### 6. Update SKILL.md Emit Events for Parallel Flow
- **Task ID**: update-skill-events
- **Depends On**: rewrite-skill-step10
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Ensure all new emit-event.ts calls are properly integrated in SKILL.md:
  - `parallel.evaluated` in Step 10a
  - `worktree.created` in Step 10b (once per parallel builder)
  - `worktree.merged` in Step 10c (once per successful merge)
  - `worktree.conflict` in Step 10c (if any conflict)
  - `parallel.stats` at end of each wave in Step 10
- Update the Full Event Sequence Reference section at the bottom of SKILL.md to include a parallel execution example alongside the existing sequential example
- Ensure the `--sequential` flag is referenced in Step 1 (Parse the User Prompt) for flag parsing

### 7. Validate SKILL.md Updates
- **Task ID**: validate-skill-updates
- **Depends On**: update-skill-events
- **Assigned To**: validator-stage8
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify SKILL.md has Step 10 with sub-steps 10a, 10b, 10c, 10d
- Verify Step 10a has file overlap detection algorithm
- Verify Step 10b uses `isolation: "worktree"` in Task tool calls
- Verify Step 10c has merge protocol with conflict handling
- Verify Step 10d dispatches validators concurrently
- Verify retry protocol references worktree isolation
- Verify `--sequential` flag is parsed in Step 1
- Verify all 5 new events are emitted at the correct points
- Verify event sequence reference includes parallel example
- Verify Steps 11 and 12 include parallel stats
- Verify "What This Stage Does NOT Do" no longer mentions parallel execution
- Report VERDICT: PASS or VERDICT: FAIL

### 8. Update orchestrate.md Command
- **Task ID**: update-command
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 9, 10, 11)
- Read current orchestrate.md before modifying
- Add `--sequential` flag documentation (disables parallel execution, reverts to pre-Stage-8 sequential behavior)
- Update usage examples showing parallel execution for multi-task waves

### 9. Update CLAUDE.md Project Description
- **Task ID**: update-claude-md
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 8, 10, 11)
- Update project description to reflect Stage 8
- Update "How to Use" with examples showing parallel execution
- Update "Architecture" to mention worktree isolation
- Update "What This Stage Does NOT Do" -- remove parallel execution line, keep remaining items

### 10. Update wave-computation.md and agents.md
- **Task ID**: update-pattern-agents-docs
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 8, 9, 11)
- Update `docs/patterns/wave-computation.md`:
  - Replace "Why Sequential Within Waves (For Now)" section with "Within-Wave Execution"
  - Document both sequential and parallel modes
  - Replace the "What changes in Stage 8" preview with a full "Stage 8: Parallel Execution" section
  - Update the examples to show parallel timing
- Update `docs/agents.md`:
  - Add note about builders running in worktrees during parallel execution
  - Note that validators always run on the merged main tree (no worktree needed)

### 11. Create Test Prompts and Example Spec
- **Task ID**: create-test-prompts
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 8, 9, 10)
- Create `prompts/stage-8/parallel-handlers.md`:
  - A prompt that produces 3+ independent tasks in a single wave (e.g., "add GET, POST, DELETE handlers for /products, each in its own file")
  - Expected behavior: all handlers dispatch in parallel with worktree isolation, validators run concurrently after merge
  - Document expected events: parallel.evaluated (3 parallel-safe), worktree.created (x3), worktree.merged (x3), parallel.stats
- Create `prompts/stage-8/file-overlap.md`:
  - A prompt where tasks share a file (e.g., "add 3 route handlers that all modify src/routes/index.ts")
  - Expected behavior: file overlap detected, tasks fall back to sequential execution
  - Document expected events: parallel.evaluated (0 parallel-safe, 3 sequential-fallback)
- Create `specs/examples/stage-8-parallel-execution.md`:
  - Example spec output showing:
    - Task graph with 3 parallel tasks in Wave 2
    - Execution log with parallel dispatch, worktree events, merge events
    - parallel.stats showing speedup (e.g., 3 tasks in ~1x time vs ~3x serial estimate)
    - Result section with parallel execution stats

### 12. Update Master Plan
- **Task ID**: update-master-plan
- **Depends On**: update-command, update-claude-md, update-pattern-agents-docs, create-test-prompts
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current `specs/master-plan.md` thoroughly
- Update Stage 8 status from "Planned" to "Complete" in the status table
- Add a complete file table for Stage 8 (matching format of Stages 1-3):
  - List all new and modified files with commit group assignments
- Add verification section for Stage 8:
  1. Parallel execution: `/orchestrate "add GET, POST, DELETE handlers each in its own file"` -- expect parallel dispatch
  2. File overlap fallback: `/orchestrate "add 3 handlers that all modify routes/index.ts"` -- expect sequential fallback
  3. Sequential flag: `/orchestrate "..." --sequential` -- expect pre-Stage-8 sequential behavior
  4. Full flow: multi-wave orchestration with mix of parallel and sequential within waves
- Update "Next step" to point to Stage 9

### 13. Final Validation
- **Task ID**: validate-all
- **Depends On**: update-master-plan
- **Assigned To**: validator-stage8
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify all new files exist:
  - `docs/patterns/parallel-dispatch.md`
  - `docs/patterns/worktree-isolation.md`
  - `prompts/stage-8/parallel-handlers.md`
  - `prompts/stage-8/file-overlap.md`
  - `specs/examples/stage-8-parallel-execution.md`
- Verify all modified files reference Stage 8:
  - SKILL.md title includes "Stage 8"
  - SKILL.md has Steps 10a, 10b, 10c, 10d
  - SKILL.md has `--sequential` flag parsing
  - dag-execution.md has Parallel Execution section
  - dag-execution.md event catalog has 5 new events
  - orchestrate.md has --sequential flag
  - CLAUDE.md reflects Stage 8 description
  - wave-computation.md has full Stage 8 documentation (no more "For Now" hedging)
  - agents.md has worktree notes
  - master-plan.md shows Stage 8 as complete
- Verify cross-references are consistent:
  - SKILL.md references dag-execution.md for parallel execution mechanics
  - Pattern doc links are valid relative paths
  - Event payloads in SKILL.md match dag-execution.md catalog
  - "What This Stage Does NOT Do" in both SKILL.md and CLAUDE.md no longer mentions parallel execution
- Run `bun run validate` to verify no lint/typecheck/test regressions
- Report VERDICT: PASS or VERDICT: FAIL

---

## Acceptance Criteria

1. Tasks within a wave dispatch concurrently when they have no file overlap
2. Each parallel builder runs in its own git worktree via `isolation: "worktree"` on the Task tool
3. Worktree changes merge back to the main branch after builder completion
4. File overlap detection correctly identifies tasks that share target files
5. Tasks with file overlap fall back to sequential execution (no parallel dispatch)
6. Validators dispatch concurrently after all builders complete and worktrees merge
7. The `--sequential` flag disables parallel execution entirely
8. Retry protocol works with worktree isolation (resume + new worktree)
9. Merge conflicts trigger sequential fallback with `worktree.conflict` event
10. 5 new observability events are documented and emitted at correct points
11. Wave computation algorithm is unchanged -- only within-wave execution changes
12. Fast path is unchanged -- no worktree isolation for single tasks
13. Pattern docs explain parallel dispatch and worktree isolation with community context
14. Test prompts exercise both parallel execution and file overlap fallback
15. Master plan shows Stage 8 as complete with file tables
16. `bun run validate` passes with no regressions

---

## Validation Commands

- `bun test` -- run all tests
- `bunx tsc --noEmit` -- verify no type errors
- `bunx biome ci .` -- lint and format check

---

## Notes

- **The Task tool's `isolation: "worktree"` is a built-in Claude Code feature.** We don't need to implement worktree management ourselves -- the Task tool handles creation, checkout, and cleanup. We only need to handle the merge back to the main branch.
- **File overlap detection is conservative.** If there's any doubt about whether two tasks touch the same file (e.g., one task mentions a directory, not specific files), default to sequential execution. False negatives (missing an overlap) cause merge conflicts; false positives (over-detecting overlap) just fall back to sequential (slower but correct).
- **Parallel execution does not change token cost.** The same number of builder and validator dispatches occur. The only difference is wall-clock time -- parallel waves complete faster. The token estimation formula from Stage 3 is unchanged.
- **Worktree branches are temporary.** After merge, the worktree branch is no longer needed. The Task tool's automatic cleanup handles this. If a worktree merge succeeds, the branch can be deleted safely.
- **Stages 4-7 dependency:** This plan assumes Stages 4-7 are complete. The SKILL.md being modified already has --team switching (Stage 4), plugin extraction (Stage 5), Codex escalation and spec hardening (Stage 6), and HITL bounce-back and persistence (Stage 7). If executing before those stages, apply changes to the current SKILL.md and note that those features are absent.
- **No TypeScript code changes are required for Stage 8.** This is a pure prompt/docs/reference stage. The emit-event.ts script already handles arbitrary event payloads. Worktree management is handled by the Task tool natively.
- **The parallel.stats event provides speedup metrics.** `speedup = serialEstimateMs / wallTimeMs`. A wave with 3 parallel tasks that each take ~30s would have: serialEstimate = 90s, wallTime = ~35s (including merge overhead), speedup = ~2.6x. This is informational -- it helps validate that parallel execution is providing real benefit.
