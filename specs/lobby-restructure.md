# Plan: Lobby Restructure - Strip Main, Expand Patterns, Rebuild Module Branches

## Task Description
Restructure the orchestrator-prototype repository so that main becomes a "lobby" -- a learning hub with `/learn`, `/dojo`, and `/advisor` but NO orchestrator. Strip execution artifacts from main, expand the dojo pattern library to all 15 patterns, then rebuild `orchestration/*` module branches 1-7 as clean, immutable, runnable snapshots.

This spec translates the detailed plan at `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` into an executable task DAG for team-based dispatch.

## Objective
When complete:
- Main is a lobby with `/learn`, `/dojo` (15 patterns), `/advisor`, no orchestrator
- 7 `orchestration/*` branches exist, each with a stage-appropriate SKILL.md
- Original `stage/*` branches remain untouched
- All source anchors point to `orchestration/*` branches
- GitHub branch protection enabled for `orchestration/*`

## Problem Statement
Stages 4-9 have NOT been implemented as clean branches. The orchestrator SKILL.md grew to 1059 lines on `chore/tune-product-direction` (past the 500-line ceiling). Main currently holds stage 3 execution artifacts. The dojo only covers 9 patterns (stages 1-3) but needs 15. The educational story is broken.

## Solution Approach
Execute the 8-phase plan from `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md`:
1. Strip main to lobby (remove orchestrator, create /learn + /lobby)
2. Expand pattern library (6 new pattern refs + docs, update dojo + advisor)
3. Rebuild orchestration/1-3 (rename from stage/1-3, add /lobby)
4-7. Build orchestration/4-7 from scratch (clean SKILL.md per stage)
8. Finalize anchors, README, branch protection

## Relevant Files
Use these files to complete the task:

- `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` -- THE PLAN. Every phase, task, success criteria, and file inventory is defined here. Read this FIRST.
- `specs/master-plan.md` -- stage definitions, what each stage teaches, verification prompts
- `.claude/skills/agentic-dojo/SKILL.md` -- dojo routing tables to update with 6 new patterns
- `.claude/skills/pattern-advisor/SKILL.md` -- advisor scoring tables to update
- `.claude/references/patterns/pattern-*.md` -- existing 9 reference files (use as templates for 6 new ones)
- `docs/patterns/*.md` -- existing 13 pattern docs (source material)
- `.claude/skills/orchestrator/SKILL.md` -- current 710-line stage 3 SKILL.md (to be removed from main)
- `chore/tune-product-direction:.claude/skills/orchestrator/SKILL.md` -- 1059-line reference for stages 4-7 content (access via `git show`)

### New Files
- `.claude/commands/learn.md` -- lobby concierge
- `.claude/commands/lobby.md` -- signpost back to main
- 6x `.claude/references/patterns/pattern-*.md` (team-profiles, plugin-architecture, difficulty-routing, spec-hardening, hitl-protocol, hydration-pattern)
- 4x `docs/patterns/*.md` (team-profiles, spec-hardening, hitl-protocol, hydration-pattern) -- 2 already exist (difficulty-routing, plugin-architecture)
- Rewritten `.claude/CLAUDE.md`, `README.md`
- On each module branch: stage-specific SKILL.md, agents, CLAUDE.md

## Implementation Phases

### Phase 1: Foundation (Strip main to lobby)
Remove all orchestrator execution artifacts from main. Create `/learn` concierge and `/lobby` signpost. Rewrite CLAUDE.md for lobby identity. Simplify package.json and settings.json.

This is the foundation -- everything else builds on a clean lobby.

### Phase 2: Core Implementation (Expand pattern library + rebuild branches)
1. Create 6 new pattern reference files + 4 new docs/patterns files
2. Update dojo SKILL.md routing tables (aliases, keywords, zero-state)
3. Update advisor SKILL.md scoring tables
4. Update existing 9 pattern refs: change `stage/*` to `orchestration/*` source anchors
5. Rebuild orchestration/1-3 from stage/1-3 (add /lobby, update CLAUDE.md)
6. Build orchestration/4-7 from scratch (clean SKILL.md per stage)

