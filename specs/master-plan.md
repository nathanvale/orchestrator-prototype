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
| 1 | `stage/1-dispatch` | Complete -- 6 commits, patterns documented |
| 2 | `stage/2-dag` | Complete -- 6 commits, specs/patterns/skill written |
| 3 | `stage/3-full` | Next up |
| 4-9 | not yet created | Planned |

**Last checkpoint:** Commit history rewritten for educational clarity -- each commit maps to a logical step in the file tables below. Both stage branches force-pushed with clean history.

**Next step:** Create `stage/3-full` from `stage/2-dag` and implement retry, clarifying questions, fast path, plan refinement, spec re-read, token estimation, and summary.

---


## Stage 1: Minimum Viable Dispatch

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

## Stage 4: HOP Parameterization Proof

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

**Goal:** Move working prototype into the plugin system.

**Patterns introduced:**
- `docs/patterns/plugin-architecture.md`

---

## Stages 6-9: Advanced Capabilities

Each gets its own detailed plan before implementation. See stage descriptions in the "Stages at a Glance" table above.

---

## Branch Strategy - Living Examples

Each stage gets its own long-living branch. These are never deleted -- they serve as permanent, runnable snapshots.

```
main                          # Template baseline
  |
  +-- stage/1-dispatch        # Minimum viable: single task, builder, validator
  +-- stage/2-dag             # Multi-task DAG with wave execution
  +-- stage/3-full            # Complete Phase 1 (retry, questions, fast path)
  +-- stage/4-hop             # HOP proof with --team switching
  +-- stage/5-plugin          # Plugin extraction
  +-- stage/6-codex           # Codex escalation + spec hardening
  +-- stage/7-hitl            # Human-in-the-loop + cross-session persistence
  +-- stage/8-parallel        # Parallel worktree execution
  +-- stage/9-browser         # agent-browser validation
```

**Diff-friendly progression:** `git diff stage/1-dispatch..stage/2-dag` shows exactly what DAG adds. Each branch is a standalone tutorial chapter.

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
- **Long-living branches** -- each stage is a permanent, runnable snapshot
- **Pattern docs grow progressively** -- each stage adds new patterns to `docs/patterns/`
