# Master Plan: HOP Orchestrator - Staged Rollout

## Purpose

This repository is a learning tool. It exists to teach agent orchestration patterns incrementally -- first for me as I build it, then for anyone who clones it.

Main is the **lobby** -- a learning hub with `/learn`, `/dojo`, and `/advisor` commands but no orchestrator. Each module branch (`orchestration/1-dispatch`, `orchestration/2-dag`, etc.) is a standalone lesson. You checkout a branch and have a working system at that complexity level, with pattern docs explaining the "what, how, and why" of everything in play.

The `docs/patterns/` folder on main holds the complete pattern library. Each module branch has the cumulative subset relevant to that stage. By the end, it's a comprehensive guide to agent orchestration patterns, grounded in a real working implementation -- not abstract theory.

**Build it to learn. Ship it to teach.**

---

## Context

The orchestrator spec lives at `side-quest-plugins/specs/orchestrator-skill-impl.md` (enriched with 3 rounds of community research). Rather than building directly into the plugin system, we prototype in a standalone repo -- prove each capability works, then extract to side-quest-plugins.

**Why prototype first:** The HOP (Higher-Order Prompt) architecture is validated by community research but no dominant implementation exists at the orchestration level. Building in isolation lets us iterate fast without plugin boilerplate, test the agent-agnostic pattern with multiple team profiles, and avoid having to untie hardcoded enterprise agents later.

**Prototype repo:** `~/code/orchestrator-prototype/` (created from bun-typescript-starter GitHub template)
**Target:** `.claude/` project-level folder (no plugin.json needed)
**Final destination:** `side-quest-plugins/plugins/agentic-orchestration/` (Stage 5)

**Full spec reference:** `side-quest-plugins/specs/orchestrator-skill-impl.md`

---

## Stages at a Glance

| Stage | Name | What it Proves | Patterns Introduced |
|-------|------|---------------|---------------------|
| 1 | Minimum Viable Dispatch | Single task dispatch loop works | Builder/Validator, Dispatch Loop, HOP (concept) |
| 2 | Multi-Task DAG | Decomposition, wave execution, spec files | Task DAG, Wave Computation, Spec-as-Source-of-Truth |
| 3 | Full Phase 1 | Retry, clarifying questions, fast path, plan refinement | Retry with Resume, Fast Path Gate, Iterative Refinement |
| 4 | HOP Parameterization | Agent-agnostic orchestration with --team switching | HOP Proof, Team Profiles |
| 5 | Plugin Extraction | Working prototype moves to side-quest-plugins | Plugin Architecture |
| 6 | Codex Escalation + Spec Hardening | Hard tasks route to Codex, specs get hardened | Difficulty Routing, Spec Hardening |
| 7 | HITL Bounce-Back + Persistence | Human-in-the-loop, cross-session resume | HITL Protocol, Hydration Pattern |
| 8 | Parallel Execution + Worktrees | Independent tasks run in parallel, file isolation | Parallel Dispatch, Worktree Isolation |
| 9 | Browser Validation | agent-browser assertions for UI-facing tasks | Browser Validation, Ralph Wiggum Loop |

---

## The HOP Pattern

A Higher-Order Prompt -- a prompt that takes another prompt as a parameter (like a higher-order function). The fixed wrapper contains orchestration logic; the variable parameters contain agent identities.

**Fixed wrapper (the orchestrator SKILL.md):**
- DAG engine, wave computation, retry logic (3 retries + ask user)
- Spec file persistence, iterative plan refinement
- Clarifying questions, fast path gate, token cost estimation
- Spec re-read at each wave, summary reporting

**Variable parameters:**
- `BUILDER_AGENT` -- which builder to dispatch (e.g., `builder`, `builder-scotty`, `research-builder`)
- `VALIDATOR_AGENT` -- which validator to dispatch (e.g., `validator`, `validator-mccoy`, `research-validator`)
- `DOMAIN_VOICE` -- optional persona injection
- Team profiles bundle these together (`--team engineering`, `--team research`, `--team enterprise`)

