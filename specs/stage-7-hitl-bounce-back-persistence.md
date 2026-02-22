# Plan: Stage 7 - HITL Bounce-Back + Persistence

## Task Description

Stage 7 adds two complementary capabilities to the orchestrator: **HITL Bounce-Back** (a structured protocol for the orchestrator to pause execution and consult the user mid-flow for decisions beyond the existing retry escalation) and **Persistence/Hydration** (the spec file becomes a full orchestration state store that enables cross-session resume -- if a session dies mid-wave, the next `/orchestrate` invocation re-hydrates from the spec file and picks up where it left off).

These address the two remaining fragility modes: the orchestrator getting stuck on ambiguous situations that aren't simple validation failures (bounce-back), and losing all progress when a session ends unexpectedly (persistence).

**Reference:** [Master Plan - Stage 7](./master-plan.md#stages-6-9-advanced-capabilities)

---

## Objective

When complete:

1. The orchestrator has a structured HITL Bounce-Back protocol with defined trigger conditions beyond retry exhaustion (architectural decisions, scope ambiguity discovered mid-execution, external dependency issues, conflicting acceptance criteria)
2. Bounce-back pauses execution, presents context to the user, collects a decision, and resumes -- without losing progress
3. Task statuses gain a new `bounced` state in the lifecycle: `pending -> in_progress -> bounced -> in_progress -> completed`
4. The spec file captures full orchestration state: current wave, task agent IDs (for resume), retry counts, bounce-back history, and a hydration checkpoint section
5. Cross-session resume works: re-invoking `/orchestrate --resume specs/<name>.md` re-hydrates from the spec file and continues execution from the last checkpoint
6. The existing idempotency rules (skip completed, re-dispatch in_progress) are extended with hydration metadata so resume is seamless
7. New pattern docs: `docs/patterns/hitl-protocol.md` and `docs/patterns/hydration-pattern.md`
8. New reference doc: `.claude/skills/orchestrator/references/hitl-protocol.md`

---

## Problem Statement

### Bounce-Back Gaps

Stage 3 introduced two HITL touchpoints: clarifying questions (pre-decomposition) and plan refinement (pre-dispatch). Stage 3 also added retry escalation (after 3 builder failures, ask the user). But these are pre-planned interaction points. During execution, the orchestrator can encounter situations that none of these cover:

- A builder discovers during implementation that two tasks have conflicting requirements (task A says "use class-based approach", task B's existing code uses functional style)
- A validator reports PASS on the code but notes a design concern that doesn't violate acceptance criteria (e.g., "this works but creates a circular dependency")
- An external dependency is unavailable (npm package not found, API endpoint down)
- The builder's implementation reveals that the decomposition was wrong (one task should have been two, or vice versa)

In Stages 1-6, these situations either silently pass (the orchestrator doesn't detect them) or trigger retry loops that can't fix them (retrying won't resolve a design conflict). Stage 7 adds a structured protocol for the orchestrator to recognize these situations and bounce back to the user.

### Session Fragility

The orchestrator's state lives in two places: the spec file on disk and the LLM's context window. The spec file captures task status and execution log, but it does NOT capture:

- Which agent IDs were used (needed for `resume: agentId` on retry)
- The current wave being executed
- Which tasks within the current wave have been processed
- The orchestration ID (needed for event correlation)
- Whether the session was interrupted mid-merge, mid-retry, or mid-bounce

If a session dies (context window exhaustion, network failure, user closing the terminal), all this state is lost. The user must restart from scratch, re-executing completed tasks unnecessarily.

Stage 7 extends the spec file to capture all orchestration state, and adds a `--resume` flag that re-hydrates from a spec file to continue execution.

---

## Solution Approach

### 1. HITL Bounce-Back Protocol

Add a structured bounce-back mechanism that the orchestrator can invoke at any point during execution.

**Bounce-Back Triggers:**

| Trigger | When Detected | Example |
|---------|--------------|---------|
| Conflicting requirements | Builder reports conflicting patterns in existing code | "Task A says REST, but existing code uses GraphQL" |
| Architectural decision needed | Builder encounters a design fork not covered by the spec | "Should this use a class or module pattern?" |
| Scope discovery | Builder finds the task is larger than expected | "This requires modifying 3 additional files not in the spec" |
| External dependency issue | Builder or validator hits an unavailable resource | "Package @foo/bar not found in registry" |
| Decomposition error | Builder discovers task boundaries are wrong | "Tasks 3 and 4 should be one task -- they share too much state" |
| Validator design concern | Validator passes but flags a concern | "PASS, but this creates a circular import" |

**Bounce-Back Mechanics:**

1. The orchestrator detects a bounce-back trigger (from builder output, validator notes, or its own analysis)
2. Update the task's status to `bounced` in the spec file
3. Emit `hitl.bounced` event with the trigger type and context
4. Present the situation to the user via AskUserQuestion:
   - Describe what was found
   - Provide 2-4 actionable options (not just "what should I do?")
   - Include an "Abort orchestration" option
5. Wait for the user's response
6. Emit `hitl.resolved` event with the user's decision
7. Apply the decision:
   - **Proceed with guidance:** Update the task description in the spec with the user's input, reset status to `in_progress`, re-dispatch builder
   - **Skip task:** Mark as `skipped`, continue
   - **Restructure tasks:** Modify the task graph (split/merge tasks), update spec file, re-compute waves if needed
   - **Abort:** Write failure result, emit `orchestration.cancelled`
8. Resume execution from the current point

**Status Lifecycle Update:**

```
pending -> in_progress -> completed     (happy path)
pending -> in_progress -> failed        (retry exhausted + user chose abort)
pending -> in_progress -> skipped       (retry exhausted + user chose skip)
pending -> in_progress -> bounced -> in_progress -> completed   (bounce-back resolved)
pending -> in_progress -> bounced -> skipped                    (bounce-back, user chose skip)
```

### 2. Persistence / Hydration

Extend the spec file with a `## Hydration Checkpoint` section that captures all volatile orchestration state. This section is updated at every significant state change.

**Hydration Checkpoint Format:**

```markdown
## Hydration Checkpoint

- Orchestration ID: orch-1708642800000
- Team: engineering
- Current Wave: 2
- Wave Progress: [task-a: completed, task-b: in_progress, task-c: pending]
- Agent Sessions:
  - task-a-builder: agent-abc123
  - task-b-builder: agent-def456
- Retry State:
  - task-b: attempt 2 of 3, last verdict: FAIL
- Bounce History:
  - task-a: bounced at wave 1, trigger: scope-discovery, resolution: proceed with guidance
- Codex Available: true
- Sequential Mode: false
- Last Updated: 2026-02-22T10:30:00Z
```

**When to Update the Checkpoint:**

| Event | What to Write |
|-------|--------------|
| Wave starts | Current Wave, Wave Progress (all pending) |
| Builder dispatched | Agent Sessions entry with agentId |
| Builder completed | Wave Progress update |
| Validator completed | Wave Progress update, verdict |
| Retry started | Retry State update with attempt number |
| Bounce-back triggered | Bounce History entry, task status |
| Bounce-back resolved | Bounce History resolution, task status |
| Wave completed | Current Wave increment, clear Wave Progress |

### 3. Resume Protocol (--resume flag)

Add `--resume specs/<name>.md` to the `/orchestrate` command. When present:

1. Parse the --resume flag to get the spec file path
2. Read the spec file from disk
3. Read the Hydration Checkpoint section
4. Re-hydrate orchestration state:
   - Restore orchestrationId (for event correlation)
   - Restore team configuration
   - Restore current wave number
   - Restore agent session IDs (for `resume: agentId` on retries)
   - Restore retry state
   - Restore bounce history
5. Apply idempotency rules:
   - Skip completed waves entirely
   - Skip completed tasks within the current wave
   - Re-dispatch `in_progress` tasks (interrupted mid-execution)
   - Handle `bounced` tasks (re-present the bounce-back to the user)
6. Emit `orchestration.resumed` event with the restore point
7. Continue execution from the restore point

**Resume vs Fresh Start:**

| Scenario | What Happens |
|----------|-------------|
| `/orchestrate "add REST API"` | Fresh start -- decompose, spec, plan review, execute |
| `/orchestrate --resume specs/rest-api.md` | Resume -- hydrate from spec, skip completed, continue |
| `/orchestrate "add REST API"` (spec exists) | Fresh start -- creates new spec (e.g., `rest-api-2.md`), does NOT auto-resume |

The user must explicitly opt into resume with `--resume`. This prevents accidental collision with existing spec files and gives the user control over whether to continue or start fresh.

### 4. Updated Dispatch Protocol

The 14-step protocol (from Stage 6) gains modifications but no new top-level steps:

| Step | Name | Change for Stage 7 |
|------|------|---------------------|
| 1 | Parse User Prompt | **CHANGED** -- parse `--resume` flag, hydrate if present |
| 2-9 | Clarify through Create Tasks | skipped on resume (already done) |
| 10 | Execute Waves | **CHANGED** -- bounce-back detection, hydration checkpoint writes |
| 11 | Update Spec File | **CHANGED** -- include bounce-back stats, hydration final state |
| 12 | Report Result | **CHANGED** -- report bounce-back events, resume stats |

**Step 1 changes:**
- Parse `--resume <spec-path>` from the command arguments
- If present: read spec file, hydrate from checkpoint, skip Steps 2-9, jump to Step 10 at the restore point
- If not present: proceed as normal (fresh start)
- Emit `orchestration.resumed` (if resuming) or `orchestration.started` (if fresh)

**Step 10 changes:**
- After each builder completes, analyze the builder's output for bounce-back triggers
- After each validator completes, analyze the validator's output for design concerns
- If a trigger is detected: invoke the bounce-back protocol
- Write hydration checkpoint after every state change (builder dispatch, validator verdict, retry, bounce-back)

### 5. New Reference Document

Create `.claude/skills/orchestrator/references/hitl-protocol.md` containing:
- Bounce-back trigger catalog (the full trigger table with examples)
- Bounce-back detection heuristics (what to look for in builder/validator output)
- Bounce-back resolution options (proceed, skip, restructure, abort)
- Task status lifecycle with bounced state
- Hydration checkpoint format and update rules
- Resume protocol (--resume flag parsing, hydration algorithm, idempotency)
- New observability events catalog for Stage 7

### 6. New Observability Events

| Event | When |
|-------|------|
| `hitl.bounced` | Orchestrator detects a bounce-back trigger and pauses |
| `hitl.resolved` | User provides a resolution for the bounce-back |
| `orchestration.resumed` | Orchestration resumes from a hydration checkpoint |
| `checkpoint.written` | Hydration checkpoint is updated in the spec file |

---

## Relevant Files

### Existing Files to Modify

- `.claude/skills/orchestrator/SKILL.md` -- add --resume flag parsing in Step 1, bounce-back detection in Step 10, hydration checkpoint writes throughout, update Steps 11 and 12 with bounce-back and resume stats
- `.claude/skills/orchestrator/references/dag-execution.md` -- add Bounce-Back Protocol section, Hydration Checkpoint section, Resume Protocol section, add Stage 7 events to catalog, update event sequence examples, extend task status lifecycle
- `.claude/commands/orchestrate.md` -- document `--resume` flag syntax
- `.claude/CLAUDE.md` -- update project description for Stage 7, update "What This Stage Does NOT Do" (remove persistence/HITL lines)
- `docs/patterns/spec-as-source-of-truth.md` -- update with hydration checkpoint extension, cross-session resume capability
- `docs/agents.md` -- add note about bounce-back behavior (builders should surface unexpected findings, not silently proceed)
- `specs/master-plan.md` -- mark Stage 7 complete, add file tables, update status

### New Files

- `.claude/skills/orchestrator/references/hitl-protocol.md` -- HITL bounce-back reference, hydration checkpoint format, resume protocol
- `docs/patterns/hitl-protocol.md` -- pattern doc for HITL bounce-back in agent orchestration
- `docs/patterns/hydration-pattern.md` -- pattern doc for state persistence and cross-session resume
- `specs/stage-7-hitl-bounce-back-persistence.md` -- this file (stage spec)
- `prompts/stage-7/mid-execution-conflict.md` -- test prompt designed to trigger a bounce-back mid-execution
- `prompts/stage-7/resume-interrupted.md` -- test prompt for testing cross-session resume
- `specs/examples/stage-7-bounce-back-resume.md` -- example spec output showing bounce-back events and hydration checkpoint

---

## Implementation Phases

### Phase 1: Foundation (HITL Reference + Pattern Docs)

Create the hitl-protocol.md reference document and write both new pattern docs. These define the mechanics before SKILL.md references them.

1. Create hitl-protocol.md reference with bounce-back triggers, detection heuristics, resolution options, hydration checkpoint format, resume protocol
2. Create hitl-protocol.md pattern doc (the "what, how, why" explanation)
3. Create hydration-pattern.md pattern doc

### Phase 2: Core Implementation (SKILL.md + DAG Reference Updates)

Modify SKILL.md to add bounce-back detection, hydration checkpoint writes, and --resume flag parsing. Update dag-execution.md with the new sections.

1. Update SKILL.md Step 1 with --resume flag parsing and hydration
2. Update SKILL.md Step 10 with bounce-back detection and checkpoint writes
3. Update SKILL.md Steps 11 and 12 with bounce-back and resume stats
4. Update dag-execution.md with Bounce-Back Protocol, Hydration Checkpoint, Resume Protocol sections
5. Update dag-execution.md event catalog with Stage 7 events

### Phase 3: Integration + Polish

Update supporting files, create test prompts, update master plan.

1. Update orchestrate.md with --resume flag
2. Update CLAUDE.md project description
3. Update spec-as-source-of-truth.md pattern doc with hydration extension
4. Update agents.md with bounce-back behavior notes
5. Create test prompts (mid-execution conflict, resume-interrupted)
6. Create example spec output
7. Update master-plan.md with Stage 7 status and file tables

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
  - Role: Create the hitl-protocol.md reference document and both pattern docs
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-skill
  - Role: Update SKILL.md with --resume parsing, bounce-back detection, hydration checkpoint writes, and dag-execution.md updates
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Update supporting files (orchestrate.md, CLAUDE.md, spec-as-source-of-truth.md, agents.md), create test prompts, example spec, update master plan
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-stage7
  - Role: Validate all Stage 7 files for correctness, consistency, and completeness
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

---

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.

### 1. Create HITL Protocol Reference Document
- **Task ID**: create-hitl-reference
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Create `.claude/skills/orchestrator/references/hitl-protocol.md` with these sections:

**Bounce-Back Trigger Catalog:**
- Define each trigger type with detection heuristics:
  - `conflicting-requirements` -- builder output contains phrases like "conflicts with", "existing code uses a different pattern", "task X says Y but task Z says W"
  - `architectural-decision` -- builder output asks a design question or notes "multiple approaches possible", "should this use X or Y"
  - `scope-discovery` -- builder output mentions files not listed in the task, "this also requires changes to", "more files affected than expected"
  - `external-dependency` -- builder or validator output contains "not found", "unavailable", "could not resolve", "ENOTFOUND"
  - `decomposition-error` -- builder output suggests "these tasks should be combined" or "this task should be split", or validator notes "task boundary issue"
  - `design-concern` -- validator output contains "VERDICT: PASS" but also includes warnings, "concern:", "note:", "circular dependency"
- Each trigger has: name, detection heuristics, severity (blocking vs advisory), example output strings

**Bounce-Back Protocol Mechanics:**
- Step-by-step: detect trigger -> update status to `bounced` -> emit event -> present to user -> wait -> apply resolution -> resume
- Resolution options per trigger type (some triggers have different option sets)
- Default resolution options: "Proceed with guidance", "Skip this task", "Restructure tasks", "Abort orchestration"
- The "Restructure tasks" option allows the user to describe changes to the task graph; the orchestrator rewrites the spec file and re-computes waves

**Task Status Lifecycle:**
- Full lifecycle diagram with `bounced` state
- Transitions: pending -> in_progress -> bounced -> in_progress -> completed
- `bounced` is a temporary hold state -- the task cannot proceed until the user responds
- A task can bounce multiple times (e.g., bounced -> resolved -> re-dispatched -> bounced again on a different trigger)

**Hydration Checkpoint Format:**
- Full template of the `## Hydration Checkpoint` section
- Field-by-field documentation of what each field stores and when it's updated
- The checkpoint is always at the bottom of the spec file (after Result, which may be empty during execution)
- Update frequency: after every state-changing event (see update table)

**Resume Protocol:**
- `--resume specs/<name>.md` flag parsing
- Hydration algorithm: read checkpoint -> restore orchestrationId, team, wave, agent sessions, retry state, bounce history
- Idempotency on resume: completed tasks skipped, in_progress re-dispatched, bounced re-presented, pending executed normally
- Resume event emission: `orchestration.resumed` with restore point details
- Edge cases: what if the spec file is corrupted? What if the checkpoint is missing (pre-Stage-7 spec files)? Fall back to basic idempotency (status-based skip/re-dispatch only)

**New Observability Events:**
- `hitl.bounced` -- when a bounce-back trigger is detected: `{ orchestrationId, taskId, trigger, severity, context }`
- `hitl.resolved` -- when the user resolves a bounce-back: `{ orchestrationId, taskId, resolution, guidance }`
- `orchestration.resumed` -- when resuming from checkpoint: `{ orchestrationId, specPath, restoreWave, completedTasks, pendingTasks }`
- `checkpoint.written` -- when the hydration checkpoint is updated: `{ orchestrationId, specPath, currentWave, timestamp }`

### 2. Create HITL Protocol Pattern Doc
- **Task ID**: create-hitl-pattern
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 1)
- Create `docs/patterns/hitl-protocol.md` with:
  - **What It Is:** a structured protocol for an orchestrator to pause mid-execution and consult the user when it encounters situations that automated retry cannot resolve
  - **How We Use It Here:** the bounce-back trigger catalog, detection from builder/validator output, resolution options, task status lifecycle with `bounced` state, the distinction from retry escalation (retry = "it didn't work, try again"; bounce-back = "I found something unexpected, what should I do?")
  - **The Bounce-Back vs Retry Distinction:**
    - Retry: the builder's output was wrong (VERDICT: FAIL). Solution: try again with feedback.
    - Bounce-back: the builder surfaced new information. Solution: consult the user for a decision.
    - Retry is automated. Bounce-back is HITL. They handle different failure modes.
  - **Why Bounce-Back Matters:** without it, the orchestrator has two choices when encountering unexpected situations: silently proceed (risking wrong direction) or abort (losing all progress). Bounce-back adds a third option: pause, consult, resume.
  - **Community Sources:** HITL patterns in ML pipelines (active learning), Temporal's human-in-the-loop signals, approval gates in CI/CD, interactive debugger breakpoints
  - **Related Documents:** links to iterative-refinement.md, retry-with-resume.md, hitl-protocol reference, SKILL.md

### 3. Create Hydration Pattern Doc
- **Task ID**: create-hydration-pattern
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 1, 2)
- Create `docs/patterns/hydration-pattern.md` with:
  - **What It Is:** persisting orchestration state to disk so that a multi-wave agent orchestration can survive session termination and resume in a new session from the last checkpoint
  - **How We Use It Here:** the hydration checkpoint section in the spec file, what state is captured (wave, agent IDs, retry counts, bounce history), the `--resume` flag, the re-hydration algorithm
  - **Why the Spec File is the Right Place:**
    - The spec file already captures task status and execution log (from Stage 2)
    - Adding a checkpoint section extends the existing source of truth rather than creating a second one
    - No external database or service needed -- just a markdown file on disk
    - Human-readable: a developer can open the spec file and see exactly where execution stopped
  - **The Hydration Tradeoff:** checkpoint writes add overhead to every state change. But the cost of losing an entire orchestration (re-executing all tasks) far exceeds the cost of incremental checkpoint writes. This is the same tradeoff journaled filesystems and write-ahead logs make.
  - **Community Sources:** Temporal workflow snapshots, Redis persistence (RDB/AOF), write-ahead logs in databases, game save points, checkpoint/restart in HPC, LangGraph's state persistence
  - **Dehydration (Future):** currently the checkpoint stores state for the current session. A future stage could add "dehydration" -- serializing the full orchestration state to a portable format for archival, sharing, or replay.
  - **Related Documents:** links to spec-as-source-of-truth.md, hitl-protocol.md, SKILL.md

### 4. Validate Reference and Pattern Docs
- **Task ID**: validate-reference-patterns
- **Depends On**: create-hitl-reference, create-hitl-pattern, create-hydration-pattern
- **Assigned To**: validator-stage7
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify hitl-protocol.md reference exists at `.claude/skills/orchestrator/references/hitl-protocol.md` with sections:
  - Bounce-Back Trigger Catalog (6 trigger types with detection heuristics)
  - Bounce-Back Protocol Mechanics (step-by-step)
  - Task Status Lifecycle (with `bounced` state)
  - Hydration Checkpoint Format (full template)
  - Resume Protocol (--resume flag, hydration algorithm, edge cases)
  - Observability Events (4 new events with payloads)
- Verify `docs/patterns/hitl-protocol.md` exists with What/How/Why/Sources sections
- Verify `docs/patterns/hydration-pattern.md` exists with What/How/Why/Sources sections
- Verify cross-references between the three files are consistent
- Verify bounce-back triggers are concrete (specific detection heuristics, not vague "something goes wrong")
- Report VERDICT: PASS or VERDICT: FAIL

### 5. Update SKILL.md with Bounce-Back and Resume
- **Task ID**: update-skill-md
- **Depends On**: validate-reference-patterns
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current SKILL.md thoroughly before modifying
- Update title: "HOP Orchestrator (Stage 7 - HITL Bounce-Back + Persistence)"
- **Step 1 changes (Parse User Prompt):**
  - Add `--resume <spec-path>` flag parsing
  - If --resume is present:
    1. Read the spec file at the given path
    2. Read the Hydration Checkpoint section
    3. Restore all state: orchestrationId, team, current wave, agent sessions, retry state, bounce history
    4. Emit `orchestration.resumed` event
    5. Skip Steps 2-9 entirely -- jump to Step 10 at the restore point
  - If --resume is absent: proceed as normal (existing behavior)
  - Strip `--resume <path>` from USER_PROMPT before further processing
- **Step 10 changes (Execute Waves):**
  - After each builder completes, analyze the builder's output for bounce-back triggers (reference hitl-protocol.md for trigger catalog and detection heuristics)
  - After each validator completes, analyze the validator's output for design concerns (PASS with warnings)
  - If a bounce-back trigger is detected:
    1. Update task status to `bounced` in the spec file
    2. Emit `hitl.bounced` event
    3. Present the situation to the user via AskUserQuestion with resolution options
    4. Wait for response
    5. Emit `hitl.resolved` event
    6. Apply the resolution (proceed with guidance, skip, restructure, abort)
    7. If restructure: update spec file task graph, re-compute waves, resume
  - Write hydration checkpoint after every state change:
    - After builder dispatch (record agentId)
    - After builder completion
    - After validator completion
    - After retry attempt
    - After bounce-back trigger/resolution
    - After wave completion
  - Emit `checkpoint.written` after each checkpoint update
- **Step 11 changes:**
  - Include bounce-back stats in Result section (number of bounce-backs, triggers, resolutions)
  - Write final hydration checkpoint with status "completed"
- **Step 12 changes:**
  - Report bounce-back events (which tasks bounced, what triggers, how resolved)
  - Report resume stats if this was a resumed orchestration (which wave resumed from, how many tasks were skipped)
- **Update "What This Stage Does NOT Do":**
  - Remove any reference to "HITL" or "persistence" or "cross-session resume" (they're now implemented)
  - Keep remaining future-stage items

### 6. Update dag-execution.md Reference
- **Task ID**: update-dag-reference
- **Depends On**: validate-reference-patterns
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 5)
- Read current dag-execution.md thoroughly before modifying
- Update header: "Introduced in: Stage 2 (updated in Stage 3, Stage 6, Stage 7)"
- Add "Bounce-Back Protocol" section after Retry Protocol:
  - Reference hitl-protocol.md for the full trigger catalog and mechanics
  - Summarize: when the orchestrator detects a situation that retry cannot resolve, it bounces back to the user
  - Document the `bounced` task status and its lifecycle
  - Note that bounce-back is orthogonal to retry: a task can bounce back AND later need retries
- Add "Hydration Checkpoint" section after Idempotency Rules:
  - Reference hitl-protocol.md for the full checkpoint format
  - Describe what the checkpoint captures and when it's updated
  - Document the relationship between idempotency and hydration: idempotency uses task status (completed/in_progress/pending), hydration adds volatile state (agent IDs, retry counts, wave progress)
- Add "Resume Protocol" section:
  - The `--resume` flag and how it works
  - The hydration algorithm
  - Edge cases: missing checkpoint, corrupted spec file, pre-Stage-7 spec files
- Extend "Task-Level Idempotency" with `bounced` status handling:
  - `bounced`: re-present the bounce-back to the user (they may have closed the session before responding)
- Add Stage 7 events to Observability Events section:
  - `hitl.bounced`, `hitl.resolved`, `orchestration.resumed`, `checkpoint.written` with JSON payload templates
- Update Full Event Sequence to show:
  - A flow with a bounce-back mid-wave
  - A resume flow (orchestration.resumed -> skip completed -> continue)
- Update Related Documents table

### 7. Validate Skill and Reference Updates
- **Task ID**: validate-skill-updates
- **Depends On**: update-skill-md, update-dag-reference
- **Assigned To**: validator-stage7
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify SKILL.md title includes "Stage 7"
- Verify SKILL.md Step 1 parses `--resume` flag
- Verify SKILL.md Step 1 has hydration logic (read checkpoint, restore state, skip to Step 10)
- Verify SKILL.md Step 10 has bounce-back detection (after builder and validator completion)
- Verify SKILL.md Step 10 writes hydration checkpoint after every state change
- Verify SKILL.md references hitl-protocol.md for trigger catalog
- Verify SKILL.md has `hitl.bounced`, `hitl.resolved`, `orchestration.resumed`, `checkpoint.written` events
- Verify dag-execution.md has Bounce-Back Protocol, Hydration Checkpoint, and Resume Protocol sections
- Verify dag-execution.md event catalog includes 4 new Stage 7 events
- Verify dag-execution.md Task-Level Idempotency handles `bounced` status
- Verify dag-execution.md event sequence includes bounce-back and resume examples
- Verify "What This Stage Does NOT Do" no longer mentions HITL or persistence
- Report VERDICT: PASS or VERDICT: FAIL

### 8. Update orchestrate.md Command
- **Task ID**: update-command
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 9, 10, 11)
- Read current orchestrate.md before modifying
- Add `--resume <spec-path>` flag documentation
- Update usage examples:
  - Fresh start: `/orchestrate "add REST API"`
  - Resume: `/orchestrate --resume specs/rest-api.md`
- Note that --resume skips decomposition, plan review, and task creation -- it picks up from the last checkpoint

### 9. Update CLAUDE.md Project Description
- **Task ID**: update-claude-md
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 8, 10, 11)
- Update project description to reflect Stage 7
- Update "How to Use" with examples showing:
  - Bounce-back scenario (orchestrator pauses, asks user, resumes)
  - Resume scenario (`/orchestrate --resume specs/foo.md`)
