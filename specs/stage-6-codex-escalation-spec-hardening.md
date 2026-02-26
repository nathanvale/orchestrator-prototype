# Plan: Stage 6 - Codex Escalation + Spec Hardening

## Task Description

Stage 6 adds two complementary capabilities to the orchestrator: **difficulty routing** (hard tasks can escalate to OpenAI's Codex CLI as an alternative execution engine) and **spec hardening** (the orchestrator rewrites vague or incomplete task descriptions into unambiguous, implementation-ready specs before dispatching builders). Together, these address the two most common failure modes in Stages 1-5: builders failing because the task is genuinely hard (beyond sonnet's reliable capability), and builders failing because the spec was ambiguous (the task description left room for misinterpretation).

**Reference:** [Master Plan - Stage 6](./master-plan.md#stages-6-9-advanced-capabilities)

---

## Objective

When complete:

1. The orchestrator can assess task difficulty during decomposition and tag tasks as `standard` or `hard`
2. Hard tasks route to Codex CLI (`codex exec`) instead of the standard Claude Code builder agent
3. The Codex integration is non-blocking -- if Codex is not installed, the orchestrator falls back to the standard builder with a warning
4. Before dispatching any builder (Claude or Codex), the orchestrator hardens each task's description: eliminating ambiguity, adding missing file paths, making acceptance criteria machine-verifiable
5. Hardened specs reduce retry rates by catching specification gaps before builders encounter them
6. New pattern docs explain both patterns: `docs/patterns/difficulty-routing.md` and a new "Spec Hardening" section in the existing spec-as-source-of-truth pattern (or standalone doc)
7. New reference doc: `.claude/skills/orchestrator/references/codex-escalation.md`

---

## Problem Statement

### Difficulty Ceiling

Stages 1-5 dispatch all tasks to sonnet-class builders. This works well for straightforward implementation tasks (define types, write a handler, add tests). But some tasks require deeper reasoning -- complex algorithmic work, large-scale refactors spanning many files, or tasks requiring extensive codebase understanding. These tasks hit sonnet's capability ceiling, leading to repeated retry failures and user escalation. Having the orchestrator detect these cases and route to a more capable engine (Codex CLI with its own model hierarchy) adds a second tier of capability without changing the orchestration protocol.

### Specification Ambiguity

In Stages 1-5, the orchestrator decomposes prompts into tasks, but the task descriptions are only as good as the orchestrator's initial decomposition. Vague acceptance criteria (e.g., "handle edge cases appropriately") or missing file paths lead to builders making assumptions, which validators then reject. The retry loop corrects this iteratively, but each retry costs tokens and time. Spec hardening catches these issues at plan time -- the orchestrator does a second pass over each task description, stress-testing it for ambiguity before any builder is dispatched.

---

## Solution Approach

### 1. Difficulty Scoring

Add a new step between decomposition (Step 4) and wave computation (Step 5): **Difficulty Assessment**. For each task, the orchestrator evaluates:

**Difficulty signals (hard):**
- Task touches 5+ files
- Task requires understanding complex existing code patterns (refactor, migration)
- Task involves algorithmic complexity (graph algorithms, concurrent state management)
- Task description uses words like "optimize", "refactor across", "migrate"
- Task has 5+ acceptance criteria

**Difficulty signals (standard):**
- Task creates new files (greenfield)
- Task modifies 1-2 files
- Task follows existing patterns (add a handler like the existing ones)
- Task has clear input/output expectations

Each task gets a `difficulty` field: `standard` or `hard`. The difficulty is recorded in the spec file task entry and the task graph table.

### 2. Codex CLI Integration

When a task is tagged `hard`, the orchestrator has the option to dispatch via Codex CLI instead of the standard builder. This is implemented as:

**Detection:** Before first use, check if `codex` is available via `which codex`. Cache the result for the session.

**Dispatch:** Instead of using the Task tool to spawn a Claude Code builder agent, use Bash to invoke `codex exec` with:
- `--full-auto` (unattended execution)
- `--json` (structured output for parsing)
- `--output-last-message /tmp/codex-task-<id>.md` (capture result)
- `--cd <project-root>` (ensure correct working directory)
- The prompt includes the full task description and acceptance criteria from the spec file

**Result parsing:** Read the Codex output file, check for completion signals, and pass the result to the standard validator (still haiku via Claude Code).

**Fallback:** If `codex` is not installed or the Codex dispatch fails (non-zero exit, timeout), fall back to the standard Claude Code builder with a warning logged to the spec file's execution log. The orchestration continues -- Codex is an optimization, not a hard dependency.

**Configuration:** Add a new HOP variable:
```
CODEX_ENABLED:    true | false (default: true if codex is installed)
CODEX_THRESHOLD:  hard (default -- only route hard tasks)
```

### 3. Spec Hardening

Add a new step between plan refinement (Step 7) and token estimation (Step 8): **Spec Hardening**. For each task in the approved plan:

1. **Ambiguity scan:** Check for vague language in the description and acceptance criteria:
   - "handle appropriately" -> specify the exact handling
   - "should work" -> define the observable behavior
   - Missing file paths -> resolve from codebase exploration
   - Implicit dependencies -> make explicit
   - "etc." or "similar" -> enumerate all cases

2. **Completeness check:** Verify each task has:
   - Explicit file paths (not "the types file" but "src/types/user.ts")
   - Concrete function signatures (not "a function to validate" but "export function validateUser(input: unknown): User")
   - Measurable acceptance criteria (not "works correctly" but "returns { id, name, email } for a valid user ID, throws NotFoundError for invalid ID")

3. **Rewrite:** Update the spec file with the hardened task descriptions. The original description is preserved in a "Original Description" section for audit trail.

4. **Emit:** `spec.hardened` event with the count of tasks modified and a brief summary of changes.

### 4. Updated Dispatch Protocol

The 12-step protocol becomes a 14-step protocol:

| Step | Name | New/Changed |
|------|------|-------------|
| 1 | Parse User Prompt | unchanged |
| 2 | Clarifying Questions | unchanged |
| 3 | Fast Path Gate | unchanged |
| 3b | Fast Path Dispatch | changed -- hardening applied to the single task |
| 4 | Decompose into Tasks | changed -- adds difficulty scoring |
| 4b | **Difficulty Assessment** | **NEW** |
| 5 | Compute Waves | unchanged |
| 6 | Write Spec File | changed -- includes difficulty field per task |
| 7 | Plan Refinement | unchanged |
| 7b | **Spec Hardening** | **NEW** |
| 8 | Token Estimation | changed -- Codex tasks get different token estimates |
| 9 | Create All Tasks | unchanged |
| 10 | Execute Waves | changed -- dispatches Codex for hard tasks |
| 11 | Update Spec File | changed -- includes difficulty routing stats |
| 12 | Report Result | changed -- reports which tasks used Codex |

### 5. New Reference Document

Create `.claude/skills/orchestrator/references/codex-escalation.md` containing:
- Codex CLI invocation templates
- Difficulty scoring rubric (the exact signals and thresholds)
- Fallback protocol (what happens when Codex is unavailable)
- Spec hardening checklist (the ambiguity signals and rewrite rules)
- New observability events catalog for Stage 6

### 6. New Observability Events

| Event | When |
|-------|------|
| `difficulty.assessed` | After difficulty scoring completes for all tasks |
| `spec.hardened` | After spec hardening rewrites task descriptions |
| `codex.checked` | After checking Codex CLI availability |
| `codex.dispatched` | When a hard task is routed to Codex CLI |
| `codex.completed` | When Codex CLI finishes (success or failure) |
| `codex.fallback` | When Codex is unavailable and standard builder is used instead |

---

## Relevant Files

### Existing Files to Modify

- `.claude/skills/orchestrator/SKILL.md` -- add difficulty assessment step (4b), spec hardening step (7b), Codex dispatch logic in step 10, update HOP Configuration with CODEX variables, update protocol from 12 to 14 steps
- `.claude/skills/orchestrator/references/dag-execution.md` -- add Difficulty Scoring section, Spec Hardening section, Codex Dispatch section, new events to catalog, update event sequence examples
- `.claude/commands/orchestrate.md` -- document `--no-codex` flag to disable Codex routing
- `.claude/CLAUDE.md` -- update project description for Stage 6, update "What This Stage Does NOT Do"
- `docs/agents.md` -- add Codex as an alternative execution engine (it's not a Claude Code agent but an external tool)
- `specs/master-plan.md` -- mark Stage 6 complete, add file tables, update status

### New Files

- `.claude/skills/orchestrator/references/codex-escalation.md` -- Codex CLI integration reference, difficulty scoring rubric, spec hardening checklist
- `docs/patterns/difficulty-routing.md` -- pattern doc for difficulty-based task routing
- `docs/patterns/spec-hardening.md` -- pattern doc for pre-dispatch spec hardening
- `specs/stage-6-codex-escalation-spec-hardening.md` -- this file (stage spec)
- `prompts/stage-6/hard-refactor.md` -- test prompt with a genuinely hard task (multi-file refactor)
- `prompts/stage-6/vague-spec.md` -- test prompt with vague descriptions to test spec hardening
- `specs/examples/stage-6-codex-routing.md` -- example spec output showing difficulty tags and Codex routing

---

## Implementation Phases

### Phase 1: Foundation (Difficulty Scoring + Spec Hardening Reference)

Create the codex-escalation.md reference document and define the difficulty scoring rubric and spec hardening checklist. This is the technical specification that SKILL.md delegates to.

1. Create codex-escalation.md with:
   - Difficulty scoring rubric (signals, thresholds, default values)
   - Spec hardening checklist (ambiguity signals, rewrite rules, audit trail format)
   - Codex CLI invocation templates and response parsing
   - Fallback protocol
   - New observability events
2. This reference is the source of truth for all Stage 6 mechanics -- SKILL.md delegates to it the same way it delegates to dag-execution.md for wave details

### Phase 2: Core Implementation (SKILL.md + DAG Reference Updates)

Modify SKILL.md to add the two new steps (4b and 7b), modify dispatch logic in Step 10, and update dag-execution.md with the new sections.

1. Update SKILL.md:
   - Add Step 4b: Difficulty Assessment between decomposition and wave computation
   - Add Step 7b: Spec Hardening between plan refinement and token estimation
   - Modify Step 10: add Codex dispatch branch for hard tasks
   - Update HOP Configuration with CODEX_ENABLED and CODEX_THRESHOLD variables
   - Update Steps 11 and 12 with difficulty/hardening stats
   - Update "What This Stage Does NOT Do" section
   - Update step numbering and flow description
2. Update dag-execution.md:
   - Add Difficulty Scoring section with rubric
   - Add Spec Hardening section with checklist
   - Add Codex Dispatch section with templates
   - Add Stage 6 events to observability catalog
   - Update full event sequence examples
3. Update orchestrate.md command with `--no-codex` flag
4. Update CLAUDE.md project description

### Phase 3: Documentation + Polish

Write pattern docs, test prompts, update master plan.

1. Create difficulty-routing.md pattern doc
2. Create spec-hardening.md pattern doc
3. Update agents.md with Codex as alternative execution engine
4. Create test prompts for hard tasks and vague specs
5. Create example spec output showing Codex routing
6. Update master-plan.md with Stage 6 status and file tables

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
  - Role: Create the codex-escalation.md reference document (difficulty rubric, spec hardening checklist, Codex templates)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-skill
  - Role: Update SKILL.md with Steps 4b and 7b, Codex dispatch logic, HOP Configuration updates
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-dag
  - Role: Update dag-execution.md with difficulty scoring, spec hardening, Codex dispatch, and new events
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Write pattern docs, update agents.md, create test prompts, example spec, update master plan and CLAUDE.md
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-stage6
  - Role: Validate all Stage 6 files for correctness, consistency, and completeness
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

---

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.

### 1. Create Codex Escalation Reference Document
- **Task ID**: create-codex-reference
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Create `.claude/skills/orchestrator/references/codex-escalation.md` with these sections:

**Difficulty Scoring Rubric:**
- Define the exact signals for `standard` vs `hard` classification
- Hard signals: 5+ files affected, refactor/migration language, algorithmic complexity, 5+ acceptance criteria, cross-module dependencies
- Standard signals: greenfield file creation, 1-2 files, follows existing patterns, clear I/O expectations
- Scoring: if any hard signal matches, tag as `hard`; otherwise `standard`
- The difficulty field is advisory -- the orchestrator decides final routing

**Spec Hardening Checklist:**
- Ambiguity signals: "handle appropriately", "should work", "etc.", "similar", missing file paths, implicit dependencies, vague acceptance criteria
- Rewrite rules: replace vague language with concrete expectations, resolve file paths by reading the codebase, enumerate implicit items, add measurable acceptance criteria
- Audit trail: preserve original description in a "Pre-Hardening" subsection, mark hardened sections with "[hardened]" annotation
- Fast path: spec hardening also applies to fast-path tasks (single task, but still harden the description)

**Codex CLI Integration:**
- Detection: `which codex 2>/dev/null` -- cache result for session
- Invocation template:
  ```
  codex exec --full-auto --json --output-last-message /tmp/codex-task-<task-id>.md --cd <project-root> "<task prompt>"
  ```
- Task prompt format: include full task description, file paths, function signatures, acceptance criteria from the hardened spec
- Timeout: 5 minutes per task (Codex has its own internal timeout handling)
- Result parsing: read output file, check for completion, extract file changes summary
- The validator still runs via Claude Code haiku regardless of which builder was used

**Fallback Protocol:**
- If `codex` not found: log `codex.fallback` event, dispatch standard builder, add note to execution log
- If Codex exits non-zero: log `codex.fallback` event with exit code, dispatch standard builder as retry
- If Codex times out (5 min): log `codex.fallback` event with timeout reason, dispatch standard builder
- Fallback does NOT count against the retry cap -- it's a routing fallback, not a validation failure

**New Observability Events:**
- `difficulty.assessed` -- after scoring all tasks: `{ orchestrationId, tasks: [{ taskId, difficulty }] }`
- `spec.hardened` -- after hardening: `{ orchestrationId, tasksModified: N, summary: "..." }`
- `codex.checked` -- after availability check: `{ orchestrationId, available: true|false }`
- `codex.dispatched` -- when routing to Codex: `{ orchestrationId, taskId, prompt: "..." }`
- `codex.completed` -- when Codex finishes: `{ orchestrationId, taskId, exitCode: N, duration: N }`
- `codex.fallback` -- when falling back to standard builder: `{ orchestrationId, taskId, reason: "..." }`

### 2. Validate Reference Document
- **Task ID**: validate-codex-reference
- **Depends On**: create-codex-reference
- **Assigned To**: validator-stage6
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify codex-escalation.md exists at `.claude/skills/orchestrator/references/codex-escalation.md`
- Verify it contains sections: Difficulty Scoring Rubric, Spec Hardening Checklist, Codex CLI Integration, Fallback Protocol, Observability Events
- Verify difficulty signals are concrete (not vague)
- Verify Codex invocation template uses valid CLI flags (--full-auto, --json, --output-last-message)
- Verify fallback protocol covers: not installed, non-zero exit, timeout
- Verify all 6 new events are documented with JSON payload examples
- Report VERDICT: PASS or VERDICT: FAIL

### 3. Update SKILL.md with Difficulty Assessment and Spec Hardening
- **Task ID**: update-skill-md
- **Depends On**: validate-codex-reference
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current SKILL.md thoroughly before modifying
- Update title: "HOP Orchestrator (Stage 6 - Codex Escalation + Spec Hardening)"
- Update HOP Configuration block:
  ```
  USER_PROMPT:      (provided by the user)
  BUILDER_AGENT:    builder (resolved from team profile)
  VALIDATOR_AGENT:  validator (resolved from team profile)
  SPEC_DIR:         specs/
  CODEX_ENABLED:    true (if codex CLI detected) | false
  CODEX_THRESHOLD:  hard (only route hard-tagged tasks to Codex)
  ```
- Add Step 4b: Difficulty Assessment (between Step 4 and Step 5):
  - For each task in the decomposition, evaluate difficulty signals from `codex-escalation.md`
  - Tag each task as `standard` or `hard`
  - Add `difficulty` field to the task definition
  - Emit `difficulty.assessed` event
  - Check Codex availability via `which codex 2>/dev/null` and emit `codex.checked`
- Add Step 7b: Spec Hardening (between Step 7 and Step 8):
  - For each task in the approved plan, scan for ambiguity signals per `codex-escalation.md`
  - Rewrite vague descriptions with concrete details (resolve file paths from codebase, specify signatures, enumerate acceptance criteria)
  - Update the spec file with hardened descriptions, preserving originals
  - Emit `spec.hardened` event
  - Note: hardening also applies to fast-path tasks (insert mini-hardening in Step 3b)
- Modify Step 10 (Execute Waves): add Codex dispatch branch:
  - Before dispatching builder for a task, check if `difficulty == hard` AND `CODEX_ENABLED == true`
  - If yes: dispatch via `codex exec` per the template in `codex-escalation.md`
  - Parse Codex result, then dispatch validator as normal
  - On Codex failure: apply fallback protocol, dispatch standard builder instead
  - Emit Codex-specific events (codex.dispatched, codex.completed, codex.fallback)
- Modify Steps 11 and 12:
  - Step 11: include difficulty routing stats in Result section (tasks routed to Codex, tasks that fell back)
  - Step 12: report which tasks used Codex vs standard builder, hardening stats
- Update "What This Stage Does NOT Do":
  - Remove any reference to "Codex escalation" or "spec hardening" (they're now implemented)
  - Keep remaining future-stage items
- Update step numbering throughout (now 14 steps: 1, 2, 3, 3b, 4, 4b, 5, 6, 7, 7b, 8, 9, 10, 11, 12)

### 4. Update dag-execution.md Reference
- **Task ID**: update-dag-reference
- **Depends On**: validate-codex-reference
- **Assigned To**: builder-dag
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 3)
- Read current dag-execution.md thoroughly before modifying
- Update header: "Introduced in: Stage 2 (updated in Stage 3, Stage 6)"
- Add "Difficulty Scoring" section after Task Decomposition Rules:
  - Reference codex-escalation.md for the full rubric
  - Summarize the hard/standard classification
  - Show how difficulty appears in the spec file task entry
  - Note that difficulty is set during decomposition, before wave computation
- Add "Spec Hardening" section after Execution Protocol:
  - Reference codex-escalation.md for the full checklist
  - Describe the hardening pass: when it runs, what it modifies, audit trail format
  - Show before/after examples of a hardened task description
- Add "Codex Dispatch" section alongside the Per-Task Cycle:
  - Reference codex-escalation.md for invocation templates
  - Document the decision branch: standard builder vs Codex
  - Document the fallback protocol
  - Note: validator is always Claude Code haiku regardless of builder
- Add Stage 6 events to Observability Events section:
  - difficulty.assessed, spec.hardened, codex.checked, codex.dispatched, codex.completed, codex.fallback
  - Include JSON payload templates for each
- Update Full Event Sequence to show a Stage 6 flow (with difficulty assessment, spec hardening, and one Codex-routed task)
- Update Related Documents table

### 5. Update orchestrate.md Command and CLAUDE.md
- **Task ID**: update-command-claude-md
- **Depends On**: validate-codex-reference
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 3, 4)
- Update `.claude/commands/orchestrate.md`:
  - Add `--no-codex` flag documentation (disables Codex routing, all tasks use standard builder)
  - Update description to mention difficulty routing
- Update `.claude/CLAUDE.md`:
  - Update title/description to reflect Stage 6
  - Update "How to Use" with examples showing Codex routing
  - Update "Architecture" to mention Codex as alternative execution engine
  - Update "What This Stage Does NOT Do" -- remove Codex/spec hardening lines
  - Add note about Codex CLI as an optional dependency

### 6. Validate Skill and Reference Updates
- **Task ID**: validate-skill-updates
- **Depends On**: update-skill-md, update-dag-reference, update-command-claude-md
- **Assigned To**: validator-stage6
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify SKILL.md has Step 4b (Difficulty Assessment)
- Verify SKILL.md has Step 7b (Spec Hardening)
- Verify SKILL.md Step 10 has Codex dispatch branch with fallback
- Verify SKILL.md HOP Configuration includes CODEX_ENABLED and CODEX_THRESHOLD
- Verify SKILL.md references codex-escalation.md for rubric and templates
- Verify dag-execution.md has Difficulty Scoring, Spec Hardening, and Codex Dispatch sections
- Verify dag-execution.md event catalog includes all 6 new events
- Verify orchestrate.md documents --no-codex flag
- Verify CLAUDE.md reflects Stage 6 description
- Verify step numbering is consistent across SKILL.md (14 steps)
- Report VERDICT: PASS or VERDICT: FAIL

### 7. Create Difficulty Routing Pattern Doc
- **Task ID**: create-difficulty-routing-pattern
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 8, 9, 10)
- Create `docs/patterns/difficulty-routing.md` with:
  - **What It Is:** routing tasks to different execution engines based on assessed difficulty
  - **How We Use It Here:** the difficulty scoring rubric, the standard/hard classification, the Codex CLI integration, the fallback protocol
  - **Why Difficulty Routing:** cost optimization (don't use expensive engines for easy tasks), capability matching (some tasks genuinely need more powerful reasoning), graceful degradation (fallback to standard builder)
  - **Community Sources:** multi-model routing patterns, OpenAI Codex CLI capabilities, task complexity estimation in CI/CD (complexity-based test splitting)
  - **Trade-offs:** added orchestration complexity, dependency on external CLI (mitigated by fallback), difficulty assessment is heuristic-based (can misclassify)
  - **Related Documents:** links to SKILL.md, codex-escalation.md, spec-hardening.md, dag-execution.md

### 8. Create Spec Hardening Pattern Doc
- **Task ID**: create-spec-hardening-pattern
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 7, 9, 10)
- Create `docs/patterns/spec-hardening.md` with:
  - **What It Is:** a pre-dispatch rewrite pass that eliminates ambiguity from task descriptions and acceptance criteria
  - **How We Use It Here:** the hardening checklist (ambiguity signals, rewrite rules), the audit trail (original vs hardened), when it runs (after plan approval, before token estimation)
  - **Why Spec Hardening:** reduces retry rates by catching specification gaps before builders encounter them, makes acceptance criteria machine-verifiable so validators can give more precise verdicts, shifts the cost of clarity from retry cycles (expensive) to orchestrator reasoning (one-time)
  - **Community Sources:** "shift left" testing philosophy, design-by-contract (Eiffel), formal specification in safety-critical systems, acceptance test-driven development (ATDD)
  - **The Hardening Paradox:** the orchestrator is also an LLM -- it can introduce new ambiguity while trying to remove it. The mitigation is that spec hardening is a focused pass (not creative generation) and the original spec is preserved for audit
  - **Related Documents:** links to SKILL.md, codex-escalation.md, spec-as-source-of-truth.md

