# Plan: Build Orchestration Stages 8-9 (Parallel Execution + Browser Validation)

## Task Description
Build `orchestration/8-parallel` and `orchestration/9-browser` module branches, extending the orchestrator with parallel wave execution (worktree isolation) and browser-based validation (agent-browser assertions). Also expand the lobby pattern library from 15 to 19 patterns, update dojo/advisor routing, and update /learn + README.

This spec continues the lobby restructure -- the same framework rules apply (immutable branches, /lobby command, cross-branch hints, cumulative chain from orchestration/7-hitl).

## Objective
When complete:
- `orchestration/8-parallel` exists with parallel dispatch + worktree isolation (~1200 lines SKILL.md)
- `orchestration/9-browser` exists with browser validation + Ralph Wiggum loop (~1300 lines SKILL.md)
- Lobby has 19 pattern refs + docs (4 new: parallel-dispatch, worktree-isolation, browser-validation, ralph-wiggum-loop)
- Dojo routes all 19 patterns, advisor scores all 19
- /learn lists 9 stages, README has 9 rows
- Source anchors populated for stages 8-9
- orchestration/8-parallel and orchestration/9-browser covered by existing branch protection ruleset

## Problem Statement
Stages 8 and 9 are defined in the master plan but have no branches, no pattern docs, and no SKILL.md content. The lobby currently stops at stage 7. The educational chain is incomplete.

## Solution Approach
Follow the same framework established by the lobby restructure:
1. Build module branches from the cumulative chain (8 from 7, 9 from 8)
2. Expand the lobby pattern library with new pattern refs + docs
3. Update dojo/advisor routing tables
4. Update /learn, README, master plan on `refactor/lobby-restructure`

## Cumulative Chain Rules

These rules are inherited from the lobby restructure framework (`docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md`). Every builder MUST follow them.

### No reference SKILL.md for stages 8-9
Unlike stages 4-7 which had reference content on `chore/tune-product-direction` (1059-line SKILL.md), stages 8-9 have NO existing implementation to reference. Builders write from scratch using only the master plan stage descriptions and the patterns described in this spec. This is expected -- stages 8-9 were always "planned" in the master plan.

### What stage 8 inherits from stage 7 (do NOT recreate)
Branching from `orchestration/7-hitl` automatically gives you:
- `.claude/skills/orchestrator/SKILL.md` (1114 lines) -- extend, don't replace
- `.claude/commands/orchestrate.md` -- working /orchestrate command
- `.claude/commands/lobby.md` -- update branch name only
- `.claude/agents/` -- all 4 agents (builder.md, validator.md, research-builder.md, research-validator.md)
- `.claude/skills/orchestrator/references/` -- dag-execution.md, codex-escalation.md, hitl-protocol.md
- `.claude/skills/orchestrator/teams/` -- engineering.md, research.md
- `docs/patterns/` -- 15 pattern docs (cumulative from stages 1-7)
- `scripts/emit-event.ts` -- observability
- `prompts/` -- all stage 1-7 test prompts
- `specs/`, `docs/agents.md`, `package.json`, `tsconfig.json`, `biome.json`

### What each new branch MUST add
Per the Module Branch Composition contract:
1. **Extend SKILL.md** -- add new capabilities, keep everything from previous stage
2. **Add new `docs/patterns/` files** -- cumulative. Stage 8 should have 17 pattern docs, stage 9 should have 19. These go directly on the branch (since branches fork from stage 7 which predates the new docs).
3. **Update `.claude/commands/lobby.md`** -- correct branch name
4. **Rewrite `.claude/CLAUDE.md`** -- stage-specific identity with ALL of:
   - What this stage adds and what it does NOT do
   - "Return to main for /dojo" guidance
   - Cross-branch `git show main:docs/patterns/<pattern>.md` hint
   - Cross-branch reading section
5. **Update `README.md`** -- navigation footer (Previous / Next / All Modules)
6. **Add `prompts/stage-N/`** -- test prompts for this stage's features
7. **Add new reference files** if the stage introduces them (stage 9: browser-validation.md)

### What must NOT be on module branches
Per the Module Branch Composition contract, these are main-only:
- `.claude/skills/agentic-dojo/` -- main only (future: plugin)
- `.claude/skills/pattern-advisor/` -- main only
- `.claude/commands/learn.md` -- main only
- `.claude/references/patterns/` -- main only (structured refs with 11-slot frontmatter)

Do NOT create any of these on module branches.

### `docs/patterns/` is the single source of truth
`docs/patterns/` on main (lobby) is the canonical, portable location for all pattern content. The lobby has ALL patterns; each module branch has the cumulative subset to that stage. New pattern docs created on the lobby in Phase 1 will also need to be added directly to the module branches (since they fork from stage 7, which predates the new lobby docs).

