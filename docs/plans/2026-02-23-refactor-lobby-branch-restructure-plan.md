---
title: "refactor: Restructure main as lobby, rebuild module branches"
type: refactor
status: active
date: 2026-02-23
origin: docs/brainstorms/2026-02-23-lobby-branch-strategy-brainstorm.md
---

# refactor: Restructure main as lobby, rebuild module branches

## Overview

Restructure the orchestrator-prototype repository so that main becomes a "lobby" -- a shell housing learning tools (dojo, advisor, pattern library) but NOT the orchestrator. Each module stage gets its own clean branch with a runnable `/orchestrate` command sized for that stage only. The learner uses the dojo on main to learn patterns, then checks out a module branch to see the pattern working in isolation.

The lobby is designed for multiple learning modules. The first module is **orchestration** (`orchestration/1-dispatch`, `orchestration/2-dag`, etc.). Future modules (prompt-engineering, research, etc.) follow the same pattern.

This solves three pain points:
1. The orchestrator SKILL.md grew to 1059 lines (past the 500-line ceiling) causing Claude to skip steps
2. The educational story was muddied -- stages 4-7 never got clean branches
3. Maintenance friction -- every new stage touched the same massive file

## Problem Statement / Motivation

The original design had each stage on its own branch with a clean, isolated orchestrator SKILL.md:

| Branch | SKILL.md | Status |
|--------|----------|--------|
| `stage/1-dispatch` | 152 lines | Clean |
| `stage/2-dag` | 407 lines | Clean |
| `stage/3-full` | 710 lines | Clean |
| `main` | 710 lines | Stage 3 state |
| `chore/tune-product-direction` | 1059 lines | Stages 4-7 accumulated |

Stages 4-7 were built on a single feature branch instead of individual stage branches. The cumulative merge strategy described in the master plan was not followed past stage 3. The 1059-line SKILL.md exceeds the 500-line official ceiling and causes execution degradation.

(see brainstorm: `docs/brainstorms/2026-02-23-lobby-branch-strategy-brainstorm.md`)

## Proposed Solution

### Main = Lobby

Main becomes a learning hub with no orchestrator:

```
main (lobby):
  .claude/skills/agentic-dojo/           <- /dojo teaches patterns
  .claude/skills/pattern-advisor/        <- /advisor recommends patterns
  .claude/commands/learn.md              <- /learn concierge -- lists modules + stages
  .claude/commands/lobby.md              <- /lobby -- inherited by all branches, signpost back to main
  .claude/references/patterns/           <- structured pattern refs (11-slot frontmatter)
  docs/patterns/                         <- SINGLE SOURCE OF TRUTH for pattern content (portable)
  docs/agents.md                         <- agent catalog (reference only)
  specs/master-plan.md                   <- full roadmap
  prompts/                               <- test prompts (learning material)
  specs/examples/                        <- example outputs (learning material)
  README.md                              <- learning hub with module table + compare URLs

  NO .claude/skills/orchestrator/        <- removed
  NO .claude/agents/                     <- removed (only on module branches)
  NO .claude/commands/orchestrate.md     <- removed (only on module branches)
  NO scripts/emit-event.ts              <- removed (only on module branches)
  NO src/types/events.ts                <- removed
```

### Module Branches = Runnable Proof (Immutable After Creation)

Each module branch has a clean, stage-appropriate orchestrator:

```
orchestration/N-name:
  .claude/skills/orchestrator/SKILL.md   <- sized for this stage only
  .claude/commands/orchestrate.md        <- working /orchestrate command
  .claude/commands/lobby.md              <- /lobby signpost back to main (inherited)
  .claude/agents/                        <- agents needed for this stage
  docs/patterns/                         <- cumulative subset to this stage (inherited through chain)
  CLAUDE.md                              <- stage-specific description

  NO .claude/skills/agentic-dojo/        <- main only (future: plugin)
  NO .claude/skills/pattern-advisor/     <- main only (future: plugin)
  NO .claude/commands/learn.md           <- main only
```

**Immutability rule:** Module branches are frozen after creation. No commits after the initial verification pass in their phase. If there's a bug or typo, the fix goes on main (lobby docs) or gets noted -- not patched on the frozen branch. This guarantees:
- Source anchor line numbers stay accurate (no drift)
- `git diff orchestration/N..orchestration/N+1` always shows the same thing
- A learner coming back months later gets the same experience

**Branch protection:** Set up GitHub branch protection rules for `orchestration/*` -- no direct pushes, no force pushes, no deletions. Same as existing `stage/*` branches.

### Branch Naming: Modules, Not Stages

Branches are renamed from `stage/*` to `orchestration/*` to support the multi-module architecture:

| Old Name | New Name |
|----------|----------|
| `stage/1-dispatch` | `orchestration/1-dispatch` |
| `stage/2-dag` | `orchestration/2-dag` |
| `stage/3-full` | `orchestration/3-full` |
| (new) | `orchestration/4-hop` |
| (new) | `orchestration/5-plugin` |
| (new) | `orchestration/6-codex` |
| (new) | `orchestration/7-hitl` |

