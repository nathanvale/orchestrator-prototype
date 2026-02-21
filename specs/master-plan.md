# Master Plan: HOP Orchestrator - Staged Rollout

## Purpose

This repository is a learning tool. It exists to teach agent orchestration patterns incrementally -- first for me as I build it, then for anyone who clones it.

Each git branch is a standalone lesson. `stage/1-dispatch` teaches the dispatch loop. `stage/2-dag` adds task decomposition. `stage/3-full` adds retry logic. You can checkout any branch and have a working system at that complexity level, with pattern docs explaining the "what, how, and why" of everything in play.

The `docs/patterns/` folder grows with each stage. By the end, it's a comprehensive guide to agent orchestration patterns, grounded in a real working implementation -- not abstract theory.

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
      difficulty-routing.md            # Stage 6
      hitl-protocol.md                 # Stage 7
      hydration-pattern.md             # Stage 7
      parallel-dispatch.md             # Stage 8
      worktree-isolation.md            # Stage 8
      browser-validation.md            # Stage 9
```

---

## Current Status

| Stage | Branch | Status |
|-------|--------|--------|
| 1 | `stage/1-dispatch` | Complete -- merged, tested, patterns documented |
| 2 | `stage/2-dag` | In progress -- specs, patterns, and skill updates written. Implementation next. |
| 3-9 | not yet created | Planned |

**Last checkpoint:** Branch topology fixed -- `stage/2-dag` now correctly descends from `stage/1-dispatch` (not from main). Main reset to clean shell at `aa3ace8`.

**Next step:** Implement the DAG orchestration logic in the SKILL.md and dag-execution.md reference, then test with `prompts/stage-2/rest-api.md`.

---

## Stage 1: Minimum Viable Dispatch

**Branch:** `stage/1-dispatch` (from `main`)

**Goal:** Prove the three-part dispatch loop works. Orchestrator creates ONE task, dispatches ONE builder, then ONE validator.

**Patterns introduced:**
- `docs/patterns/builder-validator.md`
- `docs/patterns/dispatch-loop.md`
- `docs/patterns/higher-order-prompt.md` (concept introduction)

### Files to Create

| # | File | What it does |
|---|------|-------------|
| 1 | `.claude/CLAUDE.md` | Modify template's CLAUDE.md -- add orchestrator overview, agent conventions, spec directory |
| 2 | `.claude/settings.json` | Pre-approve tools: Task, TaskCreate/Update/List/Get, TaskOutput, Read, Write, Edit, Glob, Grep, Bash |
| 3 | `.claude/agents/builder.md` | Generic builder agent. model: sonnet, tools: Read/Glob/Grep/Write/Edit/Bash/TaskGet/TaskUpdate |
| 4 | `.claude/agents/validator.md` | Generic validator agent. model: haiku, disallowedTools: Write/Edit/NotebookEdit |
| 5 | `.claude/commands/orchestrate.md` | Thin wrapper. frontmatter: description, argument-hint, model: opus, skill: orchestrator |
| 6 | `.claude/skills/orchestrator/SKILL.md` | Minimal version. HOP variables, 5-step dispatch protocol |

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

**Branch:** `stage/2-dag` (from `stage/1-dispatch`)

**Goal:** Decompose into 3+ tasks with dependencies, write a spec file, execute sequentially following topological order.

**Patterns introduced:**
- `docs/patterns/task-dag.md`
- `docs/patterns/wave-computation.md`
- `docs/patterns/spec-as-source-of-truth.md`

### Files to Create/Modify

| # | File | Action |
|---|------|--------|
| 1 | `.claude/skills/orchestrator/SKILL.md` | Major update -- add decomposition, wave computation, spec file writing |
| 2 | `.claude/skills/orchestrator/references/dag-execution.md` | NEW -- wave algorithm, dependency rules, idempotency, timeout handling |

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

**Branch:** `stage/3-full` (from `stage/2-dag`)

**Goal:** Complete Phase 1 feature set -- retry, clarifying questions, plan refinement, fast path, spec re-read, token estimation, summary.

**Patterns introduced:**
- `docs/patterns/retry-with-resume.md`
- `docs/patterns/fast-path-gate.md`
- `docs/patterns/iterative-refinement.md`

### Files to Modify

| # | File | Action |
|---|------|--------|
| 1 | `.claude/skills/orchestrator/SKILL.md` | Full rewrite with all Phase 1 capabilities |
| 2 | `.claude/skills/orchestrator/references/dag-execution.md` | Add retry protocol, spec re-read, fast path rules |

### Verification

1. **Clarifying questions:** `/orchestrate "add authentication"` (vague) -- expect questions
2. **Fast path:** `/orchestrate "add JSDoc to greet function"` -- expect "simple enough to handle directly"
3. **Retry:** Task with vague criteria -- verify retry up to 3x, then user asked
4. **Full flow:** 4-5 task orchestration end to end

---

## Stage 4: HOP Parameterization Proof

**Branch:** `stage/4-hop` (from `stage/3-full`)

**Goal:** Prove the orchestrator is agent-agnostic. Create a second agent team, use `--team` flag to switch.

**Patterns introduced:**
- `docs/patterns/team-profiles.md`
- `docs/patterns/higher-order-prompt.md` (updated with proof)

### Verification

1. `/orchestrate "add a utility function"` -- uses engineering team (default)
2. `/orchestrate "research top 5 TS testing frameworks" --team research` -- uses research team
3. Both show identical orchestration. Only agents differ. **This is the HOP proof.**

---

## Stage 5: Extract to side-quest-plugins

**Branch:** `stage/5-plugin` (from `stage/4-hop`)

**Goal:** Move working prototype into the plugin system.

**Patterns introduced:**
- `docs/patterns/plugin-architecture.md`

---

## Stages 6-9: Advanced Capabilities

Each gets its own detailed plan before implementation. See stage descriptions in the "Stages at a Glance" table above.

| Stage | Branch | Parent |
|-------|--------|--------|
| 6 | `stage/6-codex` | `stage/5-plugin` |
| 7 | `stage/7-hitl` | `stage/6-codex` |
| 8 | `stage/8-parallel` | `stage/7-hitl` |
| 9 | `stage/9-browser` | `stage/8-parallel` |

---

## Branch Strategy - Cumulative Chain

**Branch model: cumulative chain.** Each stage branches from the previous stage (not from main). This means each branch contains everything from prior stages plus its own additions. Branches are never deleted -- they serve as permanent, runnable snapshots. Main stays as a clean shell (template baseline, config, master plan) -- it never receives stage merges.

```
main (bare shell -- no stage implementations)
  |
  +-- stage/1-dispatch
        |
        +-- stage/2-dag
              |
              +-- stage/3-full
                    |
                    +-- stage/4-hop
                          |
                          +-- stage/5-plugin
                                |
                                +-- stage/6-codex
                                      |
                                      +-- stage/7-hitl
                                            |
                                            +-- stage/8-parallel
                                                  |
                                                  +-- stage/9-browser