### Cumulative flag parsing chain
Step 1 of SKILL.md parses all flags accumulated through the chain:
- Stage 4: `--team <name>`
- Stage 6: `--no-codex`
- Stage 7: `--resume <path>`
- Stage 8: `--sequential` (NEW)
- Stage 9: `--no-browser` (NEW)

Each stage adds its flag to the existing parsing block. Do not remove or rewrite previous flags.

### Known immutability constraint
Stage 7's README says "Next: Stage 8 (planned)". Since orchestration/7-hitl is immutable, we cannot update this. This is an accepted known issue -- the actual navigation works via /learn on main.

## Relevant Files
- `specs/master-plan.md` -- stage 8-9 definitions, patterns introduced, verification prompts
- `orchestration/7-hitl:.claude/skills/orchestrator/SKILL.md` -- 1114 lines, base for stage 8
- `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` -- framework rules (immutability, /lobby, CLAUDE.md template, navigation footers)
- `.claude/references/patterns/pattern-*.md` -- existing 15 refs (templates for 4 new ones)
- `.claude/skills/agentic-dojo/SKILL.md` -- dojo routing tables to update
- `.claude/skills/pattern-advisor/SKILL.md` -- advisor scoring tables to update
- `.claude/commands/learn.md` -- add stages 8-9
- `README.md` -- add rows for stages 8-9

### New Files
- `orchestration/8-parallel:.claude/skills/orchestrator/SKILL.md` -- extended with parallel dispatch
- `orchestration/9-browser:.claude/skills/orchestrator/SKILL.md` -- extended with browser validation
- `docs/patterns/parallel-dispatch.md`
- `docs/patterns/worktree-isolation.md`
- `docs/patterns/browser-validation.md`
- `docs/patterns/ralph-wiggum-loop.md`
- `.claude/references/patterns/pattern-parallel-dispatch.md`
- `.claude/references/patterns/pattern-worktree-isolation.md`
- `.claude/references/patterns/pattern-browser-validation.md`
- `.claude/references/patterns/pattern-ralph-wiggum-loop.md`
- `orchestration/9-browser:.claude/skills/orchestrator/references/browser-validation.md`
- `prompts/stage-8/` and `prompts/stage-9/` test prompts

## Stage 8: Parallel Execution + Worktrees

### What It Teaches
Tasks within the same wave that have no dependencies between them can run in parallel. File isolation via git worktrees prevents builders from stepping on each other's changes.

### Patterns Introduced
- **Parallel Dispatch** -- launch multiple builders concurrently for independent tasks in the same wave. Merge results when all complete.
- **Worktree Isolation** -- each parallel builder gets a temporary git worktree so file writes don't conflict. Worktrees are merged back after validation.

### What Stage 8 Adds to SKILL.md (~1200 lines, +~86 from 1114)
- **Parallel wave execution** in Step 10: instead of dispatching builders sequentially within a wave, dispatch independent tasks in parallel using multiple foreground Task calls in a single message, each with `isolation: "worktree"` set in the agent definition frontmatter for file isolation
- **Worktree creation**: each parallel builder agent is defined with `isolation: worktree` in its frontmatter, giving it an isolated copy of the repository automatically
- **Worktree merge**: after all parallel builders complete, merge worktree changes back to the main working tree, THEN dispatch validators on the merged state
- **Conflict resolution**: if worktree merges conflict, fall back to sequential re-execution of conflicting tasks
- **`--sequential` flag**: override to disable parallel execution (useful for debugging)
- **Updated token estimation**: parallel dispatch doesn't change cost, but changes latency estimates
- **Updated summary**: report parallel vs sequential execution stats

### What Stage 8 Does NOT Do
- No browser validation (stage 9)
- No new agent types (uses same builder/validator, just runs them in parallel)

### SKILL.md Line Target
~1200 lines (1114 base + ~86 for parallel dispatch + worktree management). Acceptable range: 1100-1250.

### Verification Prompts
1. `/orchestrate "add GET /users, POST /users, DELETE /users, and GET /health endpoints"` -- expect at least 2 tasks dispatched in parallel within a wave
2. `/orchestrate "add GET /users" --sequential` -- expect sequential execution (stage 7 behavior)
3. A multi-wave task where wave 2 has 3 independent tasks -- expect parallel dispatch

### Files to Create/Modify on orchestration/8-parallel
- `.claude/skills/orchestrator/SKILL.md` -- extend with parallel dispatch
- `.claude/CLAUDE.md` -- stage 8 identity, describes parallel + worktrees, cross-branch hints
- `.claude/commands/lobby.md` -- branch name update
- `README.md` -- navigation footer (Previous: Stage 7, Next: Stage 9)
- `docs/patterns/parallel-dispatch.md` -- pattern doc (cumulative addition)
- `docs/patterns/worktree-isolation.md` -- pattern doc (cumulative addition)
- `prompts/stage-8/parallel-wave.md` -- test parallel dispatch
- `prompts/stage-8/sequential-override.md` -- test --sequential flag
- `prompts/stage-8/worktree-conflict.md` -- test conflict resolution
- `specs/examples/stage-8-parallel-dispatch.md` -- example output showing parallel execution