- Update "Architecture" to mention HITL bounce-back and hydration
- Update "What This Stage Does NOT Do" -- remove HITL/persistence lines, keep remaining items

### 10. Update Pattern Docs and Agent Catalog
- **Task ID**: update-pattern-agents-docs
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 8, 9, 11)
- Update `docs/patterns/spec-as-source-of-truth.md`:
  - Add "Hydration Extension (Stage 7)" section
  - Document the Hydration Checkpoint as an extension of the spec file
  - Update the spec file structure diagram to show the checkpoint section
  - Note that the spec file now serves three roles: plan (pre-execution), audit trail (during execution), and checkpoint (for resume)
- Update `docs/agents.md`:
  - Add note about builder behavior in bounce-back scenarios: builders should surface unexpected findings clearly (not bury them in verbose output), use explicit phrases that the orchestrator's trigger detection can match
  - Note that validators should report design concerns even when passing

### 11. Create Test Prompts and Example Spec
- **Task ID**: create-test-prompts
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 8, 9, 10)
- Create `prompts/stage-7/mid-execution-conflict.md`:
  - A prompt designed to trigger a bounce-back during execution
  - Example: "Add a user module using class-based OOP patterns" in a codebase that uses functional patterns
  - Expected behavior: builder detects the conflict between the task spec and existing code patterns, orchestrator bounces back to the user with options (use classes as specified, switch to functional to match existing code, or mix approaches)
  - Document expected events: hitl.bounced, AskUserQuestion, hitl.resolved