### 9. Update Agent Catalog and Create Test Prompts
- **Task ID**: update-agents-create-prompts
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 7, 8, 10)
- Update `docs/agents.md`:
  - Add "Stage 6: Codex as Alternative Execution Engine" section
  - Document that Codex is not a Claude Code agent but an external CLI tool
  - Compare: when to use standard builder (most tasks) vs Codex (hard tasks)
  - Document that the validator is always Claude Code haiku regardless of builder
- Create `prompts/stage-6/hard-refactor.md`:
  - A prompt that describes a genuinely hard multi-file refactor
  - Expected behavior: tasks tagged as `hard`, routed to Codex (if available)
  - Example: "Refactor the user module from class-based to functional, updating all imports, tests, and documentation across 8 files"
- Create `prompts/stage-6/vague-spec.md`:
  - A prompt with deliberately vague descriptions
  - Expected behavior: spec hardening rewrites the vague parts before dispatch
  - Example: "add error handling to the API" (vague -- which endpoints? what errors? what response format?)
- Create `specs/examples/stage-6-codex-routing.md`:
  - Example spec output showing:
    - Task graph with difficulty field (standard/hard)
    - Spec hardening annotations ([hardened] markers)
    - Execution log showing Codex dispatch for hard tasks and standard builder for standard tasks
    - Result section with difficulty routing stats