## Stage 9: Browser Validation

### What It Teaches
For UI-facing tasks, the validator can use the agent-browser CLI (Vercel's token-efficient browser automation tool) to take screenshots and assert visual correctness. The Ralph Wiggum loop is a retry pattern where the validator screenshots, finds issues, the builder fixes, and the cycle repeats until clean.

### Patterns Introduced
- **Browser Validation** -- use the agent-browser CLI to take screenshots, evaluate DOM state, and assert visual/functional correctness after a builder completes a UI task.
- **Ralph Wiggum Loop** -- named for the "I'm in danger" feedback cycle: screenshot -> find issues -> fix -> screenshot again. A visual retry loop that runs until the validator reports PASS or max iterations reached.

### What Stage 9 Adds to SKILL.md (~1260 lines, +~100 from 1160)
- **UI task detection** in Step 4 (or 4c): scan task descriptions for UI signals (HTML, CSS, React, component, page, layout, style, visual)
- **Browser validation path** in Step 10: when validator runs on a UI task, launch browser, navigate to the page, take screenshot, evaluate assertions
- **Ralph Wiggum loop**: after browser validation FAIL, re-dispatch builder with screenshot + failure details, then re-validate. Max 3 iterations. On loop exhaustion (3 iterations), escalate to the user using the same protocol as retry exhaustion (Step 11).
- **Browser agent configuration**: which URL to navigate to, viewport size, wait conditions. Dev server lifecycle is managed by the orchestrator (start via `DEV_SERVER_CMD` if not running, stop after browser-tagged wave completes). The `--no-browser` flag skips all browser validation when the dev server is not configured.
- **`--no-browser` flag**: skip browser validation entirely
- **New reference file**: `.claude/skills/orchestrator/references/browser-validation.md` -- agent-browser CLI patterns, token efficiency tips (93% context reduction vs Playwright), screenshot comparison strategies
- **Updated summary**: report browser validation stats (screenshots taken, Ralph Wiggum iterations)

### What Stage 9 Does NOT Do
- No visual regression testing against baselines (pixel diff)
- No cross-browser testing (single browser only)

### SKILL.md Line Target
~1300 lines (1200 base + ~100 for browser validation + Ralph Wiggum loop). Acceptable range: 1200-1400.

### Verification Prompts
1. `/orchestrate "add a user profile card component with avatar, name, and email"` -- expect browser validation after builder creates the component
2. `/orchestrate "fix the layout bug where the sidebar overlaps the main content"` -- expect Ralph Wiggum loop (screenshot, identify, fix, re-screenshot)
3. `/orchestrate "add a REST API endpoint" --no-browser` -- expect no browser validation (API task)

### Files to Create/Modify on orchestration/9-browser
- `.claude/skills/orchestrator/SKILL.md` -- extend with browser validation
- `.claude/skills/orchestrator/references/browser-validation.md` -- agent-browser CLI patterns, token efficiency
- `.claude/CLAUDE.md` -- stage 9 identity, describes browser validation + Ralph Wiggum, cross-branch hints
- `.claude/commands/lobby.md` -- branch name update
- `README.md` -- navigation footer (Previous: Stage 8, Next: planned/future)
- `docs/patterns/browser-validation.md` -- pattern doc (cumulative addition)
- `docs/patterns/ralph-wiggum-loop.md` -- pattern doc (standalone)
- `docs/agents.md` -- update with browser-validator concept
- `specs/examples/stage-9-browser-validation.md` -- example output showing Ralph Wiggum loop
- `prompts/stage-9/browser-validation.md` -- test browser validation
- `prompts/stage-9/ralph-wiggum.md` -- test visual retry loop
- `prompts/stage-9/no-browser-override.md` -- test --no-browser flag

## Implementation Phases

### Phase 1: Expand Lobby Pattern Library (on refactor/lobby-restructure)
Create 4 new pattern reference files + docs, update dojo/advisor routing to 19 patterns, update /learn to 9 stages, update README to 9 rows.

### Phase 2: Validate Lobby Expansion
Verify 19 pattern refs, 19 docs (ralph-wiggum-loop is always standalone), dojo/advisor route all 19, /learn has 9 stages.

### Phase 3: Build orchestration/8-parallel
Branch from orchestration/7-hitl. Extend SKILL.md with parallel dispatch + worktree isolation. Add pattern docs, prompts, CLAUDE.md, /lobby, navigation footer. Commit and push.

### Phase 4: Build orchestration/9-browser
Branch from orchestration/8-parallel. Extend SKILL.md with browser validation + Ralph Wiggum loop. Add pattern docs, prompts, reference file, CLAUDE.md, /lobby, navigation footer. Commit and push.

### Phase 5: Validate Both Branches
Verify SKILL.md sizes, /lobby, CLAUDE.md, navigation, clean diffs.

### Phase 6: Finalize Lobby (on refactor/lobby-restructure)
Update source anchors in the 4 new pattern refs (replace "Planned" with actual line numbers). Update master plan status table. Verify /learn and README are accurate.

### Phase 7: Final Validation
Full acceptance criteria check.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. Use Task and Task* tools only.
- Take note of the session id (agentId) of each team member for resume operations.

### Model Selection Guide

| Role | Model | Rationale |
|------|-------|-----------|
| All builders | sonnet | Executes well-specified tasks reliably |
| Most validators | haiku | Mechanical checks: read files, run commands, report PASS/FAIL |
| Comprehensive audits | sonnet | Cross-branch reasoning across multiple dimensions (validator-full-framework) |

### Team Members

- Builder
  - Name: builder-patterns-8-9
  - Role: Create 4 new pattern reference files, 3-4 new docs/patterns files, update dojo and advisor routing tables, update /learn and README for 9 stages
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-stage-8
  - Role: Build orchestration/8-parallel from orchestration/7-hitl (parallel dispatch, worktree isolation, ~1200 line SKILL.md)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-stage-9
  - Role: Build orchestration/9-browser from orchestration/8-parallel (browser validation, Ralph Wiggum loop, ~1300 line SKILL.md)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-finalize-8-9
  - Role: Update source anchors for 4 new pattern refs, update master plan, verify /learn and README
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-patterns-8-9
  - Role: Verify 19 pattern refs + docs, dojo/advisor route all 19, /learn has 9 stages
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

- Validator
  - Name: validator-branches-8-9
  - Role: Verify orchestration/8-parallel and orchestration/9-browser have correct SKILL.md, /lobby, CLAUDE.md, navigation, clean diffs
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

- Validator
  - Name: validator-final-8-9
  - Role: Full acceptance criteria check for stages 8-9 specifically
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

- Validator
  - Name: validator-full-framework
  - Role: Comprehensive framework audit across ALL 9 branches + lobby. Verifies every rule from the lobby restructure framework holds across the entire chain.
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.

### 1. Expand Lobby Pattern Library for Stages 8-9
- **Task ID**: expand-patterns-8-9
- **Depends On**: none
- **Assigned To**: builder-patterns-8-9
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Create 4 new `.claude/references/patterns/pattern-*.md` files: parallel-dispatch, worktree-isolation, browser-validation, ralph-wiggum-loop
- Each uses canonical 11-slot frontmatter contract
- Source anchors use "Planned" labels initially (branches don't exist yet)
- Create 4 new `docs/patterns/` files: parallel-dispatch, worktree-isolation, browser-validation, ralph-wiggum-loop
- Update dojo SKILL.md: add aliases, keywords, zero-state entries for 4 new patterns (15 -> 19)
- Update advisor SKILL.md: add scoring rows for 4 new patterns
  - Parallel Dispatch: independent-tasks, throughput, wave-execution
  - Worktree Isolation: file-conflicts, parallel-execution, isolation
  - Browser Validation: ui-facing, visual-correctness, screenshots
  - Ralph Wiggum Loop: visual-retry, iterative-fix, screenshot-driven
- Update `.claude/commands/learn.md`: add stages 8 and 9 to module table + YAML envelope
- Update `README.md`: add rows 8 and 9 to the orchestration module table

### 2. Validate Lobby Expansion
- **Task ID**: validate-patterns-8-9
- **Depends On**: expand-patterns-8-9
- **Assigned To**: validator-patterns-8-9
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify 19 pattern reference files exist in `.claude/references/patterns/`
- Verify 19 `docs/patterns/` files exist (ralph-wiggum-loop is always a standalone file)
- Verify dojo SKILL.md has 19 entries in routing table
- Verify advisor SKILL.md has 19 entries in scoring table
- Verify /learn has 9 stages
- Verify README has 9 rows
- Report VERDICT: PASS or VERDICT: FAIL

### 3. Build Orchestration/8-parallel
- **Task ID**: build-stage-8
- **Depends On**: validate-patterns-8-9
- **Assigned To**: builder-stage-8
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- `git checkout orchestration/7-hitl && git checkout -b orchestration/8-parallel`
- Extend SKILL.md (~1200 lines): parallel wave dispatch, worktree creation/merge, --sequential flag, conflict resolution fallback
- Write stage-specific CLAUDE.md (include cross-branch hints, what this stage does/doesn't do)
- Create `.claude/commands/lobby.md` with branch name
- Create `prompts/stage-8/` test prompts
- Add `docs/patterns/parallel-dispatch.md` and `docs/patterns/worktree-isolation.md`
- Add navigation footer to README (Previous: Stage 7, Next: Stage 9)
- Create `specs/examples/stage-8-parallel-dispatch.md` -- example output showing parallel execution
- Commit and push

### 4. Build Orchestration/9-browser
- **Task ID**: build-stage-9
- **Depends On**: build-stage-8
- **Assigned To**: builder-stage-9
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- `git checkout orchestration/8-parallel && git checkout -b orchestration/9-browser`
- Extend SKILL.md (~1300 lines): UI task detection, browser validation path, Ralph Wiggum loop, --no-browser flag
- Create `.claude/skills/orchestrator/references/browser-validation.md`
- Write stage-specific CLAUDE.md
- Create `.claude/commands/lobby.md` with branch name
- Create `prompts/stage-9/` test prompts
- Add `docs/patterns/browser-validation.md` and `docs/patterns/ralph-wiggum-loop.md`
- Update `docs/agents.md` with browser-validator concept
- Add navigation footer to README (Previous: Stage 8, Next: planned/future)
- Create `specs/examples/stage-9-browser-validation.md` -- example output showing Ralph Wiggum loop
- Commit and push

### 5. Validate Both Branches
- **Task ID**: validate-branches-8-9
- **Depends On**: build-stage-9
- **Assigned To**: validator-branches-8-9
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- For orchestration/8-parallel and orchestration/9-browser:
  - Verify SKILL.md exists and is appropriately sized (8: ~1200, 9: ~1300)
  - Verify `.claude/commands/lobby.md` exists with correct branch name
  - Verify CLAUDE.md has cross-branch hints and all 4 required elements
  - Verify README has navigation footer
  - Verify `prompts/stage-8/` has 3 prompt files (stage 8) and `prompts/stage-9/` has 3 prompt files (stage 9)
  - Verify `docs/patterns/parallel-dispatch.md` and `docs/patterns/worktree-isolation.md` on stage 8
  - Verify `docs/patterns/browser-validation.md` and `docs/patterns/ralph-wiggum-loop.md` on stage 9
  - Verify `docs/agents.md` updated with browser-validator concept on stage 9
  - Verify `specs/examples/` files exist on each branch
  - Verify main-only artifacts ABSENT: no `.claude/skills/agentic-dojo/`, no `.claude/skills/pattern-advisor/`, no `.claude/commands/learn.md`, no `.claude/references/patterns/`
- Verify `git diff orchestration/7-hitl..orchestration/8-parallel` shows clean additions
- Verify `git diff orchestration/8-parallel..orchestration/9-browser` shows clean additions
- Report VERDICT: PASS or VERDICT: FAIL

### 6. Finalize Lobby for Stages 8-9
- **Task ID**: finalize-8-9
- **Depends On**: validate-branches-8-9
- **Assigned To**: builder-finalize-8-9
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Switch to refactor/lobby-restructure
- Update source anchors in 4 new pattern refs: replace "Planned" with actual orchestration/8-parallel and orchestration/9-browser references with line numbers
- Add `specs/examples/stage-8-parallel-dispatch.md` and `specs/examples/stage-9-browser-validation.md` to the lobby (copies from module branches, consistent with how stages 4-7 examples live on main)
- Update `specs/master-plan.md`:
  - Status table: stages 8-9 -> "Complete -- pushed, immutable"
  - Replace the stub "Stages 8-9: Advanced Capabilities" section with full stage definitions matching the format of stages 1-7 (goal, patterns introduced, what it adds to SKILL.md, verification prompts, "NOT in Stage N", reference material notes)
  - Update the branch strategy tree diagram to show stages 8-9 with actual line counts instead of "(planned)"
  - Fix the `docs/patterns/` directory listing in the Directory Structure section -- add `plugin-architecture.md` (Stage 5), `spec-hardening.md` (Stage 6), `ralph-wiggum-loop.md` (Stage 9), and verify the full list matches actual files
- Update /learn command if any branch names differ from plan
- Add `git diff` commands alongside relative diff URLs in `/learn` so CLI users have a local alternative (e.g., `git diff main...orchestration/1-dispatch`)
- Verify README is accurate
- **Lobby hygiene fixes (from code review):**
  - Fix `tsconfig.json`: add comment explaining `src/` reference is inherited by module branches (no `src/` exists on main)
  - Fix `.claude/commands/lobby.md`: replace `$CURRENT_BRANCH` with an instruction for the agent to detect the branch via `git branch --show-current` (not a documented Claude Code variable)
  - Move `specs/lobby-restructure.md` to `docs/plans/` (execution artifact, not learning material)
  - Add "Source Anchor Resolution" section to `.claude/CLAUDE.md` explaining how agents resolve anchors: `git show <branch>:<path> | sed -n '<start>,<end>p'`
  - Verify `.github/workflows/pr-quality.yml` passes on main without `src/` (CI may reference files that no longer exist)
  - Update dojo SKILL.md `description` field to mention all 19 patterns (currently only lists original subset)
  - Rewrite master plan "Stages 4-7: Per-Stage Build Plans" section to past tense (currently reads as in-progress)

### 7. Final Validation (Stages 8-9)
- **Task ID**: validate-all-8-9
- **Depends On**: finalize-8-9
- **Assigned To**: validator-final-8-9
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Stages 8-9 specific acceptance criteria:
  - 19 pattern refs with 11-slot frontmatter on main
  - 19 docs/patterns files on main
  - Dojo routes all 19, advisor scores all 19
  - 9 orchestration/* branches exist
  - SKILL.md sizes: 8 ~1200, 9 ~1300
  - /learn lists 9 stages, README has 9 rows
  - No "Planned" labels for stages 1-9
  - Cumulative chain for stages 8-9:
    - orchestrate.md, agents, emit-event.ts inherited on both
    - docs/patterns/ count: >= 17 on stage 8, >= 18 on stage 9
    - browser-validation.md reference exists on stage 9
  - Both branches have /lobby, CLAUDE.md (4 required elements), navigation footer
  - Flag parsing: stage 9 SKILL.md has all 5 flags
  - Clean diffs: 7->8, 8->9
  - Master plan has full stage 8-9 definitions + actual line counts in tree
  - Master plan "Stages 4-7" section is past tense (not in-progress language)
  - Lobby hygiene:
    - `tsconfig.json` has comment about `src/` inheritance
    - `lobby.md` does NOT use `$CURRENT_BRANCH` literal
    - `specs/lobby-restructure.md` moved to `docs/plans/`
    - CLAUDE.md has "Source Anchor Resolution" section
    - Dojo description field mentions all 19 patterns
    - `/learn` has `git diff` commands alongside relative URLs
- Report VERDICT: PASS or VERDICT: FAIL

### 8. Full Framework Audit (All 9 Branches + Lobby)
- **Task ID**: validate-full-framework
- **Depends On**: validate-all-8-9
- **Assigned To**: validator-full-framework
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Comprehensive checklist validating the ENTIRE lobby restructure framework across all 9 module branches and the lobby. This is the definitive "ship it" gate.

**A. Lobby (refactor/lobby-restructure branch)**

A1. Main-only artifacts PRESENT:
  - `.claude/commands/learn.md` exists with 9 stages + YAML envelope
  - `.claude/commands/lobby.md` exists
  - `.claude/skills/agentic-dojo/SKILL.md` exists
  - `.claude/skills/pattern-advisor/SKILL.md` exists
  - `.claude/references/patterns/` has 19 pattern-*.md files
  - `docs/patterns/` has 19 files
  - `.claude/CLAUDE.md` describes lobby identity + 11-slot pattern contract
  - `README.md` is learning hub with 9-stage module table + compare URLs
  - `specs/master-plan.md` has full definitions for all 9 stages, accurate status table, branch tree with actual line counts

A2. Execution artifacts ABSENT from main:
  - NO `.claude/skills/orchestrator/`
  - NO `.claude/agents/`
  - NO `.claude/commands/orchestrate.md`
  - NO `scripts/emit-event.ts`
  - NO `src/` directory
  - NO `tests/` directory

A3. Dojo + Advisor coverage:
  - Dojo zero-state list has 19 patterns
  - Dojo keyword table has 19 entries with file paths
  - Dojo alias table covers all 19 patterns
  - Advisor scoring table has 19 entries with defined signals
  - No "Does not cover" limitation text in dojo

A4. Source anchors:
  - All 19 pattern refs have populated source anchors (no empty sections)
  - No "Planned" labels for stages 1-9
  - All anchors use `orchestration/*` format (no `stage/*`)
  - Spot-check 3 anchors: line numbers roughly match content on target branch

A5. Pattern contract:
  - All 19 pattern refs have all 11 slot headings
  - CLAUDE.md documents the 11-slot contract with schema and slot definitions

**B. Per-Branch Checks (for EACH of orchestration/1-dispatch through orchestration/9-browser)**

For each branch, verify:

B1. Execution infrastructure PRESENT:
  - `.claude/skills/orchestrator/SKILL.md` exists
  - `.claude/commands/orchestrate.md` exists
  - `.claude/commands/lobby.md` exists with correct branch name in the text
  - `.claude/agents/builder.md` exists
  - `.claude/agents/validator.md` exists
  - `scripts/emit-event.ts` exists
  - `.claude/CLAUDE.md` exists

B2. CLAUDE.md has all 4 required elements:
  - Stage identity (what this stage adds / does NOT do)
  - "return to main for /dojo" or equivalent guidance
  - Cross-branch `git show` hint with example commands
  - Cross-branch reading section

B3. README.md has navigation footer:
  - Previous link (except stage 1)
  - Next link (except stage 9 which says "planned/future")
  - All Modules link to main

B4. Main-only artifacts ABSENT:
  - NO `.claude/skills/agentic-dojo/`
  - NO `.claude/skills/pattern-advisor/`
  - NO `.claude/commands/learn.md`
  - NO `.claude/references/patterns/`

B5. `docs/patterns/` cumulative count:
  - Stage 1: >= 3 (builder-validator, dispatch-loop, higher-order-prompt)
  - Stage 2: >= 6 (+ task-dag, wave-computation, spec-as-source-of-truth)
  - Stage 3: >= 9 (+ retry-with-resume, fast-path-gate, iterative-refinement)
  - Stage 4: >= 9 (team-profiles first appears on stage 5, not stage 4)
  - Stage 5: >= 11 (+ plugin-architecture)
  - Stage 6: >= 13 (+ difficulty-routing, spec-hardening)
  - Stage 7: >= 15 (+ hitl-protocol, hydration-pattern)
  - Stage 8: >= 17 (+ parallel-dispatch, worktree-isolation)
  - Stage 9: >= 19 (+ browser-validation, ralph-wiggum-loop)

**C. Chain Integrity**

C1. SKILL.md line counts are monotonically non-decreasing:
  - Record line count for each stage, verify N <= N+1 for all consecutive pairs
  - Expected: 152, 407, 710, ~769, ~769, ~945, ~1114, ~1200, ~1300

C2. Stage-specific agents:
  - Stages 1-3: builder.md, validator.md (2 agents)
  - Stages 4-9: + research-builder.md, research-validator.md (4 agents)

C3. Stage-specific references:
  - Stage 1: no references/ directory
  - Stages 2-5: dag-execution.md
  - Stage 6: + codex-escalation.md
  - Stage 7: + hitl-protocol.md
  - Stage 8: same as 7
  - Stage 9: + browser-validation.md

C4. Cumulative flag parsing (grep SKILL.md on each stage):
  - Stages 1-3: no flags
  - Stage 4-5: --team
  - Stage 6: + --no-codex
  - Stage 7: + --resume
  - Stage 8: + --sequential
  - Stage 9: + --no-browser

C5. Clean diffs between ALL consecutive stages:
  - `git diff orchestration/N..orchestration/N+1 --stat` for all 8 pairs
  - Each should show additions, not wholesale rewrites (no SKILL.md 100% rewrite)

C6. Original stage/* branches untouched:
  - `git log stage/1-dispatch --oneline -1` -- no lobby commits
  - `git log stage/2-dag --oneline -1` -- no lobby commits
  - `git log stage/3-full --oneline -1` -- no lobby commits

**D. Protection + Infrastructure**

D1. Branch protection:
  - `gh api repos/nathanvale/orchestrator-prototype/rulesets` includes orchestration/* protection

D2. /learn command:
  - 9 stages listed with correct branch names
  - Diff links use correct consecutive branch pairs
  - YAML envelope has `stages: 9`

D3. README module table:
  - 9 rows with correct branch names
  - GitHub compare URLs use correct consecutive branch pairs

**E. Lobby Hygiene (code review fixes)**

E1. Configuration hygiene:
  - `tsconfig.json` has a comment explaining `src/` reference is for module branches
  - `.claude/commands/lobby.md` does NOT contain literal `$CURRENT_BRANCH` (uses agent instruction or resolved value)
  - `specs/lobby-restructure.md` has been moved to `docs/plans/` (not in specs/ root)

E2. Agent-native improvements:
  - `.claude/CLAUDE.md` has a "Source Anchor Resolution" section with `git show` + `sed` example
  - `/learn` command has `git diff` commands alongside relative diff URLs
  - Dojo SKILL.md `description` field mentions all 19 patterns (not just original subset)

E3. Master plan hygiene:
  - "Stages 4-7: Per-Stage Build Plans" section uses past tense (not "are being rebuilt")
  - `docs/patterns/` directory listing in Directory Structure section includes all 19 files

E4. CI verification:
  - `.github/workflows/pr-quality.yml` does not reference `src/` or `tests/` that don't exist on main, OR has been updated to handle their absence

**Reporting:**
- For each check (A1-A5, B1-B5 per branch, C1-C6, D1-D3, E1-E4), report PASS or FAIL with evidence
- Any FAIL blocks the overall verdict
- Report overall VERDICT: PASS or VERDICT: FAIL
- Include a summary table: branch name | B1 | B2 | B3 | B4 | B5 | status

## Acceptance Criteria

### Branch Integrity
- orchestration/8-parallel exists with ~1200 line SKILL.md (parallel dispatch + worktree isolation)
- orchestration/9-browser exists with ~1300 line SKILL.md (browser validation + Ralph Wiggum loop)
- SKILL.md chain is monotonically non-decreasing: 152 -> 407 -> 710 -> 769 -> 769 -> 945 -> 1114 -> ~1200 -> ~1300
- git diff orchestration/7-hitl..orchestration/8-parallel shows clean stage 8 additions
- git diff orchestration/8-parallel..orchestration/9-browser shows clean stage 9 additions

### Cumulative Chain Compliance
- orchestration/8-parallel inherits ALL stage 7 infrastructure (agents, orchestrate.md, emit-event.ts, references, 15 pattern docs)
- orchestration/8-parallel has 17 docs/patterns files (15 inherited + parallel-dispatch + worktree-isolation)
- orchestration/9-browser has 19 docs/patterns files (17 inherited + browser-validation + ralph-wiggum-loop)
- SKILL.md on stage 8 parses ALL accumulated flags: --team, --no-codex, --resume, --sequential
- SKILL.md on stage 9 parses ALL accumulated flags: --team, --no-codex, --resume, --sequential, --no-browser
- Both branches have `.claude/commands/orchestrate.md` (inherited)
- Both branches have `.claude/agents/` with all 4 agents (inherited)
- Both branches have `scripts/emit-event.ts` (inherited)

### Module Branch Framework
- Both branches have `.claude/commands/lobby.md` with correct branch name
- Both branches have `.claude/CLAUDE.md` with: stage identity, "return to main for /dojo", cross-branch `git show` hint, "What This Stage Does NOT Do"
- Both branches have `README.md` with navigation footer (Previous / Next / All Modules)
- Both branches have `prompts/stage-N/` test prompts

### Lobby Updates
- 19 pattern refs exist with populated source anchors (no "Planned" for stages 1-9)
- 19 docs/patterns files on main
- Dojo routes all 19 patterns, advisor scores all 19
- /learn lists 9 stages, README has 9 rows
- Master plan has full stage 8-9 definitions (not stub), status table updated
- Master plan branch tree shows actual line counts for stages 8-9
- orchestration/* branch protection covers both new branches (existing wildcard ruleset)

### Lobby Hygiene (from code review)
- `tsconfig.json` has comment about `src/` inheritance
- `lobby.md` does not use `$CURRENT_BRANCH` literal
- `specs/lobby-restructure.md` moved to `docs/plans/`
- CLAUDE.md has "Source Anchor Resolution" section with `git show` + `sed` example
- `/learn` has `git diff` commands alongside relative diff URLs
- Dojo description mentions all 19 patterns
- Master plan "Stages 4-7" section uses past tense
- CI workflows pass on main without `src/`

### Full Framework Compliance (Task 8 -- the "ship it" gate)
- Task 8 (validator-full-framework) runs a comprehensive audit across ALL 9 branches + lobby
- Checks every rule from the lobby restructure framework: main-only artifacts, per-branch composition, cumulative chain integrity, protection, navigation, lobby hygiene
- This is the final gate before the restructure is considered complete
- See Task 8 for the full checklist (sections A through E)

### Main-Only Artifacts
- NO `.claude/references/patterns/` on module branches (main only -- structured refs with 11-slot frontmatter)
- NO `.claude/skills/agentic-dojo/` on module branches (main only)
- NO `.claude/skills/pattern-advisor/` on module branches (main only)
- NO `.claude/commands/learn.md` on module branches (main only)
- Validators should check these do NOT appear on the new branches

## Notes
- The existing branch protection ruleset (`orchestration/*` wildcard) automatically covers the new branches -- no additional setup needed.
- Stage 8 adds no new agent types. The same builder/validator run in parallel via multiple foreground Task calls in a single message, each agent defined with `isolation: worktree` in its frontmatter for file isolation. Background subagents (`run_in_background: true`) are NOT used because MCP tools are unavailable in background mode.
- Stage 9 uses the agent-browser CLI (Vercel's `/compound-engineering:agent-browser` skill) for browser validation. This is preferred over chrome-devtools MCP for token efficiency (93% context reduction). The orchestrator invokes agent-browser via Bash commands.
- Ralph Wiggum Loop is a standalone pattern (always a separate `docs/patterns/ralph-wiggum-loop.md` and pattern ref). It has a distinct trigger (VERDICT: FAIL from browser validation), a distinct mechanism (screenshot-fix-screenshot cycle), and a distinct exhaustion path (escalate to user via retry-exhaustion protocol).
- The SKILL.md line targets are estimates. The acceptable ranges: stage 8 (1100-1250), stage 9 (1200-1400).
- After execution completes, there should be NO "Planned" labels remaining for any stage 1-9. Only stages 10+ (if any) would use "Planned".
- Stages 8-9 are written from scratch -- there is no reference SKILL.md to copy from. Builders use the master plan stage descriptions and this spec as their guide.
- `specs/examples/` files are created on both the module branches (Tasks 3, 4) and on the lobby (Task 6), consistent with how stages 4-7 examples were handled.
- Validator dispatch order in parallel mode: merge ALL worktrees first, THEN dispatch validators on the merged state. Validators need to see cross-task consistency.