- Create `prompts/stage-7/resume-interrupted.md`:
  - A multi-wave prompt for testing resume
  - Instructions: run the orchestration, interrupt after Wave 1 completes (close the session), then resume with `--resume`
  - Expected behavior: resumed orchestration skips Wave 1 tasks, continues from Wave 2
  - Document expected events: orchestration.resumed, checkpoint.written
- Create `specs/examples/stage-7-bounce-back-resume.md`:
  - Example spec output showing:
    - A task that bounced (status: bounced -> completed)
    - Bounce History in the Hydration Checkpoint
    - Agent Sessions with stored agentIds
    - Execution Log with bounce-back entries
    - Result section with bounce-back stats

### 12. Update Master Plan
- **Task ID**: update-master-plan
- **Depends On**: update-command, update-claude-md, update-pattern-agents-docs, create-test-prompts
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current `specs/master-plan.md` thoroughly
- Update Stage 7 status from "Planned" to "Complete" in the status table
- Add a complete file table for Stage 7 (matching format of Stages 1-3):
  - List all new and modified files with commit group assignments
- Add verification section for Stage 7:
  1. Bounce-back: orchestrate a task that triggers a design conflict mid-execution -- expect bounced state and user consultation
  2. Resume: orchestrate, interrupt, resume with `--resume` -- expect completed tasks skipped
  3. Checkpoint: verify hydration checkpoint is written after each state change
  4. Full flow: multi-wave orchestration with a bounce-back and then resume after interruption