### 10. Update Master Plan
- **Task ID**: update-master-plan
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 7, 8, 9)
- Read current `specs/master-plan.md` thoroughly
- Update Stage 6 status from "Planned" to "Complete" in the status table
- Add a complete file table for Stage 6 (matching format of Stages 1-3):
  - List all new and modified files with commit group assignments
- Add verification section for Stage 6:
  1. Hard task routing: `/orchestrate "refactor user module across 8 files"` -- expect difficulty: hard
  2. Spec hardening: `/orchestrate "add error handling"` -- expect hardened acceptance criteria
  3. Codex fallback: run with Codex not installed -- expect standard builder with warning
  4. Full flow: multi-task orchestration with mix of standard and hard tasks
- Update "Next step" to point to Stage 7

### 11. Final Validation
- **Task ID**: validate-all
- **Depends On**: create-difficulty-routing-pattern, create-spec-hardening-pattern, update-agents-create-prompts, update-master-plan
- **Assigned To**: validator-stage6
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify all new files exist:
  - `.claude/skills/orchestrator/references/codex-escalation.md`
  - `docs/patterns/difficulty-routing.md`
  - `docs/patterns/spec-hardening.md`
  - `prompts/stage-6/hard-refactor.md`
  - `prompts/stage-6/vague-spec.md`
  - `specs/examples/stage-6-codex-routing.md`