---

## Directory Structure (all stages complete)

```
~/code/orchestrator-prototype/
  .claude/
    CLAUDE.md                          # Project instructions
    settings.json                      # Tool permissions
    commands/
      orchestrate.md                   # User-facing command (thin, delegates to skill)
    agents/
      builder.md                       # Generic builder (Stage 1)
      validator.md                     # Generic validator (Stage 1)
      research-builder.md              # Research builder (Stage 4)
      research-validator.md            # Research validator (Stage 4)
    skills/
      orchestrator/
        SKILL.md                       # The HOP -- DAG engine, full orchestration logic
        references/
          dag-execution.md             # Wave algorithm, retry protocol, idempotency rules
          codex-escalation.md          # Codex CLI integration, prompt templates (Stage 6)
          hitl-protocol.md             # Bounce-back triggers, status lifecycle (Stage 7)
          browser-validation.md        # agent-browser patterns, token efficiency (Stage 9)
  specs/                               # Output dir for orchestration spec files
    master-plan.md                     # This file
    examples/                          # Gallery of example spec outputs per stage
  prompts/                             # Curated test prompts per stage
    stage-1/
    stage-2/
    ...
  docs/
    agents.md                          # Agent catalog -- all definitions, side-by-side
    patterns/                          # Pattern docs -- progressive per stage
      builder-validator.md             # Stage 1
      dispatch-loop.md                 # Stage 1
      higher-order-prompt.md           # Stage 1 (concept), Stage 4 (proof)
      task-dag.md                      # Stage 2
      wave-computation.md              # Stage 2
      spec-as-source-of-truth.md       # Stage 2
      retry-with-resume.md             # Stage 3
      fast-path-gate.md               # Stage 3
      iterative-refinement.md          # Stage 3
      team-profiles.md                 # Stage 4
      plugin-architecture.md           # Stage 5
      difficulty-routing.md            # Stage 6
      spec-hardening.md                # Stage 6
      hitl-protocol.md                 # Stage 7
      hydration-pattern.md             # Stage 7
      parallel-dispatch.md             # Stage 8
      worktree-isolation.md            # Stage 8
      browser-validation.md            # Stage 9
      ralph-wiggum-loop.md             # Stage 9
```

---

## Current Status

| Stage | Old Branch (`stage/*`) | New Branch (`orchestration/*`) | Status |
|-------|----------------------|-------------------------------|--------|
| 1 | `stage/1-dispatch` (frozen) | `orchestration/1-dispatch` | Complete -- pushed, immutable |
| 2 | `stage/2-dag` (frozen) | `orchestration/2-dag` | Complete -- pushed, immutable |
| 3 | `stage/3-full` (frozen) | `orchestration/3-full` | Complete -- pushed, immutable |
| 4 | on `chore/tune-product-direction` (reference only) | `orchestration/4-hop` | Complete -- pushed, immutable |
| 5 | on `chore/tune-product-direction` (reference only) | `orchestration/5-plugin` | Complete -- pushed, immutable |
| 6 | on `chore/tune-product-direction` (reference only) | `orchestration/6-codex` | Complete -- pushed, immutable |
| 7 | on `chore/tune-product-direction` (reference only) | `orchestration/7-hitl` | Complete -- pushed, immutable |
| 8 | not applicable | `orchestration/8-parallel` | Complete -- pushed, immutable |
| 9 | not applicable | `orchestration/9-browser` | Complete -- pushed, immutable |

**Last checkpoint:** Stages 8-9 complete. All 9 orchestration stages built as clean, isolated `orchestration/*` branches. Main is the lobby -- `/learn`, `/dojo`, `/advisor`, and the full 19-pattern library. Source anchors verified against actual branch content.