- Update "Next step" to point to Stage 8

### 13. Final Validation
- **Task ID**: validate-all
- **Depends On**: update-master-plan
- **Assigned To**: validator-stage7
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify all new files exist:
  - `.claude/skills/orchestrator/references/hitl-protocol.md`
  - `docs/patterns/hitl-protocol.md`
  - `docs/patterns/hydration-pattern.md`
  - `prompts/stage-7/mid-execution-conflict.md`
  - `prompts/stage-7/resume-interrupted.md`
  - `specs/examples/stage-7-bounce-back-resume.md`
- Verify all modified files reference Stage 7:
  - SKILL.md title includes "Stage 7"
  - SKILL.md has --resume parsing in Step 1
  - SKILL.md has bounce-back detection in Step 10
  - SKILL.md has checkpoint writes in Step 10
  - dag-execution.md has Bounce-Back Protocol, Hydration Checkpoint, Resume Protocol sections
  - dag-execution.md event catalog has 4 new events
  - dag-execution.md idempotency handles `bounced` status
  - orchestrate.md documents --resume flag
  - CLAUDE.md reflects Stage 7 description
  - spec-as-source-of-truth.md has Hydration Extension section
  - agents.md has bounce-back behavior notes
  - master-plan.md shows Stage 7 as complete
