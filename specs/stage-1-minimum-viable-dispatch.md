# Plan: Stage 1 - Minimum Viable Dispatch

## Task Description

Implement Stage 1 of the HOP Orchestrator prototype. This is the minimum viable dispatch loop: orchestrator creates ONE task, dispatches ONE builder, then ONE validator, and reports the result. No DAG, no waves, no retry, no spec files.

This stage proves the three-part dispatch loop works and introduces three patterns: Builder/Validator, Dispatch Loop, and Higher-Order Prompt (concept).

**Reference:** [Master Plan - Stage 1](./master-plan.md#stage-1-minimum-viable-dispatch)

## Objective

When complete, running `/orchestrate "add a hello world function in src/hello.ts that exports a greet function"` will:

1. Orchestrator parses the prompt and creates 1 task
2. Builder agent creates `src/hello.ts` with the function
3. Validator agent inspects and reports VERDICT: PASS or VERDICT: FAIL
4. Orchestrator reports the result to the user

## Problem Statement

The orchestrator prototype repo has a clean baseline (template starter code) but no orchestration infrastructure. We need the foundational `.claude/` configuration -- agents, commands, skills, and settings -- that makes the dispatch loop work.

## Solution Approach

Create 6 files in the `.claude/` directory plus 3 pattern docs and supporting materials. The SKILL.md is the core deliverable -- it contains the 5-step dispatch protocol that the LLM follows. Everything else supports it: agent definitions tell builders and validators how to behave, the command wires up `/orchestrate`, settings pre-approve tools, and pattern docs explain the "why."

The CLAUDE.md gets rewritten from the template default to an orchestrator-focused project guide.

## Relevant Files

Existing files to read before working:

- `specs/master-plan.md` -- Stage 1 spec, directory structure, design decisions
- `specs/orchestration-observability-impl.md` -- Observability spec (Stage 1 events, emit-event.ts design)
- `specs/examples/stage-1-hello-world.md` -- Expected output format for Stage 1 orchestration
- `.claude/CLAUDE.md` -- Current template CLAUDE.md (will be rewritten)
- `src/index.ts` -- Existing starter code (greet function, VERSION export)
- `tests/index.test.ts` -- Existing tests (greet, VERSION)
- `package.json` -- Project config, scripts, dependencies

### New Files

Core orchestration (6 files):

- `.claude/CLAUDE.md` -- Rewrite with orchestrator overview, agent conventions, project structure, key commands
- `.claude/settings.json` -- Pre-approve Task*, Read, Write, Edit, Glob, Grep, Bash patterns
- `.claude/agents/builder.md` -- Builder agent: model sonnet, tools for reading + writing code
- `.claude/agents/validator.md` -- Validator agent: model haiku, read-only, disallowedTools Write/Edit/NotebookEdit
- `.claude/commands/orchestrate.md` -- Thin command wrapper: delegates to orchestrator skill
- `.claude/skills/orchestrator/SKILL.md` -- The HOP: 5-step dispatch protocol with parameterized agent variables

Observability (2 files):

- `scripts/emit-event.ts` -- Self-contained fire-and-forget event emitter (~40 lines, zero deps)
- `.claude/settings.json` -- Also pre-approve `Bash(bun run scripts/emit-event.ts *)`

Pattern docs (3 files):

- `docs/patterns/builder-validator.md` -- What, How, Where for executor/critic separation
- `docs/patterns/dispatch-loop.md` -- What, How, Where for the orchestration cycle
- `docs/patterns/higher-order-prompt.md` -- What, How, Where for parameterized prompts (concept intro)

Supporting docs (1 file):

- `docs/agents.md` -- Agent catalog: all definitions side-by-side with models, tools, constraints

Test prompts (2 files):

- `prompts/stage-1/hello-world.md` -- Primary test prompt with expected flow
- `prompts/stage-1/add-utility.md` -- Secondary test prompt for variety

## Implementation Phases

### Phase 1: Foundation

Core `.claude/` configuration that makes the dispatch loop possible:
- CLAUDE.md rewrite
- settings.json with tool permissions
- Builder and validator agent definitions

### Phase 2: Core Implementation

The orchestration engine:
- `/orchestrate` command
- SKILL.md with 5-step dispatch protocol and HOP variables
- Observability emit-event.ts script
- SKILL.md emit calls at each dispatch step

### Phase 3: Documentation & Polish

Educational materials:
- Three pattern docs (builder-validator, dispatch-loop, higher-order-prompt)
- Agent catalog
- Test prompts
- Master plan update (add observability cross-cutting concern)

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
  - Name: builder-foundation
  - Role: Creates .claude/ configuration files (CLAUDE.md, settings.json, agents)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-orchestration
  - Role: Creates the orchestration engine (command, SKILL.md, emit-event.ts)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Creates pattern docs, agent catalog, and test prompts
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-stage-1
  - Role: Validates all files exist, have correct structure, and the dispatch loop is coherent
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.

### 1. Create .claude/ Foundation Files
- **Task ID**: create-foundation
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `specs/master-plan.md` (Stage 1 section) and `specs/examples/stage-1-hello-world.md` for context
- Read the current `.claude/CLAUDE.md` (template default) to understand what's being replaced
- Create `.claude/settings.json` with pre-approved tools:
  - Task, TaskCreate, TaskUpdate, TaskList, TaskGet, TaskOutput
  - Read, Write, Edit, Glob, Grep
  - `Bash(bun *)`, `Bash(git *)`, `Bash(ls *)`, `Bash(mkdir *)`
  - `Bash(bun run scripts/emit-event.ts *)`
- Create `.claude/agents/builder.md` with:
  - Frontmatter: `model: sonnet`, tools: Read, Glob, Grep, Write, Edit, Bash, TaskGet, TaskUpdate
  - System prompt: focused implementation agent, read before writing, file boundaries absolute, idempotent execution, named exports only, JSDoc on exports, report changes via TaskUpdate
  - Reference: [Master Plan - Stage 1 Files](./master-plan.md#files-to-create)
- Create `.claude/agents/validator.md` with:
  - Frontmatter: `model: haiku`, tools: Read, Glob, Grep, Bash, TaskGet, TaskUpdate, disallowedTools: Write, Edit, NotebookEdit
  - System prompt: read-only verification agent, binary VERDICT (PASS/FAIL), specific feedback on failure, structured report format
  - Reference: [Master Plan - Stage 1 Files](./master-plan.md#files-to-create)
- Rewrite `.claude/CLAUDE.md` to orchestrator-focused project instructions:
  - Project title: "Orchestrator Prototype"
  - Stack: TypeScript, Bun, Biome, Claude Code agents/skills/commands
  - What this repo is: HOP Orchestrator prototype, educational, incremental stages
  - Project structure (from master plan directory structure, Stage 1 subset only)
  - How to use: `/orchestrate "your prompt"` with expected flow
  - Agent conventions: Builder (sonnet, writes code), Validator (haiku, read-only), Orchestrator (opus, never writes code)
  - Code conventions table (kebab-case files, camelCase functions, PascalCase types, named exports, Biome)
  - Key commands (bun dev, build, check, typecheck, validate, test)
  - Branch strategy (from master plan)
  - Special rules: ALWAYS (validate before pushing, named exports, JSDoc) and NEVER (push to main, destructive git, orchestrator writes code)

### 2. Validate Foundation Files
- **Task ID**: validate-foundation
- **Depends On**: create-foundation
- **Assigned To**: validator-stage-1
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Read the task via TaskGet
- Verify `.claude/settings.json` exists and contains all required tool permissions
- Verify `.claude/agents/builder.md` exists with correct frontmatter (model: sonnet, correct tools list)
- Verify `.claude/agents/validator.md` exists with correct frontmatter (model: haiku, disallowedTools present)
- Verify `.claude/CLAUDE.md` has been rewritten (no longer contains "bun-typescript-starter" as title)
- Verify CLAUDE.md contains: project structure, agent conventions, code conventions, key commands
- Report VERDICT: PASS or VERDICT: FAIL with specific issues

### 3. Create Orchestration Engine
- **Task ID**: create-orchestration
- **Depends On**: validate-foundation
- **Assigned To**: builder-orchestration
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `specs/master-plan.md` (Stage 1 section, HOP Pattern section, Key Design Decisions)
- Read `specs/orchestration-observability-impl.md` (emit-event.ts design, SKILL.md modifications, Stage 1 events)
- Read `specs/examples/stage-1-hello-world.md` for expected output format
- Read `.claude/agents/builder.md` and `.claude/agents/validator.md` to understand agent capabilities
- Create `.claude/commands/orchestrate.md` with:
  - Frontmatter: description "Orchestrate a complex task using Builder/Validator dispatch", argument-hint "Describe the feature or changes you want implemented", model: opus, skill: orchestrator
  - Body: "Orchestrate the following task:\n\n$ARGUMENTS"
  - Reference: [Master Plan - Stage 1 Files](./master-plan.md#files-to-create)
- Create `.claude/skills/orchestrator/SKILL.md` with:
  - Frontmatter: description, use-when
  - Title: "HOP Orchestrator (Stage 1 - Minimum Viable Dispatch)"
  - Role statement: "You are an orchestration leader. You NEVER write code yourself."
  - HOP Configuration block with parameterized variables: USER_PROMPT, BUILDER_AGENT (builder), VALIDATOR_AGENT (validator), SPEC_DIR (specs/)
  - 5-step Dispatch Protocol:
    - Step 1: Parse User Prompt (understand intent, identify files, identify acceptance criteria). After parsing, emit `orchestration.started` event via Bash: `bun run scripts/emit-event.ts orchestration.started '<json>'`
    - Step 2: Create a Task (ONE task via TaskCreate with subject, description, activeForm). After creation, emit `task.created` event.
    - Step 3: Dispatch the Builder (BUILDER_AGENT via Task tool, model sonnet, foreground). Before dispatch emit `agent.dispatched`, after completion emit `agent.completed`.
    - Step 4: Dispatch the Validator (VALIDATOR_AGENT via Task tool, model haiku, foreground). Before dispatch emit `agent.dispatched`, after completion emit `agent.completed`.
    - Step 5: Report Result (parse VERDICT, report to user). After parsing emit `verdict.received`, at end emit `orchestration.completed`.
  - "What This Stage Proves" section
  - "What This Stage Does NOT Do" section (no DAG, waves, retry, questions, fast path, team switching)
  - Reference: [Master Plan - Stage 1](./master-plan.md#stage-1-minimum-viable-dispatch), [Observability Spec - SKILL.md Modifications](./orchestration-observability-impl.md#2-skillmd-modifications-orchestrator-prototype)
- Create `scripts/emit-event.ts` following the exact design in the observability spec:
  - Shebang: `#!/usr/bin/env bun`
  - JSDoc explaining purpose (fire-and-forget emitter for HOP Orchestrator)
  - Self-destruct timeout (2s safety net)
  - Kill switch check (SIDE_QUEST_EVENTS === '0')
  - Parse argv: eventType, jsonData
  - Discover server from `~/.cache/side-quest-observability/events.port`
  - POST partial envelope to `http://127.0.0.1:${port}/events` with 500ms abort
  - Silent catch on all failures
  - Reference: [Observability Spec - emit-event.ts](./orchestration-observability-impl.md#1-scriptsemit-eventts-orchestrator-prototype)

### 4. Validate Orchestration Engine
- **Task ID**: validate-orchestration
- **Depends On**: create-orchestration
- **Assigned To**: validator-stage-1
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Read the task via TaskGet
- Verify `.claude/commands/orchestrate.md` exists with correct frontmatter (model: opus, skill: orchestrator)
- Verify `.claude/skills/orchestrator/SKILL.md` exists and contains:
  - HOP Configuration block with BUILDER_AGENT, VALIDATOR_AGENT variables
  - All 5 dispatch steps
  - Emit calls at each step boundary (orchestration.started, task.created, agent.dispatched x2, agent.completed x2, verdict.received, orchestration.completed)
  - "What This Stage Does NOT Do" exclusion list
- Verify `scripts/emit-event.ts` exists and contains:
  - Port file discovery from `~/.cache/side-quest-observability/events.port`
  - POST to localhost with abort controller
  - Silent catch (never fails the orchestrator)
  - Kill switch check
- Report VERDICT: PASS or VERDICT: FAIL with specific issues

### 5. Create Pattern Docs and Supporting Materials
- **Task ID**: create-docs
- **Depends On**: validate-orchestration
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `specs/master-plan.md` for pattern list, directory structure, design decisions
- Read `.claude/agents/builder.md` and `.claude/agents/validator.md` for agent details
- Read `.claude/skills/orchestrator/SKILL.md` for dispatch protocol details
- Create `docs/patterns/builder-validator.md`:
  - "Introduced in: Stage 1"
  - What It Is: executor/critic separation with structural enforcement (disallowedTools)
  - How We Use It Here: Builder definition (model, tools, key rules), Validator definition (model, tools, disallowed, key rules), why different models
  - Where It Comes From: CrewAI/LangGraph/AutoGen convergence, Google Research 180-config study, PubNub best practices, community consensus
  - Related Documents table linking to master plan, dispatch loop, HOP, agent catalog
- Create `docs/patterns/dispatch-loop.md`:
  - "Introduced in: Stage 1"
  - What It Is: core orchestration cycle diagram (`User prompt -> Orchestrator -> TaskCreate -> Builder -> Validator -> Report`)
  - How We Use It Here: 5-step protocol, why foreground dispatch, why orchestrator never writes code
  - Where It Comes From: Leader/Swarm pattern, @joshuaday, IndyDevDan 4-layer architecture, Temporal/Dagster/LangGraph
  - Related Documents table
- Create `docs/patterns/higher-order-prompt.md`:
  - "Introduced in: Stage 1 (concept), Stage 4 (full proof)"
  - What It Is: prompt that takes another prompt as parameter, code analogy (higher-order function)
  - How We Use It Here: HOP variables in SKILL.md (BUILDER_AGENT, VALIDATOR_AGENT), hardcoded defaults now, switchable in Stage 4
  - Why Parameterize From Day One: costs nothing now, saves refactor later, domain-agnostic by construction
  - Where It Comes From: IndyDevDan coined "HOP", Medium/Data Science Collective, LangChain deepagents, skill-compose
  - Related Documents table
- Create `docs/agents.md`:
  - Stage 1 section with Builder and Validator tables (model, role, tools, disallowed)
  - Key constraints for each agent
  - Why These Models table (Orchestrator=Opus, Builder=Sonnet, Validator=Haiku with reasoning)
  - Stage 4 preview section (research-builder, research-validator)
  - Related Documents table
- Create `prompts/stage-1/hello-world.md`:
  - The primary test prompt: "add a hello world function in src/hello.ts that exports a greet function"
  - Expected behavior: 1 task created, builder creates file, validator reports PASS/FAIL
  - What to look for: named export, JSDoc, correct signature
- Create `prompts/stage-1/add-utility.md`:
  - Secondary test prompt: "add a string utility module in src/utils/string-utils.ts with capitalize, slugify, and truncate functions"
  - Expected behavior: 1 task, builder creates file with 3 functions, validator checks all 3
  - What to look for: all functions exported, JSDoc on each, named exports only

### 6. Final Validation
- **Task ID**: validate-all
- **Depends On**: create-docs
- **Assigned To**: validator-stage-1
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Read the task via TaskGet
- Verify ALL files from the master plan Stage 1 exist:
  - `.claude/CLAUDE.md` (rewritten, not template)
  - `.claude/settings.json`
  - `.claude/agents/builder.md`
  - `.claude/agents/validator.md`
  - `.claude/commands/orchestrate.md`
  - `.claude/skills/orchestrator/SKILL.md`
  - `scripts/emit-event.ts`
  - `docs/patterns/builder-validator.md`
  - `docs/patterns/dispatch-loop.md`
  - `docs/patterns/higher-order-prompt.md`
  - `docs/agents.md`
  - `prompts/stage-1/hello-world.md`
  - `prompts/stage-1/add-utility.md`
- Verify SKILL.md references BUILDER_AGENT and VALIDATOR_AGENT as variables (not hardcoded agent names)
- Verify SKILL.md includes all 5 dispatch steps
- Verify SKILL.md includes emit calls at each step boundary
- Verify builder.md has `model: sonnet` in frontmatter
- Verify validator.md has `model: haiku` and `disallowedTools` in frontmatter
- Verify orchestrate.md has `model: opus` and `skill: orchestrator` in frontmatter
- Verify emit-event.ts has the port file discovery pattern
- Verify all pattern docs have "Introduced in: Stage 1"
- Verify agents.md has both Builder and Validator tables
- Run `bun test` to confirm existing tests still pass
- Run `bunx tsc --noEmit` to confirm no type errors
- Run `bunx biome ci .` to confirm lint/format passes
- Report VERDICT: PASS or VERDICT: FAIL with comprehensive findings

## Acceptance Criteria

1. All 13 files listed above exist with correct content
2. `/orchestrate` command is wired: frontmatter has `skill: orchestrator`
3. SKILL.md uses HOP variables (BUILDER_AGENT, VALIDATOR_AGENT), not hardcoded names
4. SKILL.md has complete 5-step dispatch protocol with emit calls
5. Builder agent has model: sonnet and write-capable tools
6. Validator agent has model: haiku and disallowedTools: Write, Edit, NotebookEdit
7. emit-event.ts follows the observability spec (port file discovery, silent failure, kill switch)
8. Existing tests pass (`bun test`)
9. No type errors (`bunx tsc --noEmit`)
10. Lint/format clean (`bunx biome ci .`)

## Validation Commands

- `bun test` -- run all tests
- `bunx tsc --noEmit` -- verify no type errors
- `bunx biome ci .` -- lint and format check

## Notes

- **Agents live at `.claude/agents/`** (not `.claude/agents/team/`). The master plan specifies this path and Stage 1 doesn't use the plan-with-team command's team directory convention.
- **Observability is part of Stage 1.** The observability spec explicitly states this. emit-event.ts and SKILL.md emit calls are Stage 1 deliverables.
- **No code in `src/` is modified.** Stage 1 creates orchestration infrastructure only. The existing `src/index.ts` and `tests/index.test.ts` remain untouched.
- **Pattern docs are educational content.** They explain the "what, how, and why" for anyone reading the repo. Each should reference community sources and link to related documents.
- **CLAUDE.md scope:** Only include Stage 1 content. Don't reference DAG, waves, retry, or features from later stages.

### References

- [Master Plan](./master-plan.md) -- Full staged rollout, Stage 1 spec, directory structure, design decisions
- [Observability Spec](./orchestration-observability-impl.md) -- emit-event.ts design, SKILL.md emit calls, Stage 1 events, correlation model
- [Stage 1 Example Output](./examples/stage-1-hello-world.md) -- Expected orchestration flow for hello world prompt