**Completed phases:**
1. Strip main to lobby -- done
2. Expand dojo pattern library (9 existing + 6 new patterns) -- done
3. Rebuild orchestration/1-3 from stage/1-3 -- done
4. Rebuild orchestration/4-7 from scratch -- done
5. Finalize anchors, master plan, README, branch protection -- done

**Important:** The original `stage/*` branches remain frozen and protected. The `orchestration/*` branches supersede them and are also immutable after creation.

---


## Stage 1: Minimum Viable Dispatch

**Branch:** `orchestration/1-dispatch` (from `main`) -- originally `stage/1-dispatch`

**Goal:** Prove the three-part dispatch loop works. Orchestrator creates ONE task, dispatches ONE builder, then ONE validator.

**Patterns introduced:**
- `docs/patterns/builder-validator.md`
- `docs/patterns/dispatch-loop.md`
- `docs/patterns/higher-order-prompt.md` (concept introduction)

### Files to Create

Each numbered group maps to one commit in the branch history.

| # | Files | What it does |
|---|-------|-------------|
| 1 | `.claude/CLAUDE.md`, `specs/master-plan.md` | Project configuration -- update template CLAUDE.md with orchestrator overview, simplify master plan for stage context |
| 2 | `.claude/agents/builder.md`, `.claude/agents/validator.md`, `docs/agents.md` | Builder agent (sonnet), validator agent (haiku), and agent catalog documentation |
| 3 | `.claude/commands/orchestrate.md`, `.claude/skills/orchestrator/SKILL.md` | Orchestrator command (thin wrapper) and skill (HOP variables, 5-step dispatch protocol) |
| 4 | `docs/patterns/builder-validator.md`, `docs/patterns/dispatch-loop.md`, `docs/patterns/higher-order-prompt.md` | Pattern documentation -- builder/validator, dispatch loop, HOP concept introduction |
| 5 | `specs/stage-1-minimum-viable-dispatch.md`, `prompts/stage-1/hello-world.md`, `prompts/stage-1/add-utility.md`, `scripts/emit-event.ts`, `.claude/settings.json` | Stage spec, test prompts, emit-event script, and tool permissions |
| 6 | `src/hello.ts` | Verification target -- greet function for testing the dispatch loop |

### Verification

```
/orchestrate "add a hello world function in src/hello.ts that exports a greet function"
```
- Orchestrator creates 1 task
- Builder creates `src/hello.ts`
- Validator inspects and reports PASS/FAIL
- Orchestrator reports result

### NOT in Stage 1

No DAG, no waves, no spec file, no retry, no clarifying questions, no fast path, no dag-execution.md

---

## Stage 2: Multi-Task Decomposition with DAG

**Branch:** `orchestration/2-dag` (from `orchestration/1-dispatch`) -- originally `stage/2-dag`

**Goal:** Decompose into 3+ tasks with dependencies, write a spec file, execute sequentially following topological order.

**Patterns introduced:**
- `docs/patterns/task-dag.md`
- `docs/patterns/wave-computation.md`
- `docs/patterns/spec-as-source-of-truth.md`

### Files to Create/Modify

Each numbered group maps to one commit in the branch history.

| # | Files | Action |
|---|-------|--------|
| 1 | `.claude/skills/orchestrator/SKILL.md`, `.claude/skills/orchestrator/references/dag-execution.md`, `.claude/CLAUDE.md` | Major skill update (decomposition, wave computation, spec writing), new DAG execution reference, updated project description |
| 2 | `docs/patterns/task-dag.md`, `docs/patterns/wave-computation.md`, `docs/patterns/spec-as-source-of-truth.md` | Pattern documentation -- task DAG, wave computation, spec-as-source-of-truth |
| 3 | `specs/stage-2-multi-task-dag.md`, `prompts/stage-2/rest-api.md`, `prompts/stage-2/cli-tool.md`, `specs/examples/stage-2-rest-api.md` | Stage spec, test prompts, and example output |
| 4 | `specs/master-plan.md` | Update master plan with status, file tables matching commit history |
| 5 | `src/hello.ts` (deleted), `src/index.ts` (deleted), `tests/index.test.ts` (deleted) | Remove stage-1 verification target and template files |