- Verify cross-references are consistent:
  - SKILL.md references hitl-protocol.md for trigger catalog
  - hitl-protocol reference event payloads match dag-execution.md catalog
  - Pattern doc links are valid relative paths
  - Task status lifecycle includes `bounced` in all relevant files
- Verify bounce-back triggers are concrete (specific detection heuristics with example strings)
- Verify hydration checkpoint template is complete (all fields documented)
- Run `bun run validate` to verify no lint/typecheck/test regressions
- Report VERDICT: PASS or VERDICT: FAIL

---

## Acceptance Criteria

1. SKILL.md Step 1 parses `--resume <spec-path>` flag and hydrates from spec file checkpoint
2. SKILL.md Step 10 detects bounce-back triggers from builder and validator output
3. Bounce-back pauses execution, presents context to user via AskUserQuestion, and resumes after resolution
4. Task status lifecycle includes `bounced` state with correct transitions
5. The spec file has a `## Hydration Checkpoint` section updated after every state change
6. Cross-session resume works: `/orchestrate --resume specs/foo.md` skips completed tasks and continues from the last checkpoint
7. Agent session IDs are persisted in the checkpoint for `resume: agentId` on retries
8. 6 bounce-back trigger types are defined with concrete detection heuristics
9. 4 new observability events are documented and emitted at correct points
10. hitl-protocol.md reference contains the full trigger catalog, mechanics, lifecycle, checkpoint format, and resume protocol
11. Pattern docs explain HITL bounce-back and hydration with community context
12. Test prompts exercise bounce-back (design conflict) and resume (interrupted session)
13. Master plan shows Stage 7 as complete with file tables
14. `bun run validate` passes with no regressions