### Phase 3: Integration & Polish (Finalize anchors + protection)
1. Verify all source anchor line numbers against actual module branch content
2. Replace "Planned" labels with actual branch references
3. Rewrite README.md as learning hub
4. Update master plan
5. Set up GitHub branch protection for `orchestration/*`
6. Final quality check

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
  - Name: builder-lobby
  - Role: Strip main to lobby, create /learn and /lobby commands, rewrite CLAUDE.md and README
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-patterns
  - Role: Create 6 new pattern reference files, 4 new docs/patterns files, update dojo and advisor routing tables, update existing 9 pattern refs with orchestration/* anchors
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-branches-1-3
  - Role: Rebuild orchestration/1-3 from stage/1-3 (add /lobby, update CLAUDE.md, navigation footers)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-stage-4
  - Role: Build orchestration/4-hop from orchestration/3-full (team switching, ~810 line SKILL.md)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-stage-5
  - Role: Build orchestration/5-plugin from orchestration/4-hop (plugin extraction docs)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-stage-6
  - Role: Build orchestration/6-codex from orchestration/5-plugin (difficulty routing, spec hardening, ~910 line SKILL.md)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-stage-7
  - Role: Build orchestration/7-hitl from orchestration/6-codex (HITL bounce-back, persistence, ~1010 line SKILL.md)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-finalize
  - Role: Verify source anchors, rewrite README, update master plan, set branch protection
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-lobby
  - Role: Verify lobby state -- no orchestrator artifacts on main, /learn and /lobby exist, dojo works
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

- Validator
  - Name: validator-patterns
  - Role: Verify all 15 patterns have refs + docs, dojo and advisor route to all 15
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

- Validator
  - Name: validator-branches
  - Role: Verify each module branch has correct SKILL.md, agents, /lobby, CLAUDE.md, clean diffs
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

- Validator
  - Name: validator-final
  - Role: Full acceptance criteria check -- all 15 patterns, all 7 branches, source anchors, branch protection
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.
- IMPORTANT: The detailed plan at `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` defines exact file inventories, success criteria, and verification prompts per phase. Every builder MUST read this plan before starting work.

### 1. Strip Main to Lobby
- **Task ID**: strip-main-to-lobby
- **Depends On**: none
- **Assigned To**: builder-lobby
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` Phase 1 tasks
- Remove `.claude/skills/orchestrator/` (entire directory)
- Remove `.claude/agents/` (entire directory -- builder.md, validator.md, research-builder.md, research-validator.md)
- Remove `.claude/commands/orchestrate.md`
- Remove `scripts/emit-event.ts`
- Remove `src/types/events.ts`, `src/index.ts`
- Remove or simplify `tests/`
- Create `.claude/commands/learn.md` (concierge with module table + structured envelope)
- Create `.claude/commands/lobby.md` (signpost back to main)
- Rewrite `.claude/CLAUDE.md` for lobby identity (include 11-slot pattern contract documentation)
- Simplify `.claude/settings.json` (remove orchestrator permissions, keep Read/Glob/Grep only)
- Simplify `package.json` (remove validate/lint/typecheck scripts)
- Update `specs/master-plan.md` branch strategy section

### 2. Validate Lobby State
- **Task ID**: validate-lobby
- **Depends On**: strip-main-to-lobby
- **Assigned To**: validator-lobby
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify NO `.claude/skills/orchestrator/` on main
- Verify NO `.claude/agents/` on main
- Verify NO `.claude/commands/orchestrate.md` on main
- Verify NO `scripts/emit-event.ts`, `src/types/events.ts`, `src/index.ts` on main
- Verify `.claude/commands/learn.md` exists with module table
- Verify `.claude/commands/lobby.md` exists
- Verify `.claude/skills/agentic-dojo/` still exists and is intact
- Verify `.claude/skills/pattern-advisor/` still exists and is intact
- Verify CLAUDE.md describes lobby, includes 11-slot contract
- Report VERDICT: PASS or VERDICT: FAIL

### 3. Expand Pattern Library
- **Task ID**: expand-pattern-library
- **Depends On**: validate-lobby
- **Assigned To**: builder-patterns
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` Phase 2 tasks
- Read existing `.claude/references/patterns/pattern-builder-validator.md` as template for 11-slot frontmatter
- Create 6 new `.claude/references/patterns/pattern-*.md` files: team-profiles, plugin-architecture, difficulty-routing, spec-hardening, hitl-protocol, hydration-pattern
- Create 4 new `docs/patterns/*.md` files: team-profiles, spec-hardening, hitl-protocol, hydration-pattern (difficulty-routing and plugin-architecture already exist)
- Each reference file uses canonical 11-slot frontmatter contract
- Source anchors use "Planned" labels for branches that don't exist yet, `orchestration/*` format for branches that do
- Update dojo SKILL.md: add aliases, keywords, zero-state entries for 6 new patterns
- Remove "Does not cover patterns from stages 4-9" limitation from dojo
- Update advisor SKILL.md: add scoring rows for 6 new patterns
- Update existing 9 pattern reference files: change `stage/*` to `orchestration/*` source anchors
- Update existing `docs/patterns/` files: change any `stage/*` references to `orchestration/*`

### 4. Validate Pattern Library
- **Task ID**: validate-patterns
- **Depends On**: expand-pattern-library
- **Assigned To**: validator-patterns
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify 15 pattern reference files exist in `.claude/references/patterns/`
- Verify each has 11-slot frontmatter (slug, display_name, one_liner, slots with 11 keys)
- Verify 15 pattern docs exist in `docs/patterns/`
- Verify dojo SKILL.md routing table has 15 entries
- Verify advisor SKILL.md scoring table has 15 entries
- Verify no `stage/*` references remain in pattern refs or docs/patterns
- Report VERDICT: PASS or VERDICT: FAIL

### 5. Rebuild Orchestration Branches 1-3
- **Task ID**: rebuild-branches-1-3
- **Depends On**: validate-patterns
- **Assigned To**: builder-branches-1-3
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` Phase 3 tasks
- `git checkout stage/1-dispatch && git checkout -b orchestration/1-dispatch`
- Add `.claude/commands/lobby.md` (signpost back to main)
- Update CLAUDE.md: add "return to main for /dojo" + cross-branch `git show` hint
- Add navigation footer to README
- Commit and push
- Repeat for orchestration/2-dag (from stage/2-dag) and orchestration/3-full (from stage/3-full)

### 6. Build Orchestration/4-hop
- **Task ID**: build-stage-4
- **Depends On**: rebuild-branches-1-3
- **Assigned To**: builder-stage-4
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` Phase 4 tasks
- Read `specs/master-plan.md` Stage 4 section for scope and verification
- Read `git show chore/tune-product-direction:.claude/skills/orchestrator/SKILL.md` for reference content
- `git checkout orchestration/3-full && git checkout -b orchestration/4-hop`
- Write clean SKILL.md (~810 lines): stage 3 protocol + --team flag, team resolution, HOP config block
- Create research-builder.md and research-validator.md agents
- Create team profiles (engineering.md, research.md)
- Add docs/patterns/team-profiles.md, update docs/patterns/higher-order-prompt.md with HOP proof
- Write stage-specific CLAUDE.md
- Add prompts/stage-4/ test prompts
- Add navigation footer to README
- Commit and push

### 7. Build Orchestration/5-plugin
- **Task ID**: build-stage-5
- **Depends On**: build-stage-4
- **Assigned To**: builder-stage-5
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` Phase 5 tasks
- `git checkout orchestration/4-hop && git checkout -b orchestration/5-plugin`
- SKILL.md stays identical to stage 4 (~810 lines)
- Add docs/patterns/plugin-architecture.md
- Write stage-specific CLAUDE.md
- Add prompts/stage-5/ test prompts
- Add navigation footer to README
- Commit and push

### 8. Build Orchestration/6-codex
- **Task ID**: build-stage-6
- **Depends On**: build-stage-5
- **Assigned To**: builder-stage-6
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` Phase 6 tasks
- Read `git show chore/tune-product-direction:.claude/skills/orchestrator/SKILL.md` for codex-escalation content
- `git checkout orchestration/5-plugin && git checkout -b orchestration/6-codex`
- Extend SKILL.md (~910 lines): Steps 4b + 7b, Codex dispatch, --no-codex flag
- Create codex-escalation.md reference
- Add docs/patterns/difficulty-routing.md and docs/patterns/spec-hardening.md
- Write stage-specific CLAUDE.md
- Add prompts/stage-6/ test prompts
- Add navigation footer to README
- Commit and push

### 9. Build Orchestration/7-hitl
- **Task ID**: build-stage-7
- **Depends On**: build-stage-6
- **Assigned To**: builder-stage-7
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` Phase 7 tasks
- Read `git show chore/tune-product-direction:.claude/skills/orchestrator/SKILL.md` for HITL + hydration content
- `git checkout orchestration/6-codex && git checkout -b orchestration/7-hitl`
- Extend SKILL.md (~1010 lines): --resume, hydration, bounce-back
- Create hitl-protocol.md reference
- Add docs/patterns/hitl-protocol.md and docs/patterns/hydration-pattern.md
- Write stage-specific CLAUDE.md
- Add prompts/stage-7/ test prompts
- Add navigation footer to README
- Commit and push

### 10. Validate All Branches
- **Task ID**: validate-branches
- **Depends On**: build-stage-7
- **Assigned To**: validator-branches
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- For each of orchestration/1-dispatch through orchestration/7-hitl:
  - Verify SKILL.md exists and is appropriately sized
  - Verify .claude/commands/lobby.md exists
  - Verify CLAUDE.md has "return to main for /dojo" + git show hint
  - Verify README has navigation footer
- Verify `git diff orchestration/N..orchestration/N+1` shows clean additions for each stage
- Verify original `stage/*` branches are unmodified
- Report VERDICT: PASS or VERDICT: FAIL

### 11. Finalize Anchors, README, Protection
- **Task ID**: finalize-main
- **Depends On**: validate-branches
- **Assigned To**: builder-finalize
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` Phase 8 tasks
- Switch to main (refactor/lobby-restructure branch)
- For each of 15 pattern reference files: verify source anchor line numbers against actual module branch content
- Replace any "Planned" labels with actual branch references (for stages 1-7)
- Rewrite README.md as learning hub with module table + compare URLs
- Update specs/master-plan.md status table
- Update /learn command if any branch names changed
- Set up GitHub branch protection for orchestration/* via `gh api`

### 12. Final Validation
- **Task ID**: validate-all
- **Depends On**: finalize-main
- **Assigned To**: validator-final
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Run full acceptance criteria check from the plan:
  - /learn on main lists orchestration module with all 7 stages
  - /lobby exists on main
  - 15 pattern refs exist with populated source anchors
  - 15 docs/patterns files exist
  - Dojo routing table has 15 entries
  - Advisor scoring table has 15 entries
  - No `stage/*` references remain in pattern refs
  - No orchestrator execution artifacts on main
  - All source anchors point to existing orchestration/* branches
  - No "Planned" labels remain for stages 1-7
  - README is learning hub format
  - orchestration/* branch protection active
- Report VERDICT: PASS or VERDICT: FAIL

## Acceptance Criteria
- Main is a lobby: no orchestrator, no agents, no emit-event
- /learn lists orchestration module with 7 stages
- /lobby works on main and all module branches
- /dojo covers all 15 patterns
- /advisor scores all 15 patterns
- 7 orchestration/* branches exist with stage-appropriate SKILL.md
- SKILL.md line targets: stage 4 ~810, 5 ~810, 6 ~910, 7 ~1010
- git diff orchestration/N..orchestration/N+1 shows clean additions per stage
- Original stage/* branches untouched
- orchestration/* branch protection enabled
- All source anchors use orchestration/* format with actual line numbers
- README.md is a learning hub with module table and compare URLs

## Validation Commands
- `bun test` -- run all tests (if any remain on main)
- `bunx tsc --noEmit` -- verify no type errors (if tsconfig remains)
- `bunx biome ci .` -- lint and format check (if biome config remains)

Note: After Phase 1, main may have no src/ to validate. Validation commands apply primarily to module branches.

## Notes
- The restructure plan at `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` is the authoritative source. Every builder should read it before starting.
- Stages 4-7 are built from scratch using master plan scope + reference content from `chore/tune-product-direction`. They are NOT cherry-picked.
- Module branches are immutable after creation. No post-creation commits.
- The stage direction feature (on `feat/dojo-stage-directions`) should be merged to main AFTER Phase 2 but BEFORE module branches are created (so voice files propagate through the chain). Coordinate timing.
- Each module branch inherits /lobby from the chain -- it must be added to orchestration/1-dispatch and propagates forward.