- Verify all modified files reference Stage 6:
  - SKILL.md title includes "Stage 6"
  - SKILL.md has Steps 4b and 7b
  - SKILL.md has Codex dispatch in Step 10
  - dag-execution.md has Difficulty Scoring, Spec Hardening, Codex Dispatch sections
  - dag-execution.md event catalog has 6 new events
  - orchestrate.md has --no-codex flag
  - CLAUDE.md reflects Stage 6
  - agents.md has Codex section
  - master-plan.md shows Stage 6 as complete
- Verify cross-references are consistent:
  - SKILL.md references codex-escalation.md for rubric/templates
  - codex-escalation.md event payloads match dag-execution.md catalog
  - Pattern doc links are valid relative paths
  - Codex invocation template uses valid CLI flags
- Verify difficulty scoring rubric is concrete (signals, not vague "seems hard")
- Verify spec hardening checklist has specific ambiguity signals (not "vague language")
- Run `bun run validate` to verify no lint/typecheck/test regressions
- Report VERDICT: PASS or VERDICT: FAIL

---

## Acceptance Criteria

1. SKILL.md has a 14-step dispatch protocol (Steps 4b and 7b added)
2. Step 4b scores each task as `standard` or `hard` using concrete signals from codex-escalation.md
3. Step 7b rewrites vague task descriptions into concrete, machine-verifiable specs
4. Step 10 routes `hard` tasks to Codex CLI when available, falls back to standard builder when not
5. The fallback protocol handles: Codex not installed, non-zero exit, timeout -- all without breaking orchestration
6. The `--no-codex` flag disables Codex routing entirely
7. codex-escalation.md contains the full rubric, checklist, templates, and fallback protocol
8. 6 new observability events are documented and referenced in both SKILL.md and dag-execution.md
9. Spec file tasks include a `difficulty` field and hardened descriptions with audit trail
10. Pattern docs explain both difficulty routing and spec hardening with community context
11. Test prompts exercise both capabilities (hard task, vague spec)
12. Master plan shows Stage 6 as complete with file tables
13. `bun run validate` passes with no regressions