---

## Validation Commands

- `bun test` -- run all tests
- `bunx tsc --noEmit` -- verify no type errors
- `bunx biome ci .` -- lint and format check

---

## Notes

- **Bounce-back is not a blocker -- it's an advisor.** The orchestrator should only bounce back for situations that genuinely require human judgment. A builder that encounters a minor style inconsistency should proceed; a builder that discovers a fundamental design conflict should bounce. The trigger catalog defines the threshold.
- **Hydration checkpoints are append-friendly, not rewrite-heavy.** The checkpoint section is overwritten (not appended) on each update, but it's a small section (~20 lines). The execution log remains append-only. This keeps the spec file structure clean -- one checkpoint reflecting current state, one log reflecting full history.
- **The --resume flag is explicit by design.** The orchestrator does NOT auto-resume from an existing spec file. This prevents surprising behavior when a user re-invokes `/orchestrate` with the same prompt but wants a fresh start. Resume must be intentional.
- **Pre-Stage-7 spec files are resume-compatible at the basic level.** If a spec file lacks a Hydration Checkpoint section, the resume protocol falls back to basic idempotency (status-based skip/re-dispatch). It won't have agent IDs for resume or exact wave position, but completed tasks will be skipped. This is graceful degradation.
- **Stages 4-6 dependency:** This plan assumes Stages 4-6 are complete. The SKILL.md being modified already has --team switching (Stage 4), plugin extraction (Stage 5), and Codex escalation with spec hardening (Stage 6). If executing before those stages, apply changes to the current SKILL.md and note that those features are absent.
- **No TypeScript code changes are required for Stage 7.** This is a pure prompt/docs/reference stage. The emit-event.ts script already handles arbitrary event payloads. Hydration is managed by reading/writing markdown -- no runtime state store needed.
- **Bounce-back and retry are orthogonal.** A task can bounce back (design conflict found), get resolved (user says "use functional style"), then fail validation (builder made a typo), and enter the retry loop. The two protocols handle different failure classes and compose naturally.
