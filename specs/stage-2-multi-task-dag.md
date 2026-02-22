# Plan: Stage 2 - Multi-Task DAG with Wave Execution

## Task Description

Implement Stage 2 of the HOP Orchestrator prototype. This stage upgrades the orchestrator from single-task dispatch (Stage 1) to multi-task decomposition with a dependency DAG, wave-based execution, and spec file persistence. The orchestrator now decomposes a user prompt into 3+ tasks with explicit dependencies, computes execution waves via topological sort, writes a spec file to disk as the source of truth, and executes wave-by-wave -- dispatching builder/validator pairs per task, per wave.

This is the jump from "can dispatch one thing" to "can coordinate a real project." It introduces three new patterns: Task DAG, Wave Computation, and Spec-as-Source-of-Truth.

**Reference:** [Master Plan - Stage 2](./master-plan.md#stage-2-multi-task-decomposition-with-dag)

## Objective

When complete, running `/orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id. Include types, route handlers, and tests."` will:

1. Orchestrator decomposes the prompt into 3-5 tasks with explicit dependencies (e.g., types -> handlers -> tests)
2. Orchestrator writes a spec file to `specs/<name>.md` capturing the full decomposition, task graph, and acceptance criteria
3. Orchestrator computes execution waves from the dependency graph (Wave 1: no deps, Wave 2: depends on Wave 1, etc.)
4. For each wave, dispatches builder then validator per task, sequentially within each wave
5. Re-reads the spec file at each wave boundary (context compaction defense)
6. Reports the full result: all tasks, all verdicts, wave execution summary

## Problem Statement

Stage 1 proved the dispatch loop works for a single task. But real work requires decomposition -- breaking a prompt into multiple tasks with dependencies. Without this, the orchestrator can only handle atomic requests ("add one function"). Stage 2 enables compound requests ("build an API with types, handlers, and tests") by introducing task decomposition, dependency tracking, and ordered execution.

## Solution Approach

Extend the existing SKILL.md from a 5-step single-task protocol to a multi-phase decomposition protocol. The core change is that Step 2 (Create a Task) becomes Step 2 (Decompose into Tasks) + Step 3 (Compute Waves) + Step 4 (Write Spec File). Execution then proceeds wave-by-wave rather than as a single dispatch.

A new reference document (`dag-execution.md`) provides the wave algorithm, dependency rules, and idempotency guarantees that the orchestrator follows. This keeps the SKILL.md focused on the protocol while the reference handles the technical details.

Three new pattern docs explain the concepts for anyone reading the repo.

## Relevant Files

Existing files to read and understand before working:

- `specs/master-plan.md` -- Stage 2 section, directory structure, design decisions, observability progressive rollout (Stage 2 events)
- `specs/orchestration-observability-impl.md` -- Stage 2 events section (decomposition.completed, spec.written, spec.reread, wave.started, wave.completed)
- `.claude/skills/orchestrator/SKILL.md` -- Current Stage 1 SKILL.md (5-step protocol to extend)
- `.claude/agents/builder.md` -- Builder agent definition (unchanged, but builders need context for multi-task work)
- `.claude/agents/validator.md` -- Validator agent definition (unchanged)
- `.claude/commands/orchestrate.md` -- Command wrapper (unchanged)
- `.claude/settings.json` -- Tool permissions (may need additions)
- `scripts/emit-event.ts` -- Event emitter (unchanged, but new event types are emitted)
- `docs/patterns/dispatch-loop.md` -- Stage 1 pattern (may reference Stage 2 additions)
- `docs/patterns/builder-validator.md` -- Stage 1 pattern (unchanged)
- `docs/patterns/higher-order-prompt.md` -- Stage 1 pattern (unchanged)
- `docs/agents.md` -- Agent catalog (unchanged for Stage 2)
- `specs/examples/stage-1-hello-world.md` -- Stage 1 example output (reference for Stage 2 example format)

### New Files

- `.claude/skills/orchestrator/references/dag-execution.md` -- NEW: Wave algorithm, dependency rules, idempotency, spec file format, timeout handling
- `docs/patterns/task-dag.md` -- NEW: Task DAG pattern doc (What, How, Where)
- `docs/patterns/wave-computation.md` -- NEW: Wave Computation pattern doc (What, How, Where)
- `docs/patterns/spec-as-source-of-truth.md` -- NEW: Spec-as-Source-of-Truth pattern doc (What, How, Where)
- `specs/examples/stage-2-rest-api.md` -- NEW: Example spec output showing multi-task decomposition
- `prompts/stage-2/rest-api.md` -- NEW: Primary test prompt (REST API with types, handlers, tests)
- `prompts/stage-2/cli-tool.md` -- NEW: Secondary test prompt (CLI with arg parsing, commands, help)

### Modified Files

- `.claude/skills/orchestrator/SKILL.md` -- MAJOR UPDATE: extend from 5-step single-task to multi-phase DAG protocol
- `.claude/CLAUDE.md` -- UPDATE: add Stage 2 concepts to project overview, mention spec files and DAG

## Implementation Phases

### Phase 1: Reference Document & Spec Example

Create the dag-execution.md reference that SKILL.md will rely on, and the example spec output that shows what "done" looks like. These are the foundation -- builders working on SKILL.md need to reference dag-execution.md, and the example shows the target format.

### Phase 2: SKILL.md Major Update

Extend the orchestrator's protocol from single-task dispatch to multi-task DAG execution. This is the core deliverable. The SKILL.md grows from ~150 lines to ~300+ lines, adding decomposition, wave computation, spec file writing, wave-by-wave execution, spec re-read, and multi-task reporting.

### Phase 3: Pattern Docs & Supporting Materials

Create the three new pattern docs, test prompts, and update CLAUDE.md. These are the educational layer that explains what Stage 2 teaches.

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
  - Role: Creates dag-execution.md reference and stage-2 example spec
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-skill
  - Role: Extends SKILL.md with multi-task DAG protocol
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Creates pattern docs, test prompts, updates CLAUDE.md
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-stage-2
  - Role: Validates all files exist, have correct structure, and DAG protocol is coherent
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.

### 1. Create DAG Execution Reference Document
- **Task ID**: create-dag-reference
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `specs/master-plan.md` -- Stage 2 section, Key Design Decisions, observability progressive rollout
- Read `specs/orchestration-observability-impl.md` -- Stage 2 events section for event types to reference
- Read `.claude/skills/orchestrator/SKILL.md` -- understand current Stage 1 protocol you're extending
- Read `docs/patterns/dispatch-loop.md` -- understand existing dispatch loop this builds on
- Create `.claude/skills/orchestrator/references/dag-execution.md` with:
  - Title: "DAG Execution Reference"
  - Introduced in: Stage 2
  - Purpose statement: this is the technical reference that SKILL.md delegates to for wave algorithm details
  - **Task Decomposition Rules:**
    - Decompose user prompt into 3+ tasks (minimum for DAG to be meaningful)
    - Each task gets a unique task ID (kebab-case, descriptive)
    - Each task must have: subject, description (full requirements, file paths, signatures, acceptance criteria), activeForm, dependencies list
    - Dependencies are expressed as task IDs that must complete before this task can start
    - No circular dependencies allowed
    - Every task must be reachable from at least one root (no orphaned tasks)
  - **Wave Computation Algorithm:**
    - Wave 1: all tasks with zero dependencies (roots)
    - Wave N: all tasks whose dependencies are ALL in waves 1 through N-1
    - Algorithm: Kahn's topological sort, grouping by depth level
    - Pseudocode showing the wave computation
    - Example: types (wave 1) -> handlers (wave 2, depends on types) -> tests (wave 3, depends on handlers)
  - **Execution Protocol:**
    - Execute waves sequentially: complete all tasks in Wave N before starting Wave N+1
    - Within a wave, execute tasks sequentially (Stage 1 constraint -- foreground-only dispatch)
    - For each task: dispatch builder, wait, dispatch validator, wait, record verdict
    - If any task in a wave gets VERDICT: FAIL, stop execution and report (no retry in Stage 2 -- that's Stage 3)
    - Re-read the spec file at each wave boundary (context compaction defense -- the LLM may have lost the plan)
  - **Spec File Format:**
    - Location: `specs/<descriptive-kebab-case-name>.md`
    - Filename derived from the user prompt (e.g., "add a REST API" -> `specs/rest-api.md`)
    - Structure:
      ```
      # Orchestration Spec: <title>

      ## Prompt
      <original user prompt>

      ## Task Graph
      | Task ID | Subject | Dependencies | Wave | Status |

      ## Tasks
      ### <task-id>
      - Subject: ...
      - Dependencies: ...
      - Wave: N
      - Status: pending | in_progress | completed | failed
      - Description: <full requirements>
      - Acceptance Criteria: <list>

      ## Execution Log
      ### Wave 1
      - Task <id>: builder dispatched -> validator dispatched -> VERDICT: PASS/FAIL
      ### Wave 2
      ...

      ## Result
      <final summary>
      ```
    - Spec file is written BEFORE execution begins (it is the plan, not the report)
    - Spec file is UPDATED during execution (status changes, execution log entries)
    - Spec file is the source of truth -- the orchestrator re-reads it at each wave boundary
  - **Idempotency Rules:**
    - If a task's status is already `completed` in the spec file, skip it (don't re-dispatch)
    - If a wave is fully completed, skip to the next wave
    - This enables resumption if the orchestrator is interrupted mid-execution
  - **Observability Events (Stage 2 additions):**
    - `decomposition.completed` -- emitted after task graph is constructed, data includes task count and wave count
    - `spec.written` -- emitted after spec file is written to disk, data includes file path
    - `spec.reread` -- emitted when spec is re-read at wave boundary, data includes wave number
    - `wave.started` -- emitted when a wave begins, data includes wave number and task IDs in this wave
    - `wave.completed` -- emitted when all tasks in a wave have verdicts, data includes wave number and verdicts
  - Related Documents table linking to master plan, SKILL.md, dispatch-loop pattern, wave-computation pattern

### 2. Create Stage 2 Example Spec Output
- **Task ID**: create-example-spec
- **Depends On**: create-dag-reference
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read the dag-execution.md just created (from task 1) for the spec file format
- Read `specs/examples/stage-1-hello-world.md` for the example format convention
- Read `specs/master-plan.md` Stage 2 verification prompt for the REST API scenario
- Create `specs/examples/stage-2-rest-api.md` with:
  - Title: "Example Spec Output: Stage 2 - REST API"
  - Note that this is an example of what the orchestrator produces for a multi-task decomposition
  - Show the complete expected spec file output for the prompt: "add a REST API with GET /users, POST /users, and GET /users/:id. Include types, route handlers, and tests."
  - Example decomposition into 4 tasks:
    1. `create-user-types` (Wave 1): Create User type and API response types in `src/types/user.ts`
    2. `create-route-handlers` (Wave 2, depends on create-user-types): Create route handlers in `src/routes/users.ts` for GET /users, POST /users, GET /users/:id
    3. `create-test-suite` (Wave 3, depends on create-route-handlers): Create tests in `tests/routes/users.test.ts`
    4. `create-server-entry` (Wave 2, depends on create-user-types): Create or update server entry point in `src/server.ts` to wire routes
  - Show the Task Graph table with waves assigned
  - Show example execution log with builder outputs and validator verdicts
  - Show final result summary
  - Related Documents table

### 3. Validate Reference and Example
- **Task ID**: validate-reference
- **Depends On**: create-example-spec
- **Assigned To**: validator-stage-2
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify `.claude/skills/orchestrator/references/dag-execution.md` exists and contains:
  - Task decomposition rules (minimum 3 tasks, unique IDs, no circular deps)
  - Wave computation algorithm (Kahn's topological sort, pseudocode)
  - Execution protocol (sequential waves, foreground dispatch, fail-stop, spec re-read)
  - Spec file format (with the markdown template structure)
  - Idempotency rules (skip completed tasks, enable resumption)
  - Observability events section listing all 5 Stage 2 events
- Verify `specs/examples/stage-2-rest-api.md` exists and contains:
  - A complete spec file matching the format defined in dag-execution.md
  - At least 3 tasks with dependencies forming a multi-wave DAG
  - Task Graph table with Wave column
  - Execution Log section showing wave-by-wave results
- Report VERDICT: PASS or VERDICT: FAIL with specific issues

### 4. Extend SKILL.md with DAG Protocol
- **Task ID**: extend-skill-md
- **Depends On**: validate-reference
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `.claude/skills/orchestrator/SKILL.md` -- the current Stage 1 5-step protocol (this is what you're extending)
- Read `.claude/skills/orchestrator/references/dag-execution.md` -- the technical reference you delegate to
- Read `specs/examples/stage-2-rest-api.md` -- the target output format
- Read `specs/orchestration-observability-impl.md` -- Stage 2 events for emit calls
- Read `.claude/agents/builder.md` and `.claude/agents/validator.md` -- understand agent capabilities
- Read `.claude/commands/orchestrate.md` -- understand command entry point (unchanged)
- Extend `.claude/skills/orchestrator/SKILL.md`:
  - Update title to: "HOP Orchestrator (Stage 2 - Multi-Task DAG)"
  - Keep the HOP Configuration block unchanged (same variables)
  - **Replace the 5-step protocol with an 8-step protocol:**
    - Step 1: Parse the User Prompt (same as Stage 1 -- understand intent, emit `orchestration.started`)
    - Step 2: Decompose into Tasks
      - Analyze the prompt and break it into 3+ tasks with dependencies
      - Each task needs: unique task-id, subject, description (full requirements including file paths, function signatures, named exports, JSDoc, acceptance criteria), activeForm, list of dependency task-ids
      - Reference dag-execution.md for decomposition rules
      - Emit `decomposition.completed` with task count and wave count
    - Step 3: Compute Waves
      - Apply Kahn's topological sort to group tasks into waves
      - Wave 1 = tasks with no dependencies, Wave N = tasks whose deps are all in earlier waves
      - Reference dag-execution.md for the algorithm
    - Step 4: Write Spec File
      - Write the full spec to `$SPEC_DIR/<descriptive-name>.md`
      - Use the format defined in dag-execution.md
      - Include: original prompt, task graph table, full task descriptions, empty execution log
      - Emit `spec.written` with the file path
    - Step 5: Create All Tasks
      - Use TaskCreate for each task in the decomposition
      - Set addBlockedBy based on dependency task-ids (map task-id to TaskCreate-returned numeric IDs)
      - Emit `task.created` for each task
    - Step 6: Execute Waves
      - For each wave (1, 2, 3, ...):
        - Re-read the spec file (context compaction defense). Emit `spec.reread`.
        - Emit `wave.started` with wave number and task IDs
        - For each task in the wave:
          - Dispatch $BUILDER_AGENT (model sonnet, foreground). Emit `agent.dispatched` before, `agent.completed` after.
          - Dispatch $VALIDATOR_AGENT (model haiku, foreground). Emit `agent.dispatched` before, `agent.completed` after.
          - Parse verdict. Emit `verdict.received`.
          - Update spec file with task status and execution log entry.
          - If VERDICT: FAIL, stop execution immediately and go to Step 8.
        - Emit `wave.completed` with wave number and all verdicts from this wave
    - Step 7: Update Spec File with Final Result
      - Write the Result section of the spec file with the full summary
    - Step 8: Report Result
      - If all tasks passed: report the full build summary (files created/modified per task, wave execution order, all verdicts)
      - If any task failed: report which task failed, which wave it was in, and the validator's specific failing checks
      - Emit `orchestration.completed` with overall verdict and task count
  - **Keep the existing sections but update them:**
    - "What This Stage Proves" -- update to describe DAG decomposition, wave execution, spec persistence
    - "What This Stage Does NOT Do" -- update: no retry (Stage 3), no clarifying questions (Stage 3), no fast path (Stage 3), no team switching (Stage 4). Remove items that ARE now in Stage 2 (DAG, waves, spec file).
  - **Important SKILL.md authoring rules:**
    - The SKILL.md must be self-contained enough for the LLM to follow without reading dag-execution.md on every invocation, but should reference it for detailed algorithm specifications
    - Builder and validator dispatch prompts must tell the agent which task to work on (include task ID in the prompt)
    - The spec re-read instruction at wave boundaries is critical -- without it, context compaction can evict the plan mid-execution
    - All emit calls must include the orchestrationId for correlation

### 5. Update CLAUDE.md with Stage 2 Concepts
- **Task ID**: update-claude-md
- **Depends On**: extend-skill-md
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `.claude/CLAUDE.md` -- current project instructions
- Read `.claude/skills/orchestrator/SKILL.md` -- just-updated SKILL.md for accurate descriptions
- Update `.claude/CLAUDE.md`:
  - Update the "What This Repo Is" section to mention multi-task decomposition and DAG execution (keep it concise)
  - Update the project structure section to include `references/` directory under skills
  - Add a brief mention that spec files are written to `specs/` during orchestration
  - Keep everything else the same -- don't remove Stage 1 content, build on it

### 6. Validate SKILL.md and CLAUDE.md Updates
- **Task ID**: validate-skill
- **Depends On**: update-claude-md
- **Assigned To**: validator-stage-2
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify `.claude/skills/orchestrator/SKILL.md` contains:
  - Title mentions "Stage 2" and "Multi-Task DAG"
  - HOP Configuration block with BUILDER_AGENT, VALIDATOR_AGENT, SPEC_DIR variables (unchanged from Stage 1)
  - 8-step protocol (Parse, Decompose, Compute Waves, Write Spec, Create Tasks, Execute Waves, Update Spec, Report)
  - Decomposition step references dag-execution.md
  - Wave computation step describes Kahn's algorithm or references dag-execution.md
  - Spec file writing step with format reference
  - Execute Waves step includes: spec re-read at wave boundary, sequential builder/validator dispatch per task, fail-stop on VERDICT: FAIL
  - All Stage 2 observability events present: decomposition.completed, spec.written, spec.reread, wave.started, wave.completed
  - All Stage 1 events still present: orchestration.started, task.created, agent.dispatched, agent.completed, verdict.received, orchestration.completed
  - "What This Stage Does NOT Do" updated (no retry, no clarifying questions, no fast path, no team switching)
- Verify `.claude/CLAUDE.md` mentions:
  - Multi-task decomposition or DAG
  - Spec files in specs/ directory
  - References directory under skills
- Report VERDICT: PASS or VERDICT: FAIL with specific issues

### 7. Create Pattern Docs
- **Task ID**: create-pattern-docs
- **Depends On**: validate-skill
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `specs/master-plan.md` -- Stage 2 patterns list, design decisions
- Read `.claude/skills/orchestrator/SKILL.md` -- the updated protocol for accurate "How We Use It Here" sections
- Read `.claude/skills/orchestrator/references/dag-execution.md` -- wave algorithm details
- Read `docs/patterns/dispatch-loop.md` -- Stage 1 pattern format to follow (What It Is, How We Use It Here, Where It Comes From, Related Documents)
- Read `docs/patterns/builder-validator.md` -- another Stage 1 pattern for format reference
- Read `docs/patterns/higher-order-prompt.md` -- another Stage 1 pattern for format reference
- Create `docs/patterns/task-dag.md`:
  - "Introduced in: Stage 2 (Multi-Task DAG)"
  - **What It Is:** A directed acyclic graph of tasks where edges represent dependencies. Tasks that depend on other tasks cannot start until their dependencies complete. The DAG is the bridge between "understand the prompt" and "execute the work" -- it captures both what needs to be done and the order constraints.
  - **How We Use It Here:**
    - The orchestrator decomposes the user prompt into 3+ tasks in Step 2
    - Each task declares its dependencies as a list of task IDs
    - The DAG is visualized in the spec file's Task Graph table
    - Dependencies are enforced via TaskCreate's addBlockedBy parameter
    - No circular dependencies allowed (the decomposition step must produce a valid DAG)
    - Example: types (no deps) -> handlers (depends on types) -> tests (depends on handlers)
  - **Where It Comes From:**
    - Build systems: Make, Bazel, Gradle all model compilation as a DAG
    - Workflow orchestrators: Temporal, Dagster, Airflow, Prefect all use DAGs for task ordering
    - LangGraph: models agent workflows as directed graphs with conditional edges
    - CrewAI: sequential and hierarchical processes are linearized DAGs
    - AutoGen: GroupChat patterns with defined execution order
    - Community: multi-agent coordination consistently converges on DAG-based dependency tracking
  - Related Documents table
- Create `docs/patterns/wave-computation.md`:
  - "Introduced in: Stage 2 (Multi-Task DAG)"
  - **What It Is:** Wave computation groups DAG tasks into execution layers (waves). Wave 1 contains all root tasks (no dependencies). Wave 2 contains tasks whose dependencies are all in Wave 1. Wave N contains tasks whose dependencies are all in Waves 1 through N-1. This is Kahn's algorithm applied to task scheduling.
  - **How We Use It Here:**
    - The orchestrator computes waves in Step 3 using Kahn's topological sort
    - Waves execute sequentially: all tasks in Wave N must complete before Wave N+1 starts
    - Within a wave, tasks execute sequentially (Stage 2 limitation -- parallel execution is Stage 8)
    - The spec file records which wave each task belongs to
    - At each wave boundary, the orchestrator re-reads the spec file (context compaction defense)
    - If any task fails, execution stops immediately (no retry in Stage 2)
  - **Why Sequential Within Waves (for now):**
    - Stage 2 uses foreground-only dispatch (same constraint as Stage 1)
    - Parallel within-wave execution requires worktree isolation (Stage 8)
    - Sequential is simpler to implement and debug -- good enough for learning the pattern
  - **Where It Comes From:**
    - Kahn's algorithm (1962): classic topological sort by iteratively removing nodes with no incoming edges
    - Build system parallelism: Make -j, Bazel, Turborepo all compute dependency layers for parallel execution
    - GPU warp scheduling: waves/warps are groups of independent work items that can execute concurrently
    - Database query planning: join ordering uses dependency analysis to determine execution layers
  - Related Documents table
- Create `docs/patterns/spec-as-source-of-truth.md`:
  - "Introduced in: Stage 2 (Multi-Task DAG)"
  - **What It Is:** The orchestrator writes a spec file to disk before execution begins. This file captures the full decomposition -- task graph, descriptions, acceptance criteria, execution log. It is re-read at each wave boundary to survive context compaction. The spec file is both the plan and the audit trail.
  - **How We Use It Here:**
    - Written in Step 4 to `specs/<descriptive-name>.md`
    - Contains: original prompt, task graph table, full task descriptions, execution log
    - Updated during execution: task statuses change, execution log entries are appended
    - Re-read at each wave boundary (Step 6) -- this is the context compaction defense
    - Enables idempotent resumption: if the orchestrator is interrupted, it can re-read the spec and skip completed tasks
  - **Why Context Compaction Matters:**
    - Claude Code automatically compresses older context when approaching limits
    - In a multi-wave execution, the decomposition plan from Step 2 may be evicted by the time Wave 3 starts
    - Re-reading the spec file at each wave boundary restores the full plan to the context window
    - Without this, the orchestrator would lose track of what tasks remain and what dependencies they have
  - **Where It Comes From:**
    - Temporal workflow snapshots: persist workflow state so it survives process restarts
    - Event sourcing: the spec file is essentially an event log of the orchestration
    - agentic-orchestration plugin: the plan-with-team command writes spec files to `specs/` that serve as execution blueprints
    - IndyDevDan's pattern: "the spec is the source of truth, not the conversation context"
    - Community consensus: durable plans that survive context window limits are essential for long-running agent workflows
  - Related Documents table

### 8. Create Test Prompts
- **Task ID**: create-test-prompts
- **Depends On**: validate-skill
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (can run in parallel with create-pattern-docs since both depend on validate-skill)
- Read `prompts/stage-1/hello-world.md` and `prompts/stage-1/add-utility.md` for format reference
- Read `specs/master-plan.md` Stage 2 verification section for the primary prompt
- Read `.claude/skills/orchestrator/SKILL.md` for the updated protocol
- Read `.claude/skills/orchestrator/references/dag-execution.md` for wave computation details
- Create `prompts/stage-2/rest-api.md`:
  - Title: "Test Prompt: REST API"
  - Stage: 2 (Multi-Task DAG)
  - Complexity: Medium -- multi-file, multi-task, dependencies required
  - Prompt: "add a REST API with GET /users, POST /users, and GET /users/:id. Include types, route handlers, and tests."
  - Expected Behavior:
    1. Orchestrator decomposes into 3-5 tasks with explicit dependencies
    2. Spec file written to specs/ with task graph and wave assignments
    3. Wave 1 executes (types/foundations), Wave 2 (handlers/server), Wave 3 (tests)
    4. Each task: builder creates files, validator checks, verdict reported
    5. Final report summarizes all waves and verdicts
  - What to Look For:
    - Task decomposition has real dependencies (types before handlers, handlers before tests)
    - Wave computation correctly groups independent tasks into the same wave
    - Spec file matches the format in dag-execution.md
    - Spec file is re-read at each wave boundary (check emit events for spec.reread)
    - All Stage 2 observability events are emitted
    - If a task fails, execution stops at that wave (no retry)
  - Why This Prompt: tests the core DAG capabilities -- decomposition, dependency tracking, multi-wave execution, spec persistence
  - Related Documents table
- Create `prompts/stage-2/cli-tool.md`:
  - Title: "Test Prompt: CLI Tool"
  - Stage: 2 (Multi-Task DAG)
  - Complexity: Medium -- multi-file, different dependency pattern than REST API
  - Prompt: "create a CLI tool in src/cli/ with argument parsing, a greet command, a version command, and a help output. Include tests."
  - Expected Behavior:
    1. Orchestrator decomposes into 3-4 tasks (arg parser -> commands -> help -> tests)
    2. Different dependency shape than REST API (tests deeper tree rather than wide DAG)
    3. Spec file written, waves computed, execution proceeds wave by wave
  - What to Look For:
    - Decomposition produces a different DAG shape than the REST API prompt
    - Tests that the orchestrator adapts decomposition to the problem, not using a fixed template
    - Wave computation handles linear chains (A -> B -> C) as well as fan-out
  - Why This Prompt: validates that decomposition is prompt-driven, not hardcoded
  - Related Documents table

### 9. Final Validation
- **Task ID**: validate-all
- **Depends On**: create-pattern-docs, create-test-prompts
- **Assigned To**: validator-stage-2
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Read the task via TaskGet
- Verify ALL Stage 2 files exist:
  - `.claude/skills/orchestrator/references/dag-execution.md` (new)
  - `.claude/skills/orchestrator/SKILL.md` (updated with 8-step protocol)
  - `.claude/CLAUDE.md` (updated with Stage 2 mentions)
  - `docs/patterns/task-dag.md` (new)
  - `docs/patterns/wave-computation.md` (new)
  - `docs/patterns/spec-as-source-of-truth.md` (new)
  - `specs/examples/stage-2-rest-api.md` (new)
  - `prompts/stage-2/rest-api.md` (new)
  - `prompts/stage-2/cli-tool.md` (new)
- Verify SKILL.md coherence:
  - Title says "Stage 2"
  - Has 8 steps, not 5
  - Step 2 is decomposition (not "create a task")
  - Step 3 is wave computation
  - Step 4 writes spec file
  - Step 6 includes spec re-read at wave boundary
  - References dag-execution.md
  - All 11 observability events present (6 from Stage 1 + 5 from Stage 2)
- Verify dag-execution.md coherence:
  - Has wave computation algorithm with pseudocode
  - Has spec file format template
  - Has idempotency rules
  - Has all 5 Stage 2 events listed
- Verify pattern docs all follow the established format:
  - "Introduced in: Stage 2"
  - What It Is section
  - How We Use It Here section
  - Where It Comes From section with community sources
  - Related Documents table
- Verify test prompts follow the Stage 1 format:
  - Stage, Complexity, Prompt, Expected Behavior, What to Look For, Why This Prompt
- Verify all Stage 1 files are unchanged:
  - `.claude/agents/builder.md` -- not modified
  - `.claude/agents/validator.md` -- not modified
  - `.claude/commands/orchestrate.md` -- not modified
  - `.claude/settings.json` -- not modified
  - `scripts/emit-event.ts` -- not modified
- Run `bun test` to confirm existing tests still pass
- Run `bunx tsc --noEmit` to confirm no type errors
- Run `bunx biome ci .` to confirm lint/format passes
- Report VERDICT: PASS or VERDICT: FAIL with comprehensive findings

## Acceptance Criteria

1. SKILL.md has an 8-step protocol that decomposes prompts into 3+ tasks with dependencies
2. SKILL.md computes waves via topological sort and executes wave-by-wave
3. SKILL.md writes a spec file to `specs/` before execution and re-reads it at each wave boundary
4. SKILL.md emits all 11 observability events (6 Stage 1 + 5 Stage 2)
5. dag-execution.md provides the wave algorithm, spec format, idempotency rules, and dependency rules
6. Three new pattern docs explain Task DAG, Wave Computation, and Spec-as-Source-of-Truth with community sources
7. Example spec output shows a complete multi-task decomposition with waves
8. Two test prompts cover different DAG shapes (fan-out REST API, linear CLI tool)
9. CLAUDE.md updated to mention Stage 2 concepts
10. All Stage 1 files unchanged (agents, command, settings, emit-event.ts)
11. Existing tests pass (`bun test`)
12. No type errors (`bunx tsc --noEmit`)
13. Lint/format clean (`bunx biome ci .`)

## Validation Commands

- `bun test` -- run all tests
- `bunx tsc --noEmit` -- verify no type errors
- `bunx biome ci .` -- lint and format check

## Notes

- **Stage 2 builds on Stage 1.** SKILL.md is extended, not replaced. The HOP Configuration block, builder/validator agents, orchestrate command, and emit-event.ts all remain from Stage 1. Stage 2 adds decomposition, waves, and spec files.
- **No retry in Stage 2.** If a task fails (VERDICT: FAIL), the orchestrator stops and reports the failure. Retry logic is Stage 3.
- **No clarifying questions in Stage 2.** The orchestrator processes prompts as-is. Vague prompts may produce suboptimal decompositions. Clarifying questions are Stage 3.
- **Sequential within waves.** Even though Wave computation enables identifying parallelizable tasks, Stage 2 executes them sequentially (foreground-only dispatch). Parallel execution within waves is Stage 8.
- **Spec re-read is critical.** This is the most important new concept in Stage 2 from an implementation standpoint. Without it, the orchestrator loses its plan during long multi-wave executions due to context compaction.
- **Observability events are cumulative.** Stage 2 adds 5 new events on top of Stage 1's 6, totaling 11 events. The emit-event.ts script doesn't change -- it accepts any event type string.
- **No new agent definitions.** Builder and validator agents are unchanged. They handle multi-task work the same way they handle single-task work -- one task at a time, read it via TaskGet, implement/validate it.

### References

- [Master Plan](./master-plan.md) -- Stage 2 spec, directory structure, design decisions, observability rollout
- [Observability Spec](./orchestration-observability-impl.md) -- Stage 2 events (decomposition.completed, spec.written, spec.reread, wave.started, wave.completed)
- [Stage 1 Spec](./stage-1-minimum-viable-dispatch.md) -- What was built in Stage 1 (the foundation this extends)
- [Stage 1 Example](./examples/stage-1-hello-world.md) -- Example format convention for spec outputs