### Verification

```
/orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id. Include types, route handlers, and tests."
```
- Decomposes into 3-5 tasks (types -> handlers -> tests with deps)
- Writes `specs/rest-api-orchestrator.md`
- Creates all tasks with addBlockedBy
- Executes Wave 1, then Wave 2, etc.

---

## Stage 3: Full Phase 1

**Branch:** `orchestration/3-full` (from `orchestration/2-dag`) -- originally `stage/3-full`

**Goal:** Complete Phase 1 feature set -- retry, clarifying questions, plan refinement, fast path, spec re-read, token estimation, summary.

**Patterns introduced:**
- `docs/patterns/retry-with-resume.md`
- `docs/patterns/fast-path-gate.md`
- `docs/patterns/iterative-refinement.md`

### Files to Create/Modify

Each numbered group maps to one commit in the branch history.

| # | Files | Action |
|---|-------|--------|
| 1 | `.claude/skills/orchestrator/SKILL.md`, `.claude/skills/orchestrator/references/dag-execution.md`, `.claude/CLAUDE.md` | Full skill rewrite (retry, clarifying questions, fast path, plan refinement, spec re-read, token estimation, summary), update DAG reference with retry protocol and fast path rules, update project description |
| 2 | `docs/patterns/retry-with-resume.md`, `docs/patterns/fast-path-gate.md`, `docs/patterns/iterative-refinement.md` | Pattern documentation -- retry with resume, fast path gate, iterative refinement |
| 3 | `specs/stage-3-full-phase-1.md`, `prompts/stage-3/vague-auth.md`, `prompts/stage-3/simple-jsdoc.md`, `prompts/stage-3/multi-task-retry.md` | Stage spec, test prompts (vague prompt for clarifying questions, simple prompt for fast path, multi-task for retry) |
| 4 | `specs/master-plan.md` | Update master plan with status and file tables |

### Verification

1. **Clarifying questions:** `/orchestrate "add authentication"` (vague) -- expect questions
2. **Fast path:** `/orchestrate "add JSDoc to greet function"` -- expect "simple enough to handle directly"
3. **Retry:** Task with vague criteria -- verify retry up to 3x, then user asked
4. **Full flow:** 4-5 task orchestration end to end

---

## Stages 4-7: Per-Stage Build Plans

Stages 4-7 were rebuilt under the lobby framework, which introduced requirements the original file tables don't account for (`/lobby` command, cross-branch `git show` hints, CLAUDE.md templates, lobby pattern reference updates, `orchestration/*` naming, immutable branches).

**The master plan is the curriculum** -- it defines WHAT each stage teaches, which patterns it introduces, and how to verify it works. The HOW (exact file tables, commit sequences, lobby integration steps) lived in per-stage build plans created before each stage was implemented.

---

## Stage 4: HOP Parameterization Proof

**Branch:** `orchestration/4-hop` (from `orchestration/3-full`)
**Build plan:** Create via `/workflows:plan` before implementation

**Goal:** Prove the orchestrator is agent-agnostic. Create a second agent team, use `--team` flag to switch.

**Patterns introduced:**
- `docs/patterns/team-profiles.md`
- `docs/patterns/higher-order-prompt.md` (updated with proof)

**What this stage adds to SKILL.md (~810 lines):** `--team` flag parsing, team resolution algorithm, HOP configuration block

**Verification:**
1. `/orchestrate "add a utility function"` -- uses engineering team (default)
2. `/orchestrate "research top 5 TS testing frameworks" --team research` -- uses research team
3. Both show identical orchestration. Only agents differ. **This is the HOP proof.**

