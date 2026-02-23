# Orchestrator Prototype

An educational repository for learning agent orchestration patterns incrementally. Each git branch (`orchestration/1-dispatch`, `orchestration/2-dag`, etc.) is a standalone lesson - checkout any stage to see the orchestrator at that complexity level.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

---

## What This Repo Is

This is a prototype of the HOP (Higher-Order Prompt) Orchestrator - a prompt that takes other prompts as parameters, like a higher-order function. The fixed wrapper handles orchestration (task creation, agent dispatch, validation). The variable parameters handle identity (which builder, which validator, which team).

Stage 7 adds HITL (Human-In-The-Loop) bounce-back and persistence via hydration checkpoints to the complete 14-step dispatch protocol. When the orchestrator detects a blocking situation mid-execution (conflicting patterns, architectural decisions, missing dependencies), it pauses and presents bounded resolution options to the user. All orchestration state is persisted to the spec file after each state change, enabling cross-session resume via the `--resume` flag.

This is the final stage in the current orchestration module. The next stages (8+) are planned: Stage 8 adds parallel wave execution, Stage 9 adds browser-based validation.

The prototype repo is a learning tool: checkout any stage branch to see the orchestrator at that complexity level. The living, maintained implementation lives in the plugin: `/plugin install agentic-orchestration@side-quest`.

**Learning tool first.** Built incrementally so each stage teaches one concept. When finished, it doubles as an educational resource for others.

**See:** `specs/master-plan.md` for the full roadmap, `docs/patterns/` for pattern explanations.

---

## Project Structure

```
.claude/
  agents/           # Agent definitions (builder, validator, research-builder, research-validator)
  commands/         # User-facing commands (/orchestrate, /lobby)
  skills/           # Skill definitions (orchestrator SKILL.md)
    orchestrator/
      references/   # Technical references (dag-execution.md, codex-escalation.md, hitl-protocol.md)
      teams/        # Team profiles (engineering.md, research.md)
  settings.json     # Tool permissions

specs/              # Spec files written by the orchestrator before agent dispatch + master plan
specs/examples/     # Gallery of example spec outputs per stage
prompts/            # Curated test prompts per stage
docs/patterns/      # Pattern docs - what, how, why (progressive per stage)
src/                # Source code (target for orchestrated tasks)
tests/              # Tests
```

---

## How to Use

```bash
# Standard orchestration -- difficulty routing, spec hardening, and hydration run automatically
/orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id"

# Hard task routing -- tasks touching 5+ files are escalated to Codex CLI
/orchestrate "refactor the user module from class-based to functional across 8 files"

# Disable Codex routing
/orchestrate "refactor the auth module" --no-codex

# Research team
/orchestrate "research top 5 TypeScript testing frameworks and compare them" --team research

# Resume an interrupted orchestration
/orchestrate --resume specs/rest-api.md
# The orchestrator will:
# 1. Read the spec file's Hydration Checkpoint section
# 2. Restore all state: wave position, agent sessions, retry counters, bounce history
# 3. Re-present any unresolved bounce-backs
# 4. Skip completed tasks (idempotency)
# 5. Resume from the correct wave

# Bounce-back scenario (automatic -- no flag needed)
/orchestrate "add a user module using class-based OOP patterns"
# If the builder detects conflicting patterns in existing code:
# 1. The orchestrator pauses and presents the conflict
# 2. You choose: proceed with guidance, skip, restructure, or abort
# 3. The orchestrator resumes with your decision applied
# 4. A hydration checkpoint is written so you can --resume if needed
```

---

## What This Stage Adds

Stage 7 adds HITL bounce-back and persistence to the 14-step dispatch protocol.

### --resume flag (in Step 1)
`/orchestrate --resume specs/<name>.md` reads the spec file's Hydration Checkpoint and restores all orchestration state. Skips Steps 2-9 and jumps directly to the correct wave position.

### Hydration Checkpoint (in Step 6 and throughout Step 10)
After each significant state change, the orchestrator writes a `## Hydration Checkpoint` section to the spec file. The checkpoint contains a complete YAML snapshot: wave position, agent sessions (agentId per task), retry state, bounce history, routing flags, and timestamp.

### Bounce-Back Detection (in Step 10, after builder and validator)
After each builder completes, the orchestrator scans output for 5 blocking trigger types:
- `conflicting-requirements` -- "conflicts with", "cannot satisfy both"
- `architectural-decision` -- "multiple approaches possible", "design decision required"
- `scope-discovery` -- "this also requires changes to", "more files affected than expected"
- `external-dependency` -- "not found", "package not installed", "connection refused"
- `decomposition-error` -- "cannot implement this in isolation", "task boundary issue"

After each validator completes with VERDICT: PASS, the orchestrator scans for 1 advisory trigger:
- `design-concern` -- VERDICT: PASS + "technical debt", "recommend revisiting", etc.