Future modules follow the same convention: `prompt-eng/1-basics`, `research/1-web`, etc.

### Pattern Content: Single Source of Truth

`docs/patterns/` on main is the single source of truth for all pattern content. This is a portable location that works whether the dojo is a repo-local skill or a marketplace plugin pointing at this repo remotely.

`.claude/references/patterns/` contains structured reference files with 11-slot frontmatter that the dojo reads. These reference files point to `docs/patterns/` for the full content and to module branches for proof code via source anchors.

### Source Anchors Bridge the Gap

Pattern files on main use staged source anchors pointing to proof code on module branches:

```markdown
## Source Anchors

Stage 1 (concept introduction):
- `orchestration/1-dispatch:.claude/skills/orchestrator/SKILL.md:L12-L25` -- HOP variables declared

Stage 4 (proof):
- `orchestration/4-hop:.claude/skills/orchestrator/SKILL.md:L33-L60` -- Team resolution algorithm
- `orchestration/4-hop:.claude/skills/orchestrator/teams/engineering.md` -- Engineering team profile
- `orchestration/4-hop:.claude/skills/orchestrator/teams/research.md` -- Research team profile
```

The pattern file on main is the accumulated wisdom. The source anchors are the breadcrumb trail back through the stages showing how the pattern grew.

### /learn Concierge (main only)

The `/learn` command is the lobby's navigation tool. It lists available modules and their stages:

```markdown
---
description: Browse available learning modules and stages
---

## Available Modules

### Orchestration
Learn agent orchestration patterns incrementally.

| Stage | Branch | What You'll Learn | See Changes |
|-------|--------|-------------------|-------------|
| 1 | `orchestration/1-dispatch` | Single-task dispatch loop | [Diff](../../compare/main...orchestration/1-dispatch) |
| 2 | `orchestration/2-dag` | Task decomposition, wave execution | [Diff](../../compare/orchestration/1-dispatch...orchestration/2-dag) |
| 3 | `orchestration/3-full` | Retry, clarifying questions, fast path | [Diff](../../compare/orchestration/2-dag...orchestration/3-full) |
| 4 | `orchestration/4-hop` | Team switching, HOP pattern | [Diff](../../compare/orchestration/3-full...orchestration/4-hop) |
| 5 | `orchestration/5-plugin` | Plugin extraction | [Diff](../../compare/orchestration/4-hop...orchestration/5-plugin) |
| 6 | `orchestration/6-codex` | Codex routing, spec hardening | [Diff](../../compare/orchestration/5-plugin...orchestration/6-codex) |
| 7 | `orchestration/7-hitl` | HITL bounce-back, persistence | [Diff](../../compare/orchestration/6-codex...orchestration/7-hitl) |

To start: `git checkout orchestration/1-dispatch`
Then run: `/orchestrate "add a greet function"`

To learn patterns without running the orchestrator: use `/dojo` or `/advisor` here on main.
```

For agent consumers, the `/learn` command also includes a structured envelope:

```yaml
learn-envelope:
  modules:
    - id: orchestration
      stages: 7
      branches: [orchestration/1-dispatch, orchestration/2-dag, ...]
      command: /orchestrate
```

### /lobby Command (inherited by all branches)

A lightweight signpost that exists on every branch (inherited through the cumulative chain from main):

```markdown
---
description: Return to the learning lobby on main
---

You are on branch `$CURRENT_BRANCH`.

To return to the lobby: `git checkout main`

On main you have access to:
- `/learn` -- browse all modules and stages
- `/dojo` -- learn orchestration patterns
- `/advisor` -- get pattern recommendations
```

### Cross-Branch Reading (for agents and humans)

Agents and humans can read files from any branch without checking out, using `git show`:

```bash
# Read a pattern doc from main while on a module branch
git show main:docs/patterns/wave-computation.md

# Read the orchestrator SKILL.md from a specific stage
git show orchestration/2-dag:.claude/skills/orchestrator/SKILL.md
```

Each module branch CLAUDE.md includes this hint so agents know how to access pattern content from main without leaving the branch they're working on. This bridges the gap until the dojo becomes a marketplace plugin (see Future Considerations).

### Educational Flow

```
Main (lobby):
  /learn
    -> Shows all modules and stages
    -> "git checkout orchestration/2-dag"

  /dojo explain wave-computation
    -> Miyagi teaches the concept
    -> Source anchors: "orchestration/2-dag:.claude/skills/orchestrator/SKILL.md:L265-L293"
    -> "See it working: git checkout orchestration/2-dag && /orchestrate"

Module branch:
  git checkout orchestration/2-dag
  /orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id"
    -> Proves wave computation works in isolation (407-line SKILL.md)

  /lobby
    -> "You are on orchestration/2-dag. To return: git checkout main"
```

## Technical Approach

### Architecture: Lobby + Module Chain