```

### What lives on main

Main is the bare scaffold -- a "table of contents," not a chapter:

- Starter template (`package.json`, `tsconfig.json`, `biome.json`, CI config)
- `specs/master-plan.md` (this file)
- Minimal `CLAUDE.md` pointing readers to stage branches
- **No** stage implementations, agents, skills, or pattern docs

### Rules for starting a new stage

1. Checkout the previous stage branch: `git checkout stage/N-1-name`
2. Create the new branch: `git checkout -b stage/N-name`
3. Implement the stage
4. Push the branch -- **never merge to main**

### Branch protection

All stage branches have GitHub branch protection rules preventing deletion. These are permanent educational snapshots -- deleting any branch breaks the learning path. Protection is applied via a `stage/*` wildcard rule.

When creating a new stage branch, it's automatically covered by the wildcard rule -- no manual setup needed.

### Rules for fixing earlier stages

- Fix on the affected stage branch
- Cherry-pick or rebase forward through subsequent stages
- This is a known maintenance cost, acceptable for a bounded 9-stage repo

### Diff commands for readers

```bash
git diff main..stage/1-dispatch              # What stage 1 adds to the shell
git diff stage/1-dispatch..stage/2-dag       # What stage 2 adds
git diff stage/2-dag..stage/3-full           # What stage 3 adds
```

Each diff shows exactly what a stage introduces -- no noise from unrelated changes.

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
- **Cumulative branches, clean main** -- main is a shell, each stage branches from the previous one. Optimizes for readers (checkout-and-run, progressive diffs) over maintainers (cherry-pick cascade on fixes). Acceptable tradeoff for a bounded 9-stage learning repo
- **Pattern docs grow progressively** -- each stage adds new patterns to `docs/patterns/`