**NOT in Stage 4:** No codex, no HITL, no spec hardening. Pure prompt/docs/agents stage.

**Reference material:** Stage 4 content on `chore/tune-product-direction` branch (1059-line SKILL.md, lines related to team switching)

---

## Stage 5: Extract to side-quest-plugins

**Branch:** `orchestration/5-plugin` (from `orchestration/4-hop`)
**Build plan:** Create via `/workflows:plan` before implementation

**Goal:** Document the plugin extraction. SKILL.md stays identical to stage 4.

**Patterns introduced:**
- `docs/patterns/plugin-architecture.md`

**What this stage adds to SKILL.md (~810 lines):** Nothing -- SKILL.md unchanged from stage 4. Stage 5's value is the extraction documentation.

**Verification:**
- `/orchestrate` works identically to stage 4
- Plugin architecture pattern documented

**NOT in Stage 5:** No TypeScript code changes in orchestrator-prototype.

**Reference material:** Stage 5 content on `chore/tune-product-direction` branch, cross-repo files in `side-quest-plugins/plugins/agentic-orchestration/`

---

## Stage 6: Codex Escalation + Spec Hardening

**Branch:** `orchestration/6-codex` (from `orchestration/5-plugin`)
**Build plan:** Create via `/workflows:plan` before implementation

**Goal:** Route hard tasks to Codex CLI for deeper reasoning, and harden vague task descriptions into concrete, implementation-ready specs before dispatch.

**Patterns introduced:**
- `docs/patterns/difficulty-routing.md`
- `docs/patterns/spec-hardening.md`

**What this stage adds to SKILL.md (~910 lines):** Steps 4b (difficulty assessment) and 7b (spec hardening), Codex dispatch path in Step 10, `--no-codex` flag

**Verification:**
1. **Hard task routing:** `/orchestrate "refactor user module across 8 files"` -- expect at least one task tagged `difficulty: hard`
2. **Spec hardening:** `/orchestrate "add error handling"` -- expect hardened acceptance criteria
3. **Codex fallback:** Run with Codex not installed -- expect standard builder
4. **--no-codex override:** `/orchestrate "refactor auth" --no-codex` -- all tasks use standard builder

**NOT in Stage 6:** No TypeScript code changes. Codex CLI invoked via Bash.

**Reference material:** Stage 6 content on `chore/tune-product-direction` branch (codex-escalation.md, difficulty scoring, spec hardening logic)

---

## Stage 7: HITL Bounce-Back + Persistence

**Branch:** `orchestration/7-hitl` (from `orchestration/6-codex`)
**Build plan:** Create via `/workflows:plan` before implementation

**Goal:** Add human-in-the-loop bounce-back for mid-execution conflicts and cross-session resume via hydration checkpoints.

**Patterns introduced:**
- `docs/patterns/hitl-protocol.md`
- `docs/patterns/hydration-pattern.md`

**What this stage adds to SKILL.md (~1010 lines):** `--resume` parsing, hydration branch in Step 1, bounce-back detection in Step 10, hydration checkpoints throughout

**Verification:**
1. **Bounce-back:** Task that triggers a design conflict mid-execution -- expect bounced state and user consultation
2. **Resume:** Multi-wave task, interrupt, re-run with `--resume` -- expect completed tasks skipped
3. **Checkpoint:** Hydration checkpoint written after each state change
4. **Full flow:** Bounce-back mid-execution, user resolves, interrupt and resume -- clean completion

**NOT in Stage 7:** No parallel execution. No external state store. No TypeScript code changes.

**Reference material:** Stage 7 content on `chore/tune-product-direction` branch (hitl-protocol.md, hydration schema, resume protocol)

---

## Stage 8: Parallel Wave Execution + Worktree Isolation

**Branch:** `orchestration/8-parallel` (from `orchestration/7-hitl`)

**Goal:** Dispatch independent tasks within the same wave concurrently using git worktrees for file isolation. Fall back to sequential on conflict.