```
main (lobby) -- learning tools, pattern library, no orchestrator
  |
  +-- orchestration/1-dispatch (152 lines) -- REBUILD (rename from stage/1-dispatch)
  |     |
  |     +-- orchestration/2-dag (407 lines) -- REBUILD (rename from stage/2-dag)
  |           |
  |           +-- orchestration/3-full (710 lines) -- REBUILD (rename from stage/3-full)
  |                 |
  |                 +-- orchestration/4-hop (~810 lines) -- NEW from orchestration/3-full
  |                       |
  |                       +-- orchestration/5-plugin (~810 lines) -- NEW from orchestration/4-hop
  |                             |
  |                             +-- orchestration/6-codex (~910 lines) -- NEW from orchestration/5-plugin
  |                                   |
  |                                   +-- orchestration/7-hitl (~1010 lines) -- NEW from orchestration/6-codex
```

Note: Stages 1-3 are rebuilt (renamed) from the existing `stage/*` branches, not modified in place. The original `stage/*` branches remain as-is (protected).

### File Inventory for Main (after restructure)

| Path | Action | Rationale |
|------|--------|-----------|
| `.claude/skills/orchestrator/` (entire tree) | **Remove** | Orchestrator only lives on module branches |
| `.claude/commands/orchestrate.md` | **Remove** | Only on module branches |
| `.claude/commands/learn.md` | **Create** | Lobby concierge -- lists modules and stages |
| `.claude/commands/lobby.md` | **Create** | Signpost back to main (inherited by all branches) |
| `.claude/agents/` (all 4 agents) | **Remove** | Execution artifacts -- only needed on module branches |
| `.claude/skills/agentic-dojo/` | **Keep + update** | Lobby's primary learning tool |
| `.claude/skills/pattern-advisor/` | **Keep + update** | Lobby's recommendation tool |
| `.claude/references/patterns/` | **Keep + expand** | Add 6 missing pattern refs for stages 4-7 |
| `.claude/CLAUDE.md` | **Rewrite** | New lobby identity, document 11-slot pattern contract |
| `.claude/settings.json` | **Simplify** | Only dojo/advisor permissions (Read, Glob, Grep) |
| `docs/patterns/` | **Keep** (complete set, all stages) | SINGLE SOURCE OF TRUTH for pattern content (portable) |
| `docs/agents.md` | **Keep** | Agent catalog as reference documentation |
| `specs/master-plan.md` | **Keep + update** | Update branch strategy section |
| `specs/examples/` | **Keep** | Learning material (example outputs) |
| `prompts/` | **Keep** | Learning material (test prompts) |
| `scripts/emit-event.ts` | **Remove** | Only consumed by orchestrator |
| `src/types/events.ts` | **Remove** | Only consumed by orchestrator |
| `src/index.ts` | **Remove** | Only re-exports event types |
| `tests/` | **Remove** (or minimal placeholder) | No code to test on main |
| `README.md` | **Rewrite** | Learning hub with module table + compare URLs |
| `package.json` | **Simplify** | Remove validate/lint/typecheck scripts (no src/ to validate) |
| `tsconfig.json`, `biome.json` | **Keep** | Needed for module branches (shared config) |

### Module Branch Composition (each stage)

| Component | Present? | Notes |
|-----------|----------|-------|
| `.claude/skills/orchestrator/SKILL.md` | Yes | Stage-appropriate, clean |
| `.claude/skills/orchestrator/references/` | Yes | Stage-appropriate refs |
| `.claude/commands/orchestrate.md` | Yes | Working command |
| `.claude/commands/lobby.md` | Yes | Inherited from main -- signpost back |
| `.claude/agents/` | Yes | Stage-appropriate agents |
| `.claude/CLAUDE.md` | Yes | Stage-specific description + "return to main for /dojo" + cross-branch `git show` hint + cross-branch reading hint |
| `docs/patterns/` | Yes | Cumulative subset to that stage |
| `scripts/emit-event.ts` | Yes | Observability |
| `src/`, `tests/` | Yes | Verification targets |
| `.claude/skills/agentic-dojo/` | **No** | Main only (future: plugin) |
| `.claude/skills/pattern-advisor/` | **No** | Main only |
| `.claude/commands/learn.md` | **No** | Main only |
| `.claude/references/patterns/` | **No** | Main only |

### SKILL.md Line Targets

| Stage | Branch from | Lines | What it adds |
|-------|------------|-------|-------------|
| 4 | orchestration/3-full (710) | ~810 | `--team` flag, team resolution, HOP config block |
| 5 | orchestration/4-hop (810) | ~810 | No SKILL.md changes (plugin extraction is docs-only) |
| 6 | orchestration/5-plugin (810) | ~910 | Steps 4b + 7b, `--no-codex`, Codex dispatch |
| 7 | orchestration/6-codex (910) | ~1010 | `--resume`, hydration, bounce-back detection |

### Missing Dojo Pattern References (to create)

6 new reference files needed for the lobby to be a complete knowledge base:

| File | Pattern | Stage |
|------|---------|-------|
| `.claude/references/patterns/pattern-team-profiles.md` | Team Profiles | 4 |
| `.claude/references/patterns/pattern-plugin-architecture.md` | Plugin Architecture | 5 |
| `.claude/references/patterns/pattern-difficulty-routing.md` | Difficulty Routing | 6 |
| `.claude/references/patterns/pattern-spec-hardening.md` | Spec Hardening | 6 |
| `.claude/references/patterns/pattern-hitl-protocol.md` | HITL Protocol | 7 |
| `.claude/references/patterns/pattern-hydration-pattern.md` | Hydration Pattern | 7 |

Each uses the canonical 11-slot frontmatter contract. Source anchors use staged format pointing to the appropriate module branch.

6 corresponding `docs/patterns/` files also needed as the human-readable/portable source of truth.

### Missing Advisor Scoring Signals (to define)

The advisor needs scoring guidance for the 6 new patterns:

| Pattern | Scoring Signals |
|---------|----------------|
| Team Profiles | parameterization, multiple agent types, role switching |
| Plugin Architecture | extraction, marketplace, reusability |
| Difficulty Routing | complexity-varies, parallel-execution, escalation |
| Spec Hardening | vague-input, acceptance-criteria, testability |
| HITL Protocol | iterative-feedback, long-running, ambiguity |
| Hydration Pattern | persistent-state, failure-recovery, cross-session |

### Source Anchor Format

Display-only -- the dojo shows anchors but does not read cross-branch files. The learner manually checks out the branch to see the proof.

Format: `<branch>:<file-path>:L<start>-L<end>` followed by ` -- <description>`

For branches that don't exist yet (stages 8-9):
```
Planned -- orchestration/8-parallel (not yet created)
```

Line numbers are best-effort. Stage branches are frozen snapshots after creation, so drift risk is minimal.

### Hub README (main)

Replace the current bun-typescript-starter boilerplate with a learning hub:

```markdown
# HOP Orchestrator - Learn Agent Orchestration Patterns

Each branch is a standalone lesson. Checkout any stage to see the
orchestrator at that complexity level.

## Orchestration Module

| Stage | Branch | What You'll Learn | See Changes |
|-------|--------|-------------------|-------------|
| 1 | [`orchestration/1-dispatch`](../../tree/orchestration/1-dispatch) | Single-task dispatch loop | [Diff](../../compare/main...orchestration/1-dispatch) |
| 2 | [`orchestration/2-dag`](../../tree/orchestration/2-dag) | Task decomposition, wave execution | [Diff](../../compare/orchestration/1-dispatch...orchestration/2-dag) |
| 3 | [`orchestration/3-full`](../../tree/orchestration/3-full) | Retry, clarifying questions, fast path | [Diff](../../compare/orchestration/2-dag...orchestration/3-full) |
| 4 | [`orchestration/4-hop`](../../tree/orchestration/4-hop) | Team switching, HOP pattern | [Diff](../../compare/orchestration/3-full...orchestration/4-hop) |
| 5 | [`orchestration/5-plugin`](../../tree/orchestration/5-plugin) | Plugin extraction | [Diff](../../compare/orchestration/4-hop...orchestration/5-plugin) |
| 6 | [`orchestration/6-codex`](../../tree/orchestration/6-codex) | Codex routing, spec hardening | [Diff](../../compare/orchestration/5-plugin...orchestration/6-codex) |
| 7 | [`orchestration/7-hitl`](../../tree/orchestration/7-hitl) | HITL bounce-back, persistence | [Diff](../../compare/orchestration/6-codex...orchestration/7-hitl) |

## Quick Start

    git clone https://github.com/nathanvale/orchestrator-prototype
    git checkout orchestration/1-dispatch    # Start here
    # Run: /orchestrate "add a greet function"

## Learn Without Running

Use `/dojo` on main to learn patterns, then checkout a stage to see proof:

    /dojo explain wave-computation
    /advisor "I need to add retry logic to my orchestrator"

Use `/learn` to browse all modules and stages.
See `specs/master-plan.md` for the full curriculum.
```

## System-Wide Impact

### Interaction Graph

```
User on main:
  /learn -> lists modules and stages (with structured envelope for agents)
  /dojo -> reads .claude/references/patterns/ -> synthesizes response
  /advisor -> reads .claude/references/patterns/ -> scores and recommends
  /orchestrate -> not found (removed from main)

User on module branch:
  /orchestrate -> reads SKILL.md -> dispatches builder/validator -> executes
  /lobby -> signpost back to main
  /dojo -> not found (main only; future: plugin)
  /advisor -> not found (main only)
  /learn -> not found (main only)
```

### Error Propagation

- If learner tries `/orchestrate` on main: standard "unknown command". `/learn` is the navigation tool.
- If learner tries `/dojo` on a module branch: standard "unknown command". `/lobby` tells them to return to main. Each branch CLAUDE.md also says "return to main for /dojo" + cross-branch `git show` hint.
- If source anchor points to non-existent branch: learner gets git error. Mitigated by "Planned" labels.

### State Lifecycle Risks

- No persistent state at risk. This is a restructuring of branch content, not runtime state.
- The original `stage/*` branches are NOT modified (protected). New `orchestration/*` branches are created alongside.
- The current `chore/tune-product-direction` branch content is preserved for reference but will be superseded by the rebuilt module branches.