---

## Validation Commands

- `bun test` -- run all tests
- `bunx tsc --noEmit` -- verify no type errors
- `bunx biome ci .` -- lint and format check

---

## Notes

- **Codex CLI is an optional dependency.** The orchestrator must work identically without Codex installed. The fallback protocol ensures this. When Codex is not available, all tasks route to the standard builder regardless of difficulty tag. The difficulty tag is still recorded in the spec for informational purposes.
- **Difficulty scoring is heuristic, not definitive.** The signals are guidelines, not rules. The orchestrator uses judgment informed by the rubric. A task that touches 5 files but follows a simple pattern (adding JSDoc to 5 files) is still `standard`. A task that touches 2 files but requires complex algorithmic work is `hard`. The rubric provides signals; the orchestrator synthesizes them.
- **Spec hardening is a focused rewrite, not creative expansion.** The orchestrator should not add new requirements during hardening -- only clarify existing ones. If a requirement is genuinely missing (not vague, but absent), that's a decomposition problem from Step 4, not a hardening problem from Step 7b. Hardening turns "handle errors" into "return 400 for invalid input, 404 for not found, 500 for unexpected errors" -- it doesn't add "add rate limiting" if rate limiting was never mentioned.
- **No TypeScript code changes are required for Stage 6.** This is a pure prompt/docs/reference stage. The emit-event.ts script already handles arbitrary event payloads. The Codex CLI is invoked via Bash, not imported as a module.
- **Stage 4 and 5 dependency:** This plan assumes Stages 4 and 5 are complete. The SKILL.md being modified already has --team switching (Stage 4) and has been extracted to the plugin (Stage 5). If executing before those stages, apply changes to the current SKILL.md and note that team-related features are absent.
- **The Codex CLI `--json` flag outputs JSONL events.** This structured output can be parsed to extract task completion signals, file changes, and error information. The exact parsing logic is documented in codex-escalation.md.