**Patterns introduced:**
- `docs/patterns/parallel-dispatch.md`
- `docs/patterns/worktree-isolation.md`

**What this stage adds to SKILL.md (~1250 lines):** Parallel dispatch decision per wave, worktree creation via `isolation: "worktree"`, diff-and-apply merge protocol, conflict detection and sequential fallback, `--sequential` flag, parallel validator dispatch, parallel execution stats in summary

**Verification:**
1. `/orchestrate "add GET /users, POST /users, DELETE /users, and GET /health"` -- expect parallel dispatch for independent tasks
2. `/orchestrate "add GET /users" --sequential` -- expect sequential execution
3. Multi-wave task with 3 independent tasks in wave 2 -- expect parallel dispatch

**NOT in Stage 8:** No browser validation. No new agent types. Same builder/validator running in parallel.

---

## Stage 9: Browser Validation + Ralph Wiggum Loop

**Branch:** `orchestration/9-browser` (from `orchestration/8-parallel`)

**Goal:** Validate UI-facing tasks visually using the agent-browser CLI. Retry visual failures with the Ralph Wiggum loop (screenshot-fix-screenshot cycle).

**Patterns introduced:**
- `docs/patterns/browser-validation.md`
- `docs/patterns/ralph-wiggum-loop.md`

**What this stage adds to SKILL.md (~1500 lines):** Step 4c UI task detection, browser validation path after standard PASS for UI tasks, Ralph Wiggum loop (max 3 visual retry iterations), dev server lifecycle management, `--no-browser` flag, browser-validation.md reference file, browser stats in summary

**Verification:**
1. `/orchestrate "add a user profile card component with avatar, name, and email"` -- expect browser validation
2. `/orchestrate "fix the layout bug where the sidebar overlaps the main content"` -- expect Ralph Wiggum loop
3. `/orchestrate "add a REST API endpoint" --no-browser` -- expect no browser validation

**NOT in Stage 9:** No visual regression testing against baselines. No cross-browser testing. No pixel-diff comparison.

---

## Branch Strategy - Lobby + Module Chain

**Branch model: lobby + cumulative module chain.** Main is a "lobby" -- a learning hub with no orchestrator. Module branches (`orchestration/*`) form a cumulative chain where each stage branches from the previous. Branches are immutable after creation -- permanent, runnable, frozen snapshots.

The lobby is designed for multiple learning modules. The first module is **orchestration**. Future modules (prompt-engineering, research, etc.) follow the same `<module>/N-name` convention.

```
main (lobby) -- /learn, /dojo, /advisor, pattern library, NO orchestrator
  |
  +-- orchestration/1-dispatch (152 lines)
        |
        +-- orchestration/2-dag (407 lines)
              |
              +-- orchestration/3-full (710 lines)
                    |
                    +-- orchestration/4-hop (~810 lines)
                          |
                          +-- orchestration/5-plugin (~810 lines)
                                |
                                +-- orchestration/6-codex (~910 lines)
                                      |
                                      +-- orchestration/7-hitl (~1010 lines)
                                            |
                                            +-- orchestration/8-parallel (~1250 lines)
                                                  |
                                                  +-- orchestration/9-browser (~1500 lines)
```

### What lives on main (lobby)

Main is the knowledge plane -- learning tools and pattern content, no execution:

- `/learn` concierge -- lists all modules and stages
- `/lobby` signpost -- inherited by all branches, points back to main
- `/dojo` and `/advisor` -- pattern learning and recommendation tools
- `docs/patterns/` -- single source of truth for pattern content (portable)
- `.claude/references/patterns/` -- structured pattern refs with 11-slot frontmatter
- `specs/master-plan.md` (this file)
- `.claude/CLAUDE.md` -- lobby identity, 11-slot pattern contract documentation
- Full project config (`package.json`, `tsconfig.json`, `biome.json`)