### API Surface Parity

Not applicable -- this is a prompt/docs repo, not an API.

## Implementation Phases

### Phase 1: Strip main to lobby (Commit 1)

Remove the orchestrator from main. Create `/learn` concierge and `/lobby` signpost. Rewrite CLAUDE.md.

**Tasks:**
1. Remove `.claude/skills/orchestrator/` (entire directory)
2. Remove `.claude/agents/` (entire directory)
3. Remove `.claude/commands/orchestrate.md`
4. Remove `scripts/emit-event.ts`
5. Remove `src/types/events.ts`, `src/index.ts`
6. Remove or simplify `tests/`
7. Create `.claude/commands/learn.md` -- concierge with module table + structured envelope
8. Create `.claude/commands/lobby.md` -- signpost back to main
9. Rewrite `.claude/CLAUDE.md` for lobby identity (include 11-slot pattern contract documentation)
10. Simplify `.claude/settings.json` (remove orchestrator permissions, keep Read/Glob/Grep only)
11. Simplify `package.json` (remove validate/lint/typecheck scripts -- no src/ to validate)
12. Update `specs/master-plan.md` branch strategy section

**Success criteria:**
- `/learn` on main shows orchestration module with all 7 stages
- `/lobby` exists on main (will be inherited by branches)
- `/dojo` and `/advisor` still work on main
- No orchestrator execution capability on main
- CLAUDE.md accurately describes the lobby and documents the 11-slot pattern contract
- 11-slot pattern contract is explicitly documented in lobby CLAUDE.md

### Phase 2: Expand dojo pattern library (Commit 2)

Create 6 missing pattern reference files for stages 4-7. Update dojo and advisor routing tables.

**Tasks:**
1. Create 6 new `.claude/references/patterns/pattern-*.md` files (team-profiles, plugin-architecture, difficulty-routing, spec-hardening, hitl-protocol, hydration-pattern)
2. Each uses canonical 11-slot frontmatter contract
3. Each has staged source anchors (pointing to module branches once they exist, or "Planned" labels)
4. Create 6 corresponding `docs/patterns/` files as portable source of truth
5. Update dojo SKILL.md: add aliases, keywords, zero-state entries for 6 new patterns
6. Remove "Does not cover patterns from stages 4-9" limitation from dojo
7. Update advisor SKILL.md: add scoring rows for 6 new patterns with defined scoring signals
8. Update existing 9 pattern reference files: change source anchors from `stage/*` to `orchestration/*` format
9. Update existing `docs/patterns/` files: change any `stage/*` references to `orchestration/*`

**Success criteria:**
- `/dojo explain team-profiles` works
- `/dojo explain hitl-protocol` works
- All 15 patterns are discoverable via `/dojo` and `/advisor`
- Source anchors use `orchestration/*` branch names consistently
- Advisor has scoring signals for all 15 patterns

### Phase 3: Rebuild orchestration/1-3 (rename from stage/1-3)

Create `orchestration/*` branches from existing `stage/*` branches. Add `/lobby` command and navigation footers.

**Tasks:**
1. `git checkout stage/1-dispatch && git checkout -b orchestration/1-dispatch`
2. Add `.claude/commands/lobby.md` (signpost back to main)
3. Update CLAUDE.md: add "return to main for /dojo" + cross-branch `git show` hint guidance
4. Add navigation footer to README: Next (Stage 2) | All Modules (main)
5. Repeat for `orchestration/2-dag` (from `stage/2-dag`) and `orchestration/3-full` (from `stage/3-full`)
6. Each gets lobby command, CLAUDE.md update, navigation footer

**Success criteria:**
- `orchestration/1-dispatch`, `orchestration/2-dag`, `orchestration/3-full` exist
- `/orchestrate` works on each
- `/lobby` works on each
- Each README has navigation footer
- Original `stage/*` branches remain untouched

### Phase 4: Rebuild orchestration/4-hop (Commit on new branch)

Branch from `orchestration/3-full`. Add team switching only.

**Tasks:**
1. `git checkout orchestration/3-full && git checkout -b orchestration/4-hop`
2. Write clean SKILL.md (~810 lines): stage 3's protocol + `--team` flag parsing, team resolution, HOP configuration block
3. Create `.claude/agents/research-builder.md` and `research-validator.md`
4. Create `.claude/skills/orchestrator/teams/engineering.md` and `research.md`
5. Add `docs/patterns/team-profiles.md` and update `docs/patterns/higher-order-prompt.md` with HOP proof
6. Write stage-specific CLAUDE.md (include "return to main for /dojo" + cross-branch `git show` hint)
7. Add `prompts/stage-4/` test prompts
8. Write `specs/examples/stage-4-research-team.md`
9. Add navigation footer to README: Previous (Stage 3) | Next (Stage 5) | All Modules (main)

**Verification:**
- `/orchestrate "add a utility function"` -- uses engineering team (default)
- `/orchestrate "research top 5 TS testing frameworks" --team research` -- uses research team
- Both show identical orchestration, only agents differ (HOP proof)
- `/lobby` shows current branch and how to return to main