### Bounce-Back Resolution
When a trigger is detected, the orchestrator:
1. Updates task status to `bounced` in the spec file
2. Writes a hydration checkpoint (preserves bounce state for cross-session resume)
3. Presents bounded resolution options (2-4 choices) via AskUserQuestion
4. Applies the user's decision
5. Writes another checkpoint after resolution

### New files in this stage:
- `.claude/skills/orchestrator/references/hitl-protocol.md` -- bounce-back trigger catalog, status lifecycle, resolution matrix, resume protocol
- `docs/patterns/hitl-protocol.md` -- HITL pattern: what, how, why
- `docs/patterns/hydration-pattern.md` -- hydration pattern: checkpoint structure, cross-session resume
- Updated `docs/patterns/spec-as-source-of-truth.md` -- hydration extension note
- `prompts/stage-7/` -- test prompts for this stage
- Updated `SKILL.md` to ~1010 lines (up from 945 in stage 6)

---

## Agent Conventions

- **Builder** (sonnet): Writes code. Reads before writing. File boundaries are absolute. Reports changes. Output scanned for bounce-back triggers.
- **Validator** (haiku): Read-only. Reports VERDICT: PASS or VERDICT: FAIL. Never modifies files. VERDICT: PASS scanned for design-concern trigger.
- **Research Builder** (sonnet): Researches and synthesizes from web sources. Has WebSearch and WebFetch. Writes markdown research reports, not code.
- **Research Validator** (haiku): Read-only. Spot-checks citations via WebFetch. Reports VERDICT: PASS or VERDICT: FAIL.
- **Orchestrator** (opus): Never writes code. Detects bounce triggers, pauses for human input, writes hydration checkpoints, resumes from checkpoint on --resume.
- **Codex CLI** (external): Alternative builder for hard tasks. Invoked via `codex exec --full-auto`. Falls back to standard builder on failure.

---

## Team Profiles

Team profiles live in `.claude/skills/orchestrator/teams/`. The `--team` flag selects the profile.

| Team | Profile | Builder | Validator | Use For |
|------|---------|---------|-----------|---------|
| `engineering` | `teams/engineering.md` | `builder` | `validator` | Code tasks (default) |
| `research` | `teams/research.md` | `research-builder` | `research-validator` | Web research and analysis |

Difficulty routing, spec hardening, HITL bounce-back, and hydration apply to all teams.

---

## Code Conventions

| Area | Convention |
|------|------------|
| Files | kebab-case (`my-util.ts`) |
| Functions | camelCase (`doSomething`) |
| Types | PascalCase (`MyType`) |
| Exports | Named only (no defaults) |
| Formatting | Biome (tabs, single quotes, 80-char) |
| Exports | Every exported function gets JSDoc |

---

## Key Commands

```bash
bun run validate         # Full quality check (lint + typecheck + test)
bun run check            # Biome lint + format (auto-fixes)
bun typecheck            # TypeScript type checking
bun test                 # Run all tests
```

---

## Branch Strategy

**Cumulative chain:** each stage branches from the previous stage. Main is the lobby -- it holds learning tools but no orchestrator. This is the final stage in the current module series.

```bash
# Diff commands for readers
git diff orchestration/6-codex..orchestration/7-hitl    # What stage 7 adds (HITL + hydration)
git diff orchestration/5-plugin..orchestration/6-codex  # What stage 6 adds (difficulty routing, spec hardening)
git diff orchestration/4-hop..orchestration/5-plugin    # What stage 5 adds (plugin extraction docs)
git diff orchestration/3-full..orchestration/4-hop      # What stage 4 adds (team switching)
```

See `specs/master-plan.md` "Branch Strategy" for full rules.

---

## What This Stage Does NOT Do

This is Stage 7 (HITL Bounce-Back + Persistence). The following capabilities are intentionally absent -- they are added in later stages:

- **No parallel wave execution** -- tasks within a wave run sequentially, one at a time (Stage 8)
- **No live API cost data** -- token estimation uses fixed per-dispatch assumptions (future)

---

## Special Rules

### ALWAYS

1. Run `bun run validate` before pushing
2. Use named exports (no defaults)
3. Add JSDoc to exported functions

### NEVER

1. Push directly to main
2. Use destructive git commands (`reset --hard`, `push --force`)
3. Let the orchestrator write code directly (it dispatches agents)

---

## Cross-Branch Access

To return to the lobby: `git checkout main`

On main you have access to `/learn`, `/dojo`, and `/advisor` for pattern learning.

To read files from any branch without checking out:
```bash
# Read pattern docs from main while on this branch
git show main:docs/patterns/hitl-protocol.md
git show main:docs/patterns/hydration-pattern.md

# See what stage 7 adds over stage 6
git diff orchestration/6-codex..orchestration/7-hitl --stat

# Read the HITL reference from this stage
git show orchestration/7-hitl:.claude/skills/orchestrator/references/hitl-protocol.md

# Compare the full SKILL.md between stages
git diff orchestration/6-codex..orchestration/7-hitl -- .claude/skills/orchestrator/SKILL.md
```