Main does NOT have: orchestrator SKILL.md, agents, `/orchestrate` command, emit-event script, src/, tests/

### What lives on module branches

Each module branch is a self-contained, runnable lesson:

- `/orchestrate` command + orchestrator SKILL.md (sized for that stage)
- `/lobby` command (inherited from main -- signpost back)
- Agents needed for that stage
- `docs/patterns/` cumulative subset (inherited through chain)
- Stage-specific CLAUDE.md with cross-branch `git show` hints

### Rules for starting a new stage

1. Checkout the previous module branch: `git checkout orchestration/N-1-name`
2. Create the new branch: `git checkout -b orchestration/N-name`
3. Implement the stage
4. Verify with stage prompts
5. Push the branch -- add pattern references to main's lobby

### Branch immutability

Module branches are frozen after creation. No commits after the initial verification pass. If there's a bug or typo, the fix goes on main (lobby docs) or gets noted -- not patched on the frozen branch. This guarantees:
- Source anchor line numbers stay accurate
- `git diff orchestration/N..orchestration/N+1` always shows the same thing
- A learner coming back months later gets the same experience

### Branch protection

GitHub branch protection rules prevent deletion and direct pushes:
- `orchestration/*` -- immutable module branches (new)
- `stage/*` -- original frozen branches (preserved)

When creating a new module branch, it's automatically covered by the `orchestration/*` wildcard rule.

### Cross-branch reading

Agents and humans can read files from any branch without checking out:

```bash
git show main:docs/patterns/wave-computation.md           # Read pattern from main
git show orchestration/2-dag:.claude/skills/orchestrator/SKILL.md  # Read SKILL.md from a stage
```

This bridges the gap between the lobby (patterns) and module branches (proof) without branch switching.

### Diff commands for readers

```bash
git diff main..orchestration/1-dispatch                        # What stage 1 adds to the lobby
git diff orchestration/1-dispatch..orchestration/2-dag         # What stage 2 adds
git diff orchestration/2-dag..orchestration/3-full             # What stage 3 adds
```

Each diff shows exactly what a stage introduces -- no noise from unrelated changes.

GitHub compare URLs are also available in the `/learn` command and main README.

---

## Key Design Decisions

- **HOP from day one** -- parameterize agents as variables, don't hardcode
- **Markdown skills, not TypeScript** -- the prompt IS the engine
- **haiku for validators** -- ~1/60th cost of Opus, sufficient for mechanical checks
- **sonnet for builders** -- well-specified tasks don't need Opus
- **Foreground-only dispatch** -- background agents can't use MCP tools
- **Resume on retry** -- `resume: agentId` preserves builder's prior context
- **Spec re-read at each wave** -- context compaction can evict the plan
- **Prototype before plugin** -- iterate fast, prove HOP works, then extract
- **Main = lobby, not latest state** -- main is the knowledge plane (learning tools, patterns). Module branches own the execution plane (orchestrator, agents). This prevents SKILL.md bloat and keeps the educational story clean. (see `docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md`)
- **Module branches, not stage branches** -- `orchestration/N-name` naming supports multiple learning modules on the same lobby. Future modules: `prompt-eng/*`, `research/*`, etc.
- **Module branches are immutable** -- frozen after creation. No post-creation commits. Guarantees stable diffs, accurate source anchors, and reproducible learning experiences.
- **Pattern docs grow progressively** -- each stage adds new patterns to `docs/patterns/`. The lobby has all patterns; each module branch has the cumulative subset to that stage.
- **`docs/patterns/` is the portable source of truth** -- pattern content lives at a standard repo path, accessible to any tool or plugin. `.claude/references/patterns/` has structured frontmatter refs that the dojo reads.
- **Dojo as future plugin** -- the dojo and `/learn` should eventually be marketplace plugins, always available regardless of branch. Until then, `/lobby` command and cross-branch `git show` hints bridge the gap.