**Success criteria:**
- SKILL.md is ~810 lines (stage 3 + team switching only)
- No codex, no HITL, no spec hardening
- `--team` flag works
- `git diff orchestration/3-full..orchestration/4-hop` shows clean stage 4 additions only

### Phase 5: Rebuild orchestration/5-plugin (Commit on new branch)

Branch from `orchestration/4-hop`. Plugin extraction stage -- no SKILL.md changes in prototype.

**Tasks:**
1. `git checkout orchestration/4-hop && git checkout -b orchestration/5-plugin`
2. SKILL.md stays identical to stage 4 (~810 lines)
3. Add `docs/patterns/plugin-architecture.md`
4. Write stage-specific CLAUDE.md (mentions plugin extraction context, "return to main for /dojo" + cross-branch `git show` hint)
5. Add `prompts/stage-5/` test prompts
6. Write `specs/examples/stage-5-plugin-install.md`
7. Add navigation footer to README

**Verification:**
- `/orchestrate` works identically to stage 4
- New pattern doc exists

**Success criteria:**
- SKILL.md unchanged from stage 4
- Plugin architecture pattern documented
- `git diff orchestration/4-hop..orchestration/5-plugin` shows only docs/patterns and prompts additions

### Phase 6: Rebuild orchestration/6-codex (Commit on new branch)

Branch from `orchestration/5-plugin`. Add difficulty routing and spec hardening.

**Tasks:**
1. `git checkout orchestration/5-plugin && git checkout -b orchestration/6-codex`
2. Extend SKILL.md (~910 lines): add Steps 4b (difficulty assessment) and 7b (spec hardening), Codex dispatch path in Step 10, `--no-codex` flag
3. Create `.claude/skills/orchestrator/references/codex-escalation.md`
4. Add `docs/patterns/difficulty-routing.md` and `docs/patterns/spec-hardening.md`
5. Update `docs/agents.md` with Codex as alternative execution engine
6. Write stage-specific CLAUDE.md (include "return to main for /dojo" + cross-branch `git show` hint)
7. Add `prompts/stage-6/` test prompts
8. Add navigation footer to README

**Verification:**
- `/orchestrate "refactor user module across 8 files"` -- at least one task tagged `difficulty: hard`
- `/orchestrate "add error handling"` -- hardened acceptance criteria with `[hardened]` annotations
- `/orchestrate "refactor auth" --no-codex` -- all tasks use standard builder

**Success criteria:**
- SKILL.md is ~910 lines (stage 5 + codex routing + spec hardening)
- `git diff orchestration/5-plugin..orchestration/6-codex` shows clean stage 6 additions only

### Phase 7: Rebuild orchestration/7-hitl (Commit on new branch)

Branch from `orchestration/6-codex`. Add HITL bounce-back and persistence.

**Tasks:**
1. `git checkout orchestration/6-codex && git checkout -b orchestration/7-hitl`
2. Extend SKILL.md (~1010 lines): add `--resume` parsing, hydration branch in Step 1, bounce-back detection in Step 10, hydration checkpoints throughout
3. Create `.claude/skills/orchestrator/references/hitl-protocol.md`
4. Add `docs/patterns/hitl-protocol.md` and `docs/patterns/hydration-pattern.md`
5. Update `docs/patterns/spec-as-source-of-truth.md` with hydration extension
6. Write stage-specific CLAUDE.md (include "return to main for /dojo" + cross-branch `git show` hint)
7. Add `prompts/stage-7/` test prompts
8. Add navigation footer to README

**Verification:**
- Bounce-back: task that triggers a design conflict mid-execution
- Resume: multi-wave task, interrupt, re-run with `--resume`
- Hydration checkpoint written after each state change

**Success criteria:**
- SKILL.md is ~1010 lines (stage 6 + HITL + hydration)
- `git diff orchestration/6-codex..orchestration/7-hitl` shows clean stage 7 additions only

### Phase 8: Update source anchors, master plan, and README (Commit on main)

After all module branches exist, finalize everything on main.

**Tasks:**
1. For each of the 15 pattern reference files, verify source anchor line numbers against the actual module branch content
2. Replace any "Planned" labels with actual branch references
3. Verify `/dojo explain <pattern>` shows correct anchors for all 15 patterns
4. Update `specs/master-plan.md`:
   - Branch strategy reflects lobby model and `orchestration/*` naming
   - "What lives on main" section updated (main is knowledge plane, not latest complete state)
   - Current status table updated
5. Rewrite README.md as the lobby welcome mat with compare URLs
6. Update `/learn` command if any branch names changed during rebuild
7. Set up GitHub branch protection for `orchestration/*` (no direct pushes, no force pushes, no deletions)
8. Final quality check on main

**Success criteria:**
- All source anchors point to existing `orchestration/*` branches
- Line numbers are accurate (best-effort, one-time verification pass)
- No "Planned" labels remain for stages 1-7
- Master plan accurately describes the lobby + module chain model
- README guides learners to `/learn`, `/dojo`, and module branches
- `orchestration/*` branch protection rules are active on GitHub
- All quality checks pass

## Alternative Approaches Considered

1. **Keep main as latest stage (original design)** -- rejected: this is what broke. SKILL.md grows monotonically and exceeds the ceiling. (see brainstorm: Approaches Considered)

2. **Main as meta-orchestrator with --stage flag** -- rejected: unnecessary indirection. A concierge command is simpler.

3. **Untangle the current 1059-line SKILL.md into four stage branches** -- rejected: rebuilding from scratch is simpler and cleaner than surgical decomposition. The master plan already defines exactly what each stage introduces.

4. **Pattern content on stage branches, dojo reads via git show** -- rejected: fragile. The dojo would need `git show orchestration/2-dag:.claude/references/patterns/...` which is awkward in a skill. Pattern content on main with source anchors to stage branches is cleaner. (see brainstorm: Key Decision #2)

5. **Stub /orchestrate on main** -- replaced: instead of a stub redirect for one command, the `/learn` concierge serves as the navigation tool for all current and future modules. `/orchestrate` is simply removed from main.

## Acceptance Criteria

### Functional Requirements

- [ ] `/learn` on main lists orchestration module with all 7 stages + structured envelope
- [ ] `/lobby` works on main and all module branches (inherited)
- [ ] `/dojo` on main works with all 15 patterns (9 existing + 6 new)
- [ ] `/advisor` on main scores all 15 patterns with defined scoring signals
- [ ] `/orchestrate` on each module branch (1-7) works with stage-appropriate features
- [ ] `/orchestrate` does NOT exist on main
- [ ] `/dojo` and `/advisor` do NOT exist on module branches
- [ ] Source anchors on main use staged format (`<branch>:<file>:L<start>-L<end> -- <description>`)
- [ ] Stages 4-7 have clean SKILL.md files (cumulative from previous stage, not monolithic)
- [ ] `git diff orchestration/N..orchestration/N+1` shows clean additions for each stage
- [ ] Each stage's CLAUDE.md accurately describes what that stage can and cannot do + "return to main for /dojo" + cross-branch `git show` hint
- [ ] README.md on main is a learning hub with module table and compare URLs
- [ ] Each module branch README has Previous/Next/All Modules navigation footer

### Non-Functional Requirements

- [ ] SKILL.md line targets: stage 4 ~810, stage 5 ~810, stage 6 ~910, stage 7 ~1010
- [ ] No orchestrator execution artifacts on main (no agents, no emit-event, no event types)
- [ ] Original `stage/*` branches are NOT modified (protected)
- [ ] `orchestration/*` branches are immutable after creation -- GitHub branch protection enabled (no direct pushes, no force pushes, no deletions)
- [ ] All pattern reference files use canonical 11-slot frontmatter contract
- [ ] 11-slot pattern contract documented in lobby CLAUDE.md
- [ ] `docs/patterns/` is the portable single source of truth for pattern content
- [ ] Each module branch CLAUDE.md includes cross-branch `git show` hint for agents

### Quality Gates

- [ ] Each rebuilt module branch passes its verification prompts
- [ ] All 15 pattern references have populated source anchors (no empty sections)
- [ ] Dojo envelope parsing works for all 15 patterns
- [ ] No orphaned cross-references (main docs referencing files that don't exist on main)
- [ ] `/learn` structured envelope parseable by agents

## Dependencies & Prerequisites

- Original `stage/*` branches must remain clean and unmodified (they are -- verified)
- The current `chore/tune-product-direction` branch has the content for stages 4-7 (available as reference during rebuild)
- The master plan defines exactly what each stage introduces (the rebuild spec)
- Dojo SKILL.md and advisor SKILL.md exist and are functional

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Rebuilt stage SKILL.md doesn't match original behavior | Medium | Stage verification fails | Use master plan file tables + current 1059-line SKILL.md as reference. Verify with stage prompts. |
| Source anchor line numbers drift after rebuild | Low | Learner confusion | Stage branches are frozen after creation. Phase 8 is a one-time verification pass. If a stage branch is ever amended, re-verify anchors on main. |
| `bun run validate` breaks on main with no src/ | Medium | CI failure | Remove validate/lint/typecheck scripts from lobby package.json. Stage branches have their own inherited scripts. |
| Pattern reference files for stages 4-7 are incomplete | Low | Dojo gaps | Use existing `docs/patterns/` as source material. Apply same slot contract as stages 1-3. |
| Stage 5 feels empty (no SKILL.md changes) | Low | Learner confusion | Stage 5's value is the extraction docs, not orchestrator changes. CLAUDE.md explains this. |
| Cumulative rebuild chain means phase 4 blocks phases 5-7 | Known | Sequential work | Acceptable -- each rebuild is small (~100 lines delta). Could parallelize with worktrees if needed. |
| `/learn` and `/lobby` inheritance breaks on branch checkout | Low | Navigation loss | `/lobby` is a file on the branch, not a main-only skill. It inherits through the cumulative chain. `/learn` is main-only by design. |

## Cross-Plan Conflict Resolutions

| Conflict | Plans Affected | Resolution |
|----------|---------------|------------|
| `docs/patterns/` lifecycle | Lobby plan, add-pattern plan | `docs/patterns/` stays on main as portable single source of truth. `.claude/references/patterns/` has structured frontmatter refs pointing to it. |
| Source anchor format divergence | Lobby plan, dojo plan | Unified to `<branch>:<file-path>:L<start>-L<end> -- <description>`. Both plans use same format with `orchestration/*` naming. |
| Agent files on main | Lobby plan (removes), add-pattern plan (needs them) | Agents removed from main. `/dojo:add-pattern` writes pattern reference files + docs/patterns files only -- no builder/validator dispatch needed on main. |

## Future Considerations

- **Dojo as marketplace plugin** -- the dojo and `/learn` should eventually be Claude Code marketplace plugins, not repo-local skills. As a plugin, the dojo is available regardless of which branch you're on. It would point to `docs/patterns/` in this repo (or any repo) as its pattern source. This eliminates the "lose dojo on branch checkout" problem.
- **Additional learning modules** -- the lobby architecture supports multiple modules: `prompt-eng/1-basics`, `research/1-web`, etc. The `/learn` concierge and `orchestration/*` naming are designed for this.
- **Stages 8-9** -- future stages follow the same pattern: branch from previous stage, write clean SKILL.md, add patterns to lobby. Source anchors use "Planned" labels until branches exist.
- **`/dojo:add-pattern` interaction** -- the add-pattern skill (see `docs/plans/2026-02-22-feat-add-pattern-skill-plan.md`) works on main. New patterns added via this skill write to both `.claude/references/patterns/` (structured ref) and `docs/patterns/` (portable source of truth). No builder/validator dispatch needed on main.
- **`docs/patterns/` as portable pattern source** -- by keeping pattern content in `docs/patterns/` (a standard repo path), any tool or plugin can read patterns from this repo without depending on Claude Code-specific paths like `.claude/references/patterns/`.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-23-lobby-branch-strategy-brainstorm.md](../brainstorms/2026-02-23-lobby-branch-strategy-brainstorm.md) -- Key decisions carried forward: main as lobby, pattern content on main, staged source anchors, rebuild stages 4-7 from scratch, module-ready architecture

### Internal References

- `specs/master-plan.md` -- stage definitions, branch strategy, file tables per stage
- `.claude/skills/orchestrator/SKILL.md` (1059 lines on `chore/tune-product-direction`) -- reference for rebuild content
- `.claude/skills/agentic-dojo/SKILL.md` -- dojo routing tables to update
- `.claude/skills/pattern-advisor/SKILL.md` -- advisor scoring to update
- `.claude/references/patterns/pattern-*.md` -- existing 9 reference files as templates
- `docs/patterns/*.md` -- source material for new reference files

### Related Plans

- `docs/plans/agentic-dojo-skill/2026-02-21-feat-agentic-dojo-skill-plan.md` -- dojo skill plan (dojo structure, pattern library)
- `docs/plans/2026-02-22-feat-add-pattern-skill-plan.md` -- add-pattern skill (pattern pipeline). **Note:** add-pattern no longer needs `.claude/agents/` on main -- it only writes pattern reference files and docs/patterns files.
- `docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md` -- smarter routing (dojo v2)

### Research Sources

- [webpack-101](https://github.com/brunoscopelliti/webpack-101) -- numbered progressive branches, "each step is in its own branch"
- [Angular Material-Start](https://github.com/angular/material-start) -- hub README as navigation hub
- [GitHub Skills](https://github.com/skills/introduction-to-github) -- N-description naming, GitHub's own convention
- [RealWorld](https://github.com/gothinkster/realworld) -- prototype-then-extract separation
- [Kent C. Dodds](https://github.com/kentcdodds/beginners-guide-to-react) -- frozen educational snapshots
- [Net Ninja](https://github.com/iamshaunjp/Complete-React-Tutorial) -- flat branch list at scale (32 lessons)

### SpecFlow Analysis Findings Incorporated

- Q1 (file inventory): resolved in "File Inventory for Main" table
- Q2 (stub command): resolved -- replaced with `/learn` concierge
- Q3 (line targets): resolved -- ~810/810/910/1010
- Q4 (cumulative docs/patterns): resolved -- cumulative, matching stages 1-3
- Q5 (missing reference files): resolved -- create 6 new files in Phase 2
- Q6 (specs/examples): resolved -- keep on main as learning material
- Q7 (non-existent branch anchors): resolved -- "Planned" labels
- Gap 4 (CLAUDE.md divergence): resolved -- rewrite for lobby in Phase 1, stage-specific in Phases 3-7
- Gap 6 (agents on main): resolved -- remove from main, keep on module branches only
- Gap 11 (dojo references to orchestrator internals): accepted -- pattern reference files are self-contained educational content, they don't Read orchestrator files
- Gap 12 (dojo stage limitation): resolved -- remove limitation, expand to all patterns in Phase 2
- Gap 13 (stub command): resolved -- replaced with `/learn` concierge
